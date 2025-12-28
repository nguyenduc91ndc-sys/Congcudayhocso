import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, MessageCircle, Zap, Heart, ExternalLink, Eye } from 'lucide-react';
import { getApprovedFeedbacks, Feedback } from '../utils/feedbackUtils';
import { getVisitStats } from '../utils/visitCounter';

const Footer: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [visitCount, setVisitCount] = useState(0);

    useEffect(() => {
        loadFeedbacks();
        loadVisitCount();
        const interval = setInterval(loadFeedbacks, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadVisitCount = async () => {
        const stats = await getVisitStats();
        setVisitCount(stats.totalVisits);
    };

    const loadFeedbacks = async () => {
        setIsLoading(true);
        const approved = await getApprovedFeedbacks();
        setFeedbacks(approved);
        setIsLoading(false);
    };

    const nextFeedback = () => {
        setCurrentIndex((prev) => (prev + 1) % feedbacks.length);
    };

    const prevFeedback = () => {
        setCurrentIndex((prev) => (prev - 1 + feedbacks.length) % feedbacks.length);
    };

    useEffect(() => {
        if (feedbacks.length <= 1) return;
        const timer = setInterval(nextFeedback, 5000);
        return () => clearInterval(timer);
    }, [feedbacks.length]);

    const currentFeedback = feedbacks[currentIndex];

    const socialLinks = [
        {
            name: 'Zalo',
            href: 'https://zalo.me/g/kvfmke936',
            bgColor: 'from-blue-500 to-blue-600',
            hoverColor: 'hover:shadow-blue-500/50',
            icon: (
                <svg viewBox="0 0 48 48" className="w-5 h-5 fill-current">
                    <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm8.5 25.5c-.4.8-2.1 1.6-2.9 1.7-.8.1-1.5.4-5.1-1.1s-5.9-5.1-6.1-5.3c-.2-.3-1.5-2-1.5-3.8s1-2.8 1.3-3.2c.4-.4.8-.5 1.1-.5.3 0 .6 0 .8.016.3.015.6-.1.9.7.3.8 1.1 2.8 1.2 3 .1.2.2.4.04.7-.1.3-.2.4-.4.6-.2.2-.4.5-.6.7-.2.2-.4.4-.2.8.2.4 1.1 1.8 2.3 2.9 1.6 1.4 2.9 1.8 3.3 2 .4.2.7.2.9-.1.3-.3 1.1-1.3 1.4-1.7.3-.4.6-.4.9-.2.4.1 2.3 1.1 2.6 1.3.4.2.6.3.7.5.1.2.1 1.1-.3 1.9z" />
                </svg>
            )
        },
        {
            name: 'Facebook',
            href: 'https://www.facebook.com/share/g/1BtnwVgAfX/?mibextid=wwXIfr',
            bgColor: 'from-[#1877F2] to-[#0d65d9]',
            hoverColor: 'hover:shadow-blue-600/50',
            icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            )
        },
        {
            name: 'TikTok',
            href: 'https://www.tiktok.com/@gio.vin.yu.cng.ngh?_r=1&_t=ZS-92WQKoFdars',
            bgColor: 'from-gray-900 to-black',
            hoverColor: 'hover:shadow-gray-500/50',
            icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                </svg>
            )
        }
    ];

    return (
        <footer className="relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                {/* Floating particles */}
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white/20 rounded-full"
                        initial={{
                            x: Math.random() * 100 + '%',
                            y: Math.random() * 100 + '%',
                        }}
                        animate={{
                            y: [null, '-20%'],
                            opacity: [0.2, 0.5, 0.2],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
                {/* Feedback Carousel */}
                {feedbacks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Heart size={16} className="text-pink-400" fill="currentColor" />
                            <span className="text-sm font-medium text-purple-300">Cảm nhận từ người dùng</span>
                        </div>

                        <div className="relative max-w-xl mx-auto">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                                <AnimatePresence mode="wait">
                                    {currentFeedback && (
                                        <motion.div
                                            key={currentIndex}
                                            initial={{ opacity: 0, x: 30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -30 }}
                                            className="text-center"
                                        >
                                            <div className="flex items-center justify-center gap-3 mb-3">
                                                <img
                                                    src={currentFeedback.userAvatar}
                                                    alt={currentFeedback.userName}
                                                    className="w-12 h-12 rounded-full border-2 border-purple-400/50 object-cover"
                                                />
                                                <div className="text-left">
                                                    <p className="font-semibold text-white">{currentFeedback.userName}</p>
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                size={14}
                                                                fill={currentFeedback.rating >= star ? '#fbbf24' : 'none'}
                                                                className={currentFeedback.rating >= star ? 'text-yellow-400' : 'text-white/20'}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-white/80 italic text-sm leading-relaxed">"{currentFeedback.message}"</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {feedbacks.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevFeedback}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                        >
                                            <ChevronLeft size={18} className="text-white" />
                                        </button>
                                        <button
                                            onClick={nextFeedback}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                        >
                                            <ChevronRight size={18} className="text-white" />
                                        </button>
                                    </>
                                )}
                            </div>

                            {feedbacks.length > 1 && (
                                <div className="flex justify-center gap-1.5 mt-4">
                                    {feedbacks.slice(0, 5).map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-purple-400 w-6' : 'bg-white/30 w-1.5 hover:bg-white/50'
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6" />

                {/* Main Footer Content */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Brand */}
                    <motion.div
                        className="flex items-center gap-4"
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <Zap size={24} className="text-white" />
                            </div>
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl"
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Giáo viên yêu công nghệ</h3>
                            <p className="text-purple-300 text-sm">Đức Nguyễn</p>
                        </div>
                    </motion.div>

                    {/* Social Links */}
                    <div className="flex items-center gap-3">
                        {socialLinks.map((link) => (
                            <motion.a
                                key={link.name}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${link.bgColor} text-white rounded-xl font-semibold text-sm shadow-lg ${link.hoverColor} hover:shadow-xl transition-all`}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {link.icon}
                                <span className="hidden sm:inline">{link.name}</span>
                            </motion.a>
                        ))}
                    </div>

                    {/* Visit Count & Copyright */}
                    <div className="flex flex-col items-center md:items-end gap-2">
                        {visitCount > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                                <Eye size={14} className="text-emerald-400" />
                                <span className="text-sm font-semibold text-white">{visitCount.toLocaleString('vi-VN')}</span>
                                <span className="text-xs text-purple-300/70">lượt truy cập</span>
                            </div>
                        )}
                        <p className="text-sm text-purple-300/70">
                            © 2025 Đức Nguyễn. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
