const fs = require('fs');
const filePath = 'Phòng tranh 3dmoi.html';
let html = fs.readFileSync(filePath, 'utf8');

const customCssAndJs = `
<style>
/* === GIAO DIỆN TÙY CHỈNH CHO MÀN HÌNH CHÍNH === */
body, html, #root {
    background: linear-gradient(135deg, #0f0225 0%, #1a0533 50%, #0d1060 100%) !important;
    color: white !important;
}

/* Ẩn các nút "LOAD FILE" */
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
setInterval(() => {
    const buttons = document.querySelectorAll('button, a, div[role="button"]');
    buttons.forEach(btn => {
        if (btn.innerText && btn.innerText.toLowerCase().includes('load file')) {
            btn.style.display = 'none';
        }
        if (btn.innerText && btn.innerText.toLowerCase().includes('tạo phòng')) {
            btn.style.background = 'linear-gradient(90deg, #7c3aed, #db2777)';
            btn.style.border = 'none';
            btn.style.color = '#fff';
        }
    });
    
    const headings = document.querySelectorAll('h1, h2');
    headings.forEach(h => {
        if (h.innerText && h.innerText.includes('PHÒNG TRƯNG BÀY')) {
            h.style.color = '#fff';
        }
    });
}, 500);
</script>
`;

if (!html.includes('<!--CUSTOM_INJECTED_CODE-->')) {
    html = html.replace('</head>', `<!--CUSTOM_INJECTED_CODE-->\n${customCssAndJs}\n</head>`);
    fs.writeFileSync(filePath, html);
    console.log("Thanh cong: Da chen CSS va JS tuy chinh an nut Load File va doi mau nen!");
} else {
    // Nếu đã tiêm rồi thì thay thế nội dung cũ
    const regex = /<!--CUSTOM_INJECTED_CODE-->[\s\S]*?<\/script>/;
    html = html.replace(regex, `<!--CUSTOM_INJECTED_CODE-->\n${customCssAndJs}`);
    fs.writeFileSync(filePath, html);
    console.log("Thanh cong: Da cap nhat CSS/JS tuy chinh moi!");
}
