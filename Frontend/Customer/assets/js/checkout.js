const ORDER_API = 'http://localhost:5076/api/Orders';

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('checkout-form')) {
        renderCheckout();
    }
});

function renderCheckout() {
    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    if (cart.length === 0) {
        alert("Giỏ hàng của bạn đang trống! Vui lòng chọn sản phẩm trước.");
        window.location.href = "shop.html";
        return;
    }

    let html = '';
    let total = 0;
    let baseTotal = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        const itemBaseTotal = (item.basePrice || item.price) * item.quantity;
        total += itemTotal;
        baseTotal += itemBaseTotal;
        
        const itemBaseFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(itemBaseTotal);
        const itemTotalFmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(itemTotal);
        
        let oldPriceHtml = (item.basePrice && item.basePrice > item.price) 
            ? `<span style="text-decoration:line-through; color:gray; font-size:11px; margin-right:5px">${itemBaseFmt}</span>` 
            : '';
            
        let discountBadge = (item.discountName) 
            ? `<div style="font-size:11px; color:var(--emerald); background:#e6f9e6; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:4px;">Mã áp dụng: ${item.discountName}</div>`
            : '';

        html += `
        <div class="checkout-item" style="border-bottom: 1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
            <div style="display:flex; align-items:center;">
                <img src="${item.image}" alt="${item.name}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; margin-right:10px;">
                <div>
                    <div style="font-weight: 600; font-size: 14px;">${item.name}</div>
                    <div style="color: gray; font-size: 12px;">Số lượng: ${item.quantity}</div>
                    ${discountBadge}
                </div>
            </div>
            <strong style="font-size: 14px; color:var(--primary); white-space:nowrap; align-self:flex-start; margin-top:10px;">${oldPriceHtml}${itemTotalFmt}</strong>
        </div>`;
    });

    document.getElementById('checkout-items').innerHTML = html;
    
    const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
    const discount = baseTotal - total;
    
    document.getElementById('chk-subtotal').textContent = formatter.format(baseTotal);
    document.getElementById('chk-total').textContent = formatter.format(total);
    
    if (discount > 0 && document.getElementById('discount-row')) {
        document.getElementById('discount-row').style.display = 'flex';
        document.getElementById('chk-discount').textContent = "-" + formatter.format(discount);
    }
}

window.submitOrder = async function (e) {
    e.preventDefault();

    const btnSubmit = document.getElementById('btn-submit');
    const errorMsg = document.getElementById('error-message');
    btnSubmit.textContent = "ĐANG XỬ LÝ...";
    btnSubmit.disabled = true;
    errorMsg.style.display = "none";

    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    let totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let baseTotal = cart.reduce((sum, item) => sum + ((item.basePrice || item.price) * item.quantity), 0);
    let discountAmount = baseTotal - totalAmount;

    let customerId = null;
    const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (user && user.customerId) {
        customerId = user.customerId;
    }

    const payload = {
        customerId: customerId,
        fullName: document.getElementById('c-name').value,
        phone: document.getElementById('c-phone').value,
        shippingAddress: document.getElementById('c-address').value,
        notes: document.getElementById('c-note').value,
        totalAmount: totalAmount,
        discountAmount: discountAmount,
        
        status: "Chờ xử lý",
        orderDetails: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price
        }))
    };

    try {
        const res = await fetch(ORDER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Lỗi lưu đơn");

        alert("🎉 Đặt hàng thành công!");
        
        // Cập nhật lại address trong session storage để load bên trang profile
        if (user && !user.address && payload.shippingAddress) {
            user.address = payload.shippingAddress;
            sessionStorage.setItem('loggedInUser', JSON.stringify(user));
        }

        localStorage.removeItem('myCart');
        window.location.href = "account.html"; // Chuyển thẳng tới trang lịch sử đơn hàng luôn cho xịn


    } catch (error) {
        console.error(error);
        errorMsg.textContent = "❌ Đặt hàng thất bại. Xem lại Order.cs bên C#.";
        errorMsg.style.display = "block";
        btnSubmit.textContent = "ĐẶT HÀNG NGAY →";
        btnSubmit.disabled = false;
    }
}
// ==========================================
// AUTOFILL LOGGED IN USER DATA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (user) {
        const nameInput = document.getElementById('c-name');
        const phoneInput = document.getElementById('c-phone');
        const addressInput = document.getElementById('c-address');
        
        if(nameInput && user.fullName) nameInput.value = user.fullName;
        if(phoneInput && user.phone) phoneInput.value = user.phone;
        if(addressInput && user.address) addressInput.value = user.address;
    }
});
