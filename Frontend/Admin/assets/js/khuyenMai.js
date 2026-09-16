const PROMOTION_API = `${API_URL}/api/Promotions`;
let globalPromotions = [];
let editingPromotionId = null;

// Lấy ngày hôm nay chuẩn theo giờ Việt Nam (yyyy-MM-dd)
const now = new Date();
const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('promotionTableBody')) loadPromotions();

    if (document.getElementById('formAddPromotion')) {
        checkEditMode();
        document.getElementById('formAddPromotion').addEventListener('submit', savePromotion);

        // 1. GIAO DIỆN CHUYỂN ĐỔI % VÀ VNĐ
        const typeSelect = document.getElementById('loaiGiamGia');
        typeSelect.addEventListener('change', function () {
            const label = document.getElementById('labelGiamGia');
            const input = document.getElementById('phanTramGiam');

            if (this.value === 'Percent') {
                label.innerText = 'Mức giảm giá (%)';
                input.placeholder = 'Nhập từ 1 đến 100';
                input.max = '100';
            } else {
                label.innerText = 'Mức giảm tiền mặt (VNĐ)';
                input.placeholder = 'Ví dụ: 50000';
                input.removeAttribute('max');
            }
        });

        // 2. KHÓA LỊCH (LÀM MỜ XÁM CÁC NGÀY QUÁ KHỨ)
        const ngayBatDau = document.getElementById('ngayBatDau');
        const ngayKetThuc = document.getElementById('ngayKetThuc');

        if (ngayBatDau && ngayKetThuc) {
            // Mặc định cứ vào form là khóa toàn bộ ngày quá khứ (không cho tick)
            ngayBatDau.min = todayStr;
            ngayKetThuc.min = todayStr;

            ngayBatDau.addEventListener('change', function () {
                // Ngày KT tối thiểu phải bằng Ngày BĐ (hoặc hôm nay nếu BĐ là quá khứ)
                ngayKetThuc.min = this.value < todayStr ? todayStr : this.value;

                if (ngayKetThuc.value && ngayKetThuc.value < ngayKetThuc.min) {
                    ngayKetThuc.value = ngayKetThuc.min;
                }
            });
        }
    }
});

/* =========================================================
   1. GIAO DIỆN DANH SÁCH KHUYẾN MÃI
========================================================= */
async function loadPromotions() {
    const tbody = document.getElementById('promotionTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center mt-3"><div class="spinner-border text-primary"></div> Đang tải...</td></tr>';

    try {
        const res = await fetch(PROMOTION_API);
        if (!res.ok) throw new Error("Lỗi mạng");
        globalPromotions = await res.json();
        renderPromotionTable(globalPromotions);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi kết nối Server API!</td></tr>';
    }
}

function renderPromotionTable(data) {
    const tbody = document.getElementById('promotionTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) return tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có mã khuyến mãi nào.</td></tr>';

    const today = new Date();

    data.forEach(p => {
        const id = p.promotionId;
        const code = p.promotionName || 'TRỐNG';
        const discount = p.discountValue || 0;
        const type = p.discountType || 'Percent';

        let displayDiscount = type === 'Amount' ? `-${Number(discount).toLocaleString('vi-VN')}đ` : `-${discount}%`;

        const startRaw = p.startDate;
        const endRaw = p.endDate;

        const startDateStr = startRaw ? new Date(startRaw).toLocaleDateString('vi-VN') : 'Không rõ';
        const endDateStr = endRaw ? new Date(endRaw).toLocaleDateString('vi-VN') : 'Không rõ';

        const endDate = new Date(endRaw);
        let statusBadge = (endDate >= today && p.status !== false)
            ? '<span class="badge bg-label-success">Đang áp dụng</span>'
            : '<span class="badge bg-label-secondary">Đã hết hạn</span>';

        tbody.innerHTML += `
            <tr>
                <td><strong>#${id}</strong></td>
                <td><span class="badge bg-primary fs-6 fw-bold">${code}</span></td>
                <td><b class="text-danger">${displayDiscount}</b></td>
                <td>${startDateStr}</td>
                <td>${endDateStr} <br/> ${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-icon btn-outline-info me-1" onclick="window.location.href='add-khuyenMai.html?id=${id}'" title="Sửa"><i class="bx bx-edit-alt"></i></button>
                    <button class="btn btn-sm btn-icon btn-outline-danger" onclick="deletePromotion(${id})" title="Xóa"><i class="bx bx-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function searchTable() {
    const text = document.getElementById('searchInput').value.toLowerCase().trim();
    const filtered = globalPromotions.filter(p => (p.promotionName || '').toLowerCase().includes(text));
    renderPromotionTable(filtered);
}

async function deletePromotion(id) {
    if (!confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa mã giảm giá #${id}?`)) return;
    try {
        const res = await fetch(`${PROMOTION_API}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert("Xóa thành công!");
            loadPromotions();
        } else {
            alert("❌ Xóa thất bại! Mã này có thể đang bị dính với khóa ngoại bên bảng Đơn Hàng.");
        }
    } catch (e) { console.error(e); }
}

/* =========================================================
   2. GIAO DIỆN THÊM / CẬP NHẬT KHUYẾN MÃI
========================================================= */
let currentPromotionData = null;

async function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id')) {
        editingPromotionId = urlParams.get('id');
        document.querySelector('.card-header h5').innerHTML = "<i class='bx bx-edit me-2'></i>Cập Nhật Mã Giảm Giá";

        try {
            const res = await fetch(`${PROMOTION_API}/${editingPromotionId}`);
            if (res.ok) {
                const p = await res.json();
                currentPromotionData = p;

                document.getElementById('maCode').value = p.promotionName || '';
                document.getElementById('phanTramGiam').value = p.discountValue || '';

                const typeSelect = document.getElementById('loaiGiamGia');
                typeSelect.value = p.discountType || 'Percent';
                typeSelect.dispatchEvent(new Event('change'));

                if (p.startDate) {
                    const sd = p.startDate.split('T')[0];
                    const ngayBatDau = document.getElementById('ngayBatDau');
                    const ngayKetThuc = document.getElementById('ngayKetThuc');

                    ngayBatDau.value = sd;

                    // THUẬT TOÁN ĐẶC BIỆT KHI EDIT:
                    // Mở khóa min lùi lại đúng bằng ngày lịch sử để trình duyệt không báo lỗi đỏ
                    if (sd < todayStr) {
                        ngayBatDau.min = sd;
                    }
                    ngayKetThuc.min = (sd < todayStr) ? todayStr : sd;
                }
                if (p.endDate) document.getElementById('ngayKetThuc').value = p.endDate.split('T')[0];
            }
        } catch (e) { console.error(e); }
    }
}

async function savePromotion(e) {
    e.preventDefault();
    let payload = {};

    if (editingPromotionId && currentPromotionData) {
        payload = Object.assign({}, currentPromotionData);
        delete payload.orders;
        delete payload.products;
    } else {
        payload.status = true;
    }

    payload.promotionName = document.getElementById('maCode').value.toUpperCase().trim();
    payload.discountType = document.getElementById('loaiGiamGia').value;
    payload.discountValue = parseInt(document.getElementById('phanTramGiam').value);

    // Ép giờ 00:00:00 và 23:59:59 để tối ưu khách mua hàng trùng ngày
    payload.startDate = document.getElementById('ngayBatDau').value + "T00:00:00";
    payload.endDate = document.getElementById('ngayKetThuc').value + "T23:59:59";

    const method = editingPromotionId ? 'PUT' : 'POST';
    const url = editingPromotionId ? `${PROMOTION_API}/${editingPromotionId}` : PROMOTION_API;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(editingPromotionId ? "Đã cập nhật Mã giảm giá!" : "Đã tạo Mã giảm giá thành công!");
            window.location.href = "list-khuyenMai.html";
        } else {
            const errorText = await res.text();
            alert("❌ Lưu thất bại! Lỗi từ C#: " + errorText);
        }
    } catch (e) { alert("Lỗi kết nối tới máy chủ API!"); }
}