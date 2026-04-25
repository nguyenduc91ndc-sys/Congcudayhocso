import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface DinhDocLap3DProps {
    onBack: () => void;
}

const DinhDocLap3D: React.FC<DinhDocLap3DProps> = ({ onBack }) => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
            {/* Header Bar */}
            <div
                className="flex items-center gap-3 px-4 py-2 z-10 flex-shrink-0"
                style={{
                    background: 'linear-gradient(135deg, rgba(10,5,25,0.95) 0%, rgba(30,10,50,0.95) 100%)',
                    borderBottom: '1px solid rgba(212,175,55,0.25)',
                    backdropFilter: 'blur(10px)',
                }}
            >
                {/* Back Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                        background: 'rgba(212,175,55,0.15)',
                        border: '1px solid rgba(212,175,55,0.4)',
                        color: '#d4af37',
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    <span className="hidden sm:inline">Quay lại</span>
                </motion.button>

                {/* Title */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">🏛️</span>
                    <div className="min-w-0">
                        <h2
                            className="font-bold text-sm sm:text-base truncate"
                            style={{
                                background: 'linear-gradient(90deg, #d4af37, #fffbdc, #d4af37)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Khám phá Dinh Độc Lập 3D
                        </h2>
                        <p className="text-xs text-white/40 hidden sm:block">Trải nghiệm 3D tương tác · Kỷ niệm 30/4</p>
                    </div>
                </div>

                {/* Badge */}
                <span
                    className="flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                        background: 'rgba(212,175,55,0.2)',
                        border: '1px solid rgba(212,175,55,0.4)',
                        color: '#d4af37',
                    }}
                >
                    3D
                </span>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
                    <div className="relative mb-6">
                        {/* Outer ring */}
                        <div
                            className="w-20 h-20 rounded-full animate-spin"
                            style={{ border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#d4af37' }}
                        />
                        {/* Inner content */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl">🏛️</span>
                        </div>
                    </div>
                    <p
                        className="text-base font-semibold mb-1"
                        style={{ color: '#d4af37' }}
                    >
                        Đang tải mô hình 3D...
                    </p>
                    <p className="text-xs text-white/40">Dinh Độc Lập · 30 tháng 4</p>
                </div>
            )}

            {/* iFrame */}
            <iframe
                src="/Đinhoclap3d/index.html"
                title="Dinh Độc Lập 3D"
                className="flex-1 w-full border-0"
                style={{ minHeight: 0 }}
                onLoad={() => setIsLoading(false)}
                allow="autoplay; fullscreen"
            />
        </div>
    );
};

export default DinhDocLap3D;
