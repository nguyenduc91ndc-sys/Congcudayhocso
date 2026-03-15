CÀI EXTENSION
1) Chrome -> chrome://extensions
2) Bật Developer mode
3) Load unpacked -> chọn thư mục giải nén
4) Bấm Options để cấu hình

BANK MODE
- Tạo Google Sheet chứa sheet BANK (có cột 'Mã chuẩn' và 'Nội dung')
- Apps Script: dán code trong APPS_SCRIPT_CODE.txt
- Deploy Web app, lấy URL, đặt API_KEY
- Trong Options: nhập URL + key, bấm Test kết nối

AI MODE
- Nhập endpoint OpenAI-compatible + API key + model
- Bấm Test AI

LƯU Ý
- Extension chạy mọi domain, nhưng chỉ tự kích hoạt khi phát hiện đúng giao diện đánh giá.
- Nhận xét auto không ghi đè nếu đã gõ tay.


V1.1.0
- Thêm quy tắc điểm→T/H/C tuỳ biến (Options)
- Khi sửa mức (T/H/C) bằng tay, nhận xét tự đổi theo mức
- Thống kê tổng lượt dùng
- Riêng tư: API key có thể lưu theo phiên (session)
- Ủng hộ: cấu hình link/QR hiển thị trong Options


V1.1.1
- QR ủng hộ offline (không dùng dịch vụ ngoài)
- Thống kê lượt dùng hiển thị 1 dòng, không có nút reset
- Riêng tư API: bật lưu local, tắt lưu session (đóng Chrome là mất)


V1.1.2
- Đặt mặc định BANK URL trong code: https://script.google.com/macros/s/AKfycbwrcUoeeHqp4iT4bYwv89nMozwUCSpZhb0DKgCvE6tuCGoS2J5xBsY0Ue9C_Gu_ckTnqA/exec
- Mode mặc định: BANK
- Có sẵn BANK key mặc định (có thể đổi trong Options)


V1.2.0
- Sửa lỗi đổi môn (dropdown): tự bind lại và lấy đúng ô nhận xét
- NL/PC dùng ký hiệu Đ (chấp nhận D nhập tay)
- Popup bỏ Refresh BANK, thêm QR ủng hộ + tổng lượt dùng
- Options gọn hơn: bỏ cấu hình BANK URL/key và phần QR


V1.2.1
- Bổ sung map môn cho dropdown khối 3-5: Ngoại ngữ, TH-CN (Tin học/Công nghệ)
- Tăng độ chắc chắn khi nhận diện môn Ngoại ngữ


V1.2.2
- Nhúng sẵn QR ủng hộ (offline) theo VietQR payload


V1.2.3
- Chuẩn hoá mã môn: Toán=TOAN, Hoạt động trải nghiệm=HDTN, Tin học=TIN, Công nghệ=CN
- Popup đổi sang 'Liên hệ tác giả' + QR Zalo (offline) + hiển thị Mr.Thuật


V1.2.4
- Nhúng sẵn QR Zalo liên hệ: https://zalo.me/0948849980


V1.2.5
- Sửa nhận diện Thời điểm đánh giá: hỗ trợ HK I/II, 1/2, và số La Mã unicode (Ⅰ/Ⅱ); 'Cuối năm học' => CK2


V1.2.6
- Hỗ trợ cột Điểm KTĐK: bắt selector txtDIEM_KTDK_* và tự suy ra mức + nhận xét
- Selector môn học dùng chung (scoreAny/levelAny/remarkAny) để chạy đúng cho GK/CK/HK và các khối 1-5


V1.2.7
- Chọn đúng ô theo kỳ (GK/CK) khi trang có cả 2 cột Mức đạt được
- Hỗ trợ nội dung nhận xét dạng input/textarea


V1.2.8
- Sửa thống kê lượt dùng (delta totalFills/totalAiCalls/totalBankHits) sau khi cập nhật logic CK/GK


V1.2.9
- Popup: bỏ QR, đưa 'Tổng số lượt dùng' ngay dưới nút Mở cài đặt
- Liên hệ tác giả: Mr.Thuật · Zalo 0948849980 · Email qvthuat@c1halang.edu.vn


V1.3.0
- Tối ưu khi gõ: debounce theo hàng + chống event vòng lặp (tt27Prog)
- Sticky 1.5s để tránh 'chạy 1-2 câu nhận xét rồi mới dừng'


V1.3.1
- Sticky chọn nhận xét chỉ áp dụng trong cùng 1 học sinh (theo row), tránh bị trùng giữa các em khi nhập nhanh


V1.3.2
- Sửa Options: bấm chọn BANK/AI hoạt động, lưu đúng chế độ
- Lưu API key theo đúng setting privacy.rememberApiKey (tương thích bản cũ)
- Thêm bộ icon/logo cho tiện ích


V1.4.3
- Cài xong mặc định tắt (người dùng tự bật)
- Popup: Developed by Q.V. Thuat + email dạng monospace


--- SERVER BANK + STATS (ĐÃ TÍCH HỢP SẴN) ---
WebApp URL: https://script.google.com/macros/s/AKfycbyHi4M7qcEBVf7Vy8joFbK4bdZFdTqwlUk6-meOoGCrW6Rp-90bBkBdpD9UZ0LQ3LpvvQ/exec
API Key: HL_TT27_BANK_2026_QVThuat_9f3c2a7d1b6e4f8a_61C7C0A2

- BANK:  GET ?key=API_KEY
- STATS: GET ?action=stats&key=API_KEY
- HIT:   POST ?action=hit&key=API_KEY
