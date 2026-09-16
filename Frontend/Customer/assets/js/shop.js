const SHOP_API_URL = 'http://localhost:5076/api/Products'; // NHỚ SỬA ĐÚNG CỔNG
let allShopProducts = [];
let currentFilteredList = [];

// Cấu hình Phân trang
let currentPage = 1;
const itemsPerPage = 12; // Số sản phẩm trên 1 trang (12 cái là đẹp nhất)

document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById('shop-grid')) {
        await loadShopData();
    }
});

async function loadShopData() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '<p style="text-align:center; width:100%; grid-column: 1 / -1;">Đang tải dữ liệu...</p>';

    try {
        // --- BẮT ĐẦU ĐOẠN CODE CẦN THAY ---
        let cached = sessionStorage.getItem('shopDataCache');
        if (cached) {
            allShopProducts = JSON.parse(cached); // Có sẵn trong RAM thì lấy ra dùng luôn
        } else {
            const res = await fetch(SHOP_API_URL);
            if (!res.ok) throw new Error("API Error");
            allShopProducts = await res.json();
            sessionStorage.setItem('shopDataCache', JSON.stringify(allShopProducts)); // Gọi xong thì lưu vào RAM
        }

        buildCategoryFilters();

        const urlParams = new URLSearchParams(window.location.search);
        const searchKeyword = urlParams.get('search');
        const categoryId = urlParams.get('category');

        if (categoryId) {
            const cb = document.getElementById('cat_' + categoryId);
            if (cb) cb.checked = true;
        }
        if (searchKeyword) {
            document.querySelector('.page-head h1').textContent = `Kết quả cho: "${searchKeyword}"`;
            window.currentSearch = searchKeyword.toLowerCase();
        }

        applyFilters(); // Gọi bộ lọc lần đầu
    } catch (e) {
        grid.innerHTML = '<p style="text-align:center; color:red; grid-column: 1 / -1;">Lỗi kết nối Backend!</p>';
    }
}

function buildCategoryFilters() {
    const catMap = new Map();
    allShopProducts.forEach(p => {
        if (p.category && p.category.categoryId) {
            if (!catMap.has(p.category.categoryId)) {
                catMap.set(p.category.categoryId, { id: p.category.categoryId, name: p.category.categoryName, count: 0 });
            }
            catMap.get(p.category.categoryId).count++;
        }
    });

    const filterContainer = document.getElementById('category-filters');
    let html = '';
    catMap.forEach(cat => {
        html += `
        <label style="cursor:pointer; display:flex; justify-content:space-between; margin-bottom:8px;">
            <span><input type="checkbox" class="cat-checkbox" value="${cat.id}" id="cat_${cat.id}" onchange="applyFilters()"> ${cat.name}</span>
            <span class="ct" style="color:gray; font-size:12px;">${cat.count}</span>
        </label>`;
    });
    filterContainer.innerHTML = html;
}

// BỘ LỌC VÀ SẮP XẾP
window.applyFilters = function () {
    const checkboxes = document.querySelectorAll('.cat-checkbox:checked');
    const checkedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    let filtered = allShopProducts;

    if (checkedIds.length > 0) {
        filtered = filtered.filter(p => p.category && checkedIds.includes(p.category.categoryId));
    }
    if (window.currentSearch) {
        filtered = filtered.filter(p => (p.productName || p.name || "").toLowerCase().includes(window.currentSearch));
    }

    const sortVal = document.getElementById('sort-select').value;
    if (sortVal === 'price_asc') {
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortVal === 'price_desc') {
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
        filtered.sort((a, b) => (b.productId || b.id || 0) - (a.productId || a.id || 0));
    }

    // Cập nhật danh sách cuối cùng và Reset về trang 1
    currentFilteredList = filtered;
    currentPage = 1;
    renderPage();
}

// VẼ GIAO DIỆN THEO TRANG
function renderPage() {
    const grid = document.getElementById('shop-grid');
    document.getElementById('product-count').textContent = `Tìm thấy ${currentFilteredList.length} sản phẩm`;

    // Cắt mảng lấy đúng 12 sản phẩm cho trang hiện tại
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = currentFilteredList.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
        grid.innerHTML = '<p style="text-align:center; padding: 40px; grid-column: 1 / -1;">Không tìm thấy sản phẩm nào.</p>';
        renderPagination(); // Gọi để xóa thanh phân trang
        return;
    }

    let html = '';
    pageItems.forEach(p => {
        const id = p.productId || p.id;
        const name = p.productName || p.name;
        const priceValue = p.price || 0;

        let imgUrl = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80';
        if (p.productImages && p.productImages.length > 0) {
            imgUrl = p.productImages[0].imageUrl || p.productImages[0].url || p.productImages[0].imagePath || imgUrl;
        }
        const priceFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(priceValue);

        // Thêm loading="lazy" để tăng tốc độ nạp ảnh cực độ
                let r = Math.round(p.averageRating || 0);
        let starsHtml = '';
        for(let i=1; i<=5; i++) { starsHtml += (i<=r) ? '★' : '☆'; }
        const revCount = p.reviewCount || 0;
        const sales = p.totalSales || 0;
        
        html += `
        <article class="product-card">
          <div class="img-wrap">
            <button class="wishlist" aria-label="Wishlist">♡</button>
            <img src="${imgUrl}" alt="${name}" loading="lazy" style="height: 220px; object-fit: contain; width: 100%; padding: 10px; background: white;" />
          </div>
          <div class="stock"><span class="dot"></span>Còn hàng</div>
          <a href="product.html?id=${id}" class="name" style="font-size: 14px; font-weight:600; min-height: 40px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${name}</a>
          <div class="price"><span class="now text-primary" style="font-weight:bold">${priceFormatted}</span></div>
          <div class="stars" style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:10px; align-items:center;">
              <span><span style="color:#FACC15; font-size:14px;">${starsHtml}</span> <span class="count">(${revCount})</span></span>
              <span style="color:gray;">Đã bán ${sales}</span>
          </div>
          <button onclick="addToCart(${id}, '${name.replace(/'/g, ` `)}', ${priceValue}, '${imgUrl}', ${priceValue}, '')" class="btn btn--indigo" style="width: 100%; cursor: pointer;">
              Thêm vào giỏ 🛒
          </button>
        </article>`;
    });
    grid.innerHTML = html;

    renderPagination();
}

// TẠO NÚT CHUYỂN TRANG
function renderPagination() {
    let paginationContainer = document.getElementById('pagination-container');
    // Nếu chưa có thì tự động sinh ra một khu vực chứa thanh phân trang dưới lưới Grid
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        paginationContainer.style = 'grid-column: 1 / -1; display: flex; justify-content: center; gap: 8px; margin-top: 40px;';
        document.getElementById('shop-grid').after(paginationContainer);
    }

    const totalPages = Math.ceil(currentFilteredList.length / itemsPerPage);
    let html = '';

    if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            const activeStyle = i === currentPage ? 'background: var(--indigo); color: white;' : 'background: #f1f1f1; color: var(--ink);';
            html += `<button onclick="goToPage(${i})" style="padding: 10px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight:bold; ${activeStyle} transition: 0.2s;">${i}</button>`;
        }
    }
    paginationContainer.innerHTML = html;
}

// KHI BẤM NÚT QUA TRANG
window.goToPage = function (pageNumber) {
    currentPage = pageNumber;
    renderPage();
    // Tự động cuộn màn hình lên đầu danh sách sản phẩm cho xịn
    document.querySelector('.shop-toolbar').scrollIntoView({ behavior: 'smooth' });
}
