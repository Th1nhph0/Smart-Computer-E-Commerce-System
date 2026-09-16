const PRODUCT_API = `${API_URL}/api/Products`;

// --- BIẾN TOÀN CỤC ---
let globalProducts = [];
let filteredProducts = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;
let globalCategories = []; // Dành cho trang Thêm mới

// ==========================================
// BỘ ĐIỀU HƯỚNG: KIỂM TRA ĐANG Ở TRANG NÀO
// ==========================================
document.addEventListener("DOMContentLoaded", () => {

    // 1. NẾU ĐANG Ở TRANG DANH SÁCH (Kiểm tra xem có cái bảng không)
    if (document.getElementById('productTableBody')) {
        loadProducts();
    }

    // 2. NẾU ĐANG Ở TRANG THÊM/SỬA SẢN PHẨM (Kiểm tra xem có cái form không)
    if (document.getElementById('formAddProduct')) {
        // Bắt sự kiện Lưu
        document.getElementById('formAddProduct').addEventListener('submit', handleSaveProduct);

        // Chế độ sửa: Nếu trên link có ?id=... thì nạp dữ liệu cũ
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        // Cần await load dropdown trước khi fill dữ liệu
        loadSelectOptions().then(() => {
            if (productId) {
                loadOldProductData(productId);
            }
        });
    }
});


// ==========================================
// KHU VỰC 1: CODE CHO TRANG DANH SÁCH SẢN PHẨM
// ==========================================

async function loadProducts() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Đang tải dữ liệu...</td></tr>';
    try {
        const response = await fetch(PRODUCT_API);
        if (!response.ok) throw new Error("Lỗi mạng");

        globalProducts = await response.json();
        populateCategoryDropdown();
        applyFilters();
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Lỗi kết nối Server</td></tr>';
    }
}

function populateCategoryDropdown() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    const categories = [...new Set(globalProducts.map(p => (p.category && p.category.categoryName) ? p.category.categoryName : `Danh mục #${p.categoryId}`))];
    let html = `<option value="All">-- Tất cả danh mục --</option>`;
    categories.forEach(c => { html += `<option value="${c}">${c}</option>`; });
    select.innerHTML = html;
}

function applyFilters() {
    const searchText = document.getElementById("searchInput").value.toLowerCase().trim();
    const categoryVal = document.getElementById("categoryFilter").value;

    filteredProducts = globalProducts.filter(p => {
        const name = (p.productName || '').toLowerCase();
        const category = (p.category && p.category.categoryName) ? p.category.categoryName : `Danh mục #${p.categoryId}`;
        return name.includes(searchText) && (categoryVal === "All" || category === categoryVal);
    });

    currentPage = 1;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('productTableBody');
    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Không tìm thấy sản phẩm nào!</td></tr>';
        renderPagination(0); return;
    }

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const productsToDisplay = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    let html = '';
    productsToDisplay.forEach(product => {
        const id = product.productId || '';
        const name = product.productName || 'Đang cập nhật';
        const price = product.price ? product.price.toLocaleString('vi-VN') : '0';
        const stock = product.currentStock || 0;
        const category = (product.category && product.category.categoryName) ? product.category.categoryName : `Danh mục #${product.categoryId}`;
        const img = (product.productImages && product.productImages.length > 0) ? product.productImages[0].imageUrl : 'assets/img/elements/1.jpg';

        html += `
            <tr>
                <td><strong>#${id}</strong></td>
                <td><img src="${img}" class="rounded" width="50" height="50" style="object-fit: cover;"></td>
                <td style="white-space: normal; min-width: 200px;"><strong>${name}</strong></td>
                <td><span class="badge bg-label-primary">${category}</span></td>
                <td>${price} đ</td>
                <td>${stock}</td>
                <td>
                    <button class="btn btn-sm btn-icon btn-outline-warning" onclick="editProduct(${id})"><i class="bx bx-edit"></i></button>
                    <button class="btn btn-sm btn-icon btn-outline-danger ms-1" onclick="deleteProduct(${id})"><i class="bx bx-trash"></i></button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }

    let html = `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="javascript:void(0);" onclick="changePage(${currentPage - 1})"><i class="tf-icon bx bx-chevron-left"></i></a></li>`;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 2) endPage = Math.min(5, totalPages);
    if (currentPage >= totalPages - 1) startPage = Math.max(1, totalPages - 4);
    if (startPage > 1) html += `<li class="page-item disabled"><a class="page-link" href="javascript:void(0);">...</a></li>`;

    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="javascript:void(0);" onclick="changePage(${i})">${i}</a></li>`;
    }

    if (endPage < totalPages) html += `<li class="page-item disabled"><a class="page-link" href="javascript:void(0);">...</a></li>`;
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="javascript:void(0);" onclick="changePage(${currentPage + 1})"><i class="tf-icon bx bx-chevron-right"></i></a></li>`;

    paginationContainer.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    if (page >= 1 && page <= totalPages) { currentPage = page; renderTable(); }
}

async function deleteProduct(id) {
    if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm #${id}?`)) {
        const response = await fetch(`${PRODUCT_API}/${id}`, { method: 'DELETE' });
        if (response.ok) { alert("Xóa thành công!"); loadProducts(); } else { alert("Lỗi khi xóa!"); }
    }
}
function editProduct(id) { window.location.href = `add-product.html?id=${id}`; }


// ==========================================
// KHU VỰC 2: CODE CHO TRANG THÊM/SỬA SẢN PHẨM
// ==========================================

async function loadSelectOptions() {
    try {
        // Load Danh mục
        const resCat = await fetch(`${API_URL}/api/Categories`);
        if (resCat.ok) {
            const cats = await resCat.json();
            let html = '<option value="">-- Chọn danh mục --</option>';
            cats.forEach(c => html += `<option value="${c.categoryId || c.id}">${c.categoryName || c.name}</option>`);
            document.getElementById('phanLoai').innerHTML = html;
        }
        
        // Load Thương hiệu
        const resBrand = await fetch(`${API_URL}/api/Brands`);
        if (resBrand.ok) {
            const brands = await resBrand.json();
            let html = '<option value="">-- Chọn thương hiệu --</option>';
            brands.forEach(b => html += `<option value="${b.brandId || b.id}">${b.brandName || b.name}</option>`);
            document.getElementById('thuongHieu').innerHTML = html;
        }
    } catch(e) { console.error("Lỗi nạp options", e); }
}

async function loadOldProductData(id) {
    try {
        const res = await fetch(`${API_URL}/api/Products/${id}`);
        if (res.ok) {
            const p = await res.json();
            document.getElementById('tenSanPham').value = p.productName || '';
            document.getElementById('sku').value = p.sku || '';
            document.getElementById('giaBan').value = p.price || 0;
            document.getElementById('soLuong').value = p.currentStock || 0;
            
            document.getElementById('phanLoai').value = p.categoryId || '';
            document.getElementById('thuongHieu').value = p.brandId || '';
            
            document.getElementById('thoiGianBaoHanh').value = p.warrantyMonths || 0;
            if (p.status !== undefined && p.status !== null) {
                document.getElementById('trangThai').value = p.status.toString();
            }
            
            document.getElementById('thongSoKyThuat').value = p.specifications || '';
            document.getElementById('moTa').value = p.description || '';
        }
    } catch(e) { console.error("Lỗi lấy dữ liệu cũ", e); }
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const btnSubmit = document.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerText = "Đang xử lý...";

    try {
        const productData = {
            ProductName: document.getElementById('tenSanPham').value,
            Sku: document.getElementById('sku').value,
            Price: parseFloat(document.getElementById('giaBan').value) || 0,
            CategoryId: parseInt(document.getElementById('phanLoai').value) || 0,
            BrandId: parseInt(document.getElementById('thuongHieu').value) || 0,
            WarrantyMonths: parseInt(document.getElementById('thoiGianBaoHanh').value) || 0,
            Status: document.getElementById('trangThai').value === 'true',
            Specifications: document.getElementById('thongSoKyThuat').value,
            Description: document.getElementById('moTa').value
        };

        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        const method = productId ? 'PUT' : 'POST';
        const endpoint = productId ? `${API_URL}/api/Products/${productId}` : `${API_URL}/api/Products`;

        if (productId) {
            productData.ProductId = parseInt(productId);
            // Khi PUT (Cập nhật), ta nên giữ nguyên CurrentStock hiện tại để tránh đè dữ liệu kho
            productData.CurrentStock = parseInt(document.getElementById('soLuong').value) || 0;
        } else {
            // Khi POST (Thêm mới), có thể để stock mặc định = 0 vì sẽ xử lý nhập kho sau
            productData.CurrentStock = 0;
        }

        const resSave = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (resSave.ok) {
            alert(productId ? "Cập nhật thành công!" : "Đã thêm Sản phẩm thành công!");
            window.location.href = 'list-product.html';
        } else {
            alert("Lưu sản phẩm thất bại! Vui lòng kiểm tra lại thông tin.");
        }
    } catch (e) {
        console.error(e);
        alert("Có lỗi xảy ra: " + e.message);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Lưu Sản Phẩm";
    }
}