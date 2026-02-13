/* =============================================
   PHÒNG TRANH 3D - THAM QUAN ĐỀN HÙNG
   Main Application Logic
   ============================================= */

class DenHungGallery {
    constructor() {
        // State
        this.visitedLocations = new Set();
        this.currentLocation = null;
        this.score = 0;
        this.isMusicPlaying = false;
        this.isVoicePlaying = false;
        this.currentQuizIndex = 0;
        this.currentQuizQuestions = [];

        // DOM Elements
        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            welcomeScreen: document.getElementById('welcome-screen'),
            mainGallery: document.getElementById('main-gallery'),
            startBtn: document.getElementById('start-btn'),

            // Audio controls
            musicToggle: document.getElementById('music-toggle'),
            voiceToggle: document.getElementById('voice-toggle'),
            bgMusic: document.getElementById('bg-music'),
            voiceAudio: document.getElementById('voice-audio'),

            // Video (Main page)
            mainVideoBtn: document.getElementById('main-video-btn'),

            // Guide
            guide: document.getElementById('guide'),
            guideBubble: document.getElementById('guide-bubble'),
            guideText: document.getElementById('guide-text'),

            // Progress
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            scoreDisplay: document.getElementById('score'),

            // Popup
            popup: document.getElementById('location-popup'),
            popupClose: document.getElementById('popup-close'),
            popupTitle: document.getElementById('popup-title'),
            popupNumber: document.getElementById('popup-number'),
            popupImage: document.getElementById('popup-image'),
            carouselThumbs: document.getElementById('carousel-thumbs'),
            popupDescription: document.getElementById('popup-description'),
            audioPlayBtn: document.getElementById('audio-play'),
            audioProgressFill: document.getElementById('audio-progress-fill'),
            btnQuiz: document.getElementById('btn-quiz'),

            // Quiz
            quizModal: document.getElementById('quiz-modal'),
            quizTitle: document.getElementById('quiz-title'),
            quizCurrent: document.getElementById('quiz-current'),
            quizTotal: document.getElementById('quiz-total'),
            quizQuestion: document.getElementById('quiz-question'),
            quizOptions: document.getElementById('quiz-options'),
            quizFeedback: document.getElementById('quiz-feedback'),
            feedbackIcon: document.getElementById('feedback-icon'),
            feedbackText: document.getElementById('feedback-text'),
            btnNextQuiz: document.getElementById('btn-next-quiz'),
            btnFinishQuiz: document.getElementById('btn-finish-quiz'),

            // Celebration
            celebration: document.getElementById('celebration'),
            celebrationMessage: document.getElementById('celebration-message'),
            confetti: document.getElementById('confetti'),

            // Fullscreen & Zoom
            fullscreenToggle: document.getElementById('fullscreen-toggle'),
            zoomImage: document.getElementById('zoom-image'),
            imageLightbox: document.getElementById('image-lightbox'),
            lightboxImage: document.getElementById('lightbox-image'),
            lightboxCaption: document.getElementById('lightbox-caption'),
            lightboxClose: document.getElementById('lightbox-close'),

            // Video
            btnVideo: document.getElementById('btn-video'),
            videoModal: document.getElementById('video-modal'),
            videoFrame: document.getElementById('video-frame'),
            videoClose: document.getElementById('video-close'),

            // VR 360
            btnVR360: document.getElementById('btn-vr-360'),
            vrModal: document.getElementById('vr-modal'),
            vrTitle: document.getElementById('vr-title'),
            panorama: document.getElementById('panorama'),
            vrClose: document.getElementById('vr-close')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.hideLoadingScreen();
    }

    setupEventListeners() {
        // Start button
        this.elements.startBtn.addEventListener('click', () => this.startGallery());

        // Audio controls
        this.elements.musicToggle.addEventListener('click', () => this.toggleMusic());
        this.elements.voiceToggle.addEventListener('click', () => this.toggleVoice());

        // Location popup buttons
        this.elements.btnVR360.addEventListener('click', () => {
            if (this.currentLocation) {
                this.closePopup(); // Close the location popup first
                this.openVRModal(this.currentLocation);
            }
        });
        this.elements.btnVideo.addEventListener('click', () => this.openVideoModal());

        // Main video button
        this.elements.mainVideoBtn.addEventListener('click', () => this.openMainVideo());

        // Paintings
        document.querySelectorAll('.painting').forEach(painting => {
            painting.addEventListener('click', (e) => {
                const locationId = e.currentTarget.dataset.location;
                this.openLocation(locationId);
            });
        });

        // Popup controls
        this.elements.popupClose.addEventListener('click', () => this.closePopup());
        this.elements.audioPlayBtn.addEventListener('click', () => this.playLocationAudio());
        this.elements.btnQuiz.addEventListener('click', () => this.startQuiz());
        this.elements.btnVideo.addEventListener('click', () => this.openVideoModal()); // Added event listener for location video button

        // Quiz controls
        this.elements.btnNextQuiz.addEventListener('click', () => this.nextQuizQuestion());
        this.elements.btnFinishQuiz.addEventListener('click', () => this.finishQuiz());

        // Close popup on outside click
        this.elements.popup.addEventListener('click', (e) => {
            if (e.target === this.elements.popup) this.closePopup();
        });

        // Voice audio progress
        this.elements.voiceAudio.addEventListener('timeupdate', () => this.updateAudioProgress());
        this.elements.voiceAudio.addEventListener('ended', () => this.onAudioEnded());

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePopup();
                this.closeQuizModal();
                this.closeLightbox();
                this.closeVideoModal();
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
            }
        });

        // Fullscreen toggle
        this.elements.fullscreenToggle.addEventListener('click', () => this.toggleFullscreen());

        // Zoom image
        this.elements.zoomImage.addEventListener('click', () => this.openLightbox());
        this.elements.popupImage.addEventListener('click', () => this.openLightbox());

        // Lightbox controls
        this.elements.lightboxClose.addEventListener('click', () => this.closeLightbox());
        this.elements.imageLightbox.addEventListener('click', (e) => {
            if (e.target === this.elements.imageLightbox) this.closeLightbox();
        });

        // Fullscreen change event
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());

        // Video controls
        this.elements.videoClose.addEventListener('click', () => this.closeVideoModal());
        this.elements.videoModal.addEventListener('click', (e) => {
            if (e.target === this.elements.videoModal) this.closeVideoModal();
        });

        // VR 360 controls
        this.elements.vrClose.addEventListener('click', () => this.closeVRModal());
        this.elements.vrModal.addEventListener('click', (e) => {
            if (e.target === this.elements.vrModal) this.closeVRModal();
        });

        // ESC key closes modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.elements.vrModal.classList.contains('hidden')) {
                    this.closeVRModal();
                }
                if (!this.elements.videoModal.classList.contains('hidden')) {
                    this.closeVideoModal();
                }
            }
        });
    }

    hideLoadingScreen() {
        setTimeout(() => {
            this.elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.elements.loadingScreen.classList.add('hidden');
            }, 500);
        }, 2000);
    }

    startGallery() {
        this.elements.welcomeScreen.classList.add('hidden');
        this.elements.mainGallery.classList.remove('hidden');

        // Show guide message
        const welcomeMsg = window.i18n ? window.i18n.t('guide_welcome') : GUIDE_MESSAGES.welcome;
        this.showGuideMessage(welcomeMsg);

        // Try to play background music
        this.playBackgroundMusic();

        // After a moment, show start message
        setTimeout(() => {
            this.showGuideMessage(GUIDE_MESSAGES.start);
        }, 5000);
    }

    // ==================== AUDIO ====================

    playBackgroundMusic() {
        this.elements.bgMusic.volume = 0.3;
        this.elements.bgMusic.play().then(() => {
            this.isMusicPlaying = true;
            this.elements.musicToggle.textContent = '🎵';
            this.elements.musicToggle.classList.remove('muted');
        }).catch(err => {
            console.log('Auto-play prevented:', err);
            this.elements.musicToggle.textContent = '🔇';
            this.elements.musicToggle.classList.add('muted');
        });
    }

    toggleMusic() {
        if (this.isMusicPlaying) {
            this.elements.bgMusic.pause();
            this.elements.musicToggle.textContent = '🔇';
            this.elements.musicToggle.classList.add('muted');
        } else {
            this.elements.bgMusic.play();
            this.elements.musicToggle.textContent = '🎵';
            this.elements.musicToggle.classList.remove('muted');
        }
        this.isMusicPlaying = !this.isMusicPlaying;
    }

    toggleVoice() {
        if (this.isVoicePlaying) {
            this.elements.voiceAudio.pause();
            this.isVoicePlaying = false;
        }
        this.elements.voiceToggle.classList.toggle('muted');
    }

    playLocationAudio() {
        if (!this.currentLocation) return;

        const location = LOCATIONS_DATA[this.currentLocation];

        if (this.isVoicePlaying) {
            this.elements.voiceAudio.pause();
            this.elements.audioPlayBtn.innerHTML = '<span class="play-icon">▶️</span> Nghe thuyết minh';
            this.elements.audioPlayBtn.classList.remove('playing');
            this.isVoicePlaying = false;
        } else {
            // Lower background music
            if (this.isMusicPlaying) {
                this.elements.bgMusic.volume = 0.1;
            }

            this.elements.voiceAudio.src = location.audio;
            this.elements.voiceAudio.play().then(() => {
                this.isVoicePlaying = true;
                this.elements.audioPlayBtn.innerHTML = '<span class="play-icon">⏸️</span> Tạm dừng';
                this.elements.audioPlayBtn.classList.add('playing');
            }).catch(err => {
                console.error('Audio play error:', err);
                this.showGuideMessage("Không thể phát audio. Vui lòng thử lại!");
            });
        }
    }

    updateAudioProgress() {
        const audio = this.elements.voiceAudio;
        const progress = (audio.currentTime / audio.duration) * 100;
        this.elements.audioProgressFill.style.width = `${progress}%`;
    }

    onAudioEnded() {
        this.isVoicePlaying = false;
        this.elements.audioPlayBtn.innerHTML = '<span class="play-icon">▶️</span> Nghe thuyết minh';
        this.elements.audioPlayBtn.classList.remove('playing');
        this.elements.audioProgressFill.style.width = '0%';

        // Restore background music volume
        if (this.isMusicPlaying) {
            this.elements.bgMusic.volume = 0.3;
        }
    }

    // ==================== GUIDE ====================

    showGuideMessage(message) {
        this.elements.guideText.textContent = message;
        this.elements.guideBubble.style.animation = 'none';
        this.elements.guideBubble.offsetHeight; // Trigger reflow
        this.elements.guideBubble.style.animation = 'bubblePop 0.3s ease';
    }

    // ==================== LOCATION POPUP ====================

    openLocation(locationId) {
        const location = LOCATIONS_DATA[locationId];
        if (!location) return;

        this.currentLocation = locationId;

        // Update popup content
        this.elements.popupTitle.textContent = location.name;
        this.elements.popupNumber.textContent = location.number;
        this.elements.popupImage.src = location.image;
        this.elements.popupImage.alt = location.name;
        this.elements.popupDescription.innerHTML = `<p>${location.description.replace(/\n/g, '<br>')}</p>`;

        // Set current video link for location
        this.currentVideoLink = location.video || null;
        if (this.currentVideoLink) {
            this.elements.btnVideo.classList.remove('hidden');
        } else {
            this.elements.btnVideo.classList.add('hidden');
        }

        // Create thumbnails
        this.createThumbnails(location);

        // Reset audio
        this.elements.audioProgressFill.style.width = '0%';
        this.elements.audioPlayBtn.innerHTML = '<span class="play-icon">▶️</span> Nghe thuyết minh';
        this.elements.audioPlayBtn.classList.remove('playing');

        // Show popup
        this.elements.popup.classList.remove('hidden');

        // Mark as visited
        if (!this.visitedLocations.has(locationId)) {
            this.visitedLocations.add(locationId);
            this.updateProgress();
        }

        // Show guide message
        this.showGuideMessage(location.guideMessage);
    }

    createThumbnails(location) {
        this.elements.carouselThumbs.innerHTML = '';

        const images = [location.image];
        if (location.realImage) {
            images.push(location.realImage);
        }

        images.forEach((src, index) => {
            const thumb = document.createElement('img');
            thumb.src = src;
            thumb.alt = `${location.name} ${index + 1}`;
            thumb.className = `carousel-thumb${index === 0 ? ' active' : ''}`;
            thumb.addEventListener('click', () => {
                this.elements.popupImage.src = src;
                document.querySelectorAll('.carousel-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            this.elements.carouselThumbs.appendChild(thumb);
        });
    }

    closePopup() {
        this.elements.popup.classList.add('hidden');

        // Stop voice audio
        if (this.isVoicePlaying) {
            this.elements.voiceAudio.pause();
            this.isVoicePlaying = false;
            if (this.isMusicPlaying) {
                this.elements.bgMusic.volume = 0.3;
            }
        }
        this.currentVideoLink = null; // Clear current video link when popup closes
    }

    updateProgress() {
        const total = Object.keys(LOCATIONS_DATA).length;
        const visited = this.visitedLocations.size;
        const percent = (visited / total) * 100;

        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressText.textContent = `${visited}/${total} địa điểm đã xem`;

        // Check if all visited
        if (visited === total) {
            setTimeout(() => {
                this.showGuideMessage(GUIDE_MESSAGES.allCompleted);
            }, 1000);
        }
    }

    // ==================== QUIZ ====================

    startQuiz() {
        const location = LOCATIONS_DATA[this.currentLocation];
        if (!location || !location.quiz) return;

        this.closePopup();

        this.currentQuizQuestions = [...location.quiz];
        this.currentQuizIndex = 0;

        this.elements.quizTitle.textContent = `📝 Quiz: ${location.name}`;
        this.elements.quizTotal.textContent = this.currentQuizQuestions.length;

        this.showQuizQuestion();
        this.elements.quizModal.classList.remove('hidden');

        this.showGuideMessage(GUIDE_MESSAGES.quizStart);
    }

    showQuizQuestion() {
        const question = this.currentQuizQuestions[this.currentQuizIndex];

        this.elements.quizCurrent.textContent = this.currentQuizIndex + 1;
        this.elements.quizQuestion.textContent = question.question;

        // Reset feedback
        this.elements.quizFeedback.classList.add('hidden');
        this.elements.btnNextQuiz.classList.add('hidden');
        this.elements.btnFinishQuiz.classList.add('hidden');

        // Create options
        this.elements.quizOptions.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];

        question.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = `${letters[index]}. ${option}`;
            btn.dataset.index = index;
            btn.addEventListener('click', () => this.selectAnswer(index, btn));
            this.elements.quizOptions.appendChild(btn);
        });
    }

    selectAnswer(selectedIndex, selectedBtn) {
        const question = this.currentQuizQuestions[this.currentQuizIndex];
        const isCorrect = selectedIndex === question.correct;

        // Disable all options
        document.querySelectorAll('.quiz-option').forEach(btn => {
            btn.disabled = true;
            if (parseInt(btn.dataset.index) === question.correct) {
                btn.classList.add('correct');
            }
        });

        if (isCorrect) {
            selectedBtn.classList.add('correct');
            this.score += 10;
            if (this.elements.scoreDisplay) {
                this.elements.scoreDisplay.textContent = this.score;
            }

            this.elements.feedbackIcon.textContent = '🎉';
            this.elements.feedbackText.textContent = this.getRandomMessage(GUIDE_MESSAGES.quizCorrect);
            this.elements.feedbackText.classList.remove('wrong');

            this.showGuideMessage(this.getRandomMessage(GUIDE_MESSAGES.quizCorrect));

            // Mini celebration
            this.createConfetti(10);
        } else {
            selectedBtn.classList.add('wrong');

            this.elements.feedbackIcon.textContent = '💡';
            this.elements.feedbackText.textContent = question.explanation;
            this.elements.feedbackText.classList.add('wrong');

            this.showGuideMessage(this.getRandomMessage(GUIDE_MESSAGES.quizWrong));
        }

        this.elements.quizFeedback.classList.remove('hidden');

        // Show next/finish button
        if (this.currentQuizIndex < this.currentQuizQuestions.length - 1) {
            this.elements.btnNextQuiz.classList.remove('hidden');
        } else {
            this.elements.btnFinishQuiz.classList.remove('hidden');
        }

        // Auto-scroll modal to show feedback and next button
        setTimeout(() => {
            this.elements.quizFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    nextQuizQuestion() {
        this.currentQuizIndex++;
        this.showQuizQuestion();
    }

    finishQuiz() {
        this.closeQuizModal();

        // Check total score
        const totalLocations = Object.keys(LOCATIONS_DATA).length;
        const totalPossible = totalLocations * 30; // 3 questions × 10 points × locations

        if (this.visitedLocations.size === totalLocations) {
            this.showCelebration(`Bạn đã hoàn thành chuyến tham quan với ${this.score} điểm!`);

            // Show certificate button
            if (window.certificate) {
                window.certificate.showButton();
                this.showGuideMessage("Bạn đã mở khóa chứng chỉ hoàn thành! Nhấn vào nút 🎓 ở góc trái để nhận!");
            }

            // Check highscore logic
            setTimeout(() => {
                if (window.leaderboard && window.leaderboard.isHighScore(this.score)) {
                    window.leaderboard.showHighscoreModal(this.score);
                }
            }, 5500); // Show after celebration
        }

        this.showGuideMessage(this.getRandomMessage(GUIDE_MESSAGES.encouragement));
    }

    closeQuizModal() {
        this.elements.quizModal.classList.add('hidden');
    }

    // ==================== CELEBRATION ====================

    showCelebration(message) {
        this.elements.celebrationMessage.textContent = message;
        this.elements.celebration.classList.remove('hidden');

        this.createConfetti(50);

        // Auto hide after 5 seconds
        setTimeout(() => {
            this.elements.celebration.classList.add('hidden');
        }, 5000);

        // Click to close
        this.elements.celebration.addEventListener('click', () => {
            this.elements.celebration.classList.add('hidden');
        }, { once: true });
    }

    createConfetti(count) {
        const colors = ['#FF6B35', '#4ECDC4', '#FFE66D', '#9B59B6', '#27AE60'];
        const shapes = ['●', '■', '▲', '★'];

        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('span');
            confetti.className = 'confetti';
            confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.fontSize = `${Math.random() * 15 + 10}px`;
            confetti.style.animationDelay = `${Math.random() * 2}s`;

            this.elements.confetti.appendChild(confetti);

            // Remove after animation
            setTimeout(() => confetti.remove(), 3000);
        }
    }

    // ==================== UTILITIES ====================

    getRandomMessage(messages) {
        if (Array.isArray(messages)) {
            return messages[Math.floor(Math.random() * messages.length)];
        }
        return messages;
    }

    // ==================== FULLSCREEN & ZOOM ====================

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            document.documentElement.requestFullscreen().then(() => {
                this.updateFullscreenButton();
                this.showGuideMessage("Đã bật chế độ toàn màn hình! Nhấn ESC hoặc nút ⛶ để thoát.");
            }).catch(err => {
                console.error('Fullscreen error:', err);
                this.showGuideMessage("Không thể bật chế độ toàn màn hình.");
            });
        } else {
            // Exit fullscreen
            document.exitFullscreen().then(() => {
                this.updateFullscreenButton();
            });
        }
    }

    updateFullscreenButton() {
        if (document.fullscreenElement) {
            this.elements.fullscreenToggle.textContent = '⛶';
            this.elements.fullscreenToggle.classList.add('fullscreen-btn');
            this.elements.fullscreenToggle.title = 'Thoát toàn màn hình';
        } else {
            this.elements.fullscreenToggle.textContent = '⛶';
            this.elements.fullscreenToggle.classList.remove('fullscreen-btn');
            this.elements.fullscreenToggle.title = 'Phóng to toàn màn hình';
        }
    }

    openLightbox() {
        const imgSrc = this.elements.popupImage.src;
        const imgAlt = this.elements.popupImage.alt;

        this.elements.lightboxImage.src = imgSrc;
        this.elements.lightboxImage.alt = imgAlt;
        this.elements.lightboxCaption.textContent = imgAlt;

        this.elements.imageLightbox.classList.remove('hidden');

        this.showGuideMessage("Click vào ảnh hoặc bên ngoài để đóng!");
    }

    closeLightbox() {
        this.elements.imageLightbox.classList.add('hidden');
    }

    // ==================== VIDEO MODAL ====================

    openMainVideo() {
        // Video giới thiệu chung về Đền Hùng
        const videoUrl = 'https://www.youtube.com/embed/90jaw33NDGM?autoplay=1&rel=0&modestbranding=1';

        this.elements.videoFrame.src = videoUrl;
        this.elements.videoModal.classList.remove('hidden');
        this.showGuideMessage("Nhấn ESC hoặc nút X để đóng video!");
    }

    openVideoModal() {
        if (!this.currentVideoLink) return;

        const location = LOCATIONS_DATA[this.currentLocation];
        if (location) {
            this.elements.videoTitle.textContent = `Video: ${location.name}`;
            this.elements.videoDescription.textContent = 'Xem video giới thiệu chi tiết về địa điểm này';
        }

        // Embed the video directly
        const embedUrl = this.currentVideoLink.includes('youtube.com/watch?v=')
            ? this.currentVideoLink.replace('watch?v=', 'embed/') + '?autoplay=1&rel=0&modestbranding=1'
            : this.currentVideoLink; // Fallback for other direct embed links

        this.elements.videoFrame.src = embedUrl;
        this.elements.videoModal.classList.remove('hidden');
        this.showGuideMessage("Nhấn ESC hoặc nút X để đóng video!");
    }

    closeVideoModal() {
        this.elements.videoModal.classList.add('hidden');
        this.elements.videoFrame.src = ''; // Stop the video
    }

    // ==================== VR 360 MODAL ====================

    openVRModal(locationId) {
        const location = LOCATIONS_DATA[locationId];

        // Check for Google Street View embed URL
        if (!location || !location.vrStreetView) {
            this.showGuideMessage("Tinh nang VR 360 dang duoc phat trien! Se som co anh that cua Den Hung!");
            return;
        }

        // Update title
        this.elements.vrTitle.textContent = `VR 360: ${location.name}`;

        // Show modal
        this.elements.vrModal.classList.remove('hidden');

        // Create iframe for Google Street View
        this.elements.panorama.innerHTML = `
            <iframe 
                src="${location.vrStreetView}" 
                width="100%" 
                height="100%" 
                style="border:0; border-radius: 8px;" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade">
            </iframe>
        `;

        this.showGuideMessage("Keo chuot de xoay, cuon chuot de phong to/thu nho!");
    }

    closeVRModal() {
        // Clear the iframe
        this.elements.panorama.innerHTML = '';
        this.elements.vrModal.classList.add('hidden');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new DenHungGallery();
});
