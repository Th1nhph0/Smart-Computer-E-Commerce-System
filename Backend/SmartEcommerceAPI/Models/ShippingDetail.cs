using System;
using System.Collections.Generic;

namespace SmartEcommerceAPI.Models;

public partial class ShippingDetail
{
    public int ShippingId { get; set; }

    public int? OrderId { get; set; }

    public string? ReceiverName { get; set; }

    public string? ReceiverPhone { get; set; }

    public string? ShippingAddress { get; set; }

    public string? TrackingCode { get; set; }

    public virtual Order? Order { get; set; }
}
