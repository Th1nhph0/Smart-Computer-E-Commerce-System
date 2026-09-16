const CUSTOMER_API = `${API_URL}/api/Customers`;
let globalCustomers = [];
let editingCustomerId = null;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('customerTableBody')) loadCustomers();

    if (document.getElementById('formAddCustomer')) {
        checkEditMode();
        document.getElementById('formAddCustomer').addEventListener('submit', saveCustomer);
    }
});

/* =========================================================
   1. GIAO DIỆN DANH SÁCH KHÁCH HÀNG
========================================================= */
async function loadCustomers() {
    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center mt-3"><div class="spinner-border text-primary"></div> Đang tải...</td></tr>';

    try {
        const res = await fetch(CUSTOMER_API);
        if (!res.ok) throw new Error("Lỗi mạng");
        globalCustomers = await res.json();
        renderCustomerTable(globalCustomers);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi kết nối Server!</td></tr>';
    }
}

function renderCustomerTable(data) {
    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) return tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có khách hàng.</td></tr>';

    data.forEach(c => {
        const id = c.customerId || c.id;
        const name = c.fullName || 'Chưa cập nhật';
        const phone = c.phone || 'Trống';
        const email = (c.account && c.account.email) ? c.account.email : 'Trống';
        const initial = name.charAt(0).toUpperCase();

        tbody.innerHTML += `
            <tr>
                <td><strong>#${id}</strong></td>
                <td><div class="d-flex align-items-center"><div class="avatar avatar-sm me-3"><span class="avatar-initial rounded-circle bg-label-primary">${initial}</span></div><span class="fw-semibold text-primary">${name}</span></div></td>
                <td><i class="bx bx-phone me-1 text-muted"></i> ${phone}</td>
                <td>${email}</td>
                <td class="text-truncate" style="max-width: 150px;">${c.address || ''}</td>
                <td>
                    <button class="btn btn-sm btn-icon btn-outline-info me-1" onclick="window.location.href='add-customer.html?id=${id}'" title="Sửa"><i class="bx bx-edit-alt"></i></button>
                    <button class="btn btn-sm btn-icon btn-outline-danger" onclick="deleteCustomer(${id})" title="Xóa"><i class="bx bx-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function searchTable() {
    const text = document.getElementById('searchInput').value.toLowerCase().trim();
    const filtered = globalCustomers.filter(c => (c.fullName || '').toLowerCase().includes(text) || (c.phone || '').includes(text));
    renderCustomerTable(filtered);
}

async function deleteCustomer(id) {
    if (!confirm(`⚠️ Xóa khách hàng #${id}? Nếu khách đã có Đơn hàng thì sẽ không xóa được.`)) return;
    try {
        const res = await fetch(`${CUSTOMER_API}/${id}`, { method: 'DELETE' });
        if (res.ok) { alert("Xóa thành công!"); loadCustomers(); }
        else { alert("❌ Xóa thất bại do vướng lịch sử hóa đơn."); }
    } catch (e) { console.error(e); }
}

// Thêm 1 biến này ở đầu file (dưới biến editingCustomerId)
let currentCustomerData = null;

async function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id')) {
        editingCustomerId = urlParams.get('id');
        document.querySelector('.card-header h5').innerHTML = "<i class='bx bx-edit me-2'></i>Cập Nhật Khách Hàng";

        // MỚI SỬA Ở ĐÂY: Bật hiển thị khu vực Nhập mật khẩu mới
        const resetSec = document.getElementById('forceResetSection');
        const resetDiv = document.getElementById('resetDivider');
        if (resetSec) resetSec.style.display = 'block';
        if (resetDiv) resetDiv.style.display = 'block';

        try {
            const res = await fetch(`${CUSTOMER_API}/${editingCustomerId}`);
            if (res.ok) {
                const c = await res.json();

                // GIỮ LẠI TOÀN BỘ DATA GỐC ĐỂ LÁT NỮA GỬI TRẢ LẠI CHO C#
                currentCustomerData = c;

                document.getElementById('tenKhachHang').value = c.fullName || '';
                document.getElementById('soDienThoai').value = c.phone || '';
                document.getElementById('diaChiKH').value = c.address || '';
                if (c.account && c.account.email) document.getElementById('emailKH').value = c.account.email;
            }
        } catch (e) { console.error(e); }
    }
}

async function saveCustomer(e) {
    e.preventDefault();

    let payload = {};

    if (editingCustomerId && currentCustomerData) {
        // KHI SỬA: Lấy lại thông tin gốc của khách (để giữ nguyên AccountId thật), chỉ đè thông tin trên form
        payload = Object.assign({}, currentCustomerData);
        payload.fullName = document.getElementById('tenKhachHang').value;
        payload.phone = document.getElementById('soDienThoai').value;
        payload.address = document.getElementById('diaChiKH').value;

        // Xóa các bảng liên kết thừa để C# không bị rối và báo lỗi Tracking
        delete payload.account;
        delete payload.cart;
        delete payload.customBuilds;
        delete payload.orders;
        delete payload.reviews;
    } else {
        // KHI THÊM MỚI
        payload = {
            fullName: document.getElementById('tenKhachHang').value,
            phone: document.getElementById('soDienThoai').value,
            address: document.getElementById('diaChiKH').value,
            accountId: 1 // Vẫn giữ tạm ID 1
        };
    }

    const method = editingCustomerId ? 'PUT' : 'POST';
    const url = editingCustomerId ? `${CUSTOMER_API}/${editingCustomerId}` : CUSTOMER_API;

    try {
        const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            alert(editingCustomerId ? "Đã lưu cập nhật!" : "Đã thêm khách hàng mới!");
            window.location.href = "list-customer.html";
        } else {
            // ĐỌC TRỰC TIẾP LỖI TỪ C# TRẢ VỀ ĐỂ BẮT BỆNH
            const errorText = await res.text();
            console.error("Lỗi C# trả về:", errorText);
            alert("❌ Lưu thất bại! Lỗi từ C#: " + errorText);
        }
    } catch (e) { alert("Lỗi kết nối tới máy chủ API!"); }
}
// HÀM ÉP ĐỔI MẬT KHẨU TÙY CHỌN (Dành cho Admin)
async function forceResetPassword() {
    const phone = document.getElementById('soDienThoai').value.trim();
    const newPass = document.getElementById('customNewPassword').value.trim();

    if (!phone) return alert("Không tìm thấy Số điện thoại của khách hàng!");

    // Kiểm tra xem Admin đã nhập mật khẩu mới vào ô textbox chưa
    if (!newPass) {
        alert("⚠️ Vui lòng nhập mật khẩu mới vào ô trống!");
        document.getElementById('customNewPassword').focus();
        return;
    }

    if (!confirm(`⚠️ XÁC NHẬN: Bạn muốn đổi mật khẩu của khách hàng (SĐT: ${phone}) thành: "${newPass}" ?`)) return;

    try {
        const res = await fetch(`${API_URL}/api/Accounts/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Phone: phone, NewPassword: newPass })
        });

        if (res.ok) {
            alert(`✅ Đã đổi mật khẩu thành công!\nMật khẩu mới của khách là: ${newPass}`);
            document.getElementById('customNewPassword').value = ''; // Xóa trắng ô nhập cho đẹp
        } else {
            alert("❌ Lỗi: Không thể reset. Có thể Số điện thoại này chưa được liên kết với Tài khoản nào.");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối máy chủ API!");
    }
}