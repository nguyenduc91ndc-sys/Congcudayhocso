import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';

interface NewYearWelcomeProps {
    onClose: () => void;
}

interface Star {
    x: number;
    y: number;
    size: number;
    blinkSpeed: number;
    alpha: number;
    color: string;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    decay: number;
    gravity: number;
    color: { r: number; g: number; b: number };
}

interface FireworkType {
    x: number;
    y: number;
    tx: number;
    ty: number;
    vx: number;
    vy: number;
    color: { r: number; g: number; b: number };
    exploded: boolean;
    trail: { x: number; y: number; alpha: number }[];
}

const COLORS = [
    { r: 255, g: 50, b: 50 },
    { r: 255, g: 220, b: 0 },
    { r: 0, g: 230, b: 255 },
    { r: 200, g: 50, b: 255 },
    { r: 80, g: 255, b: 80 },
    { r: 255, g: 100, b: 200 },
];

const NEON_COLORS = ['#FF0055', '#00FFCC', '#FFFF00', '#CC00FF', '#0099FF'];

const MESSAGES = [
    'Tạm biệt 2025...',
    'Những kỷ niệm đẹp...',
    'Những bài học quý giá...',
    'Giờ khắc chuyển giao...',
    'Đã điểm...',
    'CHÚC MỪNG NĂM MỚI',
    '2026',
    'AN KHANG - THỊNH VƯỢNG - VẠN SỰ NHƯ Ý',
];

const NewYearWelcome: React.FC<NewYearWelcomeProps> = ({ onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const bubblesContainerRef = useRef<HTMLDivElement>(null);

    const [isStarted, setIsStarted] = useState(false);
    const [showInstruction, setShowInstruction] = useState(true);
    const [showReplayBtn, setShowReplayBtn] = useState(false);
    const [textState, setTextState] = useState(0);
    const [showTypewriter, setShowTypewriter] = useState(false);
    const [typewriterText, setTypewriterText] = useState('');

    // Refs for animation state
    const starsRef = useRef<Star[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const fireworksRef = useRef<FireworkType[]>([]);
    const textStateRef = useRef(0);
    const textAlphaRef = useRef(0);
    const textFadeInRef = useRef(true);
    const autoFireworkTimerRef = useRef(0);
    const animationIdRef = useRef<number>(0);

    // Firework sounds
    const FIREWORK_WHISTLE = 'https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg';
    const FIREWORK_EXPLOSION_SOUNDS = [
        'https://actions.google.com/sounds/v1/impacts/crash_light.ogg',
        'https://actions.google.com/sounds/v1/impacts/crash.ogg',
    ];

    // Play whistle sound when firework launches
    const playWhistleSound = useCallback(() => {
        const audio = new Audio(FIREWORK_WHISTLE);
        audio.volume = 0.25;
        audio.playbackRate = 1.5; // Speed up for whistle effect
        audio.play().catch(() => { });
    }, []);

    // Play firework explosion sound
    const playExplosionSound = useCallback(() => {
        const soundUrl = FIREWORK_EXPLOSION_SOUNDS[Math.floor(Math.random() * FIREWORK_EXPLOSION_SOUNDS.length)];
        const audio = new Audio(soundUrl);
        audio.volume = 0.3;
        audio.play().catch(() => { });
    }, []);

    // Audio files for each message
    const AUDIO_FILES = [
        '/sounds/newyear/1.tambiet2025.wav',
        '/sounds/newyear/2.nhungkiniemdep.wav',
        '/sounds/newyear/3.nhungbaihocquygia.wav',
        '/sounds/newyear/4.giokhacchuyengiao.wav',
        '/sounds/newyear/5.dadiem.wav',
        '/sounds/newyear/6.chucmungnammoi.wav',
        '/sounds/newyear/7.nam2026.wav',
        '/sounds/newyear/8.ankhangthinhvuong.wav',
    ];

    const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

    // Play audio for message index
    const speak = useCallback((messageIndex: number) => {
        if (messageIndex < 0 || messageIndex >= AUDIO_FILES.length) return;

        // Stop current audio if playing
        if (voiceAudioRef.current) {
            voiceAudioRef.current.pause();
            voiceAudioRef.current.currentTime = 0;
        }

        // Create and play new audio
        const audio = new Audio(AUDIO_FILES[messageIndex]);
        audio.volume = 1;
        voiceAudioRef.current = audio;
        audio.play().catch(() => { });
    }, []);

    // Create bubbles
    useEffect(() => {
        if (!bubblesContainerRef.current) return;

        const container = bubblesContainerRef.current;
        container.innerHTML = '';

        for (let i = 0; i < 20; i++) {
            const bubble = document.createElement('div');
            const size = Math.random() * 40 + 20;
            const randomColor = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
            const duration = Math.random() * 15 + 10;

            bubble.style.cssText = `
        position: absolute;
        bottom: -100px;
        left: ${Math.random() * 100}%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        opacity: 0.6;
        background-color: ${randomColor};
        box-shadow: 0 0 20px ${randomColor}, inset 0 0 10px ${randomColor};
        animation: floatUp ${duration}s linear infinite;
        animation-delay: ${Math.random() * 10}s;
      `;

            container.appendChild(bubble);
        }
    }, []);

    // Create stars
    const createStars = useCallback((w: number, h: number) => {
        starsRef.current = [];
        for (let i = 0; i < 100; i++) {
            const c = COLORS[Math.floor(Math.random() * COLORS.length)];
            starsRef.current.push({
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 2,
                blinkSpeed: 0.01 + Math.random() * 0.03,
                alpha: Math.random(),
                color: `rgb(${c.r}, ${c.g}, ${c.b})`,
            });
        }
    }, []);

    // Create firework
    const createFirework = useCallback((sx: number, sy: number, tx: number, ty: number) => {
        const angle = Math.atan2(ty - sy, tx - sx);
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];

        fireworksRef.current.push({
            x: sx,
            y: sy,
            tx,
            ty,
            vx: Math.cos(angle) * 14,
            vy: Math.sin(angle) * 14,
            color,
            exploded: false,
            trail: [],
        });
    }, []);

    // Create firework with whistle sound
    const createFireworkWithSound = useCallback((sx: number, sy: number, tx: number, ty: number) => {
        playWhistleSound();
        createFirework(sx, sy, tx, ty);
    }, [createFirework, playWhistleSound]);

    // Create explosion particles
    const createExplosion = useCallback((x: number, y: number, color: { r: number; g: number; b: number }) => {
        // Play explosion sound
        playExplosionSound();

        for (let i = 0; i < 90; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 1;
            particlesRef.current.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                decay: Math.random() * 0.015 + 0.01,
                gravity: 0.05,
                color,
            });
        }
    }, [playExplosionSound]);

    // Launch salvo
    const launchSalvo = useCallback(
        (count: number, w: number, h: number) => {
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    createFirework(
                        w / 2 + (Math.random() - 0.5) * (w / 2),
                        h,
                        w / 2 + (Math.random() - 0.5) * (w * 0.8),
                        h / 2 + (Math.random() - 0.5) * (h / 2)
                    );
                }, i * 150);
            }
        },
        [createFirework]
    );

    // Draw 3D text
    const draw3DText = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            text: string,
            x: number,
            y: number,
            size: number,
            fontName: string,
            faceColor: string,
            sideColor: string,
            depth: number,
            alpha: number
        ) => {
            ctx.font = `${size}px ${fontName}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (let i = depth; i > 0; i--) {
                ctx.fillStyle = sideColor;
                const offset = i * (size * 0.004);
                ctx.globalAlpha = alpha * 0.8;
                ctx.fillText(text, x + offset, y + offset);
            }

            ctx.globalAlpha = alpha;
            ctx.shadowColor = sideColor;
            ctx.shadowBlur = 20;
            ctx.fillStyle = faceColor;
            ctx.fillText(text, x, y);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        },
        []
    );

    // Main animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w = (canvas.width = window.innerWidth);
        let h = (canvas.height = window.innerHeight);

        createStars(w, h);

        const handleResize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
            createStars(w, h);
        };

        window.addEventListener('resize', handleResize);

        const loop = () => {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(0, 0, w, h);

            // Draw stars
            starsRef.current.forEach((star) => {
                star.alpha += star.blinkSpeed;
                if (star.alpha > 1 || star.alpha < 0) star.blinkSpeed *= -1;
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = star.color;
                ctx.globalAlpha = Math.abs(star.alpha);
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            });

            // Draw text
            if (isStarted && textStateRef.current < MESSAGES.length) {
                const text = MESSAGES[textStateRef.current];
                let fontSize: number;

                if (text === '2026') {
                    fontSize = Math.min(w, h) * 0.3;
                    draw3DText(
                        ctx,
                        text,
                        w / 2,
                        h / 2,
                        fontSize,
                        "'Cinzel Decorative', serif",
                        `rgba(255, 223, 0, ${textAlphaRef.current})`,
                        `rgba(139, 69, 19, ${textAlphaRef.current})`,
                        15,
                        textAlphaRef.current
                    );
                } else if (text === 'CHÚC MỪNG NĂM MỚI') {
                    fontSize = Math.min(w, h) * 0.1;
                    draw3DText(
                        ctx,
                        text,
                        w / 2,
                        h / 2,
                        fontSize,
                        "'Cinzel Decorative', serif",
                        `rgba(255, 50, 50, ${textAlphaRef.current})`,
                        `rgba(139, 0, 0, ${textAlphaRef.current})`,
                        10,
                        textAlphaRef.current
                    );
                } else if (text === 'AN KHANG - THỊNH VƯỢNG - VẠN SỰ NHƯ Ý') {
                    fontSize = Math.min(w, h) * 0.055;
                    draw3DText(
                        ctx,
                        text,
                        w / 2,
                        h / 2,
                        fontSize,
                        "'Cinzel Decorative', serif",
                        `rgba(255, 215, 0, ${textAlphaRef.current})`,
                        `rgba(184, 134, 11, ${textAlphaRef.current})`,
                        15,
                        textAlphaRef.current
                    );
                } else {
                    fontSize = Math.min(w, h) * 0.08;
                    ctx.font = `${fontSize}px 'Great Vibes', cursive`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = '#00ffff';
                    ctx.shadowBlur = 20;
                    ctx.fillStyle = `rgba(0, 255, 255, ${textAlphaRef.current})`;
                    ctx.fillText(text, w / 2, h / 2);
                    ctx.shadowBlur = 0;
                }

                // Text animation
                if (textFadeInRef.current) {
                    textAlphaRef.current += 0.008;
                    if (textAlphaRef.current >= 1) {
                        textFadeInRef.current = false;
                    }
                } else {
                    textAlphaRef.current -= 0.015;
                    if (textAlphaRef.current <= 0) {
                        textStateRef.current++;
                        setTextState(textStateRef.current);
                        textFadeInRef.current = true;

                        if (textStateRef.current < MESSAGES.length) {
                            speak(textStateRef.current);
                        }

                        if (MESSAGES[textStateRef.current] === '2026') {
                            launchSalvo(10, w, h);
                        }

                        if (textStateRef.current >= MESSAGES.length) {
                            // Start typewriter effect first
                            setShowTypewriter(true);

                            // Full message to type
                            const fullMessage = `🌸 Xuân về đều có mai đào - Mở đầu câu nói lời chào mến thương.\n\nNguyễn Đức xin gửi đến quý thầy cô, bạn bè đồng nghiệp: một năm mới với nhiều thành công trong sự nghiệp trồng người cao quý!!\n\n🎊 Chúc mừng năm mới 2026! 🎊`;

                            let charIndex = 0;
                            const typeInterval = setInterval(() => {
                                if (charIndex <= fullMessage.length) {
                                    setTypewriterText(fullMessage.substring(0, charIndex));
                                    charIndex++;
                                } else {
                                    clearInterval(typeInterval);
                                    // After typewriter done, show image and buttons
                                    setTimeout(() => {
                                        setShowTypewriter(false);
                                        setShowReplayBtn(true);
                                    }, 2000);
                                }
                            }, 50);
                        }
                    }
                }
            }

            // Update and draw fireworks
            for (let i = fireworksRef.current.length - 1; i >= 0; i--) {
                const fw = fireworksRef.current[i];

                fw.x += fw.vx;
                fw.y += fw.vy;
                fw.trail.push({ x: fw.x, y: fw.y, alpha: 1 });
                if (fw.trail.length > 5) fw.trail.shift();
                fw.trail.forEach((t) => (t.alpha -= 0.2));
                fw.vy += 0.05;

                if (fw.y < fw.ty || (fw.vy > 0 && fw.y > fw.ty)) {
                    fw.exploded = true;
                    createExplosion(fw.x, fw.y, fw.color);
                }

                if (!fw.exploded) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    for (const t of fw.trail) {
                        ctx.fillStyle = `rgba(${fw.color.r}, ${fw.color.g}, ${fw.color.b}, ${t.alpha})`;
                        ctx.beginPath();
                        ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.fillStyle = `rgb(${fw.color.r}, ${fw.color.g}, ${fw.color.b})`;
                    ctx.beginPath();
                    ctx.arc(fw.x, fw.y, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else {
                    fireworksRef.current.splice(i, 1);
                }
            }

            // Update and draw particles
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.alpha -= p.decay;

                if (p.alpha > 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else {
                    particlesRef.current.splice(i, 1);
                }
            }

            // Ambient fireworks during text display (subtle, continuous)
            if (isStarted && textStateRef.current < MESSAGES.length) {
                autoFireworkTimerRef.current++;
                // Launch subtle fireworks every ~80 frames (less frequent, quieter)
                if (autoFireworkTimerRef.current > 80) {
                    if (Math.random() < 0.5) {
                        // Use createFirework (no whistle) for subtle effect, explosion sound only
                        createFirework(
                            w * 0.1 + Math.random() * w * 0.8,
                            h,
                            w * 0.15 + Math.random() * w * 0.7,
                            h * 0.15 + Math.random() * h * 0.4
                        );
                    }
                    autoFireworkTimerRef.current = 0;
                }
            }

            // Auto fireworks after messages end
            if (isStarted && textStateRef.current >= MESSAGES.length) {
                autoFireworkTimerRef.current++;
                if (autoFireworkTimerRef.current > 40) {
                    if (Math.random() < 0.6) {
                        createFirework(Math.random() * w, h, Math.random() * w, Math.random() * (h / 2));
                    }
                    autoFireworkTimerRef.current = 0;
                }
            }

            animationIdRef.current = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationIdRef.current);
        };
    }, [isStarted, createStars, createFirework, createExplosion, draw3DText, launchSalvo, speak]);

    // Handle start
    const handleStart = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const w = canvas.width;
            const h = canvas.height;

            let clientX: number, clientY: number;
            if ('touches' in e) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            if (!isStarted) {
                setIsStarted(true);
                setShowInstruction(false);

                if (audioRef.current) {
                    audioRef.current.currentTime = 5; // Skip intro (start from second 5)
                    audioRef.current.volume = 0.5;
                    audioRef.current.play().catch(() => { });
                }

                speak(0);

                // Launch opening firework salvo with whistles
                const launchPositions = [
                    { sx: w * 0.2, tx: w * 0.25, ty: h * 0.3 },
                    { sx: w * 0.35, tx: w * 0.4, ty: h * 0.25 },
                    { sx: w * 0.5, tx: w * 0.5, ty: h * 0.2 },
                    { sx: w * 0.65, tx: w * 0.6, ty: h * 0.25 },
                    { sx: w * 0.8, tx: w * 0.75, ty: h * 0.3 },
                ];

                launchPositions.forEach((pos, index) => {
                    setTimeout(() => {
                        createFireworkWithSound(pos.sx, h, pos.tx, pos.ty);
                    }, index * 200);
                });

                // Second wave after 1 second
                setTimeout(() => {
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                            createFireworkWithSound(
                                w * 0.3 + Math.random() * w * 0.4,
                                h,
                                w * 0.2 + Math.random() * w * 0.6,
                                h * 0.2 + Math.random() * h * 0.3
                            );
                        }, i * 250);
                    }
                }, 1200);
            } else {
                createFireworkWithSound(w / 2, h, clientX, clientY);
            }
        },
        [isStarted, createFireworkWithSound, speak]
    );

    // Handle replay
    const handleReplay = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        textStateRef.current = 0;
        textAlphaRef.current = 0;
        textFadeInRef.current = true;
        setTextState(0);
        setShowReplayBtn(false);
        setShowTypewriter(false);
        setTypewriterText('');

        // Go back to gift box screen
        setIsStarted(false);
        setShowInstruction(true);

        // Stop music
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Stop current voice audio
        if (voiceAudioRef.current) {
            voiceAudioRef.current.pause();
            voiceAudioRef.current.currentTime = 0;
        }
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300]"
            style={{
                background: '#050505',
                fontFamily: "'Quicksand', sans-serif",
                cursor: 'pointer',
                userSelect: 'none',
            }}
            onClick={handleStart}
            onTouchStart={handleStart}
        >
            {/* Audio */}
            <audio ref={audioRef} loop>
                <source src="/sounds/Happy New Year.mp4" type="audio/mp4" />
                <source src="https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg" type="audio/ogg" />
            </audio>

            {/* Bubbles container */}
            <div
                ref={bubblesContainerRef}
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ zIndex: 1 }}
            />

            {/* Canvas for fireworks and stars */}
            <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 2 }} />

            {/* Instruction */}
            {showInstruction && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ zIndex: 10 }}
                >
                    <div className="text-center">
                        {/* Gift icon */}
                        <motion.div
                            className="text-8xl mb-6"
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, -5, 5, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            🎁
                        </motion.div>

                        {/* Title */}
                        <h2
                            className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-500 mb-4"
                            style={{
                                textShadow: '0 0 30px rgba(255, 200, 0, 0.5)',
                                fontFamily: "'Dancing Script', cursive"
                            }}
                        >
                            Bạn có một món quà!
                        </h2>

                        {/* Subtitle */}
                        <p className="text-white/80 text-lg mb-8 flex items-center justify-center gap-3">
                            <span className="text-2xl">🔊</span>
                            Bật loa để trải nghiệm tốt nhất
                            <span className="text-2xl">🎶</span>
                        </p>

                        {/* Start Button */}
                        <motion.button
                            onClick={handleStart}
                            className="px-10 py-4 text-xl font-bold text-white bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 rounded-full border-2 border-white/40 uppercase tracking-wider"
                            style={{
                                boxShadow: '0 0 30px rgba(255, 100, 150, 0.6), 0 0 60px rgba(255, 200, 0, 0.3)',
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            animate={{
                                boxShadow: [
                                    '0 0 30px rgba(255, 100, 150, 0.6), 0 0 60px rgba(255, 200, 0, 0.3)',
                                    '0 0 50px rgba(255, 100, 150, 0.8), 0 0 80px rgba(255, 200, 0, 0.5)',
                                    '0 0 30px rgba(255, 100, 150, 0.6), 0 0 60px rgba(255, 200, 0, 0.3)',
                                ]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            🎉 Mở Quà 🎉
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {/* Typewriter message with flowers */}
            {showTypewriter && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ zIndex: 50 }}
                >
                    {/* Falling flowers container */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute text-2xl md:text-3xl"
                                initial={{
                                    x: `${Math.random() * 100}%`,
                                    y: -50,
                                    rotate: 0,
                                    opacity: 0.8
                                }}
                                animate={{
                                    y: '120vh',
                                    rotate: 360,
                                    opacity: [0.8, 0.6, 0.4, 0]
                                }}
                                transition={{
                                    duration: 8 + Math.random() * 4,
                                    repeat: Infinity,
                                    delay: Math.random() * 5,
                                    ease: "linear"
                                }}
                            >
                                {i % 3 === 0 ? '🌸' : i % 3 === 1 ? '🌼' : '💮'}
                            </motion.div>
                        ))}
                    </div>

                    {/* Typewriter text box */}
                    <div
                        className="relative max-w-2xl mx-4 p-8 rounded-3xl text-center"
                        style={{
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 0 40px rgba(255, 150, 200, 0.3), inset 0 0 30px rgba(255, 200, 150, 0.1)',
                            border: '2px solid rgba(255, 200, 150, 0.3)',
                        }}
                    >
                        {/* Corner decorations */}
                        <span className="absolute top-3 left-3 text-3xl">🌸</span>
                        <span className="absolute top-3 right-3 text-3xl">🌼</span>
                        <span className="absolute bottom-3 left-3 text-3xl">🌼</span>
                        <span className="absolute bottom-3 right-3 text-3xl">🌸</span>

                        <p
                            className="text-lg md:text-xl text-white leading-relaxed whitespace-pre-line"
                            style={{
                                fontFamily: "'Dancing Script', cursive",
                                textShadow: '0 0 10px rgba(255, 200, 150, 0.5)',
                            }}
                        >
                            {typewriterText}
                            <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                            >
                                |
                            </motion.span>
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Action buttons - centered together */}
            {showReplayBtn && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-8"
                    style={{ zIndex: 100 }}
                >
                    {/* New Year celebration image */}
                    <motion.img
                        src="/images/newyear_celebration.png"
                        alt="Chúc mừng năm mới 2026"
                        className="w-80 h-auto md:w-96 lg:w-[28rem] rounded-3xl"
                        style={{
                            boxShadow: '0 0 50px rgba(255, 200, 0, 0.6), 0 0 100px rgba(255, 100, 150, 0.4)',
                        }}
                        animate={{
                            scale: [1, 1.03, 1],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* Buttons container */}
                    <div className="flex items-center gap-5">
                        {/* Replay button */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleReplay();
                            }}
                            className="flex items-center gap-3 px-8 py-3 text-lg font-bold text-white bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full border-2 border-white/40 uppercase tracking-wider"
                            style={{
                                boxShadow: '0 0 25px rgba(255, 200, 0, 0.6), 0 0 50px rgba(255, 100, 0, 0.3)',
                            }}
                        >
                            <motion.span
                                animate={{ rotate: [0, -360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                                <RotateCcw className="w-5 h-5" />
                            </motion.span>
                            <span>Xem Lại</span>
                        </motion.button>

                        {/* Close button */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (voiceAudioRef.current) {
                                    voiceAudioRef.current.pause();
                                    voiceAudioRef.current.currentTime = 0;
                                }
                                onClose();
                            }}
                            className="flex items-center gap-2 px-8 py-3 text-lg font-bold text-white bg-gradient-to-r from-gray-600 to-gray-800 rounded-full border-2 border-white/40 uppercase tracking-wider"
                            style={{
                                boxShadow: '0 0 20px rgba(100, 100, 100, 0.5)',
                            }}
                        >
                            <X size={20} />
                            <span>Đóng</span>
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {/* Close button when replay not shown (top right) */}
            {!showReplayBtn && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (voiceAudioRef.current) {
                            voiceAudioRef.current.pause();
                            voiceAudioRef.current.currentTime = 0;
                        }
                        onClose();
                    }}
                    className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 text-white font-semibold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 border-2 border-white/50 rounded-full transition-all hover:scale-105 z-[101]"
                    style={{
                        boxShadow: '0 0 15px rgba(255, 100, 100, 0.6), 0 4px 15px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    <X size={20} />
                    <span>Đóng</span>
                </button>
            )}

            {/* Global styles for bubble animation */}
            <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateY(-120vh) scale(1.2); opacity: 0; }
        }
      `}</style>
        </motion.div>
    );
};

export default NewYearWelcome;
