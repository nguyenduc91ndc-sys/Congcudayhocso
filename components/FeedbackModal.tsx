import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Star, Send, CheckCircle } from 'lucide-react';
import { submitFeedback } from '../utils/feedbackUtils';
import { User } from '../types';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, user }) => {
    const [rating, setRating] = useState(5);
    const [teacherName, setTeacherName] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [hoveredStar, setHoveredStar] = useState(0);
    const [showSchoolHint, setShowSchoolHint] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim() || !teacherName.trim() || !schoolName.trim()) return;

        setIsSubmitting(true);
        const success = await submitFeedback(
            user.id,
            user.name,
            user.avatar,
            teacherName.trim(),
            schoolName.trim(),
            message.trim(),
            rating
        );

        setIsSubmitting(false);

        if (success) {
            setIsSuccess(true);
            setError('');
            setTimeout(() => {
                setIsSuccess(false);
                setMessage('');
                setTeacherName('');
                setSchoolName('');
                setRating(5);
                onClose();
            }, 2000);
        } else {
            setError('Không thể gửi phản hồi. Vui lòng kiểm tra lại kết nối hoặc quyền truy cập Database.');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-x-2 top-[2%] bottom-[2%] sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:max-h-[82vh] z-50 flex flex-col"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden max-h-full">
                            {/* Header - Fixed At Top */}
                            <div className="p-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                                <h3 className="text-base font-bold text-purple-800 flex items-center gap-2">
                                    <MessageCircle className="text-pink-500" size={20} />
                                    Gửi phản hồi
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 pt-3 bg-white custom-scrollbar">
                                {isSuccess ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="py-10 text-center"
                                    >
                                        <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
                                        <p className="text-lg font-bold text-green-600 mb-1">Cảm ơn bạn!</p>
                                        <p className="text-gray-500 text-xs">Phản hồi đã được gửi thành công</p>
                                    </motion.div>
                                ) : (
                                    <>
                                        {/* User Info & Rating (Compact Row) */}
                                        <div className="flex flex-col sm:flex-row gap-3 mb-3">
                                            <div className="flex-1 flex items-center gap-2 p-2 bg-purple-50 rounded-xl border border-purple-100/50">
                                                <img
                                                    src={user.avatar}
                                                    alt={user.name}
                                                    className="w-8 h-8 rounded-full border border-white shadow-sm"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-purple-900 text-[11px] leading-tight">{user.name}</span>
                                                    <span className="text-[9px] text-purple-500 font-medium">Thành viên</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 flex flex-col justify-center bg-yellow-50/30 p-2 rounded-xl border border-yellow-100/50">
                                                <div className="flex gap-0.5 justify-center">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            onClick={() => setRating(star)}
                                                            onMouseEnter={() => setHoveredStar(star)}
                                                            onMouseLeave={() => setHoveredStar(0)}
                                                            className="p-0.5 transition-transform hover:scale-110"
                                                        >
                                                            <Star
                                                                size={22}
                                                                fill={(hoveredStar || rating) >= star ? '#fbbf24' : 'none'}
                                                                className={`transition-colors ${(hoveredStar || rating) >= star
                                                                    ? 'text-yellow-400'
                                                                    : 'text-gray-200'
                                                                    }`}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2-Column Inputs */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase px-1">Họ tên</label>
                                                <input
                                                    type="text"
                                                    value={teacherName}
                                                    onChange={(e) => setTeacherName(e.target.value)}
                                                    placeholder="Họ và tên bạn"
                                                    className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg focus:border-purple-500 focus:bg-white focus:outline-none text-xs transition-all shadow-sm"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase px-1">Đơn vị</label>
                                                <input
                                                    type="text"
                                                    value={schoolName}
                                                    onChange={(e) => setSchoolName(e.target.value)}
                                                    onFocus={() => setShowSchoolHint(true)}
                                                    onBlur={() => setShowSchoolHint(false)}
                                                    placeholder="Địa chỉ..."
                                                    className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg focus:border-purple-500 focus:bg-white focus:outline-none text-xs transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {showSchoolHint && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <p className="text-[10px] text-purple-600 italic mb-2 px-2 bg-purple-50 p-2 rounded-lg border border-purple-100">
                                                        💜 Nhờ thầy cô ghi địa chỉ để minh chứng tính chân thật. Xin cảm ơn!
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Message */}
                                        <div className="mb-2">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase px-1 mb-1 block">Nội dung nhận xét</label>
                                            <textarea
                                                value={message}
                                                onChange={(e) => {
                                                    setMessage(e.target.value);
                                                    setError('');
                                                }}
                                                placeholder="..."
                                                rows={3}
                                                className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-xl focus:border-purple-500 focus:bg-white focus:outline-none resize-none text-xs transition-all shadow-sm min-h-[70px]"
                                            />
                                        </div>

                                        {error && (
                                            <div className="mb-2 p-2 bg-red-50 border border-red-100 text-red-600 rounded-lg text-[10px] font-semibold flex items-center gap-2">
                                                {error}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Footer - Fixed At Bottom */}
                            {!isSuccess && (
                                <div className="p-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!message.trim() || !teacherName.trim() || !schoolName.trim() || isSubmitting}
                                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow active:scale-[0.98] ${message.trim() && teacherName.trim() && schoolName.trim() && !isSubmitting
                                                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-lg'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                Gửi ngay
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[9px] text-center text-gray-400 mt-2">
                                        Cảm ơn ý kiến của bạn!
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default FeedbackModal;
