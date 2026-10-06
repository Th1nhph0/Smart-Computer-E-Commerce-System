import os

filepath = 'Admin/add-order.html'
try:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    replacements = {
        'T\xef\xbf\xbdo HA3a \xef\xbf\xbd?\xef\xbf\xbdn': 'Tạo Hóa Đơn',
        'CH\xef\xbf\xbdON S\xef\xbf\xbdN PH\xef\xbf\bd"M VA?O GI\xef\xbf\bdZ HA?NG': 'CHỌN SẢN PHẨM VÀO GIỎ HÀNG',
        'TA\xef\xbf\xbdn S\xef\xbf\xbdn ph\xef\xbf\xbdcm': 'TÊN SẢN PHẨM',
        'S\xef\xbf\bd L\xef\xbf\bd\xef\xbf\xbd?ng': 'SỐ LƯỢNG',
        'S\xef\xbf\bd L\xef\xbf\bd\xef\xbf\xbd?NG': 'SỐ LƯỢNG',
        'THA"NG TIN KHA?CH YASU C\xef\xbf\xbdU': 'THÔNG TIN KHÁCH YÊU CẦU',
        'NgA\xef\xbf\xbdn SA\xef\xbf\xbdch': 'Ngân Sách',
        'ThA\xef\xbf\xbdm': 'Thêm',
        'TA\xef\xbf\xbdn S\xef\xbf\xbdn': 'Tên Sản',
        'THAO TA?C': 'THAO TÁC',
        '?N HA?NG L"P RA?P YASU CU ?C BI+T': 'ĐƠN HÀNG LẮP RÁP YÊU CẦU ĐẶC BIỆT',
        'Ta HAoAng Nhung': 'Tạ Hoàng Nhung'
    }
    
    for k, v in replacements.items():
        if k in content:
            content = content.replace(k, v)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
except Exception as e:
    print(e)
