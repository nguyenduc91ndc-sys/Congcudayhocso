import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, MessageCircle, Quote } from 'lucide-react';
import { getApprovedFeedbacks, Feedback } from '../utils/feedbackUtils';

const FeedbackDisplay: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadFeedbacks();
    }, []);

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

    // Auto-rotate every 5 seconds
    useEffect(() => {
        if (feedbacks.length <= 1) return;

        const timer = setInterval(nextFeedback, 5000);
        return () => clearInterval(timer);
    }, [feedbacks.length]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (feedbacks.length === 0) {
        return null; // Không hiển thị gì nếu chưa có feedback
    }

    const currentFeedback = feedbacks[currentIndex];

    return (
        <div className="w-full max-w-md mx-auto mt-8">
            <h3 className="text-center text-lg font-bold text-purple-800 mb-4 flex items-center justify-center gap-2">
                <MessageCircle size={20} className="text-pink-500" />
                Nhận xét từ người dùng
            </h3>

            <div className="relative bg-white/60 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-purple-100">
                {/* Quote Icon */}
                <Quote size={32} className="absolute top-4 left-4 text-purple-200" />

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="text-center"
                    >
                        {/* Avatar */}
                        <img
                            src={currentFeedback.userAvatar}
                            alt={currentFeedback.userName}
                            className="w-16 h-16 rounded-full mx-auto mb-3 border-4 border-white shadow-md object-cover"
                        />

                        {/* Name */}
                        <p className="font-bold text-purple-800">{currentFeedback.userName}</p>

                        {/* Stars */}
                        <div className="flex justify-center gap-0.5 my-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    size={18}
                                    fill={currentFeedback.rating >= star ? '#fbbf24' : 'none'}
                                    className={currentFeedback.rating >= star ? 'text-yellow-400' : 'text-gray-300'}
                                />
                            ))}
                        </div>

                        {/* Message */}
                        <p className="text-gray-700 italic mt-3 leading-relaxed">
                            "{currentFeedback.message}"
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                {feedbacks.length > 1 && (
                    <>
                        <button
                            onClick={prevFeedback}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow transition-colors"
                        >
                            <ChevronLeft size={20} className="text-purple-600" />
                        </button>
                        <button
                            onClick={nextFeedback}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow transition-colors"
                        >
                            <ChevronRight size={20} className="text-purple-600" />
                        </button>

                        {/* Dots indicator */}
                        <div className="flex justify-center gap-2 mt-4">
                            {feedbacks.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex
                                            ? 'bg-purple-600 w-6'
                                            : 'bg-purple-300 hover:bg-purple-400'
                                        }`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FeedbackDisplay;
