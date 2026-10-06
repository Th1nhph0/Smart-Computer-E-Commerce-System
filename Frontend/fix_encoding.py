import os
import glob

replacements = {
    'T?ng Quan': 'Tổng Quan',
    'QU?N L? C?A H?NG': 'QUẢN LÝ CỬA HÀNG',
    'Nh?n s?': 'Nhân sự',
    'Kho S?n ph?m': 'Kho Sản phẩm',
    'Kh?ch h?ng': 'Khách hàng',
    'Khuy?n m?i': 'Khuyến mãi',
    'Danh s?ch ??n h?ng': 'Danh sách đơn hàng',
    'Th?m m?i ??n h?ng': 'Thêm mới đơn hàng',
    '??n h?ng': 'Đơn hàng',
    'H? TH?NG': 'HỆ THỐNG',
    '??ng Xu?t': 'Đăng Xuất',
    'CH?N S?N PH?M V?O GI? H?NG': 'CHỌN SẢN PHẨM VÀO GIỎ HÀNG',
    'S? L??NG': 'SỐ LƯỢNG',
    'T?N S?N PH?M': 'TÊN SẢN PHẨM',
    'THAO T?C': 'THAO TÁC',
    'Th?m': 'Thêm',
    '??N H?NG L?P R?P Y?U C?U ?C BI?T': 'ĐƠN HÀNG LẮP RÁP YÊU CẦU ĐẶC BIỆT',
    'TH?NG TIN KH?CH Y?U C?U T? V?N L?P R?P PC': 'THÔNG TIN KHÁCH YÊU CẦU TƯ VẤN LẮP RÁP PC',
    'T?a H?ang Nhung': 'Tạ Hoàng Nhung',
    'Đ?t h?ng': 'Đặt hàng',
    'Gi? h?ng': 'Giỏ hàng',
    'Chi ti?t': 'Chi tiết',
    'BAKERY': 'SMART PC'
}

html_files = glob.glob('Admin/**/*.html', recursive=True)
for filepath in html_files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(filepath, 'r', encoding='ansi') as f:
            content = f.read()
            
    modified = False
    for k, v in replacements.items():
        if k in content:
            content = content.replace(k, v)
            modified = True
            
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
