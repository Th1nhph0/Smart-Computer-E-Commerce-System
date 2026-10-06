using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEcommerceAPI.DataMining;
using SmartEcommerceAPI.Models;
using System.Linq;
using System.Threading.Tasks;

namespace SmartEcommerceAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AnalyticsController : ControllerBase
    {
        private readonly SmartEcommerceDbContext _context;

        public AnalyticsController(SmartEcommerceDbContext context)
        {
            _context = context;
        }


        // GET: api/Analytics/RecommendProducts
        [HttpGet("RecommendProducts")]
        public async Task<IActionResult> GetRecommendedProducts([FromQuery] int productId, [FromQuery] int limit = 4)
        {
            var product = await _context.Products.FindAsync(productId);
            if (product == null) return NotFound();

            int currentCategoryId = product.CategoryId;

            // Chạy Apriori (ngầm) hoặc dùng kết quả được cache (ở đây tính toán trực tiếp cho đơn giản)
            // Lấy order details trực tiếp bằng subquery để tránh IN clause quá lớn
            var orderDetails = await _context.OrderDetails
                .Where(od => od.OrderId.HasValue && 
                             _context.Orders.Any(o => o.OrderId == od.OrderId && o.OrderStatus != "Đã hủy" && o.OrderStatus != "Chờ xử lý") && 
                             od.ProductId.HasValue)
                .Select(od => new { OrderId = od.OrderId.Value, CategoryId = od.Product.CategoryId })
                .ToListAsync();

            var transactions = orderDetails
                .GroupBy(od => od.OrderId)
                .Select(g => g.Select(od => od.CategoryId).Distinct().ToList())
                .ToList();

            var rules = AprioriAlgorithm.GenerateRules(transactions, new Dictionary<int, string>(), 0.01, 0.1);

            // Tìm các danh mục thường được mua cùng với currentCategoryId
            var recommendedCategoryIds = rules
                .Where(r => r.AntecedentId == currentCategoryId)
                .OrderByDescending(r => r.Confidence)
                .ThenByDescending(r => r.Support)
                .Select(r => r.ConsequentId)
                .Distinct()
                .ToList();

            if (recommendedCategoryIds.Count == 0)
            {
                // Nếu không có luật, fallback: Lấy sản phẩm ngẫu nhiên cùng danh mục
                var fallbackProducts = await _context.Products
                    .Where(p => p.CategoryId == currentCategoryId && p.ProductId != productId && p.Status == true)
                    .OrderBy(p => Guid.NewGuid())
                    .Take(limit)
                    .Select(p => new {
                        p.ProductId, p.ProductName, p.Price,
                        ImageUrl = p.ProductImages.OrderBy(img => img.SortOrder).FirstOrDefault().ImageUrl,
                        Reason = "Cùng danh mục"
                    })
                    .ToListAsync();
                return Ok(fallbackProducts);
            }

            // Có danh mục gợi ý -> Lấy top sản phẩm bán chạy hoặc ngẫu nhiên từ các danh mục đó
            var recommendedProducts = await _context.Products
                .Where(p => recommendedCategoryIds.Contains(p.CategoryId) && p.Status == true)
                .OrderBy(p => Guid.NewGuid()) // Thay vì ngẫu nhiên có thể order by bán chạy
                .Take(limit)
                .Select(p => new {
                    p.ProductId, p.ProductName, p.Price,
                    ImageUrl = p.ProductImages.OrderBy(img => img.SortOrder).FirstOrDefault().ImageUrl,
                    Reason = "Thường được mua kèm"
                })
                .ToListAsync();

            return Ok(recommendedProducts);
        }

        // GET: api/Analytics/CustomerSegments
        [HttpGet("CustomerSegments")]
        public async Task<IActionResult> GetCustomerSegments([FromQuery] int k = 3)
        {
            // 1. Fetch Raw Data from DB
            // B1: Lấy danh sách khách hàng và tổng hợp số đơn hàng, tổng tiền (Chỉ tính các đơn hàng đã thanh toán hoặc đã giao)
            // Lưu ý: Tùy nghiệp vụ, ở đây tạm tính tất cả đơn hàng trừ "Đã Hủy" (OrderState = 6)
            var customerStats = await _context.Customers
                .Select(c => new
                {
                    c.CustomerId,
                    c.FullName,
                    Orders = c.Orders.Where(o => o.OrderStatus != "Đã hủy") // Trừ đơn bị hủy
                })
                .ToListAsync();

            var dataPoints = customerStats.Select(cs => new CustomerDataPoint
            {
                CustomerId = cs.CustomerId,
                CustomerName = string.IsNullOrEmpty(cs.FullName) ? $"Khách #{cs.CustomerId}" : cs.FullName,
                OrderCount = cs.Orders.Count(),
                TotalSpend = cs.Orders.Sum(o => o.TotalAmount ?? 0)
            })
            // Lọc bỏ những người chưa mua gì để cụm phân loại chính xác hơn
            .Where(dp => dp.OrderCount > 0)
            .ToList();

            if (!dataPoints.Any())
            {
                return Ok(new { message = "Chưa có dữ liệu giao dịch để phân cụm." });
            }

            // 2. Run K-Means Clustering Algorithm
            var clusters = KMeansClustering.ClusterCustomers(dataPoints, k);

            // 3. Return results
            return Ok(new
            {
                TotalCustomersAnalyzed = dataPoints.Count,
                K = k,
                Segments = clusters
            });
        }
        // GET: api/Analytics/ProductAssociations
        [HttpGet("ProductAssociations")]
        public async Task<IActionResult> GetProductAssociations([FromQuery] double minSupport = 0.01, [FromQuery] double minConfidence = 0.1)
        {
            // Kiểm tra xem có order nào hợp lệ không trước khi join
            bool hasValidOrders = await _context.Orders.AnyAsync(o => o.OrderStatus != "Đã hủy" && o.OrderStatus != "Chờ xử lý");
            if (!hasValidOrders) return Ok(new { message = "Không đủ dữ liệu giao dịch." });

            // Lấy danh mục thay vì sản phẩm (Join OrderDetails -> Product -> Category) bằng subquery
            var orderDetails = await _context.OrderDetails
                .Where(od => od.OrderId.HasValue && 
                             _context.Orders.Any(o => o.OrderId == od.OrderId && o.OrderStatus != "Đã hủy" && o.OrderStatus != "Chờ xử lý") && 
                             od.ProductId.HasValue)
                .Select(od => new {
                    OrderId = od.OrderId.Value,
                    CategoryId = od.Product.CategoryId,
                    CategoryName = od.Product.Category.CategoryName
                })
                .ToListAsync();

            var categoryDict = new Dictionary<int, string>();
            foreach (var detail in orderDetails)
            {
                if (!categoryDict.ContainsKey(detail.CategoryId))
                {
                    categoryDict[detail.CategoryId] = detail.CategoryName ?? $"Danh mục {detail.CategoryId}";
                }
            }

            var transactions = orderDetails
                .GroupBy(od => od.OrderId)
                .Select(g => g.Select(od => od.CategoryId).Distinct().ToList())
                .ToList();

            var rules = AprioriAlgorithm.GenerateRules(transactions, categoryDict, minSupport, minConfidence);

            return Ok(new
            {
                TotalTransactions = transactions.Count,
                RulesGenerated = rules.Count,
                Rules = rules
            });
        }
    }
}
