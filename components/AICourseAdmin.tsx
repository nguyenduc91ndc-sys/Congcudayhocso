import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Plus, Trash2, Edit2, Save, X,
    GraduationCap, Loader2, Star, Flame, Sparkles,
    ExternalLink, Play, Upload, Image
} from 'lucide-react';
import { AICourse } from '../types/aiCourseTypes';
import {
    subscribeToCourses,
    addCourse,
    updateCourse,
    deleteCourse
} from '../utils/firebaseAICourseStore';
import { uploadImage, isValidImage } from '../utils/firebaseStorage';

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
    author: 'Giao vien yeu CN',
    duration: '',
    level: 'beginner',
    category: 'AI co ban',
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
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
    const [useCustomThumbnail, setUseCustomThumbnail] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = subscribeToCourses((fetchedCourses) => {
            setCourses(fetchedCourses.sort((a, b) => b.createdAt - a.createdAt));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleInputChange = (field: keyof Omit<AICourse, 'id'>, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddNew = () => {
        setEditingCourse(null);
        setFormData(defaultCourse);
        setShowForm(true);
    };

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
        const hasCustomThumbnail = course.thumbnail &&
            !course.thumbnail.includes('img.youtube.com') &&
            !course.thumbnail.includes('ytimg.com');
        setUseCustomThumbnail(!!hasCustomThumbnail);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formData.title) {
            alert('Vui long nhap tieu de khoa hoc!');
            return;
        }
        setSaving(true);
        try {
            if (editingCourse) {
                await updateCourse(editingCourse.id, formData);
            } else {
                await addCourse(formData);
            }
            setShowForm(false);
            setEditingCourse(null);
            setFormData(defaultCourse);
        } catch (error) {
            console.error('Error saving course:', error);
            alert('Co loi xay ra. Vui long thu lai!');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (courseId: string) => {
        if (!confirm('Ban co chac muon xoa khoa hoc nay?')) return;
        try {
            await deleteCourse(courseId);
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Co loi xay ra khi xoa!');
        }
    };

    const getYouTubeVideoId = (url: string): string | null => {
        if (!url) return null;
        const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (shortsMatch) return shortsMatch[1];
        const liveMatch = url.match(/\/live\/([a-zA-Z0-9_-]+)/);
        if (liveMatch) return liveMatch[1];
        const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (shortUrlMatch) return shortUrlMatch[1];
        const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        if (watchMatch) return watchMatch[1];
        const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
        if (embedMatch) return embedMatch[1];
        return null;
    };

    const getVideoThumbnail = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) return '';
        const videoId = getYouTubeVideoId(url);
        return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!isValidImage(file)) {
            alert('Vui long chon file anh (JPG, PNG, GIF, WEBP)!');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('File anh khong duoc lon hon 5MB!');
            return;
        }
        setUploadingThumbnail(true);
        try {
            const url = await uploadImage(file, 'course-thumbnails');
            if (url) {
                handleInputChange('thumbnail', url);
                setUseCustomThumbnail(true);
            } else {
                alert('Co loi khi upload anh. Vui long thu lai!');
            }
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            alert('Co loi khi upload anh!');
        } finally {
            setUploadingThumbnail(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="flex items-center gap-2 text-white/70 hover:text-white font-medium"
                    >
                        <ArrowLeft size={20} />
                        <span>Quay lai</span>
                    </motion.button>
                    <div className="flex items-center gap-2">
                        <GraduationCap size={24} className="text-purple-400" />
                        <h1 className="text-xl font-bold text-white">
                            Quan ly Khoa hoc AI
                        </h1>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg"
                    >
                        <Plus size={18} />
                        Them khoa hoc
                    </motion.button>
                </div>
            </div>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                        <p className="text-white/60">Dang tai...</p>
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20">
                        <GraduationCap size={64} className="mx-auto text-white/20 mb-4" />
                        <h3 className="text-xl font-semibold text-white/60 mb-2">
                            Chua co khoa hoc nao
                        </h3>
                        <p className="text-white/40 mb-6">
                            Bam "Them khoa hoc" de tao khoa hoc dau tien
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
                                <div className="relative aspect-video bg-black/50">
                                    {(course.thumbnail || getVideoThumbnail(course.youtubeUrl)) ? (
                                        <img
                                            src={course.thumbnail || getVideoThumbnail(course.youtubeUrl)}
                                            alt={course.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600">
                                            <Play size={48} className="text-white/50" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 flex gap-2">
                                        {course.isHot && (
                                            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                                <Flame size={10} /> Hot
                                            </span>
                                        )}
                                        {course.isNew && (
                                            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                                <Sparkles size={10} /> Moi
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-white mb-1 line-clamp-2">{course.title}</h3>
                                    <p className="text-white/60 text-sm mb-2 line-clamp-2">{course.description}</p>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`text-sm font-bold ${course.price === 0 ? 'text-green-400' : 'text-purple-400'}`}>
                                            {course.price === 0 ? 'Mien phi' : `${course.price.toLocaleString('vi-VN')}d`}
                                        </span>
                                        {course.duration && <span className="text-white/40 text-xs">- {course.duration}</span>}
                                        <span className="text-white/40 text-xs">- {course.enrollCount} hoc vien</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(course)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
                                        >
                                            <Edit2 size={14} /> Sua
                                        </button>
                                        <button
                                            onClick={() => handleDelete(course.id)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                                        >
                                            <Trash2 size={14} /> Xoa
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
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
                            <div className="sticky top-0 bg-slate-800 border-b border-white/10 p-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white">
                                    {editingCourse ? 'Sua khoa hoc' : 'Them khoa hoc moi'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-white/60"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-1">
                                        Tieu de khoa hoc *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => handleInputChange('title', e.target.value)}
                                        placeholder="VD: Khoa hoc AI co ban cho giao vien"
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-1">
                                        Mo ta ngan
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => handleInputChange('description', e.target.value)}
                                        placeholder="Mo ta noi dung khoa hoc..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-1">
                                        Link video (YouTube/Drive)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.youtubeUrl}
                                        onChange={e => handleInputChange('youtubeUrl', e.target.value)}
                                        placeholder="https://youtube.com/... hoac https://drive.google.com/..."
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                    />
                                    <p className="text-white/40 text-xs mt-1">Ho tro: YouTube (watch, shorts, live), Google Drive</p>
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-2">
                                        Anh bia khoa hoc
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                        className="hidden"
                                    />
                                    <div className="flex items-center gap-3 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingThumbnail}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                                        >
                                            {uploadingThumbnail ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Upload size={16} />
                                            )}
                                            {uploadingThumbnail ? 'Dang tai...' : 'Upload anh bia'}
                                        </button>
                                        {formData.thumbnail && useCustomThumbnail && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleInputChange('thumbnail', '');
                                                    setUseCustomThumbnail(false);
                                                }}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                            >
                                                Xoa anh
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-white/40 text-xs mb-3">
                                        {useCustomThumbnail && formData.thumbnail
                                            ? 'Dang dung anh tuy chinh'
                                            : 'Neu khong upload, se dung thumbnail tu YouTube (Drive can upload anh)'}
                                    </p>
                                    <div className="aspect-video rounded-lg overflow-hidden bg-black/50 border border-white/10">
                                        {formData.thumbnail ? (
                                            <img
                                                src={formData.thumbnail}
                                                alt="Thumbnail preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const ytThumb = getVideoThumbnail(formData.youtubeUrl);
                                                    if (ytThumb) (e.target as HTMLImageElement).src = ytThumb;
                                                }}
                                            />
                                        ) : formData.youtubeUrl && getVideoThumbnail(formData.youtubeUrl) ? (
                                            <img
                                                src={getVideoThumbnail(formData.youtubeUrl)}
                                                alt="Video thumbnail"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/30">
                                                <Image size={48} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Gia (VND)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={e => handleInputChange('price', Number(e.target.value))}
                                            placeholder="0 = Mien phi"
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Gia goc (neu giam gia)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.originalPrice || ''}
                                            onChange={e => handleInputChange('originalPrice', e.target.value ? Number(e.target.value) : undefined)}
                                            placeholder="De trong neu khong khuyen mai"
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Thoi luong
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.duration}
                                            onChange={e => handleInputChange('duration', e.target.value)}
                                            placeholder="VD: 10 bai hoc, 2 gio..."
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Danh muc
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={e => handleInputChange('category', e.target.value)}
                                            placeholder="VD: AI co ban, Tao video..."
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Cap do
                                        </label>
                                        <select
                                            value={formData.level}
                                            onChange={e => handleInputChange('level', e.target.value)}
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="beginner" className="bg-slate-800">Co ban</option>
                                            <option value="intermediate" className="bg-slate-800">Trung cap</option>
                                            <option value="advanced" className="bg-slate-800">Nang cao</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-white/80 text-sm font-medium mb-1">
                                            Tac gia
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.author}
                                            onChange={e => handleInputChange('author', e.target.value)}
                                            placeholder="Ten tac gia"
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm font-medium mb-1">
                                        Link dang ky (de trong se mo Zalo)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.registerUrl || ''}
                                        onChange={e => handleInputChange('registerUrl', e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
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
                                            <Sparkles size={16} className="text-blue-500" /> Badge Moi
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div className="sticky bottom-0 bg-slate-800 border-t border-white/10 p-4 flex gap-3">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    Huy
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
                                    {editingCourse ? 'Cap nhat' : 'Them khoa hoc'}
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
