/* =============================================
   CERTIFICATE - CHỨNG CHỈ HOÀN THÀNH
   Tạo và tải chứng chỉ dạng ảnh
   ============================================= */

class CertificateGenerator {
    constructor() {
        this.createUI();
        this.setupEventListeners();
    }

    createUI() {
        const container = document.createElement('div');
        container.id = 'certificate-container';

        container.innerHTML = `
            <!-- Nút mở chứng chỉ (ẩn mặc định) -->
            <button id="cert-toggle" class="cert-toggle hidden" title="Nhận chứng chỉ">
                🎓
            </button>

            <!-- Modal Chứng Chỉ -->
            <div id="cert-modal" class="cert-modal hidden">
                <div class="cert-content">
                    <button id="cert-close" class="cert-close">✕</button>
                    
                    <div class="cert-input-step" id="cert-input-step">
                        <h2 data-i18n="certificate_title">🎓 Chứng Chỉ Hoàn Thành</h2>
                        <p>Chúc mừng bạn đã hoàn thành chuyến tham quan!</p>
                        <p>Vui lòng nhập tên để in lên chứng chỉ:</p>
                        <input type="text" id="cert-name-input" placeholder="Nhập họ và tên..." maxlength="30" data-i18n="cert_name_placeholder">
                        <button id="cert-generate-btn" class="btn-generate" data-i18n="cert_generate">Tạo Chứng Chỉ</button>
                    </div>

                    <div class="cert-preview-step hidden" id="cert-preview-step">
                        <!-- Vùng hiển thị chứng chỉ để chụp -->
                        <div id="certificate-canvas" class="certificate-canvas">
                            <div class="cert-frame">
                                <div class="cert-header">
                                    <div class="cert-logo">🏮</div>
                                    <h1>CHỨNG NHẬN</h1>
                                    <p class="cert-subtitle">HOÀN THÀNH CHUYẾN THAM QUAN</p>
                                </div>
                                <div class="cert-body">
                                    <p>Chứng nhận em:</p>
                                    <h2 id="cert-student-name">NGUYỄN VĂN A</h2>
                                    <p>Đã xuất sắc hoàn thành chuyến tham quan và tìm hiểu về</p>
                                    <h3>DI TÍCH LỊCH SỬ ĐỀN HÙNG</h3>
                                    <p>Và đạt thành tích ấn tượng trong phần thi kiến thức.</p>
                                </div>
                                <div class="cert-footer">
                                    <div class="cert-date">
                                        <p>Ngày ...... tháng ...... năm ......</p>
                                        <p id="cert-date-text">20/05/2025</p>
                                    </div>
                                    <div class="cert-seal">
                                        <div class="seal-icon">🏛️</div>
                                        <p>Đền Hùng 3D</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="cert-actions">
                            <button id="cert-download-btn" class="btn-download" data-i18n="cert_download">💾 Tải về máy</button>
                            <button id="cert-back-btn" class="btn-back" data-i18n="cert_back">← Nhập lại tên</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    setupEventListeners() {
        const toggle = document.getElementById('cert-toggle');
        const modal = document.getElementById('cert-modal');
        const close = document.getElementById('cert-close');

        toggle.addEventListener('click', () => modal.classList.remove('hidden'));
        close.addEventListener('click', () => modal.classList.add('hidden'));

        document.getElementById('cert-generate-btn').addEventListener('click', () => this.generateCertificate());
        document.getElementById('cert-back-btn').addEventListener('click', () => this.showInputStep());
        document.getElementById('cert-download-btn').addEventListener('click', () => this.downloadCertificate());

        document.getElementById('cert-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.generateCertificate();
        });
    }

    showButton() {
        document.getElementById('cert-toggle').classList.remove('hidden');
    }

    showInputStep() {
        document.getElementById('cert-input-step').classList.remove('hidden');
        document.getElementById('cert-preview-step').classList.add('hidden');
    }

    generateCertificate() {
        const name = document.getElementById('cert-name-input').value.trim();
        if (!name) {
            alert('Vui lòng nhập tên của bạn!');
            return;
        }

        document.getElementById('cert-student-name').textContent = name.toUpperCase();

        const now = new Date();
        document.getElementById('cert-date-text').textContent = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

        document.getElementById('cert-input-step').classList.add('hidden');
        document.getElementById('cert-preview-step').classList.remove('hidden');
    }

    downloadCertificate() {
        const element = document.getElementById('certificate-canvas');
        const btn = document.getElementById('cert-download-btn');

        btn.textContent = '⏳ Đang xử lý...';
        btn.disabled = true;

        html2canvas(element, {
            scale: 2, // Tăng chất lượng ảnh
            useCORS: true,
            backgroundColor: null
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Chung-Chi-Den-Hung-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            btn.textContent = '💾 Tải về máy';
            btn.disabled = false;
        }).catch(err => {
            console.error('Lỗi khi tạo ảnh:', err);
            alert('Có lỗi xảy ra khi tạo chứng chỉ. Vui lòng thử lại!');
            btn.textContent = '💾 Tải về máy';
            btn.disabled = false;
        });
    }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    window.certificate = new CertificateGenerator();
});
