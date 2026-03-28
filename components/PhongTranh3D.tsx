import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhongTranh3DProps {
    user: { email: string; name: string } | null;
    onRequireLogin?: () => void;
}

export default function PhongTranh3D({ user, onRequireLogin }: PhongTranh3DProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Bắt buộc đăng nhập nếu có yêu cầu
    if (!user && onRequireLogin) {
        onRequireLogin();
        return null; 
    }

    const galleryUrl = '/phongtranh3dmoi/Ph%C3%B2ng%20tranh%203dmoi.html';

    const handleFullscreen = () => {
        const el = iframeRef.current;
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    const handleReload = () => {
        setIsLoading(true);
        if (iframeRef.current) {
            iframeRef.current.src = galleryUrl;
        }
    };

    const tips = [
        { icon: '🖱️', text: 'Chuột trái + kéo để di chuyển' },
        { icon: '🔍', text: 'Cuộn chuột để zoom' },
        { icon: '🖼️', text: 'Click vào tranh để xem chi tiết' },
        { icon: '📱', text: 'Hỗ trợ cảm ứng trên di động' },
    ];

    return (
        <div
            className="flex flex-col relative"
            style={{ width: '100%', height: '100%', minHeight: '100vh', overflow: 'hidden' }}
        >
            {/* ── HEADER BAR ── */}
            <div
                className="flex-shrink-0 w-full px-4 py-3 flex items-center gap-3 relative z-20"
                style={{
                    background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 40%, #1a1060 100%)',
                    borderBottom: '1px solid rgba(147,51,234,0.3)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
            >
                {/* Logo + Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                        animate={{ rotateY: [0, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{
                            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                            boxShadow: '0 0 16px rgba(124,58,237,0.5)',
                        }}
                    >
                        🖼️
                    </motion.div>
                    <div className="min-w-0">
                        <h1
                            className="font-bold text-base sm:text-lg leading-tight truncate"
                            style={{
                                background: 'linear-gradient(90deg, #e879f9, #a78bfa, #60a5fa)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Phòng Tranh 3D Tùy Chỉnh
                        </h1>
                        <p className="text-xs text-purple-300/70 truncate hidden sm:block">
                            Triển lãm nghệ thuật 3D sống động
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Info toggle */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowInfo(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                            background: showInfo
                                ? 'rgba(139,92,246,0.4)'
                                : 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(139,92,246,0.4)',
                            color: '#c4b5fd',
                        }}
                    >
                        <span>💡</span>
                        <span className="hidden sm:inline">Hướng dẫn</span>
                    </motion.button>

                    {/* Reload */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleReload}
                        title="Tải lại"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#a78bfa',
                        }}
                    >
                        🔄
                    </motion.button>

                    {/* Fullscreen */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleFullscreen}
                        title="Toàn màn hình"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.6), rgba(219,39,119,0.6))',
                            border: '1px solid rgba(167,139,250,0.4)',
                            color: '#f0e6ff',
                            boxShadow: '0 0 12px rgba(124,58,237,0.3)',
                        }}
                    >
                        <span>{isFullscreen ? '🗗' : '⛶'}</span>
                        <span className="hidden sm:inline">
                            {isFullscreen ? 'Thu nhỏ' : 'Mở rộng'}
                        </span>
                    </motion.button>
                </div>
            </div>

            {/* ── TIPS PANEL ── */}
            <AnimatePresence>
                {showInfo && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex-shrink-0 overflow-hidden relative z-20"
                        style={{
                            background: 'linear-gradient(135deg, rgba(30,5,70,0.95), rgba(20,10,60,0.95))',
                            borderBottom: '1px solid rgba(124,58,237,0.25)',
                        }}
                    >
                        <div className="px-4 py-3 flex flex-wrap gap-3">
                            {tips.map((tip, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                                    style={{
                                        background: 'rgba(124,58,237,0.15)',
                                        border: '1px solid rgba(124,58,237,0.25)',
                                        color: '#c4b5fd',
                                    }}
                                >
                                    <span className="text-base">{tip.icon}</span>
                                    <span>{tip.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── GALLERY IFRAME ── */}
            <div className="flex-1 relative w-full h-full bg-black z-10">
                {/* Loading overlay */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
                            style={{
                                background: 'linear-gradient(135deg, #0f0225, #1a0533, #0d1060)',
                            }}
                        >
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    rotate: [0, 5, -5, 0],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-6xl"
                            >
                                🖼️
                            </motion.div>

                            {/* Progress bar */}
                            <div className="w-48 h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <motion.div
                                    animate={{ x: ['-100%', '100%'] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="h-full w-1/2 rounded-full"
                                    style={{
                                        background: 'linear-gradient(90deg, #7c3aed, #db2777, #7c3aed)',
                                    }}
                                />
                            </div>

                            <p
                                className="text-sm font-semibold"
                                style={{
                                    background: 'linear-gradient(90deg, #e879f9, #a78bfa)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Đang tải phòng tranh 3D...
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <iframe
                    ref={iframeRef}
                    src={galleryUrl}
                    onLoad={() => setIsLoading(false)}
                    style={{
                        width: '100%',
                        height: 'calc(100% + 48px)',
                        border: 'none',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                    }}
                    title="Phòng Tranh 3D Tùy Chỉnh - GIAOVIENCN"
                    allowFullScreen
                />
                {/* Che 2 dòng footer bên trong iframe */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '48px',
                    background: '#0a0118',
                    zIndex: 5,
                    pointerEvents: 'none',
                }} />
            </div>
        </div>
    );
}
