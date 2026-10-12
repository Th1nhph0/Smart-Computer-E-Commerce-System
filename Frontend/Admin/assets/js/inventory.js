const PRODUCT_API = `${API_URL}/api/Products`;

let globalInventory = [];
let filteredInventory = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;
let selectedProductFullData = null; // Biến giữ toàn bộ data sản phẩm để update không bị mất field

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('inventoryTableBody')) {
        loadInventoryData();
    }

    const searchInput = document.getElementById('searchInventoryInput');
    if (searchInput) searchInput.addEventListener('input', applyInventoryFilters);

    // Bắt sự kiện khi gõ số lượng hoặc đổi Radio Button để preview tồn kho
    document.querySelectorAll('input[name="invAction"]').forEach(radio => radio.addEventListener('change', updatePreview));
    const qtyInput = document.getElementById('invQuantityInput');
    if (qtyInput) qtyInput.addEventListener('input', updatePreview);

    // Bắt sự kiện gạt công tắc trạng thái
    const statusSwitch = document.getElementById('invStatusSwitch');
    if (statusSwitch) {
        statusSwitch.addEventListener('change', function () {
            const lbl = document.getElementById('invStatusLabel');
            lbl.innerText = this.checked ? "Đang kinh doanh" : "Ngừng kinh doanh";
            lbl.className = this.checked ? "form-check-label fw-bold text-success" : "form-check-label fw-bold text-danger";
        });
    }

    // Bắt sự kiện nút Lưu
    const btnSave = document.getElementById('btnSaveInventory');
    if (btnSave) btnSave.addEventListener('click', saveInventoryChanges);
});

async function loadInventoryData() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">⏳ Đang tải dữ liệu tồn kho...</td></tr>';
    try {
        const response = await fetch(PRODUCT_API);
        if (!response.ok) throw new Error("Lỗi kết nối API");
        let data = await response.json();
        globalInventory = data.$values || data;
        applyInventoryFilters();
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">❌ Lỗi kết nối Server!</td></tr>';
    }
}

function applyInventoryFilters() {
    const searchInput = document.getElementById('searchInventoryInput');
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';

    filteredInventory = globalInventory.filter(p => {
        const name = (p.productName || p.ProductName || '').toLowerCase();
        const sku = (p.sku || p.SKU || '').toLowerCase();
        return name.includes(searchText) || sku.includes(searchText);
    });

    currentPage = 1;
    renderInventoryTable();
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (filteredInventory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Không tìm thấy sản phẩm nào!</td></tr>';
        renderInventoryPagination(0);
        return;
    }

    const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);
    const itemsToDisplay = filteredInventory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    let html = '';
    itemsToDisplay.forEach(p => {
        const id = p.productId || p.ProductId;
        const name = p.productName || p.ProductName || 'Đang cập nhật';
        const sku = p.sku || p.SKU || p.Sku || p.SKUCode || 'Chưa có mã';
        const price = (p.price || p.Price || 0).toLocaleString('vi-VN');
        const stock = p.currentStock !== undefined ? p.currentStock : (p.CurrentStock || 0);

        // Đọc Status từ Database
        const isActive = p.status !== undefined ? p.status : (p.Status !== undefined ? p.Status : true);

        // Hiển thị badge tồn kho
        let stockBadge = `<span class="badge bg-label-success fw-bold">${stock} cái</span>`;
        if (stock === 0) stockBadge = `<span class="badge bg-label-danger fw-bold">Hết hàng</span>`;
        else if (stock < 5) stockBadge = `<span class="badge bg-label-warning fw-bold">Sắp hết (${stock})</span>`;

        // Hiển thị badge kinh doanh
        let statusBadge = isActive
            ? `<span class="badge bg-label-primary">Đang kinh doanh</span>`
            : `<span class="badge bg-label-secondary">Ngừng kinh doanh</span>`;

        html += `
            <tr>
                <td><span class="fw-semibold text-secondary">${sku}</span></td>
                <td><strong class="text-dark">${name}</strong></td>
                <td><span class="text-success fw-semibold">${price} đ</span></td>
                <td>${stockBadge}</td>
                <td>${statusBadge}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary" onclick="openInventoryModal(${id})" title="Nhập/Xuất Kho">
                        <i class="bx bx-edit-alt me-1"></i> Quản lý
                    </button>
                </td>
            </tr>`;
    });

    tbody.innerHTML = html;
    renderInventoryPagination(totalPages);
}

// Logic Mở Modal
window.openInventoryModal = function (productId) {
    selectedProductFullData = globalInventory.find(x => (x.productId || x.ProductId) == productId);
    if (!selectedProductFullData) return;

    const name = selectedProductFullData.productName || selectedProductFullData.ProductName;
    const currentStock = selectedProductFullData.currentStock !== undefined ? selectedProductFullData.currentStock : (selectedProductFullData.CurrentStock || 0);
    const isActive = selectedProductFullData.status !== undefined ? selectedProductFullData.status : (selectedProductFullData.Status !== undefined ? selectedProductFullData.Status : true);

    document.getElementById('invProductId').value = productId;
    document.getElementById('invProductName').innerText = name;
    document.getElementById('invCurrentStockDisplay').innerText = currentStock;
    document.getElementById('invBaseStock').value = currentStock;

    // Set Status
    const statusSwitch = document.getElementById('invStatusSwitch');
    const lbl = document.getElementById('invStatusLabel');
    statusSwitch.checked = isActive;
    lbl.innerText = isActive ? "Đang kinh doanh" : "Ngừng kinh doanh";
    lbl.className = isActive ? "form-check-label fw-bold text-success" : "form-check-label fw-bold text-danger";

    // Reset Form Input
    document.getElementById('actAdd').checked = true;
    document.getElementById('invQuantityInput').value = 0;
    updatePreview();

    const modal = new bootstrap.Modal(document.getElementById('inventoryModal'));
    modal.show();
};

// Hàm Preview tính toán tồn kho tự động
function updatePreview() {
    const baseStock = parseInt(document.getElementById('invBaseStock').value) || 0;
    const inputVal = parseInt(document.getElementById('invQuantityInput').value) || 0;
    const action = document.querySelector('input[name="invAction"]:checked').value;
    const label = document.getElementById('invQuantityLabel');
    const previewNum = document.getElementById('invPreviewNumber');

    let finalStock = baseStock;

    if (action === 'add') {
        label.innerText = "Số lượng nhập thêm vào kho:";
        finalStock = baseStock + inputVal;
    } else if (action === 'sub') {
        label.innerText = "Số lượng xuất bớt khỏi kho:";
        finalStock = baseStock - inputVal;
        if (finalStock < 0) finalStock = 0;
    } else {
        label.innerText = "Cập nhật tồn kho thành số chính xác:";
        finalStock = inputVal;
    }

    previewNum.innerText = finalStock;
    previewNum.className = finalStock === 0 ? "text-danger fs-5 fw-bold" : "text-success fs-5 fw-bold";
}

// Logic Gửi Lệnh Save
async function saveInventoryChanges() {
    if (!selectedProductFullData) return;

    const newStock = parseInt(document.getElementById('invPreviewNumber').innerText);
    const newStatus = document.getElementById('invStatusSwitch').checked;
    const productId = selectedProductFullData.productId || selectedProductFullData.ProductId;

    // CHỈ GỬI ĐÚNG 2 TRƯỜNG CẦN THIẾT
    const payload = {
        currentStock: newStock,
        status: newStatus
    };

    try {
        // GỌI ĐẾN API MỚI DÀNH RIÊNG CHO KHO: /Inventory
        const res = await fetch(`${PRODUCT_API}/${productId}/Inventory`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok || res.status === 204) {
            alert('Cập nhật Kho & Trạng thái thành công!');
            location.reload();
        } else {
            alert('Cập nhật thất bại. Vui lòng thử lại!');
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi kết nối máy chủ!');
    }
}

// (GIỮ NGUYÊN PHẦN RENDER PAGINATION Ở CUỐI FILE CỦA BẠN NHƯ CŨ...)
function renderInventoryPagination(totalPages) {
    const paginationContainer = document.getElementById('inventoryPaginationContainer');
    if (!paginationContainer) return;
    if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }
    let html = `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="javascript:void(0);" onclick="changeInventoryPage(${currentPage - 1})"><i class="tf-icon bx bx-chevron-left"></i></a></li>`;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    if (currentPage <= 2) endPage = Math.min(5, totalPages);
    if (currentPage >= totalPages - 1) startPage = Math.max(1, totalPages - 4);
    if (startPage > 1) html += `<li class="page-item disabled"><a class="page-link" href="javascript:void(0);">...</a></li>`;
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="javascript:void(0);" onclick="changeInventoryPage(${i})">${i}</a></li>`;
    }
    if (endPage < totalPages) html += `<li class="page-item disabled"><a class="page-link" href="javascript:void(0);">...</a></li>`;
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="javascript:void(0);" onclick="changeInventoryPage(${currentPage + 1})"><i class="tf-icon bx bx-chevron-right"></i></a></li>`;
    paginationContainer.innerHTML = html;
}
function changeInventoryPage(page) {
    const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);
    if (page >= 1 && page <= totalPages) { currentPage = page; renderInventoryTable(); }
}