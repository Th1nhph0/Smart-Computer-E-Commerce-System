using System;
using System.IO;
using System.Text;

class Program
{
    static void Main()
    {
        string[] files = Directory.GetFiles("Admin", "*.html", SearchOption.AllDirectories);
        foreach (var file in files)
        {
            string content = File.ReadAllText(file, Encoding.Default);
            bool modified = false;
            
            var replacements = new System.Collections.Generic.Dictionary<string, string>
            {
                { "T?ng Quan", "T?ng Quan" },
                { "QU?N L? C?A H?NG", "QU?N LÝ C?A HÀNG" },
                { "Nh?n s?", "Nhân s?" },
                { "Kho S?n ph?m", "Kho S?n ph?m" },
                { "Kh?ch h?ng", "Khách hàng" },
                { "Khuy?n m?i", "Khuy?n mãi" },
                { "Danh s?ch ??n h?ng", "Danh sách don hàng" },
                { "Th?m m?i ??n h?ng", "Thêm m?i don hàng" },
                { "H? TH?NG", "H? TH?NG" },
                { "??ng Xu?t", "Ðang Xu?t" },
                { "CH?N S?N PH?M V?O GI? H?NG", "CH?N S?N PH?M VÀO GI? HÀNG" },
                { "S? L??NG", "S? LU?NG" },
                { "T?N S?N PH?M", "TÊN S?N PH?M" },
                { "THAO T?C", "THAO TÁC" },
                { "Th?m", "Thêm" },
                { "??N H?NG L?P R?P Y?U C?U ?C BI?T", "ÐON HÀNG L?P RÁP YÊU C?U Ð?C BI?T" },
                { "TH?NG TIN KH?CH Y?U C?U T? V?N L?P R?P PC", "THÔNG TIN KHÁCH YÊU C?U TU V?N L?P RÁP PC" },
                { "T?a H?ang Nhung", "T? Hoàng Nhung" },
                { "Ð?t h?ng", "Ð?t hàng" },
                { "Gi? h?ng", "Gi? hàng" },
                { "Chi ti?t", "Chi ti?t" }
            };

            foreach (var kvp in replacements)
            {
                if (content.Contains(kvp.Key))
                {
                    content = content.Replace(kvp.Key, kvp.Value);
                    modified = true;
                }
            }
            if (modified)
            {
                File.WriteAllText(file, content, Encoding.UTF8);
            }
        }
    }
}
