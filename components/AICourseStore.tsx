import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, GraduationCap, Loader2, Play, X, ExternalLink, Settings } from 'lucide-react';
import AICourseCard from './AICourseCard';
import { AICourse } from '../types/aiCourseTypes';
import { subscribeToCourses } from '../utils/firebaseAICourseStore';

interface AICourseStoreProps {
    onBack: () => void;
    isAdmin?: boolean;
    onAdmin?: () => void;
}

const AICourseStore: React.FC<AICourseStoreProps> = ({ onBack, isAdmin, onAdmin }) => {
    const [courses, setCourses] = useState<AICourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<AICourse | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Load courses realtime
    useEffect(() => {
        const unsubscribe = subscribeToCourses((fetchedCourses) => {
            setCourses(fetchedCourses);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Xem demo video
    const handlePreview = (course: AICourse) => {
        setSelectedCourse(course);
        setShowPreview(true);
    };

    // Đăng ký khóa học
    const handleRegister = (course: AICourse) => {
        if (course.registerUrl) {
            window.open(course.registerUrl, '_blank');
        } else {
            // Mở Zalo để liên hệ đăng ký
            window.open('https://zalo.me/0975509490', '_blank');
        }
    };

    // Lấy YouTube embed URL
    const getYouTubeEmbedUrl = (url: string) => {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        const videoId = (match && match[7].length === 11) ? match[7] : null;
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : '';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    {/* Back button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        <ArrowLeft size={20} />
                        <span className="hidden sm:inline">Quay lại</span>
                    </motion.button>

                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <GraduationCap size={24} className="text-purple-600" />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            Khóa học AI
                        </h1>
                    </div>

                    {/* Admin button */}
                    {isAdmin && onAdmin ? (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onAdmin}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-xl shadow-lg"
                        >
                            <Settings size={18} />
                            <span className="hidden sm:inline">Quản lý</span>
                        </motion.button>
                    ) : (
                        <div className="w-20"></div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Page Title */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        🤖 Khóa học AI cho Giáo viên
                    </h2>
                    <p className="text-gray-500">
                        Nâng cao kỹ năng với các khóa học AI chất lượng
                    </p>
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                        <p className="text-gray-500">Đang tải danh sách khóa học...</p>
                    </div>
                ) : courses.length === 0 ? (
                    /* Empty state */
                    <div className="text-center py-20">
                        <GraduationCap size={64} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-500 mb-2">
                            Chưa có khóa học nào
                        </h3>
                        <p className="text-gray-400 mb-6">
                            Các khóa học AI sẽ sớm được cập nhật. Hãy quay lại sau nhé!
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.open('https://zalo.me/0975509490', '_blank')}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                        >
                            Liên hệ tư vấn
                        </motion.button>
                    </div>
                ) : (
                    /* Course Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {courses.map((course, index) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <AICourseCard
                                    course={course}
                                    onPreview={handlePreview}
                                    onRegister={handleRegister}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Video Preview Modal */}
            <AnimatePresence>
                {showPreview && selectedCourse && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowPreview(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="font-bold text-gray-800 truncate pr-4">{selectedCourse.title}</h3>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Video */}
                            <div className="aspect-video bg-black">
                                <iframe
                                    src={getYouTubeEmbedUrl(selectedCourse.youtubeUrl)}
                                    title={selectedCourse.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>

                            {/* Footer */}
                            <div className="p-4 flex items-center justify-between bg-gray-50">
                                <div>
                                    <p className="text-gray-600 text-sm">{selectedCourse.description}</p>
                                    <p className="text-purple-600 font-bold mt-1">
                                        {selectedCourse.price === 0 ? 'Miễn phí' : `${selectedCourse.price.toLocaleString('vi-VN')}đ`}
                                    </p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleRegister(selectedCourse)}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    <ExternalLink size={18} />
                                    Đăng ký ngay
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AICourseStore;
