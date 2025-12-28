import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Monitor, Globe, X, AlertTriangle, Chrome } from 'lucide-react';

interface ZaloBrowserWarningProps {
    onClose?: () => void;
}

// Detect if user is using Zalo in-app browser on mobile
const isZaloBrowser = (): boolean => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('zalo') || ua.includes('zaloclient');
};

const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const ZaloBrowserWarning: React.FC<ZaloBrowserWarningProps> = ({ onClose }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Check if user is on mobile Zalo browser
        if (isMobile() && isZaloBrowser()) {
            setShow(true);
        }
    }, []);

    const handleClose = () => {
        setShow(false);
        onClose?.();
    };

    const handleOpenInBrowser = () => {
        // Try to open current URL in external browser
        const url = window.location.href;

        // For Android, try to use intent
        if (/android/i.test(navigator.userAgent)) {
            window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
        } else {
            // For iOS, just show instructions
            alert('Vui lòng copy link và mở bằng Safari hoặc Chrome:\n' + url);
        }
    };

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
                >
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Globe size={32} className="text-blue-500" />
                        </div>

                        <h2 className="text-xl font-bold text-gray-800 mb-2">Mở bằng trình duyệt</h2>
                        <p className="text-gray-600 text-sm mb-6">
                            Đăng nhập Google sẽ bị lỗi trên Zalo. Vui lòng mở trình duyệt để đăng nhập.
                        </p>

                        <div className="space-y-3">
                            {/* Computer Recommendation - Highlighted but compact */}
                            <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl text-left">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                    <Monitor size={20} className="text-purple-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-purple-800 text-sm">Khuyên dùng Máy tính</p>
                                    <p className="text-xs text-purple-600">Để sử dụng đầy đủ công cụ dạy học</p>
                                </div>
                            </div>

                            {/* Main Action */}
                            <button
                                onClick={handleOpenInBrowser}
                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Chrome size={20} />
                                Mở trình duyệt ngay
                            </button>

                            {/* Dismiss */}
                            <button
                                onClick={handleClose}
                                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
                            >
                                Tiếp tục dùng Zalo (Có thể lỗi)
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ZaloBrowserWarning;
