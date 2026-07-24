using System;
using System.Collections.Generic;

namespace SmartEcommerceAPI.Models;

public partial class Customer
{
    public int CustomerId { get; set; }

    public int AccountId { get; set; }

    public string? FullName { get; set; }

    public string? Phone { get; set; }

    public string? Address { get; set; }

    public int? SegmentId { get; set; }

    public virtual Account Account { get; set; } = null!;

    public virtual Cart? Cart { get; set; }

    public virtual ICollection<CustomBuild> CustomBuilds { get; set; } = new List<CustomBuild>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual CustomerSegment? Segment { get; set; }
}
