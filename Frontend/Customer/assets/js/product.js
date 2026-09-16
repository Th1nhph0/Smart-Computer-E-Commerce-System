const DETAIL_API_URL = 'http://localhost:5076/api/Products';
let currentProduct = null;

document.addEventListener("DOMContentLoaded", async () => {
    if (document.querySelector('.product-detail')) {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
            await loadProductDetail(id);
            // Gá»i API Combo Xáº£ Kho
            setTimeout(() => loadComboRecommendations(id), 500);
        } else {
            document.querySelector('.product-detail').innerHTML = `<h2 style="text-align:center; padding: 100px; width: 100%;">KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m!</h2>`;
        }
    }
});


async function loadProductDetail(id) {
    try {
        let cachedProduct = sessionStorage.getItem('productCache_' + id);
        if (cachedProduct) {
            currentProduct = JSON.parse(cachedProduct);
        } else {
            const res = await fetch(`${DETAIL_API_URL}/${id}`);
            if (!res.ok) throw new Error("API Error");
            currentProduct = await res.json();
            sessionStorage.setItem('productCache_' + id, JSON.stringify(currentProduct));
        }

        if (!currentProduct) {
            document.querySelector('.product-detail').innerHTML = `<h2 style="text-align:center; padding: 100px; width:100%;">Không tìm thấy sản phẩm!</h2>`;
            return;
        }

        const pName = document.getElementById('p-name'); if(pName) pName.textContent = currentProduct.productName || currentProduct.name;
        const pCat = document.getElementById('p-cat'); if(pCat) pCat.textContent = currentProduct.category?.categoryName || "Product";
        const pPrice = document.getElementById('p-price'); if(pPrice) pPrice.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentProduct.price || 0);

        const ratingRow = document.querySelector('.rating-row');
        if (ratingRow && currentProduct) {
            const revCount = currentProduct.reviewCount || 0;
            const avgRating = revCount > 0 ? (currentProduct.averageRating || 0) : 0;
            const sold = currentProduct.totalSold || 0;
            const stock = currentProduct.currentStock || 0;
            
            const fullStars = Math.floor(avgRating);
            let starsHtml = '';
            
            if (revCount === 0) {
                starsHtml = '<span style="color:#aaa;">☆</span>';
            } else {
                for (let i = 0; i < fullStars; i++) starsHtml += 'star';
                if (avgRating - fullStars >= 0.5) starsHtml += 'star';
                const currentStars = fullStars + (avgRating - fullStars >= 0.5 ? 1 : 0);
                for(let i = currentStars; i < 5; i++) starsHtml += '<span style="color:#aaa;">★</span>';
            }
            
            let ratingDisplay = revCount > 0 ? `(${avgRating})` : `(No review)`;
            let stockText = stock > 0 ? `In stock: ${stock}` : `Out of stock`;
            let stockColor = stock > 0 ? 'var(--emerald)' : 'red';
        
            ratingRow.innerHTML = `
                <span style="color: var(--amber); font-size: 18px">${starsHtml} ${ratingDisplay}</span>
                <span style="margin-left: 5px; color:#555;">- ${revCount} Reviews</span>
                <span style="color: var(--rule-strong); margin: 0 10px;">|</span>
                <span style="color:#555;">Sold: ${sold}</span>
                <span style="color: var(--rule-strong); margin: 0 10px;">|</span>
                <span style="color: ${stockColor}; font-weight:bold;">${stockText}</span>
            `;
        }

        const specsFull = document.getElementById('p-specs-full') || document.getElementById('p-specs');
        if (specsFull) {
            if (currentProduct.specifications) {
                specsFull.innerHTML = currentProduct.specifications.replace(/\n/g, '<br><br>');
                const specsContainer = document.getElementById('p-specs-container');
                if (specsContainer) specsContainer.style.display = 'none';
            } else {
                specsFull.innerHTML = '<p style="color:#888;">No spec</p>';
            }
        }

        let rawDesc = currentProduct?.description || '';
        if (rawDesc) {
            const descCont = document.getElementById('p-desc-container'); 
            if(descCont) {
                descCont.style.display = 'block';
                const gallery = document.querySelector('.gallery');
                if (gallery && descCont.parentElement !== gallery.parentElement) {
                    let leftCol = document.getElementById('left-col-wrapper');
                    if (!leftCol) {
                        leftCol = document.createElement('div');
                        leftCol.id = 'left-col-wrapper';
                        leftCol.style.display = 'flex';
                        leftCol.style.flexDirection = 'column';
                        leftCol.style.gap = '30px';
                        leftCol.style.minWidth = '0';
                        gallery.parentNode.insertBefore(leftCol, gallery);
                        leftCol.appendChild(gallery);
                    }
                    leftCol.appendChild(descCont);
                }
                
                const descBox = document.getElementById('p-desc');
                if (descBox) descBox.innerHTML = rawDesc;
                const btn = document.getElementById('btn-toggle-desc');
                const grad = document.getElementById('p-desc-gradient');
                
                if (descBox && descBox.scrollHeight > 250) {
                    if(btn) btn.style.display = 'block';
                    if(grad) grad.style.display = 'block';
                } else {
                    if(btn) btn.style.display = 'none';
                    if(grad) grad.style.display = 'none';
                }
            }
        } else {
            const descCont = document.getElementById('p-desc-container');
            if(descCont) descCont.style.display = 'none';
        }

        window.imageList = [];
        let defaultImg = currentProduct.imageUrl || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80';
        
        let thumbsHtml = '';

        if (currentProduct.productImages && currentProduct.productImages.length > 0) {
            window.imageList = [];
            currentProduct.productImages.forEach(img => {
                if (img.imageUrl) {
                    // Split by newline in case multiple URLs are stored in one field
                    const urls = img.imageUrl.split(/\r?\n/).map(u => u.trim()).filter(u => u);
                    window.imageList.push(...urls);
                }
            });
            if(window.imageList.length > 0) defaultImg = window.imageList[0];

            window.imageList.forEach((u, index) => {

                thumbsHtml += `<button class="thumb-btn ${index === 0 ? 'is-active' : ''}" onclick="changeMainImg(${index})" style="border:1px solid #ddd; border-radius:8px; overflow:hidden; cursor:pointer; padding:0; background:transparent;"><img src="${u}" alt="thumb" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" onerror="this.closest('button').style.display='none'"/></button>`;
            });
        } 
        
        if (!thumbsHtml && defaultImg) { 
             thumbsHtml = `<button class="thumb-btn is-active" style="border:1px solid #ddd; border-radius:8px; overflow:hidden; padding:0;"><img src="${defaultImg}" alt="thumb" style="width:100%; height:100%; object-fit:cover;" onerror="this.closest('button').style.display='none'"/></button>`;
        }

        document.getElementById('p-thumbs').innerHTML = thumbsHtml;
        document.getElementById('p-main-img').src = defaultImg;
        document.getElementById('p-main-img').onerror = function() { this.style.display = 'none'; };

        window.currentImageIndex = 0;
        if (window.imageInterval) clearInterval(window.imageInterval);
        if (window.imageList.length > 1) {
            window.imageInterval = setInterval(() => {
                window.currentImageIndex = (window.currentImageIndex + 1) % window.imageList.length;
                changeMainImg(window.currentImageIndex, true);
            }, 3000);
        }

    } catch (e) {
        console.error('Loi detail:', e);
        const pName = document.getElementById('p-name'); 
        if (pName) {
            pName.textContent = "Error: " + e.message;
            pName.style.color = 'red';
        }
    }
}

window.changeMainImg = function (index, isAuto = false) {
    if (!window.imageList || window.imageList.length === 0) return;
    window.currentImageIndex = index;
    document.getElementById('p-main-img').src = window.imageList[index];
    document.getElementById('p-main-img').style.display = 'block';
    
    let buttons = document.querySelectorAll('#p-thumbs button');
    buttons.forEach(b => b.classList.remove('is-active'));
    if (buttons[index]) buttons[index].classList.add('is-active');

    // Náº¿u ngÆ°á»i dÃ¹ng tá»± báº¥m, reset láº¡i thá»i gian tá»± Ä‘á»™ng chuyá»ƒn áº£nh
    if (!isAuto && window.imageInterval) {
        clearInterval(window.imageInterval);
        window.imageInterval = setInterval(() => {
            window.currentImageIndex = (window.currentImageIndex + 1) % window.imageList.length;
            changeMainImg(window.currentImageIndex, true);
        }, 3000);
    }
}

window.toggleDescription = function () {
    const descBox = document.getElementById('p-desc');
    const btn = document.getElementById('btn-toggle-desc');
    const grad = document.getElementById('p-desc-gradient');

    if (descBox.style.maxHeight === '250px' || descBox.style.maxHeight === '') {
        descBox.style.maxHeight = descBox.scrollHeight + 'px';
        btn.innerHTML = 'Thu gá»n â–²';
        grad.style.display = 'none';
    } else {
        descBox.style.maxHeight = '250px';
        btn.innerHTML = 'Xem thÃªm â–¼';
        grad.style.display = 'block';
    }
}

window.changePdpQty = function (delta) {
    const input = document.getElementById('p-qty');
    let current = parseInt(input.value) || 1;
    current += delta;
    if (current < 1) current = 1;
    input.value = current;
}

window.addToCartFromDetail = function () {
    const user = sessionStorage.getItem('loggedInUser');
    if (!user) {
        showToast("Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ thÃªm sáº£n pháº©m vÃ o giá» hÃ ng!", 'error', 'login.html');
        return;
    }

    if (!currentProduct) return;
    const id = currentProduct.productId || currentProduct.id;
    const name = currentProduct.productName || currentProduct.name;
    const price = currentProduct.price || 0;
    const qty = parseInt(document.getElementById('p-qty').value) || 1;

    let imgUrl = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80';
    if (window.imageList && window.imageList.length > 0) {
        imgUrl = window.imageList[0];
    }

    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    let existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cart.push({ id, name, price, image: imgUrl, quantity: qty, basePrice: price, discountName: '' });
    }

    localStorage.setItem('myCart', JSON.stringify(cart));
    showToast(`ÄÃ£ thÃªm ${qty} "${name}" vÃ o giá» hÃ ng!`);
    if (typeof updateCartCount === 'function') updateCartCount();
}

window.buyNowFromDetail = function () {
    const user = sessionStorage.getItem('loggedInUser');
    if (!user) {
        showToast("Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ tiáº¿n hÃ nh thanh toÃ¡n!", 'error', 'login.html');
        return;
    }

    if (!currentProduct) return;
    const id = currentProduct.productId || currentProduct.id;
    const name = currentProduct.productName || currentProduct.name;
    const price = currentProduct.price || 0;
    const qty = parseInt(document.getElementById('p-qty').value) || 1;

    let imgUrl = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80';
    if (window.imageList && window.imageList.length > 0) {
        imgUrl = window.imageList[0];
    }

    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    let existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cart.push({ id, name, price, image: imgUrl, quantity: qty, basePrice: price, discountName: '' });
    }

    localStorage.setItem('myCart', JSON.stringify(cart));
    // DÃ¹ng toast xanh lÃ¡ bÃ¡o mua thÃ nh cÃ´ng rá»“i chuyá»ƒn trang 
    showToast("Äang chuyá»ƒn tá»›i giá» hÃ ng...", 'success', 'cart.html');
}


// --- COMBO XẢ KHO (APRIORI) ---
async function loadComboRecommendations(id) {
    try {
        const response = await fetch(`http://localhost:5076/api/Products/${id}/SmartRecommendations`);
        if (!response.ok) return;

        const combos = await response.json();
        if (combos && combos.length > 0) {
            renderComboRecommendations(combos);
        }
    } catch (err) {
        console.error("Lỗi khi tải gợi ý mua kèm: ", err);
    }
}

function renderComboRecommendations(combos) {
    const ctaWrapper = document.querySelector('.pdp-cta');
    if (!ctaWrapper) return;

    let comboListHtml = '';
    
    combos.forEach(item => {
        const discountPrice = item.price * (1 - (item.discountPercent / 100));
        const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
        
        let oldPriceHtml = item.discountPercent > 0 ? `<span style="text-decoration:line-through; color:#999; font-size:12px;">${formatter.format(item.price)}</span>` : '';

        comboListHtml += `
            <div style="display:flex; align-items:center; gap:15px; padding:10px; background:#fff; border:1px solid #eee; border-radius:8px;">
                <img src="${item.imageUrl}" alt="${item.productName}" style="width:60px; height:60px; object-fit:contain; border-radius:4px; border:1px solid #f5f5f5;" onerror="this.src='https://via.placeholder.com/60?text=No+Img'"/>
                <div style="flex:1;">
                    <a href="product.html?id=${item.productId}" style="font-weight:600; color:#333; text-decoration:none; display:block; margin-bottom:4px;">
                        ${item.productName}
                    </a>
                    <div style="display:flex; align-items:center; gap:10px; font-size:14px;">
                        <span style="color:var(--emerald); font-weight:700;">${formatter.format(discountPrice)}</span>
                        ${oldPriceHtml}
                    </div>
                    <small style="color:var(--indigo); display:block; margin-top:4px;">
                        <i style="margin-right:4px;">⚡</i>${item.reason} (Kho: ${item.currentStock})
                    </small>
                </div>
                <div>
                    <button onclick="addComboToCart(${item.productId}, '${item.productName.replace(/'/g, ` `)}', ${discountPrice}, '${item.imageUrl}', ${item.price}, 'Combo Mua Kèm')" style="background:var(--indigo); color:#fff; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:600; font-size:13px; transition:0.2s;">
                        + Thêm vào giỏ
                    </button>
                </div>
            </div>
        `;
    });

    const comboUI = `
        <div id="combo-recommendations" style="background:#fdfdfd; border: 2px dashed var(--indigo); border-radius:12px; padding:20px; margin-bottom:30px;">
            <h3 style="font-size:18px; margin-bottom:15px; color:var(--indigo); display:flex; align-items:center; gap:8px;">
                <span style="font-size:24px;">🔥</span> Gợi ý mua kèm
            </h3>
            <div id="combo-list" style="display:flex; flex-direction:column; gap:15px;">
                ${comboListHtml}
            </div>
        </div>
    `;

    // Avoid injecting multiple times if hot reloaded
    if(!document.getElementById('combo-recommendations')) {
        ctaWrapper.insertAdjacentHTML('beforebegin', comboUI);
    }
}

window.addComboToCart = function(id, name, price, image, basePrice, discountName) {
    if (typeof addToCart === 'function') {
        // Thêm sản phẩm chính đang xem vào trước
        if (typeof addToCartFromDetail === 'function') {
            // Tạm thời tắt cái Toast của hàm này để đỡ bị hiện 2 cái cùng lúc
            const oldShowToast = window.showToast;
            window.showToast = function(){}; 
            addToCartFromDetail();
            window.showToast = oldShowToast;
        }
        // Thêm sản phẩm combo vào sau
        addToCart(id, name, price, image, basePrice, discountName);
    } else {
        alert("Lỗi: Không tìm thấy hàm addToCart. Vui lòng tải lại trang.");
    }
}

window.changePdpQty = function (delta) {
    const qtyInput = document.getElementById('pdp-qty');
    if (!qtyInput) return;
    let current = parseInt(qtyInput.value) || 1;
    current += delta;
    if (current < 1) current = 1;
    qtyInput.value = current;
};

window.addToCartFromDetail = function () {
    if (currentProduct) {
        const qtyInput = document.getElementById('pdp-qty');
        const qty = qtyInput ? parseInt(qtyInput.value) : 1;
        if (typeof addToCart === 'function') {
            const price = currentProduct.price || 0;
            const img = window.imageList && window.imageList.length > 0 ? window.imageList[0] : '';
            addToCart(currentProduct.productId, currentProduct.productName || currentProduct.name, price, img, price, '', qty);
        }
    }
};

window.buyNowFromDetail = function () {
    if (currentProduct) {
        window.addToCartFromDetail();
        window.location.href = 'checkout.html';
    }
};
