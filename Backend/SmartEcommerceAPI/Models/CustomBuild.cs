using System;
using System.Collections.Generic;

namespace SmartEcommerceAPI.Models;

public partial class CustomBuild
{
    public int BuildId { get; set; }

    public int? CustomerId { get; set; }

    public string? IntendedUse { get; set; }

    public decimal? TargetBudget { get; set; }

    public string? RequestedSpecs { get; set; }

    public string? StaffNotes { get; set; }

    public string? Status { get; set; }

    public int? FinalOrderId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Customer? Customer { get; set; }

    public virtual Order? FinalOrder { get; set; }
}
