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
    public class OrdersController : ControllerBase
    {
        private readonly SmartEcommerceDbContext _context;

        public OrdersController(SmartEcommerceDbContext context)
        {
            _context = context;
        }

        // GET: api/Orders
        [HttpGet]
        public async Task<IActionResult> GetOrders()
        {
            if (_context.Orders == null)
            {
                return NotFound();
            }

            // TỐI ƯU CỰC ĐỘ ĐỂ TRỊ LỖI CHẬM 37S: 
            // Danh sách tổng (1000 đơn) tuyệt đối KHÔNG lôi theo mảng "Chi tiết món ăn" (Items).
            // Giao diện bảng (Table) của Admin chỉ cần các thông tin cơ bản này.
            var orders = await _context.Orders
                .AsNoTracking()
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new 
                {
                    o.OrderId,
                    o.CustomerId,
                    o.OrderDate,
                    o.TotalAmount,
                    o.OrderStatus,
                    CustomerName = o.Customer != null ? o.Customer.FullName : "Khách vãng lai",
                    Phone = o.Customer != null ? o.Customer.Phone : ""
                })
                .ToListAsync();

            return Ok(orders);
        }

        // GET: api/Orders/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrder(int id)
        {
            // API NÀY ĐỂ XEM CHI TIẾT 1 ĐƠN (Lấy kèm tất cả Item, Hình ảnh, Tên sản phẩm)
            var order = await _context.Orders
                .AsNoTracking()
                .Where(o => o.OrderId == id)
                .Select(o => new 
                {
                    o.OrderId,
                    o.CustomerId,
                    o.OrderDate,
                    o.TotalAmount,
                    o.OrderStatus,
                    o.ShippingFee,
                    ShippingName = o.ShippingDetail != null ? o.ShippingDetail.ReceiverName : (o.Customer != null ? o.Customer.FullName : ""),
                    ShippingPhone = o.ShippingDetail != null ? o.ShippingDetail.ReceiverPhone : (o.Customer != null ? o.Customer.Phone : ""),
                    ShippingAddress = o.ShippingDetail != null ? o.ShippingDetail.ShippingAddress : (o.Customer != null ? o.Customer.Address : ""),
                    CustomerName = o.Customer != null ? o.Customer.FullName : "Khách vãng lai",
                    Phone = o.Customer != null ? o.Customer.Phone : "",
                    OrderDetails = o.OrderDetails.Select(od => new 
                    {
                        od.ProductId,
                        Product = new { ProductName = od.Product != null ? od.Product.ProductName : "Không rõ" },
                        ProductName = od.Product != null ? od.Product.ProductName : "Không rõ",
                        od.Quantity,
                        od.UnitPrice,
                        Image = (od.Product != null && od.Product.ProductImages.Any()) 
                                ? od.Product.ProductImages.OrderBy(img => img.SortOrder).FirstOrDefault().ImageUrl 
                                : ""
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            if (order == null)
            {
                return NotFound();
            }

            return Ok(order);
        }

        // PUT: api/Orders/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutOrder(int id, Order order)
        {
            if (id != order.OrderId)
            {
                return BadRequest();
            }

            _context.Entry(order).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!OrderExists(id))
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


        public class CreateOrderDto
        {
            public int? CustomerId { get; set; }
            public string FullName { get; set; }
            public string Phone { get; set; }
            public string ShippingAddress { get; set; }
            public string Notes { get; set; }
            public decimal TotalAmount { get; set; }
            public decimal? DiscountAmount { get; set; }
            public string Status { get; set; }
            public List<OrderDetailDto> OrderDetails { get; set; }
        }

        public class OrderDetailDto
        {
            public int ProductId { get; set; }
            public int Quantity { get; set; }
            public decimal UnitPrice { get; set; }
        }

        // POST: api/Orders
        [HttpPost]
        public async Task<ActionResult<Order>> PostOrder([FromBody] CreateOrderDto dto)
        {
            var order = new Order
            {
                CustomerId = dto.CustomerId,
                OrderDate = DateTime.Now,
                TotalAmount = dto.TotalAmount,
                DiscountAmount = dto.DiscountAmount,
                OrderStatus = dto.Status,
                OrderDetails = dto.OrderDetails.Select(od => new OrderDetail
                {
                    ProductId = od.ProductId,
                    Quantity = od.Quantity,
                    UnitPrice = od.UnitPrice
                }).ToList(),
                ShippingDetail = new ShippingDetail
                {
                    ReceiverName = dto.FullName,
                    ReceiverPhone = dto.Phone,
                    ShippingAddress = dto.ShippingAddress
                }
            };

            // Update Customer Address if it's missing
            if (dto.CustomerId.HasValue && dto.CustomerId.Value > 0)
            {
                var customer = await _context.Customers.FindAsync(dto.CustomerId.Value);
                if (customer != null && string.IsNullOrEmpty(customer.Address))
                {
                    customer.Address = dto.ShippingAddress;
                    _context.Customers.Update(customer);
                }
            }

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetOrder", new { id = order.OrderId }, order);
        }


        // PUT: api/Orders/5/cancel
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelOrder(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null)
            {
                return NotFound();
            }

            if (order.OrderStatus != "Chờ xử lý" && order.OrderStatus != "Pending")
            {
                return BadRequest("Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xử lý.");
            }

            order.OrderStatus = "Đã hủy";
            _context.Orders.Update(order);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã hủy đơn hàng thành công" });
        }

        // DELETE: api/Orders/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                .Include(o => o.ShippingDetail)
                .Include(o => o.Reviews)
                .Include(o => o.Payment)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null)
            {
                return NotFound();
            }

            // Xóa thủ công các bảng con trước để không bị lỗi Khóa Ngoại (FK Constraint)
            if (order.OrderDetails.Any()) _context.OrderDetails.RemoveRange(order.OrderDetails);
            if (order.ShippingDetail != null) _context.ShippingDetails.Remove(order.ShippingDetail);
            if (order.Reviews.Any()) _context.Reviews.RemoveRange(order.Reviews);
            if (order.Payment != null) _context.Payments.Remove(order.Payment);

            // Cuối cùng mới xóa đơn hàng chính
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool OrderExists(int id)
        {
            return _context.Orders.Any(e => e.OrderId == id);
        }
    }
}
