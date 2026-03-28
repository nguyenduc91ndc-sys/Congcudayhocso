const fs = require('fs');
const filePath = 'Phòng tranh 3dmoi.html';
let html = fs.readFileSync(filePath, 'utf8');

// 1. Tìm chính xác các chuỗi text nằm trong file nén (JavaScript)
// Nút "TẠO PHÒNG TRƯNG BÀY MỚI" -> Cứ để nguyên
// Nút "LOAD FILE PHÒNG TRƯNG BÀY CÓ SẴN" -> Đổi thành "" hoặc xóa element React, 
// Tuy nhiên cách dễ nhất để xóa khỏi DOM là dùng CSS tiêm vào. Để lấy được CSS chọn lọc,
// mình sẽ làm mờ/kiểm soát bằng đoạn script nhỏ kèm thẻ style.

const customCssAndJs = `
<style>
/* === GIAO DIỆN TÙY CHỈNH CHO MÀN HÌNH CHÍNH === */
/* Thay đổi toàn bộ nền thành gradient vũ trụ/nghệ thuật thay vì nền trắng gốc */
body, html, #root {
    background: linear-gradient(135deg, #0f0225 0%, #1a0533 50%, #0d1060 100%) !important;
    color: white !important;
}

/* Ẩn các nút "LOAD FILE" (Dùng JavaScript bên dưới để xử lý triệt để hơn) */
.hidden-custom-btn {
    display: none !important;
}

/* Làm đẹp nút Tạo Mới (Nút còn lại duy nhất) */
button {
    border-radius: 12px !important;
    text-transform: uppercase !important;
    font-weight: bold !important;
    letter-spacing: 1px !important;
    box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4) !important;
}

/* Đổi lại màu của chữ lớn "PHÒNG TRƯNG BÀY 3D" để hợp với nền tối */
h1, h2, h3 {
    text-shadow: 0px 4px 20px rgba(255, 255, 255, 0.2) !important;
}
</style>

<script>
// Script chạy ngầm để liên tục rà soát và ẩn đi Nút "LOAD FILE" 
// (Vì React render động nên CSS cứng có thể không bắt được class sinh ngẫu nhiên)
setInterval(() => {
    const buttons = document.querySelectorAll('button, a, div[role="button"]');
    buttons.forEach(btn => {
        if (btn.innerText && btn.innerText.toLowerCase().includes('load file')) {
            btn.style.display = 'none';
        }
        // Thêm hiệu ứng cho nút tạo mới
        if (btn.innerText && btn.innerText.toLowerCase().includes('tạo phòng')) {
            btn.style.background = 'linear-gradient(90deg, #7c3aed, #db2777)';
            btn.style.border = 'none';
            btn.style.color = '#fff';
        }
    });
    
    // Đổi chữ title nếu tìm thấy title gốc
    const headings = document.querySelectorAll('h1, h2');
    headings.forEach(h => {
        if (h.innerText && h.innerText.includes('PHÒNG TRƯNG BÀY')) {
            h.style.color = '#fff'; // Sửa chữ thành trắng/sáng
        }
    });
}, 500);
</script>
`;

if (!html.includes('<!--CUSTOM_INJECTED_CODE-->')) {
    html = html.replace('</head>', `<!--CUSTOM_INJECTED_CODE-->\n${customCssAndJs}\n</head>`);
    fs.writeFileSync(filePath, html);
    console.log("Thành công: Đã chèn CSS và JS tùy chỉnh ẩn nút Load File và đổi màu nền!");
} else {
    // Nếu đã tiêm rồi thì thay thế nội dung cũ
    const regex = /<!--CUSTOM_INJECTED_CODE-->[\s\S]*?<\/script>/;
    html = html.replace(regex, `<!--CUSTOM_INJECTED_CODE-->\n${customCssAndJs}`);
    fs.writeFileSync(filePath, html);
    console.log("Thành công: Đã cập nhật CSS/JS tùy chỉnh mới!");
}
