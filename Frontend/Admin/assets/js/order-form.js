const ORDER_API = `${API_URL}/api/Orders`;
const PRODUCT_API = `${API_URL}/api/Products`;
const CUSTOMER_API = `${API_URL}/api/Customers`; // API danh sách khách (nếu có)

let globalProducts = [];
let cartItems = []; // Mảng chứa các món trong giỏ hàng { productId, productName, quantity, unitPrice }
let editOrderId = null; // Cờ kiểm tra xem đang Thêm mới hay là Sửa

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Kích hoạt Select2 cho các ô Dropdown (Gõ tìm kiếm cho sướng)
    if (typeof $ !== 'undefined' && $.fn.select2) {
        $('#selectKhachHang').select2({ placeholder: "-- Chọn khách hàng đặt --" });
        $('#selectSanPham').select2({ placeholder: "-- Chọn loại bánh / sản phẩm --" });
    }

    // 2. Bắt sự kiện Bật/Tắt Form Đặt Bánh Custom
    const checkCustom = document.getElementById('checkIsCustomOrder');
    const customFields = document.getElementById('formCustomOrderFields');
    checkCustom.addEventListener('change', function () {
        customFields.style.display = this.checked ? 'block' : 'none';
    });

    // 3. Tải danh sách Sản phẩm và Khách hàng vào Dropdown
    await loadDropdownData();

    // 4. Kiểm tra xem có phải là trang CHỈNH SỬA không (add-order.html?id=1)
    const urlParams = new URLSearchParams(window.location.search);
    editOrderId = urlParams.get('id');
    if (editOrderId) {
        document.querySelector('.card-header h5').innerHTML = `<i class='bx bx-edit text-warning'></i> Cập Nhật Đơn Hàng #${editOrderId}`;
        loadOrderForEdit(editOrderId);
    }

    // 5. Bắt sự kiện LƯU ĐƠN HÀNG
    document.getElementById('formAddOrder').addEventListener('submit', saveOrder);
});

// ==========================================
// TẢI DỮ LIỆU DROPDOWN TỪ C# API
// ==========================================
async function loadDropdownData() {
    try {
        // Tải Sản Phẩm
        const resProd = await fetch(PRODUCT_API);
        if (resProd.ok) {
            globalProducts = await resProd.json();
            const selProd = document.getElementById('selectSanPham');
            globalProducts.forEach(p => {
                const price = p.price || p.currentPrice || p.giaBan || 0;
                const id = p.productId || p.id;
                const option = document.createElement('option');
                option.value = id;
                // Hiển thị dạng: [ID] Tên sản phẩm - Giá tiền (Giúp Select2 tự động tìm kiếm được theo cả ID lẫn Tên)
                option.text = `[${id}] ${p.productName} - ${price.toLocaleString('vi-VN')} đ`;
                selProd.appendChild(option);
            });
        }

        // Tải Khách Hàng (Bọc trong Try-Catch lỡ DB bạn chưa có bảng Khách hàng)
        try {
            const resCust = await fetch(CUSTOMER_API);
            if (resCust.ok) {
                const customers = await resCust.json();
                const selCust = document.getElementById('selectKhachHang');
                customers.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.customerId || c.id;
                    option.text = `${c.customerName || c.fullName} - ${c.phone}`;
                    selCust.appendChild(option);
                });
            }
        } catch (e) { console.log("Chưa có API Khách hàng, bỏ qua."); }

    } catch (e) { console.error("Lỗi tải dropdown:", e); }
}

// ==========================================
// XỬ LÝ GIỎ HÀNG (THÊM / XÓA)
// ==========================================
function addItemToCart() {
    const selProd = document.getElementById('selectSanPham');
    const qtyInput = document.getElementById('inputSoLuong');

    if (!selProd.value) {
        alert("Vui lòng chọn 1 sản phẩm từ danh sách!");
        return;
    }

    const productId = parseInt(selProd.value);
    const qty = parseInt(qtyInput.value) || 1;

    const prodData = globalProducts.find(p => (p.productId || p.id) === productId);
    if (!prodData) return;

    // KTra xem món này đã có trong giỏ chưa? Có rồi thì cộng dồn Số lượng
    const existingItem = cartItems.find(i => i.productId === productId);
    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cartItems.push({
            productId: productId,
            productName: prodData.productName,
            quantity: qty,
            unitPrice: prodData.price || prodData.currentPrice || prodData.giaBan || 0
        });
    }

    renderCart(); // Cập nhật lại giao diện bảng
}

function removeCartItem(index) {
    cartItems.splice(index, 1);
    renderCart();
}

function renderCart() {
    const tbody = document.getElementById('cartTableBody');
    if (cartItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-2">Chưa có sản phẩm nào trong giỏ hàng</td></tr>';
        return;
    }

    let html = '';
    cartItems.forEach((item, index) => {
        html += `
            <tr>
                <td class="text-wrap">${item.productName}</td>
                <td class="text-center fw-bold text-primary">${item.quantity}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-icon btn-outline-danger" onclick="removeCartItem(${index})">
                        <i class="bx bx-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ==========================================
// XỬ LÝ LƯU ĐƠN HÀNG XUỐNG DB
// ==========================================
async function saveOrder(e) {
    e.preventDefault();

    const isCustom = document.getElementById('checkIsCustomOrder').checked;

    if (cartItems.length === 0 && !isCustom) {
        alert("⚠️ Đơn hàng trống! Vui lòng chọn ít nhất 1 sản phẩm hoặc Bật tùy chọn Đơn Đặt Bánh Custom.");
        return;
    }

    // 1. Tính Tổng Tiền
    let totalAmt = 0;
    cartItems.forEach(i => totalAmt += (i.unitPrice * i.quantity));

    // 2. Thu thập Data vào Cấu trúc JSON chuẩn bị gửi cho C#
    const customerIdStr = document.getElementById('selectKhachHang').value;

    const orderPayload = {
        customerId: customerIdStr ? parseInt(customerIdStr) : null,
        shippingName: document.getElementById('tenNguoiNhan').value,
        shippingPhone: document.getElementById('sdtNguoiNhan').value,
        shippingAddress: document.getElementById('diaChiGiao').value,
        totalAmount: totalAmt, // Hoặc total / totalPrice (tùy Model C# của bạn)
        orderDate: new Date().toISOString(),
        status: "Chờ xử lý",

        // Mảng chi tiết hóa đơn (Các món trong giỏ)
        orderDetails: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
        })),

        // Dành cho Custom Cake (Nếu Backend của bạn có các trường này)
        isCustom: isCustom,
        customType: isCustom ? document.getElementById('customLoaiYeuCau').value : null,
        // (Bạn có thể map thêm customKichThuoc, customMauSac nếu trong DB có chỗ chứa)
    };

    // 3. Gọi API (POST nếu Tạo mới, PUT nếu Cập nhật)
    try {
        const method = editOrderId ? 'PUT' : 'POST';
        const url = editOrderId ? `${ORDER_API}/${editOrderId}` : ORDER_API;

        if (editOrderId) orderPayload.orderId = parseInt(editOrderId);

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        if (response.ok) {
            alert(editOrderId ? "✅ Cập nhật đơn hàng thành công!" : "✅ Đã tạo đơn hàng mới!");
            window.location.href = "list-order.html"; // Chuyển về danh sách
        } else {
            alert("❌ Lỗi API! Vui lòng kiểm tra lại cấu trúc Database (F12 để xem lỗi chi tiết).");
        }
    } catch (error) {
        console.error("Lỗi:", error);
    }
}

// ==========================================
// CHẾ ĐỘ SỬA: LẤY DỮ LIỆU ĐƠN CŨ ĐIỀN VÀO FORM
// ==========================================
async function loadOrderForEdit(id) {
    try {
        const res = await fetch(`${ORDER_API}/${id}`);
        if (!res.ok) return;
        const order = await res.json();

        document.getElementById('tenNguoiNhan').value = order.shippingName || (order.customer ? order.customer.customerName : '');
        document.getElementById('sdtNguoiNhan').value = order.shippingPhone || (order.customer ? order.customer.phone : '');
        document.getElementById('diaChiGiao').value = order.shippingAddress || (order.customer ? order.customer.address : '');

        // Set khách hàng
        if (order.customerId) {
            if ($) $('#selectKhachHang').val(order.customerId).trigger('change');
            else document.getElementById('selectKhachHang').value = order.customerId;
        }

        // Tải Giỏ hàng cũ
        if (order.orderDetails && order.orderDetails.length > 0) {
            cartItems = order.orderDetails.map(detail => ({
                productId: detail.productId,
                productName: detail.product ? detail.product.productName : `Mã SP: ${detail.productId}`,
                quantity: detail.quantity,
                unitPrice: detail.unitPrice || detail.price || 0
            }));
            renderCart();
        }

        // Tải thông tin bánh Custom (Nếu có)
        const isCustom = order.isCustom || (order.customBuildId != null);
        if (isCustom) {
            document.getElementById('checkIsCustomOrder').checked = true;
            document.getElementById('formCustomOrderFields').style.display = 'block';
            document.getElementById('customBaoGia').value = (order.totalAmount || order.totalPrice || 0) - (cartItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0));
            // Tải thêm các trường khác nếu Database hỗ trợ...
        }

    } catch (e) { console.error("Lỗi tải thông tin đơn hàng cũ", e); }
}

// Hàm giả lập chức năng Upload Ảnh cho bánh Custom
function uploadFileTuDong() {
    document.getElementById('uploadStatus').innerText = "Đang tải ảnh lên ổ đĩa ảo...";
    setTimeout(() => { document.getElementById('uploadStatus').innerText = "Tải lên thành công! (Dữ liệu Demo)"; }, 1000);
}