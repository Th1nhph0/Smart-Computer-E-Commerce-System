using System;
using System.Collections.Generic;

namespace SmartEcommerceAPI.Models;

public partial class Product
{
    public int ProductId { get; set; }

    public int CategoryId { get; set; }

    public int BrandId { get; set; }

    public string ProductName { get; set; } = null!;

    public string? Sku { get; set; }

    public decimal Price { get; set; }

    public int? CurrentStock { get; set; }

    public int? WarrantyMonths { get; set; }

    public string? Specifications { get; set; }

    public bool? Status { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Brand Brand { get; set; } = null!;

    public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();

    public virtual Category Category { get; set; } = null!;

    public virtual ICollection<InventoryTransaction> InventoryTransactions { get; set; } = new List<InventoryTransaction>();

    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();

    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();

    public virtual ICollection<ProductRecommendation> ProductRecommendationPrimaryProducts { get; set; } = new List<ProductRecommendation>();

    public virtual ICollection<ProductRecommendation> ProductRecommendationRecommendedProducts { get; set; } = new List<ProductRecommendation>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<Promotion> Promotions { get; set; } = new List<Promotion>();
}
