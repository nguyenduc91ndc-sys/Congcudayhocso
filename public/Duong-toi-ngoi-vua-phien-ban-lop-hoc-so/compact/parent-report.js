/**
 * Chức năng Gửi Kết Quả Bảng Xếp Hạng cho Phụ Huynh
 * Version 2.0 - Kèm ảnh nhân vật vai trò + tích hợp đánh giá nề nếp
 */

// ============================================================
// DỮ LIỆU VAI TRÒ
// ============================================================
const PR_ROLE_CONFIG = {
    peasant:    { label: 'Dân',       color: '#6b7280', bg: '#f3f4f6', img: 'assets/dan.png',     emoji: '🧑', crown: '' },
    soldier:    { label: 'Lính',      color: '#ef4444', bg: '#fee2e2', img: 'assets/linh.png',    emoji: '⚔️', crown: '' },
    officer:    { label: 'Quan',      color: '#f97316', bg: '#ffedd5', img: 'assets/quan.png',    emoji: '🎖️', crown: '' },
    chancellor: { label: 'Tể Tướng', color: '#d97706', bg: '#fef3c7', img: 'assets/tetuong.jpg', emoji: '🎩', crown: '' },
    king:       { label: 'Vua',       color: '#7c3aed', bg: '#ede9fe', img: 'assets/vua.jpg',     emoji: '👑', crown: '👑' },
};

function prRoleConf(role) {
    return PR_ROLE_CONFIG[role] || PR_ROLE_CONFIG.peasant;
}

// ============================================================
// KHỞI TẠO
// ============================================================
function initParentReportFeature() {
    injectPRStyles();
    injectPRModal();
    addParentReportNavButton();
    addParentReportSidebarButton();
}

function injectPRStyles() {
    if (document.getElementById('prReportStyle')) return;
    const s = document.createElement('style');
    s.id = 'prReportStyle';
    s.textContent = `
    /* ===== MODAL ===== */
    #parentReportModal {
        display: none; position: fixed;
        top:0;left:0;right:0;bottom:0;
        background: rgba(0,0,0,0.55);
        z-index: 9998;
        align-items: center; justify-content: center; padding: 1rem;
        backdrop-filter: blur(3px);
    }
    #parentReportModal.show { display: flex; }
    .pr-container {
        background: #fff; border-radius: 20px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.25);
        width: 100%; max-width: 820px;
        max-height: 92vh; overflow-y: auto;
        animation: prSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes prSlideIn {
        from { transform: scale(0.85) translateY(30px); opacity: 0; }
        to   { transform: scale(1) translateY(0); opacity: 1; }
    }

    /* Header */
    .pr-header {
        background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%);
        color: white; padding: 1.4rem 2rem 1.2rem;
        border-radius: 20px 20px 0 0;
        display: flex; align-items: center; justify-content: space-between;
    }
    .pr-header-left { display: flex; align-items: center; gap: 0.75rem; }
    .pr-header-icon {
        width: 48px; height: 48px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.5rem;
    }
    .pr-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
    .pr-header p  { font-size: 0.83rem; opacity: 0.85; margin: 0.2rem 0 0; }
    .pr-close {
        background: rgba(255,255,255,0.2); border: none; border-radius: 50%;
        width: 36px; height: 36px; font-size: 1.1rem; color: white;
        cursor: pointer; transition: background 0.2s;
        display: flex; align-items: center; justify-content: center;
    }
    .pr-close:hover { background: rgba(255,255,255,0.35); }

    /* Tabs */
    .pr-tabs { display: flex; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
    .pr-tab {
        padding: 0.85rem 1.4rem; cursor: pointer;
        font-weight: 600; font-size: 0.88rem; color: #6b7280;
        border-bottom: 3px solid transparent; margin-bottom: -2px;
        transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem;
    }
    .pr-tab:hover { color: #7c3aed; }
    .pr-tab.active { color: #7c3aed; border-bottom-color: #7c3aed; }

    .pr-body { padding: 1.4rem 1.75rem; }

    /* ===== PREVIEW ===== */
    .pr-preview-label {
        font-size: 0.75rem; font-weight: 700; color: #7c3aed;
        text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;
    }
    .pr-report-card { border: 2px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
    .pr-report-header {
        background: linear-gradient(135deg, #7c3aed, #a78bfa);
        color: white; padding: 1rem 1.25rem; text-align: center;
    }
    .pr-report-header .pr-school-name { font-size: 0.78rem; opacity: 0.85; margin-bottom: 0.15rem; }
    .pr-report-header .pr-class-name  { font-size: 1.15rem; font-weight: 700; }
    .pr-report-header .pr-date        { font-size: 0.73rem; opacity: 0.75; margin-top: 0.2rem; }

    /* Leaderboard table */
    .pr-lb-table { width: 100%; border-collapse: collapse; }
    .pr-lb-table th {
        background: #f3f4f6; padding: 0.55rem 0.75rem;
        font-size: 0.78rem; font-weight: 700; color: #374151;
        border-bottom: 2px solid #e5e7eb;
    }
    .pr-lb-table td {
        padding: 0.55rem 0.75rem;
        border-bottom: 1px solid #f3f4f6; font-size: 0.87rem;
        vertical-align: middle;
    }
    .pr-lb-table tbody tr:last-child td { border-bottom: none; }
    .pr-lb-table tbody tr:nth-child(even) { background: #fafafa; }
    .pr-lb-table tbody tr:hover { background: #f5f3ff; }

    /* Role avatar in table */
    .pr-role-avatar {
        width: 38px; height: 38px; border-radius: 50%;
        object-fit: cover; border: 2px solid #e5e7eb;
        vertical-align: middle; margin-right: 0.4rem;
        flex-shrink: 0;
    }
    .pr-student-cell { display: flex; align-items: center; gap: 0.35rem; }
    .pr-student-name { font-weight: 600; color: #111827; }

    .pr-rank-cell { text-align: center; font-weight: 700; font-size: 1rem; width: 50px; }
    .pr-rank-1 { color: #f59e0b; } .pr-rank-2 { color: #9ca3af; } .pr-rank-3 { color: #f97316; }
    .pr-role-badge {
        display: inline-block; padding: 0.15rem 0.55rem;
        border-radius: 20px; font-size: 0.72rem; font-weight: 700;
    }
    .pr-score-cell { font-weight: 700; color: #7c3aed; text-align: center; }
    .pr-top3-row   { background: #fef9ee !important; }

    .pr-footer-note {
        padding: 0.5rem 1rem; text-align: center;
        font-size: 0.73rem; color: #9ca3af;
        background: #fafafa; border-top: 1px solid #f3f4f6;
    }

    /* Filter buttons */
    .pr-filter-row {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 0.7rem; flex-wrap: wrap; gap: 0.5rem;
    }
    .pr-filter-btns { display: flex; gap: 0.4rem; }
    .pr-fbtn {
        padding: 0.28rem 0.75rem; border-radius: 20px;
        border: 2px solid #e5e7eb; background: white;
        font-size: 0.78rem; font-weight: 600; cursor: pointer;
        color: #374151; transition: all 0.2s;
    }
    .pr-fbtn:hover, .pr-fbtn.active {
        background: #7c3aed; border-color: #7c3aed; color: white;
    }

    /* ===== MESSAGE TAB ===== */
    .pr-msg-box {
        background: #f3f4f6; border-radius: 10px;
        padding: 1rem 1.2rem; font-size: 0.87rem; line-height: 1.85;
        color: #374151; white-space: pre-wrap;
        max-height: 320px; overflow-y: auto;
        border: 1.5px solid #e5e7eb; user-select: all;
        font-family: monospace;
    }
    .pr-copy-success {
        text-align: center; font-size: 0.8rem; color: #10b981;
        font-weight: 600; margin-top: 0.5rem; opacity: 0; transition: opacity 0.3s;
    }
    .pr-copy-success.show { opacity: 1; }

    /* ===== SETTINGS TAB ===== */
    .pr-settings-row {
        display: flex; align-items: center; gap: 0.75rem;
        margin-bottom: 0.6rem;
    }
    .pr-settings-label { min-width: 120px; font-size: 0.83rem; font-weight: 600; color: #374151; }
    .pr-settings-input {
        flex: 1; padding: 0.42rem 0.7rem;
        border: 1.5px solid #d1d5db; border-radius: 8px;
        font-size: 0.86rem; font-family: 'Montserrat', sans-serif;
        outline: none; transition: border-color 0.2s;
    }
    .pr-settings-input:focus { border-color: #7c3aed; }

    /* ===== ACTIONS ===== */
    .pr-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.65rem; margin-top: 1.1rem; }
    .pr-btn {
        display: flex; align-items: center; justify-content: center; gap: 0.4rem;
        padding: 0.7rem 0.8rem; border-radius: 10px; border: none;
        font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
        font-family: 'Montserrat', sans-serif;
    }
    .pr-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
    .pr-btn:active { transform: translateY(0); }
    .pr-btn-copy     { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
    .pr-btn-download { background: linear-gradient(135deg, #10b981, #059669); color: white; }
    .pr-btn-zalo     { background: linear-gradient(135deg, #0068ff, #0055cc); color: white; }

    /* ===== NAV BUTTON ===== */
    .btn-purple {
        background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white;
    }
    .btn-purple:hover {
        background: linear-gradient(135deg, #6d28d9, #8b5cf6);
    }
    #btnSendParents {
        display: flex; width: 100%; margin-top: 1rem;
        background: linear-gradient(135deg, #7c3aed, #8b5cf6);
        color: white; border: none; padding: 0.65rem 1rem;
        border-radius: 10px; font-size: 0.88rem; font-weight: 700;
        cursor: pointer; font-family: 'Montserrat', sans-serif;
        transition: all 0.2s;
        align-items: center; justify-content: center; gap: 0.5rem;
    }
    #btnSendParents:hover {
        background: linear-gradient(135deg, #6d28d9, #7c3aed);
        transform: translateY(-1px); box-shadow: 0 4px 14px rgba(124,58,237,0.4);
    }
    #prCanvas { display: none; }
    `;
    document.head.appendChild(s);
}

function injectPRModal() {
    if (document.getElementById('parentReportModal')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'prCanvas';
    document.body.appendChild(canvas);

    const modal = document.createElement('div');
    modal.id = 'parentReportModal';
    modal.innerHTML = `
    <div class="pr-container">
        <div class="pr-header">
            <div class="pr-header-left">
                <div class="pr-header-icon">📊</div>
                <div>
                    <h2>Gửi Kết Quả cho Phụ Huynh</h2>
                    <p>Bảng xếp hạng kèm hình ảnh vai trò học sinh</p>
                </div>
            </div>
            <button class="pr-close" onclick="closeParentReportModal()">✕</button>
        </div>

        <div class="pr-tabs">
            <div class="pr-tab active" onclick="prSwitchTab('preview')"  id="prTabPreview" >📋 Xem trước</div>
            <div class="pr-tab"        onclick="prSwitchTab('message')"  id="prTabMessage" >💬 Nội dung tin nhắn</div>
            <div class="pr-tab"        onclick="prSwitchTab('settings')" id="prTabSettings">⚙️ Tùy chỉnh</div>
        </div>

        <div class="pr-body">
            <!-- TAB XEM TRƯỚC -->
            <div id="prPanelPreview">
                <div class="pr-filter-row">
                    <div class="pr-preview-label" style="margin-bottom:0;">Bảng xếp hạng kèm hình ảnh</div>
                    <div class="pr-filter-btns">
                        <button class="pr-fbtn active" onclick="prFilterStudents('all',   this)">Tất cả</button>
                        <button class="pr-fbtn"        onclick="prFilterStudents('top10', this)">Top 10</button>
                        <button class="pr-fbtn"        onclick="prFilterStudents('top5',  this)">Top 5</button>
                    </div>
                </div>
                <div class="pr-report-card" id="prReportCard"></div>
            </div>

            <!-- TAB TIN NHẮN -->
            <div id="prPanelMessage" style="display:none;">
                <div class="pr-preview-label" style="margin-bottom:0.65rem;">Nội dung sẵn sàng copy &amp; gửi</div>
                <div class="pr-msg-box" id="prMsgContent"></div>
                <div class="pr-copy-success" id="prCopySuccess">✅ Đã copy vào clipboard!</div>
            </div>

            <!-- TAB TÙY CHỈNH -->
            <div id="prPanelSettings" style="display:none;">
                <div class="pr-preview-label" style="margin-bottom:0.75rem;">Thông tin hiển thị trên báo cáo</div>
                <div class="pr-settings-row">
                    <span class="pr-settings-label">🏫 Tên trường:</span>
                    <input class="pr-settings-input" id="prSchoolName" type="text" placeholder="VD: Trường TH Nguyễn Văn A" />
                </div>
                <div class="pr-settings-row">
                    <span class="pr-settings-label">📅 Kỳ báo cáo:</span>
                    <input class="pr-settings-input" id="prPeriod" type="text" placeholder="VD: Tuần 12 - Tháng 3/2026" />
                </div>
                <div class="pr-settings-row">
                    <span class="pr-settings-label">👩‍🏫 Giáo viên:</span>
                    <input class="pr-settings-input" id="prTeacherName" type="text" placeholder="VD: Cô Nguyễn Thị Hương" />
                </div>
                <div class="pr-settings-row">
                    <span class="pr-settings-label">📝 Ghi chú:</span>
                    <input class="pr-settings-input" id="prNote" type="text" placeholder="VD: Chăm học là con ngoan!" />
                </div>
                <button class="pr-btn pr-btn-copy" onclick="prApplySettings()" style="margin-top:0.4rem;width:100%;">
                    ✅ Áp dụng &amp; Xem trước
                </button>
            </div>

            <!-- ACTIONS -->
            <div class="pr-actions">
                <button class="pr-btn pr-btn-copy"     onclick="prCopyText()">📋 Copy tin nhắn</button>
                <button class="pr-btn pr-btn-download" onclick="prDownloadImage()">🖼️ Tải ảnh bảng</button>
                <button class="pr-btn pr-btn-zalo"     onclick="prShareZalo()">📱 Nhắn qua Zalo</button>
            </div>
        </div>
    </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeParentReportModal(); });
}

// ============================================================
// NÚT MỞ MODAL
// ============================================================
function addParentReportNavButton() {
    if (document.getElementById('btnParentReport')) return;
    const ha = document.querySelector('.header-actions');
    if (!ha) return;
    const btn = document.createElement('button');
    btn.className = 'nav-btn btn-purple';
    btn.id = 'btnParentReport';
    btn.innerHTML = '📊 Gửi PH';
    btn.onclick = openParentReportModal;
    ha.appendChild(btn);
}

function addParentReportSidebarButton() {
    if (document.getElementById('btnSendParents')) return;
    const top5 = document.querySelector('.top-students');
    if (!top5) { setTimeout(addParentReportSidebarButton, 600); return; }
    const btn = document.createElement('button');
    btn.id = 'btnSendParents';
    btn.innerHTML = '📊 Gửi kết quả cho Phụ Huynh';
    btn.onclick = openParentReportModal;
    top5.appendChild(btn);
}

// ============================================================
// MỞ / ĐÓNG
// ============================================================
function openParentReportModal() {
    const m = document.getElementById('parentReportModal');
    if (!m) return;
    m.classList.add('show');
    prSwitchTab('preview');
}
function closeParentReportModal() {
    const m = document.getElementById('parentReportModal');
    if (m) m.classList.remove('show');
}
window.closeParentReportModal = closeParentReportModal;
window.openParentReportModal  = openParentReportModal;

// ============================================================
// CHUYỂN TAB
// ============================================================
function prSwitchTab(tab) {
    ['preview','message','settings'].forEach(t => {
        const panel = document.getElementById(`prPanel${prCap(t)}`);
        const tabEl  = document.getElementById(`prTab${prCap(t)}`);
        if (panel) panel.style.display = t === tab ? 'block' : 'none';
        if (tabEl)  tabEl.classList.toggle('active', t === tab);
    });
    if (tab === 'preview') prRenderPreview();
    if (tab === 'message') prGenerateMessage();
}
window.prSwitchTab = prSwitchTab;
function prCap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ============================================================
// DỮ LIỆU
// ============================================================
let _prFilter = 'all';

function prGetStudents() {
    try { if (typeof window.getCurrentStudents === 'function') return window.getCurrentStudents() || []; } catch(e) {}
    try {
        const cls = JSON.parse(localStorage.getItem('classes') || '[]');
        return cls.length ? (cls[0].students || []) : [];
    } catch(e) { return []; }
}

function prGetCurrentClass() {
    try { if (typeof window.getCurrentClass === 'function') return window.getCurrentClass(); } catch(e) {}
    try {
        const cls = JSON.parse(localStorage.getItem('classes') || '[]');
        return cls[0] || null;
    } catch(e) { return null; }
}

function prGetVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

// ============================================================
// RENDER XEM TRƯỚC (với ảnh vai trò)
// ============================================================
function prFilterStudents(f, btnEl) {
    _prFilter = f;
    document.querySelectorAll('.pr-fbtn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    prRenderPreview();
}
window.prFilterStudents = prFilterStudents;

function prRenderPreview() {
    const card = document.getElementById('prReportCard');
    if (!card) return;

    const students   = prGetStudents();
    const cls        = prGetCurrentClass();
    const schoolName = prGetVal('prSchoolName') || 'Lớp học';
    const period     = prGetVal('prPeriod');
    const teacher    = prGetVal('prTeacherName');

    const sorted    = [...students].sort((a,b) => b.score - a.score);
    const displayed = _prFilter === 'top10' ? sorted.slice(0,10) : _prFilter === 'top5' ? sorted.slice(0,5) : sorted;
    const className = cls ? cls.name : 'Lớp học';
    const now       = new Date().toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });

    const rankIcon = i => i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : (i+1);

    card.innerHTML = `
        <div class="pr-report-header">
            <div class="pr-school-name">${escPR(schoolName)}${teacher ? ' · GV: ' + escPR(teacher) : ''}</div>
            <div class="pr-class-name">👑 Bảng Xếp Hạng — ${escPR(className)}</div>
            <div class="pr-date">📅 ${period ? escPR(period) + ' · ' : ''}Cập nhật: ${now}</div>
        </div>
        <table class="pr-lb-table">
            <thead>
                <tr>
                    <th style="text-align:center;">Hạng</th>
                    <th>Học Sinh</th>
                    <th style="text-align:center;">Vai Trò</th>
                    <th style="text-align:center;">Điểm</th>
                </tr>
            </thead>
            <tbody>
                ${displayed.length === 0
                    ? `<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:2rem;">Chưa có học sinh nào</td></tr>`
                    : displayed.map((s, i) => {
                        const rc = prRoleConf(s.role);
                        return `
                        <tr class="${i < 3 ? 'pr-top3-row' : ''}">
                            <td class="pr-rank-cell pr-rank-${i+1}">${rankIcon(i)}</td>
                            <td>
                                <div class="pr-student-cell">
                                    <img src="${escPR(rc.img)}" class="pr-role-avatar"
                                         alt="${escPR(rc.label)}"
                                         onerror="this.src='assets/dan.png'" />
                                    <span class="pr-student-name">${escPR(s.name)}</span>
                                    ${i < 3 ? '<span style="font-size:0.85rem;">✨</span>' : ''}
                                </div>
                            </td>
                            <td style="text-align:center;">
                                <span class="pr-role-badge" style="background:${rc.bg};color:${rc.color};">
                                    ${rc.emoji} ${rc.label}
                                </span>
                            </td>
                            <td class="pr-score-cell">${s.score} đ</td>
                        </tr>`;
                    }).join('')
                }
            </tbody>
        </table>
        <div class="pr-footer-note">
            📊 Tổng: ${students.length} học sinh | Tạo bởi: Đường đến Ngôi Vua
        </div>
    `;
}
window.prRenderPreview = prRenderPreview;

// ============================================================
// TẠO NỘI DUNG TIN NHẮN
// ============================================================
function prGenerateMessage() {
    const msgBox = document.getElementById('prMsgContent');
    if (!msgBox) return;

    const students   = prGetStudents();
    const cls        = prGetCurrentClass();
    const schoolName = prGetVal('prSchoolName');
    const period     = prGetVal('prPeriod');
    const teacher    = prGetVal('prTeacherName');
    const note       = prGetVal('prNote');

    const sorted    = [...students].sort((a,b) => b.score - a.score);
    const now       = new Date().toLocaleDateString('vi-VN');
    const className = cls ? cls.name : 'Lớp học';
    const medals    = ['🥇','🥈','🥉'];

    let msg = '';
    msg += `👑 BẢNG XẾP HẠNG ${className.toUpperCase()}\n`;
    if (schoolName) msg += `🏫 ${schoolName}\n`;
    if (teacher)    msg += `👩‍🏫 GV: ${teacher}\n`;
    if (period)     msg += `📅 ${period}\n`;
    msg += '━━━━━━━━━━━━━━━━━━━━━━\n';

    if (sorted.length === 0) {
        msg += '(Chưa có dữ liệu học sinh)\n';
    } else {
        sorted.slice(0, 20).forEach((s, i) => {
            const rc     = prRoleConf(s.role);
            const medal  = i < 3 ? medals[i] : `${i+1}.`;
            const crown  = s.role === 'king' ? ' 👑' : '';
            msg += `${medal} ${s.name} — ${s.score}đ [${rc.label}${crown}]\n`;
        });
        if (sorted.length > 20) msg += `   ... và ${sorted.length - 20} học sinh khác\n`;
    }

    msg += '━━━━━━━━━━━━━━━━━━━━━━\n';
    msg += `📊 Tổng: ${students.length} học sinh\n`;
    msg += `🗓️ Ngày: ${now}\n`;
    if (note) msg += `📝 ${note}\n`;
    msg += '\n💝 Kính gửi quý phụ huynh!\nMong em tiếp tục phát huy! 🌟';

    msgBox.textContent = msg;
}

// ============================================================
// COPY TIN NHẮN
// ============================================================
function prCopyText() {
    prGenerateMessage();
    prSwitchTab('message');
    const msgBox = document.getElementById('prMsgContent');
    const success = document.getElementById('prCopySuccess');
    if (!msgBox) return;

    const text = msgBox.textContent;
    const show = () => {
        if (success) {
            success.classList.add('show');
            setTimeout(() => success.classList.remove('show'), 2500);
        }
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(show).catch(() => prFallbackCopy(text, show));
    } else {
        prFallbackCopy(text, show);
    }
}
window.prCopyText = prCopyText;

function prFallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    if (cb) cb();
}

// ============================================================
// TẢI ẢNH BẢNG XẾP HẠNG (với ảnh vai trò)
// ============================================================
function prDownloadImage() {
    console.log("🚀 Bắt đầu quy trình tải ảnh bảng vinh danh...");
    const students   = prGetStudents();
    const cls        = prGetCurrentClass();
    const schoolName = prGetVal('prSchoolName');
    const period     = prGetVal('prPeriod');
    const teacher    = prGetVal('prTeacherName');

    const sorted    = [...students].sort((a,b) => b.score - a.score);
    const displayed = _prFilter === 'top10' ? sorted.slice(0,10) : _prFilter === 'top5' ? sorted.slice(0,5) : sorted;
    const className = cls ? cls.name : 'Lớp học';
    const now       = new Date().toLocaleDateString('vi-VN');

    // Load tất cả ảnh vai trò trước
    const roles    = [...new Set(displayed.map(s => s.role))];
    const roleImgs = {};
    let   loaded   = 0;
    const total    = roles.length;

    console.log(`📸 Tìm thấy ${total} loại vai trò cần tải ảnh.`);

    function doRender() {
        console.log("🎨 Đang vẽ bảng vinh danh lên Canvas...");
        const W        = 620;
        const HDR_H    = 110;
        const COL_H    = 42;
        const ROW_H    = 48;
        const FTR_H    = 48;
        const rows     = Math.max(displayed.length, 1);
        const H        = HDR_H + COL_H + rows * ROW_H + FTR_H + 10;

        const canvas = document.getElementById('prCanvas');
        if (!canvas) {
            console.error("❌ Không tìm thấy phần tử canvas #prCanvas");
            return;
        }
        canvas.width = W; canvas.height = H;
        const ctx    = canvas.getContext('2d');

        // BG
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#f5f3ff');
        bgGrad.addColorStop(1, '#ede9fe');
        ctx.fillStyle = bgGrad; ctx.fillRect(0,0,W,H);

        // HEADER gradient
        const hGrad = ctx.createLinearGradient(0,0,W,HDR_H);
        hGrad.addColorStop(0,'#7c3aed'); hGrad.addColorStop(1,'#a78bfa');
        ctx.fillStyle = hGrad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0,0,W,HDR_H+20,0); else ctx.rect(0,0,W,HDR_H+20);
        ctx.fill();

        // Decorative circle
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.arc(W-40, 20, 70, 0, Math.PI*2); ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Montserrat, Arial, sans-serif';
        ctx.fillText('👑 BẢNG XẾP HẠNG', W/2, 40);
        ctx.font = 'bold 16px Montserrat, Arial, sans-serif';
        ctx.fillText(className, W/2, 65);
        ctx.font = '11px Montserrat, Arial, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        let sub = now;
        if (schoolName) sub = schoolName + '   ·   ' + sub;
        if (teacher)    sub = teacher    + '   ·   ' + sub;
        ctx.fillText(sub, W/2, 88);

        // COLUMN HEADER
        const colY = HDR_H + 20;
        ctx.fillStyle = '#6d28d9';
        ctx.fillRect(0, colY, W, COL_H);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Montserrat, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('HẠNG', 18, colY + 26);
        ctx.fillText('HỌC SINH', 90, colY + 26);
        ctx.fillText('VAI TRÒ', 390, colY + 26);
        ctx.textAlign = 'right';
        ctx.fillText('ĐIỂM', W - 16, colY + 26);

        // ROWS
        const medals  = ['🥇','🥈','🥉'];
        const rcColors = { king:'#7c3aed', chancellor:'#d97706', officer:'#f97316', soldier:'#ef4444', peasant:'#6b7280' };

        if (displayed.length === 0) {
            const y = colY + COL_H;
            ctx.fillStyle = '#fff'; ctx.fillRect(0,y,W,80);
            ctx.fillStyle = '#9ca3af'; ctx.font = '13px Montserrat, Arial';
            ctx.textAlign = 'center'; ctx.fillText('Chưa có dữ liệu', W/2, y+45);
        } else {
            displayed.forEach((s, i) => {
                const y  = colY + COL_H + i * ROW_H;
                const rc = prRoleConf(s.role);

                ctx.fillStyle = i < 3 ? '#fef9ee' : (i%2===0 ? '#fff' : '#f8f6ff');
                ctx.fillRect(0, y, W, ROW_H);

                // Rank
                ctx.font = i < 3 ? 'bold 18px Arial' : 'bold 13px Montserrat, Arial';
                ctx.fillStyle = i===0?'#f59e0b':i===1?'#9ca3af':i===2?'#f97316':'#9ca3af';
                ctx.textAlign = 'center';
                ctx.fillText(medals[i] || (i+1), 44, y + ROW_H/2 + 6);

                // Role image circle (clipped)
                const img = roleImgs[s.role];
                const cx  = 78; const cy = y + ROW_H/2;
                if (img) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx, cy, 17, 0, Math.PI*2);
                    ctx.clip();
                    ctx.drawImage(img, cx-17, cy-17, 34, 34);
                    ctx.restore();
                    // Border circle
                    ctx.strokeStyle = rcColors[s.role] || '#6b7280';
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI*2); ctx.stroke();
                } else {
                    // Fallback colored circle
                    ctx.fillStyle = rc.bg;
                    ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI*2); ctx.fill();
                    ctx.font = '14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(rc.emoji, cx, cy+5);
                }

                // Name
                const maxLen = 20;
                const nameTxt = (s.name || "").length > maxLen ? s.name.slice(0, maxLen) + '…' : (s.name || "HS");
                ctx.font = i < 3 ? 'bold 13px Montserrat, Arial' : '13px Montserrat, Arial';
                ctx.fillStyle = '#111827';
                ctx.textAlign = 'left';
                ctx.fillText(nameTxt, 102, y + ROW_H/2 + 5);

                // Role badge pill
                const badgeX = 385; const badgeY = y + ROW_H/2 - 11;
                const badgeW = 100; const badgeH = 22;
                ctx.fillStyle = rc.bg;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 11); else ctx.rect(badgeX, badgeY, badgeW, badgeH);
                ctx.fill();
                ctx.fillStyle = rcColors[s.role] || '#6b7280';
                ctx.font = 'bold 11px Montserrat, Arial';
                ctx.textAlign = 'center';
                ctx.fillText(rc.emoji + ' ' + rc.label, badgeX + badgeW/2, badgeY + 15);

                // Score
                ctx.font = 'bold 14px Montserrat, Arial';
                ctx.fillStyle = '#7c3aed';
                ctx.textAlign = 'right';
                ctx.fillText(s.score + ' đ', W - 14, y + ROW_H/2 + 5);

                // Divider
                ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, y+ROW_H); ctx.lineTo(W, y+ROW_H); ctx.stroke();
            });
        }

        // FOOTER
        const fY = colY + COL_H + displayed.length * ROW_H;
        ctx.fillStyle = '#ede9fe'; ctx.fillRect(0, fY, W, FTR_H);
        ctx.fillStyle = '#7c3aed'; ctx.font = '12px Montserrat, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`📊 Tổng ${students.length} học sinh   ·   Được tạo bởi: Đường đến Ngôi Vua`, W/2, fY + 28);

        console.log("✅ Vẽ xong. Đang tạo file tải về...");

        // DOWNLOAD
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const safeFileName = (className || 'lop').replace(/[^a-z0-9àáạảãâầPerspectiveấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '').replace(/\s+/g, '-');
            link.download = `vinh-danh-${safeFileName}-${now.replace(/\//g, '-')}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log("💾 Đã kích hoạt lệnh tải xuống.");
        } catch (err) {
            console.error("❌ Lỗi khi xuất ảnh:", err);
            alert("Có lỗi khi tạo ảnh. Vui lòng thử lại!");
        }
    }

    // Load ảnh vai trò
    if (total === 0) { doRender(); return; }
    roles.forEach(role => {
        const rc  = prRoleConf(role);
        const img = new Image();
        img.onload  = () => { 
            roleImgs[role] = img; 
            if (++loaded >= total) doRender(); 
        };
        img.onerror = () => {
            console.warn(`⚠️ Không tải được ảnh vai trò: ${rc.img}`);
            if (++loaded >= total) doRender(); 
        };
        img.src = rc.img;
    });
}
window.prDownloadImage = prDownloadImage;


// ============================================================
// CHIA SẺ QUA ZALO
// ============================================================
function prShareZalo() {
    prCopyText();
    setTimeout(() => {
        window.open('https://zalo.me/', '_blank');
        alert('✅ Nội dung đã được copy!\nVui lòng dán (Ctrl+V) vào cửa sổ chat Zalo của phụ huynh.');
    }, 400);
}
window.prShareZalo = prShareZalo;

// ============================================================
// ÁP DỤNG CÀI ĐẶT
// ============================================================
function prApplySettings() { prSwitchTab('preview'); }
window.prApplySettings = prApplySettings;

// ============================================================
// TIỆN ÍCH
// ============================================================
function escPR(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// KHỞI ĐỘNG
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initParentReportFeature, 700);
});
