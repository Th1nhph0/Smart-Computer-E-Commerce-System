using System;
using System.Collections.Generic;

namespace SmartEcommerceAPI.Models;

public partial class CustomerSegment
{
    public int SegmentId { get; set; }

    public string? SegmentName { get; set; }

    public string? Description { get; set; }

    public DateTime? LastUpdated { get; set; }

    public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();
}
