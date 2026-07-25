document.addEventListener('DOMContentLoaded', () => {
    // ╔══════════════════════════════════════════════════════════╗
    // ║  CONFIG: Đọc cấu hình GV từ URL hash                    ║
    // ║  Phan hoi phu huynh duoc luu tren trang thu moi/Firebase ║
    // ╚══════════════════════════════════════════════════════════╝

    const AUDIENCE_GENERAL = 'general';
    const AUDIENCE_PRESCHOOL = 'preschool';

    const DEFAULT_TIMELINES = {
        general: [
            { time: "07:30 - 08:00", title: "ĐÓN TIẾP PHỤ HUYNH", desc: "Ổn định tổ chức, điểm danh và gửi tài liệu đầu năm." },
            { time: "08:00 - 08:15", title: "KHAI MẠC & LÀM QUEN", desc: "Giáo viên chủ nhiệm chào mừng phụ huynh, giới thiệu định hướng chung của lớp." },
            { time: "08:15 - 08:45", title: "THỐNG NHẤT KẾ HOẠCH NĂM HỌC", desc: "Trao đổi mục tiêu học tập, nề nếp lớp, lịch học và các hoạt động trọng tâm." },
            { time: "08:45 - 09:15", title: "PHỐI HỢP GIA ĐÌNH - NHÀ TRƯỜNG", desc: "Thống nhất cách theo dõi, hỗ trợ học sinh và kênh liên lạc trong năm học." },
            { time: "09:15 - 09:45", title: "TRAO ĐỔI & GIẢI ĐÁP", desc: "Lắng nghe ý kiến, nguyện vọng và những thông tin cần lưu ý từ phụ huynh." },
            { time: "09:45 - 10:00", title: "CAM KẾT ĐỒNG HÀNH", desc: "Tổng hợp nội dung thống nhất, cảm ơn phụ huynh và kết thúc buổi họp." }
        ],
        preschool: [
            { time: "07:30 - 08:00", title: "ĐÓN BA MẸ & CÁC BÉ", desc: "Cô giáo chào đón gia đình, ổn định chỗ ngồi và làm quen không gian lớp." },
            { time: "08:00 - 08:20", title: "CÂU CHUYỆN ĐẦU NĂM", desc: "Chia sẻ nhịp sinh hoạt, thói quen ăn ngủ, vui chơi và học tập của bé tại lớp." },
            { time: "08:20 - 08:45", title: "KẾ HOẠCH CHĂM SÓC - GIÁO DỤC", desc: "Trao đổi mục tiêu phát triển ngôn ngữ, vận động, cảm xúc và kỹ năng tự phục vụ." },
            { time: "08:45 - 09:10", title: "PHỐI HỢP CÙNG GIA ĐÌNH", desc: "Thống nhất cách trao đổi sức khỏe, đồ dùng cá nhân, giờ đón trả và kênh liên hệ." },
            { time: "09:10 - 09:30", title: "LẮNG NGHE BA MẸ", desc: "Ghi nhận mong muốn, lưu ý riêng của từng bé để cô chăm sóc phù hợp hơn." },
            { time: "09:30 - 09:45", title: "CÙNG BÉ KHỞI ĐỘNG NĂM HỌC", desc: "Chụp ảnh lưu niệm, gửi lời chúc và kết thúc buổi gặp mặt trong không khí vui tươi." }
        ]
    };

    let CONFIG = {
        audience: AUDIENCE_GENERAL,
        teacher: '',
        school: '',
        className: '',
        date: '',
        location: '',
        deadline: '',
        email: '',
        theme: 'classic',
        timeline: [...DEFAULT_TIMELINES.general]
    };

    const FIREBASE_DB_URL = 'https://giaoviencongnghe-3c2a9-default-rtdb.asia-southeast1.firebasedatabase.app';
    const SHARED_THUMOI_REF = 'shared-thumoi-dau-nam';

    function encodeFirebasePath(path) {
        return path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    }

    function encodeRsvpKey(studentName) {
        return btoa(encodeURIComponent(studentName.trim().toLowerCase()))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    }

    async function findFullThuMoiKey(shortId) {
        if (!shortId) return null;
        try {
            const directResponse = await fetch(`${FIREBASE_DB_URL}/${SHARED_THUMOI_REF}/${encodeURIComponent(shortId)}.json?shallow=true`);
            if (directResponse.ok) {
                const directData = await directResponse.json();
                if (directData) return shortId;
            }

            const shallowResponse = await fetch(`${FIREBASE_DB_URL}/${SHARED_THUMOI_REF}.json?shallow=true`);
            if (!shallowResponse.ok) return null;
            const keys = await shallowResponse.json();
            if (!keys || typeof keys !== 'object') return null;
            return Object.keys(keys).find(key => key.endsWith(shortId)) || null;
        } catch (error) {
            console.warn('Khong tim duoc khoa thu moi tren Firebase:', error);
            return null;
        }
    }

    async function saveRsvpDirectToFirebase(shortId, studentName, parentName, attendance) {
        const fullKey = await findFullThuMoiKey(shortId);
        if (!fullKey) return false;

        const rsvpKey = encodeRsvpKey(studentName);
        const path = encodeFirebasePath(`${SHARED_THUMOI_REF}/${fullKey}/rsvps/${rsvpKey}`);
        const response = await fetch(`${FIREBASE_DB_URL}/${path}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timestamp: Date.now(),
                studentName: studentName.trim(),
                parentName: parentName.trim(),
                attendance: attendance.trim()
            })
        });
        return response.ok;
    }

    // --- Đọc config từ URL hash ---
    function loadConfigFromURL() {
        try {
            const hash = window.location.hash.slice(1);
            if (hash) {
                const decoded = decodeURIComponent(atob(hash));
                CONFIG = { ...CONFIG, ...JSON.parse(decoded) };
                return true;
            }
        } catch (e) { console.log('Không có config trong URL'); }
        return false;
    }

    function getAudience() {
        return CONFIG.audience === AUDIENCE_PRESCHOOL ? AUDIENCE_PRESCHOOL : AUDIENCE_GENERAL;
    }

    function getAudienceCopy() {
        if (getAudience() === AUDIENCE_PRESCHOOL) {
            return {
                title: 'HỌP BA MẸ\nĐẦU NĂM',
                year: '✦ NĂM HỌC 2026 - 2027 ✦',
                greeting: 'Kính gửi Ba Mẹ của bé,',
                intro: 'Năm học mới của các bé bắt đầu với thật nhiều sắc màu, nụ cười và những trải nghiệm đầu đời đáng nhớ.',
                body: 'Nhà trường và giáo viên chủ nhiệm trân trọng kính mời Ba Mẹ tham dự buổi <strong>gặp mặt phụ huynh đầu năm</strong> để cùng trao đổi về nề nếp sinh hoạt, chăm sóc sức khỏe, vui chơi, học tập và cách phối hợp giúp bé đến lớp vui vẻ, an toàn mỗi ngày.',
                closing: 'Sự đồng hành của Ba Mẹ sẽ giúp bé tự tin hơn trong những ngày đầu năm học và tạo nên một môi trường lớp học ấm áp, nhiều yêu thương.',
                sign: 'Thân mến kính mời!',
                scheduleSubtitle: 'BUỔI GẶP MẶT BA MẸ',
                rsvpTitle: 'Xác nhận tham dự',
                rsvpDesc: 'Để cô chuẩn bị đón tiếp chu đáo, kính mong Ba Mẹ xác nhận tham dự bên dưới.',
                parentLabel: 'Ba/Mẹ của bé:',
                studentLabel: 'Tên bé:',
                studentPlaceholder: 'Ví dụ: Bé Bông',
                classLabel: 'Lớp mầm non:',
                classPlaceholder: 'Ví dụ: Mầm 1 / Chồi 2 / Lá 3',
                noteTitle: 'Thông tin xác nhận',
                noteText: 'Ba Mẹ vui lòng xác nhận trước ngày <span id="dispDeadline">03/09/2026</span> qua biểu mẫu hoặc liên hệ giáo viên chủ nhiệm.',
                thankTitle: 'Lời nhắn yêu thương',
                thanks: [
                    'Cảm ơn Ba Mẹ đã tin tưởng, phối hợp và cùng cô chuẩn bị cho hành trình đến lớp thật vui của các bé.',
                    'Sự quan tâm của gia đình sẽ giúp cô hiểu bé hơn, chăm sóc phù hợp hơn và tạo cho bé cảm giác an toàn khi ở lớp.',
                    'Thân mến kính mời Ba Mẹ<br>tham dự buổi gặp mặt đầu năm học.',
                    '<em>Hẹn gặp Ba Mẹ trong buổi gặp gỡ đầu năm!</em>'
                ]
            };
        }

        return {
            title: 'HỌP PHỤ HUYNH\nĐẦU NĂM',
            year: '✦ NĂM HỌC 2026 - 2027 ✦',
            greeting: 'Kính gửi Quý Phụ Huynh,',
            intro: 'Năm học mới đang bắt đầu với nhiều mục tiêu, kỳ vọng và cơ hội trưởng thành dành cho các con.',
            body: 'Nhà trường và giáo viên chủ nhiệm trân trọng kính mời Quý phụ huynh tham dự buổi <strong>họp phụ huynh đầu năm học</strong> để cùng thống nhất kế hoạch, nề nếp, phương hướng phối hợp và các nội dung quan trọng trong năm học mới.',
            closing: 'Sự hiện diện và đồng hành của Quý phụ huynh sẽ góp phần tạo nên một năm học chủ động, kỷ luật và yêu thương cho các con.',
            sign: 'Trân trọng kính mời!',
            scheduleSubtitle: 'BUỔI HỌP PHỤ HUYNH',
            rsvpTitle: 'Xác nhận tham dự',
            rsvpDesc: 'Để công tác tổ chức được chu đáo, kính mong Quý phụ huynh xác nhận tham dự bên dưới.',
            parentLabel: 'Phụ huynh học sinh:',
            studentLabel: 'Học sinh:',
            studentPlaceholder: 'Ví dụ: Nguyễn Văn A',
            classLabel: 'Lớp:',
            classPlaceholder: 'Ví dụ: 5A1',
            noteTitle: 'Thông tin xác nhận',
            noteText: 'Quý phụ huynh vui lòng xác nhận trước ngày <span id="dispDeadline">03/09/2026</span> qua biểu mẫu hoặc liên hệ giáo viên chủ nhiệm.',
            thankTitle: 'Lời đồng hành',
            thanks: [
                'Cảm ơn Quý phụ huynh đã tin tưởng, phối hợp và cùng GVCN chuẩn bị cho hành trình học tập mới của các con.',
                'Sự quan tâm, thống nhất và đồng hành từ gia đình sẽ giúp các con bắt đầu năm học với tâm thế tự tin, nề nếp và nhiều động lực.',
                'Trân trọng kính mời Quý phụ huynh<br>tham dự buổi họp đầu năm học.',
                '<em>Hẹn gặp Quý phụ huynh trong buổi gặp gỡ đầu năm!</em>'
            ]
        };
    }

    function setImageSource(selector, src) {
        const image = document.querySelector(selector);
        if (image) image.src = src;
    }

    function applyAudienceAssets() {
        const isPreschool = getAudience() === AUDIENCE_PRESCHOOL;
        const assets = isPreschool
            ? {
                header: 'images/preschool_header_3d.png?v=20260723-vietnam3d2',
                letter: 'images/preschool_letter_bg_3d.png?v=20260723-vietnam3d2',
                program: 'images/preschool_letter_bg_3d.png?v=20260723-vietnam3d2',
                thankyou: 'images/preschool_thankyou_3d.png?v=20260723-vietnam3d2'
            }
            : {
                header: 'images/school_header.png?v=20260722-education-bg',
                letter: 'images/letter_bg.png?v=20260722-education-bg',
                program: 'images/program_banner.png?v=20260722-education-bg',
                thankyou: 'images/thankyou.png?v=20260722-co-teachers'
            };

        setImageSource('.header-school-img', assets.header);
        setImageSource('.letter-bg-img', assets.letter);
        setImageSource('.program-banner-img', assets.program);
        setImageSource('.thankyou-img', assets.thankyou);

        const coverBg = document.querySelector('.cover-bg-blur');
        if (coverBg) {
            coverBg.style.backgroundImage = `url("${assets.header}")`;
        }
    }

    function initializeAudienceFromRequest(hasConfig) {
        const params = new URLSearchParams(window.location.search);
        const requestedAudience = params.get('audience');
        if (!hasConfig && requestedAudience === AUDIENCE_PRESCHOOL) {
            CONFIG.audience = AUDIENCE_PRESCHOOL;
            CONFIG.theme = 'preschool';
            CONFIG.timeline = DEFAULT_TIMELINES.preschool.map(item => ({ ...item }));
            return;
        }
        CONFIG.audience = getAudience();
        if (!Array.isArray(CONFIG.timeline) || CONFIG.timeline.length === 0) {
            CONFIG.timeline = DEFAULT_TIMELINES[getAudience()].map(item => ({ ...item }));
        }
        if (getAudience() === AUDIENCE_PRESCHOOL && (!CONFIG.theme || CONFIG.theme === 'classic')) {
            CONFIG.theme = 'preschool';
        }
    }

    function applyAudienceCopy() {
        const copy = getAudienceCopy();
        document.body.classList.toggle('audience-preschool', getAudience() === AUDIENCE_PRESCHOOL);
        applyAudienceAssets();

        document.querySelectorAll('.env-letter-title, .inv-subtitle').forEach(el => {
            el.innerHTML = escapeHTML(copy.title).replace(/\n/g, '<br>');
        });
        document.querySelectorAll('.env-letter-year, .inv-year').forEach(el => {
            el.textContent = copy.year;
        });

        const letterParagraphs = document.querySelectorAll('.letter-text-content > p:not(.letter-greeting):not(.letter-closing):not(.letter-sign)');
        if (letterParagraphs[0]) letterParagraphs[0].textContent = copy.intro;
        if (letterParagraphs[1]) letterParagraphs[1].innerHTML = copy.body;

        const greeting = document.querySelector('.letter-greeting');
        if (greeting) greeting.textContent = copy.greeting;
        const closing = document.querySelector('.letter-closing');
        if (closing) closing.textContent = copy.closing;
        const sign = document.querySelector('.letter-sign');
        if (sign) sign.textContent = copy.sign;
        const scheduleSubtitle = document.querySelector('.schedule-subtitle');
        if (scheduleSubtitle) scheduleSubtitle.textContent = copy.scheduleSubtitle;
        const rsvpTitle = document.querySelector('.rsvp-title');
        if (rsvpTitle) rsvpTitle.textContent = copy.rsvpTitle;
        const rsvpDesc = document.querySelector('.rsvp-desc');
        if (rsvpDesc) rsvpDesc.textContent = copy.rsvpDesc;

        const parentLabel = document.querySelector('label[for="parentName"]');
        if (parentLabel) parentLabel.textContent = copy.parentLabel;
        const studentLabel = document.querySelector('label[for="studentName"]');
        if (studentLabel) studentLabel.textContent = copy.studentLabel;
        const studentInput = document.getElementById('studentName');
        if (studentInput) studentInput.placeholder = copy.studentPlaceholder;
        const classLabel = document.querySelector('label[for="className"]');
        if (classLabel) classLabel.textContent = copy.classLabel;
        const classInput = document.getElementById('className');
        if (classInput) classInput.placeholder = copy.classPlaceholder;

        const formNoteTitle = document.querySelector('.form-note strong');
        if (formNoteTitle) formNoteTitle.textContent = copy.noteTitle;
        const formNoteText = document.querySelector('.form-note p');
        if (formNoteText) formNoteText.innerHTML = copy.noteText;

        const thankTitle = document.querySelector('.thankyou-title');
        if (thankTitle) thankTitle.textContent = copy.thankTitle;
        const thankTexts = document.querySelectorAll('.thankyou-text p:not(.thankyou-sign)');
        copy.thanks.forEach((value, index) => {
            if (thankTexts[index]) thankTexts[index].innerHTML = value;
        });
    }

    // --- Áp dụng config vào giao diện ---
    function applyConfig() {
        applyAudienceCopy();
        if (CONFIG.date) document.getElementById('dispDate').textContent = CONFIG.date;
        if (CONFIG.location && CONFIG.school) {
            document.getElementById('dispLocation').textContent = CONFIG.location;
            document.getElementById('dispSchool').textContent = CONFIG.school;
        }
        if (CONFIG.deadline) document.getElementById('dispDeadline').textContent = CONFIG.deadline;
        if (CONFIG.teacher) document.getElementById('dispTeacher').textContent = CONFIG.teacher;

        // Nếu GV đã chỉ định lớp → tự điền và ẩn field lớp
        if (CONFIG.className) {
            const classInput = document.getElementById('className');
            classInput.value = CONFIG.className;
            classInput.readOnly = true;
            classInput.style.background = 'var(--input-bg)';
        }

        renderTimelineDisplay();

        // Apply theme
        applyTheme(CONFIG.theme || 'classic');
    }

    function applyTheme(theme) {
        document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
        if (theme && theme !== 'classic') {
            document.body.classList.add('theme-' + theme);
        } else {
            document.body.classList.add('theme-classic');
        }
    }

    // --- Hiển thị timeline ra trang ---
    function renderTimelineDisplay() {
        const container = document.querySelector('.schedule-timeline');
        if (!container) return;
        container.innerHTML = '';
        const icons = getAudience() === AUDIENCE_PRESCHOOL
            ? ['🧸', '🌈', '🎨', '🤝', '💬', '⭐', '🎒', '🧩', '✅']
            : ['🏫', '🌱', '📚', '🤝', '💬', '🌟', '🔔', '📝', '✅'];
        
        const items = CONFIG.timeline && CONFIG.timeline.length > 0 ? CONFIG.timeline : [];
        items.forEach((item, index) => {
            const timeStr = escapeHTML(item.time || '').replace(' - ', ' -<br>');
            const icon = icons[index % icons.length];
            const details = getTimelineDetails(item);
            const detailHTML = details.length
                ? details.map(detail => `<p>${escapeHTML(detail)}</p>`).join('')
                : '';
            const div = document.createElement('div');
            div.className = 'sch-item';
            div.setAttribute('data-aos', '');
            div.innerHTML = `<div class="sch-time">${timeStr}</div><div class="sch-icon"><span>${icon}</span></div><div class="sch-content"><h4>${escapeHTML(item.title || '')}</h4>${detailHTML}</div>`;
            container.appendChild(div);
        });
    }

    // --- Tạo URL chia sẻ ---
    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function getTimelineDetails(item) {
        if (Array.isArray(item.details)) {
            return item.details.map(detail => String(detail || '').trim()).filter(Boolean);
        }
        const desc = String(item.desc || '').trim();
        return desc ? [desc] : [];
    }

    function generateShareURL() {
        const encoded = btoa(encodeURIComponent(JSON.stringify(CONFIG)));
        return window.location.origin + window.location.pathname + '#' + encoded;
    }

    // ===== SETTINGS PANEL (cho GV) =====
    const settingsFab = document.getElementById('settingsFab');
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');
    const shareLinkBox = document.getElementById('shareLinkBox');
    const timelineEditor = document.getElementById('timelineEditor');
    const btnAddTimeline = document.getElementById('btnAddTimeline');
    const isEditMode = new URLSearchParams(window.location.search).has('edit');
    const btnSubmitSettings = document.getElementById('btnSubmitSettings');
    const btnSaveAndClose = document.getElementById('btnSaveAndClose');
    let shareRequestTimer = null;

    function clearShareRequestTimer() {
        if (shareRequestTimer) {
            clearTimeout(shareRequestTimer);
            shareRequestTimer = null;
        }
    }

    function startShareRequestTimer() {
        clearShareRequestTimer();
        shareRequestTimer = setTimeout(() => {
            const shareLink = document.getElementById('shareLink');
            const copyStatus = document.getElementById('copyStatus');
            if (shareLink && shareLink.value && shareLink.value.includes('Đang tạo')) {
                shareLink.value = '';
                copyStatus.textContent = 'Lưu hơi lâu hoặc mạng chập chờn. Vui lòng bấm lại nút Lưu & Tạo link chia sẻ.';
                copyStatus.style.color = '#c0392b';
            }
            if (btnSaveAndClose) {
                btnSaveAndClose.disabled = false;
                btnSaveAndClose.textContent = '✅ Lưu chỉnh sửa & đóng';
            }
        }, 20000);
    }

    if (isEditMode) {
        if (btnSubmitSettings) btnSubmitSettings.textContent = '✅ Lưu chỉnh sửa';
        if (btnSaveAndClose) btnSaveAndClose.style.display = 'block';
    }

    const hasConfig = loadConfigFromURL();
    initializeAudienceFromRequest(hasConfig);
    applyConfig();

    if (hasConfig) {
        // Kiểm tra: nếu PH mở link chia sẻ (?id=xxx) → ẩn hoàn toàn nút settings
        const isSharedLink = new URLSearchParams(window.location.search).has('id');
        if (isSharedLink) {
            settingsFab.style.display = 'none';
        } else {
            // GV xem trước (chỉ có hash) → hiện nút "Chỉnh sửa"
            settingsFab.innerHTML = '<span class="fab-icon">✏️</span><span class="fab-text">Chỉnh sửa</span>';
            settingsFab.style.animation = 'none';
        }
    }

    settingsFab.addEventListener('click', (evt) => {
        evt.stopPropagation();
        settingsModal.classList.add('show');
        // Pre-fill settings form if config exists
        if (CONFIG.teacher) document.getElementById('cfgTeacher').value = CONFIG.teacher;
        if (CONFIG.school) document.getElementById('cfgSchool').value = CONFIG.school;
        if (CONFIG.className) document.getElementById('cfgClass').value = CONFIG.className;
        if (CONFIG.date) document.getElementById('cfgDate').value = CONFIG.date;
        if (CONFIG.location) document.getElementById('cfgLocation').value = CONFIG.location;
        if (CONFIG.deadline) document.getElementById('cfgDeadline').value = CONFIG.deadline;
        if (CONFIG.email) document.getElementById('cfgEmail').value = CONFIG.email;

        const audienceRadio = document.querySelector(`input[name="cfgAudience"][value="${getAudience()}"]`);
        if (audienceRadio) audienceRadio.checked = true;
        
        // Pre-fill theme radio
        const themeVal = CONFIG.theme || 'classic';
        const themeRadio = document.querySelector(`input[name="cfgTheme"][value="${themeVal}"]`);
        if (themeRadio) themeRadio.checked = true;

        document.querySelectorAll('input[name="cfgAudience"]').forEach(radio => {
            radio.addEventListener('change', () => {
                CONFIG.audience = radio.value === AUDIENCE_PRESCHOOL ? AUDIENCE_PRESCHOOL : AUDIENCE_GENERAL;
                CONFIG.timeline = DEFAULT_TIMELINES[getAudience()].map(item => ({ ...item }));
                if (getAudience() === AUDIENCE_PRESCHOOL) {
                    CONFIG.theme = 'preschool';
                } else if ((CONFIG.theme || 'classic') === 'preschool') {
                    CONFIG.theme = 'classic';
                }
                const selectedTheme = document.querySelector(`input[name="cfgTheme"][value="${CONFIG.theme}"]`);
                if (selectedTheme) selectedTheme.checked = true;
                applyConfig();
                renderTimelineEditor();
            });
        });

        // Live preview: apply theme immediately when GV clicks a theme card
        document.querySelectorAll('input[name="cfgTheme"]').forEach(radio => {
            radio.addEventListener('change', () => {
                CONFIG.theme = radio.value;
                applyTheme(radio.value);
            });
        });

        renderTimelineEditor();
    });

    if (isEditMode) {
        setTimeout(() => settingsFab.click(), 250);
    }

    // --- Timeline Editor Logic ---
    function renderTimelineEditor() {
        timelineEditor.innerHTML = '';
        CONFIG.timeline.forEach((item, idx) => {
            addTimelineEditRow(item.time, item.title, item.desc, item.details);
        });
    }

    function addTimelineDetailBox(container, value = '') {
        const row = document.createElement('div');
        row.className = 'timeline-detail-row';
        row.innerHTML = `
            <textarea class="t-detail" placeholder="Nội dung/mục nhỏ..." rows="2">${escapeHTML(value)}</textarea>
            <button type="button" class="btn-remove-detail" title="Xóa ô nội dung">-</button>
        `;
        row.querySelector('.btn-remove-detail').addEventListener('click', () => {
            row.remove();
        });
        container.appendChild(row);
    }

    function addTimelineEditRow(time = '', title = '', desc = '', details = null) {
        const div = document.createElement('div');
        div.className = 'timeline-edit-item';
        div.innerHTML = `
            <button type="button" class="btn-remove-timeline" title="Xóa">✕</button>
            <input type="text" class="t-time" placeholder="Thời gian (VD: 07:30 - 08:00)" value="${escapeHTML(time)}" required>
            <input type="text" class="t-title" placeholder="Tiêu đề (VD: ĐÓN TIẾP)" value="${escapeHTML(title)}" required>
            <div class="timeline-detail-list"></div>
            <button type="button" class="btn-add-detail">+ Thêm ô nội dung</button>
        `;
        div.querySelector('.btn-remove-timeline').addEventListener('click', () => {
            div.remove();
        });
        const detailList = div.querySelector('.timeline-detail-list');
        const detailValues = Array.isArray(details) && details.length ? details : [desc || ''];
        detailValues.forEach(detail => addTimelineDetailBox(detailList, detail));
        div.querySelector('.btn-add-detail').addEventListener('click', () => {
            addTimelineDetailBox(detailList);
        });
        timelineEditor.appendChild(div);
    }

    btnAddTimeline.addEventListener('click', () => {
        addTimelineEditRow();
    });

    function saveConfigFromForm() {
        const audienceRadio = document.querySelector('input[name="cfgAudience"]:checked');
        CONFIG.audience = audienceRadio && audienceRadio.value === AUDIENCE_PRESCHOOL ? AUDIENCE_PRESCHOOL : AUDIENCE_GENERAL;
        CONFIG.teacher = document.getElementById('cfgTeacher').value.trim();
        CONFIG.school = document.getElementById('cfgSchool').value.trim();
        CONFIG.className = document.getElementById('cfgClass').value.trim();
        CONFIG.date = document.getElementById('cfgDate').value.trim();
        CONFIG.location = document.getElementById('cfgLocation').value.trim();
        CONFIG.deadline = document.getElementById('cfgDeadline').value.trim();
        CONFIG.email = document.getElementById('cfgEmail').value.trim();

        const tItems = [];
        document.querySelectorAll('.timeline-edit-item').forEach(el => {
            const details = Array.from(el.querySelectorAll('.t-detail'))
                .map(input => input.value.trim())
                .filter(Boolean);
            tItems.push({
                time: el.querySelector('.t-time').value.trim(),
                title: el.querySelector('.t-title').value.trim(),
                desc: details.join('\n'),
                details
            });
        });
        CONFIG.timeline = tItems;

        // Save theme
        const themeRadio = document.querySelector('input[name="cfgTheme"]:checked');
        CONFIG.theme = themeRadio ? themeRadio.value : 'classic';
        applyTheme(CONFIG.theme);
    }

    document.getElementById('btnCloseSettings').addEventListener('click', () => {
        saveConfigFromForm();
        window.history.replaceState(null, '', generateShareURL());
        window.location.reload();
    });

    if (btnSaveAndClose) {
        btnSaveAndClose.addEventListener('click', () => {
            saveConfigFromForm();
            btnSaveAndClose.disabled = true;
            btnSaveAndClose.textContent = '⏳ Đang lưu...';
            window.parent.postMessage({
                type: 'THU_MOI_SHARE',
                config: CONFIG,
                encoded: btoa(encodeURIComponent(JSON.stringify(CONFIG))),
                closeAfterSave: true
            }, '*');
        });
    }

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveConfigFromForm();
        applyConfig();
        
        shareLinkBox.style.display = 'block';
        document.getElementById('shareLink').value = 'Đang tạo link rút gọn (vui lòng chờ)...';
        document.getElementById('copyStatus').textContent = '';
        startShareRequestTimer();

        // Gửi thông tin cấu hình lên window.parent (React App) để tạo link ngắn Firebase
        const encoded = btoa(encodeURIComponent(JSON.stringify(CONFIG)));
        window.parent.postMessage({ 
            type: 'THU_MOI_SHARE', 
            config: CONFIG,
            encoded: encoded,
            closeAfterSave: false
        }, '*');
        
        // Cập nhật hash URL nội bộ (fallback)
        const fallbackURL = generateShareURL();
        window.history.replaceState(null, '', fallbackURL);
    });

    // ===== QR CODE =====
    let qrCode = null;
    if (window.QRCodeStyling) {
        qrCode = new QRCodeStyling({
            width: 200,
            height: 200,
            type: "svg",
            data: "",
            dotsOptions: {
                color: "#c0392b",
                type: "rounded"
            },
            backgroundOptions: {
                color: "#ffffff",
            },
            cornersSquareOptions: {
                color: "#27ae60",
                type: "extra-rounded"
            },
            cornersDotOptions: {
                color: "#27ae60",
                type: "dot"
            }
        });
    }

    // Lắng nghe link rút gọn từ React App trả về
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'THU_MOI_SHORT_URL') {
            clearShareRequestTimer();
            const shortUrl = event.data.url;
            document.getElementById('shareLink').value = shortUrl;
            document.getElementById('copyStatus').textContent = isEditMode ? '✅ Đã lưu chỉnh sửa thành công!' : '✅ Đã tạo link rút gọn thành công!';
            document.getElementById('copyStatus').style.color = '#27ae60';
            if (btnSaveAndClose) {
                btnSaveAndClose.disabled = false;
                btnSaveAndClose.textContent = '✅ Lưu chỉnh sửa & đóng';
            }
            if (event.data.closeAfterSave) {
                window.parent.postMessage({ type: 'THU_MOI_CLOSE_EDITOR' }, '*');
                return;
            }
            
            if (qrCode) {
                document.getElementById('qrCodeWrapper').style.display = 'block';
                document.getElementById('qrCodeContainer').innerHTML = '';
                qrCode.update({ data: shortUrl });
                qrCode.append(document.getElementById('qrCodeContainer'));
            }
        } else if (event.data && event.data.type === 'THU_MOI_SAVE_ERROR') {
            clearShareRequestTimer();
            const fallbackUrl = event.data.fallbackUrl || '';
            const linkInput = document.getElementById('shareLink');
            const copyStatus = document.getElementById('copyStatus');
            if (fallbackUrl) {
                linkInput.value = fallbackUrl;
                copyStatus.textContent = 'Chưa lưu được lên Firebase. Đã tạo link tạm, vui lòng copy ngay hoặc bấm lưu lại khi mạng ổn hơn.';
            } else {
                linkInput.value = '';
                copyStatus.textContent = 'Chưa lưu được thư mời. Vui lòng kiểm tra mạng rồi bấm lưu lại.';
            }
            copyStatus.style.color = '#c0392b';
            if (btnSaveAndClose) {
                btnSaveAndClose.disabled = false;
                btnSaveAndClose.textContent = '✅ Lưu chỉnh sửa & đóng';
            }
        }
    });

    const btnDownloadQr = document.getElementById('btnDownloadQr');
    if (btnDownloadQr) {
        btnDownloadQr.addEventListener('click', () => {
            if (qrCode) {
                qrCode.download({ name: "MaQR_ThuMoiHopPhuHuynhDauNam", extension: "png" });
            }
        });
    }

    document.getElementById('btnCopy').addEventListener('click', () => {
        const linkInput = document.getElementById('shareLink');
        linkInput.select();
        navigator.clipboard.writeText(linkInput.value).then(() => {
            document.getElementById('copyStatus').textContent = '✅ Đã copy! Gửi link này cho phụ huynh.';
            document.getElementById('copyStatus').style.color = '#27ae60';
        }).catch(() => {
            document.execCommand('copy');
            document.getElementById('copyStatus').textContent = '✅ Đã copy!';
        });
    });

    // ===== FALLING PETALS =====
    const petalsEl = document.getElementById('petals');
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.classList.add('petal');
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 6 + 6) + 's';
        p.style.animationDelay = (Math.random() * 8) + 's';
        p.style.opacity = (Math.random() * 0.4 + 0.3).toFixed(2);
        const size = Math.random() * 8 + 8;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.background = Math.random() > 0.5
            ? getComputedStyle(document.documentElement).getPropertyValue('--petal-color-1').trim() || '#e74c3c'
            : getComputedStyle(document.documentElement).getPropertyValue('--petal-color-2').trim() || '#ff6b6b';
        petalsEl.appendChild(p);
    }

    // ===== AUDIO CONTROLS (Local File) =====
    const bgMusic = document.getElementById('bgMusic');
    const btnMusicToggle = document.getElementById('btnMusicToggle');
    let isMusicPlaying = false;

    if (btnMusicToggle) {
        btnMusicToggle.addEventListener('click', () => {
            if (!bgMusic) return;
            if (isMusicPlaying) {
                bgMusic.pause();
                isMusicPlaying = false;
                btnMusicToggle.classList.remove('playing');
                btnMusicToggle.textContent = '🔇';
            } else {
                bgMusic.play().catch(e => console.log('Audio play error:', e));
                isMusicPlaying = true;
                btnMusicToggle.classList.add('playing');
                btnMusicToggle.textContent = '🎵';
            }
        });
    }

    // ===== COVER / ENVELOPE =====
    const cover = document.getElementById('coverSection');
    const main = document.getElementById('invitationMain');
    const envWrapper = document.getElementById('envWrapper');
    const tapHint = document.getElementById('tapHint');
    let isEnvelopeOpened = false;

    cover.addEventListener('click', () => {
        if (isEnvelopeOpened) return;
        isEnvelopeOpened = true;
        if (tapHint) tapHint.style.display = 'none';

        // Play HTML5 Audio
        if (bgMusic) {
            bgMusic.volume = 0.4;
            bgMusic.play().then(() => {
                isMusicPlaying = true;
                btnMusicToggle.style.display = 'flex';
                btnMusicToggle.classList.add('playing');
            }).catch(e => {
                console.log('Autoplay blocked by mobile browser', e);
                // Even if blocked, show the toggle so user can manually play
                btnMusicToggle.style.display = 'flex';
                btnMusicToggle.textContent = '🔇';
            });
        }
        
        if (envWrapper) {
            envWrapper.classList.add('open');
            setTimeout(() => {
                cover.classList.add('hidden');
                main.classList.add('show');
                setTimeout(observeSections, 400);
            }, 1800);
        } else {
            cover.classList.add('hidden');
            main.classList.add('show');
            setTimeout(observeSections, 400);
        }
    });

    // ===== SCROLL-IN ANIMATIONS =====
    function observeSections() {
        const sections = document.querySelectorAll('.inv-section');
        const schItems = document.querySelectorAll('.sch-item');

        const sectionObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) e.target.classList.add('visible');
            });
        }, { threshold: 0.15 });
        sections.forEach(s => sectionObs.observe(s));

        const itemObs = new IntersectionObserver((entries) => {
            entries.forEach((e, i) => {
                if (e.isIntersecting) {
                    setTimeout(() => e.target.classList.add('visible'), i * 100);
                }
            });
        }, { threshold: 0.2 });
        schItems.forEach(item => itemObs.observe(item));
    }

    // ===== RSVP FORM -> luu phan hoi tren trang thu moi =====
    const form = document.getElementById('rsvpForm');
    const modal = document.getElementById('successModal');
    const modalMsg = document.getElementById('modalMsg');
    const btnSubmit = document.getElementById('btnSubmit');

    // Check localStorage to prevent multiple submissions
    const getStorageKey = () => {
        const hash = window.location.hash.slice(1);
        if (!hash) return 'thumoihop_rsvp_local';
        let hashNum = 0;
        for (let i = 0; i < hash.length; i++) {
            const char = hash.charCodeAt(i);
            hashNum = ((hashNum << 5) - hashNum) + char;
            hashNum = hashNum & hashNum;
        }
        return 'thumoihop_rsvp_' + hashNum;
    };

    const storageKey = getStorageKey();
    if (localStorage.getItem(storageKey)) {
        form.innerHTML = `
            <div style="text-align:center; padding: 30px 20px; background: rgba(255,255,255,0.9); border-radius: 12px; border: 2px dashed #27ae60; margin-top: 20px;">
                <h3 style="color: #27ae60; font-family: 'Quicksand', sans-serif; font-size: 1.3rem; margin-bottom: 10px;">✅ Bạn đã gửi xác nhận</h3>
                <p style="color: #555;">Cảm ơn Quý phụ huynh đã phản hồi.</p>
            </div>
        `;
    }

    function checkRsvpGlobal(studentName) {
        return new Promise((resolve) => {
            const requestId = Date.now().toString();
            
            const handleResult = (event) => {
                if (event.data && event.data.type === 'RSVP_CHECK_RESULT' && event.data.requestId === requestId) {
                    window.removeEventListener('message', handleResult);
                    resolve(event.data.hasSubmitted);
                }
            };
            
            window.addEventListener('message', handleResult);
            
            window.parent.postMessage({
                type: 'CHECK_RSVP',
                studentName: studentName,
                requestId: requestId
            }, '*');
            
            // Timeout in case it doesn't respond
            setTimeout(() => {
                window.removeEventListener('message', handleResult);
                resolve(false); // Fail open
            }, 3000);
        });
    }

    // ===== AUTO SUBMIT KHI CHỌN RADIO =====
    const attendanceRadios = form.querySelectorAll('input[name="attendance"]');
    attendanceRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const parent = document.getElementById('parentName').value.trim();
            const student = document.getElementById('studentName').value.trim();
            const cls = document.getElementById('className').value.trim();
            
            // Nếu đã điền đủ thông tin mà click chọn -> tự động Gửi luôn
            if (parent && student && cls) {
                btnSubmit.click();
            } else {
                // Nếu chưa điền đủ mà click -> nhắc nhở điền thông tin
                form.reportValidity();
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const parent = document.getElementById('parentName').value.trim();
        const student = document.getElementById('studentName').value.trim();
        const cls = document.getElementById('className').value.trim();
        const att = form.querySelector('input[name="attendance"]:checked');
        if (!parent || !student || !cls || !att) return;

        const isAttend = att.value === 'attend';
        const attendanceText = isAttend ? 'Tham dự' : 'Vắng mặt';

        btnSubmit.disabled = true;
        btnSubmit.textContent = '⏳ Đang kiểm tra...';

        const urlParams = new URLSearchParams(window.location.search);
        const sharedId = urlParams.get('id');

        if (sharedId) {
            const hasSubmitted = await checkRsvpGlobal(student);
            if (hasSubmitted) {
                alert(`Học sinh "${student}" đã được gửi xác nhận trước đó!`);
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Gửi xác nhận';
                return;
            }
        }

        btnSubmit.textContent = '⏳ Đang gửi...';

        try {
            // --- Hiển thị kết quả ---
            const modalTitle = document.querySelector('#successModal .modal-title');
            const modalEmoji = document.querySelector('#successModal .modal-emoji');
            if (modalTitle) modalTitle.innerHTML = 'Cảm ơn bạn!';
            if (modalEmoji) modalEmoji.innerHTML = '🎊';
            const isPreschool = getAudience() === AUDIENCE_PRESCHOOL;
            const parentNoun = isPreschool ? 'Ba/Mẹ' : 'Phụ huynh';
            const childNoun = isPreschool ? 'Bé' : 'Học sinh';
            const meetingNoun = isPreschool ? 'buổi gặp mặt đầu năm của lớp' : 'buổi họp phụ huynh';

            if (isAttend) {
                modalMsg.innerHTML = `${parentNoun} <strong>${escapeHTML(parent)}</strong> đã xác nhận <span style="color:#27ae60;font-weight:700">THAM DỰ</span> ${meetingNoun}.<br><br>${childNoun}: <strong>${escapeHTML(student)}</strong> — Lớp <strong>${escapeHTML(cls)}</strong><br><br>${isPreschool ? 'Hẹn gặp Ba Mẹ và bé trong buổi gặp mặt!' : 'Hẹn gặp Quý Phụ Huynh tại buổi họp!'} 🎉`;
                playSuccessSound();
            } else {
                modalMsg.innerHTML = `${parentNoun} <strong>${escapeHTML(parent)}</strong> đã xác nhận <span style="color:#c0392b;font-weight:700">XIN PHÉP VẮNG MẶT</span>.<br><br>${childNoun}: <strong>${escapeHTML(student)}</strong> — Lớp <strong>${escapeHTML(cls)}</strong><br><br>Nhà trường ghi nhận. Cảm ơn phản hồi! 🙏`;
                playNeutralSound();
            }

            modal.classList.add('show');
            if (isAttend) spawnConfetti();
            
            // Bọc try-catch cho localStorage (tránh lỗi trên trình duyệt Zalo/ẩn danh)
            try {
                localStorage.setItem(storageKey, 'true');
            } catch (storageErr) {
                console.warn('Lỗi lưu localStorage:', storageErr);
            }
            
            if (sharedId) {
                try {
                    await saveRsvpDirectToFirebase(sharedId, student, parent, attendanceText);
                } catch (directSaveErr) {
                    console.warn('Khong luu duoc RSVP truc tiep len Firebase:', directSaveErr);
                }

                try {
                    window.parent.postMessage({
                        type: 'SAVE_RSVP',
                        studentName: student,
                        parentName: parent,
                        attendance: attendanceText
                    }, '*');
                } catch (msgErr) {
                    console.warn('Lỗi postMessage:', msgErr);
                }
            }

            form.innerHTML = `
                <div style="text-align:center; padding: 30px 20px; background: rgba(255,255,255,0.9); border-radius: 12px; border: 2px dashed #27ae60; margin-top: 20px;">
                    <h3 style="color: #27ae60; font-family: 'Quicksand', sans-serif; font-size: 1.3rem; margin-bottom: 10px;">✅ Bạn đã gửi xác nhận</h3>
                    <p style="color: #555;">Cảm ơn Quý phụ huynh đã phản hồi.</p>
                </div>
            `;

        } catch (err) {
            console.error('Lỗi gửi:', err);
            
            const modalTitle = document.querySelector('#successModal .modal-title');
            const modalEmoji = document.querySelector('#successModal .modal-emoji');
            if (modalTitle) modalTitle.innerHTML = 'Thông báo';
            if (modalEmoji) modalEmoji.innerHTML = '⚠️';
            document.getElementById('confetti').innerHTML = '';
            
            modalMsg.innerHTML = `⚠️ Có lỗi xảy ra khi ghi nhận phản hồi.<br>Vui lòng thử lại hoặc liên hệ giáo viên chủ nhiệm.`;
            modal.classList.add('show');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Gửi xác nhận';
        }
    });

    // ===== MODALS =====
    document.getElementById('btnCloseModal').addEventListener('click', () => {
        modal.classList.remove('show');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });

    // ===== AUDIO EFFECTS =====
    let audioCtx = null;
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playTone(freq, type, duration, vol, delay=0) {
        initAudio();
        const t = audioCtx.currentTime + delay;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + duration);
    }

    function playSuccessSound() {
        try {
            playTone(523.25, 'sine', 0.15, 0.4, 0);      
            playTone(659.25, 'sine', 0.15, 0.4, 0.15);   
            playTone(783.99, 'sine', 0.15, 0.4, 0.3);    
            playTone(1046.50, 'sine', 0.5, 0.4, 0.45);   
        } catch (e) { console.warn('Audio error', e); }
    }

    function playNeutralSound() {
        try {
            playTone(440.00, 'triangle', 0.2, 0.4, 0);   
            playTone(329.63, 'triangle', 0.4, 0.4, 0.2); 
        } catch (e) { console.warn('Audio error', e); }
    }

    function spawnConfetti() {
        const container = document.getElementById('confetti');
        container.innerHTML = '';
        const colors = ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#ff6b6b', '#ffd700'];
        for (let i = 0; i < 40; i++) {
            const c = document.createElement('div');
            c.classList.add('confetti-p');
            c.style.left = Math.random() * 100 + '%';
            c.style.top = '-10px';
            c.style.background = colors[Math.floor(Math.random() * colors.length)];
            c.style.width = (Math.random() * 8 + 5) + 'px';
            c.style.height = (Math.random() * 8 + 5) + 'px';
            c.style.animationDelay = (Math.random() * 1.5) + 's';
            c.style.animationDuration = (Math.random() * 2 + 2) + 's';
            c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            container.appendChild(c);
        }
    }
});
