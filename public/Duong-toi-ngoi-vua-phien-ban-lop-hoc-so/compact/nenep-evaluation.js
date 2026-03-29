/**
 * Hệ thống Đánh giá Nề nếp học sinh
 * Thay thế câu hỏi trắc nghiệm bằng phiếu đánh giá nề nếp
 * Version 2.0
 */

// ============================================================
// CẤU HÌNH TIÊU CHÍ MẶC ĐỊNH
// ============================================================
const NENEP_DEFAULT_CRITERIA = [
    { id: 'cb', title: 'Chuẩn bị',   desc: 'Em có tự giác soạn sách vở và đồ dùng theo thời khóa biểu không?' },
    { id: 'cc', title: 'Chuyên cần', desc: 'Em có đi học đúng giờ và vào lớp ngay khi có trống báo không?' },
    { id: 'tt', title: 'Trật tự',    desc: 'Trong giờ học, em có giữ im lặng và tập trung nghe cô giảng bài không?' },
    { id: 'pb', title: 'Phát biểu',  desc: 'Em có giơ tay xin phép và đứng nghiêm túc khi phát biểu không?' },
    { id: 'vs', title: 'Vệ sinh',    desc: 'Chỗ ngồi và ngăn bàn của em có luôn sạch sẽ, không có rác không?' },
    { id: 'gg', title: 'Gọn gàng',   desc: 'Em có xếp ghế ngay ngắn và cất đồ dùng cẩn thận trước khi ra về không?' },
    { id: 'lp', title: 'Lễ phép',    desc: 'Em có chủ động chào hỏi thầy cô và người lớn khi gặp mặt không?' },
    { id: 'dk', title: 'Đoàn kết',   desc: 'Em có hòa nhã, không gây mất đoàn kết với bạn bè trong lớp không?' },
];

const NENEP_LEVELS = [
    { label: 'Rất tốt',     value: 4, color: '#059669', bg: '#d1fae5', borderColor: '#6ee7b7' },
    { label: 'Tốt',         value: 3, color: '#2563eb', bg: '#dbeafe', borderColor: '#93c5fd' },
    { label: 'Bình thường', value: 2, color: '#d97706', bg: '#fef3c7', borderColor: '#fcd34d' },
    { label: 'Cần cố gắng', value: 1, color: '#dc2626', bg: '#fee2e2', borderColor: '#fca5a5' },
];

const NENEP_ROLE_INFO = {
    peasant:    { label: 'Dân',       img: 'assets/dan.png',      color: '#6b7280', bg: '#f3f4f6', emoji: '🧑' },
    soldier:    { label: 'Lính',      img: 'assets/linh.png',     color: '#ef4444', bg: '#fee2e2', emoji: '⚔️' },
    officer:    { label: 'Quan',      img: 'assets/quan.png',     color: '#f97316', bg: '#ffedd5', emoji: '🎖️' },
    chancellor: { label: 'Tể Tướng', img: 'assets/tetuong.jpg',  color: '#d97706', bg: '#fef3c7', emoji: '🎩' },
    king:       { label: 'Vua',       img: 'assets/vua.jpg',      color: '#7c3aed', bg: '#ede9fe', emoji: '👑' },
};

// Mốc điểm thăng cấp mới (ghi đè app.js)
const NE_NEW_THRESHOLDS = {
    peasant: 0,
    soldier: 100,
    officer: 300,
    chancellor: 500,
    king: 1000
};

let _neCurrentStudentId = null;

// ============================================================
// HELPERS
// ============================================================
function neGetCriteria() {
    try {
        const s = localStorage.getItem('nenep_criteria');
        if (s) return JSON.parse(s);
    } catch(e) {}
    return NENEP_DEFAULT_CRITERIA;
}
function neSaveCriteria(list) {
    try { localStorage.setItem('nenep_criteria', JSON.stringify(list)); } catch(e) {}
}
function neGetStudents() {
    try { if (typeof window.getCurrentStudents === 'function') return window.getCurrentStudents() || []; } catch(e) {}
    try {
        const cls = JSON.parse(localStorage.getItem('classes') || '[]');
        return cls.length ? (cls[0].students || []) : [];
    } catch(e) { return []; }
}
function neRoleInfo(role) { return NENEP_ROLE_INFO[role] || NENEP_ROLE_INFO.peasant; }

// ============================================================
// CSS
// ============================================================
function neInjectCSS() {
    if (document.getElementById('nenepEvalStyle')) return;
    const s = document.createElement('style');
    s.id = 'nenepEvalStyle';
    s.textContent = `
    /* ===== OVERLAY ===== */
    #nenepEvalModal {
        display: none; position: fixed;
        top:0;left:0;right:0;bottom:0;
        background: rgba(0,0,0,0.6);
        z-index: 10000;
        align-items: center; justify-content: center; padding: 1rem;
        backdrop-filter: blur(4px);
    }
    #nenepEvalModal.ne-show { display: flex; }

    /* ===== CONTAINER ===== */
    .ne-wrap {
        background: #fff; border-radius: 20px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.3);
        width: 100%; max-width: 820px;
        max-height: 92vh; overflow: hidden;
        display: flex; flex-direction: column;
        animation: nePopIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes nePopIn {
        from { transform: scale(0.8) translateY(40px); opacity: 0; }
        to   { transform: scale(1)   translateY(0);    opacity: 1; }
    }

    /* ===== HEADER ===== */
    .ne-header {
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%);
        padding: 1.25rem 1.5rem;
        display: flex; align-items: center; justify-content: space-between;
        flex-shrink: 0;
    }
    .ne-header-left { display: flex; align-items: center; gap: 1rem; }
    .ne-avatar-wrap {
        position: relative; width: 64px; height: 64px; flex-shrink: 0;
    }
    .ne-avatar {
        width: 64px; height: 64px; border-radius: 50%;
        object-fit: cover; border: 3px solid rgba(255,255,255,0.5);
        background: #e5e7eb;
    }
    .ne-star { position: absolute; bottom:-4px; right:-4px; font-size: 1.2rem; }
    .ne-header-title { color: white; }
    .ne-header-title h2 {
        font-size: 1.2rem; font-weight: 800; margin:0;
        text-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .ne-header-title .ne-sname {
        font-size: 1rem; font-weight: 700; color: #fef08a;
    }
    .ne-header-title .ne-scurrent {
        font-size: 0.8rem; color: rgba(255,255,255,0.8); margin-top:0.1rem;
    }
    .ne-close-btn {
        background: rgba(255,255,255,0.2); border: none; border-radius: 50%;
        width: 36px; height: 36px; color: white; font-size: 1.1rem;
        cursor: pointer; transition: background 0.2s;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
    }
    .ne-close-btn:hover { background: rgba(255,255,255,0.35); }

    /* ===== SCORE PULSE BAR ===== */
    .ne-score-bar-wrap {
        background: #1e3a8a; padding: 0.6rem 1.5rem;
        display: flex; align-items: center; justify-content: space-between;
        flex-shrink: 0;
    }
    .ne-score-bar-label { color: rgba(255,255,255,0.8); font-size: 0.82rem; font-weight: 600; }
    .ne-score-display {
        font-size: 1.5rem; font-weight: 900; color: #fef08a;
        transition: all 0.3s; font-family: monospace;
    }
    .ne-score-sub { color: rgba(255,255,255,0.7); font-size: 0.78rem; }

    /* ===== BODY / TABLE ===== */
    .ne-body {
        flex: 1; overflow-y: auto; padding: 0;
        scrollbar-width: thin; scrollbar-color: #c7d2fe #f5f3ff;
    }
    .ne-rubric-table { width: 100%; border-collapse: collapse; }
    .ne-rubric-table thead th {
        position: sticky; top: 0; z-index: 2;
        background: #f8fafc; padding: 0.7rem 0.5rem;
        font-size: 0.78rem; font-weight: 700; color: #374151;
        border-bottom: 2px solid #e5e7eb;
        text-align: center;
    }
    .ne-rubric-table thead th.ne-th-content {
        text-align: left; padding-left: 1rem; min-width: 180px;
    }
    .ne-rubric-table tbody tr {
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.15s;
    }
    .ne-rubric-table tbody tr:hover { background: #f8f9ff; }
    .ne-rubric-table tbody tr:nth-child(even) { background: #fafbff; }
    .ne-rubric-table tbody tr:nth-child(even):hover { background: #f0f4ff; }
    .ne-td-stt {
        padding: 0.75rem 0.5rem; text-align: center;
        font-weight: 700; color: #6b7280; font-size: 0.85rem;
        width: 40px;
    }
    .ne-td-content { padding: 0.75rem 0.5rem 0.75rem 1rem; }
    .ne-content-title { font-weight: 700; color: #1e3a8a; font-size: 0.9rem; }
    .ne-content-desc { color: #6b7280; font-size: 0.8rem; margin-top: 0.15rem; line-height: 1.4; }
    .ne-td-check { padding: 0.5rem; text-align: center; width: 100px; }

    /* Custom radio as checkbox-style */
    .ne-radio-label {
        display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; width: 100%; min-height: 40px;
        border-radius: 8px; border: 2px solid transparent;
        transition: all 0.2s; position: relative;
        font-size: 1.1rem;
    }
    .ne-radio-label:hover { transform: scale(1.1); }
    .ne-radio-input {
        position: absolute; opacity: 0; width: 0; height: 0;
    }
    .ne-radio-input:checked + .ne-radio-box { opacity: 1; }
    .ne-radio-box {
        width: 22px; height: 22px;
        border: 2.5px solid #d1d5db;
        border-radius: 4px;
        background: white;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
        position: relative;
    }
    .ne-radio-input:checked ~ .ne-radio-box {
        background: currentColor;
        border-color: currentColor;
    }
    /* Colored check cell states */
    .ne-td-check.ne-selected-0 { background: #d1fae5; }
    .ne-td-check.ne-selected-1 { background: #dbeafe; }
    .ne-td-check.ne-selected-2 { background: #fef3c7; }
    .ne-td-check.ne-selected-3 { background: #fee2e2; }

    /* The visual checkbox in each cell */
    .ne-check-cell {
        display: flex; align-items: center; justify-content: center;
        width: 100%; height: 44px;
        border-radius: 8px; border: 2px solid #e5e7eb;
        cursor: pointer; transition: all 0.2s;
        background: white; position: relative;
    }
    .ne-check-cell:hover { border-color: #93c5fd; background: #f0f7ff; transform: scale(1.05); }
    .ne-check-cell.ne-checked-0 { border-color: #059669; background: #d1fae5; }
    .ne-check-cell.ne-checked-1 { border-color: #2563eb; background: #dbeafe; }
    .ne-check-cell.ne-checked-2 { border-color: #d97706; background: #fef3c7; }
    .ne-check-cell.ne-checked-3 { border-color: #dc2626; background: #fee2e2; }
    .ne-check-cell .ne-check-icon { font-size: 1.2rem; opacity: 0; transition: opacity 0.15s; }
    .ne-check-cell.ne-checked-0 .ne-check-icon,
    .ne-check-cell.ne-checked-1 .ne-check-icon,
    .ne-check-cell.ne-checked-2 .ne-check-icon,
    .ne-check-cell.ne-checked-3 .ne-check-icon { opacity: 1; }

    /* ===== FOOTER ===== */
    .ne-footer {
        padding: 1rem 1.5rem; background: #f8fafc;
        border-top: 2px solid #e5e7eb;
        display: flex; align-items: center; justify-content: space-between;
        gap: 1rem; flex-shrink: 0;
        flex-wrap: wrap;
    }
    .ne-footer-score {
        display: flex; align-items: center; gap: 0.75rem;
    }
    .ne-footer-score-badge {
        background: linear-gradient(135deg, #1e3a8a, #2563eb);
        color: white; padding: 0.5rem 1rem;
        border-radius: 10px; font-weight: 800;
        font-size: 1.1rem; min-width: 90px; text-align: center;
        box-shadow: 0 2px 8px rgba(37,99,235,0.3);
    }
    .ne-footer-score-label { color: #6b7280; font-size: 0.85rem; }
    .ne-footer-score-max { color: #374151; font-weight: 700; font-size: 0.9rem; }
    .ne-submit-btn {
        background: linear-gradient(135deg, #059669, #10b981);
        color: white; border: none; padding: 0.75rem 1.5rem;
        border-radius: 10px; font-size: 0.95rem; font-weight: 700;
        cursor: pointer; font-family: 'Montserrat', sans-serif;
        transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem;
        box-shadow: 0 3px 12px rgba(5,150,105,0.3);
    }
    .ne-submit-btn:hover {
        background: linear-gradient(135deg, #047857, #059669);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(5,150,105,0.35);
    }
    .ne-submit-btn:disabled {
        background: #d1d5db; color: #9ca3af; cursor: not-allowed;
        transform: none; box-shadow: none;
    }
    .ne-criteria-hint {
        font-size: 0.75rem; color: #9ca3af; margin-top: 0.2rem;
    }

    /* ===== LEVEL HEADER COLORS ===== */
    .ne-th-level-0 { color: #059669; }
    .ne-th-level-1 { color: #2563eb; }
    .ne-th-level-2 { color: #d97706; }
    .ne-th-level-3 { color: #dc2626; }

    /* ===== BUTTON ON STUDENT CARD ===== */
    /* Ẩn nút Hỏi – thay thế bằng nút Đánh giá */
    .btn-small.ask-btn,
    button[onclick*="askQuestion"] {
        display: none !important;
    }

    .ne-eval-btn {
        background: linear-gradient(135deg, #1e3a8a, #3b82f6) !important;
        color: white !important; border: none !important;
        padding: 0.3rem 0.7rem !important;
        border-radius: 6px !important; font-size: 0.78rem !important;
        font-weight: 700 !important; cursor: pointer !important;
        transition: all 0.2s !important;
        font-family: 'Montserrat', sans-serif !important;
        white-space: nowrap !important;
        letter-spacing: 0.01em !important;
    }
    .ne-eval-btn:hover {
        background: linear-gradient(135deg, #1e40af, #2563eb) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 3px 10px rgba(37,99,235,0.35) !important;
    }

    /* Hiệu ứng flash điểm khi cập nhật */
    @keyframes neScoreFlash {
        0%   { transform: scale(1.4); color: #059669; }
        60%  { transform: scale(1.15); color: #10b981; }
        100% { transform: scale(1);   color: inherit; }
    }
    .ne-score-updated {
        animation: neScoreFlash 0.55s ease;
    }

    /* ===== MANAGE CRITERIA ===== */
    #nenepCriteriaMgr {
        display: none; position: fixed;
        top:0;left:0;right:0;bottom:0;
        background: rgba(0,0,0,0.55);
        z-index: 10001;
        align-items: center; justify-content: center; padding: 1rem;
        backdrop-filter: blur(3px);
    }
    #nenepCriteriaMgr.ne-show { display: flex; }
    .ne-mgr-wrap {
        background: white; border-radius: 16px;
        max-width: 560px; width: 100%; max-height: 85vh;
        overflow-y: auto; padding: 1.5rem;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        animation: nePopIn 0.3s ease;
    }
    .ne-mgr-title {
        font-size: 1.1rem; font-weight: 800; color: #1e3a8a;
        margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;
    }
    .ne-mgr-row {
        display: flex; gap: 0.5rem; margin-bottom: 0.6rem; align-items: flex-start;
    }
    .ne-mgr-input {
        flex: 1; padding: 0.45rem 0.65rem; border: 1.5px solid #d1d5db;
        border-radius: 8px; font-size: 0.85rem;
        font-family: 'Montserrat', sans-serif;
        outline: none; transition: border-color 0.2s;
    }
    .ne-mgr-input:focus { border-color: #3b82f6; }
    .ne-mgr-del { background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; padding: 0.35rem 0.6rem; cursor: pointer; font-size: 0.9rem; flex-shrink: 0; }
    .ne-mgr-add { background: #dbeafe; color: #2563eb; border: none; border-radius: 8px; padding: 0.5rem 1rem; cursor: pointer; font-weight: 600; font-size: 0.85rem; margin-top: 0.5rem; }
    .ne-mgr-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .ne-mgr-save { background: linear-gradient(135deg,#059669,#10b981); color: white; border: none; border-radius: 8px; padding: 0.6rem 1.2rem; cursor: pointer; font-weight: 700; font-family: 'Montserrat', sans-serif; }
    .ne-mgr-cancel { background: #f3f4f6; color: #374151; border: none; border-radius: 8px; padding: 0.6rem 1.2rem; cursor: pointer; font-weight: 600; font-family: 'Montserrat', sans-serif; }
    .ne-mgr-reset { background: #fee2e2; color: #dc2626; border: none; border-radius: 8px; padding: 0.6rem 1rem; cursor: pointer; font-weight: 600; font-family: 'Montserrat', sans-serif; margin-left: auto; }
    `;
    document.head.appendChild(s);
}

// ============================================================
// MODAL HTML
// ============================================================
function neInjectModal() {
    if (document.getElementById('nenepEvalModal')) return;

    // Main Evaluation Modal
    const modal = document.createElement('div');
    modal.id = 'nenepEvalModal';
    modal.innerHTML = `
    <div class="ne-wrap">
        <div class="ne-header">
            <div class="ne-header-left">
                <div class="ne-avatar-wrap">
                    <img class="ne-avatar" id="neStudentAvatar" src="assets/dan.png" alt="avatar" />
                    <span class="ne-star" id="neStudentStar">⭐</span>
                </div>
                <div class="ne-header-title">
                    <h2>📋 Phiếu Đánh Giá Nề Nếp</h2>
                    <div class="ne-sname" id="neStudentName">—</div>
                    <div class="ne-scurrent" id="neStudentCurrent">Vai trò hiện tại: —</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <button class="ne-close-btn" style="background:rgba(255,255,255,0.15);border-radius:8px;font-size:0.75rem;width:auto;padding:0.3rem 0.6rem;font-weight:600;"
                    onclick="openNenepCriteriaMgr()">⚙️ Tiêu chí</button>
                <button class="ne-close-btn" onclick="closeNenepEvalModal()">✕</button>
            </div>
        </div>

        <div class="ne-score-bar-wrap">
            <div>
                <div class="ne-score-bar-label">ĐIỂM ĐANG TÍNH</div>
                <div class="ne-score-sub" id="neScoreSub">Hãy đánh giá từng tiêu chí bên dưới</div>
            </div>
            <div style="text-align:right;">
                <div class="ne-score-display" id="neScoreDisplay">0</div>
                <div class="ne-score-sub" id="neScoreMax">/ 0 điểm tối đa</div>
            </div>
        </div>

        <div class="ne-body">
            <table class="ne-rubric-table" id="neRubricTable">
                <thead>
                    <tr>
                        <th style="width:40px;">STT</th>
                        <th class="ne-th-content">Nội dung nề nếp</th>
                        <th class="ne-th-level-0">✨ Rất tốt<br><small style="font-weight:400;">(4 điểm)</small></th>
                        <th class="ne-th-level-1">👍 Tốt<br><small style="font-weight:400;">(3 điểm)</small></th>
                        <th class="ne-th-level-2">😐 Bình thường<br><small style="font-weight:400;">(2 điểm)</small></th>
                        <th class="ne-th-level-3">💪 Cần cố gắng<br><small style="font-weight:400;">(1 điểm)</small></th>
                    </tr>
                </thead>
                <tbody id="neRubricBody"></tbody>
            </table>
        </div>

        <div class="ne-footer">
            <div class="ne-footer-score">
                <div>
                    <div id="neFooterScore" class="ne-footer-score-badge">0 đ</div>
                    <div class="ne-criteria-hint" id="neFooterHint">Chưa đánh giá tiêu chí nào</div>
                </div>
                <div>
                    <div class="ne-footer-score-label">Tổng điểm sẽ cộng</div>
                    <div class="ne-footer-score-max" id="neFooterMax">Tối đa: 0 điểm</div>
                </div>
            </div>
            <button class="ne-submit-btn" id="neSubmitBtn" onclick="submitNenepEval()" disabled>
                ✅ Xác nhận &amp; Cộng điểm
            </button>
        </div>
    </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeNenepEvalModal(); });

    // Criteria Manager Modal
    const mgr = document.createElement('div');
    mgr.id = 'nenepCriteriaMgr';
    mgr.innerHTML = `
    <div class="ne-mgr-wrap">
        <div class="ne-mgr-title">⚙️ Quản lý Tiêu chí Đánh giá</div>
        <div id="neCriteriaList"></div>
        <button class="ne-mgr-add" onclick="neAddCriterionRow()">+ Thêm tiêu chí</button>
        <div class="ne-mgr-actions">
            <button class="ne-mgr-save" onclick="neSaveCriteriaFromForm()">💾 Lưu</button>
            <button class="ne-mgr-cancel" onclick="closeNenepCriteriaMgr()">Hủy</button>
            <button class="ne-mgr-reset" onclick="neResetCriteria()">🔄 Khôi phục mặc định</button>
        </div>
    </div>
    `;
    document.body.appendChild(mgr);
    mgr.addEventListener('click', e => { if (e.target === mgr) closeNenepCriteriaMgr(); });
}

// ============================================================
// MỞ / ĐÓNG MODAL
// ============================================================
function openNenepEvalModal(studentId) {
    _neCurrentStudentId = studentId;
    const modal = document.getElementById('nenepEvalModal');
    if (!modal) return;

    const students = neGetStudents();
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) return;

    // Cập nhật thông tin học sinh
    const roleInfo = neRoleInfo(student.role);
    document.getElementById('neStudentName').textContent    = student.name;
    document.getElementById('neStudentCurrent').textContent = `Chức vụ: ${roleInfo.label}  ·  Điểm hiện tại: ${student.score} đ`;
    document.getElementById('neStudentStar').textContent    = roleInfo.emoji;

    const avatarEl = document.getElementById('neStudentAvatar');
    if (avatarEl) { avatarEl.src = roleInfo.img; avatarEl.onerror = () => { avatarEl.src = 'assets/dan.png'; }; }

    // Render tiêu chí
    neRenderRows();

    modal.classList.add('ne-show');
    // Disable submit until all filled
    document.getElementById('neSubmitBtn').disabled = true;
    neUpdateScore();
}

window.openNenepEvalModal = openNenepEvalModal;

function closeNenepEvalModal() {
    const modal = document.getElementById('nenepEvalModal');
    if (modal) modal.classList.remove('ne-show');
    _neCurrentStudentId = null;
}
window.closeNenepEvalModal = closeNenepEvalModal;

// ============================================================
// RENDER BẢNG TIÊU CHÍ
// ============================================================
function neRenderRows() {
    const tbody = document.getElementById('neRubricBody');
    if (!tbody) return;

    const criteria = neGetCriteria();
    const maxScore = criteria.length * 4;

    document.getElementById('neScoreMax').textContent  = `/ ${maxScore} điểm tối đa`;
    document.getElementById('neFooterMax').textContent = `Tối đa: ${maxScore} điểm`;

    tbody.innerHTML = criteria.map((c, idx) => `
        <tr id="neTr_${c.id}">
            <td class="ne-td-stt">${idx + 1}</td>
            <td class="ne-td-content">
                <div class="ne-content-title">${escHtmlNE(c.title)}</div>
                <div class="ne-content-desc">${escHtmlNE(c.desc)}</div>
            </td>
            ${NENEP_LEVELS.map((lv, li) => `
            <td class="ne-td-check" id="neTd_${c.id}_${li}">
                <div class="ne-check-cell" id="neCell_${c.id}_${li}"
                     onclick="neSelectCell('${c.id}', ${li})"
                     title="${lv.label} — ${lv.value} điểm">
                    <span class="ne-check-icon">✓</span>
                </div>
            </td>
            `).join('')}
        </tr>
    `).join('');

    neUpdateScore();
}

// ============================================================
// CHỌN Ô ĐÁNH GIÁ
// ============================================================
function neSelectCell(criterionId, levelIdx) {
    const criteria = neGetCriteria();
    const numLevels = NENEP_LEVELS.length;

    // Bỏ chọn tất cả ô trong hàng này
    for (let i = 0; i < numLevels; i++) {
        const cell = document.getElementById(`neCell_${criterionId}_${i}`);
        if (cell) cell.className = 'ne-check-cell';
    }

    // Chọn ô được click
    const selected = document.getElementById(`neCell_${criterionId}_${levelIdx}`);
    if (selected) selected.className = `ne-check-cell ne-checked-${levelIdx}`;

    // Cập nhật màu nền cột
    for (let i = 0; i < numLevels; i++) {
        const td = document.getElementById(`neTd_${criterionId}_${i}`);
        if (td) td.style.background = '';
    }

    neUpdateScore();
}
window.neSelectCell = neSelectCell;

// ============================================================
// TÍNH ĐIỂM
// ============================================================
function neUpdateScore() {
    const criteria = neGetCriteria();
    let total = 0;
    let filled = 0;

    criteria.forEach(c => {
        for (let i = 0; i < NENEP_LEVELS.length; i++) {
            const cell = document.getElementById(`neCell_${c.id}_${i}`);
            if (cell && cell.className.includes('ne-checked')) {
                total += NENEP_LEVELS[i].value;
                filled++;
                break;
            }
        }
    });

    const maxScore = criteria.length * 4;
    const percent  = maxScore > 0 ? Math.round(total / maxScore * 100) : 0;

    const scoreEl  = document.getElementById('neScoreDisplay');
    const footerEl = document.getElementById('neFooterScore');
    const hintEl   = document.getElementById('neFooterHint');
    const subEl    = document.getElementById('neScoreSub');
    const submitEl = document.getElementById('neSubmitBtn');

    if (scoreEl)  scoreEl.textContent  = total;
    if (footerEl) footerEl.textContent = total + ' đ';

    const remaining = criteria.length - filled;
    if (hintEl) {
        if (filled === 0)               hintEl.textContent = 'Hãy đánh giá từng tiêu chí';
        else if (remaining > 0)         hintEl.textContent = `Còn ${remaining} tiêu chí chưa đánh giá`;
        else                            hintEl.textContent = `✅ Đã đánh giá đủ ${criteria.length} tiêu chí`;
    }
    if (subEl)    subEl.textContent    = filled > 0 ? `Đã đánh giá: ${filled}/${criteria.length} tiêu chí · ${percent}%` : 'Hãy đánh giá từng tiêu chí bên dưới';
    if (submitEl) submitEl.disabled    = (filled < criteria.length);

    return total;
}

// ============================================================
// XÁC NHẬN VÀ CỘNG ĐIỂM
// ============================================================
function submitNenepEval() {
    if (!_neCurrentStudentId) return;

    const total = neUpdateScore();
    const criteria = neGetCriteria();
    let filled = 0;
    criteria.forEach(c => {
        for (let i = 0; i < NENEP_LEVELS.length; i++) {
            const cell = document.getElementById(`neCell_${c.id}_${i}`);
            if (cell && cell.className.includes('ne-checked')) { filled++; break; }
        }
    });
    if (filled < criteria.length) {
        alert(`⚠️ Vui lòng đánh giá đủ ${criteria.length} tiêu chí trước khi xác nhận!`);
        return;
    }

    const studentId = _neCurrentStudentId;
    console.log('[NenepEval] Submit: studentId =', studentId, ', total =', total);

    // Ghi lịch sử đánh giá
    neSaveEvalHistory(studentId, total);

    // =============================================
    // CỘNG ĐIỂM – luôn dùng CẢ 2 phương pháp
    // =============================================

    // Phương pháp 1: API chính thức (override)
    let apiOK = false;
    try {
        if (typeof window.updateStudentScoreById === 'function') {
            window.updateStudentScoreById(studentId, total);
            apiOK = true;
            console.log('[NenepEval] API updateStudentScoreById OK');
        }
    } catch(e) {
        console.error('[NenepEval] API updateStudentScoreById FAIL:', e);
    }

    // Phương pháp 2: Fallback trực tiếp vào localStorage (LUÔN CHẠY)
    neFallbackUpdateScore(studentId, total);
    console.log('[NenepEval] Fallback localStorage OK');

    // Đóng modal
    closeNenepEvalModal();

    // Làm mới giao diện
    try {
        if (typeof window.renderCurrentPage === 'function') window.renderCurrentPage();
        else if (typeof window.navigateTo === 'function') window.navigateTo('management');
    } catch(e) {}

    // Thông báo thành công
    try {
        if (typeof Toastify === 'function') {
            Toastify({
                text: `✅ Đã cộng ${total} điểm nề nếp!`,
                duration: 3000, gravity: 'top', position: 'right',
                backgroundColor: 'linear-gradient(to right, #059669, #10b981)',
                stopOnFocus: true
            }).showToast();
        }
    } catch(e) { alert(`✅ Đã cộng ${total} điểm nề nếp thành công!`); }
}
window.submitNenepEval = submitNenepEval;

function neFallbackUpdateScore(studentId, delta) {
    try {
        const classes = JSON.parse(localStorage.getItem('classes') || '[]');
        classes.forEach(cls => {
            cls.students = (cls.students || []).map(s => {
                if (String(s.id) === String(studentId)) {
                    const newScore = Math.max(0, (s.score || 0) + delta);
                    return { ...s, score: newScore };
                }
                return s;
            });
        });
        localStorage.setItem('classes', JSON.stringify(classes));
    } catch(e) { console.error('nenep fallback update error:', e); }
}

function neSaveEvalHistory(studentId, total) {
    try {
        const key = `nenep_history_${studentId}`;
        const hist = JSON.parse(localStorage.getItem(key) || '[]');
        hist.push({ date: new Date().toISOString(), score: total });
        if (hist.length > 50) hist.shift();
        localStorage.setItem(key, JSON.stringify(hist));
    } catch(e) {}
}

// ============================================================
// QUẢN LÝ TIÊU CHÍ
// ============================================================
function openNenepCriteriaMgr() {
    const mgr = document.getElementById('nenepCriteriaMgr');
    if (!mgr) return;
    neRenderCriteriaList();
    mgr.classList.add('ne-show');
}
window.openNenepCriteriaMgr = openNenepCriteriaMgr;

function closeNenepCriteriaMgr() {
    const mgr = document.getElementById('nenepCriteriaMgr');
    if (mgr) mgr.classList.remove('ne-show');
}
window.closeNenepCriteriaMgr = closeNenepCriteriaMgr;

function neRenderCriteriaList() {
    const container = document.getElementById('neCriteriaList');
    if (!container) return;
    const criteria = neGetCriteria();
    container.innerHTML = criteria.map((c, i) => `
        <div class="ne-mgr-row" data-idx="${i}">
            <div style="display:flex;flex-direction:column;gap:4px;flex:1;">
                <input class="ne-mgr-input" placeholder="Tên tiêu chí (VD: Chuẩn bị)"
                       value="${escHtmlNE(c.title)}" data-field="title" data-idx="${i}" />
                <input class="ne-mgr-input" placeholder="Mô tả tiêu chí..."
                       value="${escHtmlNE(c.desc)}" data-field="desc" data-idx="${i}" style="font-size:0.78rem;color:#6b7280;" />
            </div>
            <button class="ne-mgr-del" onclick="neDeleteCriterionRow(${i})">🗑️</button>
        </div>
    `).join('');
}

function neAddCriterionRow() {
    const criteria = neGetCriteria();
    criteria.push({ id: 'c_' + Date.now(), title: '', desc: '' });
    neSaveCriteria(criteria);
    neRenderCriteriaList();
}
window.neAddCriterionRow = neAddCriterionRow;

function neDeleteCriterionRow(idx) {
    const criteria = neGetCriteria();
    criteria.splice(idx, 1);
    neSaveCriteria(criteria);
    neRenderCriteriaList();
}
window.neDeleteCriterionRow = neDeleteCriterionRow;

function neSaveCriteriaFromForm() {
    const rows = document.querySelectorAll('#neCriteriaList .ne-mgr-row');
    const list = [];
    rows.forEach((row, i) => {
        const title = (row.querySelector('[data-field="title"]') || {}).value || '';
        const desc  = (row.querySelector('[data-field="desc"]' ) || {}).value || '';
        if (title.trim()) {
            list.push({ id: 'c_' + i, title: title.trim(), desc: desc.trim() });
        }
    });
    if (list.length === 0) { alert('⚠️ Cần ít nhất 1 tiêu chí!'); return; }
    neSaveCriteria(list);
    closeNenepCriteriaMgr();
    if (_neCurrentStudentId) neRenderRows();
    alert(`✅ Đã lưu ${list.length} tiêu chí!`);
}
window.neSaveCriteriaFromForm = neSaveCriteriaFromForm;

function neResetCriteria() {
    if (!confirm('Bạn có chắc muốn khôi phục tiêu chí mặc định?')) return;
    localStorage.removeItem('nenep_criteria');
    neRenderCriteriaList();
}
window.neResetCriteria = neResetCriteria;

// ============================================================
// THÊM NÚT "ĐÁNH GIÁ" VÀO THẺ HỌC SINH (thay thế nút Hỏi)
// ============================================================
function neAddButtonsToCards() {
    const studentCards = document.querySelectorAll('.student-card');
    studentCards.forEach(card => {
        if (card.dataset.neAdded) return;
        card.dataset.neAdded = '1';

        let studentId = null;
        let askBtn    = null;

        const btns = card.querySelectorAll('button');

        // Tìm nút "Hỏi" → lấy studentId và tham chiếu nút
        btns.forEach(btn => {
            const oc  = btn.getAttribute('onclick') || '';
            const txt = btn.textContent.trim();
            // Khớp mọi biến thể: 'Hỏi', '🎯', hoặc onclick chứa askQuestion
            if (txt === 'Hỏi' || txt === '🎯' || oc.includes('askQuestion')) {
                const m = oc.match(/askQuestion\(['"']?([^'"')]+)['"']?\)/);
                if (m) {
                    studentId = m[1];
                    askBtn    = btn;
                }
            }
        });

        // Fallback: lấy qua input score
        if (!studentId) {
            const scoreInput = card.querySelector('input[id^="score-"]');
            if (scoreInput) studentId = scoreInput.id.replace('score-', '');
        }

        // Fallback: lấy qua nút xóa học sinh
        if (!studentId) {
            btns.forEach(btn => {
                const oc = btn.getAttribute('onclick') || '';
                const m  = oc.match(/deleteStudent\(['"']?([^'"')]+)['"']?\)/);
                if (m) studentId = m[1];
            });
        }

        if (!studentId) return;

        // Tạo nút đánh giá
        const evalBtn = document.createElement('button');
        evalBtn.className = 'btn btn-small ne-eval-btn';
        evalBtn.textContent = '📋 Đánh giá';
        evalBtn.setAttribute('onclick', `openNenepEvalModal('${studentId}')`);

        if (askBtn) {
            // Thay thế nút Hỏi bằng nút Đánh giá (cùng vị trí)
            askBtn.parentNode.insertBefore(evalBtn, askBtn);
            askBtn.style.setProperty('display', 'none', 'important');
        } else {
            // Fallback: thêm vào student-controls hoặc cuối card
            const ctrlDiv = card.querySelector('.student-controls');
            if (ctrlDiv) {
                ctrlDiv.insertBefore(evalBtn, ctrlDiv.firstChild);
            } else {
                card.appendChild(evalBtn);
            }
        }
    });
}

// MutationObserver – theo dõi khi student cards được render lại
function neStartObserver() {
    const target = document.getElementById('studentList') || document.body;
    const obs = new MutationObserver(() => {
        clearTimeout(window._neObsTimer);
        window._neObsTimer = setTimeout(() => {
            neAddButtonsToCards();
            neFixScoreDisplays();
        }, 150);
    });
    obs.observe(target, { childList: true, subtree: true });
}

// ============================================================
// SỬA HIỂN THỊ ĐIỂM & INPUT TRÊN THẺ HỌC SINH
// ============================================================
function neFixScoreDisplays() {
    document.querySelectorAll('.student-card').forEach(card => {
        if (card.dataset.neScoreFixed) return;
        card.dataset.neScoreFixed = '1';

        // 1) Đổi "/100" → "đ" trong mọi text node
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.includes('/100')) {
                node.textContent = node.textContent.replace(/\/100/g, ' đ');
            }
        }

        // 2) Input score: đổi value thành delta mặc định (thay vì score hiện tại)
        const scoreInput = card.querySelector('input[id^="score-"]');
        if (scoreInput) {
            // Lưu giá trị gốc (score hiện tại) ra data attribute
            if (!scoreInput.dataset.originalScore) {
                scoreInput.dataset.originalScore = scoreInput.value;
            }
            // Đổi value thành delta mặc định = 1
            scoreInput.value = '1';
            scoreInput.min = '1';
            scoreInput.max = '9999';
            scoreInput.style.width = '52px';
        }
    });
}

// ============================================================
// GHI ĐÈ HỆ THỐNG ĐIỂM (bỏ giới hạn 100, mốc thăng cấp mới)
// ============================================================
function neOverrideScoreSystem() {
    // --- 1) Ghi đè roleThresholds ---
    try {
        if (typeof window.roleThresholds !== 'undefined') {
            Object.assign(window.roleThresholds, NE_NEW_THRESHOLDS);
        }
    } catch(e) {}
    localStorage.setItem('roleThresholds', JSON.stringify(NE_NEW_THRESHOLDS));

    // --- 2) Ghi đè getRole ---
    window.getRole = function(score) {
        const t = NE_NEW_THRESHOLDS;
        if (score >= t.king)       return 'king';
        if (score >= t.chancellor) return 'chancellor';
        if (score >= t.officer)    return 'officer';
        if (score >= t.soldier)    return 'soldier';
        return 'peasant';
    };

    // --- 3) Ghi đè updateStudentScoreById (bỏ cap 100) ---
    window.updateStudentScoreById = function(studentId, delta) {
        try {
            const students = getCurrentStudents();
            const student = students.find(s => s.id === studentId);
            if (!student) return;
            const oldRole = student.role;
            const newScore = Math.max(0, student.score + delta);
            const newRole = getRole(newScore);
            const updated = students.map(s =>
                s.id === studentId ? { ...s, score: newScore, role: newRole } : s
            );
            updateCurrentClass({ students: updated });
            // Cập nhật sorted rewards students
            try {
                if (typeof state !== 'undefined' && state.sortedRewardsStudents) {
                    state.sortedRewardsStudents = state.sortedRewardsStudents.map(s =>
                        s.id === studentId ? { ...s, score: newScore, role: newRole } : s
                    );
                }
            } catch(_e) {}
            if (oldRole !== newRole && typeof isRoleUpgrade === 'function' && isRoleUpgrade(oldRole, newRole)) {
                showLevelUpNotification(student.name, getRoleLabel(newRole));
            }
        } catch(e) { console.error('neOverride updateStudentScoreById:', e); }
    };

    // --- 4) Ghi đè updateStudentScore cho nút +/- trên thẻ (bỏ cap 100) ---
    window.updateStudentScore = function(studentId, direction) {
        try {
            // Âm thanh
            try {
                if (direction > 0 && typeof playSuccessSound === 'function') playSuccessSound();
                else if (typeof playFailSound === 'function') playFailSound();
            } catch(_e) {}

            const scoreInput = document.getElementById('score-' + studentId);
            if (!scoreInput) return;
            const inputVal = parseInt(scoreInput.value) || 1;
            const delta = direction > 0 ? inputVal : -inputVal;

            const students = getCurrentStudents();
            const student = students.find(s => s.id === studentId);
            if (!student) return;
            const oldRole = student.role;
            const newScore = Math.max(0, student.score + delta);
            const newRole = getRole(newScore);
            const updated = students.map(s =>
                s.id === studentId ? { ...s, score: newScore, role: newRole } : s
            );
            updateCurrentClass({ students: updated });

            if (oldRole !== newRole && typeof isRoleUpgrade === 'function' && isRoleUpgrade(oldRole, newRole)) {
                showLevelUpNotification(student.name, getRoleLabel(newRole));
            }
            if (typeof renderCurrentPage === 'function') renderCurrentPage();
        } catch(e) { console.error('neOverride updateStudentScore:', e); }
    };

    // --- 5) Ghi đè bulkUpdateScores (bỏ cap 100) ---
    window.bulkUpdateScores = function(direction) {
        try {
            const scoreVal = parseInt(document.getElementById('bulkScore').value) || 0;
            const delta = direction > 0 ? scoreVal : -scoreVal;
            const students = getCurrentStudents();
            const updated = students.map(s => {
                const oldRole = s.role;
                const newScore = Math.max(0, s.score + delta);
                const newRole = getRole(newScore);
                if (oldRole !== newRole && typeof isRoleUpgrade === 'function' && isRoleUpgrade(oldRole, newRole)) {
                    setTimeout(() => showLevelUpNotification(s.name, getRoleLabel(newRole)), 0);
                }
                return { ...s, score: newScore, role: newRole };
            });
            updateCurrentClass({ students: updated });
            if (typeof renderCurrentPage === 'function') renderCurrentPage();
        } catch(e) { console.error('neOverride bulkUpdateScores:', e); }
    };

    // --- 6) Cập nhật lại vai trò tất cả học sinh theo mốc mới ---
    try {
        const students = getCurrentStudents();
        if (students && students.length > 0) {
            let changed = false;
            const updated = students.map(s => {
                const correctRole = getRole(s.score);
                if (s.role !== correctRole) { changed = true; return { ...s, role: correctRole }; }
                return s;
            });
            if (changed) updateCurrentClass({ students: updated });
        }
    } catch(e) {}

    // --- 7) Cập nhật badge hiển thị ---
    try {
        if (typeof updateRoleBadges === 'function') updateRoleBadges();
    } catch(e) {}

    console.log('[NenepEval] Đã ghi đè hệ thống điểm. Mốc thăng cấp:', NE_NEW_THRESHOLDS);
}

// ============================================================
// TIỆN ÍCH
// ============================================================
function escHtmlNE(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// KHỞI ĐỘNG
// ============================================================
function initNenepEvaluation() {
    neInjectCSS();
    neInjectModal();
    neStartObserver();
    // Ghi đè hệ thống điểm (bỏ giới hạn 100, mốc thăng cấp mới)
    neOverrideScoreSystem();
    // Thử thêm nút ngay lần đầu (nếu đã có thẻ học sinh)
    setTimeout(() => {
        neAddButtonsToCards();
        neFixScoreDisplays();
    }, 1000);
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initNenepEvaluation, 700);
});
