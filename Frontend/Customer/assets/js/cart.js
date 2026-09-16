document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('cart-items-container')) {
        renderCartPage();
    }
});

function renderCartPage() {
    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    const container = document.getElementById('cart-items-container');
    const summary = document.getElementById('cart-summary-container');
    const layout = document.getElementById('cart-layout');
    if (cart.length === 0) {
        layout.style.gridTemplateColumns = "1fr";
        summary.style.display = "none";
        container.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; background:var(--paper); border-radius:12px; border: 1px solid #eee;">
                <div style="font-size: 60px; margin-bottom:20px;">🛒</div>
                <h2>Giỏ hàng của bạn đang trống</h2>
                <a href="index.html" class="btn btn--indigo" style="margin-top:20px;">← Quay lại cửa hàng</a>
            </div>`;
        return;
    }

    summary.style.display = "block";
    layout.style.gridTemplateColumns = "2fr 1fr";

    let html = '';
    let total = 0;
    let baseTotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        const itemBaseTotal = (item.basePrice || item.price) * item.quantity;
        total += itemTotal;
        baseTotal += itemBaseTotal;

        const priceFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price);
        const itemBaseFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.basePrice || item.price);
        const totalFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(itemTotal);
        
        let oldPriceHtml = (item.basePrice && item.basePrice > item.price) 
            ? `<span style="text-decoration:line-through; color:gray; font-size:13px; margin-right:5px">${itemBaseFmt}</span>` 
            : '';
            
        let discountBadge = (item.discountName) 
            ? `<div style="font-size:12px; color:var(--emerald); background:#e6f9e6; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:4px; border: 1px dashed var(--emerald);">Mã tự động: ${item.discountName}</div>`
            : '';

        html += `
        <div class="cart-item-row" style="display:flex; gap: 20px; padding: 20px 0; border-bottom: 1px solid var(--rule); align-items: center;">
            <img src="${item.image}" alt="${item.name}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">
            <div style="flex: 1;">
                <a href="product.html?id=${item.id}" style="font-weight: 600; font-size: 18px; color: var(--ink); text-decoration:none;">${item.name}</a>
                <div style="color: gray; margin-top: 8px;">Đơn giá: ${oldPriceHtml} <strong style="color:var(--primary)">${priceFmt}</strong></div>
                ${discountBadge}
            </div>
            <div style="display:flex; align-items:center; border: 1px solid #ccc; border-radius: 6px; overflow:hidden;">
                <button onclick="updateQty(${item.id}, -1)" style="border:none; background:#f9f9f9; padding:8px 15px; cursor:pointer; font-weight:bold; font-size:16px;">-</button>
                <span style="padding: 0 15px; font-weight:bold;">${item.quantity}</span>
                <button onclick="updateQty(${item.id}, 1)" style="border:none; background:#f9f9f9; padding:8px 15px; cursor:pointer; font-weight:bold; font-size:16px;">+</button>
            </div>
            <div class="cart-item-price" style="width: 150px; text-align:right; font-weight:bold; color:var(--primary); font-size: 18px;">
                ${totalFmt}
            </div>
            <button onclick="removeCartItem(${item.id})" style="border:none; background:none; color:#ff4d4f; font-size:30px; cursor:pointer; margin-left:10px; line-height:1;" title="Xóa">×</button>
        </div>`;
    });

    container.innerHTML = html;
    
    const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
    const discount = baseTotal - total;
    
    document.getElementById('subtotal').textContent = formatter.format(baseTotal);
    document.getElementById('total').textContent = formatter.format(total);
    
    if (discount > 0 && document.getElementById('cart-discount-row')) {
        document.getElementById('cart-discount-row').style.display = 'flex';
        document.getElementById('cart-discount').textContent = "-" + formatter.format(discount);
    } else if (document.getElementById('cart-discount-row')) {
        document.getElementById('cart-discount-row').style.display = 'none';
    }
}

window.updateQty = function (id, delta) {
    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    let item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) cart = cart.filter(i => i.id !== id);
        localStorage.setItem('myCart', JSON.stringify(cart));
        renderCartPage();
        if (typeof updateCartCount === 'function') updateCartCount();
    }
}

window.removeCartItem = function (id) {
    if (confirm("Bạn có chắc muốn xóa sản phẩm này khỏi giỏ?")) {
        let cart = JSON.parse(localStorage.getItem('myCart')) || [];
        cart = cart.filter(i => i.id !== id);
        localStorage.setItem('myCart', JSON.stringify(cart));
        renderCartPage();
        if (typeof updateCartCount === 'function') updateCartCount();
    }
}

// Add global checkout validation
document.addEventListener('click', function(e) {
    // Intercept clicks on links that go to checkout.html
    if (e.target.closest('a') && e.target.closest('a').getAttribute('href') === 'checkout.html') {
        const user = sessionStorage.getItem('loggedInUser');
        if (!user) {
            e.preventDefault();
            showToast("Bạn phải đăng nhập để tiến hành thanh toán!", 'error', 'login.html');
        }
    }
});
