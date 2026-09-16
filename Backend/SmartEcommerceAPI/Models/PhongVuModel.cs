using System.Collections.Generic;

namespace SmartEcommerceAPI.Models
{
    public class Price
    {
        public int latestPrice { get; set; }
    }

    // Đổi tên thành PhongVuBrand để tránh trùng với Brand của DB
    public class PhongVuBrand
    {
        public string name { get; set; }
    }

    // Đổi tên thành PhongVuCategory để tránh trùng với Category của DB
    public class PhongVuCategory
    {
        public string name { get; set; }
        public int id { get; set; }
    }

    public class ServerProduct
    {
        public string sku { get; set; }
        public string name { get; set; }
        public string imageUrl { get; set; }
        public Price price { get; set; }
        public int stockQuantity { get; set; }

        // Cập nhật lại kiểu dữ liệu theo tên class mới
        public PhongVuBrand brand { get; set; }
        public List<PhongVuCategory> categories { get; set; }
    }

    public class PageProps
    {
        public List<ServerProduct> serverProducts { get; set; }
    }

    public class PhongVuRoot
    {
        public PageProps pageProps { get; set; }
    }
}