# Gui bao cao ket qua ve Gmail bang Google Apps Script

Muc tieu: hoc sinh mo file ZIP, bam `Xuat thu khen`, he thong tu gui bao cao ve Gmail giao vien. Hoc sinh khong can dang nhap Gmail.

## 1. Tao Google Apps Script

1. Vao `https://script.google.com`.
2. Bam `New project`.
3. Xoa code cu trong file `Code.gs`.
4. Copy toan bo noi dung file `google-apps-script/send-result-report.gs` trong du an nay va dan vao `Code.gs`.
5. Bam `Save`.

Ma Apps Script trong file `google-apps-script/send-result-report.gs` dung chung cho moi giao vien. Chi can copy mot lan, moi giao vien deploy bang Gmail cua minh.

## 2. Deploy Web App

1. Bam `Deploy` -> `New deployment`.
2. Chon loai `Web app`.
3. `Execute as`: chon `Me`.
4. `Who has access`: chon `Anyone`.
5. Bam `Deploy`.
6. Lan dau Google se hoi quyen gui Gmail, bam cho phep.
7. Copy link `Web app URL`.

## 3. Dan link vao bai giang

Trong phan tuy chinh video tuong tac:

1. Nhap `Gmail nhan bao cao`.
2. Dan link Web App vao o `Link Apps Script gui bao cao`.
3. Bam `Gui thu`.
4. Neu nhan duoc email thu, xuat ZIP lai.

Voi cach nay, file ZIP co internet se goi truc tiep Google Apps Script. Hoc sinh khong can dang nhap Gmail.

Neu muon cau hinh tren server thay vi dan vao tung bai, co the dung bien moi truong:

```text
REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

## 4. Kiem tra

Mo file ZIP tren may co internet, hoan thanh bai hoc, bam `Xuat thu khen`. Bao cao se duoc gui ve Gmail da nhap trong phan tuy chinh.
