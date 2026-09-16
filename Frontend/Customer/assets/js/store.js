// HỆ THỐNG THÔNG BÁO (TOAST) THAY THẾ ALERT
window.showToast = function(message, type = 'success', redirectUrl = null) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const bg = type === 'error' ? '#ef4444' : '#10b981'; // Đỏ hoặc Xanh lá
    const icon = type === 'error' ? '⚠️' : '✅';
    
    toast.style.cssText = `
        background: ${bg}; color: white; padding: 16px 24px; border-radius: 8px;
        font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; font-size: 15px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15); opacity: 0; transform: translateX(50px);
        transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); display: flex; align-items: center; gap: 10px;
    `;
    toast.innerHTML = `<span style="font-size:20px">${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 400);
        if (redirectUrl) window.location.href = redirectUrl;
    }, 2000); // 2 giây sau tự tắt và chuyển trang (nếu có)
};

// Thay cổng 7123 bằng cổng localhost đang chạy C# của bạn
const PRODUCT_API = 'http://localhost:5076/api/Products';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Cập nhật nút Account 👤 trên toàn bộ các trang (index, shop, product, cart)
    const accIcon = document.querySelector('.icon-btn:not(.icon-btn--cart)');
    if (accIcon) {
        const user = sessionStorage.getItem('loggedInUser');
        accIcon.href = user ? 'account.html' : 'login.html';
        if (user) {
            accIcon.innerHTML = '🟢'; // Đổi icon khi đã login thành công
            accIcon.title = "Tài khoản của tôi";
        }
    }
    // Chỉ chạy khi ở trang chủ (có các class này)
    if (document.querySelector('.products') || document.querySelector('.compact-row')) {
        loadHomeProducts();
    }
    updateCartCount();
});

async function loadHomeProducts() {
    const trendingContainer = document.querySelector('.products');
    const compactContainer = document.querySelector('.compact-row');

    try {
        const res = await fetch(PRODUCT_API);
        if (!res.ok) throw new Error("Lỗi API");
        const products = await res.json();

        // ==============================================================
        // 1. ĐỔI 5 SẢN PHẨM ĐẦU VÀO MỤC "TRENDING PRODUCTS"
        // ==============================================================
        if (trendingContainer) {
            trendingContainer.innerHTML = '';
            const topProducts = products.slice(0, 5);

            topProducts.forEach(p => {
                const id = p.productId || p.id;
                const name = p.productName || p.name;
                const priceValue = p.price || 0;

                // BÍ QUYẾT LẤY ẢNH TỪ BẢNG PRODUCT IMAGES:
                let imgUrl = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80'; // Ảnh dự phòng
                if (p.productImages && p.productImages.length > 0) {
                    // Tự động tìm cột Url hoặc ImageUrl trong C#
                    imgUrl = p.productImages[0].imageUrl || p.productImages[0].url || p.productImages[0].imagePath || imgUrl;
                }

                const priceFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(priceValue);

                
        let r = Math.round(p.averageRating || 0);
        let starsHtml = '';
        for(let i=1; i<=5; i++) { starsHtml += (i<=r) ? '★' : '☆'; }
        const revCount = p.reviewCount || 0;
        const sales = p.totalSales || 0;
        
        const html = `
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
          <button onclick="addToCart(${id}, '${name.replace(/'/g, ` `)}', ${priceValue}, '${imgUrl}', ${priceValue}, '')" class="btn" style="padding: 6px 12px; font-size: 14px; cursor: pointer;">
              Thêm vào giỏ 🛒
          </button>
        </article>
        `;
                trendingContainer.innerHTML += html;
            });
        }

        // ==============================================================
        // 2. ĐỔI 4 SẢN PHẨM TIẾP THEO VÀO MỤC "JUST FOR YOU" (COMPACT ROW)
        // ==============================================================
        if (compactContainer) {
            compactContainer.innerHTML = '';
            // Lấy từ sản phẩm số 6 đến số 9
            const compactProducts = products.slice(5, 9);

            compactProducts.forEach(p => {
                const id = p.productId || p.id;
                const name = p.productName || p.name;
                const priceValue = p.price || 0;

                let imgUrl = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80';
                if (p.productImages && p.productImages.length > 0) {
                    imgUrl = p.productImages[0].imageUrl || p.productImages[0].url || p.productImages[0].imagePath || imgUrl;
                }

                const priceFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(priceValue);

                const html = `
                <article class="compact-card">
                  <div class="pic">
                    <img src="${imgUrl}" alt="${name}" style="height: 100%; width: 100px; object-fit: cover; border-radius: 8px;" />
                  </div>
                  <div>
                    <div class="stock" style="color: #4F46E5;">IN STOCK · Sẵn hàng</div>
                    <div class="name" style="font-weight: 600; margin: 4px 0;">${name}</div>
                    <div class="price text-primary" style="font-weight: bold; margin-bottom: 8px;">${priceFormatted}</div>
                    <button onclick="addToCart(${id}, '${name.replace(/'/g, ` `)}', ${priceValue}, '${imgUrl}', ${priceValue}, '')" class="btn" style="padding: 6px 12px; font-size: 14px; cursor: pointer;">Mua Ngay</button>
                  </div>
                </article>
                `;
                compactContainer.innerHTML += html;
            });
        }

    } catch (e) {
        console.error("Lỗi:", e);
    }
}

// ==============================================================
// 3. XỬ LÝ GIỎ HÀNG (GIỮ NGUYÊN)
// ==============================================================
function addToCart(id, name, price, image, basePrice, discountName) {
    const user = sessionStorage.getItem('loggedInUser');
    if (!user) {
        showToast("Bạn cần đăng nhập để thêm vào giỏ hàng!", 'error', 'login.html');
        return;
    }

    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    let existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1, basePrice: basePrice || price, discountName: discountName || '' });
    }
    localStorage.setItem('myCart', JSON.stringify(cart));
    showToast(`Đã thêm "${name}" vào giỏ hàng!`);
    updateCartCount();
}

function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.querySelector('.icon-btn--cart .count');
    if (cartCountEl) cartCountEl.textContent = totalItems;
}

// ==========================================
// OVERRIDE FOR REAL API LOGIN & PROFILE DATA
// ==========================================

const API_ACCOUNTS_LOGIN = 'http://localhost:5076/api/Accounts/login';
const API_ORDERS = 'http://localhost:5076/api/Orders';

// Override global handleLogin function
window.handleLogin = async function(e) {
    if(e) e.preventDefault();
    
    const un = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    
    if (!un || !pass) {
        showToast("Vui lòng nhập tài khoản và mật khẩu!", 'error');
        return;
    }
    
    try {
        const response = await fetch(API_ACCOUNTS_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Username: un, Password: pass })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const loggedInUser = {
                id: data.accountId,
                username: un,
                email: data.email || un,
                role: data.role || 'Customer',
                customerId: data.customerId,
                fullName: data.fullName,
                phone: data.phone,
                address: data.address
            };
            sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
            showToast("Đăng nhập thành công! Đang chuyển hướng...", 'success', 'index.html');
        } else {
            showToast(data.message || "Sai tài khoản hoặc mật khẩu!", 'error');
        }
    } catch (error) {
        console.error("Login error:", error);
        showToast("Lỗi kết nối đến máy chủ!", 'error');
    }
};

// Check if we are on account page, then load real data
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('prof-email') && document.getElementById('prof-phone')) {
        const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
        if (user) {
            // Fill real data
            document.getElementById('acc-name').textContent = user.fullName || user.username;
            document.getElementById('prof-name').value = user.fullName || '';
            document.getElementById('prof-email').value = user.email || '';
            document.getElementById('prof-phone').value = user.phone || '';
            document.getElementById('prof-address').value = user.address || '';
            
            // Load real orders
            loadRealOrderHistory(user.customerId);
        }
    }
});

async function loadRealOrderHistory(customerId) {
    const orderListContainer = document.getElementById('tab-orders');
    if(!orderListContainer) return;
    
    if(!customerId || customerId == 0) {
        orderListContainer.innerHTML = '<h2 style="margin-bottom: 30px;">Lịch sử mua hàng</h2><p style="text-align:center;color:#666;">Chưa có đơn hàng nào.</p>';
        return;
    }

    try {
        orderListContainer.innerHTML = '<p style="text-align:center;color:#666;">Đang tải dữ liệu đơn hàng...</p>';
        const res = await fetch(API_ORDERS);
        if(!res.ok) throw new Error("Failed to fetch orders");
        
        const allOrders = await res.json();
        const myOrders = allOrders.filter(o => o.customerId === customerId);
        
        if (myOrders.length === 0) {
            orderListContainer.innerHTML = '<h2 style="margin-bottom: 30px;">Lịch sử mua hàng</h2><p style="text-align:center;color:#666;">Bạn chưa có đơn hàng nào.</p>';
            return;
        }
        
        myOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        orderListContainer.innerHTML = '<h2 style="margin-bottom: 30px;">Lịch sử mua hàng</h2>';
        
        for (const order of myOrders) {
            const dateStr = new Date(order.orderDate).toLocaleDateString('vi-VN');
            
            let statusTag = 'st-warning';
            let statusText = order.orderStatus;
            
            if(statusText === 'Pending' || statusText === 'Chờ xử lý') {
                statusText = 'Chờ xử lý';
            } else if (statusText === 'Delivered' || statusText === 'Hoàn thành' || statusText === 'Đã giao' || statusText === 'Đã thanh toán') {
                statusTag = 'st-success';
            }
            
            let html = `
                <div class="acc-order-item">
                    <div class="acc-order-header">
                        <div>Mã ĐH: <strong>#ORD-${order.orderId}</strong> <span style="font-size:12px;color:#888;margin-left:10px;">Ngày đặt: ${dateStr}</span></div>
                        <span class="acc-status-tag ${statusTag}">
                            ${statusText}
                        </span>
                    </div>`;
                    
            try {
                const detailRes = await fetch(`${API_ORDERS}/${order.orderId}`);
                if(detailRes.ok) {
                    const detailData = await detailRes.json();
                    if(detailData.orderDetails && detailData.orderDetails.length > 0) {
                        for(const item of detailData.orderDetails) {
                            // Sửa lỗi hiển thị hình ảnh ở đây: API trả về item.image
                            const imgUrl = item.image || item.imageUrl || 'https://via.placeholder.com/60';
                            html += `
                                <div class="acc-order-body">
                                    <div style="display:flex; gap:15px; align-items:center;">
                                        <img src="${imgUrl}" alt="Product" style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid #eee;">
                                        <div>
                                            <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${item.productName || 'Sản phẩm'}</div>
                                            <div style="font-size:12px; color:#666;">Số lượng: ${item.quantity}</div>
                                        </div>
                                    </div>
                                    <div style="font-weight:700; color:var(--primary-color);">
                                        ${item.unitPrice.toLocaleString('vi-VN')} đ
                                    </div>
                                </div>`;
                        }
                    }
                }
            } catch (e) { console.error(e); }
            
            // Xử lý nút bấm theo trạng thái
            let actionButtons = `<button class="acc-btn-outline" style="margin-left:8px; padding: 6px 12px;" onclick="viewOrderDetails(${order.orderId})">Xem chi tiết</button>`;
            
            if (statusText === 'Chờ xử lý') {
                actionButtons += `<button class="acc-btn-outline" style="margin-left:8px; padding: 6px 12px; color:red; border-color:red;" onclick="cancelOrder(${order.orderId})">Hủy đơn</button>`;
            }
            if (statusText === 'Hoàn thành' || statusText === 'Đã giao' || statusText === 'Đã thanh toán' || statusText === 'Delivered' || statusText === 'Completed') {
                actionButtons += `<button class="acc-btn-outline" style="margin-left:8px; padding: 6px 12px; background:var(--primary-color); color:#fff; border-color:var(--primary-color);" onclick="window.location.href='shop.html'; showToast('Vui lòng chọn sản phẩm để đánh giá!');">Viết Đánh Giá</button>`;
            }

            html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; border-top:1px dashed #eee; padding-top:15px;">
                        <div>
                            Tổng tiền: <strong style="font-size:18px; color:var(--primary-color);">${order.totalAmount.toLocaleString('vi-VN')} đ</strong>
                        </div>
                        <div>
                            ${actionButtons}
                        </div>
                    </div>
                </div>`;
            
            orderListContainer.innerHTML += html;
        }
        
    } catch (error) {
        console.error(error);
        orderListContainer.innerHTML = '<p style="text-align:center;color:red;">Lỗi khi tải lịch sử mua hàng.</p>';
    }
}

// Hàm hỗ trợ
window.viewOrderDetails = async function(orderId) {
    try {
        const res = await fetch(API_ORDERS + '/' + orderId);
        if(!res.ok) throw new Error("Lỗi tải chi tiết");
        const order = await res.json();
        
        let html = `
        <div id="order-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; justify-content:center; align-items:center;">
            <div style="background:#fff; width:800px; max-width:95%; border-radius:8px; padding:25px; max-height:90vh; overflow-y:auto; position:relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <button onclick="document.getElementById('order-modal').remove()" style="position:absolute; top:15px; right:15px; background:transparent; color:#333; font-size:24px; border:none; cursor:pointer;">&times;</button>
                
                <h2 style="margin-top:0; color:var(--primary); margin-bottom:25px; border-bottom: 2px solid #eee; padding-bottom:10px;">Chi tiết đơn hàng #ORD-${order.orderId}</h2>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:25px;">
                    <div>
                        <label style="font-size:12px; font-weight:700; color:#555; display:block; margin-bottom:5px;">TÊN NGƯỜI NHẬN HÀNG</label>
                        <input type="text" value="${order.shippingName || order.customerName}" readonly style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; background:#f9f9f9; outline:none;">
                    </div>
                    <div>
                        <label style="font-size:12px; font-weight:700; color:#555; display:block; margin-bottom:5px;">SỐ ĐIỆN THOẠI NHẬN</label>
                        <input type="text" value="${order.shippingPhone || order.phone}" readonly style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; background:#f9f9f9; outline:none;">
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="font-size:12px; font-weight:700; color:#555; display:block; margin-bottom:5px;">ĐỊA CHỈ GIAO HÀNG</label>
                        <input type="text" value="${order.shippingAddress || 'Chưa cập nhật'}" readonly style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; background:#f9f9f9; outline:none;">
                    </div>
                </div>
                
                <div style="border: 1px solid #e0e0e0; border-radius:8px; padding:20px; background:#fafafa;">
                    <label style="font-size:14px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:8px; margin-bottom:15px;">
                        <span style="font-size:18px;">🛒</span> SẢN PHẨM TRONG ĐƠN HÀNG
                    </label>
                    <table style="width:100%; border-collapse: collapse; font-size:14px; background:#fff; border-radius:6px; overflow:hidden;">
                        <thead>
                            <tr style="background:#f1f1f1; color:#333; text-transform:uppercase; font-size:12px;">
                                <th style="text-align:left; padding:12px 15px;">Tên sản phẩm</th>
                                <th style="text-align:center; padding:12px 15px;">Số lượng</th>
                                <th style="text-align:right; padding:12px 15px;">Đơn giá</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (order.orderDetails && order.orderDetails.length > 0) {
            order.orderDetails.forEach(item => {
                html += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:12px 15px; font-weight:500;">${item.productName || item.product?.productName || 'Sản phẩm'}</td>
                                <td style="text-align:center; padding:12px 15px;">${item.quantity}</td>
                                <td style="text-align:right; padding:12px 15px; font-weight:600; color:#e74c3c;">${item.unitPrice.toLocaleString('vi-VN')} đ</td>
                            </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="3" style="text-align:center; padding:15px; color:#999;">Không có dữ liệu sản phẩm</td></tr>`;
        }
        
        html += `
                        </tbody>
                    </table>
                    <div style="text-align:right; margin-top:20px; font-weight:700; font-size:20px; color:var(--primary); padding-top:15px; border-top:2px dashed #ddd;">
                        TỔNG CỘNG: ${order.totalAmount.toLocaleString('vi-VN')} đ
                    </div>
                </div>
            </div>
        </div>
        `;
        
        // Tránh trùng lặp modal nếu bấm nhiều lần
        const existing = document.getElementById('order-modal');
        if(existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', html);
        
    } catch (e) {
        console.error(e);
        alert('Không thể tải chi tiết đơn hàng!');
    }
}

window.cancelOrder = async function(orderId) {
    if(confirm('Bạn có chắc chắn muốn hủy đơn hàng #' + orderId + ' không?')) {
        try {
            const res = await fetch(`${API_ORDERS}/${orderId}/cancel`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                alert('Đã hủy đơn hàng thành công!');
                window.location.reload();
            } else {
                const err = await res.text();
                alert('Không thể hủy đơn hàng: ' + err);
            }
        } catch (e) {
            console.error(e);
        }
    }
}
