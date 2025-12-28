import React from 'react';
import { motion } from 'framer-motion';
import { Star, Flame, Play, Clock, Users, ExternalLink, Sparkles } from 'lucide-react';
import { AICourse } from '../types/aiCourseTypes';

interface AICourseCardProps {
    course: AICourse;
    onPreview: (course: AICourse) => void;
    onRegister: (course: AICourse) => void;
}

const AICourseCard: React.FC<AICourseCardProps> = ({ course, onPreview, onRegister }) => {
    // Format giá tiền VND
    const formatPrice = (price: number) => {
        if (price === 0) return 'Miễn phí';
        return price.toLocaleString('vi-VN') + 'đ';
    };

    // Lấy YouTube video ID từ URL
    const getYouTubeVideoId = (url: string): string | null => {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    };

    // Lấy thumbnail từ YouTube
    const getThumbnail = () => {
        if (course.thumbnail) return course.thumbnail;
        const videoId = getYouTubeVideoId(course.youtubeUrl);
        return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
    };

    // Render rating sao
    const renderRating = (rating: number) => {
        return (
            <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        size={12}
                        className={i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                ))}
                <span className="text-xs text-gray-500 ml-1">({rating})</span>
            </div>
        );
    };

    // Level badge color
    const getLevelColor = (level: string) => {
        switch (level) {
            case 'beginner': return 'bg-green-100 text-green-700';
            case 'intermediate': return 'bg-yellow-100 text-yellow-700';
            case 'advanced': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getLevelText = (level: string) => {
        switch (level) {
            case 'beginner': return 'Cơ bản';
            case 'intermediate': return 'Trung cấp';
            case 'advanced': return 'Nâng cao';
            default: return level;
        }
    };

    return (
        <motion.div
            whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
            className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-lg transition-all duration-300 group"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
                <img
                    src={getThumbnail()}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                {/* Play overlay */}
                <div
                    onClick={() => onPreview(course)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                >
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-xl"
                    >
                        <Play size={28} className="text-purple-600 ml-1" />
                    </motion.div>
                </div>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                    {course.isHot && (
                        <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg">
                            <Flame size={12} /> Hot
                        </span>
                    )}
                    {course.isNew && (
                        <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg">
                            <Sparkles size={12} /> Mới
                        </span>
                    )}
                </div>

                {/* Level badge */}
                <span className={`absolute top-3 right-3 px-2 py-1 text-xs font-bold rounded-full ${getLevelColor(course.level)}`}>
                    {getLevelText(course.level)}
                </span>

                {/* Duration */}
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-white text-xs rounded-lg flex items-center gap-1">
                    <Clock size={12} />
                    {course.duration}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Category */}
                <span className="text-xs text-purple-600 font-medium">{course.category}</span>

                {/* Title */}
                <h3 className="font-bold text-gray-800 mt-1 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {course.title}
                </h3>

                {/* Author */}
                <p className="text-sm text-gray-500 mt-1">bởi {course.author}</p>

                {/* Rating & Enrolls */}
                <div className="flex items-center justify-between mt-2">
                    {renderRating(course.rating)}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users size={12} />
                        {course.enrollCount} học viên
                    </div>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 mt-3">
                    <span className={`text-lg font-bold ${course.price === 0 ? 'text-green-600' : 'text-purple-600'}`}>
                        {formatPrice(course.price)}
                    </span>
                    {course.originalPrice && course.originalPrice > course.price && (
                        <span className="text-sm text-gray-400 line-through">
                            {formatPrice(course.originalPrice)}
                        </span>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onPreview(course)}
                        className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 text-sm"
                    >
                        <Play size={16} />
                        Xem demo
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onRegister(course)}
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-1 text-sm"
                    >
                        <ExternalLink size={16} />
                        Đăng ký
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default AICourseCard;
