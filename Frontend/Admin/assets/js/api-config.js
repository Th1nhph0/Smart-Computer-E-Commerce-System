const API_URL = "https://localhost:7068";
// Keep authentication handling in one place so existing Admin requests keep
// working without duplicating Authorization headers throughout every page.
(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const url = typeof input === 'string' ? input : input.url;
        const token = localStorage.getItem('accessToken');
        if (!token || !url.startsWith(API_URL)) return nativeFetch(input, init);

        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        headers.set('Authorization', `Bearer ${token}`);
        return nativeFetch(input, { ...init, headers });
    };
})();
