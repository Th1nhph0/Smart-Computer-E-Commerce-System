let currentPhone = "";
let mockOtpCode = "";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("step1Form").addEventListener("submit", sendOTP);
    document.getElementById("step2Form").addEventListener("submit", verifyOTP);
    document.getElementById("step3Form").addEventListener("submit", resetPassword);
});

// BƯỚC 1: GỬI OTP (GIẢ LẬP)
function sendOTP(e) {
    e.preventDefault();
    currentPhone = document.getElementById("phoneInput").value.trim();

    // Sinh mã OTP ngẫu nhiên 6 số
    mockOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 📱 ĐÂY LÀ ĐIỂM NHẤN CHO ĐỒ ÁN: Hiện popup giả lập màn hình điện thoại
    alert(`📱 TING TING!\n\n[HỆ THỐNG SMS GATEWAY MÔ PHỎNG]\nThuê bao ${currentPhone} vừa nhận tin nhắn:\n"Ma xac thuc SmartComputer cua ban la ${mockOtpCode}. Vui long khong chia se cho ai."`);

    // Chuyển giao diện sang Bước 2
    document.getElementById("step1Form").style.display = "none";
    document.getElementById("step2Form").style.display = "block";
    document.getElementById("stepDescription").innerText = "Vui lòng nhập mã OTP gồm 6 chữ số.";
}

// BƯỚC 2: KIỂM TRA MÃ OTP
function verifyOTP(e) {
    e.preventDefault();
    const inputOtp = document.getElementById("otpInput").value.trim();

    if (inputOtp === mockOtpCode) {
        // Chuyển giao diện sang Bước 3
        document.getElementById("step2Form").style.display = "none";
        document.getElementById("step3Form").style.display = "block";
        document.getElementById("stepDescription").innerHTML = "<span class='text-success fw-bold'>Xác thực thành công!</span> Vui lòng đặt mật khẩu mới.";
    } else {
        alert("❌ Mã OTP không chính xác! Vui lòng kiểm tra lại.");
    }
}

// BƯỚC 3: GỌI API LƯU MẬT KHẨU
async function resetPassword(e) {
    e.preventDefault();
    const newPass = document.getElementById("newPassword").value;

    try {
        const res = await fetch(`${API_URL}/api/Accounts/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Phone: currentPhone, NewPassword: newPass })
        });

        if (res.ok) {
            alert("✅ Đổi mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.");
            window.location.href = "auth-login-basic.html";
        } else {
            alert("Lỗi: Số điện thoại chưa được đăng ký trong hệ thống!");
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối máy chủ API!");
    }
}