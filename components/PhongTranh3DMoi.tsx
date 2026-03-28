import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhongTranh3DMoiProps {
    onBack: () => void;
}

export default function PhongTranh3DMoi({ onBack }: PhongTranh3DMoiProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const galleryUrl = '/phongtranh3dmoi/Ph%C3%B2ng%20tranh%203dmoi.html';

    const handleFullscreen = () => {
        const el = containerRef.current;
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
        <div ref={containerRef} className="flex flex-col min-h-screen relative"
            style={{ background: 'linear-gradient(135deg, #0f0225, #1a0533, #0d1060)' }}>

            {/* ── HEADER ── */}
            <div className="flex-shrink-0 w-full px-4 py-3 flex items-center gap-3"
                style={{
                    background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 40%, #1a1060 100%)',
                    borderBottom: '1px solid rgba(147,51,234,0.3)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}>

                {/* Back button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#c4b5fd',
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6" /></svg>
                    <span className="hidden sm:inline">Quay lại</span>
                </motion.button>

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
                        <h1 className="font-bold text-base sm:text-lg leading-tight truncate"
                            style={{
                                background: 'linear-gradient(90deg, #e879f9, #a78bfa, #60a5fa)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                            Phòng Tranh 3D Tùy Chỉnh
                        </h1>
                        <p className="text-xs text-purple-300/70 truncate hidden sm:block">
                            Triển lãm nghệ thuật 3D sống động
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setShowInfo(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                            background: showInfo ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(139,92,246,0.4)',
                            color: '#c4b5fd',
                        }}>
                        <span>💡</span>
                        <span className="hidden sm:inline">Hướng dẫn</span>
                    </motion.button>

                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleReload} title="Tải lại"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#a78bfa' }}>
                        🔄
                    </motion.button>

                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleFullscreen} title="Toàn màn hình"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.6), rgba(219,39,119,0.6))',
                            border: '1px solid rgba(167,139,250,0.4)',
                            color: '#f0e6ff',
                            boxShadow: '0 0 12px rgba(124,58,237,0.3)',
                        }}>
                        <span>{isFullscreen ? '🗗' : '⛶'}</span>
                        <span className="hidden sm:inline">{isFullscreen ? 'Thu nhỏ' : 'Mở rộng'}</span>
                    </motion.button>
                </div>
            </div>

            {/* ── TIPS ── */}
            <AnimatePresence>
                {showInfo && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                        className="flex-shrink-0 overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, rgba(30,5,70,0.95), rgba(20,10,60,0.95))', borderBottom: '1px solid rgba(124,58,237,0.25)' }}>
                        <div className="px-4 py-3 flex flex-wrap gap-3">
                            {tips.map((tip, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                                    style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }}>
                                    <span className="text-base">{tip.icon}</span>
                                    <span>{tip.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── IFRAME ── */}
            <div className="flex-1 relative" style={{ minHeight: '500px' }}>
                <AnimatePresence>
                    {isLoading && (
                        <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
                            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
                            style={{ background: 'linear-gradient(135deg, #0f0225, #1a0533, #0d1060)' }}>
                            <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity }} className="text-6xl">🖼️</motion.div>
                            <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <motion.div animate={{ x: ['-100%', '100%'] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="h-full w-1/2 rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #7c3aed, #db2777, #7c3aed)' }} />
                            </div>
                            <p className="text-sm font-semibold"
                                style={{ background: 'linear-gradient(90deg, #e879f9, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Đang tải phòng tranh 3D...
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <iframe ref={iframeRef} src={galleryUrl} onLoad={() => setIsLoading(false)}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: '500px', position: 'absolute', top: 0, left: 0 }}
                    title="Phòng Tranh 3D Tùy Chỉnh" allowFullScreen />
            </div>

            {/* ── FOOTER ── */}
            <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #1a0533 0%, #1a1060 100%)', borderTop: '1px solid rgba(124,58,237,0.2)' }}>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />
                    Phòng tranh ảo 3D
                </span>
                <span className="text-xs text-purple-400/40">GIAOVIENCN © 2025</span>
            </div>
        </div>
    );
}
