const fs = require('fs');
const file = 'public/phongtranh3dmoi/Phòng tranh 3dmoi.html';

try {
    let content = fs.readFileSync(file, 'utf8');

    // Nếu chưa inject thì mới inject
    if (!content.includes('style-hide-copyright')) {
        const injectedStylesAndScripts = `
        <style id="style-hide-copyright">
            /* Ẩn triệt để nút Load File và các dòng chứa bản quyền bằng CSS nội suy ngay lập tức */
            div:has(> span:contains("User:")),
            div:has(> span:contains("Nestora")),
            button:has(> span:contains("LOAD FILE")),
            [class*="footer"],
            footer {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                position: absolute !important;
                z-index: -9999 !important;
                height: 0 !important;
                width: 0 !important;
                overflow: hidden !important;
            }
        </style>
        <script>
            // Chạy ngay từ lúc DOM chưa load xong để chặn hiển thị (chống chớp hình ảnh)
            const preventFlash = () => {
                document.querySelectorAll('div, span, button, a').forEach(el => {
                    const txt = (el.innerText || el.textContent || '').toUpperCase();
                    if (txt.includes('BẢN QUYỀN') || txt.includes('NESTORA') || txt.includes('- 1.0.34') || txt.includes('LOAD FILE') || txt.includes('USER:')) {
                        el.style.setProperty('display', 'none', 'important');
                        if (el.parentElement) el.parentElement.style.setProperty('display', 'none', 'important');
                    }
                });
            };
            
            // Theo dõi liên tục ngay lúc tạo DOM
            const ob = new MutationObserver(preventFlash);
            ob.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
            
            // Hỗ trợ thêm
            window.addEventListener('DOMContentLoaded', preventFlash);
        </script>`;

        // Chèn vào đầu body (nếu có thẻ body), nếu không có thì chèn vào đầu chuỗi script hoặc nối vào đuôi
        if (content.includes('<body')) {
            content = content.replace(/(<body[^>]*>)/i, '$1' + injectedStylesAndScripts);
        } else if (content.includes('</head>')) {
            content = content.replace('</head>', injectedStylesAndScripts + '</head>');
        } else {
            content = content + injectedStylesAndScripts; // Fallback
        }

        fs.writeFileSync(file, content, 'utf8');
        console.log('Đã chèn CSS và JS trực tiếp vào file HTML thành công!');
    } else {
        console.log('Mã đã được chèn từ trước.');
    }
} catch (e) {
    console.error('Lỗi khi xử lý file:', e);
}
