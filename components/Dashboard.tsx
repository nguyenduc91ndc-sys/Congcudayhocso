import React, { useState, useEffect } from 'react';
import { VideoLesson, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, LogOut, Crown, Sparkles, Key, X, CheckCircle, Settings,
    Play, Trash2, Edit3, Share2, Box, Brain, RotateCcw, HelpCircle,
    Plus, ChevronRight, Zap, Users, Clock, Star, Lock, Shield, Coffee, ExternalLink, Heart, MessageCircle, QrCode, Palette
} from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import WelcomeModal from './WelcomeModal';
import { useTheme } from '../contexts/ThemeContext';
import { getTrialStatus, activateWithCode, upgradeToPro, useTrialPlay } from '../utils/trialUtils';
import { playCorrectSound, playIncorrectSound, playMustRewatchSound, playVictorySound, playHoverSound } from '../utils/soundUtils';
import FeedbackButton from './FeedbackButton';
import { createShareUrl, shortenUrl, createShortShareUrl } from '../utils/shareUtils';
import { verifyAdminPassword, isAdminAuthenticated, setAdminAuthenticated } from '../utils/adminAuth';
import { canUseVideoTrialByDevice, useVideoTrialByDevice, getDeviceTrialStatus } from '../utils/firebaseDeviceTrial';
import ScrollButtons from './ScrollButtons';
import { BlogSection, blogPosts } from './BlogSection';

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
    onBacteriaGame: () => void;
    onVongQuay: () => void;
    onLuckyWheel: () => void;
    onStarWheel: () => void;
    onHappyClass: () => void;
    onVideoStore: () => void;
    onInteractiveVideo: () => void;
    onAICourseStore: () => void;
    onSoanGiaoAnNangLucSo: () => void;
    onCanvaBasics: () => void;
    onCommunityResources: () => void;
    onNewYear: () => void;
    onDenHung3D: () => void;
    onHeartSystem3D: () => void;
    onVietnamMap: () => void;
    onChucTet: () => void;
    onPuzzleGame: () => void;
    onNgheNghiep: () => void;
    onTreasureHunt: () => void;
    onVirtualExperiment: () => void;
    onSensesExplorer: () => void;
    onClockExperiment: () => void;
    onBangCuuChuong: () => void;
    onSoSanhSo: () => void;
    onGameTuongTac: () => void;
    onKeoThaPhanLoai: () => void;
    onThuMoiHopPH: () => void;
    onThuMoiTuongTac: () => void;
    onThuMoiDauNam: () => void;
    onThiepMoiOnline: () => void;
    onQrGenerator: () => void;
    onYogurtExperiment: () => void;
    onKiemTraDaoVan: () => void;
    onSangKienKN: () => void;
    onNhanXetTT27: () => void;
    onEarthSeasons: () => void;
    onThatLuong3D: () => void;
    onNhayBaoBo: () => void;
    onSolarSystem: () => void;
    onKeoCoTriTue: () => void;
    onGameTuyChinh: () => void;
    onDinhDocLap3D: () => void;
    onPhongTranh3D: () => void;
    onKyYeuCuoiNam: () => void;
    isAdmin: boolean;
    isGuest?: boolean;
    hiddenApps?: string[];
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    showUpdateNotification?: boolean;
}

export const DASHBOARD_TABS = [
    { key: 'all', label: 'Tất cả', emoji: '🏠' },
    { key: 'teaching', label: 'Công cụ dạy học', emoji: '⚡' },
    { key: 'science', label: 'Mô phỏng & Thí nghiệm', emoji: '🧪' },
    { key: 'ai', label: 'Khóa học & AI', emoji: '🎓' },
    { key: '3d', label: 'Ứng dụng 3D', emoji: '📦' },
    { key: 'interactive', label: 'Học liệu tương tác', emoji: '📚' },
    { key: 'blog', label: 'Cẩm nang & Chia sẻ', emoji: '✍️' },
];

const MAX_TRIAL_COUNT = 3;

const VR360_DISCOVERY_LINKS = [
    {
        id: 'hue360',
        title: 'VR360 Cố đô Huế',
        description: 'Tham quan Kinh thành Huế và lăng Minh Mạng qua không gian 360°',
        icon: '🏯',
        accentColor: 'bg-gradient-to-br from-rose-600 to-amber-700',
        url: 'https://vietnam.travel/sites/default/files/360Tour/Hue/index.htm',
        sourceName: 'Vietnam.travel - Cục Du lịch Quốc gia Việt Nam',
        audience: 'Tiểu học, THCS, THPT; Lịch sử, Địa lí, Hoạt động trải nghiệm',
        badge: 'VR360',
    },
    {
        id: 'hoiAn360',
        title: 'VR360 Phố cổ Hội An',
        description: 'Khám phá Chùa Cầu, phố cổ và không gian di sản Hội An',
        icon: '🏮',
        accentColor: 'bg-gradient-to-br from-orange-500 to-yellow-600',
        url: 'https://vietnam.travel/sites/default/files/360Tour/HoiAn/index.htm',
        sourceName: 'Vietnam.travel - Cục Du lịch Quốc gia Việt Nam',
        audience: 'Tiểu học, THCS, THPT; Lịch sử, Địa lí, Mĩ thuật, Hoạt động trải nghiệm',
        badge: 'Di sản',
    },
    {
        id: 'phongNha360',
        title: 'VR360 Phong Nha',
        description: 'Vào hang động, ngắm thạch nhũ và cảnh quan Phong Nha - Kẻ Bàng',
        icon: '⛰️',
        accentColor: 'bg-gradient-to-br from-sky-600 to-emerald-700',
        url: 'https://vietnam.travel/sites/default/files/360Tour/PhongNha/index.htm',
        sourceName: 'Vietnam.travel - Cục Du lịch Quốc gia Việt Nam',
        audience: 'Tiểu học, THCS, THPT; Địa lí, Khoa học tự nhiên, Hoạt động trải nghiệm',
        badge: 'Thiên nhiên',
    },
    {
        id: 'haLong360',
        title: 'VR360 Vịnh Hạ Long',
        description: 'Trải nghiệm toàn cảnh vịnh, đảo đá vôi và làng chài trên biển',
        icon: '🌊',
        accentColor: 'bg-gradient-to-br from-cyan-500 to-blue-700',
        url: 'https://vietnam.travel/sites/default/files/360Tour/HaLong/index.htm',
        sourceName: 'Vietnam.travel - Cục Du lịch Quốc gia Việt Nam',
        audience: 'Tiểu học, THCS, THPT; Địa lí, Môi trường, Hoạt động trải nghiệm',
        badge: 'UNESCO',
    },
    {
        id: 'ninhBinh360',
        title: 'VR360 Ninh Bình',
        description: 'Khám phá Tràng An, Tam Cốc, Hang Múa và Bái Đính qua ảnh 360°',
        icon: '🛶',
        accentColor: 'bg-gradient-to-br from-lime-600 to-teal-700',
        url: 'https://vietnam.travel/sites/default/files/360Tour/NinhBinh/index.htm',
        sourceName: 'Vietnam.travel - Cục Du lịch Quốc gia Việt Nam',
        audience: 'Tiểu học, THCS, THPT; Lịch sử, Địa lí, Hoạt động trải nghiệm',
        badge: 'VR360',
    },
    {
        id: 'kimLien360',
        title: 'VR360 Làng Kim Liên',
        description: 'Tham quan quê Bác tại Nam Đàn, Nghệ An với tour thực tế ảo',
        icon: '🌾',
        accentColor: 'bg-gradient-to-br from-green-600 to-yellow-700',
        url: 'https://vr360.com.vn/projects/ditich-langkimlien-vr360/',
        sourceName: 'VR360 Việt Nam',
        audience: 'Tiểu học, THCS, THPT; Lịch sử, Đạo đức, Hoạt động trải nghiệm',
        badge: 'Lịch sử',
    },
] as const;

const PHET_SIMULATION_LINKS = [
    {
        id: 'phetForcesMotion',
        title: 'PhET - Lực và chuyển động',
        description: 'Thử kéo, đẩy, ma sát và quan sát chuyển động của vật',
        icon: '🧲',
        accentColor: 'bg-gradient-to-br from-blue-600 to-cyan-600',
        url: 'https://phet.colorado.edu/vi/simulations/forces-and-motion-basics',
        audience: 'Tiểu học lớp 4-5, THCS lớp 6-8',
        badge: 'PhET',
    },
    {
        id: 'phetCircuitDc',
        title: 'PhET - Mạch điện DC',
        description: 'Lắp pin, bóng đèn, công tắc và kiểm tra mạch nối tiếp, song song',
        icon: '💡',
        accentColor: 'bg-gradient-to-br from-yellow-500 to-orange-600',
        url: 'https://phet.colorado.edu/vi/simulations/circuit-construction-kit-dc-virtual-lab',
        audience: 'Tiểu học lớp 5, THCS lớp 7-9',
        badge: 'PhET',
    },
    {
        id: 'phetStaticElectricity',
        title: 'PhET - Tĩnh điện',
        description: 'Khám phá điện tích qua bóng bay, áo len và lực hút tĩnh điện',
        icon: '⚡',
        accentColor: 'bg-gradient-to-br from-violet-600 to-fuchsia-600',
        url: 'https://phet.colorado.edu/vi/simulations/balloons-and-static-electricity',
        audience: 'Tiểu học lớp 5, THCS lớp 7-9',
        badge: 'PhET',
    },
    {
        id: 'phetMatterStates',
        title: 'PhET - Trạng thái vật chất',
        description: 'Quan sát chất rắn, lỏng, khí khi thay đổi nhiệt độ và áp suất',
        icon: '🧊',
        accentColor: 'bg-gradient-to-br from-sky-500 to-indigo-600',
        url: 'https://phet.colorado.edu/vi/simulations/states-of-matter-basics',
        audience: 'Tiểu học lớp 3-5, THCS lớp 6',
        badge: 'PhET',
    },
    {
        id: 'phetDensity',
        title: 'PhET - Khối lượng riêng',
        description: 'So sánh khối lượng, thể tích và hiện tượng nổi chìm của vật',
        icon: '⚖️',
        accentColor: 'bg-gradient-to-br from-teal-600 to-emerald-700',
        url: 'https://phet.colorado.edu/vi/simulations/density',
        audience: 'Tiểu học lớp 5, THCS lớp 6-8',
        badge: 'PhET',
    },
    {
        id: 'phetBuildAtom',
        title: 'PhET - Tạo nguyên tử',
        description: 'Lắp proton, neutron, electron để hiểu cấu tạo nguyên tử',
        icon: '⚛️',
        accentColor: 'bg-gradient-to-br from-pink-600 to-red-600',
        url: 'https://phet.colorado.edu/vi/simulations/build-an-atom',
        audience: 'THCS lớp 8-9, THPT',
        badge: 'PhET',
    },
] as const;

const PHET_SOURCE_NAME = 'PhET Interactive Simulations, University of Colorado Boulder - phet.colorado.edu';

type DashboardTabKey = typeof DASHBOARD_TABS[number]['key'];

interface DashboardToolItem {
    id: string;
    render: () => React.ReactNode;
}

// Professional Tool Card Component
interface ToolCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    accentColor: string;
    onClick: () => void;
    badge?: string;
    sourceName?: string;
    audience?: string;
    disabled?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({
    title, description, icon, accentColor, onClick, badge, sourceName, audience, disabled
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
                {audience && (
                    <p className="mt-2 text-[11px] font-semibold text-white/60">
                        Đối tượng: {audience}
                    </p>
                )}
                {sourceName && (
                    <div className="mt-3 space-y-1 text-[11px] font-semibold text-white/55">
                        <p className="flex items-center gap-1.5">
                            <ExternalLink size={12} className="text-white/45" />
                            Nguồn sưu tầm: {sourceName}
                        </p>
                        <p>Tài nguyên mở tại website nguồn; không sao chép/lưu trữ nội dung trên hệ thống.</p>
                    </div>
                )}
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
    user, lessons, onCreateNew, onPlay, onEdit, onLogout, onDelete, onAdmin, onGeometry3D, onBeeGame, onBeeGameEditable, onBacteriaGame, onVongQuay, onLuckyWheel, onStarWheel, onHappyClass, onVideoStore, onInteractiveVideo, onAICourseStore, onSoanGiaoAnNangLucSo, onCanvaBasics, onCommunityResources, onNewYear, onDenHung3D, onHeartSystem3D, onVietnamMap, onChucTet, onPuzzleGame, onNgheNghiep, onTreasureHunt, onVirtualExperiment, onSensesExplorer, onClockExperiment, onBangCuuChuong, onSoSanhSo, onGameTuongTac, onKeoThaPhanLoai, onThuMoiHopPH, onThuMoiTuongTac, onThuMoiDauNam, onThiepMoiOnline, onQrGenerator, onYogurtExperiment, onKiemTraDaoVan, onSangKienKN, onNhanXetTT27, onEarthSeasons, onThatLuong3D, onNhayBaoBo, onSolarSystem, onKeoCoTriTue, onGameTuyChinh, onDinhDocLap3D, onPhongTranh3D, onKyYeuCuoiNam, isAdmin, isGuest, hiddenApps = [], maintenanceMode = false, maintenanceMessage = '', showUpdateNotification = false
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
    const [activeTab, setActiveTab] = useState<DashboardTabKey>('all');
    const [showUpdateBanner, setShowUpdateBanner] = useState(() => {
        return !sessionStorage.getItem('skkn_update_dismissed');
    });

    const dismissUpdateBanner = () => {
        setShowUpdateBanner(false);
        sessionStorage.setItem('skkn_update_dismissed', 'true');
    };


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
            // Sử dụng Firebase để tạo link ngắn
            const shortUrl = await createShortShareUrl(lesson);
            await navigator.clipboard.writeText(shortUrl);
            setCopiedId(lesson.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('Share error:', error);
            // Fallback về link dài nếu lỗi
            const longUrl = createShareUrl(lesson);
            await navigator.clipboard.writeText(longUrl);
            setCopiedId(lesson.id);
        } finally {
            setIsShorteningId(null);
        }
    };

    // Admin access handler - kiểm tra session hoặc yêu cầu mật khẩu
    const handleAdminAccess = () => {
        if (isAdmin) {
            onAdmin();
            return;
        }
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

    const getVisibleTools = (items: DashboardToolItem[]) => items.filter(item => !hiddenApps.includes(item.id));

    const teachingTools: DashboardToolItem[] = [
        {
            id: 'interactiveVideo',
            render: () => (
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onMouseEnter={() => playHoverSound()}
                    onClick={onInteractiveVideo}
                    className="relative group text-left p-6 rounded-2xl border transition-all duration-200 bg-white/10 border-white/20 hover:border-white/40 hover:bg-white/20 cursor-pointer hover:shadow-2xl"
                >
                    <span className="absolute top-4 right-4 px-2 py-1 text-[10px] font-bold rounded-full bg-black/30 text-white/80 backdrop-blur-sm border border-white/10">
                        {lessons.length} video
                    </span>
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 group-hover:shadow-xl transition-shadow">
                        <Video size={24} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Video tương tác</h3>
                    <p className="text-sm text-white/70">Dán link YouTube hoặc tải video lên, chèn câu hỏi tương tác ngay trong bài học</p>
                    <ChevronRight size={20} className="absolute bottom-6 right-6 text-white/40 group-hover:text-white/80 group-hover:translate-x-2 transition-all duration-300" />
                </motion.div>
            ),
        },
        { id: 'beeGame', render: () => <ToolCard title="Ong về Tổ" description="Game ong về tổ demo sản phẩm" icon={<span className="text-2xl">🐝</span>} accentColor="bg-amber-500" onClick={onBeeGame} /> },
        { id: 'beeGameEditable', render: () => <ToolCard title="Ong về Tổ (Tự soạn)" description="Tự tạo câu hỏi và chia sẻ cho học sinh" icon={<span className="text-2xl">🐝📝</span>} accentColor="bg-orange-500" onClick={onBeeGameEditable} badge="Mới" /> },
        { id: 'bacteriaGame', render: () => <ToolCard title="Vi Khuẩn Phiêu Lưu" description="Game vi khuẩn tìm đường về hũ sữa chua" icon={<span className="text-2xl">🦠</span>} accentColor="bg-green-500" onClick={onBacteriaGame} badge="Mới" /> },
        { id: 'vongQuay', render: () => <ToolCard title="Vòng quay" description="Vòng tròn gọi tên học sinh" icon={<RotateCcw size={24} className="text-white" />} accentColor="bg-pink-500" onClick={onVongQuay} /> },
        { id: 'luckyWheel', render: () => <ToolCard title="Vòng quay may mắn" description="Bánh xe quay chọn người may mắn" icon={<span className="text-2xl">🎡</span>} accentColor="bg-rose-500" onClick={onLuckyWheel} /> },
        { id: 'starWheel', render: () => <ToolCard title="Vòng Xoay Ngôi Sao" description="Vòng quay ngôi sao may mắn" icon={<span className="text-2xl">⭐</span>} accentColor="bg-indigo-500" onClick={onStarWheel} /> },
        { id: 'happyClass', render: () => <ToolCard title="Lớp Hạnh Phúc" description="Quản lý điểm tốt, chuyên cần, thi đua và kết nối phụ huynh" icon={<span className="text-2xl">🌻</span>} accentColor="bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400" onClick={onHappyClass} badge="Mới" /> },
        { id: 'puzzleGame', render: () => <ToolCard title="Giải Mã Bức Tranh" description="Game khám phá hình ảnh bí ẩn, học qua câu hỏi" icon={<span className="text-2xl">🧩</span>} accentColor="bg-gradient-to-br from-purple-500 to-cyan-500" onClick={onPuzzleGame} badge="Mới" /> },
        { id: 'treasureHunt', render: () => <ToolCard title="Truy Tìm Kho Báu" description="Game phiêu lưu khám phá, tự soạn câu hỏi" icon={<span className="text-2xl">🏴‍☠️</span>} accentColor="bg-gradient-to-br from-orange-500 to-amber-500" onClick={onTreasureHunt} badge="Mới" /> },
        { id: 'nhayBaoBo', render: () => <ToolCard title="Nhảy Bao Bố" description="Hai đội thi đấu song song với ngân hàng câu hỏi" icon={<span className="text-2xl">🏁</span>} accentColor="bg-gradient-to-br from-green-500 to-emerald-500" onClick={onNhayBaoBo} badge="Mới" /> },
        { id: 'keoCoTriTue', render: () => <ToolCard title="Kéo Co Trí Tuệ" description="Game kéo co, nhận diện cử chỉ tay (AI)" icon={<span className="text-2xl">✊🖐️</span>} accentColor="bg-gradient-to-br from-red-500 to-blue-500" onClick={onKeoCoTriTue} badge="Mới" /> },
        { id: 'gameTuyChinh', render: () => <ToolCard title="Game Tùy Chỉnh" description="Game tùy biến câu hỏi, nhận diện cử chỉ (AI)" icon={<span className="text-2xl">🎮</span>} accentColor="bg-gradient-to-br from-red-400 to-orange-500" onClick={onGameTuyChinh} badge="Cực Hot" /> },
        { id: 'videoStore', render: () => <ToolCard title="Kho Video AI" description="Video AI giáo dục chất lượng cao" icon={<span className="text-2xl">🎬</span>} accentColor="bg-gradient-to-br from-blue-500 to-purple-600" onClick={onVideoStore} badge="Mới" /> },
    ];

    const aiTools: DashboardToolItem[] = [
        { id: 'soanGiaoAnNangLucSo', render: () => <ToolCard title="Soạn giáo án tích hợp Năng lực số - AI vào kế hoạch bài dạy" description="Mở công cụ soạn giáo án tích hợp năng lực số và AI" icon={<Sparkles size={24} className="text-white" />} accentColor="bg-gradient-to-br from-fuchsia-500 to-indigo-600" onClick={onSoanGiaoAnNangLucSo} badge="AI" /> },
        { id: 'aiCourseStore', render: () => <ToolCard title="Kho Khóa học AI" description="Xem demo các khóa học AI cho giáo viên" icon={<span className="text-2xl">🎓</span>} accentColor="bg-gradient-to-br from-cyan-500 to-blue-600" onClick={onAICourseStore} badge="Mới" /> },
        { id: 'ngheNghiep', render: () => <ToolCard title="Nghề Nghiệp Tương Lai" description="Tạo ảnh chibi theo nghề nghiệp ước mơ với AI" icon={<span className="text-2xl">👨‍🚀</span>} accentColor="bg-gradient-to-br from-orange-400 to-amber-500" onClick={onNgheNghiep} badge="AI Studio" /> },
        { id: 'canvaBasics', render: () => <ToolCard title="Canva cơ bản" description="Video hướng dẫn sử dụng Canva từ cộng đồng" icon={<span className="text-2xl">🎨</span>} accentColor="bg-gradient-to-br from-teal-500 to-cyan-600" onClick={onCanvaBasics} badge="Mới" /> },
        { id: 'chucTet', render: () => <ToolCard title="Mẫu Chúc Tết" description="Tạo thiệp chúc Tết đẹp, xuất PNG/PDF và chia sẻ" icon={<span className="text-2xl">🎊</span>} accentColor="bg-gradient-to-br from-red-600 to-yellow-500" onClick={onChucTet} badge="Mới" /> },
        { id: 'communityResources', render: () => <ToolCard title="Kho tài nguyên cộng đồng" description="Game PPT, mẫu slide, 3D, video AI và tài nguyên miễn phí cho thầy cô" icon={<Users size={24} className="text-white" />} accentColor="bg-gradient-to-br from-green-500 to-emerald-600" onClick={onCommunityResources} badge="Miễn phí" /> },
        { id: 'kiemTraDaoVan', render: () => <ToolCard title="Thẩm Văn AI" description="Kiểm tra đạo văn & phát hiện nội dung AI thông minh" icon={<span className="text-2xl">🔍</span>} accentColor="bg-gradient-to-br from-indigo-500 to-purple-600" onClick={onKiemTraDaoVan} badge="Mới" /> },
        { id: 'sangKienKinhNghiem', render: () => <ToolCard title="Viết SKKN & Báo Cáo" description="2 trong 1: AI viết + quét & sửa để vượt trình kiểm tra AI. Cá nhân hóa như người thật viết" icon={<span className="text-2xl">✍️</span>} accentColor="bg-gradient-to-br from-emerald-500 to-teal-600" onClick={onSangKienKN} badge="Mới" /> },
        { id: 'nhanXetTT27', render: () => <ToolCard title="Nhận Xét TT27" description="Tự động sinh nhận xét học sinh chuẩn Thông tư 27, hỗ trợ file từ Cơ sở dữ liệu" icon={<span className="text-2xl">📝</span>} accentColor="bg-gradient-to-br from-violet-500 to-purple-600" onClick={onNhanXetTT27} badge="Mới" /> },
    ];

    const threeDTools: DashboardToolItem[] = [
        { id: 'solarSystem', render: () => <ToolCard title="Hệ Mặt Trời" description="Khám phá và thực hành mô phỏng 2D ấn tượng" icon={<span className="text-2xl">🪐</span>} accentColor="bg-gradient-to-br from-cyan-600 to-blue-800" onClick={onSolarSystem} badge="Mới" /> },
        { id: 'earthSeasons', render: () => <ToolCard title="Trái đất & Bốn mùa" description="Mô phỏng ngày đêm và 4 mùa 3D" icon={<span className="text-2xl">🌍</span>} accentColor="bg-gradient-to-br from-blue-500 to-cyan-500" onClick={onEarthSeasons} /> },
        { id: 'heartSystem3D', render: () => <ToolCard title="Hệ tuần hoàn 3D" description="Mô hình tim và hệ tuần hoàn 3D sống động" icon={<Heart size={24} className="text-white" />} accentColor="bg-red-600" onClick={onHeartSystem3D} badge="Mới" /> },
        { id: 'geometry3DTools', render: () => <ToolCard title="Bộ công cụ Hình học 3D" description="Lập phương, hộp, chóp, cầu, trụ tương tác" icon={<Box size={24} className="text-white" />} accentColor="bg-indigo-600" onClick={onGeometry3D} badge="Mới" /> },
        { id: 'vietnamMap', render: () => <ToolCard title="Bản đồ Việt Nam" description="Khám phá 34 tỉnh thành với bản đồ tương tác" icon={<span className="text-2xl">🗺️</span>} accentColor="bg-emerald-600" onClick={onVietnamMap} badge="Mới" /> },
        { id: 'phongTranh3D', render: () => <ToolCard title="Phòng tranh 3D tùy chỉnh" description="Tạo phòng triển lãm 3D, gắn ảnh, video và chia sẻ link cho học sinh" icon={<Palette size={24} className="text-white" />} accentColor="bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-400" onClick={onPhongTranh3D} badge="Mới" /> },
        { id: 'denHung3D', render: () => <ToolCard title="Phòng Tranh 3D - Đền Hùng" description="Dã ngoại ảo tham quan Đền Hùng với VR 360°" icon={<span className="text-2xl">🏛️</span>} accentColor="bg-gradient-to-br from-amber-600 to-red-700" onClick={onDenHung3D} badge="Mới" /> },
        { id: 'thatLuong3D', render: () => <ToolCard title="Mô hình 3D - Thạt Luổng" description="Khám phá kiến trúc Thạt Luổng với mô hình 3D tương tác" icon={<span className="text-2xl">🕍</span>} accentColor="bg-gradient-to-br from-yellow-600 to-amber-700" onClick={onThatLuong3D} badge="Mới" /> },
        { id: 'dinhDocLap3D', render: () => <ToolCard title="Khám phá Dinh Độc Lập 3D" description="Tham quan Dinh Độc Lập lịch sử qua mô hình 3D tương tác · 30/4" icon={<span className="text-2xl">🏛️</span>} accentColor="bg-gradient-to-br from-yellow-700 to-red-800" onClick={onDinhDocLap3D} badge="30/4" /> },
        ...VR360_DISCOVERY_LINKS.map(item => ({ id: item.id, render: () => <ToolCard title={item.title} description={item.description} icon={<span className="text-2xl">{item.icon}</span>} accentColor={item.accentColor} onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')} badge={item.badge} sourceName={item.sourceName} audience={item.audience} /> })),
    ];

    const scienceTools: DashboardToolItem[] = [
        { id: 'virtualExperiment', render: () => <ToolCard title="Thí nghiệm ảo tách muối ra khỏi dung dịch" description="Mô phỏng thí nghiệm Khoa học tương tác" icon={<span className="text-2xl">🧪</span>} accentColor="bg-gradient-to-br from-teal-500 to-cyan-600" onClick={onVirtualExperiment} badge="Mới" /> },
        { id: 'sensesExplorer', render: () => <ToolCard title="Biệt đội 5 giác quan" description="Mô phỏng TNXH lớp 1: khám phá, phân loại và bảo vệ các giác quan" icon={<span className="text-2xl">👁️</span>} accentColor="bg-gradient-to-br from-cyan-500 to-emerald-500" onClick={onSensesExplorer} badge="Mới" /> },
        { id: 'clockExperiment', render: () => <ToolCard title="Xem Giờ Trên Đồng Hồ" description="Học cách xem giờ trên đồng hồ kim và đồng hồ số" icon={<span className="text-2xl">⏰</span>} accentColor="bg-gradient-to-br from-indigo-500 to-purple-600" onClick={onClockExperiment} badge="Mới" /> },
        { id: 'yogurtExperiment', render: () => <ToolCard title="Thí nghiệm làm Sữa chua" description="Mô phỏng thí nghiệm làm sữa chua với vi khuẩn lactic" icon={<span className="text-2xl">🥛</span>} accentColor="bg-gradient-to-br from-pink-500 to-purple-600" onClick={onYogurtExperiment} badge="Mới" /> },
        { id: 'earthSeasons', render: () => <ToolCard title="Chuyển động Trái Đất & Các Mùa" description="Mô phỏng quỹ đạo Trái Đất, trục nghiêng và sự hình thành 4 mùa" icon={<span className="text-2xl">🌍</span>} accentColor="bg-gradient-to-br from-indigo-500 to-blue-600" onClick={onEarthSeasons} badge="Mới" /> },
        ...PHET_SIMULATION_LINKS.map(item => ({ id: item.id, render: () => <ToolCard title={item.title} description={item.description} icon={<span className="text-2xl">{item.icon}</span>} accentColor={item.accentColor} onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')} badge={item.badge} sourceName={PHET_SOURCE_NAME} audience={item.audience} /> })),
    ];

    const interactiveTools: DashboardToolItem[] = [
        { id: 'qrGenerator', render: () => <ToolCard title="Tạo mã QR" description="Tạo QR tĩnh, QR động và tải mẫu QR dễ thương" icon={<QrCode size={24} className="text-white" />} accentColor="bg-gradient-to-br from-sky-500 to-indigo-600" onClick={onQrGenerator} badge="Mới" /> },
        { id: 'bangCuuChuong', render: () => <ToolCard title="Bảng Cửu Chương Số" description="Học liệu tương tác bảng cửu chương" icon={<span className="text-2xl">🔢</span>} accentColor="bg-gradient-to-br from-green-500 to-emerald-600" onClick={onBangCuuChuong} badge="Mới" /> },
        { id: 'soSanhSo', render: () => <ToolCard title="Bé So Sánh Số" description="Luyện lớn hơn, bé hơn, bằng nhau bằng hình ảnh vui nhộn" icon={<span className="text-2xl">🔢</span>} accentColor="bg-gradient-to-br from-amber-400 via-pink-400 to-sky-500" onClick={onSoSanhSo} badge="Mới" /> },
        { id: 'keoThaPhanLoai', render: () => <ToolCard title="Kéo - Thả Phân Loại" description="Game mầm non kéo thả phân loại hình ảnh, có âm thanh đúng sai và chúc mừng" icon={<span className="text-2xl">🧸</span>} accentColor="bg-gradient-to-br from-sky-400 via-pink-400 to-amber-300" onClick={onKeoThaPhanLoai} badge="Mầm non" /> },
        { id: 'gameTuongTac', render: () => <ToolCard title="Game Tương Tác" description="Học liệu tương tác dạng game vui nhộn" icon={<span className="text-2xl">🎮</span>} accentColor="bg-gradient-to-br from-purple-500 to-pink-600" onClick={onGameTuongTac} badge="Mới" /> },
        { id: 'thuMoiTuongTac', render: () => <ToolCard title="Thư Mời Họp Phụ Huynh" description="Tạo thư mời tương tác đẹp, nhận xác nhận phụ huynh qua email" icon={<span className="text-2xl">✉️</span>} accentColor="bg-gradient-to-br from-rose-500 to-pink-600" onClick={onThuMoiTuongTac} badge="Mới" /> },
        { id: 'thuMoiDauNam', render: () => <ToolCard title="Họp Phụ Huynh Online Đầu Năm" description="Tạo thư mời đầu năm, gửi link/QR và nhận xác nhận phụ huynh" icon={<span className="text-2xl">🏫</span>} accentColor="bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-400" onClick={onThuMoiDauNam} badge="Mới" /> },
        { id: 'thiepMoiOnline', render: () => <ToolCard title="Thiệp Mời Online" description="Tạo thiệp đẹp cho thôi nôi, cưới hỏi, tốt nghiệp, tân gia và mọi loại tiệc" icon={<span className="text-2xl">💌</span>} accentColor="bg-gradient-to-br from-fuchsia-500 via-rose-500 to-orange-400" onClick={onThiepMoiOnline} badge="Mới" /> },
        { id: 'kyYeuCuoiNam', render: () => <ToolCard title="Kỷ Yếu Cuối Năm" description="Tạo kỷ yếu lớp, lưu giữ ảnh/video và xuất file chia sẻ" icon={<span className="text-2xl">🎓</span>} accentColor="bg-gradient-to-br from-pink-500 to-rose-600" onClick={onKyYeuCuoiNam} badge="Mới" /> },
    ];

    const visibleTeachingTools = getVisibleTools(teachingTools);
    const visibleAiTools = getVisibleTools(aiTools);
    const visibleThreeDTools = getVisibleTools(threeDTools);
    const visibleScienceTools = getVisibleTools(scienceTools);
    const visibleInteractiveTools = getVisibleTools(interactiveTools);

    const tabToolCounts: Record<DashboardTabKey, number> = {
        all: visibleTeachingTools.length + visibleAiTools.length + visibleThreeDTools.length + visibleScienceTools.length + visibleInteractiveTools.length + blogPosts.length,
        teaching: visibleTeachingTools.length,
        science: visibleScienceTools.length,
        ai: visibleAiTools.length,
        '3d': visibleThreeDTools.length,
        interactive: visibleInteractiveTools.length,
        blog: blogPosts.length,
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
                <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
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
                                    className="font-outfit font-bold text-sm sm:text-lg bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent"
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
                                title="Cẩm nang giáo viên 4.0"
                            >
                                <Users size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium text-blue-400 hidden sm:inline">Cộng đồng Zalo</span>
                            </button>

                            {isGuest ? (
                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-medium text-sm rounded-lg transition-colors"
                                >
                                    <LogOut size={16} className="rotate-180" />
                                    <span className="hidden sm:inline">Đăng nhập</span>
                                </button>
                            ) : (
                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white font-medium text-sm rounded-lg transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span className="hidden sm:inline">Đăng xuất</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
                <motion.div
                    key="tools"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* 🎓 Banner Chào mừng & Tabs */}
                    <motion.section
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative mb-6 sm:mb-8 overflow-hidden rounded-2xl flex flex-col"
                    >
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-600" />

                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 opacity-10" style={{
                            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
                            backgroundSize: '30px 30px',
                        }} />

                        {/* Glow blobs */}
                        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                        {/* Top Content: Welcome */}
                        <div className="relative px-6 py-5 sm:py-6 flex items-center gap-4">
                            <div className="text-4xl sm:text-5xl drop-shadow-md">🎓</div>
                            <div>
                                <h3 className="text-white font-bold text-lg sm:text-xl md:text-2xl drop-shadow-sm mb-1">
                                    Chào mừng đến với Công cụ dạy học số!
                                </h3>
                                <p className="text-white/80 text-sm sm:text-base">
                                    Nền tảng công nghệ giáo dục dành cho <span className="font-semibold text-white">giáo viên</span>
                                </p>
                            </div>
                        </div>

                        {/* Divider Line */}
                        <div className="relative h-px w-full bg-white/10" />

                        {/* Bottom Content: Tabs */}
                        <div className="relative px-3 sm:px-6 py-3 sm:py-4">
                            <div className="relative">
                                {/* Gradient fade gợi ý scroll ngang - chỉ hiện trên mobile */}
                                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-blue-600/90 to-transparent rounded-r-xl z-10 sm:hidden" />
                                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto thin-scrollbar pb-2 -mb-2">
                                    {DASHBOARD_TABS.map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 border ${activeTab === tab.key ? 'bg-white/25 border-white/40 text-white shadow-lg backdrop-blur-md' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/15 hover:text-white backdrop-blur-sm'}`}
                                        >
                                            <span className="text-sm sm:text-base">{tab.emoji}</span>
                                            <span className="inline drop-shadow-sm">{tab.label}</span>
                                            <span
                                                className={`ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-black leading-none tabular-nums shadow-sm transition-colors ${activeTab === tab.key ? 'bg-white text-blue-700' : 'bg-white/15 text-white/90 ring-1 ring-white/15'}`}
                                                aria-label={`${tabToolCounts[tab.key]} mục`}
                                            >
                                                {tabToolCounts[tab.key]}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* Update Notification Popup */}
                    <AnimatePresence>
                        {showUpdateNotification && showUpdateBanner && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                                style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.5)' }}
                                onClick={(e) => { if (e.target === e.currentTarget) dismissUpdateBanner(); }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.85, y: 30 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.85, y: 30 }}
                                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                    className="relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl"
                                    style={{
                                        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(16, 185, 129, 0.15)'
                                    }}
                                >
                                    {/* Close Button */}
                                    <button
                                        onClick={dismissUpdateBanner}
                                        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
                                    >
                                        <X size={18} />
                                    </button>

                                    {/* Header with gradient */}
                                    <div className="relative px-6 pt-7 pb-5 text-center overflow-hidden">
                                        {/* Background blobs */}
                                        <div className="absolute -top-8 -left-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                                        <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                                        {/* Badge */}
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))',
                                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                                color: '#6ee7b7'
                                            }}
                                        >
                                            <Sparkles size={12} /> Mới cập nhật
                                        </motion.div>

                                        {/* Icon */}
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                                            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                                            style={{
                                                background: 'linear-gradient(135deg, #10b981, #0d9488, #0ea5e9)',
                                                boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)',
                                            }}
                                        >
                                            <span className="text-3xl">✍️</span>
                                        </motion.div>

                                        {/* Title */}
                                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2" style={{
                                            background: 'linear-gradient(135deg, #fff, #a7f3d0, #93c5fd)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        }}>
                                            Viết SKKN & Báo Cáo đã nâng cấp!
                                        </h3>
                                        <p className="text-white/50 text-sm">Công cụ 2 trong 1 duy nhất cho giáo viên</p>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px mx-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

                                    {/* Feature List */}
                                    <div className="px-6 py-5 space-y-3">
                                        {[
                                            { emoji: '🤖', text: 'AI viết nội dung chuyên sâu theo chuẩn' },
                                            { emoji: '🔍', text: 'Quét & sửa tự động để vượt kiểm tra AI' },
                                            { emoji: '📊', text: 'Biểu đồ cột, tròn minh họa số liệu' },
                                            { emoji: '💡', text: 'Góp ý sản phẩm trực tiếp cho Admin' },
                                        ].map((item, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3 + i * 0.08 }}
                                                className="flex items-center gap-3"
                                            >
                                                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.08)'
                                                }}>
                                                    {item.emoji}
                                                </div>
                                                <span className="text-white/80 text-sm font-medium">{item.text}</span>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* CTA */}
                                    <div className="px-6 pb-6 pt-1 flex gap-3">
                                        <button
                                            onClick={() => { dismissUpdateBanner(); onSangKienKN(); }}
                                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95"
                                            style={{
                                                background: 'linear-gradient(135deg, #10b981, #0d9488, #0ea5e9)',
                                                boxShadow: '0 6px 25px rgba(16, 185, 129, 0.35)',
                                            }}
                                        >
                                            <Sparkles size={16} /> Trải nghiệm ngay
                                        </button>
                                        <button
                                            onClick={dismissUpdateBanner}
                                            className="px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 hover:bg-white/10 active:scale-95"
                                            style={{
                                                color: 'rgba(255,255,255,0.5)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                            }}
                                        >
                                            Để sau
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Maintenance Banner */}
                    {maintenanceMode && !isAdmin && (
                        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-400/50 rounded-2xl p-3 sm:p-6 text-center mb-4 sm:mb-8">
                            <span className="text-2xl sm:text-4xl mb-1 sm:mb-3 block">🔧</span>
                            <h3 className="text-base sm:text-xl font-bold text-amber-300 mb-1">Đang bảo trì</h3>
                            <p className="text-white/80 text-sm sm:text-base">{maintenanceMessage || 'Website đang bảo trì'}</p>
                        </div>
                    )}

                    {/* ═══════ SECTION CONTENT ═══════ */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                        >

                            {/* ─── SECTION: CÔNG CỤ DẠY HỌC ─── */}
                            {(activeTab === 'all' || activeTab === 'teaching') && (
                                <section className="mb-10">
                                    {activeTab === 'all' && (
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                <Zap size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Công cụ dạy học</h2>
                                                <p className="text-xs text-white/50">Game, vòng quay và công cụ tương tác</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {visibleTeachingTools.map(item => (
                                            <React.Fragment key={item.id}>{item.render()}</React.Fragment>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ─── SECTION: KHÓA HỌC & AI ─── */}
                            {(activeTab === 'all' || activeTab === 'ai') && (
                                <section className="mb-10">
                                    {activeTab === 'all' && (
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                                <Brain size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Khóa học & AI</h2>
                                                <p className="text-xs text-white/50">Khóa học, tài nguyên và công cụ AI</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {visibleAiTools.map(item => (
                                            <React.Fragment key={item.id}>{item.render()}</React.Fragment>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ─── SECTION: ỨNG DỤNG 3D ─── */}
                            {(activeTab === 'all' || activeTab === '3d') && (
                                <section className="mb-10">
                                    {activeTab === 'all' && (
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                <Box size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Ứng dụng 3D & VR</h2>
                                                <p className="text-xs text-white/50">Mô hình 3D, bản đồ và thực tế ảo</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {visibleThreeDTools.map(item => (
                                            <React.Fragment key={item.id}>{item.render()}</React.Fragment>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ─── SECTION: MÔ PHỎNG & THÍ NGHIỆM ─── */}
                            {(activeTab === 'all' || activeTab === 'science') && (
                                <section className="mb-10">
                                    {activeTab === 'all' && (
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                                                <span className="text-xl">🧪</span>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Mô phỏng & Thí nghiệm</h2>
                                                <p className="text-xs text-white/50">Thí nghiệm ảo và mô phỏng tương tác</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {visibleScienceTools.map(item => (
                                            <React.Fragment key={item.id}>{item.render()}</React.Fragment>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ─── SECTION: HỌC LIỆU TƯƠNG TÁC ─── */}
                            {(activeTab === 'all' || activeTab === 'interactive') && (
                                <section className="mb-10">
                                    {activeTab === 'all' && (
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                                                <span className="text-xl">📚</span>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Học liệu tương tác</h2>
                                                <p className="text-xs text-white/50">Nội dung số hóa, tương tác đa phương tiện</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {visibleInteractiveTools.map(item => (
                                            <React.Fragment key={item.id}>{item.render()}</React.Fragment>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ─── SECTION: BLOG & CẨM NANG ─── */}
                            {(activeTab === 'all' || activeTab === 'blog') && (
                                <section className="mb-10 mt-8 relative z-10">
                                    <BlogSection />
                                </section>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Stats */}


                    {/* Zalo Community Card */}
                    <section
                        onClick={() => setShowZaloModal(true)}
                        className="mt-6 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-500/30 rounded-2xl p-4 cursor-pointer hover:border-blue-400/50 transition-all group relative ring-2 ring-blue-500/30 animate-pulse hover:animate-none"
                    >
                        <div className="flex items-center gap-4">
                            {/* QR Code nhỏ - dùng QR mới (nhóm 2) */}
                            <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform p-1">
                                <img
                                    src="/zalo-group-qr1.jpg"
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

                                {/* QR Code - 2 nhóm */}
                                <div className="flex gap-3 mb-4 justify-center">
                                    {/* Nhóm 1 - Đã đầy */}
                                    <div className="flex-1 max-w-[140px]">
                                        <div className="rounded-xl overflow-hidden shadow-sm border-2 border-slate-200 opacity-60 grayscale relative">
                                            <img
                                                src="/zalo-group-qr.png"
                                                alt="QR Code Zalo Nhóm 1"
                                                className="w-full h-full object-contain"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">Đã đầy</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 text-center">Nhóm 1</p>
                                        <button
                                            onClick={() => window.open('https://zalo.me/g/kvfmke936', '_blank')}
                                            className="w-full mt-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-1 text-xs"
                                        >
                                            Xem <ExternalLink size={12} />
                                        </button>
                                    </div>

                                    {/* Nhóm 2 - Đang mở */}
                                    <div className="flex-1 max-w-[140px]">
                                        <div className="rounded-xl overflow-hidden shadow-md border-2 border-blue-400 relative">
                                            <img
                                                src="/zalo-group-qr1.jpg"
                                                alt="QR Code Zalo Nhóm 2"
                                                className="w-full h-full object-contain"
                                            />
                                            <div className="absolute top-1.5 right-1.5">
                                                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow animate-pulse">Mới ✓</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-blue-600 font-semibold mt-1 text-center">Nhóm 2</p>
                                        <button
                                            onClick={() => window.open('https://zalo.me/g/pgsjyv156', '_blank')}
                                            className="w-full mt-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-1 text-xs"
                                        >
                                            Tham gia <ExternalLink size={12} />
                                        </button>
                                    </div>
                                </div>

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
                {/* Nút Gửi phản hồi - yêu cầu đăng nhập */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {isGuest ? (
                        <motion.button
                            onClick={onLogout}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 relative"
                            title="Đăng nhập để gửi phản hồi"
                        >
                            <MessageCircle size={22} />
                            <span className="font-bold text-sm">Gửi phản hồi</span>
                            <span className="absolute inset-0 rounded-full bg-pink-400 animate-ping opacity-20" />
                        </motion.button>
                    ) : (
                        <FeedbackButton user={user} />
                    )}
                </motion.div>
            </div>
        </div >
    );
};

export default Dashboard;
