using System;
using System.Collections.Generic;
using System.Linq;

namespace SmartEcommerceAPI.DataMining
{
    public class CustomerDataPoint
    {
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public int OrderCount { get; set; }
        public decimal TotalSpend { get; set; }
        
        // Normalized values for K-Means (0 to 1)
        public double NormOrderCount { get; set; }
        public double NormTotalSpend { get; set; }
        
        // Output cluster
        public int ClusterId { get; set; }
    }

    public class KMeansResult
    {
        public int ClusterId { get; set; }
        public string ClusterName { get; set; } = string.Empty;
        public int CustomerCount { get; set; }
        public double AverageOrderCount { get; set; }
        public decimal AverageTotalSpend { get; set; }
        public List<CustomerDataPoint> Customers { get; set; } = new List<CustomerDataPoint>();
    }

    public class KMeansClustering
    {
        public static List<KMeansResult> ClusterCustomers(List<CustomerDataPoint> data, int k = 3, int maxIterations = 100)
        {
            if (data == null || data.Count == 0) return new List<KMeansResult>();

            // 1. Normalize Data (Min-Max Scaling)
            double minOrder = data.Min(d => d.OrderCount);
            double maxOrder = data.Max(d => d.OrderCount);
            double minSpend = (double)data.Min(d => d.TotalSpend);
            double maxSpend = (double)data.Max(d => d.TotalSpend);

            foreach (var point in data)
            {
                point.NormOrderCount = maxOrder == minOrder ? 0 : (point.OrderCount - minOrder) / (maxOrder - minOrder);
                point.NormTotalSpend = maxSpend == minSpend ? 0 : ((double)point.TotalSpend - minSpend) / (maxSpend - minSpend);
            }

            // 2. Initialize Centroids
            var random = new Random(42); // Fixed seed for reproducible results
            var centroids = new List<(double X, double Y)>();
            
            // Pick K distinct random points as initial centroids
            var distinctPoints = data.OrderBy(x => random.Next()).Take(k).ToList();
            foreach (var p in distinctPoints)
            {
                centroids.Add((p.NormOrderCount, p.NormTotalSpend));
            }
            
            // If less than K customers exist, just duplicate (rare)
            while (centroids.Count < k) centroids.Add((0,0));

            // 3. Iterate until convergence
            bool changed = true;
            int iter = 0;
            while (changed && iter < maxIterations)
            {
                changed = false;
                iter++;

                // Assign each point to the closest centroid
                foreach (var point in data)
                {
                    int bestCluster = 0;
                    double minDistance = double.MaxValue;

                    for (int i = 0; i < k; i++)
                    {
                        double dist = Math.Pow(point.NormOrderCount - centroids[i].X, 2) + Math.Pow(point.NormTotalSpend - centroids[i].Y, 2);
                        if (dist < minDistance)
                        {
                            minDistance = dist;
                            bestCluster = i;
                        }
                    }

                    if (point.ClusterId != bestCluster)
                    {
                        point.ClusterId = bestCluster;
                        changed = true;
                    }
                }

                // Update centroids
                for (int i = 0; i < k; i++)
                {
                    var clusterPoints = data.Where(p => p.ClusterId == i).ToList();
                    if (clusterPoints.Count > 0)
                    {
                        double avgX = clusterPoints.Average(p => p.NormOrderCount);
                        double avgY = clusterPoints.Average(p => p.NormTotalSpend);
                        centroids[i] = (avgX, avgY);
                    }
                }
            }

            // 4. Format Results
            var results = new List<KMeansResult>();
            for (int i = 0; i < k; i++)
            {
                var clusterPoints = data.Where(p => p.ClusterId == i).ToList();
                if (clusterPoints.Count > 0)
                {
                    results.Add(new KMeansResult
                    {
                        ClusterId = i,
                        CustomerCount = clusterPoints.Count,
                        AverageOrderCount = clusterPoints.Average(p => p.OrderCount),
                        AverageTotalSpend = clusterPoints.Count > 0 ? clusterPoints.Average(p => p.TotalSpend) : 0,
                        Customers = clusterPoints
                    });
                }
            }

            // 5. Smart Naming for Clusters (Sort by Average Spend descending)
            results = results.OrderByDescending(r => r.AverageTotalSpend).ToList();
            if (results.Count > 0) results[0].ClusterName = "Khách hàng VIP (Mua nhiều, chi khủng)";
            if (results.Count > 1) results[1].ClusterName = "Khách hàng Tiềm năng (Chi tiêu trung bình)";
            if (results.Count > 2) results[2].ClusterName = "Khách hàng Vãng lai (Chi tiêu thấp)";

            for(int i = 3; i < results.Count; i++)
            {
                results[i].ClusterName = $"Cụm khách hàng #{i + 1}";
            }

            return results;
        }
    }
}
