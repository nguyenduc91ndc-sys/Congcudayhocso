# Firebase phụ cho Lớp Hạnh Phúc

Giao diện chạy trong GIAOVIENCN. Firebase `lop-hanh-phuc-c57b3` chỉ lưu bản dữ liệu tối thiểu đã xuất bản cho phụ huynh; không dùng để thay Firebase mặc định của GIAOVIENCN.

## Phân chia dữ liệu

- Lưu tại trình duyệt: danh sách lớp đầy đủ, lịch sử cộng/trừ điểm, tuần/tháng, vòng quay, âm thanh, phần thưởng, cấu hình và bản sao Excel/JSON.
- Lưu ở Firebase phụ: trạng thái cổng, thông tin lớp/tuần cần hiển thị, ảnh đại diện đã nén, điểm/chuyên cần và tối đa 4 ghi nhận gần nhất của từng học sinh.
- Phản hồi phụ huynh: gửi qua Google Apps Script của giáo viên, không dùng Cloud Functions.

## Triển khai quy tắc Firestore

Đăng nhập Firebase CLI bằng đúng tài khoản sở hữu dự án rồi chạy tại thư mục này:

```powershell
npx firebase-tools login
npx firebase-tools deploy --project lop-hanh-phuc-c57b3 --config firebase.happy-class.json --only firestore
```

Lệnh trên chỉ triển khai quy tắc và chỉ mục cho Firebase phụ, không triển khai Hosting và không thay cấu hình Firebase chính.

Trong Firebase Authentication > Settings > Authorized domains, thêm tên miền đang chạy GIAOVIENCN để cửa sổ đăng nhập Google hoạt động trên bản thật.

## Cấp quyền giáo viên và giới hạn thiết bị

Tab **Lớp Hạnh Phúc** trong Admin GIAOVIENCN ghi dữ liệu vào collection `happyClassAccess` của Firebase phụ. Mỗi document dùng email Google viết thường làm mã và chỉ lưu thông tin cấp quyền cùng tối đa hai mã cài đặt trình duyệt.

Để phiên Google của GIAOVIENCN được dùng lại mà không bắt giáo viên đăng nhập lần hai, vào:

1. Firebase Console > Authentication > Phương thức đăng nhập > Google.
2. Mở **Danh sách an toàn ID máy khách từ các dự án bên ngoài**.
3. Thêm OAuth Client ID của GIAOVIENCN:

```text
270974453484-vpsgvnih68hcmuhm8nn358pok8335e4a.apps.googleusercontent.com
```

Sau khi sửa `happy-class.firestore.rules`, cần chạy lại lệnh deploy Firestore ở trên. Nếu chưa deploy, tab Admin sẽ báo Firebase từ chối quyền và giáo viên chưa thể đăng ký thiết bị.

Firebase CLI trên máy hiện cần đăng nhập trước bằng tài khoản sở hữu dự án:

```powershell
npx firebase-tools login
```
