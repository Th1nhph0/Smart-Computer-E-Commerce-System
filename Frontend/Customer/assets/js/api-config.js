const API_URL = "http://localhost:5076";

// Xử lý tự động đính kèm Token (Authorization) cho các chức năng cần bảo mật
// (Ví dụ: Đặt hàng, Xem lịch sử mua hàng, Đổi mật khẩu...)
(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const url = typeof input === 'string' ? input : input.url;

        // Lưu ý: Bên Customer bạn đang dùng sessionStorage để lưu token
        const token = sessionStorage.getItem('accessToken');

        // Nếu không có token hoặc đang gọi link ngoài API của hệ thống thì gọi bình thường
        if (!token || !url.startsWith(API_URL)) {
            return nativeFetch(input, init);
        }

        // Tự động nhét thêm thẻ vé (Bearer Token) vào header
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        headers.set('Authorization', `Bearer ${token}`);

        return nativeFetch(input, { ...init, headers });
    };
})();