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
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [hoveredStar, setHoveredStar] = useState(0);

    const handleSubmit = async () => {
        if (!message.trim()) return;

        setIsSubmitting(true);
        const success = await submitFeedback(
            user.id,
            user.name,
            user.avatar,
            message.trim(),
            rating
        );

        setIsSubmitting(false);

        if (success) {
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setMessage('');
                setRating(5);
                onClose();
            }, 2000);
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
                        className="fixed inset-x-4 top-20 sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md z-50"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl p-5 border border-purple-100">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
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

                            {isSuccess ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="py-8 text-center"
                                >
                                    <CheckCircle size={56} className="mx-auto text-green-500 mb-3" />
                                    <p className="text-lg font-bold text-green-600">Cảm ơn bạn!</p>
                                    <p className="text-gray-500 text-sm">Phản hồi đang chờ duyệt</p>
                                </motion.div>
                            ) : (
                                <>
                                    {/* User Avatar */}
                                    <div className="flex items-center gap-3 mb-3 p-2 bg-purple-50 rounded-xl">
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="w-9 h-9 rounded-full border-2 border-purple-200"
                                        />
                                        <span className="font-semibold text-purple-800 text-sm">{user.name}</span>
                                    </div>

                                    {/* Star Rating */}
                                    <div className="mb-3">
                                        <p className="text-xs text-gray-600 mb-1">Đánh giá của bạn:</p>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setRating(star)}
                                                    onMouseEnter={() => setHoveredStar(star)}
                                                    onMouseLeave={() => setHoveredStar(0)}
                                                    className="p-0.5 transition-transform hover:scale-110"
                                                >
                                                    <Star
                                                        size={28}
                                                        fill={(hoveredStar || rating) >= star ? '#fbbf24' : 'none'}
                                                        className={`transition-colors ${(hoveredStar || rating) >= star
                                                            ? 'text-yellow-400'
                                                            : 'text-gray-300'
                                                            }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Message */}
                                    <div className="mb-3">
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Viết nhận xét của bạn..."
                                            rows={2}
                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none resize-none text-sm"
                                        />
                                    </div>

                                    {/* Submit Button - LUÔN HIỆN RÕ */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!message.trim() || isSubmitting}
                                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-base ${message.trim() && !isSubmitting
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:shadow-lg active:scale-[0.98]'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Gửi phản hồi
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default FeedbackModal;
