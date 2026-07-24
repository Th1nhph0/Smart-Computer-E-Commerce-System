using System;
using System.Collections.Generic;

namespace SmartEcommerceAPI.Models;

public partial class ProductRecommendation
{
    public int RuleId { get; set; }

    public int? PrimaryProductId { get; set; }

    public int? RecommendedProductId { get; set; }

    public double? SupportScore { get; set; }

    public double? ConfidenceScore { get; set; }

    public double? LiftScore { get; set; }

    public DateTime? LastCalculated { get; set; }

    public virtual Product? PrimaryProduct { get; set; }

    public virtual Product? RecommendedProduct { get; set; }
}
