document.addEventListener('DOMContentLoaded', () => {
    // ===== STATE MANAGEMENT =====
    let STATE = {
        config: {
            className: '',
            school: '',
            year: '2025 - 2026',
            teacher: '',
            title: 'Kỉ Yếu Cuối Năm',
            slogan: 'Hẹn gặp lại sau mùa hè nhé! 🌻',
            message: 'Các con ơi, một năm học đã qua thật nhanh. Cô/Thầy rất tự hào về mỗi bạn trong lớp mình. Chúc các con có một mùa hè thật vui và ý nghĩa! ❤️',
            theme: 'sakura',
            font: 'dancing',
            effect: 'petals',
            layout: 'bubble',
            memberHoverSound: true,
            customAudioData: '',
            customAudioName: '',
            maxMedia: 120,
            maxVideos: 2,
            maxVideoMB: 10,
            timelineItems: [],
            guestbookNotes: [],
            yearbookId: '',
            guestbookAdminCode: ''
        },
        photos: [] // Array of { id, dataUrl/embedUrl, type, mimeType, name, msg }
    };

    const DEFAULT_MAX_MEDIA = 120;
    const HARD_MAX_MEDIA = 300;
    const DEFAULT_MAX_VIDEOS = 2;
    const DEFAULT_MAX_VIDEO_MB = 10;
    const CREATIVE_ITEM_COUNT = 4;
    const DISC_PAGE_SIZE = 12;
    const DISC_AUTO_PAGE_MS = 7000;
    const DRAFT_DB_NAME = 'kiyeu-yearbook-drafts';
    const DRAFT_STORE_NAME = 'drafts';
    const DRAFT_KEY = 'active';
    const DRAFT_FALLBACK_KEY = 'kiyeu_yearbook_draft_v1';
    const KYYEU_ACCESS_DB_URL = 'https://giaoviencongnghe-3c2a9-default-rtdb.asia-southeast1.firebasedatabase.app';
    const KYYEU_CODES_REF = 'kyyeu_access_codes';
    const KYYEU_EXPORT_CODE_KEY = 'kyyeu_export_access_code';
    const KYYEU_EXPORT_EMAIL_KEY = 'kyyeu_export_access_email';
    const KYYEU_ACCESS_SESSION_KEY = 'kyyeu_access_session';
    const KYYEU_GUEST_SESSION_EMAIL = 'guest@kyyeu.local';
    const KYYEU_LEGACY_EXPORT_CUTOFF = new Date('2026-05-21T00:00:00+07:00').getTime();
    const KYYEU_LEGACY_FREE_EXPORTS = 3;
    const KYYEU_NEW_CODE_EXPORTS = 1;
    const EXPORT_PAYMENT = {
        amount: 30000,
        bankCode: 'BIDV',
        accountNo: '6790470451',
        accountName: 'NGUYEN THE DUC',
        branch: 'BIDV - PGD Trảng Dài',
        adminZalo: '0975509490',
        defaultNote: 'KYYEU XUAT FILE',
        zaloGroupUrl: 'https://zalo.me/g/uafjqjcpskahgt6xa9gh'
    };
    let draftDbPromise = null;
    let draftSaveTimer = null;
    let isRestoringDraft = false;

    function getExportTransferNote() {
        const className = cleanPaymentNotePart(STATE.config.className || '');
        return className ? `${EXPORT_PAYMENT.defaultNote} ${className}` : EXPORT_PAYMENT.defaultNote;
    }

    function cleanPaymentNotePart(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .slice(0, 40);
    }

    function getExportPaymentQrUrl(note = EXPORT_PAYMENT.defaultNote) {
        const params = new URLSearchParams({
            amount: String(EXPORT_PAYMENT.amount),
            addInfo: note,
            accountName: EXPORT_PAYMENT.accountName
        });
        return `https://img.vietqr.io/image/${EXPORT_PAYMENT.bankCode}-${EXPORT_PAYMENT.accountNo}-compact2.png?${params.toString()}`;
    }

    function syncExportPaymentUi() {
        const transferNoteInput = document.getElementById('kyYeuTransferNote');
        const paymentQr = document.getElementById('kyYeuPaymentQr');
        const note = getExportTransferNote();
        if (transferNoteInput) transferNoteInput.value = note;
        if (paymentQr) paymentQr.src = getExportPaymentQrUrl(note);
    }

    function normalizeKyYeuExportCode(code) {
        return String(code || '').toUpperCase().replace(/\s+/g, '').trim();
    }

    function normalizeKyYeuExportEmail(email) {
        return String(email || '').toLowerCase().trim();
    }

    function isValidKyYeuExportEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeKyYeuExportEmail(email));
    }

    function getKyYeuSessionEmail() {
        try {
            const rawSession = sessionStorage.getItem(KYYEU_ACCESS_SESSION_KEY);
            const accessSession = rawSession ? JSON.parse(rawSession) : null;
            const email = normalizeKyYeuExportEmail(accessSession && accessSession.email);
            if (!email || email === KYYEU_GUEST_SESSION_EMAIL) return '';
            if (Number(accessSession.expiresAt) && Number(accessSession.expiresAt) <= Date.now()) return '';
            return isValidKyYeuExportEmail(email) ? email : '';
        } catch {
            return '';
        }
    }

    function getSavedKyYeuExportEmail() {
        try {
            return normalizeKyYeuExportEmail(localStorage.getItem(KYYEU_EXPORT_EMAIL_KEY) || '');
        } catch {
            return '';
        }
    }

    function saveKyYeuExportEmail(email) {
        try {
            localStorage.setItem(KYYEU_EXPORT_EMAIL_KEY, normalizeKyYeuExportEmail(email));
        } catch {}
    }

    function getSavedKyYeuExportCode() {
        try {
            return normalizeKyYeuExportCode(localStorage.getItem(KYYEU_EXPORT_CODE_KEY) || '');
        } catch {
            return '';
        }
    }

    function saveKyYeuExportCode(code) {
        try {
            localStorage.setItem(KYYEU_EXPORT_CODE_KEY, normalizeKyYeuExportCode(code));
        } catch {}
    }

    function kyYeuExportCodeUrl(code) {
        return `${KYYEU_ACCESS_DB_URL}/${KYYEU_CODES_REF}/${encodeURIComponent(normalizeKyYeuExportCode(code))}.json`;
    }

    function isLegacyKyYeuCode(codeData) {
        const createdTime = new Date(codeData && codeData.createdAt ? codeData.createdAt : '').getTime();
        return Number.isFinite(createdTime) && createdTime < KYYEU_LEGACY_EXPORT_CUTOFF;
    }

    function getKyYeuExportLimit(codeData) {
        const explicitLimit = Number(codeData && codeData.exportLimit);
        if (Number.isFinite(explicitLimit) && explicitLimit >= 0) return explicitLimit;
        return isLegacyKyYeuCode(codeData) ? KYYEU_LEGACY_FREE_EXPORTS : KYYEU_NEW_CODE_EXPORTS;
    }

    function makeKyYeuReservationId() {
        const bytes = new Uint8Array(6);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(bytes);
        } else {
            for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
        }
        return `${Date.now().toString(36)}-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
    }

    async function reserveKyYeuExportTurn(code, email) {
        const normalizedCode = normalizeKyYeuExportCode(code);
        const normalizedEmail = normalizeKyYeuExportEmail(email);
        if (!normalizedCode.startsWith('KYYEU-')) {
            return { ok: false, reason: 'Mã Kỷ Yếu thường bắt đầu bằng KYYEU-.' };
        }

        if (!isValidKyYeuExportEmail(normalizedEmail)) {
            return { ok: false, reason: 'Vui lòng nhập đúng Gmail dùng mã KYYEU.' };
        }

        const url = kyYeuExportCodeUrl(normalizedCode);
        const reservationId = makeKyYeuReservationId();
        for (let attempt = 0; attempt < 3; attempt += 1) {
            const response = await fetch(url, { headers: { 'X-Firebase-ETag': 'true' } });
            if (!response.ok) {
                return { ok: false, reason: 'Không kiểm tra được mã xuất. Vui lòng thử lại hoặc liên hệ admin.' };
            }

            const etag = response.headers.get('ETag');
            const codeData = await response.json();
            if (!etag) return { ok: false, reason: 'Không khóa được lượt xuất để trừ an toàn. Vui lòng thử lại hoặc liên hệ admin.' };
            if (!codeData) return { ok: false, reason: 'Mã không tồn tại hoặc đã nhập sai.' };
            if (codeData.active === false) return { ok: false, reason: 'Mã này đã bị thu hồi. Vui lòng liên hệ admin.' };

            const assignedEmail = normalizeKyYeuExportEmail(codeData.usedBy);
            if (assignedEmail && assignedEmail !== normalizedEmail) {
                return { ok: false, reason: `Mã ${normalizedCode} đã được gắn với Gmail khác. Mỗi mã chỉ dùng cho 1 Gmail, vui lòng liên hệ admin để được cấp mã riêng.` };
            }

            const exportLimit = getKyYeuExportLimit(codeData);
            const exportCount = Number(codeData.exportCount) || 0;
            const isFirstEmailBind = !assignedEmail;
            if (exportCount >= exportLimit) {
                return {
                    ok: false,
                    reason: `Mã ${normalizedCode} đã hết lượt xuất (${exportCount}/${exportLimit}).\n\nVui lòng chuyển khoản ${EXPORT_PAYMENT.amount.toLocaleString('vi-VN')}đ/lượt hoặc liên hệ Zalo admin ${EXPORT_PAYMENT.adminZalo} để được cộng lượt.`
                };
            }

            const now = new Date().toISOString();
            const nextData = {
                ...codeData,
                key: codeData.key || normalizedCode,
                usedBy: assignedEmail || normalizedEmail,
                usedAt: codeData.usedAt || now,
                usageCount: isFirstEmailBind ? (Number(codeData.usageCount) || 0) + 1 : (Number(codeData.usageCount) || 1),
                exportCount: exportCount + 1,
                exportLimit,
                lastExportAt: now,
                lastExportReservationId: reservationId,
                lastExportBy: normalizedEmail,
                lastExportClass: STATE.config.className || '',
                lastExportYear: STATE.config.year || ''
            };

            const saveResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'if-match': etag
                },
                body: JSON.stringify(nextData)
            });

            if (saveResponse.status === 412) continue;
            if (!saveResponse.ok) {
                return { ok: false, reason: 'Không trừ được lượt xuất. Vui lòng thử lại hoặc liên hệ admin.' };
            }

            return {
                ok: true,
                code: normalizedCode,
                email: normalizedEmail,
                reservationId,
                exportCount: exportCount + 1,
                exportLimit
            };
        }

        return { ok: false, reason: 'Mã đang được dùng ở nơi khác. Vui lòng bấm xuất lại sau vài giây.' };
    }

    async function rollbackKyYeuExportTurn(reservation) {
        if (!reservation || !reservation.code || !reservation.reservationId) return;
        const url = kyYeuExportCodeUrl(reservation.code);
        try {
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const response = await fetch(url, { headers: { 'X-Firebase-ETag': 'true' } });
                if (!response.ok) return;
                const etag = response.headers.get('ETag');
                const codeData = await response.json();
                if (!etag) return;
                if (!codeData || codeData.lastExportReservationId !== reservation.reservationId) return;
                const nextData = {
                    ...codeData,
                    exportCount: Math.max((Number(codeData.exportCount) || 1) - 1, 0),
                    lastExportReservationId: ''
                };
                const saveResponse = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'if-match': etag
                    },
                    body: JSON.stringify(nextData)
                });
                if (saveResponse.status === 412) continue;
                return;
            }
        } catch {}
    }

    async function requestKyYeuExportTurn() {
        const codeInput = document.getElementById('kyYeuExportCode');
        const emailInput = document.getElementById('kyYeuExportEmail');
        const initialCode = normalizeKyYeuExportCode((codeInput && codeInput.value) || getSavedKyYeuExportCode());
        const initialEmail = normalizeKyYeuExportEmail((emailInput && emailInput.value) || getKyYeuSessionEmail() || getSavedKyYeuExportEmail());
        let code = initialCode;
        let email = initialEmail;
        if (!code) {
            code = normalizeKyYeuExportCode(prompt('Nhập mã KYYEU để xuất ZIP:') || '');
        }
        if (!code) return null;
        if (!email) {
            email = normalizeKyYeuExportEmail(prompt('Nhập Gmail sử dụng mã KYYEU:') || '');
        }
        if (!isValidKyYeuExportEmail(email)) {
            alert('Vui lòng nhập đúng Gmail dùng mã KYYEU.');
            return null;
        }

        if (codeInput) codeInput.value = code;
        if (emailInput) emailInput.value = email;
        let result;
        try {
            result = await reserveKyYeuExportTurn(code, email);
        } catch (error) {
            alert('Không kiểm tra được mã xuất. Vui lòng kiểm tra mạng hoặc liên hệ admin.');
            return null;
        }
        if (!result.ok) {
            alert(`${result.reason}\n\nSTK: ${EXPORT_PAYMENT.accountNo} - ${EXPORT_PAYMENT.accountName}\nNội dung CK: ${getExportTransferNote()}`);
            return null;
        }

        saveKyYeuExportCode(code);
        saveKyYeuExportEmail(email);
        return result;
    }

    function createGuestbookToken(prefix = '') {
        const bytes = new Uint8Array(6);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(bytes);
        } else {
            for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
        }
        const token = Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 10).toUpperCase();
        return `${prefix}${Date.now().toString(36).toUpperCase()}${token}`;
    }

    function ensureGuestbookAccessConfig(config = STATE.config) {
        if (!config.yearbookId) {
            config.yearbookId = `ky_${createGuestbookToken('').toLowerCase()}`;
        }
        if (!config.guestbookAdminCode) {
            config.guestbookAdminCode = `KY-${createGuestbookToken('').slice(-6)}`;
        }
        return config;
    }

    function syncGuestbookAccessUi() {
        ensureGuestbookAccessConfig();
        const codeInput = document.getElementById('guestbookAdminCode');
        const idInput = document.getElementById('guestbookYearbookId');
        if (codeInput) codeInput.value = STATE.config.guestbookAdminCode || '';
        if (idInput) idInput.value = STATE.config.yearbookId || '';
    }

    function getLiveGuestbookExportCss() {
        return `
.guestbook-admin-export{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;margin:0 0 12px;padding:12px 14px;border:1px solid var(--card-border);border-radius:14px;background:var(--bg);text-align:left}
.guestbook-admin-export strong{display:block;color:var(--text);font-size:.9rem;margin-bottom:3px}
.guestbook-admin-export span{display:block;color:var(--text2);font-size:.78rem;line-height:1.45}
.guestbook-admin-fields{display:flex;gap:6px;align-items:center}
.guestbook-admin-fields input{width:130px;padding:10px 12px;border:2px solid var(--card-border);border-radius:10px;background:var(--card);color:var(--primary);font-weight:900;text-align:center;letter-spacing:.04em}
.live-guestbook{margin-top:22px;padding:20px;border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.68));border:1px solid rgba(255,255,255,.82);box-shadow:0 20px 44px rgba(74,14,40,.1);text-align:left}
.live-guestbook-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
.live-guestbook-head h3{margin:0 0 5px;color:var(--text);font-size:1.05rem;font-weight:900}
.live-guestbook-head p{margin:0;color:var(--text2);font-size:.88rem;line-height:1.55}
.live-guestbook-manage{border:0;border-radius:999px;padding:9px 13px;background:var(--gradient);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 10px 20px rgba(232,67,147,.18);white-space:nowrap}
.live-guestbook-form{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:9px;align-items:center;margin:12px 0 16px}
.live-guestbook-form input,.live-guestbook-form select,.live-guestbook-form textarea,.live-admin-login input{width:100%;border:2px solid rgba(232,67,147,.16);border-radius:12px;background:#fff;color:var(--text);font-family:'Quicksand',sans-serif;font-size:.9rem;outline:none;box-shadow:0 8px 18px rgba(74,14,40,.04)}
.live-guestbook-form input,.live-guestbook-form select,.live-admin-login input{min-height:42px;padding:9px 12px}
.live-guestbook-form textarea{grid-column:1 / -2;min-height:76px;padding:11px 12px;resize:vertical}
.live-guestbook-form input:focus,.live-guestbook-form select:focus,.live-guestbook-form textarea:focus,.live-admin-login input:focus{border-color:rgba(232,67,147,.42);box-shadow:0 0 0 4px rgba(232,67,147,.1)}
.live-guestbook-submit{align-self:stretch;border:0;border-radius:12px;background:var(--primary);color:#fff;font-weight:900;cursor:pointer;padding:10px 15px;box-shadow:0 10px 20px rgba(232,67,147,.16)}
.live-guestbook-status{min-height:18px;color:var(--text2);font-size:.84rem;margin:4px 0 12px}
.live-note-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.live-note{padding:15px;border-radius:16px;background:#fff;border:1px solid rgba(232,67,147,.12);box-shadow:0 10px 22px rgba(74,14,40,.06)}
.live-note p{margin:0 0 12px;color:var(--text);font-size:.92rem;line-height:1.6;white-space:pre-wrap}
.live-note footer{display:flex;justify-content:space-between;gap:10px;color:var(--text2);font-size:.78rem;font-weight:800}
.live-empty{grid-column:1 / -1;margin:0;color:var(--text2);font-size:.9rem;text-align:center;padding:14px;border:1px dashed rgba(232,67,147,.22);border-radius:14px;background:rgba(255,255,255,.55)}
.live-admin-panel{display:none;margin-top:16px;padding:15px;border-radius:16px;background:rgba(255,255,255,.74);border:1px dashed rgba(232,67,147,.28)}
.live-admin-panel.show{display:block}
.live-admin-login{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-bottom:12px}
.live-admin-login button,.live-note-actions button{border:0;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer}
.live-admin-login button,.live-note-approve{background:var(--primary);color:#fff}
.live-note-delete{background:#fff0f0;color:#b42318}
.live-note-actions{display:flex;gap:8px;margin-top:11px;justify-content:flex-end}
.live-admin-title{margin:0 0 10px;color:var(--text);font-size:.95rem;font-weight:900}
@media(max-width:600px){.guestbook-admin-export{grid-template-columns:1fr}.guestbook-admin-fields{flex-direction:column;align-items:stretch}.guestbook-admin-fields input{width:100%}.live-guestbook{padding:15px;border-radius:18px}.live-guestbook-head{flex-direction:column}.live-guestbook-form{grid-template-columns:1fr}.live-guestbook-form textarea{grid-column:auto}.live-guestbook-submit{min-height:42px}.live-note-list{grid-template-columns:1fr}.live-admin-login{grid-template-columns:1fr}}
`;
    }
    
    const AI_TRAITS = [
        "Học bá Toán học 🧮", "Cây hài của lớp 😂", "Giọng ca vàng 🎤", 
        "Chuyên gia đi trễ ⏰", "Đại gia ngầm 💰", "Ngủ gật chuyên nghiệp 😴", 
        "Hot boy/Hot girl 🌟", "Hoa hậu thân thiện 🌸", "Thánh ăn vặt 🍕", 
        "Game thủ cừ khôi 🎮", "Sứ giả hòa bình 🕊️", "Thư viện sống 📚", 
        "Nhà sáng tạo nội dung 📱", "Bậc thầy trốn tìm 🥷", "Vựa muối của lớp 🧂", 
        "Idol giới trẻ 💫", "Học thần thoát tục ✨", "Thánh thả thính 💘", 
        "Nhà ngoại giao tài ba 🤝", "Nghệ sĩ múa bút ✍️", "Gương mặt thương hiệu 📸"
    ];

    // ===== DOM ELEMENTS =====
    // Modals & Buttons
    const settingsFab = document.getElementById('settingsFab');
    const importFab = document.getElementById('importFab');
    const settingsModal = document.getElementById('settingsModal');
    const btnCloseSettingsX = document.getElementById('btnCloseSettingsX');
    const jsonImportInput = document.getElementById('jsonImportInput');
    const emptyState = document.getElementById('emptyState');
    const draftStatusEl = document.getElementById('draftStatus');
    const btnClearDraft = document.getElementById('btnClearDraft');
    
    // Cover & Main Content
    const coverSection = document.getElementById('coverSection');
    const coverBook = document.getElementById('coverBook');
    const yearbookMain = document.getElementById('yearbookMain');
    const tapHint = document.getElementById('tapHint');
    const btnCloseYearbook = document.getElementById('btnCloseYearbook');
    const reactionButtons = document.querySelectorAll('.reaction-btn');
    const heartCount = document.getElementById('heartCount');
    const likeCount = document.getElementById('likeCount');
    
    // Audio
    const bgMusic = document.getElementById('bgMusic');
    const btnMusicToggle = document.getElementById('btnMusicToggle');
    let isMusicPlaying = false;

    function hasAudioSource() {
        return Boolean(bgMusic && bgMusic.getAttribute('src'));
    }

    function getMediaType(item) {
        if (item && item.type) return item.type;
        if (item && item.embedUrl) return 'embed';
        if (item && item.mimeType && item.mimeType.startsWith('video/')) return 'video';
        if (item && item.dataUrl && item.dataUrl.startsWith('data:video/')) return 'video';
        return 'image';
    }

    function isVideo(item) {
        return getMediaType(item) === 'video';
    }

    function isEmbed(item) {
        return getMediaType(item) === 'embed';
    }

    function getFileExtension(name = '') {
        const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
        return match ? match[1] : '';
    }

    function isHeicLikeMedia(item) {
        const mime = String((item && item.mimeType) || (item && item.type) || getDataUrlMime(item && item.dataUrl) || '').toLowerCase();
        const ext = getFileExtension((item && item.name) || '');
        return ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'].includes(mime)
            || ext === 'heic'
            || ext === 'heif';
    }

    function getHeicLikeMediaNames(items = STATE.photos) {
        return items
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => item && !isVideoLike(item) && isHeicLikeMedia(item))
            .map(({ item, idx }) => item.name || `Anh ${idx + 1}`);
    }

    function heicAndroidWarning(names) {
        const sample = names.slice(0, 5).join(', ');
        const more = names.length > 5 ? `... và ${names.length - 5} ảnh khác` : '';
        return `Có ${names.length} ảnh dạng HEIC/HEIF (${sample}${more}). Định dạng này thường xem được trên iPhone nhưng không hiển thị ổn định trên Android. Hãy đổi các ảnh này sang JPG/PNG rồi xuất lại web.`;
    }

    function isVideoLike(item) {
        const type = getMediaType(item);
        return type === 'video' || type === 'embed';
    }

    function countVideoItems() {
        return STATE.photos.filter(isVideoLike).length;
    }

    function getCoverYearParts(yearText) {
        const years = String(yearText || '').match(/\d{4}/g) || [];
        if (years.length >= 2) return [years[0], years[1]];
        if (years.length === 1) return [years[0], ''];
        return ['20...', '20...'];
    }

    function getCoverClassLabel(className) {
        const value = String(className || '').trim();
        if (!value) return 'Lớp ___';
        return /^lớp\s/i.test(value) ? value : `Lớp ${value}`;
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = repairMojibakeText(value);
    }

    function setDraftStatus(text, mode = 'loading') {
        if (!draftStatusEl) return;
        draftStatusEl.textContent = text;
        draftStatusEl.classList.remove('is-ok', 'is-error', 'is-loading');
        draftStatusEl.classList.add(`is-${mode}`);
    }

    function formatDraftTime(timestamp) {
        if (!timestamp) return '';
        try {
            return new Date(timestamp).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '';
        }
    }

    function openDraftDb() {
        if (!window.indexedDB) return Promise.reject(new Error('IndexedDB is not available'));
        if (draftDbPromise) return draftDbPromise;

        draftDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DRAFT_DB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
                    db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'key' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Cannot open draft database'));
        });

        return draftDbPromise;
    }

    async function readIndexedDraft() {
        const db = await openDraftDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(DRAFT_STORE_NAME, 'readonly');
            const request = transaction.objectStore(DRAFT_STORE_NAME).get(DRAFT_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error('Cannot read draft'));
        });
    }

    async function writeIndexedDraft(draft) {
        const db = await openDraftDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(DRAFT_STORE_NAME, 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error('Cannot save draft'));
            transaction.objectStore(DRAFT_STORE_NAME).put(draft);
        });
    }

    async function deleteIndexedDraft() {
        const db = await openDraftDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(DRAFT_STORE_NAME, 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error('Cannot delete draft'));
            transaction.objectStore(DRAFT_STORE_NAME).delete(DRAFT_KEY);
        });
    }

    async function readDraft() {
        try {
            const draft = await readIndexedDraft();
            if (draft) return draft;
        } catch (err) {
            console.warn('IndexedDB draft read failed, trying localStorage fallback.', err);
        }

        try {
            const raw = localStorage.getItem(DRAFT_FALLBACK_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            console.warn('localStorage draft read failed.', err);
            return null;
        }
    }

    async function saveDraftNow(showStatus = false) {
        if (isRestoringDraft) return;
        if (settingsModal && settingsModal.classList.contains('show')) saveFormToState();
        normalizeStateText();

        const updatedAt = Date.now();
        const draft = {
            key: DRAFT_KEY,
            version: 1,
            updatedAt,
            state: window.structuredClone ? structuredClone(STATE) : JSON.parse(JSON.stringify(STATE))
        };

        if (showStatus) setDraftStatus('Đang lưu bản nháp...', 'loading');

        try {
            await writeIndexedDraft(draft);
            setDraftStatus(`Đã tự lưu: ${formatDraftTime(updatedAt)}`, 'ok');
        } catch (err) {
            console.warn('IndexedDB draft save failed, trying localStorage fallback.', err);
            try {
                localStorage.setItem(DRAFT_FALLBACK_KEY, JSON.stringify(draft));
                setDraftStatus(`Đã tự lưu: ${formatDraftTime(updatedAt)}`, 'ok');
            } catch (fallbackErr) {
                console.error('Draft save failed.', fallbackErr);
                setDraftStatus('Chưa lưu được bản nháp. Hãy xuất JSON dự phòng.', 'error');
            }
        }
    }

    function scheduleDraftSave(showStatus = false) {
        if (isRestoringDraft) return;
        if (showStatus) setDraftStatus('Đang lưu bản nháp...', 'loading');
        clearTimeout(draftSaveTimer);
        draftSaveTimer = setTimeout(() => {
            saveDraftNow(showStatus);
        }, 500);
    }

    async function restoreDraftIfAvailable() {
        isRestoringDraft = true;
        setDraftStatus('Đang kiểm tra bản nháp...', 'loading');
        try {
            const draft = await readDraft();
            if (draft && draft.state && draft.state.config) {
                STATE = draft.state;
                setDraftStatus(`Đã khôi phục bản nháp: ${formatDraftTime(draft.updatedAt)}`, 'ok');
            } else {
                setDraftStatus('Chưa có bản nháp trên trình duyệt này.', 'loading');
            }
        } finally {
            isRestoringDraft = false;
        }
    }

    async function clearDraft() {
        clearTimeout(draftSaveTimer);
        setDraftStatus('Đang xóa bản nháp...', 'loading');
        try {
            await deleteIndexedDraft();
        } catch (err) {
            console.warn('IndexedDB draft delete failed.', err);
        }
        try { localStorage.removeItem(DRAFT_FALLBACK_KEY); } catch {}
        setDraftStatus('Đã xóa bản nháp trên trình duyệt này.', 'loading');
    }

    const CP1252_BYTE_MAP = {
        '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
        'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E,
        '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
        '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F
    };
    const MOJIBAKE_RUN_RE = /[\u0080-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2018-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]{2,}/g;

    function decodeMojibakeRun(run) {
        const bytes = [];
        for (const ch of run) {
            const code = ch.charCodeAt(0);
            if (code <= 0xff) bytes.push(code);
            else if (CP1252_BYTE_MAP[ch] != null) bytes.push(CP1252_BYTE_MAP[ch]);
            else return run;
        }
        try {
            if (window.TextDecoder) {
                return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
            }
            return decodeURIComponent(bytes.map(byte => `%${byte.toString(16).padStart(2, '0')}`).join(''));
        } catch {
            return run;
        }
    }

    function repairMojibakeText(value) {
        if (value == null) return '';
        let text = String(value);
        for (let i = 0; i < 3; i++) {
            const next = text.replace(MOJIBAKE_RUN_RE, decodeMojibakeRun);
            if (next === text) break;
            text = next;
        }
        return text;
    }

    function normalizeTextFields(target, keys) {
        if (!target) return;
        keys.forEach(key => {
            if (typeof target[key] === 'string') target[key] = repairMojibakeText(target[key]);
        });
    }

    function normalizeStateText() {
        normalizeTextFields(STATE.config, ['className', 'school', 'year', 'teacher', 'title', 'slogan', 'message', 'customAudioName']);
        if (Array.isArray(STATE.config.timelineItems)) {
            STATE.config.timelineItems.forEach(item => normalizeTextFields(item, ['icon', 'title', 'text', 'mediaName']));
        }
        if (Array.isArray(STATE.config.guestbookNotes)) {
            STATE.config.guestbookNotes.forEach(note => normalizeTextFields(note, ['title', 'text', 'sign']));
        }
        STATE.photos.forEach(photo => normalizeTextFields(photo, ['name', 'msg', 'trait']));
    }

    function repairDocumentText(root = document.body) {
        if (!root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        textNodes.forEach(node => {
            const fixed = repairMojibakeText(node.nodeValue);
            if (fixed !== node.nodeValue) node.nodeValue = fixed;
        });
        root.querySelectorAll('[title],[placeholder],[alt],[aria-label]').forEach(el => {
            ['title', 'placeholder', 'alt', 'aria-label'].forEach(attr => {
                if (!el.hasAttribute(attr)) return;
                const fixed = repairMojibakeText(el.getAttribute(attr));
                if (fixed !== el.getAttribute(attr)) el.setAttribute(attr, fixed);
            });
        });
    }

    function mediaPreviewHtml(item, altText = '') {
        if (isEmbed(item)) {
            const thumb = getEmbedThumbnailUrl(item);
            if (thumb) return `<div class="embed-preview has-thumb"><img src="${thumb}" alt="${altText}"><span class="embed-play">▶</span><span>Video YouTube</span></div>`;
            return `<div class="embed-preview"><span class="embed-play">▶</span><span>Link video</span></div>`;
        }
        if (isVideo(item)) {
            return `<video src="${item.dataUrl}" muted preload="metadata" playsinline></video><span class="video-play-badge">▶</span>`;
        }
        return `<img src="${item.dataUrl}" alt="${altText}">`;
    }

    function getStableIndex(value, length) {
        const text = String(value || '');
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
        return Math.abs(hash) % Math.max(length, 1);
    }

    function getPhotoTrait(photo, idx = 0) {
        return photo?.trait || AI_TRAITS[getStableIndex(`${photo?.name || ''}-${idx}`, AI_TRAITS.length)];
    }

    function getDiscPhotos(photos = STATE.photos) {
        return photos
            .map((photo, idx) => ({ photo, idx }))
            .filter(item => item.photo && !isEmbed(item.photo));
    }

    function getDiscPageItems(photos = STATE.photos, page = 0) {
        const items = getDiscPhotos(photos);
        const totalPages = Math.max(1, Math.ceil(items.length / DISC_PAGE_SIZE));
        const safePage = ((Number(page) || 0) % totalPages + totalPages) % totalPages;
        return {
            items: items.slice(safePage * DISC_PAGE_SIZE, (safePage + 1) * DISC_PAGE_SIZE),
            page: safePage,
            totalPages,
            totalItems: items.length
        };
    }

    function creativeMediaThumb(item, altText = '') {
        if (!item || isEmbed(item)) return '';
        if (isVideo(item)) return `<video src="${item.dataUrl}" muted preload="metadata" playsinline></video>`;
        return `<img src="${item.dataUrl}" alt="${altText}">`;
    }

    function getDefaultTimelineItems(config = STATE.config) {
        const classLabel = getCoverClassLabel(config.className);
        return [
            { icon: '🌱', title: 'Ngày đầu thật mới', text: `${classLabel} bắt đầu một năm học với thật nhiều háo hức và những gương mặt thân quen.` },
            { icon: '📚', title: 'Cùng nhau cố gắng', text: 'Từng bài học, từng buổi sinh hoạt và từng lần giúp nhau đã làm lớp mình gần nhau hơn.' },
            { icon: '🎉', title: 'Những khoảnh khắc rực rỡ', text: 'Ảnh lớp, hoạt động, tiếng cười và những câu chuyện nhỏ trở thành ký ức rất riêng.' },
            { icon: '🌈', title: 'Hẹn gặp lại', text: `Khép lại ${config.year || 'năm học này'}, mong mỗi bạn luôn tự tin, tử tế và bay cao hơn nữa.` }
        ];
    }

    function getDefaultGuestbookItems(config = STATE.config) {
        const classLabel = getCoverClassLabel(config.className);
        return [
            {
                title: 'Gửi cả lớp',
                text: config.message || 'Một năm học đã qua thật nhanh. Cô/Thầy rất tự hào về mỗi bạn trong lớp mình.',
                sign: config.teacher || 'Giáo viên chủ nhiệm',
                featured: true
            },
            {
                title: 'Điều muốn nhớ',
                text: `${classLabel} đã cùng nhau có những ngày học tập, vui chơi và trưởng thành rất đáng quý.`,
                sign: 'Kỉ yếu cuối năm'
            },
            {
                title: 'Lời hẹn',
                text: config.slogan || 'Hẹn gặp lại sau mùa hè nhé!',
                sign: config.year || '2025 - 2026'
            },
            {
                title: 'Cảm ơn',
                text: 'Cảm ơn những nụ cười, những lần cố gắng và những kỉ niệm đã làm nên một năm học thật đẹp.',
                sign: classLabel
            }
        ];
    }

    function resolveTimelineConfig(config = STATE.config) {
        const defaults = getDefaultTimelineItems(config);
        const custom = Array.isArray(config.timelineItems) ? config.timelineItems : [];
        return defaults.map((item, idx) => ({
            icon: custom[idx]?.icon || item.icon,
            title: custom[idx]?.title || item.title,
            text: custom[idx]?.text || item.text,
            mediaDataUrl: custom[idx]?.mediaDataUrl || '',
            mediaName: custom[idx]?.mediaName || '',
            mediaMimeType: custom[idx]?.mediaMimeType || ''
        }));
    }

    function resolveGuestbookConfig(config = STATE.config) {
        const defaults = getDefaultGuestbookItems(config);
        const custom = Array.isArray(config.guestbookNotes) ? config.guestbookNotes : [];
        return defaults.map((note, idx) => ({
            title: custom[idx]?.title || note.title,
            text: custom[idx]?.text || note.text,
            sign: custom[idx]?.sign || note.sign,
            featured: idx === 0
        }));
    }

    function buildTimelineItems(photos = STATE.photos, config = STATE.config) {
        const picked = photos.filter(p => !isEmbed(p)).slice(0, CREATIVE_ITEM_COUNT);
        const base = resolveTimelineConfig(config);
        return base.map((item, idx) => {
            const customMedia = item.mediaDataUrl ? {
                dataUrl: item.mediaDataUrl,
                type: 'image',
                mimeType: item.mediaMimeType || 'image/*',
                name: item.mediaName || item.title
            } : null;
            return { ...item, media: customMedia || picked[idx] || null };
        });
    }

    function buildGuestbookItems(config = STATE.config) {
        return resolveGuestbookConfig(config);
    }

    function renderCreativeSections() {
        const timelineBoard = document.getElementById('timelineBoard');
        if (timelineBoard) {
            timelineBoard.innerHTML = buildTimelineItems().map(item => {
                const thumb = item.media ? `<div class="timeline-thumb">${creativeMediaThumb(item.media, escapeHtml(item.media.name || item.title))}</div>` : '';
                return `
                    <article class="timeline-card">
                        <div class="timeline-dot">${escapeHtml(item.icon)}</div>
                        <h3>${escapeHtml(item.title)}</h3>
                        <p>${escapeHtml(item.text)}</p>
                        ${thumb}
                    </article>
                `;
            }).join('');
        }

        const guestbookGrid = document.getElementById('guestbookGrid');
        if (guestbookGrid) {
            guestbookGrid.innerHTML = buildGuestbookItems().map(note => `
                <article class="guest-note ${note.featured ? 'featured' : ''}">
                    <h3>${escapeHtml(note.title)}</h3>
                    <p>${escapeHtml(note.text).replace(/\n/g, '<br>')}</p>
                    <span class="guest-sign">${escapeHtml(note.sign)}</span>
                </article>
            `).join('');
        }
    }

    function normalizeVideoEmbedUrl(rawUrl) {
        let url;
        try {
            url = new URL(rawUrl.trim());
        } catch {
            return null;
        }

        const host = url.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') {
            const id = url.pathname.split('/').filter(Boolean)[0];
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }

        if (host === 'youtube.com' || host === 'm.youtube.com') {
            let id = url.searchParams.get('v');
            const parts = url.pathname.split('/').filter(Boolean);
            if (!id && ['shorts', 'embed', 'live'].includes(parts[0])) id = parts[1];
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }

        if (host === 'drive.google.com') {
            const parts = url.pathname.split('/').filter(Boolean);
            const fileIndex = parts.indexOf('d');
            const id = fileIndex >= 0 ? parts[fileIndex + 1] : url.searchParams.get('id');
            return id ? `https://drive.google.com/file/d/${id}/preview` : null;
        }

        return null;
    }

    function getYouTubeIdFromUrl(rawUrl) {
        let url;
        try {
            url = new URL(String(rawUrl || '').trim());
        } catch {
            return '';
        }
        const host = url.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
            const parts = url.pathname.split('/').filter(Boolean);
            return url.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : '') || '';
        }
        return '';
    }

    function getEmbedThumbnailUrl(item) {
        const id = getYouTubeIdFromUrl(item?.sourceUrl || item?.embedUrl || '');
        return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
    }

    function clampNumber(value, min, max, fallback) {
        const num = parseInt(value, 10);
        if (Number.isNaN(num)) return fallback;
        return Math.min(max, Math.max(min, num));
    }

    function getMediaLimits() {
        const maxMediaInput = document.getElementById('cfgMaxMedia');
        const maxVideosInput = document.getElementById('cfgMaxVideos');
        const maxVideoMBInput = document.getElementById('cfgMaxVideoMB');
        return {
            maxMedia: clampNumber(maxMediaInput?.value ?? STATE.config.maxMedia, 1, HARD_MAX_MEDIA, DEFAULT_MAX_MEDIA),
            maxVideos: clampNumber(maxVideosInput?.value ?? STATE.config.maxVideos, 0, 20, DEFAULT_MAX_VIDEOS),
            maxVideoMB: clampNumber(maxVideoMBInput?.value ?? STATE.config.maxVideoMB, 1, 100, DEFAULT_MAX_VIDEO_MB)
        };
    }

    const REACTION_STORAGE_KEY = 'kiyeu_reactions_v1';
    let reactionState = { heart: 0, like: 0 };

    function loadReactions() {
        try {
            const saved = JSON.parse(localStorage.getItem(REACTION_STORAGE_KEY) || '{}');
            reactionState = {
                heart: Number(saved.heart) || 0,
                like: Number(saved.like) || 0
            };
        } catch {
            reactionState = { heart: 0, like: 0 };
        }
        renderReactionCounts();
    }

    function saveReactions() {
        try {
            localStorage.setItem(REACTION_STORAGE_KEY, JSON.stringify(reactionState));
        } catch {}
    }

    function renderReactionCounts() {
        if (heartCount) heartCount.textContent = reactionState.heart;
        if (likeCount) likeCount.textContent = reactionState.like;
    }

    function showReactionFloat(symbol, sourceEl) {
        const rect = sourceEl.getBoundingClientRect();
        const floater = document.createElement('span');
        floater.className = 'reaction-float';
        floater.textContent = symbol;
        floater.style.left = (rect.left + rect.width / 2) + 'px';
        floater.style.top = rect.top + 'px';
        document.body.appendChild(floater);
        floater.addEventListener('animationend', () => floater.remove(), { once: true });
    }

    function stopMusic() {
        if (!bgMusic) return;
        bgMusic.pause();
        isMusicPlaying = false;
        if (btnMusicToggle) {
            btnMusicToggle.classList.remove('playing');
            btnMusicToggle.innerHTML = '<span class="music-icon">🔇</span>';
        }
    }

    function closeYearbook() {
        coverSection.classList.remove('hidden');
        yearbookMain.classList.remove('show');
        document.body.classList.remove('yearbook-open');
        coverBook.classList.remove('open');
        if (tapHint) tapHint.style.display = 'inline-flex';
        stopMusic();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function setupYearbookActions() {
        loadReactions();
        if (btnCloseYearbook) {
            btnCloseYearbook.addEventListener('click', closeYearbook);
        }
        reactionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.reaction;
                if (!reactionState[type] && reactionState[type] !== 0) return;
                reactionState[type] += 1;
                renderReactionCounts();
                saveReactions();
                showReactionFloat(type === 'heart' ? '❤️' : '👍', btn);
            });
        });
    }

    const LIVE_GUESTBOOK_DB_URL = 'https://kyyeu-guestbook-default-rtdb.asia-southeast1.firebasedatabase.app';
    let liveGuestbookBound = false;
    let liveGuestbookAdminUnlocked = false;
    let liveGuestbookCurrentYearbookId = '';

    function getLiveGuestbookConfig() {
        const hadYearbookId = Boolean(STATE.config.yearbookId);
        const hadAdminCode = Boolean(STATE.config.guestbookAdminCode);
        ensureGuestbookAccessConfig();
        if ((!hadYearbookId || !hadAdminCode) && !isRestoringDraft) {
            syncGuestbookAccessUi();
            scheduleDraftSave(true);
        }
        return {
            yearbookId: STATE.config.yearbookId || '',
            adminCode: STATE.config.guestbookAdminCode || ''
        };
    }

    function liveGuestbookNotesUrl(noteId = '') {
        const config = getLiveGuestbookConfig();
        const base = `${LIVE_GUESTBOOK_DB_URL}/kyyeu-guestbook/${encodeURIComponent(config.yearbookId)}/notes`;
        return `${base}${noteId ? `/${encodeURIComponent(noteId)}` : ''}.json`;
    }

    function setLiveGuestbookStatus(text = '', type = '') {
        const statusEl = document.getElementById('liveGuestbookStatus');
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.style.color = type === 'error' ? '#b42318' : (type === 'ok' ? 'var(--primary)' : 'var(--text2)');
    }

    function makeLiveGuestbookNoteId() {
        let rand = Math.random().toString(36).slice(2, 9);
        if (window.crypto && window.crypto.getRandomValues) {
            const bytes = new Uint8Array(4);
            window.crypto.getRandomValues(bytes);
            rand = Array.from(bytes, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 9);
        }
        return `note_${Date.now().toString(36)}_${rand}`;
    }

    function normalizeLiveGuestbookNotes(raw) {
        return Object.keys(raw || {})
            .map(id => ({ ...(raw[id] || {}), id: (raw[id] && raw[id].id) || id }))
            .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    }

    async function fetchLiveGuestbookNotes() {
        const response = await fetch(liveGuestbookNotesUrl(), { cache: 'no-store' });
        if (!response.ok) throw new Error('Không đọc được lưu bút.');
        return normalizeLiveGuestbookNotes(await response.json());
    }

    function renderLiveGuestbookNotes(target, notes, emptyText, isPending) {
        if (!target) return;
        target.innerHTML = '';
        if (!notes.length) {
            const empty = document.createElement('p');
            empty.className = 'live-empty';
            empty.textContent = emptyText;
            target.appendChild(empty);
            return;
        }

        notes.forEach(note => {
            const card = document.createElement('article');
            card.className = 'live-note';

            const text = document.createElement('p');
            text.textContent = note.message || '';

            const footer = document.createElement('footer');
            const name = document.createElement('span');
            name.textContent = `${note.name || 'Ẩn danh'} - ${note.role || 'Lưu bút'}`;
            const date = document.createElement('span');
            date.textContent = note.createdAt ? new Date(note.createdAt).toLocaleDateString('vi-VN') : '';
            footer.appendChild(name);
            footer.appendChild(date);

            card.appendChild(text);
            card.appendChild(footer);

            if (isPending) {
                const actions = document.createElement('div');
                actions.className = 'live-note-actions';

                const approve = document.createElement('button');
                approve.type = 'button';
                approve.className = 'live-note-approve';
                approve.textContent = 'Duyệt';
                approve.addEventListener('click', () => approveLiveGuestbookNote(note.id));

                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'live-note-delete';
                del.textContent = 'Xóa';
                del.addEventListener('click', () => deleteLiveGuestbookNote(note.id));

                actions.appendChild(approve);
                actions.appendChild(del);
                card.appendChild(actions);
            }

            target.appendChild(card);
        });

        repairDocumentText(target);
    }

    async function loadLiveGuestbookApproved() {
        const approvedList = document.getElementById('liveApprovedNotes');
        try {
            const notes = await fetchLiveGuestbookNotes();
            renderLiveGuestbookNotes(
                approvedList,
                notes.filter(note => note.status === 'approved'),
                'Chưa có lời nhắn đã duyệt.',
                false
            );
        } catch (error) {
            console.error('Guestbook approved load failed', error);
            renderLiveGuestbookNotes(approvedList, [], 'Chưa tải được lưu bút. Vui lòng thử lại sau.', false);
        }
    }

    async function loadLiveGuestbookPending() {
        if (!liveGuestbookAdminUnlocked) return;
        const pendingList = document.getElementById('livePendingNotes');
        try {
            const notes = await fetchLiveGuestbookNotes();
            renderLiveGuestbookNotes(
                pendingList,
                notes.filter(note => note.status !== 'approved'),
                'Không có lời nhắn chờ duyệt.',
                true
            );
        } catch (error) {
            console.error('Guestbook pending load failed', error);
            renderLiveGuestbookNotes(pendingList, [], 'Chưa tải được danh sách chờ duyệt.', true);
        }
    }

    async function approveLiveGuestbookNote(noteId) {
        if (!noteId) return;
        setLiveGuestbookStatus('Đang duyệt lời nhắn...');
        try {
            const response = await fetch(liveGuestbookNotesUrl(noteId), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved', approvedAt: Date.now() })
            });
            if (!response.ok) throw new Error('Duyệt thất bại.');
            setLiveGuestbookStatus('Đã duyệt lời nhắn.', 'ok');
            await loadLiveGuestbookApproved();
            await loadLiveGuestbookPending();
        } catch (error) {
            console.error('Guestbook approve failed', error);
            setLiveGuestbookStatus('Chưa duyệt được lời nhắn.', 'error');
        }
    }

    async function deleteLiveGuestbookNote(noteId) {
        if (!noteId || !confirm('Xóa lời nhắn này?')) return;
        setLiveGuestbookStatus('Đang xóa lời nhắn...');
        try {
            const response = await fetch(liveGuestbookNotesUrl(noteId), { method: 'DELETE' });
            if (!response.ok) throw new Error('Xóa thất bại.');
            setLiveGuestbookStatus('Đã xóa lời nhắn.', 'ok');
            await loadLiveGuestbookApproved();
            await loadLiveGuestbookPending();
        } catch (error) {
            console.error('Guestbook delete failed', error);
            setLiveGuestbookStatus('Chưa xóa được lời nhắn.', 'error');
        }
    }

    function setupPreviewLiveGuestbook() {
        const root = document.getElementById('liveGuestbook');
        if (!root) return;

        const config = getLiveGuestbookConfig();
        if (config.yearbookId && config.yearbookId !== liveGuestbookCurrentYearbookId) {
            liveGuestbookCurrentYearbookId = config.yearbookId;
            liveGuestbookAdminUnlocked = false;
            const adminPanel = document.getElementById('liveAdminPanel');
            if (adminPanel) adminPanel.classList.remove('show');
            loadLiveGuestbookApproved();
        }

        if (liveGuestbookBound) return;
        liveGuestbookBound = true;

        const form = document.getElementById('liveGuestbookForm');
        const nameInput = document.getElementById('liveGuestbookName');
        const roleInput = document.getElementById('liveGuestbookRole');
        const messageInput = document.getElementById('liveGuestbookMessage');
        const manageBtn = document.getElementById('liveGuestbookManage');
        const adminPanel = document.getElementById('liveAdminPanel');
        const adminCodeInput = document.getElementById('liveAdminCode');
        const adminUnlock = document.getElementById('liveAdminUnlock');

        if (form) {
            form.addEventListener('submit', async event => {
                event.preventDefault();
                const name = (nameInput?.value || '').trim().slice(0, 60);
                const role = (roleInput?.value || 'Học sinh').trim().slice(0, 30);
                const message = (messageInput?.value || '').trim().slice(0, 600);
                if (!name || !message) {
                    setLiveGuestbookStatus('Vui lòng nhập tên và lời nhắn.', 'error');
                    return;
                }

                const id = makeLiveGuestbookNoteId();
                const note = { id, name, role, message, status: 'pending', createdAt: Date.now() };
                setLiveGuestbookStatus('Đang gửi lời nhắn...');

                try {
                    const response = await fetch(liveGuestbookNotesUrl(id), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(note)
                    });
                    if (!response.ok) throw new Error('Gửi thất bại.');
                    form.reset();
                    setLiveGuestbookStatus('Đã gửi. Lời nhắn sẽ hiện sau khi giáo viên duyệt.', 'ok');
                    await loadLiveGuestbookPending();
                } catch (error) {
                    console.error('Guestbook submit failed', error);
                    setLiveGuestbookStatus('Chưa gửi được lời nhắn. Vui lòng thử lại.', 'error');
                }
            });
        }

        if (manageBtn && adminPanel) {
            manageBtn.addEventListener('click', () => {
                adminPanel.classList.toggle('show');
                if (adminPanel.classList.contains('show') && liveGuestbookAdminUnlocked) loadLiveGuestbookPending();
            });
        }

        if (adminUnlock) {
            adminUnlock.addEventListener('click', () => {
                const input = (adminCodeInput?.value || '').trim();
                const configNow = getLiveGuestbookConfig();
                if (input !== String(configNow.adminCode || '').trim()) {
                    setLiveGuestbookStatus('Mã duyệt chưa đúng.', 'error');
                    return;
                }
                liveGuestbookAdminUnlocked = true;
                setLiveGuestbookStatus('Đã mở quyền duyệt lưu bút.', 'ok');
                loadLiveGuestbookPending();
            });
        }
    }

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Setup Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // ===== MODAL LOGIC =====
    settingsFab.addEventListener('click', () => {
        populateFormFromState();
        syncGuestbookAccessUi();
        settingsModal.classList.add('show');
    });

    btnCloseSettingsX.addEventListener('click', () => {
        saveFormToState();
        applyStateToUI();
        scheduleDraftSave(true);
        settingsModal.classList.remove('show');
    });

    const btnPreview = document.getElementById('btnPreview');
    if (btnPreview) {
        btnPreview.addEventListener('click', () => {
            saveFormToState();
            applyStateToUI();
            scheduleDraftSave(true);
            settingsModal.classList.remove('show');
        });
    }

    settingsModal.addEventListener('input', (e) => {
        const target = e.target;
        if (!target || target.type === 'file' || target.classList.contains('p-name') || target.classList.contains('p-msg')) return;
        saveFormToState();
        syncExportPaymentUi();
        scheduleDraftSave();
    });

    settingsModal.addEventListener('change', (e) => {
        const target = e.target;
        if (!target || target.type === 'file' || target.classList.contains('p-name') || target.classList.contains('p-msg')) return;
        saveFormToState();
        syncExportPaymentUi();
        scheduleDraftSave();
    });

    if (btnClearDraft) {
        btnClearDraft.addEventListener('click', () => {
            if (confirm('Xóa bản nháp đang lưu trên trình duyệt này? File JSON/ZIP đã tải về sẽ không bị ảnh hưởng.')) {
                clearDraft();
            }
        });
    }

    importFab.addEventListener('click', () => {
        jsonImportInput.click();
    });

    // ===== PHOTO UPLOAD LOGIC =====
    const photoInput = document.getElementById('photoInput');
    const videoLinkInput = document.getElementById('videoLinkInput');
    const btnAddVideoLink = document.getElementById('btnAddVideoLink');
    const uploadZone = document.getElementById('uploadZone');
    const photoList = document.getElementById('photoList');
    const photoCountEl = document.getElementById('photoCount');

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    photoInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        photoInput.value = '';
    });

    if (btnAddVideoLink && videoLinkInput) {
        btnAddVideoLink.addEventListener('click', addVideoLink);
        videoLinkInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addVideoLink();
            }
        });
    }

    ['cfgMaxMedia', 'cfgMaxVideos', 'cfgMaxVideoMB'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', renderPhotoList);
            input.addEventListener('input', () => {
                const limits = getMediaLimits();
                photoCountEl.textContent = `${STATE.photos.length} / ${limits.maxMedia} mục • Video ${countVideoItems()} / ${limits.maxVideos}`;
            });
        }
    });

    function addVideoLink() {
        const rawUrl = videoLinkInput.value.trim();
        if (!rawUrl) {
            alert('Vui lòng dán link YouTube hoặc Google Drive.');
            return;
        }
        const limits = getMediaLimits();
        if (countVideoItems() >= limits.maxVideos) {
            alert(`Kỉ yếu đang đặt tối đa ${limits.maxVideos} video/link video. Hãy xoá bớt video/link cũ hoặc tăng giới hạn.`);
            return;
        }
        if (STATE.photos.length >= limits.maxMedia) {
            alert(`Bạn đã đạt tối đa ${limits.maxMedia} mục.`);
            return;
        }

        const embedUrl = normalizeVideoEmbedUrl(rawUrl);
        if (!embedUrl) {
            alert('Link chưa hỗ trợ. Hãy dùng link YouTube hoặc Google Drive dạng chia sẻ công khai.');
            return;
        }

        const id = Date.now() + Math.random().toString(36).substring(7);
        STATE.photos.push({
            id,
            type: 'embed',
            embedUrl,
            sourceUrl: rawUrl,
            name: rawUrl.includes('youtu') ? 'Video YouTube' : 'Video Google Drive',
            msg: ''
        });
        videoLinkInput.value = '';
        renderPhotoList();
        scheduleDraftSave(true);
    }

    function handleFiles(files) {
        const limits = getMediaLimits();
        let validFiles = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/') || isHeicLikeMedia(f));
        const heicFiles = validFiles.filter(isHeicLikeMedia);
        if (heicFiles.length) {
            alert(heicAndroidWarning(heicFiles.map(file => file.name || 'Anh HEIC')));
            validFiles = validFiles.filter(file => !isHeicLikeMedia(file));
        }
        let remainingSlots = limits.maxMedia - STATE.photos.length;
        let videoSlots = limits.maxVideos - countVideoItems();
        let skippedLargeVideos = 0;
        let skippedVideoLimit = 0;
        
        if (validFiles.length > remainingSlots) {
            alert(`Bạn chỉ có thể chọn thêm ${remainingSlots} mục. Tối đa hiện tại là ${limits.maxMedia} ảnh/video.`);
            validFiles = validFiles.slice(0, remainingSlots);
        }

        validFiles = validFiles.filter(file => {
            if (!file.type.startsWith('video/')) return true;
            if (file.size > limits.maxVideoMB * 1024 * 1024) {
                skippedLargeVideos += 1;
                return false;
            }
            if (videoSlots <= 0) {
                skippedVideoLimit += 1;
                return false;
            }
            videoSlots -= 1;
            return true;
        });

        const notes = [];
        if (skippedLargeVideos) notes.push(`${skippedLargeVideos} video bị bỏ qua vì lớn hơn ${limits.maxVideoMB} MB.`);
        if (skippedVideoLimit) notes.push(`Giới hạn hiện tại là ${limits.maxVideos} video/link video.`);
        if (notes.length) alert(notes.join('\n'));

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Video data can make exported JSON/HTML large; keep clips short.
                const id = Date.now() + Math.random().toString(36).substring(7);
                STATE.photos.push({
                    id: id,
                    dataUrl: e.target.result,
                    type: file.type.startsWith('video/') ? 'video' : 'image',
                    mimeType: file.type,
                    name: file.name.split('.')[0],
                    msg: ''
                });
                renderPhotoList();
                scheduleDraftSave(true);
            };
            reader.readAsDataURL(file);
        });
    }

    function replaceMediaFile(id, file) {
        if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !isHeicLikeMedia(file))) {
            alert('Vui lòng chọn file ảnh hoặc video.');
            return;
        }

        if (isHeicLikeMedia(file)) {
            alert(heicAndroidWarning([file.name || 'Anh HEIC']));
            return;
        }

        const photo = STATE.photos.find(p => p.id === id);
        if (!photo) return;

        const limits = getMediaLimits();
        const nextIsVideo = file.type.startsWith('video/');
        const currentIsVideoLike = isVideoLike(photo);

        if (nextIsVideo && file.size > limits.maxVideoMB * 1024 * 1024) {
            alert(`Video lớn hơn ${limits.maxVideoMB} MB. Hãy chọn video nhẹ hơn hoặc tăng giới hạn MB/video.`);
            return;
        }

        if (nextIsVideo && !currentIsVideoLike && countVideoItems() >= limits.maxVideos) {
            alert(`Kỉ yếu đang đặt tối đa ${limits.maxVideos} video/link video. Hãy xoá bớt video/link cũ hoặc tăng giới hạn.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            photo.dataUrl = event.target.result;
            photo.type = nextIsVideo ? 'video' : 'image';
            photo.mimeType = file.type;
            photo.embedUrl = '';
            photo.sourceUrl = '';
            if (!photo.name) photo.name = file.name.split('.')[0];
            renderPhotoList();
            applyStateToUI();
            scheduleDraftSave(true);
        };
        reader.readAsDataURL(file);
    }

    function renderPhotoList() {
        photoList.innerHTML = '';
        STATE.photos.forEach((photo, index) => {
            const div = document.createElement('div');
            div.className = 'photo-item';
            const safeName = escapeHtml(photo.name);
            const safeMsg = escapeHtml(photo.msg);
            const mediaKind = isEmbed(photo) ? 'Link' : (isVideo(photo) ? 'Video' : 'Ảnh');
            div.innerHTML = `
                <button class="photo-item-remove" data-id="${photo.id}" title="Xóa ảnh/video này" aria-label="Xóa ảnh/video này">X</button>
                <div class="media-preview">
                    ${mediaPreviewHtml(photo, safeName)}
                    <span class="media-type-badge">${mediaKind}</span>
                    <label class="photo-item-replace" title="Thay ảnh/video này">
                        <input type="file" class="p-replace-input" data-id="${photo.id}" accept="image/*,video/*" hidden>
                        <span>Thay ảnh</span>
                    </label>
                </div>
                <div class="photo-item-info">
                    <input type="text" placeholder="Tên HS" value="${safeName}" class="p-name" data-id="${photo.id}">
                    <div style="display:flex;gap:4px;">
                        <input type="text" placeholder="Đặc điểm..." value="${safeMsg}" class="p-msg" data-id="${photo.id}" style="flex:1;">
                        <button class="btn-ai-trait" data-id="${photo.id}" title="Gợi ý AI" style="background:var(--gradient);border:none;border-radius:6px;color:#fff;cursor:pointer;padding:0 8px;font-size:0.9rem;">✨</button>
                    </div>
                </div>
            `;
            photoList.appendChild(div);
        });

        const limits = getMediaLimits();
        photoCountEl.textContent = `${STATE.photos.length} / ${limits.maxMedia} mục • Video ${countVideoItems()} / ${limits.maxVideos}`;

        // Attach event listeners to new elements
        document.querySelectorAll('.photo-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                STATE.photos = STATE.photos.filter(p => p.id !== id);
                renderPhotoList();
                scheduleDraftSave(true);
            });
        });

        document.querySelectorAll('.p-replace-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const file = e.target.files && e.target.files[0];
                replaceMediaFile(id, file);
                e.target.value = '';
            });
        });

        document.querySelectorAll('.p-name, .p-msg').forEach(input => {
            const syncPhotoText = (e) => {
                const id = e.target.dataset.id;
                const field = e.target.classList.contains('p-name') ? 'name' : 'msg';
                const photo = STATE.photos.find(p => p.id === id);
                if (photo) photo[field] = e.target.value;
                scheduleDraftSave();
            };
            input.addEventListener('input', syncPhotoText);
            input.addEventListener('change', syncPhotoText);
        });

        document.querySelectorAll('.btn-ai-trait').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = e.target.dataset.id;
                const photo = STATE.photos.find(p => p.id === id);
                if (photo) {
                    const randomTrait = AI_TRAITS[Math.floor(Math.random() * AI_TRAITS.length)];
                    photo.msg = randomTrait;
                    const input = e.target.parentElement.querySelector('.p-msg');
                    if (input) input.value = randomTrait;
                    scheduleDraftSave();
                }
            });
        });
    }

    // ===== DATA MANAGEMENT =====
    function saveFormToState() {
        ensureGuestbookAccessConfig();
        STATE.config.className = document.getElementById('cfgClassName').value;
        STATE.config.school = document.getElementById('cfgSchool').value;
        STATE.config.year = document.getElementById('cfgYear').value;
        STATE.config.teacher = document.getElementById('cfgTeacher').value;
        STATE.config.title = document.getElementById('cfgTitle').value;
        STATE.config.slogan = document.getElementById('cfgSlogan').value;
        STATE.config.message = document.getElementById('cfgMessage').value;
        STATE.config.maxMedia = clampNumber(document.getElementById('cfgMaxMedia')?.value, 1, HARD_MAX_MEDIA, DEFAULT_MAX_MEDIA);
        STATE.config.maxVideos = clampNumber(document.getElementById('cfgMaxVideos')?.value, 0, 20, DEFAULT_MAX_VIDEOS);
        STATE.config.maxVideoMB = clampNumber(document.getElementById('cfgMaxVideoMB')?.value, 1, 100, DEFAULT_MAX_VIDEO_MB);

        const themeRadio = document.querySelector('input[name="cfgTheme"]:checked');
        if (themeRadio) STATE.config.theme = themeRadio.value;

        const fontRadio = document.querySelector('input[name="cfgFont"]:checked');
        if (fontRadio) STATE.config.font = fontRadio.value;
        
        const effectRadio = document.querySelector('input[name="cfgEffect"]:checked');
        if (effectRadio) STATE.config.effect = effectRadio.value;
        
        const layoutRadio = document.querySelector('input[name="cfgLayout"]:checked');
        if (layoutRadio) STATE.config.layout = layoutRadio.value;

        const memberHoverSound = document.getElementById('cfgMemberHoverSound');
        STATE.config.memberHoverSound = memberHoverSound ? memberHoverSound.checked : STATE.config.memberHoverSound !== false;

        const existingTimelineItems = Array.isArray(STATE.config.timelineItems) ? STATE.config.timelineItems : [];
        STATE.config.timelineItems = Array.from({ length: CREATIVE_ITEM_COUNT }, (_, idx) => ({
            icon: document.getElementById(`cfgTimelineIcon${idx}`)?.value.trim() || '',
            title: document.getElementById(`cfgTimelineTitle${idx}`)?.value.trim() || '',
            text: document.getElementById(`cfgTimelineText${idx}`)?.value.trim() || '',
            mediaDataUrl: existingTimelineItems[idx]?.mediaDataUrl || '',
            mediaName: existingTimelineItems[idx]?.mediaName || '',
            mediaMimeType: existingTimelineItems[idx]?.mediaMimeType || ''
        }));

        STATE.config.guestbookNotes = Array.from({ length: CREATIVE_ITEM_COUNT }, (_, idx) => ({
            title: document.getElementById(`cfgGuestTitle${idx}`)?.value.trim() || '',
            text: document.getElementById(`cfgGuestText${idx}`)?.value.trim() || '',
            sign: document.getElementById(`cfgGuestSign${idx}`)?.value.trim() || ''
        }));
        syncGuestbookAccessUi();
    }

    const audioInput = document.getElementById('audioInput');
    const audioName = document.getElementById('audioName');

    function ensureTimelineConfigItem(idx) {
        if (!Array.isArray(STATE.config.timelineItems)) STATE.config.timelineItems = [];
        while (STATE.config.timelineItems.length < CREATIVE_ITEM_COUNT) STATE.config.timelineItems.push({});
        if (!STATE.config.timelineItems[idx]) STATE.config.timelineItems[idx] = {};
        return STATE.config.timelineItems[idx];
    }

    function updateTimelineMediaLabel(idx) {
        const label = document.getElementById(`cfgTimelineMediaName${idx}`);
        if (!label) return;
        const item = Array.isArray(STATE.config.timelineItems) ? STATE.config.timelineItems[idx] : null;
        if (item && item.mediaDataUrl) {
            label.textContent = item.mediaName || 'Đã chọn ảnh riêng';
            label.classList.add('has-file');
        } else {
            label.textContent = 'Chưa chọn - tự lấy ảnh';
            label.classList.remove('has-file');
        }
    }

    function setupTimelineMediaControls() {
        for (let idx = 0; idx < CREATIVE_ITEM_COUNT; idx++) {
            const textInput = document.getElementById(`cfgTimelineText${idx}`);
            if (!textInput || document.getElementById(`cfgTimelineMedia${idx}`)) continue;
            const holder = document.createElement('div');
            holder.className = 'timeline-media-tools';
            holder.innerHTML = `
                <label class="timeline-media-upload" for="cfgTimelineMedia${idx}">📷 Tải ảnh riêng</label>
                <input type="file" id="cfgTimelineMedia${idx}" accept="image/*" hidden>
                <button type="button" class="timeline-media-clear" data-timeline-media-clear="${idx}">Tự động</button>
                <span class="timeline-media-name" id="cfgTimelineMediaName${idx}">Chưa chọn - tự lấy ảnh</span>
            `;
            const field = textInput.closest('.mini-field') || textInput;
            field.insertAdjacentElement('afterend', holder);

            const fileInput = holder.querySelector(`#cfgTimelineMedia${idx}`);
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                    alert('Vui lòng chọn file ảnh.');
                    fileInput.value = '';
                    return;
                }
                saveFormToState();
                const reader = new FileReader();
                reader.onload = (event) => {
                    const item = ensureTimelineConfigItem(idx);
                    item.mediaDataUrl = event.target.result;
                    item.mediaName = file.name;
                    item.mediaMimeType = file.type;
                    updateTimelineMediaLabel(idx);
                    applyStateToUI();
                    scheduleDraftSave(true);
                };
                reader.readAsDataURL(file);
            });
        }

        document.querySelectorAll('[data-timeline-media-clear]').forEach(btn => {
            if (btn.dataset.bound === '1') return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.timelineMediaClear);
                saveFormToState();
                const item = ensureTimelineConfigItem(idx);
                item.mediaDataUrl = '';
                item.mediaName = '';
                item.mediaMimeType = '';
                const input = document.getElementById(`cfgTimelineMedia${idx}`);
                if (input) input.value = '';
                updateTimelineMediaLabel(idx);
                applyStateToUI();
                scheduleDraftSave(true);
            });
        });
    }

    setupTimelineMediaControls();

    if (audioInput) {
        audioInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    STATE.config.customAudioData = e.target.result;
                    STATE.config.customAudioName = file.name;
                    if (audioName) audioName.textContent = file.name;
                    applyStateToUI(); // Immediately apply audio change
                    scheduleDraftSave(true);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function populateFormFromState() {
        ensureGuestbookAccessConfig();
        document.getElementById('cfgClassName').value = STATE.config.className || '';
        document.getElementById('cfgSchool').value = STATE.config.school || '';
        document.getElementById('cfgYear').value = STATE.config.year || '';
        document.getElementById('cfgTeacher').value = STATE.config.teacher || '';
        document.getElementById('cfgTitle').value = STATE.config.title || '';
        document.getElementById('cfgSlogan').value = STATE.config.slogan || '';
        document.getElementById('cfgMessage').value = STATE.config.message || '';
        const limits = getMediaLimits();
        document.getElementById('cfgMaxMedia').value = limits.maxMedia;
        document.getElementById('cfgMaxVideos').value = limits.maxVideos;
        document.getElementById('cfgMaxVideoMB').value = limits.maxVideoMB;

        const themeRadio = document.querySelector(`input[name="cfgTheme"][value="${STATE.config.theme}"]`);
        if (themeRadio) themeRadio.checked = true;

        const fontRadio = document.querySelector(`input[name="cfgFont"][value="${STATE.config.font}"]`);
        if (fontRadio) fontRadio.checked = true;

        const effectRadio = document.querySelector(`input[name="cfgEffect"][value="${STATE.config.effect}"]`);
        if (effectRadio) effectRadio.checked = true;

        const layoutRadio = document.querySelector(`input[name="cfgLayout"][value="${STATE.config.layout}"]`);
        if (layoutRadio) layoutRadio.checked = true;

        const memberHoverSound = document.getElementById('cfgMemberHoverSound');
        if (memberHoverSound) memberHoverSound.checked = STATE.config.memberHoverSound !== false;

        const audioName = document.getElementById('audioName');
        if (audioName) audioName.textContent = STATE.config.customAudioName || 'Mặc định hệ thống';

        resolveTimelineConfig(STATE.config).forEach((item, idx) => {
            const iconInput = document.getElementById(`cfgTimelineIcon${idx}`);
            const titleInput = document.getElementById(`cfgTimelineTitle${idx}`);
            const textInput = document.getElementById(`cfgTimelineText${idx}`);
            if (iconInput) iconInput.value = item.icon || '';
            if (titleInput) titleInput.value = item.title || '';
            if (textInput) textInput.value = item.text || '';
            updateTimelineMediaLabel(idx);
        });

        resolveGuestbookConfig(STATE.config).forEach((note, idx) => {
            const titleInput = document.getElementById(`cfgGuestTitle${idx}`);
            const textInput = document.getElementById(`cfgGuestText${idx}`);
            const signInput = document.getElementById(`cfgGuestSign${idx}`);
            if (titleInput) titleInput.value = note.title || '';
            if (textInput) textInput.value = note.text || '';
            if (signInput) signInput.value = note.sign || '';
        });

        renderPhotoList();
        syncGuestbookAccessUi();
    }

    // ===== UI RENDERING =====
    function applyStateToUI() {
        normalizeStateText();
        // Theme
        document.body.setAttribute('data-theme', STATE.config.theme);

        // Update Cover
        document.getElementById('coverTitle').textContent = STATE.config.title || 'Kỉ Yếu Cuối Năm';
        document.getElementById('coverClass').textContent = STATE.config.className || 'Lớp ___';
        document.getElementById('coverYear').textContent = STATE.config.year || '';
        document.getElementById('coverSchool').textContent = STATE.config.school || 'Trường ___';
        document.getElementById('coverHeroTitle').textContent = STATE.config.title || 'Kỉ Yếu Cuối Năm';
        document.getElementById('coverHeroClass').textContent = STATE.config.className || 'Lớp ___';
        document.getElementById('coverHeroYear').textContent = STATE.config.year || '2025 - 2026';
        document.getElementById('coverHeroSlogan').textContent = STATE.config.slogan || 'Hẹn gặp lại sau mùa hè nhé! 🌻';
        const coverYearParts = getCoverYearParts(STATE.config.year);
        const coverClassLabel = getCoverClassLabel(STATE.config.className);
        setText('coverArtYearStart', coverYearParts[0]);
        setText('coverArtYearEnd', coverYearParts[1]);
        setText('coverArtBookClass', coverClassLabel);
        setText('coverArtBookYear', STATE.config.year || '2025 - 2026');
        setText('coverArtBookSchool', STATE.config.school || 'Trường ___');

        // Update Main Header
        document.getElementById('ybTitle').textContent = STATE.config.title || 'Kỉ Yếu Cuối Năm';
        document.getElementById('ybClass').textContent = STATE.config.className || 'Lớp ___';
        document.getElementById('ybSchool').textContent = STATE.config.school || 'Trường ___';
        document.getElementById('ybYear').textContent = STATE.config.year ? `✦ Năm học ${STATE.config.year} ✦` : '';
        document.getElementById('ybSlogan').textContent = STATE.config.slogan || '';
        
        // Update Message
        const messageText = escapeHtml(STATE.config.message || '').replace(/\n/g, '<br>');
        document.getElementById('messageContent').innerHTML = `<p>${messageText}</p>`;
        document.getElementById('messageSign').textContent = STATE.config.teacher ? `— ${STATE.config.teacher} —` : '— Giáo viên chủ nhiệm —';
        
        // Update Footer
        document.getElementById('footerTeacher').textContent = STATE.config.teacher || 'GVCN';
        document.getElementById('footerYear').textContent = STATE.config.year ? `Năm học ${STATE.config.year}` : '';

        // Apply Font
        applyFont(STATE.config.font);

        // Apply Effects
        renderParticles(STATE.config.effect);

        // Apply Audio
        if (STATE.config.customAudioData) {
            if (bgMusic.getAttribute('src') !== STATE.config.customAudioData) {
                bgMusic.src = STATE.config.customAudioData;
                if (isMusicPlaying) bgMusic.play().catch(e => console.log('Audio play error:', e));
            }
        } else {
            if (bgMusic.getAttribute('src')) {
                bgMusic.pause();
                bgMusic.removeAttribute('src');
                bgMusic.load();
                isMusicPlaying = false;
                btnMusicToggle.classList.remove('playing');
            }
        }

        // Render Gallery
        renderGallery();
        renderMemoryDisc();
        renderCreativeSections();
        setupPreviewLiveGuestbook();
        
        // Render Slideshow
        initSlideshow();

        // Check Empty State
        if (!STATE.config.className && STATE.photos.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
        }
        repairDocumentText();
    }

    function applyFont(fontName) {
        const titleElements = document.querySelectorAll('.script-font');
        let fontFamily = "'Dancing Script', cursive"; // default
        if (fontName === 'great-vibes') fontFamily = "'Great Vibes', cursive";
        if (fontName === 'pacifico') fontFamily = "'Pacifico', cursive";
        if (fontName === 'lobster') fontFamily = "'Lobster', cursive";
        if (fontName === 'playfair') fontFamily = "'Playfair Display', serif";
        
        titleElements.forEach(el => {
            el.style.fontFamily = fontFamily;
        });
    }

    function renderParticles(effectType) {
        const container = document.getElementById('particles');
        container.innerHTML = '';
        if (effectType === 'none') return;

        let colors = [];
        let numParticles = 20;

        if (effectType === 'petals') {
            colors = ['var(--petal1)', 'var(--petal2)', '#ffffff'];
        } else if (effectType === 'bubbles') {
            colors = ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.6)'];
            numParticles = 30;
        } else if (effectType === 'stars') {
            colors = ['#f1c40f', '#fff'];
        } else if (effectType === 'confetti') {
            colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
            numParticles = 40;
        }

        for (let i = 0; i < numParticles; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.top = -(Math.random() * 50) + 'vh';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            const size = Math.random() * 8 + 4;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            
            p.style.animationDuration = (Math.random() * 5 + 5) + 's';
            p.style.animationDelay = (Math.random() * 5) + 's';
            
            if (effectType === 'stars') {
                p.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
                p.style.borderRadius = '0';
            } else if (effectType === 'confetti') {
                p.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                p.style.width = (size * 1.5) + 'px';
            }

            container.appendChild(p);
        }
    }

    let memberHoverAudioCtx = null;
    let lastMemberHoverSoundAt = 0;

    function unlockMemberHoverSound() {
        if (STATE.config.memberHoverSound === false) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!memberHoverAudioCtx) memberHoverAudioCtx = new AudioCtx();
        const ctx = memberHoverAudioCtx;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
    }

    function playMemberHoverSound() {
        if (STATE.config.memberHoverSound === false) return;
        const now = performance.now();
        if (now - lastMemberHoverSoundAt < 140) return;
        lastMemberHoverSoundAt = now;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!memberHoverAudioCtx) memberHoverAudioCtx = new AudioCtx();
        const ctx = memberHoverAudioCtx;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const start = ctx.currentTime + 0.01;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, start);
        master.gain.exponentialRampToValueAtTime(0.055, start + 0.018);
        master.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
        master.connect(ctx.destination);

        [740, 990, 1320].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = start + idx * 0.045;
            osc.type = idx === 1 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.18, t + 0.16);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.42 - idx * 0.08, t + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
            osc.connect(gain);
            gain.connect(master);
            osc.start(t);
            osc.stop(t + 0.24);
        });
    }

    function bindMemberHoverSounds(root) {
        const scope = root || document;
        scope.querySelectorAll('.gallery-bubble,.gallery-grid-item,.carousel-item,.spotlight-item').forEach(item => {
            item.setAttribute('tabindex', '0');
            item.addEventListener('mouseenter', playMemberHoverSound);
            item.addEventListener('focus', playMemberHoverSound);
        });
    }

    document.addEventListener('pointerdown', unlockMemberHoverSound, { once: true });

    function renderGallery() {
        const container = document.getElementById('galleryContainer');
        container.innerHTML = '';
        container.className = 'gallery-container layout-' + STATE.config.layout;
        container.style.overflowX = '';
        container.style.paddingBottom = '';

        if (STATE.photos.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text2); padding: 20px;">Chưa có ảnh/video nào.</p>';
            return;
        }

        if (STATE.config.layout === 'carousel') {
            const track = document.createElement('div');
            track.className = 'carousel-track';
            
            STATE.photos.forEach((photo, idx) => {
                const item = document.createElement('div');
                item.className = 'carousel-item';
                const safeName = escapeHtml(photo.name);
                item.innerHTML = `
                    ${mediaPreviewHtml(photo, safeName)}
                    <div class="carousel-name">${safeName}</div>
                `;
                item.addEventListener('click', () => openPhotoViewer(photo, idx));
                track.appendChild(item);
            });
            
            container.appendChild(track);
            // Basic carousel controls
            // ... omitting complex sliding logic for brevity, just overflow-x scroll for now
            container.style.overflowX = 'auto';
            container.style.paddingBottom = '10px';

        } else if (STATE.config.layout === 'spotlight') {
            STATE.photos.forEach((photo, idx) => {
                const item = document.createElement('div');
                item.className = 'spotlight-item';
                const safeName = escapeHtml(photo.name);
                item.innerHTML = `
                    ${mediaPreviewHtml(photo, safeName)}
                    <div class="spotlight-name">${safeName}</div>
                `;
                item.addEventListener('click', () => openPhotoViewer(photo, idx));
                container.appendChild(item);
            });
        } else {
            STATE.photos.forEach((photo, idx) => {
                const item = document.createElement('div');
                const safeName = escapeHtml(photo.name);
                if (STATE.config.layout === 'bubble') {
                    item.className = 'gallery-bubble';
                    item.innerHTML = `
                        ${mediaPreviewHtml(photo, safeName)}
                        <div class="bubble-name">${safeName}</div>
                    `;
                } else if (STATE.config.layout === 'grid') {
                    item.className = 'gallery-grid-item';
                    item.innerHTML = `
                        ${mediaPreviewHtml(photo, safeName)}
                        <div class="grid-name">${safeName}</div>
                    `;
                }
                item.addEventListener('click', () => openPhotoViewer(photo, idx));
                container.appendChild(item);
            });
        }
        bindMemberHoverSounds(container);
    }

    let memoryDiscAutoTimer = null;

    function clearMemoryDiscAutoTimer() {
        if (memoryDiscAutoTimer) {
            clearTimeout(memoryDiscAutoTimer);
            memoryDiscAutoTimer = null;
        }
    }

    function scheduleMemoryDiscAutoPage(disc, totalPages) {
        clearMemoryDiscAutoTimer();
        if (!disc || !disc.classList.contains('playing') || totalPages <= 1) return;
        memoryDiscAutoTimer = setTimeout(() => {
            const currentPage = Number(disc.dataset.page || 0);
            disc.dataset.page = String((currentPage + 1) % totalPages);
            renderMemoryDisc();
        }, DISC_AUTO_PAGE_MS);
    }

    function renderMemoryDisc() {
        const section = document.getElementById('cdSection');
        const disc = document.getElementById('memoryCd');
        const ring = document.getElementById('cdPhotoRing');
        const text = document.getElementById('cdCoreText');
        if (!section || !disc || !ring) return;

        const allItems = getDiscPhotos();
        if (!allItems.length) {
            section.style.display = 'none';
            clearMemoryDiscAutoTimer();
            return;
        }
        section.style.display = '';

        const pageData = getDiscPageItems(STATE.photos, Number(disc.dataset.page || 0));
        disc.dataset.page = String(pageData.page);

        ring.innerHTML = pageData.items.map((item, order) => {
            const angle = (360 / pageData.items.length) * order;
            const photo = item.photo;
            const safeName = escapeHtml(photo.name || `Ảnh ${order + 1}`);
            return `
                <span class="cd-photo" style="--angle:${angle}deg;--reverse-angle:${-angle}deg" data-cd-idx="${item.idx}" title="${safeName}">
                    ${creativeMediaThumb(photo, safeName)}
                </span>
            `;
        }).join('');

        ring.querySelectorAll('[data-cd-idx]').forEach(node => {
            const idx = Number(node.dataset.cdIdx);
            node.addEventListener('click', (event) => {
                event.stopPropagation();
                openPhotoViewer(STATE.photos[idx], idx);
            });
        });

        let controls = section.querySelector('.cd-controls');
        if (!controls) {
            controls = document.createElement('div');
            controls.className = 'cd-controls';
            controls.innerHTML = `
                <button type="button" class="cd-page-btn" data-cd-step="-1" aria-label="Nhóm trước">‹</button>
                <span class="cd-page-label" id="cdPageLabel"></span>
                <button type="button" class="cd-page-btn" data-cd-step="1" aria-label="Nhóm sau">›</button>
            `;
            disc.insertAdjacentElement('afterend', controls);
        }

        controls.style.display = pageData.totalPages > 1 ? 'flex' : 'none';
        const pageLabel = controls.querySelector('.cd-page-label');
        if (pageLabel) pageLabel.textContent = `Nhóm ${pageData.page + 1}/${pageData.totalPages}`;

        if (!controls.dataset.bound) {
            controls.dataset.bound = '1';
            controls.querySelectorAll('[data-cd-step]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const latestTotal = getDiscPageItems().totalPages;
                    const currentPage = Number(disc.dataset.page || 0);
                    const step = Number(btn.dataset.cdStep || 0);
                    disc.dataset.page = String((currentPage + step + latestTotal) % latestTotal);
                    renderMemoryDisc();
                });
            });
        }

        if (!disc.dataset.bound) {
            disc.dataset.bound = '1';
            disc.addEventListener('click', () => {
                const playing = !disc.classList.contains('playing');
                disc.classList.toggle('playing', playing);
                disc.setAttribute('aria-pressed', playing ? 'true' : 'false');
                const label = document.getElementById('cdCoreText');
                const icon = disc.querySelector('.cd-core-icon');
                scheduleMemoryDiscAutoPage(disc, getDiscPageItems().totalPages);
                if (label) label.textContent = playing ? 'Đang quay' : 'Bấm để quay';
                if (icon) icon.textContent = playing ? 'Ⅱ' : '▶';
            });
        }

        if (text && !disc.classList.contains('playing')) text.textContent = 'Bấm để quay';
        scheduleMemoryDiscAutoPage(disc, pageData.totalPages);
    }

    // ===== PHOTO VIEWER MODAL =====
    const photoViewerModal = document.getElementById('photoViewerModal');
    const viewerImage = document.getElementById('viewerImage');
    const viewerVideo = document.getElementById('viewerVideo');
    const viewerEmbed = document.getElementById('viewerEmbed');
    const viewerThumb = document.getElementById('viewerThumb');
    const viewerThumbImage = document.getElementById('viewerThumbImage');
    const viewerThumbPlay = document.getElementById('viewerThumbPlay');
    const viewerThumbLink = document.getElementById('viewerThumbLink');
    const viewerName = document.getElementById('viewerName');
    const viewerMsg = document.getElementById('viewerMsg');
    const viewerBadge = document.getElementById('viewerBadge');
    const viewerQuote = document.getElementById('viewerQuote');
    const btnCloseViewer = document.getElementById('btnCloseViewer');

    function openPhotoViewer(photo, idx = 0) {
        if (!photo) return;
        const isVideoContent = isVideo(photo) || isEmbed(photo);
        photoViewerModal.classList.toggle('video-mode', isVideoContent);
        viewerImage.style.display = 'none';
        viewerVideo.style.display = 'none';
        viewerEmbed.style.display = 'none';
        if (viewerThumb) viewerThumb.style.display = 'none';
        viewerImage.removeAttribute('src');
        viewerEmbed.removeAttribute('src');
        if (viewerThumbImage) viewerThumbImage.removeAttribute('src');

        if (isEmbed(photo)) {
            viewerVideo.pause();
            viewerVideo.removeAttribute('src');
            const thumb = getEmbedThumbnailUrl(photo);
            if (thumb && viewerThumb && viewerThumbImage && viewerThumbPlay) {
                const playInline = () => {
                    viewerThumb.style.display = 'none';
                    viewerEmbed.style.display = 'block';
                    viewerEmbed.src = getAutoplayEmbedUrl(photo.embedUrl);
                };
                viewerThumb.style.display = 'flex';
                viewerThumb.title = 'Phát video trong khung';
                viewerThumbImage.src = thumb;
                if (viewerThumbLink) viewerThumbLink.href = photo.sourceUrl || photo.embedUrl;
                viewerThumb.onclick = (event) => {
                    if (event.target === viewerThumbLink) return;
                    playInline();
                };
                viewerThumbPlay.onclick = playInline;
            } else {
                viewerEmbed.style.display = 'block';
                viewerEmbed.src = getAutoplayEmbedUrl(photo.embedUrl);
            }
        } else if (isVideo(photo)) {
            viewerImage.style.display = 'none';
            viewerVideo.style.display = 'block';
            viewerVideo.src = photo.dataUrl;
            viewerVideo.currentTime = 0;
            viewerVideo.play().catch(() => {});
        } else {
            viewerVideo.pause();
            viewerVideo.style.display = 'none';
            viewerVideo.removeAttribute('src');
            viewerImage.style.display = 'block';
            viewerImage.src = photo.dataUrl;
        }
        viewerName.textContent = photo.name;
        viewerMsg.textContent = photo.msg || '';
        if (viewerBadge) viewerBadge.textContent = getPhotoTrait(photo, idx);
        if (viewerQuote) viewerQuote.textContent = photo.msg ? 'Một mảnh ký ức nhỏ trong album của lớp mình.' : 'Mỗi nụ cười trong khung hình này đều là một dấu ấn rất riêng.';
        photoViewerModal.classList.add('show');
        repairDocumentText(photoViewerModal);
    }

    function closePhotoViewer() {
        if (viewerVideo) {
            viewerVideo.pause();
            viewerVideo.removeAttribute('src');
        }
        if (viewerEmbed) {
            viewerEmbed.removeAttribute('src');
        }
        if (viewerThumb) viewerThumb.style.display = 'none';
        if (viewerThumbImage) viewerThumbImage.removeAttribute('src');
        photoViewerModal.classList.remove('video-mode');
        photoViewerModal.classList.remove('show');
    }

    btnCloseViewer.addEventListener('click', () => {
        closePhotoViewer();
    });

    photoViewerModal.addEventListener('click', (e) => {
        if (e.target === photoViewerModal) {
            closePhotoViewer();
        }
    });

    // ===== SLIDESHOW =====
    let currentSlide = 0;
    let slideInterval = null;
    let isSlideAutoPlaying = false;
    const IMAGE_SLIDE_MS = 4500;
    const MAX_VIDEO_SLIDE_MS = 30000;

    function initSlideshow() {
        if (STATE.photos.length === 0) return;
        currentSlide = 0;
        updateSlide();
    }

    function getAutoplayEmbedUrl(rawUrl) {
        try {
            const url = new URL(rawUrl);
            const host = url.hostname.replace(/^www\./, '');
            url.searchParams.set('autoplay', '1');
            url.searchParams.set('mute', '1');
            url.searchParams.set('playsinline', '1');
            url.searchParams.set('rel', '0');
            if ((host === 'youtube.com' || host === 'youtube-nocookie.com') && location.protocol.startsWith('http')) {
                url.searchParams.set('origin', location.origin);
            }
            return url.toString();
        } catch {
            return rawUrl;
        }
    }

    function stopCurrentSlideMedia() {
        const video = document.getElementById('slideImage')?.querySelector('video');
        if (!video) return;
        video.pause();
        video.removeAttribute('src');
        video.load();
    }

    function clearSlideTimer() {
        if (!slideInterval) return;
        clearTimeout(slideInterval);
        slideInterval = null;
    }

    function scheduleNextSlide(delay = IMAGE_SLIDE_MS) {
        clearSlideTimer();
        if (!isSlideAutoPlaying || STATE.photos.length <= 1) return;
        slideInterval = setTimeout(nextSlide, delay);
    }

    function playCurrentSlideMedia() {
        const video = document.getElementById('slideImage')?.querySelector('video');
        if (!video) return;
        video.muted = true;
        video.playsInline = true;
        video.play().catch(() => {});
    }

    function updateSlide() {
        if (STATE.photos.length === 0) return;
        const photo = STATE.photos[currentSlide];
        const slideImage = document.getElementById('slideImage');
        stopCurrentSlideMedia();
        clearSlideTimer();

        if (isEmbed(photo)) {
            const embedSrc = isSlideAutoPlaying ? getAutoplayEmbedUrl(photo.embedUrl) : photo.embedUrl;
            slideImage.innerHTML = `<iframe src="${embedSrc}" title="${escapeHtml(photo.name)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
            scheduleNextSlide(12000);
        } else if (isVideo(photo)) {
            slideImage.innerHTML = `<video class="slide-media" src="${photo.dataUrl}" controls autoplay muted playsinline preload="metadata"></video>`;
            const video = slideImage.querySelector('video');
            if (video) {
                video.addEventListener('loadedmetadata', () => {
                    if (!isSlideAutoPlaying) return;
                    const duration = Number.isFinite(video.duration) && video.duration > 0
                        ? Math.min(Math.max(video.duration * 1000 + 700, 5000), MAX_VIDEO_SLIDE_MS)
                        : 9000;
                    scheduleNextSlide(duration);
                }, { once: true });
                video.addEventListener('ended', () => {
                    if (isSlideAutoPlaying) nextSlide();
                });
                playCurrentSlideMedia();
                if (isSlideAutoPlaying) scheduleNextSlide(9000);
            }
        } else {
            const safeName = escapeHtml(photo.name);
            slideImage.innerHTML = `
                <div class="slide-backdrop" style="background-image:url('${photo.dataUrl}')"></div>
                <img class="slide-media" src="${photo.dataUrl}" alt="${safeName}">
            `;
            scheduleNextSlide();
        }
        const slideMessage = (photo.msg || '').trim();
        document.getElementById('slideName').textContent = photo.name;
        document.getElementById('slideMsg').textContent = slideMessage;
        document.getElementById('slideFullMsg').textContent = slideMessage;
        document.getElementById('slideCaptionCard').classList.toggle('is-empty', !slideMessage);
        
        // Update dots
        const dotsContainer = document.getElementById('slideshowDots');
        dotsContainer.innerHTML = '';
        STATE.photos.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.className = `dot ${idx === currentSlide ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                currentSlide = idx;
                updateSlide();
                pauseSlideshow();
            });
            dotsContainer.appendChild(dot);
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % STATE.photos.length;
        updateSlide();
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + STATE.photos.length) % STATE.photos.length;
        updateSlide();
    }

    document.getElementById('btnNextSlide').addEventListener('click', () => {
        nextSlide();
        pauseSlideshow();
    });
    
    document.getElementById('btnPrevSlide').addEventListener('click', () => {
        prevSlide();
        pauseSlideshow();
    });

    const btnPlaySlide = document.getElementById('btnPlaySlide');
    btnPlaySlide.addEventListener('click', () => {
        if (isSlideAutoPlaying) {
            pauseSlideshow();
        } else {
            playSlideshow();
        }
    });

    const btnTvSlide = document.getElementById('btnTvSlide');
    const slideshowWrapper = document.querySelector('.slideshow-wrapper');
    let tvControlsTimer = null;

    function updateTvSlideButton() {
        if (!btnTvSlide || !slideshowWrapper) return;
        btnTvSlide.textContent = slideshowWrapper.classList.contains('tv-mode') ? 'Thu nhỏ' : 'Phóng to';
        btnTvSlide.classList.toggle('active', slideshowWrapper.classList.contains('tv-mode'));
    }

    function showTvSlideControls() {
        if (!slideshowWrapper || !slideshowWrapper.classList.contains('tv-mode')) return;
        slideshowWrapper.classList.remove('tv-controls-hidden');
        clearTimeout(tvControlsTimer);
        tvControlsTimer = setTimeout(() => {
            slideshowWrapper.classList.add('tv-controls-hidden');
        }, 2600);
    }

    async function enterTvSlideMode() {
        if (!slideshowWrapper) return;
        slideshowWrapper.classList.add('tv-mode');
        updateTvSlideButton();
        showTvSlideControls();
        if (!document.fullscreenElement && slideshowWrapper.requestFullscreen) {
            try {
                await slideshowWrapper.requestFullscreen();
            } catch {}
        }
    }

    async function exitTvSlideMode() {
        if (!slideshowWrapper) return;
        if (document.fullscreenElement === slideshowWrapper && document.exitFullscreen) {
            try {
                await document.exitFullscreen();
            } catch {}
        }
        clearTimeout(tvControlsTimer);
        slideshowWrapper.classList.remove('tv-mode', 'tv-controls-hidden');
        updateTvSlideButton();
    }

    if (btnTvSlide && slideshowWrapper) {
        btnTvSlide.addEventListener('click', () => {
            if (slideshowWrapper.classList.contains('tv-mode')) {
                exitTvSlideMode();
            } else {
                enterTvSlideMode();
            }
        });
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement !== slideshowWrapper) {
                clearTimeout(tvControlsTimer);
                slideshowWrapper.classList.remove('tv-mode', 'tv-controls-hidden');
            }
            updateTvSlideButton();
        });
        ['mousemove', 'pointerdown', 'touchstart', 'keydown'].forEach(eventName => {
            slideshowWrapper.addEventListener(eventName, showTvSlideControls, { passive: true });
        });
    }

    function playSlideshow() {
        btnPlaySlide.textContent = '⏸ Pause';
        btnPlaySlide.classList.add('active');
        isSlideAutoPlaying = true;
        updateSlide();
    }

    function pauseSlideshow() {
        btnPlaySlide.textContent = '▶ Auto';
        btnPlaySlide.classList.remove('active');
        isSlideAutoPlaying = false;
        clearSlideTimer();
        const video = document.getElementById('slideImage')?.querySelector('video');
        if (video) video.pause();
    }

    // ===== EXPORT / IMPORT (JSON) =====
    const btnExport = document.getElementById('btnExport');
    
    btnExport.addEventListener('click', () => {
        saveFormToState();
        ensureGuestbookAccessConfig();
        syncGuestbookAccessUi();
        scheduleDraftSave(true);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(STATE));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        let safeClassName = (STATE.config.className || 'Lop').replace(/\\s+/g, '-');
        downloadAnchorNode.setAttribute("download", `KiYeu_${safeClassName}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        // Removed mock link here
    });

    // ===== SHARE HTML =====
    const btnShareHTML = document.getElementById('btnShareHTML');
    const btnCopyTransferNote = document.getElementById('btnCopyTransferNote');
    const kyYeuTransferNote = document.getElementById('kyYeuTransferNote');
    const kyYeuExportCodeInput = document.getElementById('kyYeuExportCode');
    const kyYeuExportEmailInput = document.getElementById('kyYeuExportEmail');
    const btnCopyGuestbookAdminCode = document.getElementById('btnCopyGuestbookAdminCode');
    const guestbookAdminCodeInput = document.getElementById('guestbookAdminCode');

    syncExportPaymentUi();
    syncGuestbookAccessUi();
    if (kyYeuExportCodeInput) {
        kyYeuExportCodeInput.value = getSavedKyYeuExportCode();
        kyYeuExportCodeInput.addEventListener('input', () => {
            kyYeuExportCodeInput.value = normalizeKyYeuExportCode(kyYeuExportCodeInput.value);
        });
        kyYeuExportCodeInput.addEventListener('change', () => {
            const code = normalizeKyYeuExportCode(kyYeuExportCodeInput.value);
            kyYeuExportCodeInput.value = code;
            if (code) saveKyYeuExportCode(code);
        });
    }
    if (kyYeuExportEmailInput) {
        kyYeuExportEmailInput.value = getKyYeuSessionEmail() || getSavedKyYeuExportEmail();
        kyYeuExportEmailInput.addEventListener('input', () => {
            kyYeuExportEmailInput.value = normalizeKyYeuExportEmail(kyYeuExportEmailInput.value);
        });
        kyYeuExportEmailInput.addEventListener('change', () => {
            const email = normalizeKyYeuExportEmail(kyYeuExportEmailInput.value);
            kyYeuExportEmailInput.value = email;
            if (email) saveKyYeuExportEmail(email);
        });
    }

    if (btnCopyTransferNote && kyYeuTransferNote) {
        btnCopyTransferNote.addEventListener('click', async () => {
            syncExportPaymentUi();
            const note = kyYeuTransferNote.value;
            try {
                await navigator.clipboard.writeText(note);
                btnCopyTransferNote.textContent = 'Đã copy';
                setTimeout(() => btnCopyTransferNote.textContent = 'Copy nội dung CK', 1500);
            } catch {
                kyYeuTransferNote.select();
                document.execCommand('copy');
            }
        });
    }

    if (btnCopyGuestbookAdminCode && guestbookAdminCodeInput) {
        btnCopyGuestbookAdminCode.addEventListener('click', async () => {
            syncGuestbookAccessUi();
            try {
                await navigator.clipboard.writeText(guestbookAdminCodeInput.value);
                btnCopyGuestbookAdminCode.textContent = 'Đã copy';
                setTimeout(() => { btnCopyGuestbookAdminCode.textContent = 'Copy mã'; }, 1400);
            } catch (err) {
                alert('Mã duyệt lưu bút: ' + guestbookAdminCodeInput.value);
            }
        });
    }

    function escapeHtml(str) {
        return repairMojibakeText(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function dataUrlToBlob(dataUrl) {
        const parts = String(dataUrl || '').split(',');
        if (parts.length < 2) return new Blob([]);
        const mimeMatch = parts[0].match(/data:([^;]+)/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const binary = atob(parts.slice(1).join(','));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    function getDataUrlMime(dataUrl) {
        const match = String(dataUrl || '').match(/^data:([^;]+)/);
        return match ? match[1] : '';
    }

    function extensionFromMime(mime, fallback = 'bin') {
        const map = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
            'video/mp4': 'mp4',
            'video/webm': 'webm',
            'video/quicktime': 'mov',
            'audio/mpeg': 'mp3',
            'audio/mp3': 'mp3',
            'audio/mp4': 'm4a',
            'audio/wav': 'wav',
            'audio/webm': 'webm',
            'audio/ogg': 'ogg'
        };
        return map[String(mime || '').toLowerCase()] || fallback;
    }

    function cleanFilePart(value, fallback) {
        return String(value || fallback || 'file')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 50) || fallback || 'file';
    }

    async function getAssetBlob(assetPath) {
        if (window.YEARBOOK_ASSETS && window.YEARBOOK_ASSETS[assetPath]) {
            return dataUrlToBlob(window.YEARBOOK_ASSETS[assetPath]);
        }
        const response = await fetch(assetPath);
        if (!response.ok) throw new Error(`Không đọc được asset: ${assetPath}`);
        return response.blob();
    }

    function packagedMediaPreviewHtml(item, altText = '') {
        if (isEmbed(item)) {
            const thumb = getEmbedThumbnailUrl(item);
            if (thumb) return `<div class="embed-preview has-thumb"><img src="${thumb}" alt="${altText}"><span class="embed-play">▶</span><span>Video YouTube</span></div>`;
            return `<div class="embed-preview"><span class="embed-play">▶</span><span>Link video</span></div>`;
        }
        if (isVideo(item)) {
            return `<video src="${item.dataUrl}" muted preload="metadata" playsinline></video><span class="video-play-badge">▶</span>`;
        }
        return `<img src="${item.dataUrl}" alt="${altText}">`;
    }

    async function inlineCssAsset(css, assetPath) {
        const replaceAssetUrl = (dataUrl) => {
            const pathPattern = escapeRegExp(assetPath);
            return css.replace(new RegExp(`url\\((['"]?)${pathPattern}\\1\\)`, 'g'), `url("${dataUrl}")`);
        };

        if (window.YEARBOOK_ASSETS && window.YEARBOOK_ASSETS[assetPath]) {
            return replaceAssetUrl(window.YEARBOOK_ASSETS[assetPath]);
        }

        try {
            const response = await fetch(assetPath);
            if (!response.ok) return css;
            const dataUrl = await blobToDataUrl(await response.blob());
            return replaceAssetUrl(dataUrl);
        } catch {
            return css;
        }
    }

    if (btnShareHTML) {
        btnShareHTML.addEventListener('click', async () => {
            saveFormToState();
            ensureGuestbookAccessConfig();
            normalizeStateText();
            syncExportPaymentUi();
            syncGuestbookAccessUi();
            scheduleDraftSave(true);
            if (STATE.photos.length === 0) {
                alert('Vui lòng thêm ít nhất 1 ảnh hoặc video trước!');
                return;
            }
            const transferNote = getExportTransferNote();
            const confirmedExport = confirm(
                `Xuất file HTML/ZIP độc lập cần mã hoặc xác nhận lượt xuất từ admin.\n\n` +
                `Phí: 30.000đ / lượt xuất\n` +
                `STK: ${EXPORT_PAYMENT.accountNo} - ${EXPORT_PAYMENT.accountName}\n` +
                `Zalo admin: ${EXPORT_PAYMENT.adminZalo}\n` +
                `Nội dung CK: ${transferNote}\n\n` +
                `Nếu thầy/cô đã có mã/còn lượt hoặc đã được admin xác nhận, bấm OK để tiếp tục xuất.`
            );
            if (!confirmedExport) return;
            btnShareHTML.disabled = true;
            const exportReservation = await requestKyYeuExportTurn();
            if (!exportReservation) {
                btnShareHTML.disabled = false;
                return;
            }
            btnShareHTML.textContent = '⏳ Đang đóng gói web...';
            const heicNames = getHeicLikeMediaNames();
            if (heicNames.length) {
                alert(heicAndroidWarning(heicNames));
                await rollbackKyYeuExportTurn(exportReservation);
                btnShareHTML.disabled = false;
                btnShareHTML.textContent = '🌐 Bước 1: Xuất bản web (.zip)';
                return;
            }
            btnShareHTML.disabled = true;
            await new Promise(r => setTimeout(r, 50));

            try {
                const zip = new JSZip();
                let css = window.YEARBOOK_STYLE_CSS || '';
                if (!css) try { const r = await fetch('style.css'); css = await r.text(); } catch {
                    for (const s of document.styleSheets) { try { for (const ru of s.cssRules) css += ru.cssText + '\n'; } catch {} }
                }
                css += '\n/* Live guestbook export styles */\n' + getLiveGuestbookExportCss();
                if (!css.trim()) {
                    throw new Error('Không đọc được CSS để đóng gói. Hãy mở file index.html trong thư mục app mới nhất, hoặc chạy bằng địa chỉ http://127.0.0.1:5173 rồi xuất lại.');
                }
                const assetPaths = [
                    'assets/bg-sakura.png',
                    'assets/bg-galaxy.png',
                    'assets/bg-nature.png',
                    'assets/bg-ocean.png',
                    'assets/bg-sunset.png',
                    'anhnen/2.png',
                    'anhnen/nenmoi.png'
                ];
                for (const assetPath of assetPaths) {
                    zip.file(assetPath, await getAssetBlob(assetPath));
                }

                const c = STATE.config;
                const ph = STATE.photos;
                const fMap = {'dancing':"'Dancing Script',cursive",'great-vibes':"'Great Vibes',cursive",'pacifico':"'Pacifico',cursive",'lobster':"'Lobster',cursive",'playfair':"'Playfair Display',serif"};
                const ff = fMap[c.font] || fMap.dancing;
                const coverYearParts = getCoverYearParts(c.year);
                const coverClassLabel = getCoverClassLabel(c.className);
                const packagedPhotos = [];

                ph.forEach((p, i) => {
                    const mediaType = getMediaType(p);
                    const item = {
                        dataUrl: '',
                        embedUrl: p.embedUrl || '',
                        sourceUrl: p.sourceUrl || '',
                        type: mediaType,
                        mimeType: p.mimeType || getDataUrlMime(p.dataUrl) || '',
                        name: p.name || '',
                        msg: p.msg || '',
                        trait: getPhotoTrait(p, i)
                    };
                    if (!isEmbed(item) && p.dataUrl) {
                        const mime = item.mimeType || getDataUrlMime(p.dataUrl);
                        const ext = extensionFromMime(mime, isVideo(item) ? 'mp4' : 'jpg');
                        const folder = isVideo(item) ? 'media/videos' : 'media/photos';
                        const fileName = `${String(i + 1).padStart(2, '0')}-${cleanFilePart(p.name, mediaType)}.${ext}`;
                        const mediaPath = `${folder}/${fileName}`;
                        zip.file(mediaPath, dataUrlToBlob(p.dataUrl));
                        item.dataUrl = mediaPath;
                        item.mimeType = mime;
                    }
                    packagedPhotos.push(item);
                });

                let gHTML = '';
                packagedPhotos.forEach((p,i) => {
                    const mediaHtml = packagedMediaPreviewHtml(p, escapeHtml(p.name));
                    if (c.layout === 'carousel') {
                        gHTML += `<div class="carousel-item" data-idx="${i}">${mediaHtml}<div class="carousel-name">${escapeHtml(p.name)}</div></div>`;
                    } else if (c.layout === 'spotlight') {
                        gHTML += `<div class="spotlight-item" data-idx="${i}">${mediaHtml}<div class="spotlight-name">${escapeHtml(p.name)}</div></div>`;
                    } else if (c.layout === 'grid') {
                        gHTML += `<div class="gallery-grid-item" data-idx="${i}">${mediaHtml}<div class="grid-name">${escapeHtml(p.name)}</div></div>`;
                    } else {
                        gHTML += `<div class="gallery-bubble" data-idx="${i}">${mediaHtml}<div class="bubble-name">${escapeHtml(p.name)}</div></div>`;
                    }
                });
                if (c.layout === 'carousel') gHTML = `<div class="carousel-track">${gHTML}</div>`;
                const cdItems = getDiscPageItems(packagedPhotos, 0).items;
                const cdHTML = cdItems.map((item, order) => {
                    const angle = (360 / cdItems.length) * order;
                    const p = item.photo;
                    const idx = item.idx >= 0 ? item.idx : order;
                    const safeName = escapeHtml(p.name || `Ảnh ${order + 1}`);
                    return `<span class="cd-photo" style="--angle:${angle}deg;--reverse-angle:${-angle}deg" data-cd-idx="${idx}" title="${safeName}">${creativeMediaThumb(p, safeName)}</span>`;
                }).join('');
                const timelineHTML = buildTimelineItems(packagedPhotos, c).map(item => {
                    const thumb = item.media ? `<div class="timeline-thumb">${creativeMediaThumb(item.media, escapeHtml(item.media.name || item.title))}</div>` : '';
                    return `<article class="timeline-card"><div class="timeline-dot">${escapeHtml(item.icon)}</div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p>${thumb}</article>`;
                }).join('');
                const guestbookHTML = buildGuestbookItems(c).map(note => `<article class="guest-note ${note.featured ? 'featured' : ''}"><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.text).replace(/\n/g,'<br>')}</p><span class="guest-sign">${escapeHtml(note.sign)}</span></article>`).join('');
                const liveGuestbookHTML = `<section class="yb-section live-guestbook-section" id="liveGuestbookSection">
<div class="section-eyebrow">L&#432;u b&#250;t t&#432;&#417;ng t&#225;c</div>
<h2 class="section-title script-font" style="font-family:${ff}">PH/HS g&#7917;i l&#7901;i nh&#7855;n</h2>
<div class="live-guestbook" id="liveGuestbook">
<div class="live-guestbook-head">
<div><h3>Góc lưu bút PH/HS</h3><p>Phụ huynh và học sinh có thể gửi lời nhắn. Lời nhắn sẽ hiện sau khi giáo viên duyệt.</p></div>
<button type="button" class="live-guestbook-manage" id="liveGuestbookManage">Quản lý</button>
</div>
<form class="live-guestbook-form" id="liveGuestbookForm">
<input type="text" id="liveGuestbookName" maxlength="60" placeholder="Tên phụ huynh / học sinh" required>
<select id="liveGuestbookRole" aria-label="Vai trò"><option value="Học sinh">Học sinh</option><option value="Phụ huynh">Phụ huynh</option></select>
<button type="submit" class="live-guestbook-submit">Gửi</button>
<textarea id="liveGuestbookMessage" maxlength="600" placeholder="Viết vài dòng suy nghĩ..." required></textarea>
</form>
<p class="live-guestbook-status" id="liveGuestbookStatus"></p>
<div class="live-note-list" id="liveApprovedNotes"></div>
<div class="live-admin-panel" id="liveAdminPanel">
<div class="live-admin-login"><input type="password" id="liveAdminCode" placeholder="Nhập mã duyệt lưu bút"><button type="button" id="liveAdminUnlock">Mở duyệt</button></div>
<p class="live-admin-title">Lời nhắn chờ duyệt</p>
<div class="live-note-list" id="livePendingNotes"></div>
</div>
</div>
</section>`;

                let audioTag = '<audio id="bgMusic" loop preload="auto"></audio>';
                if (c.customAudioData) {
                    const audioMime = getDataUrlMime(c.customAudioData);
                    const audioPath = `media/audio/background.${extensionFromMime(audioMime, 'mp3')}`;
                    zip.file(audioPath, dataUrlToBlob(c.customAudioData));
                    audioTag = `<audio id="bgMusic" loop preload="auto" src="${audioPath}"></audio>`;
                }

                const viewerJS = `
var photos = ${JSON.stringify(packagedPhotos)};
var guestbookConfig = ${JSON.stringify({ yearbookId: c.yearbookId, adminCode: c.guestbookAdminCode })};
var currentSlide = 0, slideInterval = null, isMusicPlaying = false, isSlideAutoPlaying = false;
var IMAGE_SLIDE_MS = 4500, MAX_VIDEO_SLIDE_MS = 30000;
var DISC_PAGE_SIZE = 12, DISC_AUTO_PAGE_MS = 7000, memoryDiscPage = 0, memoryDiscAutoTimer = null;
var bgMusic = document.getElementById('bgMusic');
var btnMT = document.getElementById('btnMusicToggle');
function isEmbed(p){return p&&p.type==='embed';}
function isVideo(p){return p&&(p.type==='video'||(p.mimeType&&p.mimeType.indexOf('video/')===0)||(p.dataUrl&&p.dataUrl.indexOf('data:video/')===0));}
function escapeHtmlValue(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
function getDiscItems(){return photos.map(function(photo,idx){return {photo:photo,idx:idx};}).filter(function(item){return item.photo&&!isEmbed(item.photo);});}
function getDiscPageData(page){var items=getDiscItems();var totalPages=Math.max(1,Math.ceil(items.length/DISC_PAGE_SIZE));var safePage=(((Number(page)||0)%totalPages)+totalPages)%totalPages;return {items:items.slice(safePage*DISC_PAGE_SIZE,(safePage+1)*DISC_PAGE_SIZE),page:safePage,totalPages:totalPages,totalItems:items.length};}
function cdThumbHtml(p,alt){if(!p)return '';if(isVideo(p))return '<video src="'+escapeHtmlValue(p.dataUrl)+'" muted preload="metadata" playsinline></video>';return '<img src="'+escapeHtmlValue(p.dataUrl)+'" alt="'+escapeHtmlValue(alt)+'">';}
function getYouTubeIdFromUrl(rawUrl){try{var u=new URL(String(rawUrl||'').trim());var h=u.hostname.replace(/^www\\./,'');if(h==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||'';if(h==='youtube.com'||h==='m.youtube.com'||h==='youtube-nocookie.com'){var parts=u.pathname.split('/').filter(Boolean);return u.searchParams.get('v')||((['shorts','embed','live'].indexOf(parts[0])>=0)?parts[1]:'')||'';}}catch(e){}return '';}
function getEmbedThumbnailUrl(p){var id=getYouTubeIdFromUrl((p&&p.sourceUrl)||(p&&p.embedUrl)||'');return id?'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg':'';}
var CP1252_BYTE_MAP={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
var MOJIBAKE_RUN_RE=/[\u0080-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2018-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]{2,}/g;
function decodeMojibakeRun(run){var bytes=[];for(var i=0;i<run.length;i++){var ch=run.charAt(i);var code=ch.charCodeAt(0);if(code<=255)bytes.push(code);else if(CP1252_BYTE_MAP[ch]!=null)bytes.push(CP1252_BYTE_MAP[ch]);else return run;}try{if(window.TextDecoder)return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes));return decodeURIComponent(bytes.map(function(b){return '%'+b.toString(16).padStart(2,'0');}).join(''));}catch(e){return run;}}
function repairMojibakeText(value){if(value==null)return '';var text=String(value);for(var i=0;i<3;i++){var next=text.replace(MOJIBAKE_RUN_RE,decodeMojibakeRun);if(next===text)break;text=next;}return text;}
function repairDocumentText(root){root=root||document.body;if(!root)return;var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(function(n){var fixed=repairMojibakeText(n.nodeValue);if(fixed!==n.nodeValue)n.nodeValue=fixed;});root.querySelectorAll('[title],[placeholder],[alt],[aria-label]').forEach(function(el){['title','placeholder','alt','aria-label'].forEach(function(attr){if(!el.hasAttribute(attr))return;var fixed=repairMojibakeText(el.getAttribute(attr));if(fixed!==el.getAttribute(attr))el.setAttribute(attr,fixed);});});}
var memberHoverSoundEnabled = ${c.memberHoverSound !== false};
var memberHoverAudioCtx = null, lastMemberHoverSoundAt = 0;
function unlockMemberHoverSound(){
    if(!memberHoverSoundEnabled)return;
    var AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
    if(!memberHoverAudioCtx)memberHoverAudioCtx=new AudioCtx();
    var ctx=memberHoverAudioCtx;if(ctx.state==='suspended')ctx.resume().catch(function(){});
    var osc=ctx.createOscillator();var gain=ctx.createGain();
    gain.gain.setValueAtTime(0.0001,ctx.currentTime);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.02);
}
function playMemberHoverSound(){
    if(!memberHoverSoundEnabled)return;
    var now=performance.now();if(now-lastMemberHoverSoundAt<140)return;lastMemberHoverSoundAt=now;
    var AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
    if(!memberHoverAudioCtx)memberHoverAudioCtx=new AudioCtx();
    var ctx=memberHoverAudioCtx;if(ctx.state==='suspended')ctx.resume().catch(function(){});
    var start=ctx.currentTime+0.01;var master=ctx.createGain();
    master.gain.setValueAtTime(0.0001,start);master.gain.exponentialRampToValueAtTime(0.055,start+0.018);master.gain.exponentialRampToValueAtTime(0.0001,start+0.34);master.connect(ctx.destination);
    [740,990,1320].forEach(function(freq,idx){var osc=ctx.createOscillator();var gain=ctx.createGain();var t=start+idx*0.045;osc.type=idx===1?'triangle':'sine';osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*1.18,t+0.16);gain.gain.setValueAtTime(0.0001,t);gain.gain.exponentialRampToValueAtTime(0.42-idx*0.08,t+0.012);gain.gain.exponentialRampToValueAtTime(0.0001,t+0.22);osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+0.24);});
}

document.getElementById('coverBook').addEventListener('click', function(){
    unlockMemberHoverSound();
    this.classList.add('open');
    document.querySelector('.cover-tap-hint').style.display='none';
    if(bgMusic&&bgMusic.getAttribute('src')){bgMusic.volume=0.5;bgMusic.play().then(function(){isMusicPlaying=true;btnMT.style.display='flex';btnMT.classList.add('playing');}).catch(function(){btnMT.style.display='flex';});}
    setTimeout(function(){document.getElementById('coverSection').classList.add('hidden');document.getElementById('yearbookMain').classList.add('show');document.body.classList.add('yearbook-open');observeSections();},1200);
});
document.addEventListener('pointerdown',unlockMemberHoverSound,{once:true});

btnMT.addEventListener('click',function(){
    if(!bgMusic||!bgMusic.getAttribute('src'))return;
    if(isMusicPlaying){bgMusic.pause();isMusicPlaying=false;btnMT.classList.remove('playing');btnMT.innerHTML='<span class="music-icon">🔇</span>';}
    else{bgMusic.play().catch(function(){});isMusicPlaying=true;btnMT.classList.add('playing');btnMT.innerHTML='<span class="music-bars"><span></span><span></span><span></span><span></span></span>';}
});

var btnPM=document.getElementById('btnPlayMainMusic');
if(btnPM)btnPM.addEventListener('click',function(){btnMT.click();});

(function setupYearbookActions(){
    var key='kiyeu_reactions_v1';
    var state={heart:0,like:0};
    try{var saved=JSON.parse(localStorage.getItem(key)||'{}');state.heart=Number(saved.heart)||0;state.like=Number(saved.like)||0;}catch(e){}
    function render(){var h=document.getElementById('heartCount');var l=document.getElementById('likeCount');if(h)h.textContent=state.heart;if(l)l.textContent=state.like;}
    function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch(e){}}
    function stopMusic(){if(!bgMusic)return;bgMusic.pause();isMusicPlaying=false;if(btnMT){btnMT.classList.remove('playing');btnMT.innerHTML='<span class="music-icon">🔇</span>';}}
    function closeYearbook(){document.getElementById('coverSection').classList.remove('hidden');document.getElementById('yearbookMain').classList.remove('show');document.body.classList.remove('yearbook-open');document.getElementById('coverBook').classList.remove('open');var hint=document.querySelector('.cover-tap-hint');if(hint)hint.style.display='inline-flex';stopMusic();window.scrollTo({top:0,behavior:'smooth'});}
    function floatReaction(symbol,el){var r=el.getBoundingClientRect();var f=document.createElement('span');f.className='reaction-float';f.textContent=symbol;f.style.left=(r.left+r.width/2)+'px';f.style.top=r.top+'px';document.body.appendChild(f);f.addEventListener('animationend',function(){f.remove();},{once:true});}
    var closeBtn=document.getElementById('btnCloseYearbook');if(closeBtn)closeBtn.addEventListener('click',closeYearbook);
    document.querySelectorAll('.reaction-btn').forEach(function(btn){btn.addEventListener('click',function(){var type=btn.dataset.reaction;if(type!=='heart'&&type!=='like')return;state[type]+=1;render();save();floatReaction(type==='heart'?'❤️':'👍',btn);});});
    render();
})();

function setupLiveGuestbook(){
    var root=document.getElementById('liveGuestbook');
    if(!root||!guestbookConfig||!guestbookConfig.yearbookId)return;
    var FIREBASE_DB='https://kyyeu-guestbook-default-rtdb.asia-southeast1.firebasedatabase.app';
    var form=document.getElementById('liveGuestbookForm');
    var nameInput=document.getElementById('liveGuestbookName');
    var roleInput=document.getElementById('liveGuestbookRole');
    var messageInput=document.getElementById('liveGuestbookMessage');
    var statusEl=document.getElementById('liveGuestbookStatus');
    var approvedList=document.getElementById('liveApprovedNotes');
    var pendingList=document.getElementById('livePendingNotes');
    var manageBtn=document.getElementById('liveGuestbookManage');
    var adminPanel=document.getElementById('liveAdminPanel');
    var adminCodeInput=document.getElementById('liveAdminCode');
    var adminUnlock=document.getElementById('liveAdminUnlock');
    var adminUnlocked=false;
    function notesUrl(id){
        var base=FIREBASE_DB+'/kyyeu-guestbook/'+encodeURIComponent(guestbookConfig.yearbookId)+'/notes';
        return base+(id?'/'+encodeURIComponent(id):'')+'.json';
    }
    function setStatus(text,type){
        if(!statusEl)return;
        statusEl.textContent=text||'';
        statusEl.style.color=type==='error'?'#b42318':(type==='ok'?'var(--primary)':'var(--text2)');
    }
    function makeNoteId(){
        var rand=Math.random().toString(36).slice(2,9);
        if(window.crypto&&window.crypto.getRandomValues){
            var bytes=new Uint8Array(4);
            window.crypto.getRandomValues(bytes);
            rand=Array.from(bytes,function(b){return b.toString(36).padStart(2,'0');}).join('').slice(0,9);
        }
        return 'note_'+Date.now().toString(36)+'_'+rand;
    }
    function normalizeNotes(raw){
        return Object.keys(raw||{}).map(function(id){
            var note=raw[id]||{};
            note.id=note.id||id;
            return note;
        }).sort(function(a,b){return (Number(b.createdAt)||0)-(Number(a.createdAt)||0);});
    }
    async function fetchNotes(){
        var res=await fetch(notesUrl(),{cache:'no-store'});
        if(!res.ok)throw new Error('Không đọc được lưu bút.');
        return normalizeNotes(await res.json());
    }
    function renderNotes(target,notes,emptyText,isPending){
        if(!target)return;
        target.innerHTML='';
        if(!notes.length){
            var empty=document.createElement('p');
            empty.className='live-empty';
            empty.textContent=emptyText;
            target.appendChild(empty);
            return;
        }
        notes.forEach(function(note){
            var card=document.createElement('article');
            card.className='live-note';
            var text=document.createElement('p');
            text.textContent=note.message||'';
            var footer=document.createElement('footer');
            var name=document.createElement('span');
            name.textContent=(note.name||'Ẩn danh')+' - '+(note.role||'Lưu bút');
            var date=document.createElement('span');
            date.textContent=note.createdAt?new Date(note.createdAt).toLocaleDateString('vi-VN'):'';
            footer.appendChild(name);
            footer.appendChild(date);
            card.appendChild(text);
            card.appendChild(footer);
            if(isPending){
                var actions=document.createElement('div');
                actions.className='live-note-actions';
                var approve=document.createElement('button');
                approve.type='button';
                approve.className='live-note-approve';
                approve.textContent='Duyệt';
                approve.addEventListener('click',function(){approveNote(note.id);});
                var del=document.createElement('button');
                del.type='button';
                del.className='live-note-delete';
                del.textContent='Xóa';
                del.addEventListener('click',function(){deleteNote(note.id);});
                actions.appendChild(approve);
                actions.appendChild(del);
                card.appendChild(actions);
            }
            target.appendChild(card);
        });
        repairDocumentText(target);
    }
    async function loadApproved(){
        try{
            var notes=await fetchNotes();
            renderNotes(approvedList,notes.filter(function(n){return n.status==='approved';}),'Chưa có lời nhắn đã duyệt.',false);
        }catch(err){
            console.error('Guestbook approved load failed',err);
            renderNotes(approvedList,[],'Chưa tải được lưu bút. Vui lòng thử lại sau.',false);
        }
    }
    async function loadPending(){
        if(!adminUnlocked)return;
        try{
            var notes=await fetchNotes();
            renderNotes(pendingList,notes.filter(function(n){return n.status!=='approved';}),'Không có lời nhắn chờ duyệt.',true);
        }catch(err){
            console.error('Guestbook pending load failed',err);
            renderNotes(pendingList,[],'Chưa tải được danh sách chờ duyệt.',true);
        }
    }
    async function approveNote(id){
        if(!id)return;
        setStatus('Đang duyệt lời nhắn...', '');
        try{
            var res=await fetch(notesUrl(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'approved',approvedAt:Date.now()})});
            if(!res.ok)throw new Error('Duyệt thất bại.');
            setStatus('Đã duyệt lời nhắn.', 'ok');
            await loadApproved();
            await loadPending();
        }catch(err){
            console.error('Guestbook approve failed',err);
            setStatus('Chưa duyệt được lời nhắn.', 'error');
        }
    }
    async function deleteNote(id){
        if(!id||!confirm('Xóa lời nhắn này?'))return;
        setStatus('Đang xóa lời nhắn...', '');
        try{
            var res=await fetch(notesUrl(id),{method:'DELETE'});
            if(!res.ok)throw new Error('Xóa thất bại.');
            setStatus('Đã xóa lời nhắn.', 'ok');
            await loadApproved();
            await loadPending();
        }catch(err){
            console.error('Guestbook delete failed',err);
            setStatus('Chưa xóa được lời nhắn.', 'error');
        }
    }
    if(form){
        form.addEventListener('submit',async function(e){
            e.preventDefault();
            var name=(nameInput&&nameInput.value||'').trim().slice(0,60);
            var role=(roleInput&&roleInput.value||'Học sinh').trim().slice(0,30);
            var message=(messageInput&&messageInput.value||'').trim().slice(0,600);
            if(!name||!message){setStatus('Vui lòng nhập tên và lời nhắn.', 'error');return;}
            var id=makeNoteId();
            var note={id:id,name:name,role:role,message:message,status:'pending',createdAt:Date.now()};
            setStatus('Đang gửi lời nhắn...', '');
            try{
                var res=await fetch(notesUrl(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(note)});
                if(!res.ok)throw new Error('Gửi thất bại.');
                form.reset();
                setStatus('Đã gửi. Lời nhắn sẽ hiện sau khi giáo viên duyệt.', 'ok');
                await loadPending();
            }catch(err){
                console.error('Guestbook submit failed',err);
                setStatus('Chưa gửi được lời nhắn. Vui lòng thử lại.', 'error');
            }
        });
    }
    if(manageBtn&&adminPanel){
        manageBtn.addEventListener('click',function(){
            adminPanel.classList.toggle('show');
            if(adminPanel.classList.contains('show')&&adminUnlocked)loadPending();
        });
    }
    if(adminUnlock){
        adminUnlock.addEventListener('click',function(){
            var input=(adminCodeInput&&adminCodeInput.value||'').trim();
            if(input!==String(guestbookConfig.adminCode||'').trim()){
                setStatus('Mã duyệt chưa đúng.', 'error');
                return;
            }
            adminUnlocked=true;
            setStatus('Đã mở quyền duyệt lưu bút.', 'ok');
            loadPending();
        });
    }
    loadApproved();
}
setupLiveGuestbook();

document.querySelectorAll('[data-idx]').forEach(function(el){
    el.style.cursor='pointer';
    el.setAttribute('tabindex','0');
    el.addEventListener('mouseenter',playMemberHoverSound);
    el.addEventListener('focus',playMemberHoverSound);
    el.addEventListener('click',function(){
        var i=parseInt(this.dataset.idx);
        var p=photos[i];if(!p)return;
        var img=document.getElementById('viewerImage');
        var vid=document.getElementById('viewerVideo');
        var emb=document.getElementById('viewerEmbed');
        var thumb=document.getElementById('viewerThumb');
        var thumbImg=document.getElementById('viewerThumbImage');
        var thumbPlay=document.getElementById('viewerThumbPlay');
        var thumbLink=document.getElementById('viewerThumbLink');
        var modal=document.getElementById('photoViewerModal');
        modal.classList.toggle('video-mode',isEmbed(p)||isVideo(p));
        img.style.display='none';vid.style.display='none';emb.style.display='none';if(thumb)thumb.style.display='none';img.removeAttribute('src');emb.removeAttribute('src');if(thumbImg)thumbImg.removeAttribute('src');
        if(isEmbed(p)){vid.pause();vid.removeAttribute('src');var thumbUrl=getEmbedThumbnailUrl(p);if(thumbUrl&&thumb&&thumbImg&&thumbPlay){var playInline=function(){thumb.style.display='none';emb.style.display='block';emb.src=getAutoplayEmbedUrl(p.embedUrl);};thumb.style.display='flex';thumb.title='Phát video trong khung';thumbImg.src=thumbUrl;if(thumbLink)thumbLink.href=p.sourceUrl||p.embedUrl;thumb.onclick=function(event){if(event.target===thumbLink)return;playInline();};thumbPlay.onclick=playInline;}else{emb.style.display='block';emb.src=getAutoplayEmbedUrl(p.embedUrl);}}
        else if(isVideo(p)){vid.style.display='block';vid.src=p.dataUrl;vid.currentTime=0;vid.play().catch(function(){});}
        else{vid.pause();vid.removeAttribute('src');img.style.display='block';img.src=p.dataUrl;}
        document.getElementById('viewerName').textContent=p.name;
        document.getElementById('viewerMsg').textContent=p.msg||'';
        var badge=document.getElementById('viewerBadge');if(badge)badge.textContent=p.trait||'Gương mặt kỷ yếu';
        var quote=document.getElementById('viewerQuote');if(quote)quote.textContent=p.msg?'Một mảnh ký ức nhỏ trong album của lớp mình.':'Mỗi nụ cười trong khung hình này đều là một dấu ấn rất riêng.';
        modal.classList.add('show');repairDocumentText(modal);
    });
});

var memoryCd=document.getElementById('memoryCd');
if(false&&memoryCd){
    memoryCd.addEventListener('click',function(){
        var playing=!memoryCd.classList.contains('playing');
        memoryCd.classList.toggle('playing',playing);
        memoryCd.setAttribute('aria-pressed',playing?'true':'false');
        var label=document.getElementById('cdCoreText');if(label)label.textContent=playing?'Đang quay':'Bấm để quay';
        var icon=memoryCd.querySelector('.cd-core-icon');if(icon)icon.textContent=playing?'Ⅱ':'▶';
    });
    document.querySelectorAll('[data-cd-idx]').forEach(function(el){
        el.addEventListener('click',function(e){
            e.stopPropagation();
            var i=parseInt(this.dataset.cdIdx);
            var target=document.querySelector('[data-idx="'+i+'"]');
            if(target)target.click();
        });
    });
}

function clearMemoryDiscAuto(){if(memoryDiscAutoTimer){clearTimeout(memoryDiscAutoTimer);memoryDiscAutoTimer=null;}}
function scheduleMemoryDiscAuto(memoryCd,totalPages){clearMemoryDiscAuto();if(!memoryCd||!memoryCd.classList.contains('playing')||totalPages<=1)return;memoryDiscAutoTimer=setTimeout(function(){renderMemoryCdPage(memoryDiscPage+1);},DISC_AUTO_PAGE_MS);}
function renderMemoryCdPage(page){
    var memoryCd=document.getElementById('memoryCd');
    var ring=memoryCd?memoryCd.querySelector('.cd-photo-ring'):null;
    if(!memoryCd||!ring)return;
    var data=getDiscPageData(page);
    memoryDiscPage=data.page;
    ring.innerHTML=data.items.map(function(item,order){
        var angle=data.items.length?(360/data.items.length)*order:0;
        var p=item.photo||{};
        var name=escapeHtmlValue(p.name||('Anh '+(order+1)));
        return '<span class="cd-photo" style="--angle:'+angle+'deg;--reverse-angle:'+(-angle)+'deg" data-cd-idx="'+item.idx+'" title="'+name+'">'+cdThumbHtml(p,name)+'</span>';
    }).join('');
    ring.querySelectorAll('[data-cd-idx]').forEach(function(el){
        el.addEventListener('click',function(e){
            e.stopPropagation();
            var i=parseInt(this.dataset.cdIdx,10);
            var target=document.querySelector('[data-idx="'+i+'"]');
            if(target)target.click();
        });
    });
    var controls=memoryCd.parentElement.querySelector('.cd-controls');
    if(!controls){
        controls=document.createElement('div');
        controls.className='cd-controls';
        controls.innerHTML='<button type="button" class="cd-page-btn" data-cd-step="-1" aria-label="Nhóm trước">‹</button><span class="cd-page-label"></span><button type="button" class="cd-page-btn" data-cd-step="1" aria-label="Nhóm sau">›</button>';
        memoryCd.insertAdjacentElement('afterend',controls);
    }
    controls.style.display=data.totalPages>1?'flex':'none';
    var label=controls.querySelector('.cd-page-label');if(label)label.textContent='Nhóm '+(data.page+1)+'/'+data.totalPages;
    if(!controls.dataset.bound){
        controls.dataset.bound='1';
        controls.querySelectorAll('[data-cd-step]').forEach(function(btn){
            btn.addEventListener('click',function(){
                var step=parseInt(this.dataset.cdStep,10)||0;
                renderMemoryCdPage(memoryDiscPage+step);
            });
        });
    }
    scheduleMemoryDiscAuto(memoryCd,data.totalPages);
}
memoryCd=document.getElementById('memoryCd');
if(memoryCd){
    renderMemoryCdPage(0);
    memoryCd.addEventListener('click',function(){
        var playing=!memoryCd.classList.contains('playing');
        memoryCd.classList.toggle('playing',playing);
        memoryCd.setAttribute('aria-pressed',playing?'true':'false');
        var label=document.getElementById('cdCoreText');if(label)label.textContent=playing?'\u0110ang quay':'B\u1ea5m \u0111\u1ec3 quay';
        var icon=memoryCd.querySelector('.cd-core-icon');if(icon)icon.textContent=playing?'II':'▶';
        scheduleMemoryDiscAuto(memoryCd,getDiscPageData(memoryDiscPage).totalPages);
    });
}
function closeViewer(){var v=document.getElementById('viewerVideo');var e=document.getElementById('viewerEmbed');var m=document.getElementById('photoViewerModal');var t=document.getElementById('viewerThumb');var ti=document.getElementById('viewerThumbImage');if(v){v.pause();v.removeAttribute('src');}if(e)e.removeAttribute('src');if(t)t.style.display='none';if(ti)ti.removeAttribute('src');m.classList.remove('video-mode');m.classList.remove('show');}
document.getElementById('btnCloseViewer').addEventListener('click',closeViewer);
document.getElementById('photoViewerModal').addEventListener('click',function(e){if(e.target===this)closeViewer();});

function getAutoplayEmbedUrl(rawUrl){try{var u=new URL(rawUrl);var h=u.hostname.replace(/^www\\./,'');u.searchParams.set('autoplay','1');u.searchParams.set('mute','1');u.searchParams.set('playsinline','1');u.searchParams.set('rel','0');if((h==='youtube.com'||h==='youtube-nocookie.com')&&location.protocol.indexOf('http')===0)u.searchParams.set('origin',location.origin);return u.toString();}catch(e){return rawUrl;}}
function stopCurrentSlideMedia(){var v=document.getElementById('slideImage').querySelector('video');if(!v)return;v.pause();v.removeAttribute('src');v.load();}
function clearSlideTimer(){if(!slideInterval)return;clearTimeout(slideInterval);slideInterval=null;}
function scheduleNextSlide(delay){clearSlideTimer();if(!isSlideAutoPlaying||photos.length<=1)return;slideInterval=setTimeout(nextS,delay||IMAGE_SLIDE_MS);}
function playCurrentSlideMedia(){var v=document.getElementById('slideImage').querySelector('video');if(!v)return;v.muted=true;v.playsInline=true;v.play().catch(function(){});}
function updateSlide(){
    if(!photos.length)return;var p=photos[currentSlide];
    var si=document.getElementById('slideImage');
    stopCurrentSlideMedia();clearSlideTimer();
    if(isEmbed(p)){var src=isSlideAutoPlaying?getAutoplayEmbedUrl(p.embedUrl):p.embedUrl;si.innerHTML='<iframe src="'+src+'" title="'+p.name+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';scheduleNextSlide(12000);}
    else if(isVideo(p)){si.innerHTML='<video class="slide-media" src="'+p.dataUrl+'" controls autoplay muted playsinline preload="metadata"></video>';var v=si.querySelector('video');if(v){v.addEventListener('loadedmetadata',function(){if(!isSlideAutoPlaying)return;var d=isFinite(v.duration)&&v.duration>0?Math.min(Math.max(v.duration*1000+700,5000),MAX_VIDEO_SLIDE_MS):9000;scheduleNextSlide(d);},{once:true});v.addEventListener('ended',function(){if(isSlideAutoPlaying)nextS();});playCurrentSlideMedia();if(isSlideAutoPlaying)scheduleNextSlide(9000);}}
    else{si.innerHTML='<div class="slide-backdrop" style="background-image:url(\\''+p.dataUrl+'\\')"></div><img class="slide-media" src="'+p.dataUrl+'" alt="'+p.name+'">';scheduleNextSlide();}
    var slideMessage=(p.msg||'').trim();
    document.getElementById('slideName').textContent=p.name;
    document.getElementById('slideMsg').textContent=slideMessage;
    document.getElementById('slideFullMsg').textContent=slideMessage;
    document.getElementById('slideCaptionCard').classList.toggle('is-empty',!slideMessage);
    var dots=document.getElementById('slideshowDots');dots.innerHTML='';
    photos.forEach(function(_,i){var d=document.createElement('div');d.className='dot'+(i===currentSlide?' active':'');d.addEventListener('click',function(){currentSlide=i;updateSlide();pauseSS();});dots.appendChild(d);});
}
function nextS(){currentSlide=(currentSlide+1)%photos.length;updateSlide();}
function prevS(){currentSlide=(currentSlide-1+photos.length)%photos.length;updateSlide();}
function playSS(){document.getElementById('btnPlaySlide').textContent='⏸ Pause';document.getElementById('btnPlaySlide').classList.add('active');isSlideAutoPlaying=true;updateSlide();}
function pauseSS(){document.getElementById('btnPlaySlide').textContent='▶ Auto';document.getElementById('btnPlaySlide').classList.remove('active');isSlideAutoPlaying=false;clearSlideTimer();var v=document.getElementById('slideImage').querySelector('video');if(v)v.pause();}
var btnTvSlide=document.getElementById('btnTvSlide');
var slideshowWrapper=document.querySelector('.slideshow-wrapper');
var tvControlsTimer=null;
function updateTvSlideButton(){if(!btnTvSlide||!slideshowWrapper)return;var on=slideshowWrapper.classList.contains('tv-mode');btnTvSlide.textContent=on?'Thu nhỏ':'Phóng to';btnTvSlide.classList.toggle('active',on);}
function showTvSlideControls(){if(!slideshowWrapper||!slideshowWrapper.classList.contains('tv-mode'))return;slideshowWrapper.classList.remove('tv-controls-hidden');clearTimeout(tvControlsTimer);tvControlsTimer=setTimeout(function(){slideshowWrapper.classList.add('tv-controls-hidden');},2600);}
function enterTvSlideMode(){if(!slideshowWrapper)return;slideshowWrapper.classList.add('tv-mode');updateTvSlideButton();showTvSlideControls();if(!document.fullscreenElement&&slideshowWrapper.requestFullscreen){slideshowWrapper.requestFullscreen().catch(function(){});}}
function exitTvSlideMode(){if(!slideshowWrapper)return;if(document.fullscreenElement===slideshowWrapper&&document.exitFullscreen){document.exitFullscreen().catch(function(){});}clearTimeout(tvControlsTimer);slideshowWrapper.classList.remove('tv-mode','tv-controls-hidden');updateTvSlideButton();}
if(btnTvSlide&&slideshowWrapper){
    btnTvSlide.addEventListener('click',function(){if(slideshowWrapper.classList.contains('tv-mode'))exitTvSlideMode();else enterTvSlideMode();});
    document.addEventListener('fullscreenchange',function(){if(document.fullscreenElement!==slideshowWrapper){clearTimeout(tvControlsTimer);slideshowWrapper.classList.remove('tv-mode','tv-controls-hidden');}updateTvSlideButton();});
    ['mousemove','pointerdown','touchstart','keydown'].forEach(function(eventName){slideshowWrapper.addEventListener(eventName,showTvSlideControls,{passive:true});});
}
document.getElementById('btnNextSlide').addEventListener('click',function(){nextS();pauseSS();});
document.getElementById('btnPrevSlide').addEventListener('click',function(){prevS();pauseSS();});
document.getElementById('btnPlaySlide').addEventListener('click',function(){isSlideAutoPlaying?pauseSS():playSS();});
if(photos.length)updateSlide();

function observeSections(){
    var secs=document.querySelectorAll('.yb-section');
    if(!secs.length)return;
    if(!('IntersectionObserver' in window)){
        secs.forEach(function(s){s.classList.add('visible');});
        return;
    }
    var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:0.1});
    secs.forEach(function(s){obs.observe(s);});
    setTimeout(function(){secs.forEach(function(s){s.classList.add('visible');});},900);
}

(function renderParticles(){
    var ct=document.getElementById('particles');var eff='${c.effect}';if(eff==='none')return;
    var cols=[];var n=20;
    if(eff==='petals')cols=['${c.theme==='galaxy'?'#a29bfe':c.theme==='nature'?'#68d391':c.theme==='ocean'?'#63b3ed':c.theme==='sunset'?'#ed8936':'#e84393'}','#fff'];
    else if(eff==='bubbles'){cols=['rgba(255,255,255,0.4)','rgba(255,255,255,0.6)'];n=30;}
    else if(eff==='stars'){cols=['#f1c40f','#fff'];}
    else if(eff==='confetti'){cols=['#e74c3c','#3498db','#f1c40f','#2ecc71','#9b59b6'];n=40;}
    for(var i=0;i<n;i++){var p=document.createElement('div');p.className='particle';p.style.left=Math.random()*100+'vw';p.style.top=-(Math.random()*50)+'vh';p.style.background=cols[Math.floor(Math.random()*cols.length)];var sz=Math.random()*8+4;p.style.width=sz+'px';p.style.height=sz+'px';p.style.animationDuration=(Math.random()*5+5)+'s';p.style.animationDelay=(Math.random()*5)+'s';
    if(eff==='stars'){p.style.clipPath='polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)';p.style.borderRadius='0';}
    else if(eff==='confetti'){p.style.borderRadius=Math.random()>0.5?'50%':'0';p.style.width=(sz*1.5)+'px';}
    ct.appendChild(p);}
})();
repairDocumentText();`;

                const fullHTML = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="description" content="Kỉ yếu ${escapeHtml(c.className)} - ${escapeHtml(c.school)}">
<title>🎓 Kỉ Yếu ${escapeHtml(c.className)} - ${escapeHtml(c.school)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Quicksand:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,700&family=Pacifico&family=Lobster&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body data-theme="${c.theme}">
<div class="particles-container" id="particles"></div>
${audioTag}
<button id="btnMusicToggle" class="music-toggle" title="Tắt/Bật nhạc"><span class="music-icon">🎵</span><span class="music-bars"><span></span><span></span><span></span><span></span></span></button>

<section class="cover-section" id="coverSection">
<div class="cover-bg"><div class="cover-gradient"></div></div>
<div class="cover-content">
<div class="cover-copy">
<p class="cover-kicker">Album kỉ niệm cuối năm</p>
<h1 class="cover-heading script-font" style="font-family:${ff}">${escapeHtml(c.title||'Kỉ Yếu Cuối Năm')}</h1>
<p class="cover-subtitle">${escapeHtml(c.slogan||'')}</p>
<div class="cover-meta"><span>${escapeHtml(c.className||'Lớp ___')}</span><span>•</span><span>${escapeHtml(c.year||'')}</span></div>
</div>
<div class="cover-stage">
<div class="cover-book" id="coverBook">
<div class="book-spine"></div>
<div class="book-front">
<div class="book-corner book-corner-left"></div>
<div class="book-corner book-corner-right"></div>
<div class="book-decoration book-decoration-top"></div>
<div class="book-badge">📸</div>
<h1 class="book-title script-font" style="font-family:${ff}">${escapeHtml(c.title||'Kỉ Yếu Cuối Năm')}</h1>
<p class="book-tagline">Một năm thật đáng nhớ</p>
<div class="book-class-info"><span>${escapeHtml(c.className||'Lớp ___')}</span><span class="book-divider">✦</span><span>${escapeHtml(c.year||'')}</span></div>
<p class="book-school">${escapeHtml(c.school||'Trường ___')}</p>
<div class="book-decoration book-decoration-bottom"></div>
</div></div>
<div class="cover-tap-hint"><span class="tap-hand">👆</span><span>Nhấn để mở album</span></div>
</div>
<div class="cover-art-live" aria-hidden="true">
<span class="cover-art-year-start">${escapeHtml(coverYearParts[0])}</span>
<span class="cover-art-year-end">${escapeHtml(coverYearParts[1])}</span>
<span class="cover-art-book-class">${escapeHtml(coverClassLabel)}</span>
<span class="cover-art-book-year">${escapeHtml(c.year||'2025 - 2026')}</span>
<span class="cover-art-book-school">${escapeHtml(c.school||'Trường ___')}</span>
</div>
<div class="cover-preview-strip" aria-hidden="true">
<div class="cover-preview-card"><span>📸</span><strong>Ảnh lớp</strong></div>
<div class="cover-preview-card"><span>💌</span><strong>Lời nhắn</strong></div>
<div class="cover-preview-card"><span>🎬</span><strong>Slideshow</strong></div>
</div>
</div></section>

<main class="yearbook-main" id="yearbookMain">
<section class="yb-section header-section">
<div class="header-content">
<h1 class="yb-title script-font" style="font-family:${ff}">${escapeHtml(c.title||'Kỉ Yếu Cuối Năm')}</h1>
<h2 class="yb-class">${escapeHtml(c.className||'')}</h2>
<p class="yb-school">${escapeHtml(c.school||'')}</p>
<p class="yb-year">✦ Năm học ${escapeHtml(c.year||'')} ✦</p>
<p class="yb-slogan">${escapeHtml(c.slogan||'')}</p>
${c.customAudioData?'<button id="btnPlayMainMusic" class="btn-secondary" style="margin-top:16px;border-radius:20px;">🎵 Phát / Tắt Nhạc</button>':''}
</div></section>

<section class="yb-section gallery-section">
<h2 class="section-title script-font" style="font-family:${ff}">📸 Thành viên lớp</h2>
<div class="gallery-container layout-${c.layout}" id="galleryContainer"${c.layout==='carousel'?' style="overflow-x:auto;padding-bottom:10px;"':''}>${gHTML}</div>
</section>

${cdHTML ? `<section class="yb-section cd-section">
<div class="section-eyebrow">Album xoay</div>
<h2 class="section-title script-font" style="font-family:${ff}">💿 Đĩa CD ký ức</h2>
<button type="button" class="memory-cd" id="memoryCd" aria-pressed="false">
<span class="cd-surface">
<span class="cd-photo-ring">${cdHTML}</span>
<span class="cd-core"><span class="cd-core-icon">▶</span><span class="cd-core-text" id="cdCoreText">Bấm để quay</span></span>
</span>
</button>
</section>` : ''}

<section class="yb-section timeline-section">
<div class="section-eyebrow">Dáº¥u áº¥n Ä‘Ã¡ng nhá»›</div>
<h2 class="section-title script-font" style="font-family:${ff}">âœ¨ HÃ nh trÃ¬nh nÄƒm há»c</h2>
<div class="timeline-board">${timelineHTML}</div>
</section>

<section class="yb-section message-section">
<div class="message-card">
<h2 class="section-title script-font" style="font-family:${ff}">💌 Lời nhắn của GVCN</h2>
<div class="message-content"><p>${escapeHtml(c.message || '').replace(/\n/g,'<br>')}</p></div>
<p class="message-sign">${c.teacher?'— '+escapeHtml(c.teacher)+' —':'— Giáo viên chủ nhiệm —'}</p>
</div></section>

<section class="yb-section slideshow-section">
<h2 class="section-title script-font" style="font-family:${ff}">🎬 Slideshow kỉ niệm</h2>
<div class="slideshow-wrapper">
<div class="slideshow-stage" id="slideshowStage"><div class="slide-image" id="slideImage"></div><div class="slide-info"><p class="slide-name" id="slideName"></p><p class="slide-msg" id="slideMsg"></p></div></div>
<div class="slide-caption-card" id="slideCaptionCard"><span class="slide-caption-label">Lời chúc</span><p class="slide-full-msg" id="slideFullMsg"></p></div>
<div class="slideshow-controls"><button class="slide-btn" id="btnPrevSlide">◀</button><button class="slide-btn slide-play" id="btnPlaySlide">▶ Auto</button><button class="slide-btn" id="btnNextSlide">▶</button><button class="slide-btn slide-tv" id="btnTvSlide">Phóng to</button></div>
<div class="slideshow-dots" id="slideshowDots"></div>
</div></section>

<section class="yb-section guestbook-section">
<div class="section-eyebrow">Sá»• lÆ°u bÃºt</div>
<h2 class="section-title script-font" style="font-family:${ff}">ðŸ’Œ Nhá»¯ng lá»i gá»­i láº¡i</h2>
<div class="guestbook-grid">${guestbookHTML}</div>
</section>



${liveGuestbookHTML}

<footer class="yb-footer">
<p class="footer-text">Được tạo với ❤️ bởi ${escapeHtml(c.teacher||'GVCN')}</p>
<p class="footer-year">Năm học ${escapeHtml(c.year||'')}</p>
</footer>
</main>

<div class="yearbook-actions" id="yearbookActions" aria-label="Tương tác kỉ yếu">
<button type="button" class="yearbook-close-btn" id="btnCloseYearbook" title="Đóng kỉ yếu"><span>✕</span></button>
<div class="reaction-actions">
<button type="button" class="reaction-btn" data-reaction="heart" title="Thả tim"><span class="reaction-icon">❤️</span><span class="reaction-count" id="heartCount">0</span></button>
<button type="button" class="reaction-btn" data-reaction="like" title="Like"><span class="reaction-icon">👍</span><span class="reaction-count" id="likeCount">0</span></button>
</div>
</div>

<div class="modal-overlay photo-viewer-modal" id="photoViewerModal">
<div class="photo-viewer-card">
<button class="modal-close-btn" id="btnCloseViewer">✕</button>
<div class="viewer-image-wrapper"><img id="viewerImage" src="" alt=""><video id="viewerVideo" src="" controls playsinline style="display:none"></video><div class="viewer-thumb" id="viewerThumb" style="display:none"><img id="viewerThumbImage" src="" alt=""><button type="button" id="viewerThumbPlay" class="viewer-thumb-play">▶</button><a id="viewerThumbLink" class="viewer-thumb-link" href="#" target="_blank" rel="noopener">Dự phòng: mở YouTube</a></div><iframe id="viewerEmbed" src="" title="Video nhúng" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="display:none"></iframe></div>
<div class="viewer-info"><span class="viewer-badge" id="viewerBadge">Gương mặt kỷ yếu</span><h3 class="viewer-name" id="viewerName"></h3><p class="viewer-msg" id="viewerMsg"></p><p class="viewer-quote" id="viewerQuote"></p></div>
</div>
</div>

<script src="viewer.js"><\/script>
</body></html>`;

                // Create full web package with HTML, CSS, JS, assets, and uploaded media.
                zip.file('index.html', fullHTML);
                zip.file('style.css', css);
                zip.file('viewer.js', viewerJS);
                zip.file('README.txt', 'Day la goi web ki yeu tuong tac. Keo tha ca file ZIP nay len Netlify Drop, hoac giai nen va mo index.html bang server/web hosting.\n\nLuu y: chi gui cho PH link cong khai dang https://ten-trang.netlify.app. Khong gui link app.netlify.com vi do la trang quan tri/upload se doi dang nhap.\n\nMa duyet luu but PH/HS: ' + c.guestbookAdminCode);
                const zipBlob = await zip.generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}});
                
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `KiYeu_${(c.className||'Lop').replace(/\s+/g,'-')}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                alert('✅ Đã xuất gói web tương tác thành công!\n\nFile ZIP có index.html, style.css, viewer.js, assets, anhnen và media ảnh/video/nhạc. Phụ huynh mở link sẽ xem đúng giao diện kỉ yếu có lưu bút chờ duyệt.\n\n📋 Bước tiếp theo:\n1. Giáo viên vào app.netlify.com/drop để upload ZIP\n2. Copy link công khai dạng https://ten-trang.netlify.app\n3. Dán link đó vào ô bên dưới để tạo QR\n\nLưu ý: không gửi link app.netlify.com cho PH vì link đó sẽ đòi đăng nhập Netlify.');
            } catch(err) {
                console.error('Export ZIP error:', err);
                await rollbackKyYeuExportTurn(exportReservation);
                alert('Lỗi khi xuất file: ' + err.message);
            } finally {
                btnShareHTML.textContent = '🌐 Bước 1: Xuất bản web (.zip)';
                btnShareHTML.disabled = false;
            }
        });
    }

    // ===== QR CODE GENERATION =====
    const btnGenQR = document.getElementById('btnGenQR');
    const btnCopyLink = document.getElementById('btnCopyLink');
    const btnDownloadQr = document.getElementById('btnDownloadQr');
    let qrCode = null;

    if (window.QRCodeStyling) {
        qrCode = new QRCodeStyling({
            width: 250,
            height: 250,
            type: "svg",
            data: "",
            dotsOptions: { color: "#2d3436", type: "rounded" },
            cornersDotOptions: { color: "#e84393", type: "dot" },
            cornersSquareOptions: { color: "#e84393", type: "extra-rounded" },
            backgroundOptions: { color: "#ffffff" },
            imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 6 }
        });
    }

    function getPublicShareUrl(rawUrl) {
        const value = String(rawUrl || '').trim();
        let parsed;
        try {
            parsed = new URL(value);
        } catch (err) {
            return { ok: false, message: 'Link không hợp lệ! Hãy dán link bắt đầu bằng https://' };
        }
        if (!/^https?:$/.test(parsed.protocol)) {
            return { ok: false, message: 'Link không hợp lệ! Hãy dán link bắt đầu bằng https://' };
        }
        const host = parsed.hostname.toLowerCase();
        if (host === 'app.netlify.com' || host === 'netlify.com' || host === 'www.netlify.com') {
            return {
                ok: false,
                message: 'Bạn đang dán link quản trị/upload của Netlify nên điện thoại sẽ bị yêu cầu đăng nhập. Hãy mở trang đã deploy và copy link công khai dạng https://ten-trang.netlify.app rồi dán lại.'
            };
        }
        return { ok: true, url: parsed.href };
    }

    if (btnGenQR) {
        btnGenQR.addEventListener('click', () => {
            const url = document.getElementById('netlifyUrl').value.trim();
            if (!url) {
                alert('Vui lòng dán link công khai vào ô trước!');
                return;
            }
            const shareUrl = getPublicShareUrl(url);
            if (!shareUrl.ok) {
                alert(shareUrl.message);
                return;
            }

            document.getElementById('finalLink').value = shareUrl.url;
            document.getElementById('qrResultBox').style.display = 'block';

            if (qrCode) {
                document.getElementById('qrCodeContainer').innerHTML = '';
                qrCode.update({ data: shareUrl.url });
                qrCode.append(document.getElementById('qrCodeContainer'));
            }
        });
    }

    if (btnCopyLink) {
        btnCopyLink.addEventListener('click', () => {
            const linkInput = document.getElementById('finalLink');
            linkInput.select();
            navigator.clipboard.writeText(linkInput.value).then(() => {
                btnCopyLink.textContent = '✅';
                setTimeout(() => { btnCopyLink.textContent = '📋'; }, 1500);
            }).catch(() => {
                document.execCommand('copy');
                btnCopyLink.textContent = '✅';
                setTimeout(() => { btnCopyLink.textContent = '📋'; }, 1500);
            });
        });
    }

    if (btnDownloadQr) {
        btnDownloadQr.addEventListener('click', () => {
            if (qrCode) {
                qrCode.download({ name: "QR_KiYeu", extension: "png" });
            }
        });
    }

    jsonImportInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedState = JSON.parse(e.target.result);
                if (importedState && importedState.config) {
                    STATE = importedState;
                    applyStateToUI();
                    scheduleDraftSave(true);
                    alert('Nhập kỉ yếu thành công!');
                } else {
                    alert('File không đúng định dạng kỉ yếu!');
                }
            } catch (err) {
                console.error("Import error", err);
                alert('Lỗi đọc file JSON.');
            }
        };
        reader.readAsText(file);
        jsonImportInput.value = ''; // Reset
    });

    // ===== COVER ANIMATION & AUDIO =====
    coverBook.addEventListener('click', () => {
        unlockMemberHoverSound();
        coverBook.classList.add('open');
        if (tapHint) tapHint.style.display = 'none';

        // Play Audio
        if (hasAudioSource()) {
            bgMusic.volume = 0.5;
            bgMusic.play().then(() => {
                isMusicPlaying = true;
                btnMusicToggle.style.display = 'flex';
                btnMusicToggle.classList.add('playing');
            }).catch(e => {
                console.log('Autoplay blocked', e);
                btnMusicToggle.style.display = 'flex';
                btnMusicToggle.textContent = '🔇';
            });
        }

        setTimeout(() => {
            coverSection.classList.add('hidden');
            yearbookMain.classList.add('show');
            document.body.classList.add('yearbook-open');
            observeSections();
        }, 1200);
    });

    if (btnMusicToggle) {
        btnMusicToggle.addEventListener('click', () => {
            if (!hasAudioSource()) return;
            if (isMusicPlaying) {
                bgMusic.pause();
                isMusicPlaying = false;
                btnMusicToggle.classList.remove('playing');
                btnMusicToggle.innerHTML = '<span class="music-icon">🔇</span>';
            } else {
                bgMusic.play().catch(e => console.log('Audio play error:', e));
                isMusicPlaying = true;
                btnMusicToggle.classList.add('playing');
                btnMusicToggle.innerHTML = '<span class="music-bars"><span></span><span></span><span></span><span></span></span>';
            }
        });
    }

    const btnPlayMainMusic = document.getElementById('btnPlayMainMusic');
    if (btnPlayMainMusic) {
        btnPlayMainMusic.addEventListener('click', () => {
            if (btnMusicToggle) btnMusicToggle.click();
        });
    }

    // Scroll Animations
    function observeSections() {
        const sections = document.querySelectorAll('.yb-section');
        if (!sections.length) return;
        if (!('IntersectionObserver' in window)) {
            sections.forEach(s => s.classList.add('visible'));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        
        sections.forEach(s => observer.observe(s));
        setTimeout(() => {
            sections.forEach(s => s.classList.add('visible'));
        }, 900);
    }

    window.addEventListener('beforeunload', () => {
        if (settingsModal && settingsModal.classList.contains('show')) saveFormToState();
        if (draftSaveTimer) {
            clearTimeout(draftSaveTimer);
            saveDraftNow();
        }
    });

    // ===== INIT =====
    (async () => {
        await restoreDraftIfAvailable();
        setupYearbookActions();
        applyStateToUI();
    })();
});
