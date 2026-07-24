using System;
using System.Collections.Generic;

namespace SmartEcommerceAPI.Models;

public partial class Payment
{
    public int PaymentId { get; set; }

    public int? OrderId { get; set; }

    public string? PaymentMethod { get; set; }

    public string? PaymentStatus { get; set; }

    public string? TransactionCode { get; set; }

    public DateTime? TransactionDate { get; set; }

    public virtual Order? Order { get; set; }
}
