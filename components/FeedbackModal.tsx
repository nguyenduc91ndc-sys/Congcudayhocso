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
                        className="fixed inset-x-4 top-[5%] bottom-[5%] sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:max-h-[90vh] z-50 flex flex-col"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden max-h-full">
                            {/* Header - Fixed At Top */}
                            <div className="p-5 pb-3 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                                <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                                    <MessageCircle className="text-pink-500" size={22} />
                                    Gửi phản hồi
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 pt-3 bg-white">
                                {isSuccess ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="py-12 text-center"
                                    >
                                        <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
                                        <p className="text-xl font-bold text-green-600 mb-1">Cảm ơn bạn!</p>
                                        <p className="text-gray-500 text-sm">Phản hồi của bạn đã được gửi thành công</p>
                                    </motion.div>
                                ) : (
                                    <>
                                        {/* User Avatar */}
                                        <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 rounded-2xl border border-purple-100/50">
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-bold text-purple-900 text-sm leading-tight">{user.name}</span>
                                                <span className="text-[10px] text-purple-500 font-medium">Thành viên Ban quản trị</span>
                                            </div>
                                        </div>

                                        {/* Star Rating */}
                                        <div className="mb-4 bg-yellow-50/30 p-3 rounded-2xl border border-yellow-100/50">
                                            <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Đánh giá của bạn:</p>
                                            <div className="flex gap-1 justify-center sm:justify-start">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setRating(star)}
                                                        onMouseEnter={() => setHoveredStar(star)}
                                                        onMouseLeave={() => setHoveredStar(0)}
                                                        className="p-1 transition-transform hover:scale-125"
                                                    >
                                                        <Star
                                                            size={32}
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

                                        {/* 2-Column Inputs */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Họ tên</label>
                                                <input
                                                    type="text"
                                                    value={teacherName}
                                                    onChange={(e) => setTeacherName(e.target.value)}
                                                    placeholder="Họ và tên bạn"
                                                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-purple-500 focus:bg-white focus:outline-none text-sm transition-all shadow-sm"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Đơn vị</label>
                                                <input
                                                    type="text"
                                                    value={schoolName}
                                                    onChange={(e) => setSchoolName(e.target.value)}
                                                    onFocus={() => setShowSchoolHint(true)}
                                                    onBlur={() => setShowSchoolHint(false)}
                                                    placeholder="Cơ quan, địa chỉ..."
                                                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-purple-500 focus:bg-white focus:outline-none text-sm transition-all shadow-sm"
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
                                                    <p className="text-[11px] text-purple-600 italic mb-4 px-2 bg-purple-50 p-2 rounded-lg border border-purple-100">
                                                        💜 Nhờ thầy cô ghi dùm địa chỉ để minh chứng tính chân thật cho trang, ngoài ra không có mục đích gì khác. Xin cảm ơn thầy cô ạ!
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Message */}
                                        <div className="mb-4">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase px-1 mb-1 block">Nội dung nhận xét</label>
                                            <textarea
                                                value={message}
                                                onChange={(e) => {
                                                    setMessage(e.target.value);
                                                    setError('');
                                                }}
                                                placeholder="Viết nhận xét của bạn vào đây..."
                                                rows={3}
                                                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-purple-500 focus:bg-white focus:outline-none resize-none text-sm transition-all shadow-sm min-h-[100px]"
                                            />
                                        </div>

                                        {error && (
                                            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                {error}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Footer - Fixed At Bottom */}
                            {!isSuccess && (
                                <div className="p-5 pt-3 border-t border-gray-100 bg-gray-50/50">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!message.trim() || !teacherName.trim() || !schoolName.trim() || isSubmitting}
                                        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${message.trim() && teacherName.trim() && schoolName.trim() && !isSubmitting
                                                ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white hover:shadow-purple-200 hover:shadow-xl'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Gửi phản hồi ngay
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-center text-gray-400 mt-3">
                                        Chúng tôi trân trọng mọi góp ý của bạn!
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
