import os
import glob

replacements = {
    'T\xef\xbf\xbd ng Quan': 'Tổng Quan',
    'Qu\xef\xbf\xbdn LA\xef\xbf\xbd C\xef\xbf\xbd-a HA\xef\xbf\xbdng': 'QUẢN LÝ CỬA HÀNG',
    'NhA\xef\xbf\xbdn s\xef\xbf\xbd': 'Nhân sự',
    'Kho S\xef\xbf\bdn ph\xef\xbf\xbdcm': 'Kho Sản phẩm',
    'S\xef\xbf\xbdn ph\xef\xbf\xbdcm': 'Sản phẩm',
    'KhA\xef\xbf\xbdch hA\xef\xbf\xbdng': 'Khách hàng',
    'Khuy\xef\xbf\xbdn mA\xef\xbf\xbdi': 'Khuyến mãi',
    'Danh sA\xef\xbf\xbdch': 'Danh sách',
    'ThA\xef\xbf\xbdm m\xef\xbf\xbd>i': 'Thêm mới',
    '\xef\xbf\xbd?\xef\xbf\xbdn hA\xef\xbf\xbdng': 'Đơn hàng',
    'ThA\xef\xbf\xbdm/C\xef\xbf\xbd-p nh\xef\xbf\xbd-t': 'Thêm/Cập nhật',
    'H\xef\xbf\xbd" s\xef\xbf\xbd': 'Hồ sơ',
    'NhA\xef\xbf\xbdn viA\xef\xbf\xbdn': 'Nhân viên'
}

html_files = glob.glob('Admin/**/*.html', recursive=True)
for filepath in html_files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        modified = False
        for k, v in replacements.items():
            if k in content:
                content = content.replace(k, v)
                modified = True
                
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
    except Exception as e:
        pass
