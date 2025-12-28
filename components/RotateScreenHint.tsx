import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, X } from 'lucide-react';

interface RotateScreenHintProps {
    onDismiss?: () => void;
}

const RotateScreenHint: React.FC<RotateScreenHintProps> = ({ onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Kiểm tra xem có phải thiết bị mobile không
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor;
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
            const isSmallScreen = window.innerWidth <= 768;
            return isMobileDevice || isSmallScreen;
        };

        // Kiểm tra hướng màn hình
        const checkOrientation = () => {
            const portrait = window.innerHeight > window.innerWidth;
            setIsPortrait(portrait);
            setIsMobile(checkMobile());
        };

        // Kiểm tra lần đầu
        checkOrientation();

        // Hiển thị sau 1 giây nếu đang ở chế độ portrait trên mobile
        const timer = setTimeout(() => {
            if (checkMobile() && window.innerHeight > window.innerWidth && !dismissed) {
                setIsVisible(true);
            }
        }, 1000);

        // Lắng nghe sự kiện thay đổi hướng màn hình
        const handleResize = () => {
            checkOrientation();
            // Tự động ẩn khi chuyển sang landscape
            if (window.innerWidth > window.innerHeight) {
                setIsVisible(false);
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [dismissed]);

    const handleDismiss = () => {
        setIsVisible(false);
        setDismissed(true);
        onDismiss?.();
    };

    // Chỉ hiển thị trên mobile khi ở chế độ dọc
    if (!isMobile || !isPortrait || dismissed) {
        return null;
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-4 left-4 right-4 z-[100] pointer-events-auto"
                >
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 shadow-2xl border-2 border-white/30 backdrop-blur-sm">
                        {/* Nút đóng */}
                        <button
                            onClick={handleDismiss}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-4">
                            {/* Icon điện thoại xoay */}
                            <div className="flex-shrink-0">
                                <motion.div
                                    animate={{
                                        rotate: [0, 0, -90, -90, 0],
                                    }}
                                    transition={{
                                        duration: 2.5,
                                        repeat: Infinity,
                                        repeatDelay: 1,
                                        times: [0, 0.2, 0.5, 0.8, 1],
                                    }}
                                    className="relative"
                                >
                                    <div className="w-12 h-16 bg-white/20 rounded-lg border-2 border-white flex items-center justify-center">
                                        <Smartphone size={24} className="text-white" />
                                    </div>
                                    {/* Mũi tên xoay */}
                                    <motion.div
                                        className="absolute -right-3 top-1/2 -translate-y-1/2"
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            className="text-white"
                                        >
                                            <path
                                                d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                    </motion.div>
                                </motion.div>
                            </div>

                            {/* Nội dung */}
                            <div className="flex-1 text-white">
                                <p className="font-bold text-sm sm:text-base leading-tight">
                                    📱 Xoay ngang điện thoại
                                </p>
                                <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                                    Để xem video và trả lời câu hỏi dễ dàng hơn
                                </p>
                            </div>
                        </div>

                        {/* Nút CTA */}
                        <button
                            onClick={handleDismiss}
                            className="w-full mt-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white text-sm font-medium transition-colors"
                        >
                            Đã hiểu, tiếp tục xem
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RotateScreenHint;
