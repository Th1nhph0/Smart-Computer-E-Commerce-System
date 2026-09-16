using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEcommerceAPI.Models; 
using System.Text.Json;
using ClosedXML.Excel;

[Route("api/[controller]")]
[ApiController]
public class DataSeederController : ControllerBase
{
    private readonly SmartEcommerceDbContext _context;

    public DataSeederController(SmartEcommerceDbContext context)
    {
        _context = context;
    }

    [HttpPost("import-phongvu")]
    public async Task<IActionResult> ImportData()
    {
        // 1. Đọc file JSON từ thư mục gốc
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "phongvu_data.json");
        if (!System.IO.File.Exists(filePath)) return NotFound("Không tìm thấy file phongvu_data.json!");

        var jsonData = await System.IO.File.ReadAllTextAsync(filePath);

        // 2. Ép kiểu (Deserialize) JSON vào class PhongVuRoot
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var root = JsonSerializer.Deserialize<PhongVuRoot>(jsonData, options);

        if (root?.pageProps?.serverProducts == null) return BadRequest("Dữ liệu JSON trống!");

        int count = 0;

        // 3. Duyệt qua từng sản phẩm và đưa vào SQL Server
        foreach (var pvProduct in root.pageProps.serverProducts)
        {
            // -- A. Xử lý Brand (Hãng)
            var brandName = pvProduct.brand?.name ?? "Khác";
            var brand = await _context.Brands.FirstOrDefaultAsync(b => b.BrandName == brandName);
            if (brand == null)
            {
                brand = new Brand { BrandName = brandName };
                _context.Brands.Add(brand);
                await _context.SaveChangesAsync(); // Lưu để lấy BrandId
            }

            // -- B. Xử lý Category (Lấy danh mục chi tiết nhất ở cuối mảng)
            var categoryName = pvProduct.categories != null && pvProduct.categories.Any()
                                ? pvProduct.categories.Last().name
                                : "Chưa phân loại";
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.CategoryName == categoryName);
            if (category == null)
            {
                category = new Category { CategoryName = categoryName };
                _context.Categories.Add(category);
                await _context.SaveChangesAsync(); // Lưu để lấy CategoryId
            }

            // -- C. Xử lý Product (Chỉ thêm nếu SKU chưa tồn tại)
            if (!await _context.Products.AnyAsync(p => p.Sku == pvProduct.sku))
            {
                var newProduct = new Product
                {
                    Sku = pvProduct.sku,
                    ProductName = pvProduct.name,
                    Price = pvProduct.price?.latestPrice ?? 0,
                    CurrentStock = pvProduct.stockQuantity,
                    BrandId = brand.BrandId,
                    CategoryId = category.CategoryId,
                    Status = true,
                    CreatedAt = DateTime.Now
                };
                _context.Products.Add(newProduct);
                await _context.SaveChangesAsync();

                // -- D. Xử lý Ảnh sản phẩm
                if (!string.IsNullOrEmpty(pvProduct.imageUrl))
                {
                    _context.ProductImages.Add(new ProductImage
                    {
                        ProductId = newProduct.ProductId,
                        ImageUrl = pvProduct.imageUrl,
                        SortOrder = 1
                    });
                    await _context.SaveChangesAsync();
                }
                count++;
            }
        }

        return Ok(new { message = $"Thành công! Đã import {count} sản phẩm linh kiện PC vào Database." });
    }

    [HttpPost("import-apshop-excel")]
    public async Task<IActionResult> ImportFromExcel(string fileName = "apshop-vn-2026-09-07.xlsx")
    {
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), fileName);
        if (!System.IO.File.Exists(filePath)) return NotFound($"Không tìm thấy file {fileName}!");

        int count = 0;

        // Mở file Excel
        using (var workbook = new XLWorkbook(filePath))
        {
            var worksheet = workbook.Worksheet(1); // Lấy sheet đầu tiên
            var rows = worksheet.RangeUsed().RowsUsed().Skip(1); // Bỏ qua dòng tiêu đề

            foreach (var row in rows)
            {
                var name = row.Cell(4).GetValue<string>();       // Cột D
                var priceStr = row.Cell(5).GetValue<string>();   // Cột E
                var imageUrl = row.Cell(7).GetValue<string>();   // Cột G
                var sku = row.Cell(13).GetValue<string>();       // Cột M
                var brandName = row.Cell(14).GetValue<string>(); // Cột N

                if (string.IsNullOrEmpty(sku) || string.IsNullOrEmpty(name)) continue;

                // 1. Xử lý giá tiền (Dọn dẹp chuỗi "9,364,000₫" thành số nguyên 9364000)
                int price = 0;
                if (!string.IsNullOrEmpty(priceStr))
                {
                    var cleanPrice = priceStr.Replace("₫", "").Replace(",", "").Replace(".", "").Trim();
                    int.TryParse(cleanPrice, out price);
                }

                // 2. Xử lý Hãng (Brand)
                brandName = string.IsNullOrEmpty(brandName) ? "APShop" : brandName.Trim();
                var brand = await _context.Brands.FirstOrDefaultAsync(b => b.BrandName == brandName);
                if (brand == null)
                {
                    brand = new Brand { BrandName = brandName };
                    _context.Brands.Add(brand);
                    await _context.SaveChangesAsync();
                }

                // 3. Tự động nhận diện Danh mục (Category) từ tên sản phẩm
                string categoryName = "Linh kiện khác";
                string lowerName = name.ToLower();
                if (lowerName.Contains("vga") || lowerName.Contains("card")) categoryName = "Card màn hình (VGA)";
                else if (lowerName.Contains("main")) categoryName = "Bo mạch chủ (Mainboard)";
                else if (lowerName.Contains("ram")) categoryName = "Bộ nhớ trong (RAM)";
                else if (lowerName.Contains("cpu") || lowerName.Contains("core")) categoryName = "Bộ vi xử lý (CPU)";

                var category = await _context.Categories.FirstOrDefaultAsync(c => c.CategoryName == categoryName);
                if (category == null)
                {
                    category = new Category { CategoryName = categoryName };
                    _context.Categories.Add(category);
                    await _context.SaveChangesAsync();
                }

                // 4. Lưu Sản phẩm vào Database
                if (!await _context.Products.AnyAsync(p => p.Sku == sku))
                {
                    var newProduct = new Product
                    {
                        Sku = sku,
                        ProductName = name,
                        Price = price,
                        CurrentStock = 15, // Giả lập số lượng tồn kho
                        BrandId = brand.BrandId,
                        CategoryId = category.CategoryId,
                        Status = true,
                        CreatedAt = DateTime.Now
                    };
                    _context.Products.Add(newProduct);
                    await _context.SaveChangesAsync();

                    // Lưu hình ảnh
                    if (!string.IsNullOrEmpty(imageUrl))
                    {
                        _context.ProductImages.Add(new ProductImage
                        {
                            ProductId = newProduct.ProductId,
                            ImageUrl = imageUrl,
                            SortOrder = 1
                        });
                        await _context.SaveChangesAsync();
                    }
                    count++;
                }
            }
        }

        return Ok(new { message = $"Thành công! Đã import {count} sản phẩm từ file Excel." });
    }

    [HttpPost("import-gearvn-excel")]
    public async Task<IActionResult> ImportGearVNExcel(string fileName = "gearvn-com-2026-09-14.xlsx")
    {
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), fileName);
        if (!System.IO.File.Exists(filePath)) return NotFound($"Không tìm thấy file {fileName}!");

        int count = 0;

        using (var workbook = new XLWorkbook(filePath))
        {
            var worksheet = workbook.Worksheet(1);
            var rows = worksheet.RangeUsed().RowsUsed().Skip(1); // Bỏ qua dòng tiêu đề

            foreach (var row in rows)
            {
                // Trích xuất dữ liệu dựa theo thứ tự cột của file GearVN
                var title = row.Cell(18).GetString(); // Cột R: title
                if (string.IsNullOrEmpty(title)) title = row.Cell(15).GetString(); // Thử cột O (item_page_title) nếu R trống

                var priceStr = row.Cell(4).GetString(); // Cột D: price (hoặc price_1 ở cột S)
                if (string.IsNullOrEmpty(priceStr)) priceStr = row.Cell(19).GetString();

                var imageUrl = row.Cell(14).GetString(); // Cột N: image
                var rawBrand = row.Cell(17).GetString(); // Cột Q: brand

                // Nối 2 cột Description lại với nhau để có thông số đầy đủ
                var description = row.Cell(22).GetString() + "\n\n" + row.Cell(23).GetString();

                if (string.IsNullOrEmpty(title)) continue;

                // 1. Tự động sinh mã SKU ngẫu nhiên (Vì file thiếu SKU)
                var sku = $"GVN-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

                // 2. Làm sạch giá tiền (Loại bỏ "₫", dấu phẩy, dấu chấm)
                int price = 0;
                if (!string.IsNullOrEmpty(priceStr))
                {
                    var cleanPrice = priceStr.Replace("₫", "").Replace(",", "").Replace(".", "").Trim();
                    int.TryParse(cleanPrice, out price);
                }

                // 3. Logic tự động phân loại Category
                string categoryName = "Linh kiện khác";
                string lowerName = title.ToLower();
                if (lowerName.Contains("vga") || lowerName.Contains("card màn hình")) categoryName = "Card màn hình (VGA)";
                else if (lowerName.Contains("main")) categoryName = "Bo mạch chủ (Mainboard)";
                else if (lowerName.Contains("ram")) categoryName = "Bộ nhớ trong (RAM)";
                else if (lowerName.Contains("cpu") || lowerName.Contains("core") || lowerName.Contains("ryzen")) categoryName = "Bộ vi xử lý (CPU)";
                else if (lowerName.Contains("nguồn") || lowerName.Contains("psu")) categoryName = "Nguồn máy tính (PSU)";
                else if (lowerName.Contains("tản nhiệt")) categoryName = "Tản nhiệt CPU";
                else if (lowerName.Contains("case") || lowerName.Contains("thùng máy")) categoryName = "Thùng máy (Case)";

                var category = await _context.Categories.FirstOrDefaultAsync(c => c.CategoryName == categoryName);
                if (category == null)
                {
                    category = new Category { CategoryName = categoryName };
                    _context.Categories.Add(category);
                    await _context.SaveChangesAsync();
                }

                // 4. Lọc Hãng (Brand)
                // Lấy từ đầu tiên của cột Brand hoặc để mặc định nếu chuỗi quá dài (bị lỗi scrape)
                string brandName = string.IsNullOrEmpty(rawBrand) || rawBrand.Length > 20
                                   ? "GearVN"
                                   : rawBrand.Split(' ').FirstOrDefault() ?? "GearVN";

                var brand = await _context.Brands.FirstOrDefaultAsync(b => b.BrandName == brandName);
                if (brand == null)
                {
                    brand = new Brand { BrandName = brandName };
                    _context.Brands.Add(brand);
                    await _context.SaveChangesAsync();
                }

                // 5. Lưu Sản phẩm vào DB
                var newProduct = new Product
                {
                    Sku = sku,
                    ProductName = title,
                    Price = price,
                    Description = description,
                    CurrentStock = 15, // Giả lập tồn kho
                    BrandId = brand.BrandId,
                    CategoryId = category.CategoryId,
                    Status = true,
                    CreatedAt = DateTime.Now
                };
                _context.Products.Add(newProduct);
                await _context.SaveChangesAsync();

                // 6. Lưu hình ảnh chính
                if (!string.IsNullOrEmpty(imageUrl))
                {
                    _context.ProductImages.Add(new ProductImage
                    {
                        ProductId = newProduct.ProductId,
                        ImageUrl = imageUrl,
                        SortOrder = 1
                    });
                    await _context.SaveChangesAsync();
                }

                count++;
            }

            return Ok(new { message = $"Hoàn tất! Đã xử lý và import thành công {count} sản phẩm từ file Excel." });
        }
    }
}