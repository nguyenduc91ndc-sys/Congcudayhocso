const fs = require('fs');

const targetFile = 'public/phong tranh 3D/virtual-gallery.html';

try {
    let content = fs.readFileSync(targetFile, 'utf8');

    // Only inject if it hasn't been injected yet
    if (!content.includes('gallery-ui-override')) {
        const injectedStylesAndScripts = `
        <style id="gallery-ui-override">
            /* Thay đổi phông chữ và màu nền để tránh bản quyền */
            @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');
            *, body {
                font-family: 'Quicksand', sans-serif !important;
            }
            body {
                background-color: #f7f3ec !important; /* Đổi màu nền sáng nhẹ */
            }

            /* Bo góc lại các phần tử button và thẻ */
            button, .room-card, .preset-card {
                border-radius: 12px !important;
                transition: transform 0.2s;
            }

            /* Khắc phục text mờ đi do bóng đổ */
            h1, h2, h3, h4 {
                text-shadow: none !important;
                color: #d9534f !important; /* Thay màu chữ tiêu đề từ xanh/tím sang đỏ/cam đất */
            }
        </style>
        <script>
            // MutationObserver theo dõi và tìm nút LOAD FILE để ẩn 
            document.addEventListener('DOMContentLoaded', () => {
                let isModified = false;

                const observer = new MutationObserver((mutations) => {
                    const allButtons = document.querySelectorAll('button, div[role="button"]');
                    allButtons.forEach(btn => {
                        const btnText = btn.textContent || btn.innerText || '';

                        // Ẩn nội dung LOAD FILE
                        if (btnText.toUpperCase().includes('LOAD FILE') || btnText.toUpperCase().includes('CÓ SẴN')) {
                            btn.style.setProperty('display', 'none', 'important');
                        }

                        // Đổi màu NÚT TẠO PHÒNG TRƯNG BÀY MỚI (Từ xanh dương sang Cam/Nâu)
                        if (btnText.toUpperCase().includes('TẠO PHÒNG') || btnText.toUpperCase().includes('MỚI')) {
                            btn.style.setProperty('background-color', '#d9534f', 'important');
                            btn.style.setProperty('background', '#d9534f', 'important');
                            btn.style.setProperty('border-color', '#d9534f', 'important');
                            btn.style.setProperty('color', '#ffffff', 'important');
                            btn.style.setProperty('box-shadow', '0 4px 15px rgba(217, 83, 79, 0.4)', 'important');
                        }
                    });
                });

                observer.observe(document.body, { childList: true, subtree: true, attributes: true });
            });
        </script>`;

        content = content + injectedStylesAndScripts;
        fs.writeFileSync(targetFile, content, 'utf8');
        console.log('Đã thay đổi xong HTML của virtual-gallery');
    } else {
        console.log('File đã được thay đổi từ trước.');
    }
} catch (e) {
    console.error('Lỗi: ', e);
}
