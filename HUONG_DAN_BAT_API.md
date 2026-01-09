# Hướng Dẫn Cấu Hình Google Picker API

Để tính năng "Chọn từ Google Sheets" hoạt động, bạn cần **Bật API** theo các bước sau (chỉ làm 1 lần):

## Bước 1: Truy cập trang quản lý dự án
1. Vào đường link này: [https://console.cloud.google.com/apis/library/picker.googleapis.com?project=giaoviencongnghe-3c2a9](https://console.cloud.google.com/apis/library/picker.googleapis.com?project=giaoviencongnghe-3c2a9)
   *(Link này sẽ đưa bạn thẳng đến trang nút Bật của dự án `giaoviencongnghe-3c2a9`)*.

## Bước 2: Bật API
1. Bạn sẽ thấy biểu tượng **Google Picker API**.
2. Bấm vào nút **ENABLE** (màu xanh dương).
3. Đợi vài giây để hệ thống xử lý.

## Bước 3: Kiểm tra
1. Quay lại trang Game (Lucky Wheel).
2. Tải lại trang (F5).
3. Bấm vào nút **"Chọn từ Google Sheets"**.
4. Đăng nhập tài khoản Google của bạn và cấp quyền.
5. Bảng chọn file sẽ hiện ra!

---
> [!NOTE]
> **Lưu ý:** Nếu vẫn báo lỗi 403, hãy đảm bảo tài khoản Gmail bạn đang dùng để test đã được thêm vào danh sách "Test users" trong phần **OAuth consent screen** (vì app đang ở chế độ Testing).
