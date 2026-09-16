const ORDER_API = `${API_URL}/api/Orders`;

let globalOrders = [];
let filteredOrders = [];
let currentTypeFilter = 'all'; // 'all', 'standard', 'custom'

document.addEventListener("DOMContentLoaded", () => {
    loadOrders();
});

// =====================================
// 1. TẢI DỮ LIỆU TỪ API C#
// =====================================
async function loadOrders() {
    const grid = document.getElementById('gridAllOrders');
    grid.innerHTML = '<div class="col-12 text-center text-primary mt-5"><div class="spinner-border" role="status"></div><p>Đang tải đơn hàng...</p></div>';

    try {
        const response = await fetch(ORDER_API);
        if (!response.ok) throw new Error("Lỗi mạng");
        globalOrders = await response.json();

        executeCombinedFilter(); // Gọi bộ lọc tổng hợp
    } catch (error) {
        grid.innerHTML = '<div class="col-12 text-center text-danger mt-5"><i class="bx bx-error-alt fs-1"></i><p>Lỗi kết nối Server!</p></div>';
    }
}

// =====================================
// 2. BỘ LỌC TỔNG HỢP (Loại đơn + Trạng thái + Tìm kiếm + Sắp xếp)
// =====================================
function filterByType(type) {
    currentTypeFilter = type;

    // Đổi màu Tab (Nút bấm)
    document.getElementById('btnTabAll').classList.remove('active');
    document.getElementById('btnTabThuong').classList.remove('active');
    document.getElementById('btnTabCustom').classList.remove('active');

    if (type === 'all') document.getElementById('btnTabAll').classList.add('active');
    if (type === 'standard') document.getElementById('btnTabThuong').classList.add('active');
    if (type === 'custom') document.getElementById('btnTabCustom').classList.add('active');

    executeCombinedFilter();
}

function filterByStatus() { executeCombinedFilter(); }
function sortOrders() { executeCombinedFilter(); }

function executeCombinedFilter() {
    const searchText = document.getElementById("searchOrderInput").value.toLowerCase().trim();
    const statusVal = document.getElementById("filterStatus").value;
    const sortVal = document.getElementById("sortOrder").value;

    filteredOrders = globalOrders.filter(o => {
        const id = (o.orderId || o.id || '').toString();
        const customerName = (o.customer && o.customer.customerName) ? o.customer.customerName : (o.customerName || `Khách #${o.customerId || ''}`);
        const status = o.status || o.orderStatus || 'Chờ xử lý';
        const isCustom = o.isCustom || (o.customBuildId != null); // Tùy DB của bạn thiết kế

        // 1. Lọc theo Tab (Thường / Custom)
        let matchType = true;
        if (currentTypeFilter === 'standard' && isCustom) matchType = false;
        if (currentTypeFilter === 'custom' && !isCustom) matchType = false;

        // 2. Lọc theo Trạng Thái
        const matchStatus = (statusVal === "All") || (status === statusVal);

        // 3. Lọc theo Tìm kiếm
        const matchSearch = id.includes(searchText) || customerName.toLowerCase().includes(searchText);

        return matchType && matchStatus && matchSearch;
    });

    // Reset lại trang 1 mỗi khi đổi bộ lọc hoặc gõ tìm kiếm
    currentPage = 1;

    // 4. Sắp xếp
    if (sortVal === "newest") {
        filteredOrders.sort((a, b) => new Date(b.orderDate || b.createdDate || Date.now()) - new Date(a.orderDate || a.createdDate || Date.now()));
    } else {
        filteredOrders.sort((a, b) => new Date(a.orderDate || a.createdDate || Date.now()) - new Date(b.orderDate || b.createdDate || Date.now()));
    }

    renderOrderGrid();
}

// =====================================
// 3. VẼ DANH SÁCH THẺ (CARDS)
// =====================================
// Thêm cấu hình Phân trang
let currentPage = 1;
const itemsPerPage = 12; // Hiện 12 đơn mỗi trang

function renderOrderGrid() {
    const grid = document.getElementById('gridAllOrders');
    grid.innerHTML = '';

    if (filteredOrders.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="bx bx-box fs-1 mb-2"></i><br>Không có đơn hàng nào.</div>';
        return;
    }

    let html = '';
    
    // Tính toán phân trang
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredOrders.length);

    for (let i = startIndex; i < endIndex; i++) {
        const o = filteredOrders[i];
        const id = o.orderId || o.id;
        const customerName = (o.customer && o.customer.customerName) ? o.customer.customerName : (o.customerName || `Khách #${o.customerId || ''}`);
        const dateObj = new Date(o.orderDate || o.createdDate || Date.now());
        const dateStr = dateObj.toLocaleDateString('vi-VN') + ' ' + dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const total = o.totalAmount || o.totalPrice || o.total || 0;
        const status = o.status || o.orderStatus || 'Chờ xử lý';
        const isCustom = o.isCustom || (o.customBuildId != null);

        // 1. Phân loại Đơn
        const typeBadge = isCustom
            ? `<span class="badge bg-label-warning shadow-sm"><i class="bx bx-chip me-1"></i> Custom Build</span>`
            : `<span class="badge bg-label-primary shadow-sm"><i class="bx bx-box me-1"></i> Đơn Tiêu Chuẩn</span>`;

        // 2. TẠO NÚT DROPDOWN TRẠNG THÁI & RÀNG BUỘC
        let btnClass = 'btn-primary';
        const s = (status || '').toLowerCase();
        
        // Xác định Cấp độ Trạng thái hiện tại (Để chống đi ngược)
        let currentLevel = 0;
        if (s.includes('chờ')) currentLevel = 1;
        else if (s.includes('duyệt')) currentLevel = 2;
        else if (s.includes('chuẩn bị') || s.includes('ráp') || s.includes('làm')) currentLevel = 3;
        else if (s.includes('hoàn thành')) currentLevel = 4;
        else if (s.includes('giao') || s.includes('thanh toán')) currentLevel = 5;
        else if (s.includes('hủy')) currentLevel = 99;

        const isPending = currentLevel === 1;

        // Đổi màu nút dựa trên trạng thái
        if (currentLevel === 1) btnClass = 'btn-warning';
        else if (currentLevel === 2) btnClass = 'btn-info';
        else if (currentLevel === 3) btnClass = 'btn-primary';
        else if (currentLevel === 4) btnClass = 'btn-success';
        else if (currentLevel === 5) btnClass = 'btn-success';
        else if (currentLevel === 99) btnClass = 'btn-danger';

        // Khóa không cho bấm Dropdown nữa nếu đơn Đã đóng (Giao xong hoặc Bị Hủy)
        const isDisable = (currentLevel >= 5) ? 'disabled' : '';

        // Tự động Khóa (Xám đi) các trạng thái cũ đã đi qua
        const opt1 = currentLevel >= 1 
            ? `<li><a class="dropdown-item text-muted" href="javascript:void(0);" style="cursor:not-allowed;"><i class="bx bx-time-five me-2"></i> Chờ xử lý</a></li>` 
            : `<li><a class="dropdown-item" href="javascript:void(0);" onclick="changeOrderStatus(${id}, 'Chờ xử lý')"><i class="bx bx-time-five me-2 text-warning"></i> Chờ xử lý</a></li>`;
            
        const opt2 = currentLevel >= 2 
            ? `<li><a class="dropdown-item text-muted" href="javascript:void(0);" style="cursor:not-allowed;"><i class="bx bx-check-circle me-2"></i> Đã duyệt</a></li>` 
            : `<li><a class="dropdown-item" href="javascript:void(0);" onclick="changeOrderStatus(${id}, 'Đã duyệt')"><i class="bx bx-check-circle me-2 text-info"></i> Đã duyệt</a></li>`;
            
        const opt3 = currentLevel >= 3 
            ? `<li><a class="dropdown-item text-muted" href="javascript:void(0);" style="cursor:not-allowed;"><i class="bx bx-wrench me-2"></i> Đang chuẩn bị</a></li>` 
            : `<li><a class="dropdown-item" href="javascript:void(0);" onclick="changeOrderStatus(${id}, 'Đang chuẩn bị')"><i class="bx bx-wrench me-2 text-primary"></i> Đang chuẩn bị</a></li>`;
            
        const opt4 = currentLevel >= 4 
            ? `<li><a class="dropdown-item text-muted" href="javascript:void(0);" style="cursor:not-allowed;"><i class="bx bx-check-double me-2"></i> Hoàn thành</a></li>` 
            : `<li><a class="dropdown-item" href="javascript:void(0);" onclick="changeOrderStatus(${id}, 'Hoàn thành')"><i class="bx bx-check-double me-2 text-success"></i> Hoàn thành</a></li>`;
            
        const opt5 = currentLevel >= 5 
            ? `<li><a class="dropdown-item text-muted fw-bold" href="javascript:void(0);" style="cursor:not-allowed;"><i class="bx bx-package me-2"></i> Đã giao & Thu tiền</a></li>` 
            : `<li><a class="dropdown-item fw-bold text-success" href="javascript:void(0);" onclick="changeOrderStatus(${id}, 'Đã giao')"><i class="bx bx-package me-2"></i> Đã giao & Thu tiền</a></li>`;

        // RÀNG BUỘC: Chỉ Chờ Xử Lý mới được Hủy Đơn
        const cancelDropdownHtml = isPending
            ? `<li><a class="dropdown-item fw-bold text-danger" href="javascript:void(0);" onclick="changeOrderStatus(${id}, 'Đã hủy')"><i class="bx bx-x-circle me-2"></i> Hủy đơn</a></li>`
            : `<li><a class="dropdown-item fw-bold text-muted" href="javascript:void(0);" style="cursor: not-allowed;" title="Chỉ được hủy khi đơn ở trạng thái Chờ xử lý"><i class="bx bx-x-circle me-2"></i> Hủy đơn (Bị Khóa)</a></li>`;

        // Tạo cấu trúc Dropdown (Xổ xuống)
        const statusDropdownHtml = `
        <div class="dropdown mt-auto mb-3 text-center">
            <button class="btn ${btnClass} dropdown-toggle w-100 shadow-sm fw-bold text-uppercase" type="button" data-bs-toggle="dropdown" ${isDisable}>
                ${status}
            </button>
            <ul class="dropdown-menu w-100 shadow">
                ${opt1}
                ${opt2}
                ${opt3}
                ${opt4}
                <li><hr class="dropdown-divider"></li>
                ${opt5}
                ${cancelDropdownHtml}
            </ul>
        </div>`;

        // RÀNG BUỘC: Chỉ Chờ Xử Lý mới được Chỉnh Sửa
        const editButtonHtml = isPending
            ? `<button class="btn btn-outline-secondary px-2" onclick="editOrder(${id})" title="Chỉnh sửa đơn"><i class="bx bx-edit-alt"></i></button>`
            : `<button class="btn btn-outline-secondary px-2 disabled" title="Chỉ được sửa khi Chờ xử lý" style="cursor: not-allowed;"><i class="bx bx-edit-alt"></i></button>`;

        // 3. Gắn giao diện Card
        html += `
        <div class="col-sm-6 col-md-4 col-xl-3 mb-4">
            <div class="bakery-card shadow-sm border border-1 border-light h-100 d-flex flex-column p-3 rounded" style="overflow: visible !important;">
                <div class="text-start mb-2">${typeBadge}</div>
                <h5 class="fw-bold text-primary mt-2 mb-1">Mã đơn: #${id}</h5>
                <small class="text-muted mb-3"><i class="bx bx-time-five"></i> ${dateStr}</small>
                
                <!-- Hiển thị cục Dropdown Chọn Trạng Thái ở đây -->
                ${statusDropdownHtml}
                
                <hr class="my-2">
                <div class="text-start mb-3">
                    <div class="text-truncate mb-1"><strong>Khách:</strong> ${customerName}</div>
                    <div class="text-danger fw-bold fs-6"><strong>Tổng:</strong> ${total.toLocaleString('vi-VN')} đ</div>
                </div>
                
                <div class="d-flex gap-2 mt-auto">
                    <button class="btn btn-outline-primary flex-grow-1 fw-bold px-2" onclick="openDetailModal(${id})">Chi Tiết</button>
                    ${editButtonHtml}
                    <button class="btn btn-outline-danger px-2" onclick="deleteOrder(${id})" title="Xóa đơn"><i class="bx bx-trash"></i></button>
                </div>
            </div>
        </div>`;
    }

    // Vẽ thanh Phân Trang ở dưới cùng
    if (totalPages > 1) {
        // Đổi từ pagination-sm sang pagination-lg để nút to và dễ bấm hơn
        let pageControls = `<div class="col-12 mt-5 d-flex justify-content-center"><nav><ul class="pagination pagination-lg shadow-sm">`;
        
        // Nút Prev
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        pageControls += `<li class="page-item ${prevDisabled}"><a class="page-link fw-bold" href="javascript:void(0);" onclick="changePage(${currentPage - 1})">Trước</a></li>`;
        
        // Các nút số
        for (let p = 1; p <= totalPages; p++) {
            // Hiển thị khoảng 10 trang xung quanh trang hiện hành (trừ hao trang đầu/cuối)
            if (p === 1 || p === totalPages || (p >= currentPage - 4 && p <= currentPage + 5)) {
                const active = p === currentPage ? 'active' : '';
                pageControls += `<li class="page-item ${active}"><a class="page-link fw-bold" href="javascript:void(0);" onclick="changePage(${p})">${p}</a></li>`;
            } else if (p === currentPage - 5 || p === currentPage + 6) {
                pageControls += `<li class="page-item disabled"><a class="page-link text-muted border-0" href="javascript:void(0);">...</a></li>`;
            }
        }

        // Nút Next
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        pageControls += `<li class="page-item ${nextDisabled}"><a class="page-link fw-bold" href="javascript:void(0);" onclick="changePage(${currentPage + 1})">Sau</a></li>`;
        
        pageControls += `</ul></nav></div>`;
        html += pageControls;
    }

    grid.innerHTML = html;
}

// Hàm đổi trang
function changePage(page) {
    currentPage = page;
    renderOrderGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =====================================
// 4. CHUYỂN TRẠNG THÁI TỪ DROPDOWN
// =====================================
async function changeOrderStatus(id, newStatus) {
    // Hỏi xác nhận trước khi đổi
    if (!confirm(`Bạn có chắc chắn đổi trạng thái đơn #${id} thành: [ ${newStatus.toUpperCase()} ]?`)) {
        return;
    }

    const order = globalOrders.find(o => (o.orderId || o.id) === id);
    if (!order) return;

    // Cập nhật vào thuộc tính của Object (Dùng status hoặc orderStatus tùy tên cột DB của bạn)
    if (order.hasOwnProperty('status')) order.status = newStatus;
    else if (order.hasOwnProperty('orderStatus')) order.orderStatus = newStatus;

    try {
        const res = await fetch(`${ORDER_API}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });

        if (res.ok) {
            loadOrders(); // Cập nhật thành công -> Load lại dữ liệu lưới
        } else {
            alert("Cập nhật thất bại (Lỗi cấu hình C# API)!");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối máy chủ khi chuyển trạng thái.");
    }
}

// =====================================
// 5. HIỂN THỊ MODAL CHI TIẾT ĐƠN HÀNG
// =====================================
async function openDetailModal(id) {
    try {
        const response = await fetch(`${ORDER_API}/${id}`);
        if (!response.ok) throw new Error("Khong the tai don hang");
        const order = await response.json();

        // Điền thông tin cơ bản
        document.getElementById('modalOrderTitle').innerText = `Chi Tiết Đơn Hàng #${id}`;
        document.getElementById('modalTenNguoiNhan').value = order.shippingName || order.customerName || 'Chưa cập nhật';
        document.getElementById('modalSdtNguoiNhan').value = order.shippingPhone || order.phone || 'Chưa cập nhật';
        document.getElementById('modalDiaChiGiao').value = order.shippingAddress || 'Chưa cập nhật';

        const dateObj = new Date(order.orderDate || Date.now());
        document.getElementById('modalNgayDat').value = dateObj.toLocaleDateString('vi-VN') + ' ' + dateObj.toLocaleTimeString('vi-VN');

        const total = order.totalAmount || 0;
        document.getElementById('modalTongTien').value = total.toLocaleString('vi-VN') + ' đ';

        // Vẽ danh sách Món ăn (Từ OrderDetails của DB)
        const tbody = document.getElementById('modalProductsTableBody');
        tbody.innerHTML = '';
        if (order.orderDetails && order.orderDetails.length > 0) {
            order.orderDetails.forEach(detail => {
                const prodName = detail.productName || `Sản phẩm #${detail.productId}`;
                const qty = detail.quantity || 1;
                const price = (detail.unitPrice || 0).toLocaleString('vi-VN') + ' đ';
                const img = detail.image || 'assets/img/elements/1.jpg';

                tbody.innerHTML += `
                    <tr>
                        <td><img src="${img}" width="40" height="40" style="object-fit:cover; border-radius:4px;"></td>
                        <td class="text-wrap" style="max-width: 150px;">${prodName}</td>
                        <td class="text-center fw-bold">${qty}</td>
                        <td>${price}</td>
                    </tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Không có dữ liệu chi tiết</td></tr>';
        }

        // Xử lý ẩn hiện Khu vực Custom Cake
        const isCustom = order.isCustom || (order.customBuildId != null);
        const customSection = document.getElementById('modalCustomSection');
        if (isCustom) {
            customSection.style.display = 'block';
            document.getElementById('modalLoaiYeuCau').value = order.customType || 'Yêu cầu đặc biệt';
        } else {
            customSection.style.display = 'none';
        }

        // Gọi Bootstrap hiển thị Modal lên màn hình
        const myModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        myModal.show();
    } catch(err) {
        console.error(err);
        alert("Lỗi tải chi tiết đơn hàng!");
    }
}
// =====================================
// 6. XÓA ĐƠN HÀNG
// =====================================
async function deleteOrder(id) {
    if (confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng #${id} không? Hành động này không thể hoàn tác!`)) {
        try {
            const res = await fetch(`${ORDER_API}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Đã xóa đơn hàng thành công!");
                loadOrders(); // Tải lại danh sách
            } else {
                alert("Xóa thất bại! Có thể do lỗi Ràng buộc dữ liệu (Khóa ngoại) trong CSDL.");
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi kết nối khi xóa!");
        }
    }
}

// =====================================
// 7. CHUYỂN HƯỚNG SANG TRANG SỬA ĐƠN HÀNG
// =====================================
function editOrder(id) {
    // Chuyển sang trang form thêm/sửa, truyền ID lên thanh URL
    window.location.href = `add-order.html?id=${id}`;
}