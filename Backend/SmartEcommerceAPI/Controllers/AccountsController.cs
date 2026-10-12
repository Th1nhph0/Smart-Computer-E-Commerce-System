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
    public class AccountsController : ControllerBase
    {
        private readonly SmartEcommerceDbContext _context;

        public AccountsController(SmartEcommerceDbContext context)
        {
            _context = context;
        }

        // GET: api/Accounts
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Account>>> GetAccounts()
        {
            return await _context.Accounts
                .Include(a => a.Roles)
                .Include(a => a.Customer)
                .ToListAsync();
        }

        // GET: api/Accounts/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Account>> GetAccount(int id)
        {
            var account = await _context.Accounts.FindAsync(id);

            if (account == null)
            {
                return NotFound();
            }

            return account;
        }

        // PUT: api/Accounts/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAccount(int id, Account account)
        {
            if (id != account.AccountId)
            {
                return BadRequest();
            }

            _context.Entry(account).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AccountExists(id))
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

        // POST: api/Accounts
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Account>> PostAccount(Account account)
        {
            bool exists = await _context.Accounts.AnyAsync(a => a.Username == account.Username || a.Email == account.Email);
            if (exists)
            {
                return BadRequest(new { message = "Số điện thoại hoặc Email này đã tồn tại trong hệ thống!" });
            }
            _context.Accounts.Add(account);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetAccount", new { id = account.AccountId }, account);
        }

        // DELETE: api/Accounts/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAccount(int id)
        {
            var account = await _context.Accounts.FindAsync(id);
            if (account == null)
            {
                return NotFound();
            }

            _context.Accounts.Remove(account);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool AccountExists(int id)
        {
            return _context.Accounts.Any(e => e.AccountId == id);
        }

        // POST: api/Accounts/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // request.Username có thể là "0987654321" hoặc "khachhang@gmail.com"
            if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { message = "Vui lòng nhập tài khoản và mật khẩu!" });
            } 

            string input = request.Username.Trim();
            string pass = request.Password;

            // Truy vấn linh hoạt: Tìm trong Account (Email) HOẶC tìm trong Customer (Phone)
            var account = await _context.Accounts
                .Include(a => a.Customer)
                .Include(a => a.Roles)// Join sang bảng Customer
                .FirstOrDefaultAsync(a =>
                    (a.Email == input || (a.Customer != null && a.Customer.Phone == input))
                    && a.PasswordHash == pass // Nếu báo lỗi PasswordHash thì đổi thành Password nhé
                );

            if (account == null)
            {
                return BadRequest(new { message = "Sai Số điện thoại, Email hoặc Mật khẩu!" });
            }
            var roleValue = account.Roles.Any(r => r.RoleName == "Admin") ? "Admin" : "Customer";
            // Thành công -> Trả về Token hoặc thông tin đăng nhập
            return Ok(new
            {
                message = "Đăng nhập thành công!",
                accountId = account.AccountId,
                email = account.Email,
                role = roleValue,           // ← thực từ DB
                accessToken = Guid.NewGuid().ToString(),  // ← tạm thời để frontend không bị chặn
                customerId = account.Customer?.CustomerId ?? 0,
                fullName = account.Customer?.FullName ?? "",
                phone = account.Customer?.Phone ?? "",
                address = account.Customer?.Address ?? ""
            });
        }

        // Khai báo một class nhỏ để nhận dữ liệu từ giao diện gửi lên
        public class LoginRequest
        {
            public string Username { get; set; }
            public string Password { get; set; }
        }
        // POST: api/Accounts/reset-password
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPassRequest req)
        {
            // Tìm Account dựa theo Số điện thoại trong bảng Customer
            var account = await _context.Accounts
                 .Include(a => a.Customer)
                 .FirstOrDefaultAsync(a => a.Customer != null && a.Customer.Phone == req.Phone);

            if (account == null)
            {
                return BadRequest(new { message = "Không tìm thấy tài khoản với số điện thoại này!" });
            }

            // Ghi đè mật khẩu mới
            account.PasswordHash = req.NewPassword;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công!" });
        }
        // POST: api/Accounts/ChangePassword
        [HttpPost("ChangePassword")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            // Tìm tài khoản trong Database
            var account = await _context.Accounts.FindAsync(request.AccountId);
            if (account == null)
            {
                return NotFound(new { message = "Tài khoản không tồn tại!" });
            }

            // Kiểm tra mật khẩu cũ
            if (account.PasswordHash != request.OldPassword)
            {
                return BadRequest(new { message = "Mật khẩu hiện tại không chính xác!" });
            }

            // Cập nhật mật khẩu mới
            account.PasswordHash = request.NewPassword;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Đổi mật khẩu thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi máy chủ: " + ex.Message });
            }
        }

        // Class nhận dữ liệu từ Javascript gửi lên
        public class ResetPassRequest
        {
            public string Phone { get; set; }
            public string NewPassword { get; set; }
        }
        public class ChangePasswordRequest
        {
            public int AccountId { get; set; }
            public string OldPassword { get; set; } = null!;
            public string NewPassword { get; set; } = null!;
        }
    }

}
