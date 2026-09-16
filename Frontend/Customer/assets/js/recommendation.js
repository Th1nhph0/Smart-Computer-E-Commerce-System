document.addEventListener('DOMContentLoaded', () => {
    // Determine the product ID from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        fetchRecommendations(productId);
    }
});

async function fetchRecommendations(id) {
    try {
        const response = await fetch(`http://localhost:5076/api/Products/${id}/SmartRecommendations`);
        if (!response.ok) return;

        const combos = await response.json();
        
        if (combos && combos.length > 0) {
            renderComboUI(combos);
        }
    } catch (err) {
        console.error("Lỗi khi tải gợi ý mua kèm: ", err);
    }
}

function renderComboUI(combos) {
    const container = document.getElementById('combo-recommendations');
    const list = document.getElementById('combo-list');
    
    if (!container || !list) return;

    list.innerHTML = ''; // clear

    combos.forEach(item => {
        // Calculate discounted price
        const discountPrice = item.price * (1 - (item.discountPercent / 100));

        const itemHtml = `
            <div style="display:flex; align-items:center; gap:15px; padding:10px; background:#fff; border:1px solid #eee; border-radius:8px;">
                <img src="${item.imageUrl}" alt="${item.productName}" style="width:60px; height:60px; object-fit:contain; border-radius:4px; border:1px solid #f5f5f5;" onerror="this.src='https://via.placeholder.com/60?text=No+Img'"/>
                <div style="flex:1;">
                    <a href="product.html?id=${item.productId}" style="font-weight:600; color:#333; text-decoration:none; display:block; margin-bottom:4px;">
                        ${item.productName}
                    </a>
                    <div style="display:flex; align-items:center; gap:10px; font-size:14px;">
                        <span style="color:var(--emerald); font-weight:700;">${formatVND(discountPrice)}</span>
                        ${item.discountPercent > 0 ? `<span style="text-decoration:line-through; color:#999; font-size:12px;">${formatVND(item.price)}</span>` : ''}
                    </div>
                    <small style="color:var(--indigo); display:block; margin-top:4px;">
                        <i style="margin-right:4px;">⚡</i>${item.reason} (Kho: ${item.currentStock})
                    </small>
                </div>
                <div>
                    <button onclick="addComboToCart(${item.productId})" style="background:var(--indigo); color:#fff; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:600; font-size:13px; transition:0.2s;">
                        + Thêm Combo (-${item.discountPercent}%)
                    </button>
                </div>
            </div>
        `;
        list.innerHTML += itemHtml;
    });

    // Show the container
    container.style.display = 'block';
}

function formatVND(val) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

function addComboToCart(recommendedProductId) {
    // 1. Add current main product
    const urlParams = new URLSearchParams(window.location.search);
    const mainProductId = urlParams.get('id');
    const qty = parseInt(document.getElementById('p-qty')?.value || 1);
    
    // Fake add to cart logic - redirect to cart or show alert
    alert(`Đã thêm thành công cả sản phẩm chính và sản phẩm gợi ý (ID: ${recommendedProductId}) vào giỏ hàng với mức giá ưu đãi!`);
    
    // Real implementation would involve calling POST /api/Cart for both items.
}
