import React, { useState, useEffect } from 'react';
import { VideoLesson, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, LogOut, Crown, Sparkles, Key, X, CheckCircle, Settings,
    Play, Trash2, Edit3, Share2, Box, Brain, RotateCcw, HelpCircle,
    Plus, ChevronRight, Zap, Users, Clock, Star, Lock, Shield, Coffee, ExternalLink, Heart
} from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import WelcomeModal from './WelcomeModal';
import { useTheme } from '../contexts/ThemeContext';
import { getTrialStatus, activateWithCode, upgradeToPro, useTrialPlay } from '../utils/trialUtils';
import { playCorrectSound, playIncorrectSound, playMustRewatchSound, playVictorySound, playHoverSound } from '../utils/soundUtils';
import FeedbackButton from './FeedbackButton';
import { createShareUrl, shortenUrl } from '../utils/shareUtils';
import { verifyAdminPassword, isAdminAuthenticated, setAdminAuthenticated } from '../utils/adminAuth';
import { canUseVideoTrialByDevice, useVideoTrialByDevice, getDeviceTrialStatus } from '../utils/firebaseDeviceTrial';
import ScrollButtons from './ScrollButtons';

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
    onBeeGameEditable: () => void;
    onVongQuay: () => void;
    onLuckyWheel: () => void;
    onKingGame: () => void;
    onStarWheel: () => void;
    onVideoStore: () => void;
    onInteractiveVideo: () => void;
    onAICourseStore: () => void;
    onCanvaBasics: () => void;
    onNewYear: () => void;
    isAdmin: boolean;
    isGuest?: boolean;
}

const MAX_TRIAL_COUNT = 3;

// Professional Tool Card Component
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
    const [rotateX, setRotateX] = React.useState(0);
    const [rotateY, setRotateY] = React.useState(0);
    const [isHovered, setIsHovered] = React.useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        setRotateX((y - centerY) / 10);
        setRotateY((centerX - x) / 10);
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
        setIsHovered(false);
    };

    return (
        <motion.button
            whileHover={disabled ? {} : { scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.98 }}
            onClick={disabled ? undefined : onClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => {
                setIsHovered(true);
                playHoverSound();
            }}
            onMouseLeave={handleMouseLeave}
            style={{
                transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                transformStyle: 'preserve-3d',
            }}
            className={`relative group text-left p-6 rounded-2xl border transition-all duration-200 ${disabled
                ? 'bg-white/10 border-white/10 cursor-not-allowed opacity-50'
                : 'bg-white/10 border-white/20 hover:border-white/40 hover:bg-white/20 cursor-pointer hover:shadow-2xl'
                }`}
        >
            {/* 3D Shine effect */}
            {!disabled && isHovered && (
                <div
                    className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
                    style={{
                        background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.2) 55%, transparent 60%)`,
                        transform: 'translateZ(1px)',
                    }}
                />
            )}

            {/* Glow effect */}
            {!disabled && (
                <div
                    className={`absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300 blur-xl ${accentColor}`}
                    style={{ transform: 'translateZ(-10px)' }}
                />
            )}

            {/* Badge */}
            {badge && (
                <span
                    className="absolute top-4 right-4 px-2 py-1 text-[10px] font-bold rounded-full bg-black/30 text-white/80 backdrop-blur-sm border border-white/10"
                    style={{ transform: 'translateZ(20px)' }}
                >
                    {badge}
                </span>
            )}

            {/* Icon with 3D pop */}
            <div
                className={`w-14 h-14 rounded-xl ${accentColor} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}
                style={{ transform: 'translateZ(30px)' }}
            >
                {icon}
            </div>

            {/* Content with 3D depth */}
            <div style={{ transform: 'translateZ(20px)' }}>
                <h3 className="text-lg font-bold text-white mb-1 drop-shadow-sm">{title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{description}</p>
            </div>

            {/* Arrow indicator with animation */}
            {!disabled && (
                <ChevronRight
                    size={20}
                    className="absolute bottom-6 right-6 text-white/40 group-hover:text-white/80 group-hover:translate-x-2 transition-all duration-300"
                    style={{ transform: 'translateZ(20px)' }}
                />
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
    user, lessons, onCreateNew, onPlay, onEdit, onLogout, onDelete, onAdmin, onGeometry3D, onBeeGame, onBeeGameEditable, onVongQuay, onLuckyWheel, onKingGame, onStarWheel, onVideoStore, onInteractiveVideo, onAICourseStore, onCanvaBasics, onNewYear, isAdmin, isGuest
}) => {
    const { currentTheme } = useTheme();
    const [trialStatus, setTrialStatus] = useState(getTrialStatus());
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [licenseInput, setLicenseInput] = useState('');
    const [licenseError, setLicenseError] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isShorteningId, setIsShorteningId] = useState<string | null>(null);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [adminError, setAdminError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [showDonateModal, setShowDonateModal] = useState(false);
    const [showZaloModal, setShowZaloModal] = useState(false);

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

    const handlePlayLesson = async (lesson: VideoLesson) => {
        // Bỏ giới hạn lượt - cho phép xem không giới hạn
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

    return (
        <div className="min-h-screen relative">
            {/* Dynamic Theme Background */}
            <div
                className="fixed inset-0 -z-10 transition-all duration-500"
                style={{
                    background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, ${currentTheme.gradientVia}, ${currentTheme.gradientTo})`
                }}
            />
            {/* Overlay for readability */}
            <div className="fixed inset-0 bg-black/30 -z-10" />

            {/* Header */}
            <header className="border-b border-white/10 sticky top-0 z-50 bg-black/20 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo & User - 3D Style */}
                        <div className="flex items-center gap-4">
                            {/* 3D Icon */}
                            <motion.div
                                className="relative w-12 h-12"
                                whileHover={{ rotateY: 180, scale: 1.1 }}
                                transition={{ duration: 0.6, type: "spring" }}
                                style={{ perspective: 1000 }}
                            >
                                {/* Shadow layer */}
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl blur-md opacity-60 translate-y-1" />
                                {/* Main icon */}
                                <div className="relative w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 border border-white/20"
                                    style={{
                                        transform: 'translateZ(20px)',
                                        boxShadow: '0 10px 30px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                                    }}>
                                    <Zap size={24} className="text-white drop-shadow-lg" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                                </div>
                            </motion.div>
                            {/* 3D Text */}
                            <div>
                                <h1
                                    className="font-outfit font-bold text-lg bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent"
                                    style={{
                                        textShadow: '0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(168, 85, 247, 0.2)',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    Giáo viên yêu công nghệ
                                </h1>
                                <p className="text-xs text-purple-300/80 font-medium">Xin chào, {user.name}</p>
                            </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-3">

                            {isAdmin && (
                                <button onClick={handleAdminAccess} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Quản trị">
                                    <Shield size={18} />
                                </button>
                            )}

                            <ThemeSelector />

                            {/* Zalo Group Button */}
                            <button
                                onClick={() => setShowZaloModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full hover:bg-blue-500/30 transition-colors group"
                                title="Cộng đồng Zalo"
                            >
                                <Users size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium text-blue-400 hidden sm:inline">Cộng đồng Zalo</span>
                            </button>

                            {isGuest ? (
                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-medium text-sm rounded-lg transition-colors"
                                >
                                    <LogOut size={16} className="rotate-180" />
                                    <span>Đăng nhập</span>
                                </button>
                            ) : (
                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white font-medium text-sm rounded-lg transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span>Đăng xuất</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                <motion.div
                    key="tools"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* 🎆 Banner Chào Xuân 2026 */}
                    <motion.section
                        onClick={onNewYear}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="relative mb-6 cursor-pointer group overflow-hidden rounded-2xl"
                    >
                        {/* Animated background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite]" />

                        {/* Overlay pattern */}
                        <div className="absolute inset-0 opacity-20" style={{
                            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23fff" fill-opacity="0.4"%3E%3Cpath d="M10 0l2.94 6.56L20 7.64l-5 4.36 1.18 6.88L10 15.4l-6.18 3.48L5 12 0 7.64l7.06-1.08z"/%3E%3C/g%3E%3C/svg%3E")',
                        }} />

                        {/* Content */}
                        <div className="relative px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Firework icon */}
                                <div className="text-4xl animate-bounce">
                                    🎆
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg drop-shadow-lg flex items-center gap-2">
                                        <span className="animate-pulse">✨</span>
                                        Chào Xuân 2026
                                        <span className="animate-pulse">✨</span>
                                    </h3>
                                    <p className="text-white/90 text-sm">
                                        Nhấn để xem hiệu ứng pháo hoa đặc biệt! 🧧🎊
                                    </p>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🧧</span>
                                <ChevronRight size={24} className="text-white group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>

                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity bg-white blur-xl" />
                    </motion.section>



                    {/* Tools Grid */}
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-4">Công cụ dạy học</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                            {/* Video tương tác - Direct Link to Module */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onMouseEnter={() => playHoverSound()}
                                onClick={onInteractiveVideo}
                                className="relative group text-left p-6 rounded-2xl border transition-all duration-200 bg-white/10 border-white/20 hover:border-white/40 hover:bg-white/20 cursor-pointer hover:shadow-2xl"
                            >
                                {/* Badge showing video count */}
                                <span className="absolute top-4 right-4 px-2 py-1 text-[10px] font-bold rounded-full bg-black/30 text-white/80 backdrop-blur-sm border border-white/10">
                                    {lessons.length} video
                                </span>

                                {/* Icon */}
                                <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                                    <Video size={24} className="text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Video tương tác</h3>
                                <p className="text-sm text-white/70">Tạo video YouTube với câu hỏi tương tác</p>
                                <ChevronRight
                                    size={20}
                                    className="absolute bottom-6 right-6 text-white/40 group-hover:text-white/80 group-hover:translate-x-2 transition-all duration-300"
                                />
                            </motion.div>

                            <ToolCard
                                title="Ong về Tổ"
                                description="Game ong về tổ demo sản phẩm"
                                icon={<span className="text-2xl">🐝</span>}
                                accentColor="bg-amber-500"
                                onClick={onBeeGame}
                            />

                            <ToolCard
                                title="Ong về Tổ (Tự soạn)"
                                description="Tự tạo câu hỏi và chia sẻ cho học sinh"
                                icon={<span className="text-2xl">🐝📝</span>}
                                accentColor="bg-orange-500"
                                onClick={onBeeGameEditable}
                                badge="Mới"
                            />

                            <ToolCard
                                title="Hình học 3D"
                                description="Khám phá hình khối không gian tương tác"
                                icon={<Box size={24} className="text-white" />}
                                accentColor="bg-purple-600"
                                onClick={onGeometry3D}
                            />

                            <ToolCard
                                title="Vòng quay"
                                description="Vòng tròn gọi tên học sinh"
                                icon={<RotateCcw size={24} className="text-white" />}
                                accentColor="bg-pink-500"
                                onClick={onVongQuay}
                            />

                            <ToolCard
                                title="Đường đến Ngôi Vua"
                                description="Gọi tên học sinh kết hợp câu hỏi"
                                icon={<span className="text-2xl">👑</span>}
                                accentColor="bg-yellow-500"
                                onClick={onKingGame}
                            />

                            <ToolCard
                                title="Vòng quay may mắn"
                                description="Bánh xe quay chọn người may mắn"
                                icon={<span className="text-2xl">🎡</span>}
                                accentColor="bg-rose-500"
                                onClick={onLuckyWheel}
                            />

                            <ToolCard
                                title="Vòng Xoay Ngôi Sao"
                                description="Vòng quay ngôi sao may mắn"
                                icon={<span className="text-2xl">⭐</span>}
                                accentColor="bg-indigo-500"
                                onClick={onStarWheel}
                            />

                            <ToolCard
                                title="Kho Video AI"
                                description="Video AI giáo dục chất lượng cao"
                                icon={<span className="text-2xl">🎬</span>}
                                accentColor="bg-gradient-to-br from-blue-500 to-purple-600"
                                onClick={onVideoStore}
                                badge="Mới"
                            />

                            <ToolCard
                                title="Nghề Nghiệp Tương Lai"
                                description="Tạo ảnh chibi theo nghề nghiệp ước mơ với AI"
                                icon={<span className="text-2xl">👨‍🚀</span>}
                                accentColor="bg-gradient-to-br from-orange-400 to-amber-500"
                                onClick={() => window.open('https://aistudio.google.com/apps/drive/19wuAJ5tA9JuALlQ-STS6sTuKwA1P07eZ', '_blank')}
                                badge="AI Studio"
                            />

                            <ToolCard
                                title="Giải Mã Bức Tranh"
                                description="Game khám phá hình ảnh bí ẩn, học qua câu hỏi"
                                icon={<span className="text-2xl">🧩</span>}
                                accentColor="bg-gradient-to-br from-purple-500 to-cyan-500"
                                onClick={() => window.open('/giải-mã-bức-tranh/', '_blank')}
                                badge="Mới"
                            />

                            {/* Tools sắp ra mắt */}
                            <ToolCard
                                title="Quiz Game"
                                description="Trắc nghiệm nhanh kiểu Kahoot"
                                icon={<HelpCircle size={24} className="text-white" />}
                                accentColor="bg-emerald-600"
                                onClick={() => { }}
                                badge="Sắp ra mắt"
                                disabled
                            />

                            <ToolCard
                                title="Thẻ ghi nhớ"
                                description="Flashcards học từ vựng và công thức"
                                icon={<Brain size={24} className="text-white" />}
                                accentColor="bg-orange-500"
                                onClick={() => { }}
                                badge="Sắp ra mắt"
                                disabled
                            />

                        </div>
                    </section>

                    {/* Khóa học AI Section */}
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-4">Khóa học AI</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ToolCard
                                title="Kho Khóa học AI"
                                description="Xem demo các khóa học AI cho giáo viên"
                                icon={<span className="text-2xl">🎓</span>}
                                accentColor="bg-gradient-to-br from-cyan-500 to-blue-600"
                                onClick={onAICourseStore}
                                badge="Mới"
                            />

                            <ToolCard
                                title="Tạo nội dung với AI"
                                description="Học cách tạo giáo án, bài giảng bằng AI"
                                icon={<span className="text-2xl">✨</span>}
                                accentColor="bg-gradient-to-br from-purple-500 to-pink-600"
                                onClick={() => { }}
                                badge="Sắp ra mắt"
                                disabled
                            />

                            <ToolCard
                                title="Video AI nâng cao"
                                description="Tạo video giáo dục chuyên nghiệp với AI"
                                icon={<span className="text-2xl">🎬</span>}
                                accentColor="bg-gradient-to-br from-orange-500 to-red-600"
                                onClick={() => { }}
                                badge="Sắp ra mắt"
                                disabled
                            />

                            <ToolCard
                                title="Canva cơ bản"
                                description="Video hướng dẫn sử dụng Canva từ cộng đồng"
                                icon={<span className="text-2xl">🎨</span>}
                                accentColor="bg-gradient-to-br from-teal-500 to-cyan-600"
                                onClick={onCanvaBasics}
                                badge="Mới"
                            />

                        </div>
                    </section>


                    {/* Các ứng dụng 3D */}
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-4">Các ứng dụng 3D</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ToolCard
                                title="Hệ tuần hoàn 3D"
                                description="Mô hình tim và hệ tuần hoàn 3D sống động"
                                icon={<Heart size={24} className="text-white" />}
                                accentColor="bg-red-600"
                                onClick={() => window.open('https://heart-3d-viewer.vercel.app/?v=2', '_blank')}
                                badge="Mới"
                            />
                        </div>
                    </section>

                    {/* Stats */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                                    <Video size={18} className="text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{lessons.length}</p>
                                    <p className="text-xs text-slate-500">Video</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                                    <HelpCircle size={18} className="text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{lessons.reduce((sum, l) => sum + l.questions.length, 0)}</p>
                                    <p className="text-xs text-slate-500">Câu hỏi</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                                    <Zap size={18} className="text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">3</p>
                                    <p className="text-xs text-slate-500">Công cụ</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
                                    <Star size={18} className="text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{isPro ? '∞' : remainingTrials}</p>
                                    <p className="text-xs text-slate-500">Lượt còn</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Zalo Community Card */}
                    <section
                        onClick={() => setShowZaloModal(true)}
                        className="mt-6 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-500/30 rounded-2xl p-4 cursor-pointer hover:border-blue-400/50 transition-all group relative ring-2 ring-blue-500/30 animate-pulse hover:animate-none"
                    >
                        <div className="flex items-center gap-4">
                            {/* QR Code nhỏ */}
                            <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform p-1">
                                <img
                                    src="/zalo-group-qr.png"
                                    alt="QR Zalo Group"
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-blue-300 font-bold text-sm flex items-center gap-2">
                                    <Users size={16} className="text-blue-400" />
                                    Tham gia Cộng đồng Giáo viên 4.0
                                </h3>
                                <p className="text-white/70 text-xs mt-1 line-clamp-2">
                                    Quét QR hoặc bấm vào đây để tham gia nhóm Zalo chia sẻ kinh nghiệm và tài liệu!
                                </p>
                            </div>

                            {/* Arrow */}
                            <ChevronRight size={20} className="text-blue-400/50 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                    </section>
                </motion.div>
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

            {/* Zalo Modal */}
            <AnimatePresence>
                {showZaloModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowZaloModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full text-center relative overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Decorative Background - Reduced height */}
                            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-blue-500 to-cyan-500" />
                            <div className="absolute top-3 right-3 z-10">
                                <button onClick={() => setShowZaloModal(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="relative z-10 pt-4">
                                {/* Smaller Icon */}
                                <div className="w-16 h-16 bg-white rounded-xl mx-auto shadow-lg flex items-center justify-center mb-3 p-1">
                                    <div className="w-full h-full bg-blue-50 rounded-lg flex items-center justify-center">
                                        <Users size={28} className="text-blue-600" />
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 mb-1">Cộng đồng Giáo viên 4.0</h3>
                                <p className="text-slate-500 text-sm mb-4 px-2">
                                    Chia sẻ kinh nghiệm & tài liệu giảng dạy 4.0
                                </p>

                                {/* QR Code Container - Compact */}
                                <div className="rounded-xl overflow-hidden mb-4 mx-auto max-w-[180px] shadow-sm">
                                    <img
                                        src="/zalo-group-qr.png"
                                        alt="QR Code Zalo"
                                        className="w-full h-full object-contain"
                                    />
                                </div>

                                <button
                                    onClick={() => window.open('https://zalo.me/g/kvfmke936', '_blank')}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                                >
                                    Tham gia ngay <ExternalLink size={16} />
                                </button>

                                <button
                                    onClick={() => setShowZaloModal(false)}
                                    className="w-full mt-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg transition-colors text-sm"
                                >
                                    Đóng
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Welcome Modal */}
            <WelcomeModal
                isOpen={showDonateModal}
                onClose={() => setShowDonateModal(false)}
                userName={user.name}
            />

            {/* Floating Action Buttons - Nhóm dọc gọn gàng */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
                {/* Nút Gửi phản hồi */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <FeedbackButton user={user} />
                </motion.div>
            </div>
        </div >
    );
};

export default Dashboard;