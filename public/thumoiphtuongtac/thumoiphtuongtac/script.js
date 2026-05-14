document.addEventListener('DOMContentLoaded', () => {
    // ╔══════════════════════════════════════════════════════════╗
    // ║  CONFIG: Đọc cấu hình GV từ URL hash                    ║
    // ║  GV chỉ cần dán email → hệ thống tự gửi qua formsubmit ║
    // ╚══════════════════════════════════════════════════════════╝

    let CONFIG = {
        teacher: '',
        school: '',
        className: '',
        date: '',
        location: '',
        deadline: '',
        email: '',
        theme: 'classic',
        timeline: [
            { time: "07:30 - 08:00", title: "ĐÓN TIẾP PHỤ HUYNH", desc: "Ổn định tổ chức, đón tiếp phụ huynh và ổn định chỗ ngồi." },
            { time: "08:00 - 08:15", title: "KHAI MẠC CHƯƠNG TRÌNH", desc: "Tuyên bố lý do, giới thiệu đại biểu và nội dung chương trình." },
            { time: "08:15 - 08:30", title: "BÁO CÁO TỔNG KẾT NĂM HỌC", desc: "Đánh giá kết quả học tập và rèn luyện của học sinh trong năm học." },
            { time: "09:00 - 09:30", title: "THẢO LUẬN & NÊU Ý KIẾN", desc: "Trao đổi, thảo luận và lắng nghe ý kiến đóng góp từ phụ huynh." },
            { time: "09:30 - 10:00", title: "CHIA SẺ & ĐỒNG HÀNH", desc: "Trao đổi những lưu ý cần thiết để cùng hỗ trợ học sinh phát triển tốt hơn." },
            { time: "10:00 - 10:20", title: "CẢM ƠN & BẾ MẠC", desc: "Cảm ơn sự tham dự của Quý phụ huynh và kết thúc chương trình." }
        ]
    };

    // --- Đọc config từ URL hash ---
    function loadConfigFromURL() {
        try {
            const hash = window.location.hash.slice(1);
            if (hash) {
                const decoded = decodeURIComponent(atob(hash));
                CONFIG = JSON.parse(decoded);
                return true;
            }
        } catch (e) { console.log('Không có config trong URL'); }
        return false;
    }

    // --- Áp dụng config vào giao diện ---
    function applyConfig() {
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
            classInput.style.background = '#f0e8dc';
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
        const icons = ['📋', '❤️', '📖', '💬', '🤝', '🎉', '🌟', '🔔', '✨'];
        
        const items = CONFIG.timeline && CONFIG.timeline.length > 0 ? CONFIG.timeline : [];
        items.forEach((item, index) => {
            const timeStr = item.time.replace(' - ', ' -<br>');
            const icon = icons[index % icons.length];
            const div = document.createElement('div');
            div.className = 'sch-item';
            div.setAttribute('data-aos', '');
            div.innerHTML = `<div class="sch-time">${timeStr}</div><div class="sch-icon"><span>${icon}</span></div><div class="sch-content"><h4>${item.title}</h4><p>${item.desc}</p></div>`;
            container.appendChild(div);
        });
    }

    // --- Tạo URL chia sẻ ---
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

    const hasConfig = loadConfigFromURL();
    
    // Luôn render timeline mặc định nếu chưa có
    if (!hasConfig) renderTimelineDisplay();

    if (hasConfig) {
        applyConfig();
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
        
        // Pre-fill theme radio
        const themeVal = CONFIG.theme || 'classic';
        const themeRadio = document.querySelector(`input[name="cfgTheme"][value="${themeVal}"]`);
        if (themeRadio) themeRadio.checked = true;

        // Live preview: apply theme immediately when GV clicks a theme card
        document.querySelectorAll('input[name="cfgTheme"]').forEach(radio => {
            radio.addEventListener('change', () => {
                applyTheme(radio.value);
            });
        });

        renderTimelineEditor();
    });

    // --- Timeline Editor Logic ---
    function renderTimelineEditor() {
        timelineEditor.innerHTML = '';
        CONFIG.timeline.forEach((item, idx) => {
            addTimelineEditRow(item.time, item.title, item.desc);
        });
    }

    function addTimelineEditRow(time = '', title = '', desc = '') {
        const div = document.createElement('div');
        div.className = 'timeline-edit-item';
        div.innerHTML = `
            <button type="button" class="btn-remove-timeline" title="Xóa">✕</button>
            <input type="text" class="t-time" placeholder="Thời gian (VD: 07:30 - 08:00)" value="${time}" required>
            <input type="text" class="t-title" placeholder="Tiêu đề (VD: ĐÓN TIẾP)" value="${title}" required>
            <textarea class="t-desc" placeholder="Mô tả..." rows="2" required>${desc}</textarea>
        `;
        div.querySelector('.btn-remove-timeline').addEventListener('click', () => {
            div.remove();
        });
        timelineEditor.appendChild(div);
    }

    btnAddTimeline.addEventListener('click', () => {
        addTimelineEditRow();
    });

    function saveConfigFromForm() {
        CONFIG.teacher = document.getElementById('cfgTeacher').value.trim();
        CONFIG.school = document.getElementById('cfgSchool').value.trim();
        CONFIG.className = document.getElementById('cfgClass').value.trim();
        CONFIG.date = document.getElementById('cfgDate').value.trim();
        CONFIG.location = document.getElementById('cfgLocation').value.trim();
        CONFIG.deadline = document.getElementById('cfgDeadline').value.trim();
        CONFIG.email = document.getElementById('cfgEmail').value.trim();

        const tItems = [];
        document.querySelectorAll('.timeline-edit-item').forEach(el => {
            tItems.push({
                time: el.querySelector('.t-time').value.trim(),
                title: el.querySelector('.t-title').value.trim(),
                desc: el.querySelector('.t-desc').value.trim()
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

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveConfigFromForm();
        applyConfig();
        
        shareLinkBox.style.display = 'block';
        document.getElementById('shareLink').value = 'Đang tạo link rút gọn (vui lòng chờ)...';
        document.getElementById('copyStatus').textContent = '';

        // Gửi thông tin cấu hình lên window.parent (React App) để tạo link ngắn Firebase
        const encoded = btoa(encodeURIComponent(JSON.stringify(CONFIG)));
        window.parent.postMessage({ 
            type: 'THU_MOI_SHARE', 
            config: CONFIG,
            encoded: encoded
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
            const shortUrl = event.data.url;
            document.getElementById('shareLink').value = shortUrl;
            document.getElementById('copyStatus').textContent = '✅ Đã tạo link rút gọn thành công!';
            document.getElementById('copyStatus').style.color = '#27ae60';
            
            if (qrCode) {
                document.getElementById('qrCodeWrapper').style.display = 'block';
                document.getElementById('qrCodeContainer').innerHTML = '';
                qrCode.update({ data: shortUrl });
                qrCode.append(document.getElementById('qrCodeContainer'));
            }
        }
    });

    const btnDownloadQr = document.getElementById('btnDownloadQr');
    if (btnDownloadQr) {
        btnDownloadQr.addEventListener('click', () => {
            if (qrCode) {
                qrCode.download({ name: "MaQR_ThuMoiHopPhuHuynh", extension: "png" });
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

    // ===== RSVP FORM → gửi qua formsubmit.co =====
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
            // --- Gửi qua formsubmit.co (nếu có email) ---
            if (CONFIG.email) {
                const data = {
                    "Phụ huynh": parent,
                    "Học sinh": student,
                    "Lớp": cls,
                    "Xác nhận": attendanceText,
                    "Thời gian gửi": new Date().toLocaleString('vi-VN'),
                    "_subject": `📋 Phản hồi họp PH: ${parent} - ${attendanceText}`,
                    "_captcha": "false",
                    "_template": "table"
                };

                // Dùng kỹ thuật Hidden Iframe để vượt qua chặn CORS của Zalo Browser
                const iframeName = 'formsubmit_iframe_' + Date.now();
                let iframe = document.createElement('iframe');
                iframe.name = iframeName;
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                const formDest = document.createElement('form');
                formDest.target = iframeName;
                formDest.method = 'POST';
                // Gửi dạng form chuẩn (không dùng /ajax/ nữa để tránh CORS)
                formDest.action = `https://formsubmit.co/${CONFIG.email.trim()}`;

                for (let key in data) {
                    const inp = document.createElement('input');
                    inp.type = 'hidden';
                    inp.name = key;
                    inp.value = data[key];
                    formDest.appendChild(inp);
                }

                document.body.appendChild(formDest);
                formDest.submit();

                // Dọn dẹp iframe và form sau khi gửi xong (chờ 3s để form gửi kịp)
                setTimeout(() => {
                    if (document.body.contains(formDest)) document.body.removeChild(formDest);
                    if (document.body.contains(iframe)) document.body.removeChild(iframe);
                }, 3000);
            }

            // --- Hiển thị kết quả ---
            const modalTitle = document.querySelector('#successModal .modal-title');
            const modalEmoji = document.querySelector('#successModal .modal-emoji');
            if (modalTitle) modalTitle.innerHTML = 'Cảm ơn bạn!';
            if (modalEmoji) modalEmoji.innerHTML = '🎊';

            if (isAttend) {
                modalMsg.innerHTML = `Phụ huynh <strong>${parent}</strong> đã xác nhận <span style="color:#27ae60;font-weight:700">THAM DỰ</span> buổi họp phụ huynh.<br><br>Học sinh: <strong>${student}</strong> — Lớp <strong>${cls}</strong><br><br>Hẹn gặp Quý Phụ Huynh tại buổi họp! 🎉`;
                playSuccessSound();
            } else {
                modalMsg.innerHTML = `Phụ huynh <strong>${parent}</strong> đã xác nhận <span style="color:#c0392b;font-weight:700">XIN PHÉP VẮNG MẶT</span>.<br><br>Học sinh: <strong>${student}</strong> — Lớp <strong>${cls}</strong><br><br>Nhà trường ghi nhận. Cảm ơn phản hồi! 🙏`;
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
                    window.parent.postMessage({
                        type: 'SAVE_RSVP',
                        studentName: student
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
            
            if (err.message && err.message.includes('FORMSUBMIT_REJECTED')) {
                modalMsg.innerHTML = `⚠️ Hệ thống từ chối gửi tin nhắn.<br>Giáo viên cần kiểm tra lại cấu hình FormSubmit.<br><br>Chi tiết: ${err.message.replace('FORMSUBMIT_REJECTED: ', '')}`;
            } else {
                modalMsg.innerHTML = `⚠️ Có lỗi xảy ra khi gửi.<br>Vui lòng thử lại hoặc liên hệ giáo viên chủ nhiệm.`;
            }
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
