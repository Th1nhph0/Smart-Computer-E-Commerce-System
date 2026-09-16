async function handleLogin(event) {
    event.preventDefault(); // Chặn hành vi load lại trang

    // 1. Kiểm tra xem file api-config.js có bị lỗi không
    if (typeof API_URL === 'undefined') {
        alert("❌ LỖI NGHIÊM TRỌNG: Chưa có biến API_URL!\nHãy kiểm tra lại file api-config.js xem đã khai báo chưa.");
        return;
    }

    // 2. Lấy dữ liệu từ ô nhập
    const inputValue = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!inputValue || !password) {
        alert("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");
        return;
    }

    try {
        console.log("Đang gửi request tới:", `${API_URL}/api/Accounts/login`);

        // 3. Gọi API (Chú ý biến gửi đi phải tên là "username" để C# hiểu được)
        const response = await fetch(`${API_URL}/api/Accounts/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: inputValue, password: password })
        });

        // 4. Xử lý kết quả trả về
        if (response.ok) {
            const accountData = await response.json();

            // Xóa rác cũ và lưu dữ liệu mới vào Trình duyệt
            localStorage.clear();
            localStorage.setItem('userId', accountData.accountId || accountData.id);
            localStorage.setItem('userName', accountData.username || accountData.email || 'Admin');
            localStorage.setItem('userRole', 'Admin');

            // Chuyển trang
            window.location.href = 'index.html';
        } else {
            // Lấy thông báo lỗi từ C# (nếu có)
            const errorData = await response.json().catch(() => ({}));
            alert("❌ Đăng nhập thất bại: " + (errorData.message || "Sai tài khoản hoặc mật khẩu"));
        }
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        alert("❌ LỖI KẾT NỐI API!\n- Backend C# đã chạy chưa?\n- Có bị lỗi CORS không?\n(Nhấn F12 sang tab Console để xem chi tiết)");
    }
}

// 5. Gắn sự kiện khi web vừa tải xong
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('formAuthentication');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error("Lỗi: Không tìm thấy thẻ form có id='formAuthentication'");
    }
});