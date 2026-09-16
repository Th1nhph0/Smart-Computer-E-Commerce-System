// Đổi cổng API cho khớp với máy bạn
const PRODUCT_API = 'http://localhost:5076/api/Products';

let allProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById('main-home')) {
        await loadHomeData();
    }
    if (typeof updateCartCount === 'function') updateCartCount();
});

async function loadHomeData() {
    try {
        const res = await fetch(PRODUCT_API);
        if (!res.ok) throw new Error("Lỗi API");
        allProducts = await res.json();

        // 1. Tự động gom nhóm Category & Vẽ lưới Danh mục
        renderCategoriesGrid();

        // 2. Tự động tạo Menu Tab theo Category
        renderCategoryTabs();

        // 3. Mặc định hiển thị 8 sản phẩm mới nhất
        let highStockFirst = [...allProducts].sort((a,b) => (b.currentStock || 0) - (a.currentStock || 0));
        renderProducts(highStockFirst.slice(0, 8));

    } catch (e) {
        console.error(e);
        document.querySelector('.products').innerHTML = '<p style="text-align:center;color:red;width:100%">Lỗi kết nối máy chủ C#</p>';
    }
}

function renderCategoriesGrid() {
    const catMap = new Map();
    // Khai thác dữ liệu Category đi kèm trong mỗi Product
    allProducts.forEach(p => {
        if (p.category && p.category.categoryId) {
            if (!catMap.has(p.category.categoryId)) {
                catMap.set(p.category.categoryId, {
                    id: p.category.categoryId,
                    name: p.category.categoryName || 'Khác',
                    count: 0
                });
            }
            catMap.get(p.category.categoryId).count++;
        }
    });

    const grid = document.querySelector('.cats-grid');
    if (!grid) return;

    let html = '';
    const defaultImages = [
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&q=80',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80',
        'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=300&q=80'
    ];

    let i = 0;
    catMap.forEach(cat => {
        const img = defaultImages[i % defaultImages.length]; // Lấy ảnh random cho mục
        html += `
        <a href="shop.html?category=${cat.id}" class="cat-tile">
          <div class="pic"><img src="${img}" alt="${cat.name}" /></div>
          <div class="name" style="font-weight:bold;">${cat.name}</div>
          <div class="count text-primary">${cat.count} Sản phẩm</div>
        </a>`;
        i++;
    });
    grid.innerHTML = html;
}

function renderCategoryTabs() {
    const tabsContainer = document.querySelector('.tabs');
    if (!tabsContainer) return;

    const catMap = new Map();
    allProducts.forEach(p => {
        if (p.category && p.category.categoryId) {
            catMap.set(p.category.categoryId, p.category.categoryName);
        }
    });

    // Nút "Tất cả" mặc định
    let html = `<button class="tab is-active" onclick="filterTab(0, this)">Tất cả Mới Nhất</button>`;

    // Tự động sinh nút Tab từ Database
    catMap.forEach((name, id) => {
        html += `<button class="tab" onclick="filterTab(${id}, this)">${name}</button>`;
    });
    tabsContainer.innerHTML = html;
}

window.filterTab = function (categoryId, btnElement) {
    // Đổi màu tab đang chọn
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('is-active'));
    btnElement.classList.add('is-active');

    // Lọc data
    let filtered = [];
    if (categoryId === 0) {
        filtered = allProducts.slice(0, 8);
    } else {
        filtered = allProducts.filter(p => p.category && p.category.categoryId === categoryId);
    }
    renderProducts(filtered);
}

function renderProducts(productsList) {
    const container = document.querySelector('.products');
    if (!container) return;
    container.innerHTML = '';

    if (productsList.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%">Đang cập nhật sản phẩm cho danh mục này.</p>';
        return;
    }

    productsList.forEach(p => {
        const id = p.productId || p.id;
        const name = p.productName || p.name;
        const basePrice = p.price || 0;
        
        let discountPercent = 0;
        let badgeHtml = '';
        
        // Logic Khuyến mãi
        if ((p.currentStock || 0) > 20) {
            discountPercent = 15;
            badgeHtml = `<span style="position:absolute; top:10px; left:10px; background:#ff3e1d; color:#fff; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold; z-index:10;">🔥 Xả Kho -15%</span>`;
        }

        const discountPrice = basePrice * (1 - (discountPercent / 100));
        
        const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
        const priceFormatted = formatter.format(discountPrice);
        const oldPriceHtml = discountPercent > 0 ? `<span style="text-decoration:line-through; color:#999; font-size:12px; margin-left:8px;">${formatter.format(basePrice)}</span>` : '';

        let imgUrl = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80';
        if (p.productImages && p.productImages.length > 0) {
            imgUrl = p.productImages[0].imageUrl || p.productImages[0].url || p.productImages[0].imagePath || imgUrl;
        }

        let r = Math.round(p.averageRating || 0);
        let starsHtml = '';
        for(let i=1; i<=5; i++) { starsHtml += (i<=r) ? '★' : '☆'; }
        const revCount = p.reviewCount || 0;
        const sales = p.totalSales || 0;
        
        container.innerHTML += `
        <article class="product-card" style="position:relative;">
          ${badgeHtml}
          <div class="img-wrap">
            <button class="wishlist" aria-label="Wishlist">♡</button>
            <img src="${imgUrl}" alt="${name}" loading="lazy" style="height: 220px; object-fit: contain; width: 100%; padding: 10px; background: white;" />
          </div>
          <div class="product-info">
            <h3 class="product-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
              <a href="product.html?id=${id}">${name}</a>
            </h3>
            
            <div style="font-size:12px; color:#666; margin: 5px 0;">
                <span style="color:#fbc02d; font-size:14px; margin-right:4px;">${starsHtml}</span> 
                (${revCount} đánh giá) | Đã bán: ${sales}
            </div>

            <p class="product-price">
              ${priceFormatted} ${oldPriceHtml}
            </p>
            <button class="btn add-to-cart" onclick="addToCart(${id}, '${name.replace(/'/g, ` `)}', ${discountPrice}, '${imgUrl}', ${basePrice}, '🔥 Xả Kho - Giá Sốc')">Thêm vào giỏ</button>
          </div>
        </article>
        `;
    });
}
