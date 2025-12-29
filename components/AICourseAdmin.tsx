import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Plus, Trash2, Edit2, Save, X,
    GraduationCap, Loader2, Star, Flame, Sparkles,
    ExternalLink, Play
} from 'lucide-react';
import { AICourse } from '../types/aiCourseTypes';
import {
    subscribeToCourses,
    addCourse,
    updateCourse,
    deleteCourse
} from '../utils/firebaseAICourseStore';

interface AICourseAdminProps {
    onBack: () => void;
}

const defaultCourse: Omit<AICourse, 'id'> = {
    title: '',
    description: '',
    thumbnail: '',
    youtubeUrl: '',
    price: 0,
    originalPrice: undefined,
    author: 'Giáo viên yêu CN',
    duration: '',
    level: 'beginner',
    category: 'AI cơ bản',
    rating: 5,
    enrollCount: 0,
    isHot: false,
    isNew: true,
    registerUrl: '',
    createdAt: Date.now()
};

const AICourseAdmin: React.FC<AICourseAdminProps> = ({ onBack }) => {
    const [courses, setCourses] = useState<AICourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<AICourse | null>(null);
    const [formData, setFormData] = useState<Omit<AICourse, 'id'>>(defaultCourse);
    const [saving, setSaving] = useState(false);

    // Load courses
    useEffect(() => {
        const unsubscribe = subscribeToCourses((fetchedCourses) => {
            setCourses(fetchedCourses.sort((a, b) => b.createdAt - a.createdAt));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Handle form input change
    const handleInputChange = (field: keyof Omit<AICourse, 'id'>, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Open form for new course
    const handleAddNew = () => {
        setEditingCourse(null);
        setFormData(defaultCourse);
        setShowForm(true);
    };

    // Open form for editing
    const handleEdit = (course: AICourse) => {
        setEditingCourse(course);
        setFormData({
            title: course.title,
            description: course.description,
            thumbnail: course.thumbnail,
            youtubeUrl: course.youtubeUrl,
            price: course.price,
            originalPrice: course.originalPrice,
            author: course.author,
            duration: course.duration,
            level: course.level,
            category: course.category,
            rating: course.rating,
            enrollCount: course.enrollCount,
            isHot: course.isHot,
            isNew: course.isNew,
            registerUrl: course.registerUrl,
            createdAt: course.createdAt
        });
        setShowForm(true);
    };

    // Save course
    const handleSave = async () => {
        if (!formData.title || !formData.youtubeUrl) {
            alert('Vui lòng nhập tiêu đề và link YouTube!');
            return;
        }

        setSaving(true);
        try {
            // Loại bỏ các giá trị undefined trước khi gửi Firebase
            // Firebase không chấp nhận undefined
            const cleanedData: any = {};
            Object.keys(formData).forEach(key => {
                const value = (formData as any)[key];
                if (value !== undefined) {
                    cleanedData[key] = value;
                }
            });

            // Đảm bảo originalPrice là null nếu không có giá trị
            if (cleanedData.originalPrice === undefined || cleanedData.originalPrice === '') {
                cleanedData.originalPrice = null;
            }

            if (editingCourse) {
                // Update existing
                await updateCourse(editingCourse.id, cleanedData);
            } else {
                // Add new
                await addCourse(cleanedData);
            }
            setShowForm(false);
            setEditingCourse(null);
            setFormData(defaultCourse);
        } catch (error) {
            console.error('Error saving course:', error);
            alert('Có lỗi xảy ra. Vui lòng thử lại!');
        } finally {
            setSaving(false);
        }
    };

    // Delete course
    const handleDelete = async (courseId: string) => {
        if (!confirm('Bạn có chắc muốn xóa khóa học này?')) return;

        try {
            await deleteCourse(courseId);
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Có lỗi xảy ra khi xóa!');
        }
    };

    // Get YouTube thumbnail - hỗ trợ nhiều định dạng
    const getYouTubeThumbnail = (url: string): string => {
        // Kiểm tra định dạng YouTube
        const patterns = [
            // YouTube live: youtube.com/live/VIDEO_ID
            /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
            // YouTube shorts: youtube.com/shorts/VIDEO_ID
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            // YouTube watch: youtube.com/watch?v=VIDEO_ID
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            // YouTube embed: youtube.com/embed/VIDEO_ID
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            // YouTube short URL: youtu.be/VIDEO_ID
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            // YouTube v format: youtube.com/v/VIDEO_ID
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
            }
        }

        // Nếu không phải YouTube, kiểm tra Google Drive
        const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) {
            return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w400`;
        }

        return '';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="flex items-center gap-2 text-white/70 hover:text-white font-medium"
                    >
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </motion.button>

                    <div className="flex items-center gap-2">
                        <GraduationCap size={24} className="text-purple-400" />
                        <h1 className="text-xl font-bold text-white">
                            Quản lý Khóa học AI
                        </h1>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg"
                    >
                        <Plus size={18} />
                        Thêm khóa học
                    </motion.button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                        <p className="text-white/60">Đang tải...</p>
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20">
                        <GraduationCap size={64} className="mx-auto text-white/20 mb-4" />
                        <h3 className="text-xl font-semibold text-white/60 mb-2">
                            Chưa có khóa học nào
                        </h3>
                        <p className="text-white/40 mb-6">
                            Bấm "Thêm khóa học" để tạo khóa học đầu tiên
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20"
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-black/50">
                                    <img
                                        src={course.thumbnail || getYouTubeThumbnail(course.youtubeUrl)}
                                        alt={course.title}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Badges */}
                                    <div className="absolute top-2 left-2 flex gap-2">
                                        {course.isHot && (
                                            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                                <Flame size={10} /> Hot
                                            </span>
                                        )}
                                        {course.isNew && (
                                            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                                <Sparkles size={10} /> Mới
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-bold text-white mb-1 line-clamp-2">{course.title}</h3>
                                    <p className="text-white/60 text-sm mb-2 line-clamp-2">{course.description}</p>

                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`text-sm font-bold ${course.price === 0 ? 'text-green-400' : 'text-purple-400'}`}>
                                            {course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString('vi-VN')}đ`}
                                        </span>
                                        <span className="text-white/40 text-xs">• {course.duration}</span>
                                        <span className="text-white/40 text-xs">• {course.enrollCount} học viên</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(course)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
                                        >
                                            <Edit2 size={14} /> Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(course.id)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                                        >
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setShowForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Form Header */}
                            <div className="sticky top-0 bg-slate-800 border-b border-white/10 p-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">
                                    {editingCourse ? '✏️ Sửa khóa học' : '➕ Thêm khóa học mới'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-white/60"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form Body */}
                            <div className="p-6 space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-1">
                                        Tiêu đề khóa học *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => handleInputChange('title', e.target.value)}
                                        placeholder="VD: Khóa học AI cơ bản cho giáo viên"
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-1">
                                        Mô tả ngắn
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => handleInputChange('description', e.target.value)}
                                        placeholder="Mô tả nội dung khóa học..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none resize-none"
                                    />
                                </div>

                                {/* YouTube URL */}
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-1">
                                        Link YouTube demo *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.youtubeUrl}
                                        onChange={e => handleInputChange('youtubeUrl', e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                    />
                                    {formData.youtubeUrl && (
                                        <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-black">
                                            <img
                                                src={getYouTubeThumbnail(formData.youtubeUrl)}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Price row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Giá (VND)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={e => handleInputChange('price', Number(e.target.value))}
                                            placeholder="0 = Miễn phí"
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Giá gốc (nếu giảm giá)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.originalPrice || ''}
                                            onChange={e => handleInputChange('originalPrice', e.target.value ? Number(e.target.value) : undefined)}
                                            placeholder="Để trống nếu không khuyến mãi"
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Duration & Category */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Thời lượng
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.duration}
                                            onChange={e => handleInputChange('duration', e.target.value)}
                                            placeholder="VD: 10 bài học, 2 giờ..."
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Danh mục
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={e => handleInputChange('category', e.target.value)}
                                            placeholder="VD: AI cơ bản, Tạo video..."
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Level & Author */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Cấp độ
                                        </label>
                                        <select
                                            value={formData.level}
                                            onChange={e => handleInputChange('level', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="beginner" className="bg-slate-800">Cơ bản</option>
                                            <option value="intermediate" className="bg-slate-800">Trung cấp</option>
                                            <option value="advanced" className="bg-slate-800">Nâng cao</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Tác giả
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.author}
                                            onChange={e => handleInputChange('author', e.target.value)}
                                            placeholder="Tên tác giả"
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Register URL */}
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-1">
                                        Link đăng ký (để trống sẽ mở Zalo)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.registerUrl || ''}
                                        onChange={e => handleInputChange('registerUrl', e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>

                                {/* Badges */}
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isHot}
                                            onChange={e => handleInputChange('isHot', e.target.checked)}
                                            className="w-5 h-5 rounded border-white/20 bg-white/10 text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-white/80 flex items-center gap-1">
                                            <Flame size={16} className="text-orange-500" /> Badge Hot
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isNew}
                                            onChange={e => handleInputChange('isNew', e.target.checked)}
                                            className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="text-white/80 flex items-center gap-1">
                                            <Sparkles size={16} className="text-blue-500" /> Badge Mới
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Form Footer */}
                            <div className="sticky bottom-0 bg-slate-800 border-t border-white/10 p-4 flex gap-3">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    {editingCourse ? 'Cập nhật' : 'Thêm khóa học'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AICourseAdmin;
