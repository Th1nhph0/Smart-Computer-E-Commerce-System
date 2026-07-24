using System;
using System.Collections.Generic;

namespace SmartEcommerceAPI.Models;

public partial class InventoryTransaction
{
    public int TransactionId { get; set; }

    public int ProductId { get; set; }

    public string? TransactionType { get; set; }

    public int Quantity { get; set; }

    public DateTime? TransactionDate { get; set; }

    public virtual Product Product { get; set; } = null!;
}
