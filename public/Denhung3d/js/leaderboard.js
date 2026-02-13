/* =============================================
   LEADERBOARD - BẢNG XẾP HẠNG ĐIỂM CAO
   Lưu trữ với localStorage
   ============================================= */

class Leaderboard {
    constructor() {
        this.storageKey = 'denhung_leaderboard';
        this.maxEntries = 10;
        this.isOpen = false;

        this.createUI();
        this.setupEventListeners();
    }

    // Tạo giao diện Bảng Xếp Hạng
    createUI() {
        const container = document.createElement('div');
        container.id = 'leaderboard-container';
        container.innerHTML = `

            
            <!-- Modal Bảng Xếp Hạng -->
            <div id="leaderboard-modal" class="leaderboard-modal hidden">
                <div class="leaderboard-content">
                    <div class="leaderboard-header">
                        <h2 data-i18n="leaderboard_title">🏆 Bảng Xếp Hạng</h2>
                        <button id="leaderboard-close" class="leaderboard-close">✕</button>
                    </div>
                    
                    <div class="leaderboard-body">
                        <table class="leaderboard-table">
                            <thead>
                                <tr>
                                    <th>Hạng</th>
                                    <th>Tên</th>
                                    <th>Điểm</th>
                                    <th>Ngày</th>
                                </tr>
                            </thead>
                            <tbody id="leaderboard-tbody">
                                <!-- Rows will be generated here -->
                            </tbody>
                        </table>
                        
                        <div id="leaderboard-empty" class="leaderboard-empty hidden">
                            <p>📭 Chưa có điểm nào!</p>
                            <p>Hãy làm quiz để ghi điểm nhé!</p>
                        </div>
                    </div>
                    
                    <div class="leaderboard-footer">
                        <button id="leaderboard-clear" class="btn-clear">🗑️ Xóa tất cả</button>
                    </div>
                </div>
            </div>
            
            <!-- Form Nhập Tên khi đạt điểm cao -->
            <div id="highscore-modal" class="highscore-modal hidden">
                <div class="highscore-content">
                    <div class="highscore-badge">🎉</div>
                    <h3>Chúc mừng!</h3>
                    <p>Bạn đạt <span id="highscore-points">0</span> điểm!</p>
                    <input type="text" id="highscore-name" placeholder="Nhập tên của bạn..." maxlength="20">
                    <div class="highscore-buttons">
                        <button id="highscore-save" class="btn-save">💾 Lưu điểm</button>
                        <button id="highscore-skip" class="btn-skip">Bỏ qua</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    setupEventListeners() {

        document.getElementById('leaderboard-close').addEventListener('click', () => this.close());

        // Xóa tất cả
        document.getElementById('leaderboard-clear').addEventListener('click', () => this.clearAll());

        // Highscore form
        document.getElementById('highscore-save').addEventListener('click', () => this.saveHighscore());
        document.getElementById('highscore-skip').addEventListener('click', () => this.closeHighscoreModal());

        // Enter để save
        document.getElementById('highscore-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveHighscore();
        });
    }

    // Mở/đóng bảng xếp hạng
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.render();
        document.getElementById('leaderboard-modal').classList.remove('hidden');
    }

    close() {
        this.isOpen = false;
        document.getElementById('leaderboard-modal').classList.add('hidden');
    }

    // Lấy dữ liệu từ localStorage
    getData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Lỗi đọc leaderboard:', e);
            return [];
        }
    }

    // Lưu dữ liệu vào localStorage
    saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('Lỗi lưu leaderboard:', e);
        }
    }

    // Thêm điểm mới
    addScore(name, score) {
        const data = this.getData();
        const now = new Date();

        data.push({
            name: name.trim() || 'Khách',
            score: score,
            date: now.toLocaleDateString('vi-VN')
        });

        // Sắp xếp theo điểm giảm dần
        data.sort((a, b) => b.score - a.score);

        // Giữ top N
        const trimmed = data.slice(0, this.maxEntries);

        this.saveData(trimmed);
        return trimmed;
    }

    // Kiểm tra có phải điểm cao không
    isHighScore(score) {
        if (score <= 0) return false;

        const data = this.getData();
        if (data.length < this.maxEntries) return true;

        const lowestScore = data[data.length - 1]?.score || 0;
        return score > lowestScore;
    }

    // Hiển thị modal nhập tên
    showHighscoreModal(score) {
        this.pendingScore = score;
        document.getElementById('highscore-points').textContent = score;
        document.getElementById('highscore-name').value = '';
        document.getElementById('highscore-modal').classList.remove('hidden');
        document.getElementById('highscore-name').focus();
    }

    closeHighscoreModal() {
        document.getElementById('highscore-modal').classList.add('hidden');
        this.pendingScore = null;
    }

    saveHighscore() {
        const name = document.getElementById('highscore-name').value;
        if (this.pendingScore) {
            this.addScore(name, this.pendingScore);
        }
        this.closeHighscoreModal();
    }

    // Render bảng xếp hạng
    render() {
        const data = this.getData();
        const tbody = document.getElementById('leaderboard-tbody');
        const emptyMsg = document.getElementById('leaderboard-empty');

        if (data.length === 0) {
            tbody.innerHTML = '';
            emptyMsg.classList.remove('hidden');
            return;
        }

        emptyMsg.classList.add('hidden');

        const medals = ['🥇', '🥈', '🥉'];

        tbody.innerHTML = data.map((entry, index) => `
            <tr class="${index < 3 ? 'top-rank' : ''}">
                <td class="rank">${medals[index] || (index + 1)}</td>
                <td class="name">${this.escapeHtml(entry.name)}</td>
                <td class="score">${entry.score}⭐</td>
                <td class="date">${entry.date}</td>
            </tr>
        `).join('');
    }

    // Xóa tất cả điểm
    clearAll() {
        if (confirm('Bạn có chắc muốn xóa tất cả điểm?')) {
            localStorage.removeItem(this.storageKey);
            this.render();
        }
    }

    // Escape HTML để tránh XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.leaderboard = new Leaderboard();
});
