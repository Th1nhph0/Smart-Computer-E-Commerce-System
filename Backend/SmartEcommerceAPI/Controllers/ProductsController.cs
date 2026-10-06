using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEcommerceAPI.Models;

namespace SmartEcommerceAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly SmartEcommerceDbContext _context;

        public ProductsController(SmartEcommerceDbContext context)
        {
            _context = context;
        }

        // GET: api/Products
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetProducts()
        {
            var products = await _context.Products
                .AsNoTracking()
                .OrderByDescending(p => p.ProductId)
                .Take(300)
                .Select(p => new
                {
                    p.ProductId,
                    p.ProductName,
                    p.Price,
                    p.CurrentStock,
                    categoryId = p.Category != null ? (int?)p.Category.CategoryId : null,
                    categoryName = p.Category != null ? p.Category.CategoryName : null
                })
                .ToListAsync();

            var productIds = products.Select(p => p.ProductId).ToList();

            var images = await _context.ProductImages
                .Where(pi => productIds.Contains(pi.ProductId))
                .Select(pi => new { ProductId = pi.ProductId, pi.ImageUrl })
                .ToListAsync();

            var imageDict = images.GroupBy(img => img.ProductId)
                                  .ToDictionary(g => g.Key, g => g.Take(1).Select(img => new { imageUrl = img.ImageUrl }).ToList());

            var reviewStats = await _context.Reviews
                .Where(r => r.ProductId != null && productIds.Contains(r.ProductId.Value))
                .GroupBy(r => r.ProductId.Value)
                .Select(g => new { 
                    ProductId = g.Key, 
                    ReviewCount = g.Count(), 
                    AverageRating = g.Average(r => (double?)r.Rating) ?? 0.0 
                })
                .ToDictionaryAsync(g => g.ProductId, g => g);

            var saleStats = await _context.OrderDetails
                .Where(od => od.ProductId != null && productIds.Contains(od.ProductId.Value) && od.Order != null && od.Order.OrderStatus != "Đã hủy")
                .GroupBy(od => od.ProductId.Value)
                .Select(g => new {
                    ProductId = g.Key,
                    TotalSales = g.Sum(od => od.Quantity) ?? 0
                })
                .ToDictionaryAsync(g => g.ProductId, g => g);

            var result = products.Select(p => new
            {
                productId = p.ProductId,
                productName = p.ProductName,
                price = p.Price,
                currentStock = p.CurrentStock,
                reviewCount = reviewStats.ContainsKey(p.ProductId) ? reviewStats[p.ProductId].ReviewCount : 0,
                averageRating = reviewStats.ContainsKey(p.ProductId) ? reviewStats[p.ProductId].AverageRating : 0.0,
                totalSales = saleStats.ContainsKey(p.ProductId) ? saleStats[p.ProductId].TotalSales : 0,
                category = p.categoryId != null ? new
                {
                    categoryId = p.categoryId,
                    categoryName = p.categoryName
                } : null,
                productImages = imageDict.ContainsKey(p.ProductId) ? imageDict[p.ProductId] : null
            });

            return Ok(result);
        }

        // GET: api/Products/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetProduct(int id) // Chú ý chỗ này thành <object>
        {
            var product = await _context.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(p => p.ProductId == id);

            if (product == null)
            {
                return NotFound();
            }

            // Tính toán đánh giá trung bình
            var reviews = await _context.Reviews.Where(r => r.ProductId == id).ToListAsync();
            var reviewCount = reviews.Count;
            var averageRating = reviewCount > 0 ? reviews.Average(r => (double?)r.Rating) ?? 0.0 : 0.0;

            // Tính tổng số lượng đã bán (chỉ tính đơn hàng đã giao)
            var totalSold = await _context.OrderDetails
                .Include(od => od.Order)
                .Where(od => od.ProductId == id && od.Order != null && od.Order.OrderStatus == "Delivered")
                .SumAsync(od => (int?)od.Quantity) ?? 0;

            var result = new
            {
                productId = product.ProductId,
                productName = product.ProductName,
                sku = product.Sku,
                price = product.Price,
                currentStock = product.CurrentStock,
                warrantyMonths = product.WarrantyMonths,
                status = product.Status,
                description = product.Description,
                specifications = product.Specifications,
                categoryId = product.CategoryId,
                brandId = product.BrandId,
                averageRating = Math.Round(averageRating, 1),
                reviewCount = reviewCount,
                totalSold = totalSold,
                category = product.Category != null ? new
                {
                    categoryId = product.Category.CategoryId,
                    categoryName = product.Category.CategoryName
                } : null,
                productImages = product.ProductImages.Select(img => new
                {
                    imageUrl = img.ImageUrl
                }).ToList()
            };

            return Ok(result);
        }

        // PUT: api/Products/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProduct(int id, ProductUpdateDto dto)
        {
            if (id != dto.ProductId)
            {
                return BadRequest();
            }

            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound();
            }

            product.ProductName = dto.ProductName;
            product.Sku = dto.Sku;
            product.Price = dto.Price;
            product.CategoryId = dto.CategoryId;
            product.BrandId = dto.BrandId;
            product.WarrantyMonths = dto.WarrantyMonths;
            product.Status = dto.Status;
            product.Specifications = dto.Specifications;
            product.Description = dto.Description;
            product.UpdatedAt = DateTime.Now;
            
            // Note: CurrentStock is deliberately kept intact unless passed intentionally.
            if (dto.CurrentStock.HasValue)
            {
                product.CurrentStock = dto.CurrentStock.Value;
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProductExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Products
        [HttpPost]
        public async Task<ActionResult<Product>> PostProduct(ProductUpdateDto dto)
        {
            var product = new Product
            {
                ProductName = dto.ProductName,
                Sku = dto.Sku,
                Price = dto.Price,
                CategoryId = dto.CategoryId,
                BrandId = dto.BrandId,
                WarrantyMonths = dto.WarrantyMonths,
                Status = dto.Status ?? true,
                Specifications = dto.Specifications,
                Description = dto.Description,
                CurrentStock = dto.CurrentStock ?? 0,
                CreatedAt = DateTime.Now
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetProduct", new { id = product.ProductId }, product);
        }

        // DELETE: api/Products/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound();
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Products/5/SmartRecommendations
        [HttpGet("{id}/SmartRecommendations")]
        public async Task<IActionResult> GetSmartRecommendations(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            int currentCategoryId = product.CategoryId;

            // 1 & 2. Lấy OrderDetails cùng CategoryId mà không dùng Contains
            var relatedOrderDetails = await _context.OrderDetails
                .Where(od => od.OrderId != null && od.Product != null &&
                             _context.OrderDetails.Any(inner => inner.OrderId == od.OrderId && inner.Product != null && inner.Product.CategoryId == currentCategoryId))
                .Select(od => new { od.OrderId, CategoryId = od.Product.CategoryId })
                .ToListAsync();

            if (relatedOrderDetails.Count == 0)
            {
                var fallback = await _context.Products
                    .Where(p => p.CategoryId != currentCategoryId && p.CurrentStock > 0 && p.Status == true)
                    .OrderByDescending(p => p.CurrentStock)
                    .Take(4)
                    .Select(p => new {
                        p.ProductId,
                        p.ProductName,
                        p.Price,
                        ImageUrl = p.ProductImages.Select(pi => pi.ImageUrl).FirstOrDefault(),
                        p.CurrentStock,
                        Reason = "🎁 Xả Kho - Giá Sốc",
                        DiscountPercent = 15
                    })
                    .ToListAsync();
                return Ok(fallback);
            }

            // 3. Xây dựng danh sách transactions
            var transactions = relatedOrderDetails
                .Where(od => od.OrderId.HasValue)
                .GroupBy(od => od.OrderId.Value)
                .Select(g => g.Select(od => od.CategoryId).Distinct().ToList())
                .ToList();

            var dummyDict = new Dictionary<int, string>(); 
            var rules = SmartEcommerceAPI.DataMining.AprioriAlgorithm.GenerateRules(transactions, dummyDict, 0.01, 0.1);

            // 5. Tìm các danh mục được gợi ý
            var recommendedCategoryIds = rules
                .Where(r => r.AntecedentId == currentCategoryId)
                .OrderByDescending(r => r.Confidence)
                .Select(r => r.ConsequentId)
                .Distinct()
                .ToList();

            if (recommendedCategoryIds.Count == 0)
            {
                var fallback = await _context.Products
                    .Where(p => p.CategoryId != currentCategoryId && p.CurrentStock > 0 && p.Status == true)
                    .OrderByDescending(p => p.CurrentStock)
                    .Take(4)
                    .Select(p => new {
                        p.ProductId,
                        p.ProductName,
                        p.Price,
                        ImageUrl = p.ProductImages.Select(pi => pi.ImageUrl).FirstOrDefault(),
                        p.CurrentStock,
                        Reason = "🔥 Xả Kho - Giá Sốc",
                        DiscountPercent = 15
                    })
                    .ToListAsync();
                return Ok(fallback);
            }

            // 6. Trả về sản phẩm thuộc danh mục gợi ý
            var recommendedProductsDb = await _context.Products
                .Where(p => recommendedCategoryIds.Contains(p.CategoryId) && p.ProductId != id && p.Status == true && p.CurrentStock > 0)
                .OrderByDescending(p => p.ProductId)
                .Take(20)
                .Select(p => new {
                    p.ProductId,
                    p.ProductName,
                    p.Price,
                    ImageUrl = p.ProductImages.Select(pi => pi.ImageUrl).FirstOrDefault(),
                    p.CurrentStock,
                    Reason = "🎁 Combo Mua Kèm",
                    DiscountPercent = 10
                })
                .ToListAsync();

            var recommendedProducts = recommendedProductsDb
                .OrderBy(x => Guid.NewGuid())
                .Take(4)
                .ToList();

            if (recommendedProducts.Count < 4)
            {
                var additional = await _context.Products
                    .Where(p => p.CategoryId != currentCategoryId && p.ProductId != id && !recommendedProducts.Select(rp => rp.ProductId).Contains(p.ProductId) && p.Status == true && p.CurrentStock > 0)
                    .OrderByDescending(p => p.CurrentStock)
                    .Take(4 - recommendedProducts.Count)
                    .Select(p => new {
                        p.ProductId,
                        p.ProductName,
                        p.Price,
                        ImageUrl = p.ProductImages.Select(pi => pi.ImageUrl).FirstOrDefault(),
                        p.CurrentStock,
                        Reason = "🔥 Xả Kho - Giá Sốc",
                        DiscountPercent = 15
                    })
                    .ToListAsync();
                
                recommendedProducts.AddRange(additional);
            }

            return Ok(recommendedProducts);
        }

        private bool ProductExists(int id)
        {
            return _context.Products.Any(e => e.ProductId == id);
        }

    }

    public class ProductUpdateDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = null!;
        public string? Sku { get; set; }
        public decimal Price { get; set; }
        public int CategoryId { get; set; }
        public int BrandId { get; set; }
        public int? WarrantyMonths { get; set; }
        public bool? Status { get; set; }
        public string? Specifications { get; set; }
        public string? Description { get; set; }
        public int? CurrentStock { get; set; }
    }
}
