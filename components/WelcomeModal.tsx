import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Coffee, Sparkles } from 'lucide-react';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, userName }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="relative w-full max-w-md bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative elements */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl" />
                            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
                            <Sparkles className="absolute top-4 left-4 w-6 h-6 text-yellow-400/50 animate-pulse" />
                            <Sparkles className="absolute top-8 right-12 w-4 h-4 text-pink-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            <Sparkles className="absolute bottom-20 right-4 w-5 h-5 text-cyan-400/50 animate-pulse" style={{ animationDelay: '1s' }} />
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                        >
                            <X size={24} />
                        </button>

                        {/* Content */}
                        <div className="relative z-10 p-6 pt-8 text-center">
                            {/* Header with icons */}
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <Coffee className="w-8 h-8 text-amber-400" />
                                <Heart className="w-6 h-6 text-pink-500 animate-pulse" />
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl font-bold text-white mb-4">
                                Mời ly cà phê ☕
                            </h2>

                            {/* Message */}
                            <p className="text-white/90 text-sm leading-relaxed mb-6 px-2">
                                Chào mừng thầy cô đến với web app các công cụ dạy học của <span className="text-cyan-300 font-semibold">Giáo viên yêu công nghệ</span>!!
                                <br /><br />
                                Trang hoàn toàn <span className="text-green-400 font-bold">miễn phí</span>, thầy cô thấy hay và có ích thì mời em <span className="text-amber-400 font-semibold">ly cà phê</span> để em có động lực chia sẻ nhé!
                                <br /><br />
                                <span className="text-pink-300 italic">Tuỳ tâm, vui vẻ! Cảm ơn thầy cô!! 💖</span>
                            </p>

                            {/* QR Code */}
                            <div className="bg-white rounded-2xl p-3 mx-auto w-fit shadow-xl mb-4">
                                <img
                                    src="/qr-donate.png"
                                    alt="QR Code Donate"
                                    className="w-44 h-auto mx-auto rounded-lg"
                                />
                            </div>

                            {/* Bank info */}
                            <div className="text-white/70 text-xs mb-6">
                                <p className="font-semibold text-white/90">NGUYEN THE DUC</p>
                                <p>STK: 6701386512 - BIDV</p>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all active:scale-95"
                            >
                                Đóng
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WelcomeModal;
