const EMPLOYEE_API = `${API_URL}/api/Accounts`;
let globalEmployees = [];
let editingEmployeeId = null;
let currentEmployeeData = null;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('employeeTableBody')) loadEmployees();
    if (document.getElementById('formAddEmployee')) {
        checkEditMode();
        document.getElementById('formAddEmployee').addEventListener('submit', saveEmployee);
    }
});

/* =========================================================
   1. DANH SÁCH NHÂN SỰ
========================================================= */
async function loadEmployees() {
    const tbody = document.getElementById('employeeTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center mt-3"><div class="spinner-border text-primary"></div> Đang tải...</td></tr>';

    try {
        const res = await fetch(EMPLOYEE_API);
        if (!res.ok) throw new Error("Lỗi mạng");
        const allAccounts = await res.json();

        // Lọc bỏ Khách hàng (Nếu API backend của bạn có trả về .Customer)
        // Lọc Nhân sự: Lấy những ai có chức vụ KHÁC 'Customer', hoặc chưa có chức vụ
        globalEmployees = allAccounts.filter(acc => {
            if (acc.roles && acc.roles.length > 0) {
                // Kiểm tra xem tài khoản này có chức vụ nào khác 'Customer' không
                return acc.roles.some(r => (r.roleName || r.name) !== 'Customer');
            }
            return true; // Nếu mới tạo (như Acc #3) chưa có chức vụ thì vẫn cho hiện lên
        });
        renderEmployeeTable(globalEmployees);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Lỗi kết nối Server API!</td></tr>';
    }
}

function renderEmployeeTable(data) {
    const tbody = document.getElementById('employeeTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) return tbody.innerHTML = '<tr><td colspan="5" class="text-center">Chưa có tài khoản nhân sự.</td></tr>';

    data.forEach(e => {
        const id = e.accountId;
        // Lấy tên từ bảng Customer (nếu có), không có thì báo chưa cập nhật
        const name = (e.customer && e.customer.fullName) ? e.customer.fullName : 'Chưa cập nhật tên';

        // Lấy SĐT từ bảng Customer, nếu không có thì lấy đỡ Username
        const phone = (e.customer && e.customer.phone) ? e.customer.phone : (e.username || 'Chưa có SĐT');

        const email = e.email || 'Chưa có Email';

        let position = 'Nhân viên';
        if (e.roles && e.roles.length > 0) {
            position = e.roles[0].roleName || e.roles[0].name || 'Nhân viên';
        }

        let roleBadge = position.includes('Admin') || position.includes('Quản trị') || position.includes('Chủ')
            ? `<span class="badge bg-label-danger fw-bold">${position}</span>`
            : `<span class="badge bg-label-info fw-bold">${position}</span>`;

        tbody.innerHTML += `
            <tr>
                <td><strong>#${id}</strong></td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar avatar-sm me-3">
                            <span class="avatar-initial rounded-circle bg-label-primary">${name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span class="fw-semibold text-primary">${name}</span>
                    </div>
                </td>
                <td>
                    <div><i class="bx bx-phone me-1 text-success"></i> ${phone}</div>
                    <div><i class="bx bx-envelope me-1 text-warning"></i> ${email}</div>
                </td>
                <td>${roleBadge}</td>
                <td>
                    <button class="btn btn-sm btn-icon btn-outline-info me-1" onclick="window.location.href='add-employee.html?id=${id}'" title="Sửa"><i class="bx bx-edit-alt"></i></button>
                    <button class="btn btn-sm btn-icon btn-outline-danger" onclick="deleteEmployee(${id})" title="Xóa"><i class="bx bx-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function searchTable() {
    const text = document.getElementById('searchInput').value.toLowerCase().trim();
    const filtered = globalEmployees.filter(e => {
        return (e.fullName || '').toLowerCase().includes(text) ||
            (e.username || '').toLowerCase().includes(text) ||
            (e.email || '').toLowerCase().includes(text);
    });
    renderEmployeeTable(filtered);
}

async function deleteEmployee(id) {
    if (!confirm(`⚠️ CẢNH BÁO: Xóa tài khoản nhân sự #${id}?`)) return;
    try {
        const res = await fetch(`${EMPLOYEE_API}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert("Xóa thành công!");
            loadEmployees();
        } else alert("❌ Xóa thất bại!");
    } catch (e) { console.error(e); }
}

/* =========================================================
   2. THÊM / CẬP NHẬT HỒ SƠ
========================================================= */
async function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id')) {
        editingEmployeeId = urlParams.get('id');
        document.querySelector('.card-header h5').innerHTML = "<i class='bx bx-edit me-2'></i>Cập Nhật Hồ Sơ Nhân Viên";

        document.getElementById('khuVucPassTaoMoi').style.display = 'none';
        document.getElementById('matKhauTaoMoi').removeAttribute('required');
        document.getElementById('khuVucDoiPass').style.display = 'block';

        try {
            const res = await fetch(`${EMPLOYEE_API}/${editingEmployeeId}`);
            if (res.ok) {
                const e = await res.json();
                currentEmployeeData = e;

                // MAPPING DỮ LIỆU CHUẨN
                document.getElementById('tenNhanVien').value = e.fullName || '';
                document.getElementById('sdtNV').value = e.username || ''; // Kéo SĐT từ DB (Lưu ở Username)
                document.getElementById('emailNV').value = e.email || '';

                if (e.roles && e.roles.length > 0) {
                    document.getElementById('chucVu').value = e.roles[0].roleName || e.roles[0].name || 'Nhân viên';
                }
            }
        } catch (e) { console.error(e); }
    } else {
        document.getElementById('matKhauTaoMoi').setAttribute('required', 'true');
    }
}

async function saveEmployee(e) {
    e.preventDefault();
    let payload = {};

    if (editingEmployeeId && currentEmployeeData) {
        payload = Object.assign({}, currentEmployeeData);
        delete payload.customer;
        delete payload.roles;

        const passMoi = document.getElementById('matKhauMoi').value;
        const xacNhan = document.getElementById('xacNhanMatKhau').value;
        if (passMoi) {
            if (passMoi !== xacNhan) return alert("❌ Xác nhận mật khẩu không khớp!");
            payload.passwordHash = passMoi;
        }
    } else {
        payload.passwordHash = document.getElementById('matKhauTaoMoi').value;
        payload.isActive = true;
        payload.createdAt = new Date().toISOString();
    }

    // GẮN DATA MỚI TỪ FORM GIAO DIỆN XUỐNG
    payload.fullName = document.getElementById('tenNhanVien').value.trim();
    payload.email = document.getElementById('emailNV').value.trim();

    // Lấy SĐT gán vào Username để làm tài khoản đăng nhập
    payload.username = document.getElementById('sdtNV').value.trim();

    const method = editingEmployeeId ? 'PUT' : 'POST';
    const url = editingEmployeeId ? `${EMPLOYEE_API}/${editingEmployeeId}` : EMPLOYEE_API;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(editingEmployeeId ? "Đã cập nhật hồ sơ!" : "Đã tạo nhân sự mới!");
            window.location.href = "list-employee.html";
        } else {
            const errorText = await res.text();
            alert("❌ Lưu thất bại! Lỗi từ máy chủ: " + errorText);
        }
    } catch (e) { alert("Lỗi kết nối API!"); }
}