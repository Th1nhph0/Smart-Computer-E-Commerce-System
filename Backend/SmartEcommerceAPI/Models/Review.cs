using System;
using System.Collections.Generic;

namespace SmartEcommerceAPI.Models;

public partial class Review
{
    public int ReviewId { get; set; }

    public int? ProductId { get; set; }

    public int? CustomerId { get; set; }

    public int? OrderId { get; set; }

    public int? Rating { get; set; }

    public string? Comment { get; set; }

    public bool? IsApproved { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Customer? Customer { get; set; }

    public virtual Order? Order { get; set; }

    public virtual Product? Product { get; set; }
}
