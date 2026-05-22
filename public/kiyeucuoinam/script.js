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
            customAudioData: '',
            customAudioName: ''
        },
        photos: [] // Array of { id, dataUrl, name, msg }
    };

    const MAX_PHOTOS = 50;
    
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
    
    // Cover & Main Content
    const coverSection = document.getElementById('coverSection');
    const coverBook = document.getElementById('coverBook');
    const yearbookMain = document.getElementById('yearbookMain');
    const tapHint = document.getElementById('tapHint');
    
    // Audio
    const bgMusic = document.getElementById('bgMusic');
    const btnMusicToggle = document.getElementById('btnMusicToggle');
    let isMusicPlaying = false;

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
        settingsModal.classList.add('show');
    });

    btnCloseSettingsX.addEventListener('click', () => {
        saveFormToState();
        applyStateToUI();
        settingsModal.classList.remove('show');
    });

    const btnPreview = document.getElementById('btnPreview');
    if (btnPreview) {
        btnPreview.addEventListener('click', () => {
            saveFormToState();
            applyStateToUI();
            settingsModal.classList.remove('show');
        });
    }

    importFab.addEventListener('click', () => {
        jsonImportInput.click();
    });

    // ===== PHOTO UPLOAD LOGIC =====
    const photoInput = document.getElementById('photoInput');
    const uploadZone = document.getElementById('uploadZone');
    const photoList = document.getElementById('photoList');
    const photoCountEl = document.getElementById('photoCount');
    const IMAGE_COMPRESS_MAX_EDGE = 1600;
    const IMAGE_COMPRESS_TARGET_BYTES = 1.2 * 1024 * 1024;
    const IMAGE_COMPRESS_QUALITY = 0.78;
    let isProcessingPhotoUploads = false;

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

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(reader.error || new Error('Cannot read file.'));
            reader.readAsDataURL(file);
        });
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Cannot compress image.'));
            }, type, quality);
        });
    }

    function loadImageFromUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Cannot load image.'));
            img.src = url;
        });
    }

    async function compressImageFile(file) {
        const objectUrl = URL.createObjectURL(file);
        try {
            const img = await loadImageFromUrl(objectUrl);

            const ratio = Math.min(1, IMAGE_COMPRESS_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
            const width = Math.max(1, Math.round(img.naturalWidth * ratio));
            const height = Math.max(1, Math.round(img.naturalHeight * ratio));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d', { alpha: false });
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            let quality = IMAGE_COMPRESS_QUALITY;
            let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
            while (blob.size > IMAGE_COMPRESS_TARGET_BYTES && quality > 0.58) {
                quality -= 0.08;
                blob = await canvasToBlob(canvas, 'image/jpeg', quality);
            }

            const shouldUseCompressed = blob.size < file.size || ratio < 1;
            const outputFile = shouldUseCompressed
                ? new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' })
                : file;

            return {
                dataUrl: await readFileAsDataUrl(outputFile),
                sizeBefore: file.size,
                sizeAfter: outputFile.size,
                compressed: outputFile !== file
            };
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    async function handleFiles(files) {
        if (isProcessingPhotoUploads) {
            alert('Dang xu ly anh. Vui long cho hoan tat roi chon tiep.');
            return;
        }

        let validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        let remainingSlots = MAX_PHOTOS - STATE.photos.length;
        
        if (validFiles.length > remainingSlots) {
            alert(`Bạn chỉ có thể chọn thêm ${remainingSlots} ảnh. Tối đa ${MAX_PHOTOS} ảnh.`);
            validFiles = validFiles.slice(0, remainingSlots);
        }

        isProcessingPhotoUploads = true;
        photoInput.disabled = true;
        let compressedCount = 0;
        let savedBytes = 0;

        try {
            for (let index = 0; index < validFiles.length; index += 1) {
                const file = validFiles[index];
                photoCountEl.textContent = `Dang toi uu ${index + 1} / ${validFiles.length} anh...`;
                const result = await compressImageFile(file);
                if (result.compressed) {
                    compressedCount += 1;
                    savedBytes += Math.max(0, result.sizeBefore - result.sizeAfter);
                }
                const id = Date.now() + Math.random().toString(36).substring(7);
                STATE.photos.push({
                    id: id,
                    dataUrl: result.dataUrl,
                    originalSize: result.sizeBefore,
                    compressedSize: result.sizeAfter,
                    name: file.name.split('.')[0],
                    msg: ''
                });
                renderPhotoList();
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            if (compressedCount) {
                const savedMB = (savedBytes / (1024 * 1024)).toFixed(1);
                photoCountEl.textContent = `Da nen ${compressedCount} anh, giam khoang ${savedMB} MB.`;
                setTimeout(renderPhotoList, 1500);
            }
        } catch (error) {
            console.error('Image compression error:', error);
            alert('Co anh chua xu ly duoc. Hay thu chon it anh hon hoac doi anh sang JPG/PNG roi tai lai.');
            renderPhotoList();
        } finally {
            isProcessingPhotoUploads = false;
            photoInput.disabled = false;
        }
    }

    function renderPhotoList() {
        photoList.innerHTML = '';
        STATE.photos.forEach((photo, index) => {
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.innerHTML = `
                <button class="photo-item-remove" data-id="${photo.id}">✕</button>
                <img src="${photo.dataUrl}" alt="Photo">
                <div class="photo-item-info">
                    <input type="text" placeholder="Tên HS" value="${photo.name}" class="p-name" data-id="${photo.id}">
                    <div style="display:flex;gap:4px;">
                        <input type="text" placeholder="Đặc điểm..." value="${photo.msg}" class="p-msg" data-id="${photo.id}" style="flex:1;">
                        <button class="btn-ai-trait" data-id="${photo.id}" title="Gợi ý AI" style="background:var(--gradient);border:none;border-radius:6px;color:#fff;cursor:pointer;padding:0 8px;font-size:0.9rem;">✨</button>
                    </div>
                </div>
            `;
            photoList.appendChild(div);
        });

        photoCountEl.textContent = `${STATE.photos.length} / ${MAX_PHOTOS} ảnh`;

        // Attach event listeners to new elements
        document.querySelectorAll('.photo-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                STATE.photos = STATE.photos.filter(p => p.id !== id);
                renderPhotoList();
            });
        });

        document.querySelectorAll('.p-name, .p-msg').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const field = e.target.classList.contains('p-name') ? 'name' : 'msg';
                const photo = STATE.photos.find(p => p.id === id);
                if (photo) photo[field] = e.target.value;
            });
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
                }
            });
        });
    }

    // ===== DATA MANAGEMENT =====
    function saveFormToState() {
        STATE.config.className = document.getElementById('cfgClassName').value;
        STATE.config.school = document.getElementById('cfgSchool').value;
        STATE.config.year = document.getElementById('cfgYear').value;
        STATE.config.teacher = document.getElementById('cfgTeacher').value;
        STATE.config.title = document.getElementById('cfgTitle').value;
        STATE.config.slogan = document.getElementById('cfgSlogan').value;
        STATE.config.message = document.getElementById('cfgMessage').value;

        const themeRadio = document.querySelector('input[name="cfgTheme"]:checked');
        if (themeRadio) STATE.config.theme = themeRadio.value;

        const fontRadio = document.querySelector('input[name="cfgFont"]:checked');
        if (fontRadio) STATE.config.font = fontRadio.value;
        
        const effectRadio = document.querySelector('input[name="cfgEffect"]:checked');
        if (effectRadio) STATE.config.effect = effectRadio.value;
        
        const layoutRadio = document.querySelector('input[name="cfgLayout"]:checked');
        if (layoutRadio) STATE.config.layout = layoutRadio.value;
    }

    const audioInput = document.getElementById('audioInput');
    const audioName = document.getElementById('audioName');

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
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function populateFormFromState() {
        document.getElementById('cfgClassName').value = STATE.config.className || '';
        document.getElementById('cfgSchool').value = STATE.config.school || '';
        document.getElementById('cfgYear').value = STATE.config.year || '';
        document.getElementById('cfgTeacher').value = STATE.config.teacher || '';
        document.getElementById('cfgTitle').value = STATE.config.title || '';
        document.getElementById('cfgSlogan').value = STATE.config.slogan || '';
        document.getElementById('cfgMessage').value = STATE.config.message || '';

        const themeRadio = document.querySelector(`input[name="cfgTheme"][value="${STATE.config.theme}"]`);
        if (themeRadio) themeRadio.checked = true;

        const fontRadio = document.querySelector(`input[name="cfgFont"][value="${STATE.config.font}"]`);
        if (fontRadio) fontRadio.checked = true;

        const effectRadio = document.querySelector(`input[name="cfgEffect"][value="${STATE.config.effect}"]`);
        if (effectRadio) effectRadio.checked = true;

        const layoutRadio = document.querySelector(`input[name="cfgLayout"][value="${STATE.config.layout}"]`);
        if (layoutRadio) layoutRadio.checked = true;

        const audioName = document.getElementById('audioName');
        if (audioName) audioName.textContent = STATE.config.customAudioName || 'Mặc định hệ thống';

        renderPhotoList();
    }

    // ===== UI RENDERING =====
    function applyStateToUI() {
        // Theme
        document.body.setAttribute('data-theme', STATE.config.theme);

        // Update Cover
        document.getElementById('coverTitle').textContent = STATE.config.title || 'Kỉ Yếu Cuối Năm';
        document.getElementById('coverClass').textContent = STATE.config.className || 'Lớp ___';
        document.getElementById('coverYear').textContent = STATE.config.year || '';
        document.getElementById('coverSchool').textContent = STATE.config.school || 'Trường ___';

        // Update Main Header
        document.getElementById('ybTitle').textContent = STATE.config.title || 'Kỉ Yếu Cuối Năm';
        document.getElementById('ybClass').textContent = STATE.config.className || 'Lớp ___';
        document.getElementById('ybSchool').textContent = STATE.config.school || 'Trường ___';
        document.getElementById('ybYear').textContent = STATE.config.year ? `✦ Năm học ${STATE.config.year} ✦` : '';
        document.getElementById('ybSlogan').textContent = STATE.config.slogan || '';
        
        // Update Message
        document.getElementById('messageContent').innerHTML = `<p>${(STATE.config.message || '').replace(/\\n/g, '<br>')}</p>`;
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
            if (bgMusic.getAttribute('src') !== 'assets/nhac-ky-yeu.mp3') {
                bgMusic.src = 'assets/nhac-ky-yeu.mp3';
                if (isMusicPlaying) bgMusic.play().catch(e => console.log('Audio play error:', e));
            }
        }

        // Render Gallery
        renderGallery();
        
        // Render Slideshow
        initSlideshow();

        // Check Empty State
        if (!STATE.config.className && STATE.photos.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
        }
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

    function renderGallery() {
        const container = document.getElementById('galleryContainer');
        container.innerHTML = '';
        container.className = 'gallery-container layout-' + STATE.config.layout;

        if (STATE.photos.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text2); padding: 20px;">Chưa có ảnh nào.</p>';
            return;
        }

        if (STATE.config.layout === 'carousel') {
            const track = document.createElement('div');
            track.className = 'carousel-track';
            
            STATE.photos.forEach(photo => {
                const item = document.createElement('div');
                item.className = 'carousel-item';
                item.innerHTML = `
                    <img src="${photo.dataUrl}" alt="${photo.name}">
                    <div class="carousel-name">${photo.name}</div>
                `;
                item.addEventListener('click', () => openPhotoViewer(photo));
                track.appendChild(item);
            });
            
            container.appendChild(track);
            // Basic carousel controls
            // ... omitting complex sliding logic for brevity, just overflow-x scroll for now
            container.style.overflowX = 'auto';
            container.style.paddingBottom = '10px';

        } else {
            STATE.photos.forEach(photo => {
                const item = document.createElement('div');
                if (STATE.config.layout === 'bubble') {
                    item.className = 'gallery-bubble';
                    item.innerHTML = `
                        <img src="${photo.dataUrl}" alt="${photo.name}">
                        <div class="bubble-name">${photo.name}</div>
                    `;
                } else if (STATE.config.layout === 'grid') {
                    item.className = 'gallery-grid-item';
                    item.innerHTML = `
                        <img src="${photo.dataUrl}" alt="${photo.name}">
                        <div class="grid-name">${photo.name}</div>
                    `;
                }
                item.addEventListener('click', () => openPhotoViewer(photo));
                container.appendChild(item);
            });
        }
    }

    // ===== PHOTO VIEWER MODAL =====
    const photoViewerModal = document.getElementById('photoViewerModal');
    const viewerImage = document.getElementById('viewerImage');
    const viewerName = document.getElementById('viewerName');
    const viewerMsg = document.getElementById('viewerMsg');
    const btnCloseViewer = document.getElementById('btnCloseViewer');

    function openPhotoViewer(photo) {
        viewerImage.src = photo.dataUrl;
        viewerName.textContent = photo.name;
        viewerMsg.textContent = photo.msg || '';
        photoViewerModal.classList.add('show');
    }

    btnCloseViewer.addEventListener('click', () => {
        photoViewerModal.classList.remove('show');
    });

    photoViewerModal.addEventListener('click', (e) => {
        if (e.target === photoViewerModal) {
            photoViewerModal.classList.remove('show');
        }
    });

    // ===== SLIDESHOW =====
    let currentSlide = 0;
    let slideInterval = null;

    function initSlideshow() {
        if (STATE.photos.length === 0) return;
        currentSlide = 0;
        updateSlide();
    }

    function updateSlide() {
        if (STATE.photos.length === 0) return;
        const photo = STATE.photos[currentSlide];
        document.getElementById('slideImage').style.backgroundImage = `url('${photo.dataUrl}')`;
        document.getElementById('slideName').textContent = photo.name;
        document.getElementById('slideMsg').textContent = photo.msg;
        
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
        if (slideInterval) {
            pauseSlideshow();
        } else {
            playSlideshow();
        }
    });

    function playSlideshow() {
        btnPlaySlide.textContent = '⏸ Pause';
        btnPlaySlide.classList.add('active');
        slideInterval = setInterval(nextSlide, 3000);
    }

    function pauseSlideshow() {
        btnPlaySlide.textContent = '▶ Auto';
        btnPlaySlide.classList.remove('active');
        clearInterval(slideInterval);
        slideInterval = null;
    }

    // ===== EXPORT / IMPORT (JSON) =====
    const btnExport = document.getElementById('btnExport');
    
    btnExport.addEventListener('click', () => {
        saveFormToState();
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

    function escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    if (btnShareHTML) {
        btnShareHTML.addEventListener('click', async () => {
            saveFormToState();
            if (STATE.photos.length === 0) {
                alert('Vui lòng thêm ít nhất 1 ảnh học sinh trước!');
                return;
            }
            btnShareHTML.textContent = '⏳ Đang tạo file...';
            btnShareHTML.disabled = true;
            await new Promise(r => setTimeout(r, 50));

            try {
                let css = '';
                try { const r = await fetch('style.css'); css = await r.text(); } catch {
                    for (const s of document.styleSheets) { try { for (const ru of s.cssRules) css += ru.cssText + '\n'; } catch {} }
                }
                css = css.replace(/--bg-image:url\([^)]+\)/g, '--bg-image:none');

                const c = STATE.config;
                const ph = STATE.photos;
                const fMap = {'dancing':"'Dancing Script',cursive",'great-vibes':"'Great Vibes',cursive",'pacifico':"'Pacifico',cursive",'lobster':"'Lobster',cursive",'playfair':"'Playfair Display',serif"};
                const ff = fMap[c.font] || fMap.dancing;

                let gHTML = '';
                ph.forEach((p,i) => {
                    if (c.layout === 'carousel') {
                        gHTML += `<div class="carousel-item" data-idx="${i}"><img src="${p.dataUrl}" alt="${escapeHtml(p.name)}"><div class="carousel-name">${escapeHtml(p.name)}</div></div>`;
                    } else if (c.layout === 'grid') {
                        gHTML += `<div class="gallery-grid-item" data-idx="${i}"><img src="${p.dataUrl}" alt="${escapeHtml(p.name)}"><div class="grid-name">${escapeHtml(p.name)}</div></div>`;
                    } else {
                        gHTML += `<div class="gallery-bubble" data-idx="${i}"><img src="${p.dataUrl}" alt="${escapeHtml(p.name)}"><div class="bubble-name">${escapeHtml(p.name)}</div></div>`;
                    }
                });
                if (c.layout === 'carousel') gHTML = `<div class="carousel-track">${gHTML}</div>`;

                const audioTag = c.customAudioData ? `<audio id="bgMusic" loop preload="auto" src="${c.customAudioData}"></audio>` : '<audio id="bgMusic" loop preload="auto"></audio>';

                const viewerJS = `
var photos = ${JSON.stringify(ph.map(p => ({dataUrl:p.dataUrl,name:p.name,msg:p.msg})))};
var currentSlide = 0, slideInterval = null, isMusicPlaying = false;
var bgMusic = document.getElementById('bgMusic');
var btnMT = document.getElementById('btnMusicToggle');

document.getElementById('coverBook').addEventListener('click', function(){
    this.classList.add('open');
    document.querySelector('.cover-tap-hint').style.display='none';
    if(bgMusic&&bgMusic.src){bgMusic.volume=0.5;bgMusic.play().then(function(){isMusicPlaying=true;btnMT.style.display='flex';btnMT.classList.add('playing');}).catch(function(){btnMT.style.display='flex';});}
    setTimeout(function(){document.getElementById('coverSection').classList.add('hidden');document.getElementById('yearbookMain').classList.add('show');observeSections();},1200);
});

btnMT.addEventListener('click',function(){
    if(!bgMusic)return;
    if(isMusicPlaying){bgMusic.pause();isMusicPlaying=false;btnMT.classList.remove('playing');btnMT.innerHTML='<span class="music-icon">🔇</span>';}
    else{bgMusic.play().catch(function(){});isMusicPlaying=true;btnMT.classList.add('playing');btnMT.innerHTML='<span class="music-bars"><span></span><span></span><span></span><span></span></span>';}
});

var btnPM=document.getElementById('btnPlayMainMusic');
if(btnPM)btnPM.addEventListener('click',function(){btnMT.click();});

document.querySelectorAll('[data-idx]').forEach(function(el){
    el.style.cursor='pointer';
    el.addEventListener('click',function(){
        var i=parseInt(this.dataset.idx);
        var p=photos[i];if(!p)return;
        document.getElementById('viewerImage').src=p.dataUrl;
        document.getElementById('viewerName').textContent=p.name;
        document.getElementById('viewerMsg').textContent=p.msg||'';
        document.getElementById('photoViewerModal').classList.add('show');
    });
});

document.getElementById('btnCloseViewer').addEventListener('click',function(){document.getElementById('photoViewerModal').classList.remove('show');});
document.getElementById('photoViewerModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('show');});

function updateSlide(){
    if(!photos.length)return;var p=photos[currentSlide];
    document.getElementById('slideImage').style.backgroundImage="url('"+p.dataUrl+"')";
    document.getElementById('slideName').textContent=p.name;
    document.getElementById('slideMsg').textContent=p.msg||'';
    var dots=document.getElementById('slideshowDots');dots.innerHTML='';
    photos.forEach(function(_,i){var d=document.createElement('div');d.className='dot'+(i===currentSlide?' active':'');d.addEventListener('click',function(){currentSlide=i;updateSlide();pauseSS();});dots.appendChild(d);});
}
function nextS(){currentSlide=(currentSlide+1)%photos.length;updateSlide();}
function prevS(){currentSlide=(currentSlide-1+photos.length)%photos.length;updateSlide();}
function playSS(){document.getElementById('btnPlaySlide').textContent='⏸ Pause';document.getElementById('btnPlaySlide').classList.add('active');slideInterval=setInterval(nextS,3000);}
function pauseSS(){document.getElementById('btnPlaySlide').textContent='▶ Auto';document.getElementById('btnPlaySlide').classList.remove('active');clearInterval(slideInterval);slideInterval=null;}
document.getElementById('btnNextSlide').addEventListener('click',function(){nextS();pauseSS();});
document.getElementById('btnPrevSlide').addEventListener('click',function(){prevS();pauseSS();});
document.getElementById('btnPlaySlide').addEventListener('click',function(){slideInterval?pauseSS():playSS();});
if(photos.length)updateSlide();

function observeSections(){
    var secs=document.querySelectorAll('.yb-section');
    var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:0.1});
    secs.forEach(function(s){obs.observe(s);});
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
})();`;

                const fullHTML = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="description" content="Kỉ yếu ${escapeHtml(c.className)} - ${escapeHtml(c.school)}">
<title>🎓 Kỉ Yếu ${escapeHtml(c.className)} - ${escapeHtml(c.school)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Quicksand:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,700&family=Pacifico&family=Lobster&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body data-theme="${c.theme}">
<div class="particles-container" id="particles"></div>
${audioTag}
<button id="btnMusicToggle" class="music-toggle" title="Tắt/Bật nhạc"><span class="music-icon">🎵</span><span class="music-bars"><span></span><span></span><span></span><span></span></span></button>

<section class="cover-section" id="coverSection">
<div class="cover-bg"><div class="cover-gradient"></div></div>
<div class="cover-content">
<div class="cover-book" id="coverBook">
<div class="book-spine"></div>
<div class="book-front">
<div class="book-decoration book-decoration-top"></div>
<div class="book-badge">📸</div>
<h1 class="book-title script-font" style="font-family:${ff}">${escapeHtml(c.title||'Kỉ Yếu Cuối Năm')}</h1>
<div class="book-class-info"><span>${escapeHtml(c.className||'Lớp ___')}</span><span class="book-divider">✦</span><span>${escapeHtml(c.year||'')}</span></div>
<p class="book-school">${escapeHtml(c.school||'Trường ___')}</p>
<div class="book-decoration book-decoration-bottom"></div>
</div></div>
<div class="cover-tap-hint"><span class="tap-hand">👆</span><span>Nhấn để mở kỉ yếu</span></div>
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

<section class="yb-section message-section">
<div class="message-card">
<h2 class="section-title script-font" style="font-family:${ff}">💌 Lời nhắn của GVCN</h2>
<div class="message-content"><p>${(c.message||'').replace(/\n/g,'<br>')}</p></div>
<p class="message-sign">${c.teacher?'— '+escapeHtml(c.teacher)+' —':'— Giáo viên chủ nhiệm —'}</p>
</div></section>

<section class="yb-section slideshow-section">
<h2 class="section-title script-font" style="font-family:${ff}">🎬 Slideshow kỉ niệm</h2>
<div class="slideshow-wrapper">
<div class="slideshow-stage" id="slideshowStage"><div class="slide-image" id="slideImage"></div><div class="slide-info"><p class="slide-name" id="slideName"></p><p class="slide-msg" id="slideMsg"></p></div></div>
<div class="slideshow-controls"><button class="slide-btn" id="btnPrevSlide">◀</button><button class="slide-btn slide-play" id="btnPlaySlide">▶ Auto</button><button class="slide-btn" id="btnNextSlide">▶</button></div>
<div class="slideshow-dots" id="slideshowDots"></div>
</div></section>

<footer class="yb-footer">
<p class="footer-text">Được tạo với ❤️ bởi ${escapeHtml(c.teacher||'GVCN')}</p>
<p class="footer-year<script>${viewerJS}<\/script>
</body></html>`;

                // Create ZIP with index.html inside
                const zip = new JSZip();
                zip.file('index.html', fullHTML);
                const zipBlob = await zip.generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}});
                
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `KiYeu_${(c.className||'Lop').replace(/\s+/g,'-')}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                alert('✅ Đã xuất file ZIP thành công!\n\n📋 Bước tiếp theo:\n1. Vào app.netlify.com/drop\n2. Kéo thả file ZIP vừa tải vào\n3. Copy link → dán vào ô bên dưới → Tạo QR!');
            } catch(err) {
                console.error('Export ZIP error:', err);
                alert('Lỗi khi xuất file: ' + err.message);
            } finally {
                btnShareHTML.textContent = '📦 Bước 1: Xuất file ZIP';
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

    if (btnGenQR) {
        btnGenQR.addEventListener('click', () => {
            const url = document.getElementById('netlifyUrl').value.trim();
            if (!url) {
                alert('Vui lòng dán link Netlify vào ô trước!');
                return;
            }
            if (!url.startsWith('http')) {
                alert('Link không hợp lệ! Hãy dán link bắt đầu bằng https://');
                return;
            }

            document.getElementById('finalLink').value = url;
            document.getElementById('qrResultBox').style.display = 'block';

            if (qrCode) {
                document.getElementById('qrCodeContainer').innerHTML = '';
                qrCode.update({ data: url });
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
        coverBook.classList.add('open');
        if (tapHint) tapHint.style.display = 'none';

        // Play Audio
        if (bgMusic) {
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
            if (!bgMusic) return;
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
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        
        sections.forEach(s => observer.observe(s));
    }

    // ===== INIT =====
    applyStateToUI();
});
