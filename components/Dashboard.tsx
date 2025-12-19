import React, { useState, useEffect } from 'react';
import { VideoLesson, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, LogOut, Crown, Sparkles, Key, X, CheckCircle, Settings,
    Play, Trash2, Edit3, Share2, Box, Brain, RotateCcw, HelpCircle,
    Plus, ChevronRight, Zap, Users, Clock, Star, Lock, Shield
} from 'lucide-react';

import { getTrialStatus, activateWithCode, upgradeToPro, useTrialPlay } from '../utils/trialUtils';
import { createShareUrl, shortenUrl } from '../utils/shareUtils';
import { verifyAdminPassword, isAdminAuthenticated, setAdminAuthenticated } from '../utils/adminAuth';

interface DashboardProps {
    user: User;
    lessons: VideoLesson[];
    onCreateNew: () => void;
    onPlay: (lesson: VideoLesson) => void;
    onEdit: (lesson: VideoLesson) => void;
    onLogout: () => void;
    onDelete: (lessonId: string) => void;
    onAdmin: () => void;
    onGeometry3D: () => void;
    onBeeGame: () => void;
    onVongQuay: () => void;
    onLuckyWheel: () => void;
    isAdmin: boolean;
}

const MAX_TRIAL_COUNT = 3;

// Modern Tool Card Component
interface ToolCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    accentColor: string;
    onClick: () => void;
    badge?: string;
    disabled?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({
    title, description, icon, accentColor, onClick, badge, disabled
}) => {
    return (
        <motion.button
            whileHover={disabled ? {} : { y: -5, scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.98 }}
            onClick={disabled ? undefined : onClick}
            className={`relative group text-left p-6 rounded-[24px] overflow-hidden transition-all duration-300 h-full flex flex-col justify-between ${disabled
                ? 'bg-slate-100/50 cursor-not-allowed opacity-60 grayscale'
                : 'bg-white/80 backdrop-blur-md hover:bg-white shadow-lg hover:shadow-2xl border border-white/50'
                }`}
        >
            {/* Background Blob for glow effect */}
            {!disabled && (
                <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500 ${accentColor.replace('bg-', 'bg-')}`} />
            )}

            <div className="relative z-10 w-full">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-14 h-14 rounded-2xl ${accentColor} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {icon}
                    </div>

                    {badge && (
                        <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full bg-slate-900 text-white shadow-sm">
                            {badge}
                        </span>
                    )}
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-800 group-hover:to-slate-600 transition-colors">
                    {title}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Action Arrow */}
            {!disabled && (
                <div className="relative z-10 mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                        <ChevronRight size={16} />
                    </div>
                </div>
            )}
        </motion.button>
    );
};

// Video List Item
const VideoItem: React.FC<{
    lesson: VideoLesson;
    onPlay: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onShare: () => void;
    canPlay: boolean;
    isShortening?: boolean;
}> = ({ lesson, onPlay, onEdit, onDelete, onShare, canPlay, isShortening }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
    >
        {/* Header: Title and Badge */}
        <div className="flex justify-between items-start mb-2">
            <h4 className="text-xl font-bold text-slate-800 truncate pr-4 flex-1">{lesson.title}</h4>
            <span className="flex-shrink-0 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow-sm">
                {lesson.questions.length} câu hỏi
            </span>
        </div>

        {/* Date */}
        <p className="text-slate-500 text-sm mb-2">
            Cập nhật: {new Date(lesson.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* View Original Link */}
        <a
            href={lesson.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-6 hover:underline"
        >
            Xem video gốc
        </a>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-3">
            {/* View Button */}
            <button
                onClick={canPlay ? onPlay : undefined}
                className={`py-2 px-4 rounded-xl font-bold text-white shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 ${canPlay
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg'
                    : 'bg-slate-400 cursor-not-allowed'
                    }`}
            >
                Xem
            </button>

            {/* Edit Button */}
            <button
                onClick={onEdit}
                className="py-2 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                Chỉnh sửa
            </button>

            {/* Copy Link Button */}
            <button
                onClick={onShare}
                disabled={isShortening}
                className="py-2 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-amber-400 to-orange-500 shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
            >
                {isShortening ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <>
                        <Share2 size={16} /> Sao chép link
                    </>
                )}
            </button>

            {/* Delete Button */}
            <button
                onClick={onDelete}
                className="py-2 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                Xóa
            </button>
        </div>
    </motion.div>
);

const Dashboard: React.FC<DashboardProps> = ({
    user, lessons, onCreateNew, onPlay, onEdit, onLogout, onDelete, onAdmin, onGeometry3D, onBeeGame, onVongQuay, onLuckyWheel, isAdmin
}) => {

    const [trialStatus, setTrialStatus] = useState(getTrialStatus());
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [licenseInput, setLicenseInput] = useState('');
    const [licenseError, setLicenseError] = useState('');
    const [activeTab, setActiveTab] = useState<'tools' | 'videos'>('tools');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isShorteningId, setIsShorteningId] = useState<string | null>(null);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [adminError, setAdminError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        setTrialStatus(getTrialStatus());
    }, []);

    const isPro = trialStatus.isPro;
    const remainingTrials = trialStatus.usesRemaining;

    const handleActivateLicense = () => {
        setLicenseError('');
        const code = licenseInput.trim().toUpperCase();
        if (!code) {
            setLicenseError('Vui lòng nhập mã Pro');
            return;
        }
        const result = activateWithCode(code);
        if (result) {
            upgradeToPro();
            setTrialStatus(getTrialStatus());
            setShowLicenseModal(false);
            setLicenseInput('');
        } else {
            setLicenseError('Mã không hợp lệ hoặc đã hết lượt');
        }
    };

    const handlePlayLesson = (lesson: VideoLesson) => {
        if (!isPro && remainingTrials <= 0) {
            setShowLicenseModal(true);
            return;
        }
        if (!isPro) {
            useTrialPlay();
            setTrialStatus(getTrialStatus());
        }
        onPlay(lesson);
    };

    const handleShare = async (lesson: VideoLesson) => {
        if (isShorteningId) return;
        setIsShorteningId(lesson.id);

        try {
            const longUrl = createShareUrl(lesson);
            const shortUrl = await shortenUrl(longUrl);
            await navigator.clipboard.writeText(shortUrl);
            setCopiedId(lesson.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('Share error:', error);
            // Fallback
            const longUrl = createShareUrl(lesson);
            await navigator.clipboard.writeText(longUrl);
            setCopiedId(lesson.id);
        } finally {
            setIsShorteningId(null);
        }
    };

    // Admin access handler - kiểm tra session hoặc yêu cầu mật khẩu
    const handleAdminAccess = () => {
        if (isAdminAuthenticated()) {
            // Đã xác thực trong session
            onAdmin();
        } else {
            // Chưa xác thực, hiện modal nhập mật khẩu
            setShowAdminModal(true);
            setAdminPassword('');
            setAdminError('');
        }
    };

    // Xác thực mật khẩu admin
    const handleAdminVerify = async () => {
        if (!adminPassword.trim()) {
            setAdminError('Vui lòng nhập mật khẩu');
            return;
        }

        setIsVerifying(true);
        setAdminError('');

        try {
            const isValid = await verifyAdminPassword(adminPassword);
            if (isValid) {
                setAdminAuthenticated();
                setShowAdminModal(false);
                setAdminPassword('');
                onAdmin();
            } else {
                setAdminError('Mật khẩu không đúng');
            }
        } catch (error) {
            setAdminError('Lỗi xác thực. Vui lòng thử lại.');
        } finally {
            setIsVerifying(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    return (
        <div className="min-h-screen relative bg-slate-50 font-sans selection:bg-purple-200">
            {/* Mesh Gradient Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
            </div>

            {/* Floating Glass Header */}
            <header className="sticky top-4 z-50 mx-4 md:mx-auto max-w-6xl">
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-purple-500/5 rounded-2xl px-6 py-4 flex items-center justify-between transition-all">
                    {/* Logo & User */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md transform rotate-3 hover:rotate-0 transition-transform">
                            <Zap size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 tracking-tight">Giáo viên CN</h1>
                        </div>
                    </div>

                    {/* Desktop Navigation Tabs */}
                    <div className="hidden md:flex bg-slate-100/80 p-1.5 rounded-xl">
                        <button
                            onClick={() => setActiveTab('tools')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'tools'
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Công cụ
                        </button>
                        <button
                            onClick={() => setActiveTab('videos')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'videos'
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Video ({lessons.length})
                        </button>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3">
                        {/* Pro/Trial Badge */}
                        {isPro ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                                <CheckCircle size={14} className="text-emerald-500" />
                                <span className="text-xs font-bold text-emerald-600">PRO</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLicenseModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full hover:bg-amber-100 transition-colors"
                            >
                                <Sparkles size={14} className="text-amber-500" />
                                <span className="text-xs font-bold text-amber-600">{remainingTrials} free</span>
                            </button>
                        )}

                        {isAdmin && (
                            <button onClick={handleAdminAccess} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors" title="Quản trị">
                                <Shield size={18} />
                            </button>
                        )}

                        <button
                            onClick={onLogout}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors"
                            title="Đăng xuất"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 text-center md:text-left"
                >
                    <p className="text-purple-600 font-semibold mb-2 flex items-center justify-center md:justify-start gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        {getGreeting()},
                    </p>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-2 tracking-tight">
                        {user.name} <span className="text-4xl">👋</span>
                    </h2>
                    <p className="text-slate-500 text-lg">Hôm nay bạn muốn tạo trải nghiệm học tập nào?</p>
                </motion.div>

                {/* Mobile Tab Navigation */}
                <div className="md:hidden flex gap-2 mb-8 bg-white/50 p-1.5 rounded-xl backdrop-blur-sm border border-white/20">
                    <button
                        onClick={() => setActiveTab('tools')}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'tools'
                            ? 'bg-white text-purple-700 shadow-sm'
                            : 'text-slate-500'
                            }`}
                    >
                        Công cụ
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'videos'
                            ? 'bg-white text-purple-700 shadow-sm'
                            : 'text-slate-500'
                            }`}
                    >
                        Video
                    </button>
                </div>
                <AnimatePresence mode="wait">
                    {activeTab === 'tools' ? (
                        <motion.div
                            key="tools"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-12"
                        >
                            {/* Tools Grid - Bento Style */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Box size={20} className="text-purple-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Kho công cụ</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[180px]">
                                    {/* Main Tool - Spans 2 rows on Desktop if needed, here just 1 */}
                                    <ToolCard
                                        title="Video tương tác"
                                        description="Biến video YouTube thành bài học tương tác với câu hỏi trắc nghiệm."
                                        icon={<Video size={28} className="text-white" />}
                                        accentColor="bg-gradient-to-br from-blue-500 to-indigo-600"
                                        onClick={() => setActiveTab('videos')}
                                        badge={`${lessons.length} video`}
                                    />

                                    <ToolCard
                                        title="Ong về Tổ"
                                        description="Game trắc nghiệm vui nhộn giúp học sinh ôn tập kiến thức."
                                        icon={<span className="text-3xl filter drop-shadow-md">🐝</span>}
                                        accentColor="bg-gradient-to-br from-amber-400 to-orange-500"
                                        onClick={onBeeGame}
                                    />

                                    <ToolCard
                                        title="Hình học 3D"
                                        description="Khám phá và tương tác với các khối hình không gian trực quan."
                                        icon={<Box size={28} className="text-white" />}
                                        accentColor="bg-gradient-to-br from-purple-500 to-fuchsia-600"
                                        onClick={onGeometry3D}
                                    />

                                    <ToolCard
                                        title="Vòng quay"
                                        description="Gọi tên ngẫu nhiên học sinh, tạo sự hồi hộp trong lớp học."
                                        icon={<RotateCcw size={28} className="text-white" />}
                                        accentColor="bg-gradient-to-br from-pink-500 to-rose-500"
                                        onClick={onVongQuay}
                                    />

                                    <ToolCard
                                        title="Vòng quay may mắn"
                                        description="Quay thưởng ngẫu nhiên với giao diện đẹp mắt."
                                        icon={<span className="text-3xl filter drop-shadow-md">🎡</span>}
                                        accentColor="bg-gradient-to-br from-rose-400 to-red-500"
                                        onClick={onLuckyWheel}
                                    />

                                    {/* Coming Soon Tools - Slightly transparent */}
                                    <ToolCard
                                        title="Quiz Game"
                                        description="Đấu trường tri thức trực tuyến (Sắp ra mắt)"
                                        icon={<HelpCircle size={28} className="text-white" />}
                                        accentColor="bg-slate-400"
                                        onClick={() => { }}
                                        badge="Sắp ra mắt"
                                        disabled
                                    />
                                </div>
                            </section>

                            {/* Stats Section */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <Zap size={20} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Thống kê hoạt động</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                            <Video size={24} />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-slate-800">{lessons.length}</p>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Video</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                                            <HelpCircle size={24} />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-slate-800">{lessons.reduce((sum, l) => sum + l.questions.length, 0)}</p>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Câu hỏi</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                            <Zap size={24} />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-slate-800">5</p>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Công cụ</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                                            <Star size={24} />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-slate-800 scale-100 origin-left">{isPro ? '∞' : remainingTrials}</p>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lượt còn</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="videos"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {/* Videos Section */}
                            <div className="bg-white rounded-[30px] p-8 shadow-xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-3xl font-extrabold text-slate-700">Video của tôi</h2>
                                    <button
                                        onClick={onCreateNew}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                                    >
                                        <Plus size={20} /> Tạo video mới
                                    </button>
                                </div>

                                {lessons.length === 0 ? (
                                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50">
                                        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Video size={36} className="text-indigo-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có video nào</h3>
                                        <p className="text-slate-500 mb-8">Tạo video tương tác đầu tiên của bạn ngay bây giờ!</p>
                                        <button
                                            onClick={onCreateNew}
                                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-md hover:shadow-lg"
                                        >
                                            Tạo video mới
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {lessons.map(lesson => (
                                            <VideoItem
                                                key={lesson.id}
                                                lesson={lesson}
                                                onPlay={() => handlePlayLesson(lesson)}
                                                onEdit={() => onEdit(lesson)}
                                                onDelete={() => onDelete(lesson.id)}
                                                onShare={() => handleShare(lesson)}
                                                canPlay={isPro || remainingTrials > 0}
                                                isShortening={isShorteningId === lesson.id}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* License Modal */}
            <AnimatePresence>
                {showLicenseModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowLicenseModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Crown className="text-amber-400" size={20} /> Nâng cấp Pro
                                </h3>
                                <button onClick={() => setShowLicenseModal(false)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400">
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-sm text-slate-400 mb-4">
                                Nhập mã Pro để sử dụng không giới hạn.
                            </p>

                            <input
                                type="text"
                                value={licenseInput}
                                onChange={e => setLicenseInput(e.target.value.toUpperCase())}
                                placeholder="Nhập mã Pro..."
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-center font-mono uppercase focus:border-purple-500 focus:outline-none"
                            />

                            {licenseError && (
                                <p className="text-red-400 text-sm mt-2 text-center">{licenseError}</p>
                            )}

                            <button
                                onClick={handleActivateLicense}
                                className="w-full mt-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                            >
                                Kích hoạt
                            </button>

                            <p className="text-center text-xs text-slate-500 mt-4">
                                Zalo: <a href="https://zalo.me/0975509490" className="text-purple-400 hover:underline">0975509490</a>
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Admin Password Modal */}
            <AnimatePresence>
                {showAdminModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowAdminModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Shield className="text-blue-400" size={20} /> Xác thực Admin
                                </h3>
                                <button onClick={() => setShowAdminModal(false)} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400">
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-sm text-slate-400 mb-4">
                                Nhập mật khẩu quản trị để truy cập Admin Panel.
                            </p>

                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAdminVerify()}
                                    placeholder="Mật khẩu..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            {adminError && (
                                <p className="text-red-400 text-sm mt-2">{adminError}</p>
                            )}

                            <button
                                onClick={handleAdminVerify}
                                disabled={isVerifying}
                                className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isVerifying ? 'Đang xác thực...' : 'Xác nhận'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Copied Toast */}
            <AnimatePresence>
                {copiedId && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg z-50"
                    >
                        ✓ Đã sao chép link
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;