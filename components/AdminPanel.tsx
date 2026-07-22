import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Copy, Trash2, Plus, ArrowLeft, CheckCircle, Users, BarChart3, Clock, Monitor, MessageCircle, Star, XCircle, Check, X, Edit2, Save, Eye, ShoppingBag, Film, Package, Flame, Link, ExternalLink, Upload, ImageIcon, Loader2, Search, History, Mail, ChevronDown } from 'lucide-react';
import { getAnalytics, Analytics, VisitorLog } from '../utils/analyticsUtils';
import { getAllFeedbacks, getPendingFeedbacks, getApprovedFeedbacks, approveFeedback, rejectFeedback, deleteFeedback, updateFeedback, Feedback } from '../utils/feedbackUtils';
import { getVisitStats, setVisitCount } from '../utils/visitCounter';
import { getRecentVisitors, FirebaseVisitor, getLoginHistory, searchLoginHistory, LoginHistoryEntry, getTodayLoginCount, getUniqueUserCount } from '../utils/firebaseVisitors';
import { AIVideo, Order } from '../types/videoStoreTypes';
import { subscribeToVideos, addVideo, updateVideo, deleteVideo } from '../utils/firebaseVideoStore';
import { subscribeToOrders, confirmOrder, cancelOrder } from '../utils/firebaseOrders';
import { uploadImage, isValidImage, compressImageForUpload } from '../utils/firebaseStorage';
import { saveProKey, deleteProKey, subscribeToProKeys, ProKey, revokeProForEmail } from '../utils/firebaseProKeys';
import { saveBeeProKey, deleteBeeProKey, subscribeToBeeProKeys, BeeProKey, generateBeeProCode, revokeBeeProForEmail } from '../utils/firebaseBeeProKeys';
import { saveSKKNProKey, deleteSKKNProKey, subscribeToSKKNProKeys, SKKNProKey, generateSKKNProCode, revokeSKKNProForEmail } from '../utils/firebaseSKKNProKeys';
import { saveKyYeuAccessCode, deleteKyYeuAccessCode, subscribeToKyYeuAccessCodes, generateKyYeuAccessCode, setKyYeuAccessCodeActive, KyYeuAccessCode } from '../utils/firebaseKyYeuAccess';
import { deleteVideoExportCode, generateVideoExportCode, saveVideoExportCode, setVideoExportCodeActive, subscribeToVideoExportCodes } from '../utils/firebaseVideoExportCodes';
import {
    INTERACTIVE_VIDEO_TRIAL_CODE,
    INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT,
    deleteInteractiveVideoTrialAccount,
    InteractiveVideoTrial,
    InteractiveVideoTrialEmail,
    resetInteractiveVideoTrialToday,
    setInteractiveVideoTrialActive,
    subscribeToInteractiveVideoTrialEmails,
    subscribeToInteractiveVideoTrials
} from '../utils/firebaseInteractiveVideoTrial';
import { AppVisibilityState, APP_INFO, ALL_APP_IDS, subscribeToAppVisibility, setAppVisible, setAllAppsVisible, setMaintenanceMode, setUpdateNotification } from '../utils/firebaseAppVisibility';
import { getAppUsageSummaries, AppUsageSummary } from '../utils/firebaseAppUsage';

const START_YEAR_MEETING_APP_ID = 'thuMoiDauNam' as const;

interface AdminPanelProps {
    onBack: () => void;
}

// Tạo mã ngẫu nhiên
const generateRandomKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `PRO-${part1}-${part2}`;
};

// Lưu danh sách mã vào localStorage (backup)
const saveKeysToLocal = (keys: { key: string; createdAt: string; note: string }[]) => {
    localStorage.setItem('ntd_admin_keys', JSON.stringify(keys));
};

type KyYeuAdminKey = {
    key: string;
    createdAt: string;
    note: string;
    usedBy?: string;
    active: boolean;
    usageCount?: number;
    exportCount?: number;
    exportLimit?: number;
    lastExportAt?: string;
    lastExportBy?: string;
    lastExportClass?: string;
    lastExportYear?: string;
};

type VideoExportAdminKey = {
    key: string;
    createdAt: string;
    note: string;
    usedBy?: string;
    active: boolean;
    usageCount?: number;
    exportCount?: number;
    exportLimit?: number;
    lastExportAt?: string;
    lastExportBy?: string;
    lastExportTitle?: string;
    lastExportType?: string;
};

const formatKyYeuDateTime = (value?: string): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN');
};

const formatAppUsageDateTime = (value?: number): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'analytics' | 'keys' | 'feedbacks' | 'videos' | 'orders' | 'apps'>('analytics');
    const [appVisibility, setAppVisibility] = useState<AppVisibilityState>({ apps: {}, maintenanceMode: false, maintenanceMessage: '' });
    const [editMaintenanceMsg, setEditMaintenanceMsg] = useState('');
    const [expandedSections, setExpandedSections] = useState<string[]>([APP_INFO[START_YEAR_MEETING_APP_ID].section]);
    const [keys, setKeys] = useState<{ key: string; createdAt: string; note: string; usedBy?: string }[]>([]);
    const [beeKeys, setBeeKeys] = useState<{ key: string; createdAt: string; note: string; usedBy?: string }[]>([]);
    const [skknKeys, setSkknKeys] = useState<{ key: string; createdAt: string; note: string; usedBy?: string }[]>([]);
    const [kyYeuKeys, setKyYeuKeys] = useState<KyYeuAdminKey[]>([]);
    const [videoExportKeys, setVideoExportKeys] = useState<VideoExportAdminKey[]>([]);
    const [videoTrials, setVideoTrials] = useState<InteractiveVideoTrial[]>([]);
    const [videoTrialAccounts, setVideoTrialAccounts] = useState<InteractiveVideoTrialEmail[]>([]);
    const [keySubTab, setKeySubTab] = useState<'pro' | 'bee' | 'skkn' | 'kyyeu' | 'videoExport' | 'videoTrial'>('pro');
    const [newNote, setNewNote] = useState('');
    const [newVideoExportLimit, setNewVideoExportLimit] = useState<1 | 10>(1);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [analytics, setAnalytics] = useState<Analytics>({ totalVisits: 0, uniqueVisitors: 0, todayVisits: 0, recentVisitors: [] });
    const [appUsageStats, setAppUsageStats] = useState<AppUsageSummary[]>([]);
    const [showAppUsageStats, setShowAppUsageStats] = useState(false);
    const startYearMeetingInfo = APP_INFO[START_YEAR_MEETING_APP_ID];
    const startYearMeetingStats = appUsageStats.find(item => item.appId === START_YEAR_MEETING_APP_ID);
    const isStartYearMeetingVisible = appVisibility.apps[START_YEAR_MEETING_APP_ID] !== false;

    // Feedback states
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [feedbackTab, setFeedbackTab] = useState<'pending' | 'approved'>('pending');
    const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
    const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
    const [editMessage, setEditMessage] = useState('');

    // Visit count states
    const [globalVisitCount, setGlobalVisitCount] = useState(0);
    const [newVisitCount, setNewVisitCount] = useState('');

    // Firebase visitors
    const [firebaseVisitors, setFirebaseVisitors] = useState<FirebaseVisitor[]>([]);

    // Login history states
    const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyLimit, setHistoryLimit] = useState(50);
    const [showHistorySearch, setShowHistorySearch] = useState(false);
    const [historyFilterDate, setHistoryFilterDate] = useState<'today' | null>(null);

    // Video store states
    const [videos, setVideos] = useState<AIVideo[]>([]);
    const [showVideoForm, setShowVideoForm] = useState(false);
    const [editingVideo, setEditingVideo] = useState<AIVideo | null>(null);
    const [videoForm, setVideoForm] = useState({
        title: '', description: '', thumbnail: '', price: 0, youtubeUrl: '', downloadUrl: '', author: 'Nguyễn Đức', rating: 5, isHot: false
    });

    // Orders states
    const [orders, setOrders] = useState<Order[]>([]);
    const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'confirmed'>('pending');

    // Image upload states
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [videoThumbnailUploadMessage, setVideoThumbnailUploadMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Initial load statistics
        loadStatistics();
        loadFeedbacks();
        loadGlobalVisitCount();
        loadFirebaseVisitors();

        // Initial load of history
        loadLoginHistory();

        // Subscribe to PRO keys from Firebase
        const unsubscribeProKeys = subscribeToProKeys((firebaseKeys) => {
            const formattedKeys = firebaseKeys.map(k => ({
                key: k.key,
                createdAt: new Date(k.createdAt).toLocaleDateString('vi-VN'),
                note: k.note,
                usedBy: k.usedBy
            }));
            setKeys(formattedKeys);
            // Backup to localStorage
            saveKeysToLocal(formattedKeys);
        });

        // Subscribe to BEE PRO keys from Firebase (separate path)
        const unsubscribeBeeKeys = subscribeToBeeProKeys((firebaseKeys) => {
            const formattedKeys = firebaseKeys.map(k => ({
                key: k.key,
                createdAt: new Date(k.createdAt).toLocaleDateString('vi-VN'),
                note: k.note,
                usedBy: k.usedBy
            }));
            setBeeKeys(formattedKeys);
        });

        // Subscribe to SKKN PRO keys
        const unsubscribeSkknKeys = subscribeToSKKNProKeys((firebaseKeys) => {
            const formattedKeys = firebaseKeys.map(k => ({
                key: k.key,
                createdAt: new Date(k.createdAt).toLocaleDateString('vi-VN'),
                note: k.note,
                usedBy: k.usedBy
            }));
            setSkknKeys(formattedKeys);
        });

        // Subscribe to KyYeu access codes
        const unsubscribeKyYeuKeys = subscribeToKyYeuAccessCodes((firebaseKeys) => {
            const formattedKeys = firebaseKeys.map(k => ({
                key: k.key,
                createdAt: new Date(k.createdAt).toLocaleDateString('vi-VN'),
                note: k.note,
                usedBy: k.usedBy,
                active: k.active !== false,
                usageCount: k.usageCount || 0,
                exportCount: k.exportCount || 0,
                exportLimit: k.exportLimit || 0,
                lastExportAt: k.lastExportAt,
                lastExportBy: k.lastExportBy,
                lastExportClass: k.lastExportClass,
                lastExportYear: k.lastExportYear
            }));
            setKyYeuKeys(formattedKeys);
        });

        const unsubscribeVideoExportKeys = subscribeToVideoExportCodes((firebaseKeys) => {
            const formattedKeys = firebaseKeys.map(k => ({
                key: k.key,
                createdAt: new Date(k.createdAt).toLocaleDateString('vi-VN'),
                note: k.note,
                usedBy: k.usedBy,
                active: k.active !== false,
                usageCount: k.usageCount || 0,
                exportCount: k.exportCount || 0,
                exportLimit: k.exportLimit || 0,
                lastExportAt: k.lastExportAt,
                lastExportBy: k.lastExportBy,
                lastExportTitle: k.lastExportTitle,
                lastExportType: k.lastExportType
            }));
            setVideoExportKeys(formattedKeys);
        });

        const unsubscribeVideoTrials = subscribeToInteractiveVideoTrials(setVideoTrials);
        const unsubscribeVideoTrialEmails = subscribeToInteractiveVideoTrialEmails(setVideoTrialAccounts);

        // Subscribe to videos
        const unsubscribeVideos = subscribeToVideos(setVideos);
        // Subscribe to orders
        const unsubscribeOrders = subscribeToOrders(setOrders);
        // Subscribe to app visibility
        const unsubscribeAppVis = subscribeToAppVisibility((state) => {
            setAppVisibility(state);
            setEditMaintenanceMsg(state.maintenanceMessage);
        });

        // Cập nhật thống kê mỗi 30 giây để tránh query quá nhiều
        const interval = setInterval(() => {
            loadStatistics();
        }, 30000);

        return () => {
            clearInterval(interval);
            unsubscribeProKeys();
            unsubscribeBeeKeys();
            unsubscribeSkknKeys();
            unsubscribeKyYeuKeys();
            unsubscribeVideoExportKeys();
            unsubscribeVideoTrials();
            unsubscribeVideoTrialEmails();
            unsubscribeVideos();
            unsubscribeOrders();
            unsubscribeAppVis();
        };
    }, []);


    useEffect(() => {
        // Reload history when filter changes
        if (historyFilterDate === 'today') {
            // Load nhiều hơn để đảm bảo thấy hết người hôm nay
            loadLoginHistory('', 200);
        } else {
            loadLoginHistory('', 50);
        }
    }, [historyFilterDate]);

    // Filter history for display
    const filteredHistory = loginHistory.filter(entry => {
        if (historyFilterDate === 'today') {
            const entryDate = new Date(entry.loginTime);
            const today = new Date();
            return entryDate.getDate() === today.getDate() &&
                entryDate.getMonth() === today.getMonth() &&
                entryDate.getFullYear() === today.getFullYear();
        }
        return true;
    });

    // Load statistics from Firebase Realtime Database
    const loadStatistics = async () => {
        try {
            const [visitStats, uniqueCount, todayCount, usageStats] = await Promise.all([
                getVisitStats(),
                getUniqueUserCount(),
                getTodayLoginCount(),
                getAppUsageSummaries()
            ]);

            setAnalytics(prev => ({
                ...prev,
                totalVisits: visitStats.totalVisits,
                uniqueVisitors: uniqueCount,
                todayVisits: todayCount
            }));
            setAppUsageStats(usageStats);
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    };

    const loadFeedbacks = async () => {
        setIsLoadingFeedbacks(true);
        const allFeedbacks = await getAllFeedbacks();
        setFeedbacks(allFeedbacks);
        setIsLoadingFeedbacks(false);
    };

    const loadGlobalVisitCount = async () => {
        const stats = await getVisitStats();
        setGlobalVisitCount(stats.totalVisits);
        setNewVisitCount(stats.totalVisits.toString());
    };

    const handleSetVisitCount = async () => {
        const count = parseInt(newVisitCount);
        if (isNaN(count) || count < 0) return;
        await setVisitCount(count);
        setGlobalVisitCount(count);
        setAnalytics(prev => ({
            ...prev,
            totalVisits: count
        }));
    };

    const loadFirebaseVisitors = async () => {
        const visitors = await getRecentVisitors(50);
        setFirebaseVisitors(visitors);
    };

    // Load login history
    const loadLoginHistory = async (search: string = '', limit: number = 50) => {
        setIsLoadingHistory(true);
        try {
            const history = search
                ? await searchLoginHistory(search, limit)
                : await getLoginHistory(limit);
            setLoginHistory(history);
        } catch (error) {
            console.error('Error loading login history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Handle search with debounce
    const handleHistorySearch = (term: string) => {
        setHistorySearchTerm(term);
        loadLoginHistory(term, historyLimit);
    };

    // Load more history
    const handleLoadMoreHistory = () => {
        const newLimit = historyLimit + 50;
        setHistoryLimit(newLimit);
        loadLoginHistory(historySearchTerm, newLimit);
    };

    // Initial load for login history
    useEffect(() => {
        loadLoginHistory();
    }, []);

    // Video handlers
    const resetVideoForm = () => {
        setVideoForm({ title: '', description: '', thumbnail: '', price: 0, youtubeUrl: '', downloadUrl: '', author: 'Nguyễn Đức', rating: 5, isHot: false });
        setEditingVideo(null);
        setVideoThumbnailUploadMessage('');
        setShowVideoForm(false);
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleVideoThumbnailUpload = async (file?: File) => {
        if (!file) return;
        setVideoThumbnailUploadMessage('');

        if (!isValidImage(file)) {
            alert('Vui lòng chọn ảnh JPG, PNG, GIF hoặc WEBP!');
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            alert('Ảnh bìa nên nhỏ hơn 15MB trước khi nén.');
            return;
        }

        setIsUploadingImage(true);
        try {
            const optimizedFile = await compressImageForUpload(file, {
                maxWidth: 1280,
                maxHeight: 720,
                quality: 0.82,
                outputType: 'image/webp'
            });
            const imageUrl = await uploadImage(optimizedFile, 'video-thumbnails');
            if (!imageUrl) {
                throw new Error('Upload failed');
            }

            setVideoForm(prev => ({ ...prev, thumbnail: imageUrl }));
            const savedBytes = file.size - optimizedFile.size;
            setVideoThumbnailUploadMessage(savedBytes > 0
                ? `Đã nén: ${formatBytes(file.size)} -> ${formatBytes(optimizedFile.size)}`
                : `Ảnh đã tối ưu: ${formatBytes(optimizedFile.size)}`);
        } catch (error) {
            console.error('Error uploading video cover:', error);
            alert('Không thể tải ảnh bìa lên. Vui lòng thử lại!');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleSaveVideo = async () => {
        if (!videoForm.title || !videoForm.youtubeUrl || isUploadingImage) return;
        if (editingVideo) {
            await updateVideo(editingVideo.id, videoForm);
        } else {
            await addVideo({ ...videoForm, createdAt: Date.now() });
        }
        resetVideoForm();
    };

    const handleEditVideo = (video: AIVideo) => {
        setEditingVideo(video);
        setVideoForm({
            title: video.title, description: video.description, thumbnail: video.thumbnail,
            price: video.price, youtubeUrl: video.youtubeUrl, downloadUrl: video.downloadUrl || '', author: video.author, rating: video.rating, isHot: video.isHot
        });
        setShowVideoForm(true);
    };

    const handleDeleteVideo = async (id: string) => {
        if (window.confirm('Xóa video này?')) await deleteVideo(id);
    };

    // Order handlers
    const handleConfirmOrder = async (orderId: string) => {
        await confirmOrder(orderId);
    };

    const handleCancelOrder = async (orderId: string) => {
        if (window.confirm('Hủy đơn hàng này?')) await cancelOrder(orderId);
    };

    const handleCopyVideoLinks = (order: Order) => {
        const links = order.items.map(item => item.youtubeUrl).join('\n');
        navigator.clipboard.writeText(links);
        alert('Đã copy ' + order.items.length + ' link video!');
    };

    const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter);

    const handleCreateKey = async () => {
        const newKey = generateRandomKey();
        const note = newNote || 'Khách hàng mới';

        // Lưu lên Firebase
        const success = await saveProKey(newKey, note);
        if (!success) {
            alert('Lỗi khi lưu mã lên Firebase!');
            return;
        }

        setNewNote('');
        setShowCreateForm(false);
        navigator.clipboard.writeText(newKey);
        setCopiedKey(newKey);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleDeleteKey = async (keyToDelete: string) => {
        if (window.confirm('Xóa mã này?')) {
            await deleteProKey(keyToDelete);
        }
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // BEE PRO key handlers (separate Firebase path: bee_pro_codes/)
    const handleCreateBeeKey = async () => {
        const newKey = generateBeeProCode(); // Generates BEE-XXXXXXXX
        const note = newNote || 'Khách hàng Ong về Tổ';

        const success = await saveBeeProKey(newKey, note);
        if (!success) {
            alert('Lỗi khi lưu mã BEE lên Firebase!');
            return;
        }

        setNewNote('');
        setShowCreateForm(false);
        navigator.clipboard.writeText(newKey);
        setCopiedKey(newKey);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleDeleteBeeKey = async (keyToDelete: string) => {
        if (window.confirm('Xóa mã BEE này?')) {
            await deleteBeeProKey(keyToDelete);
        }
    };

    // SKKN PRO key handlers
    const handleCreateSKKNKey = async () => {
        const newKey = generateSKKNProCode();
        const note = newNote || 'Khách hàng SKKN';
        const success = await saveSKKNProKey(newKey, note);
        if (!success) { alert('Lỗi khi lưu mã SKKN lên Firebase!'); return; }
        setNewNote('');
        setShowCreateForm(false);
        navigator.clipboard.writeText(newKey);
        setCopiedKey(newKey);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleDeleteSKKNKey = async (keyToDelete: string) => {
        if (window.confirm('Xóa mã SKKN này?')) {
            await deleteSKKNProKey(keyToDelete);
        }
    };

    const handleCreateKyYeuKey = async () => {
        const newKey = generateKyYeuAccessCode();
        const note = newNote || 'Mã Kỷ Yếu cộng đồng';
        const success = await saveKyYeuAccessCode(newKey, note);
        if (!success) {
            alert('Lỗi khi lưu mã Kỷ Yếu lên Firebase!');
            return;
        }

        setNewNote('');
        setShowCreateForm(false);
        navigator.clipboard.writeText(newKey);
        setCopiedKey(newKey);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleDeleteKyYeuKey = async (keyToDelete: string) => {
        if (window.confirm('Xóa hẳn mã Kỷ Yếu này? Người đã dùng mã này sẽ không vào được nữa.')) {
            await deleteKyYeuAccessCode(keyToDelete);
        }
    };

    const handleToggleKyYeuKey = async (keyToToggle: string, active: boolean) => {
        const action = active ? 'mở lại' : 'thu hồi';
        if (window.confirm(`Bạn muốn ${action} mã ${keyToToggle}?`)) {
            await setKyYeuAccessCodeActive(keyToToggle, active);
        }
    };

    const handleCreateVideoExportKey = async () => {
        const newKey = generateVideoExportCode();
        const note = newNote || `Mã xuất video ${newVideoExportLimit} lượt`;
        const success = await saveVideoExportCode(newKey, note, newVideoExportLimit);
        if (!success) {
            alert('Lỗi khi lưu mã xuất video lên Firebase!');
            return;
        }

        setNewNote('');
        setShowCreateForm(false);
        navigator.clipboard.writeText(newKey);
        setCopiedKey(newKey);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleDeleteVideoExportKey = async (keyToDelete: string) => {
        if (window.confirm('Xóa hẳn mã xuất video này? Người dùng sẽ không xuất được bằng mã này nữa.')) {
            await deleteVideoExportCode(keyToDelete);
        }
    };

    const handleToggleVideoExportKey = async (keyToToggle: string, active: boolean) => {
        const action = active ? 'mở lại' : 'thu hồi';
        if (window.confirm(`Bạn muốn ${action} mã ${keyToToggle}?`)) {
            await setVideoExportCodeActive(keyToToggle, active);
        }
    };

    const handleCopyVideoTrialCode = () => {
        handleCopyKey(INTERACTIVE_VIDEO_TRIAL_CODE);
    };

    const handleToggleVideoTrial = async (deviceId: string, active: boolean) => {
        const action = active ? 'mở lại' : 'thu hồi';
        if (window.confirm(`Bạn muốn ${action} dùng thử của thiết bị này?`)) {
            await setInteractiveVideoTrialActive(deviceId, active);
        }
    };

    const handleResetVideoTrialToday = async (deviceId: string) => {
        if (window.confirm('Reset dùng thử xuất file của thiết bị này về 0/3?')) {
            await resetInteractiveVideoTrialToday(deviceId);
        }
    };

    const handleDeleteVideoTrialAccount = async (email: string, deviceId: string) => {
        if (window.confirm(`Xóa tài khoản dùng thử ${email}? Nếu đây là Gmail cuối cùng của thiết bị, bản ghi thiết bị cũng sẽ bị xóa.`)) {
            await deleteInteractiveVideoTrialAccount(email, deviceId);
        }
    };

    const handleRevokeProEmail = async (email: string) => {
        if (window.confirm(`Thu hồi Pro của ${email}? Người dùng sẽ bị khóa tính năng Pro.`)) {
            const success = await revokeProForEmail(email);
            if (success) {
                alert(`Đã thu hồi Pro của ${email}`);
            } else {
                alert('Lỗi khi thu hồi!');
            }
        }
    };

    const handleRevokeBeeProEmail = async (email: string) => {
        if (window.confirm(`Thu hồi Pro BEE của ${email}? Người dùng sẽ bị khóa tính năng Pro Ong về Tổ.`)) {
            const success = await revokeBeeProForEmail(email);
            if (success) {
                alert(`Đã thu hồi Pro BEE của ${email}`);
            } else {
                alert('Lỗi khi thu hồi!');
            }
        }
    };

    const handleRevokeSKKNPro = async (email: string) => {
        if (window.confirm(`Thu hồi Pro của ${email}? Người dùng sẽ bị khóa tính năng Pro.`)) {
            const success = await revokeSKKNProForEmail(email);
            if (success) {
                alert(`Đã thu hồi Pro của ${email}`);
            } else {
                alert('Lỗi khi thu hồi!');
            }
        }
    };

    const handleApproveFeedback = async (id: string) => {
        await approveFeedback(id);
        await loadFeedbacks();
    };

    const handleRejectFeedback = async (id: string) => {
        await rejectFeedback(id);
        await loadFeedbacks();
    };

    const handleDeleteFeedback = async (id: string) => {
        console.log('Deleting feedback:', id);
        const result = await deleteFeedback(id);
        console.log('Delete result:', result);
        await loadFeedbacks();
    };

    const [editTeacherName, setEditTeacherName] = useState('');
    const [editSchoolName, setEditSchoolName] = useState('');

    const handleEditFeedback = (feedback: Feedback) => {
        setEditingFeedback(feedback);
        setEditMessage(feedback.message);
        setEditTeacherName(feedback.teacherName || '');
        setEditSchoolName(feedback.schoolName || '');
    };

    const handleSaveEdit = async () => {
        if (!editingFeedback || !editMessage.trim()) return;
        await updateFeedback(editingFeedback.id, editMessage.trim(), undefined, editTeacherName.trim(), editSchoolName.trim());
        setEditingFeedback(null);
        setEditMessage('');
        setEditTeacherName('');
        setEditSchoolName('');
        await loadFeedbacks();
    };

    const pendingFeedbacks = feedbacks.filter(f => f.status === 'pending');
    const approvedFeedbacks = feedbacks.filter(f => f.status === 'approved');

    return (
        <div className="h-screen p-3 sm:p-4 md:p-8">
            <div className="h-full bg-white/30 backdrop-blur-xl border border-white/40 rounded-[20px] sm:rounded-[30px] shadow-2xl p-4 sm:p-6 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <button onClick={onBack} className="flex items-center gap-1 sm:gap-2 text-purple-700 hover:text-purple-900 font-bold text-sm sm:text-base">
                        <ArrowLeft size={18} /> <span className="hidden sm:inline">Quay lại</span>
                    </button>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-purple-900">Trang Quản trị</h1>
                    <div className="w-12 sm:w-20"></div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-2 transition-all text-xs sm:text-base whitespace-nowrap ${activeTab === 'analytics'
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-white/50 text-purple-700 hover:bg-white/80'
                            }`}
                    >
                        <BarChart3 size={18} /> <span className="hidden sm:inline">Thống kê</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('feedbacks')}
                        className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-2 transition-all text-xs sm:text-base whitespace-nowrap ${activeTab === 'feedbacks'
                            ? 'bg-pink-600 text-white shadow-lg'
                            : 'bg-white/50 text-pink-700 hover:bg-white/80'
                            }`}
                    >
                        <MessageCircle size={18} /> <span className="hidden sm:inline">Bình luận</span>
                        {pendingFeedbacks.length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingFeedbacks.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('keys')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs sm:text-base ${activeTab === 'keys'
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-white/50 text-purple-700 hover:bg-white/80'
                            }`}
                    >
                        <Key size={18} /> <span className="hidden sm:inline">Mã Pro</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-2 transition-all text-xs sm:text-base whitespace-nowrap ${activeTab === 'videos'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white/50 text-blue-700 hover:bg-white/80'
                            }`}
                    >
                        <Film size={18} /> <span className="hidden sm:inline">Video</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-2 transition-all text-xs sm:text-base whitespace-nowrap ${activeTab === 'orders'
                            ? 'bg-orange-600 text-white shadow-lg'
                            : 'bg-white/50 text-orange-700 hover:bg-white/80'
                            }`}
                    >
                        <ShoppingBag size={18} /> <span className="hidden sm:inline">Đơn hàng</span>
                        {orders.filter(o => o.status === 'pending').length > 0 && (
                            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{orders.filter(o => o.status === 'pending').length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('apps')}
                        className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-2 transition-all text-xs sm:text-base whitespace-nowrap ${activeTab === 'apps'
                            ? 'bg-teal-600 text-white shadow-lg'
                            : 'bg-white/50 text-teal-700 hover:bg-white/80'
                            }`}
                    >
                        📱 <span className="hidden sm:inline">Ứng dụng</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                    {activeTab === 'analytics' && (
                        <div className="h-full flex flex-col">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white text-center shadow-lg">
                                    <div className="text-2xl sm:text-3xl font-bold">{analytics.totalVisits}</div>
                                    <div className="text-xs sm:text-sm opacity-80">Tổng lượt truy cập</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white text-center shadow-lg">
                                    <div className="text-2xl sm:text-3xl font-bold">{analytics.uniqueVisitors}</div>
                                    <div className="text-xs sm:text-sm opacity-80">Người dùng</div>
                                </div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setHistoryFilterDate(historyFilterDate === 'today' ? null : 'today')}
                                    className={`bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white text-center shadow-lg cursor-pointer transition-all ${historyFilterDate === 'today' ? 'ring-4 ring-green-300 transform scale-105' : ''}`}
                                >
                                    <div className="text-2xl sm:text-3xl font-bold">
                                        {historyFilterDate === 'today' ? filteredHistory.length : analytics.todayVisits}
                                    </div>
                                    <div className="text-xs sm:text-sm opacity-80 flex items-center justify-center gap-1">
                                        Hôm nay {historyFilterDate === 'today' && <CheckCircle size={12} />}
                                    </div>
                                </motion.div>
                            </div>

                            {/* Global Visit Count Control */}
                            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 mb-4 shadow-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <Eye size={18} className="text-white" />
                                    <span className="text-white font-bold">Lượt truy cập toàn cầu (Firebase)</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={newVisitCount}
                                        onChange={(e) => setNewVisitCount(e.target.value)}
                                        className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white font-bold text-center text-lg focus:outline-none focus:border-white/60"
                                        min="0"
                                    />
                                    <button
                                        onClick={handleSetVisitCount}
                                        className="px-4 py-2 bg-white text-emerald-600 font-bold rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={16} /> Lưu
                                    </button>
                                </div>
                                <p className="text-white/70 text-xs mt-2">Hiện tại: {globalVisitCount.toLocaleString('vi-VN')} lượt (hiển thị ở Footer)</p>
                            </div>

                            {/* App Usage Statistics */}
                            <div className="bg-white rounded-xl border border-purple-100 p-4 mb-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 className="font-bold text-purple-800 flex items-center gap-2">
                                        <BarChart3 size={18} /> Thống kê sử dụng công cụ
                                    </h3>
                                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                        Từ bản cập nhật này
                                    </span>
                                    <button
                                        onClick={() => setShowAppUsageStats(!showAppUsageStats)}
                                        className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-full transition-colors"
                                    >
                                        {showAppUsageStats ? 'Thu gọn' : 'Mở ra'}
                                        <ChevronDown size={14} className={`transition-transform ${showAppUsageStats ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                                <p className={`text-xs text-gray-500 mb-3 ${showAppUsageStats ? 'block' : 'hidden'}`}>
                                    Dữ liệu cũ trước đây chỉ có lượt truy cập/đăng nhập. Lượt mở từng công cụ bắt đầu ghi nhận từ lúc bật tracking này.
                                </p>
                                {showAppUsageStats && (
                                    <div className="mb-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-3">
                                        <div className="flex items-center gap-3">
                                            <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-xl shadow-sm">
                                                {startYearMeetingInfo.icon}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-black text-emerald-900">{startYearMeetingInfo.name}</div>
                                                <div className="text-[11px] font-semibold text-emerald-700">
                                                    {startYearMeetingStats?.today || 0} hôm nay • {startYearMeetingStats?.last7Days || 0} trong 7 ngày • {startYearMeetingStats?.uniqueUsers || 0} người dùng
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-emerald-800">{startYearMeetingStats?.total || 0}</div>
                                                <button
                                                    onClick={() => setAppVisible(START_YEAR_MEETING_APP_ID, !isStartYearMeetingVisible)}
                                                    className={`mt-1 rounded-full px-3 py-1 text-[11px] font-black transition-colors ${isStartYearMeetingVisible ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'}`}
                                                >
                                                    {isStartYearMeetingVisible ? 'Đang bật' : 'Đã tắt'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className={`space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar ${showAppUsageStats ? 'block' : 'hidden'}`}>
                                    {appUsageStats.length === 0 ? (
                                        <div className="text-center text-gray-500 py-4 text-sm">Chưa có dữ liệu mở công cụ.</div>
                                    ) : (
                                        appUsageStats.map((item, index) => {
                                            const maxTotal = Math.max(...appUsageStats.map(s => s.total), 1);
                                            const width = Math.max((item.total / maxTotal) * 100, item.total > 0 ? 8 : 0);
                                            const isEnabled = appVisibility.apps[item.appId] !== false;
                                            return (
                                                <div key={item.appId} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-6 text-xs font-black text-purple-500">#{index + 1}</span>
                                                        <span className="text-base">{APP_INFO[item.appId]?.icon || '▦'}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-sm font-bold text-gray-800">{item.appName}</div>
                                                            <div className="text-[11px] text-gray-500">
                                                                {item.today} hôm nay • {item.last7Days} trong 7 ngày • {item.uniqueUsers} người dùng
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-black text-purple-700">{item.total}</div>
                                                            <div className={`text-[10px] font-bold ${isEnabled ? 'text-green-600' : 'text-red-500'}`}>
                                                                {isEnabled ? 'Đang bật' : 'Đã tắt'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
                                                        <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${width}%` }} />
                                                    </div>
                                                    {item.recentUsers && item.recentUsers.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                                                                Gần nhất
                                                            </span>
                                                            {item.recentUsers.map((recentUser, recentIndex) => (
                                                                <span
                                                                    key={`${item.appId}-${recentUser.userEmail || recentUser.userId || recentUser.userName}-${recentIndex}`}
                                                                    className="max-w-full truncate rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200"
                                                                    title={`${recentUser.userName || 'Khách'}${recentUser.userEmail ? ` - ${recentUser.userEmail}` : ''}${recentUser.device ? ` - ${recentUser.device}` : ''}`}
                                                                >
                                                                    {recentUser.userEmail || recentUser.userName || 'Khách'}
                                                                    {recentUser.lastUsedAt ? ` • ${formatAppUsageDateTime(recentUser.lastUsedAt)}` : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Login History Section - Moved up to replace legacy visitors */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                    <h3 className="font-bold text-purple-800 flex items-center gap-2">
                                        <Users size={18} /> {historyFilterDate === 'today' ? 'Truy cập hôm nay' : 'Người dùng gần đây'}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                            {filteredHistory.length} lượt
                                        </span>
                                        <button
                                            onClick={() => {
                                                setShowHistorySearch(!showHistorySearch);
                                                if (showHistorySearch && historySearchTerm) {
                                                    setHistorySearchTerm('');
                                                    loadLoginHistory('', historyLimit);
                                                }
                                            }}
                                            className={`p-2 rounded-xl transition-colors ${showHistorySearch ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                                            title="Tìm kiếm"
                                        >
                                            <Search size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Search - Chỉ hiện khi nhấn nút */}
                                <AnimatePresence>
                                    {showHistorySearch && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mb-3 overflow-hidden flex-shrink-0"
                                        >
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={historySearchTerm}
                                                    onChange={(e) => handleHistorySearch(e.target.value)}
                                                    placeholder="Tìm kiếm theo tên hoặc email..."
                                                    className="w-full pl-10 pr-4 py-2.5 border-2 border-purple-300 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-sm"
                                                    autoFocus
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {isLoadingHistory ? (
                                    <div className="text-center py-8">
                                        <Loader2 size={24} className="animate-spin mx-auto text-purple-500" />
                                        <p className="text-gray-500 text-sm mt-2">Đang tải lịch sử...</p>
                                    </div>
                                ) : loginHistory.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        <Users size={40} className="mx-auto mb-3 opacity-30" />
                                        <p>{historySearchTerm ? 'Không tìm thấy kết quả' : 'Chưa có người dùng nào'}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1 overflow-y-auto pr-1 flex-1 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                                            {filteredHistory.map((entry, index) => (
                                                <motion.div
                                                    key={`${entry.id}-${entry.loginTime}-${index}`}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="bg-white rounded-lg p-2 flex items-center gap-2 border border-purple-100 hover:bg-purple-50 transition-colors"
                                                >
                                                    <img
                                                        src={entry.avatar}
                                                        alt={entry.name}
                                                        className="w-8 h-8 rounded-full object-cover border border-purple-200 flex-shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-800 text-sm truncate">{entry.name}</div>
                                                        <div className="text-xs text-purple-600 truncate flex items-center gap-1">
                                                            <Mail size={9} />
                                                            {entry.email || 'No email'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <Clock size={9} />
                                                            {new Date(entry.loginTime).toLocaleString('vi-VN')}
                                                            <Monitor size={9} className="ml-2" />
                                                            {entry.device}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                        {loginHistory.length >= historyLimit && (
                                            <button
                                                onClick={handleLoadMoreHistory}
                                                className="w-full mt-3 py-2 bg-purple-100 text-purple-700 rounded-xl font-semibold text-sm hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} /> Tải thêm
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'feedbacks' && (
                        <div className="h-full flex flex-col">
                            {/* Feedback Sub-tabs */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setFeedbackTab('pending')}
                                    className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${feedbackTab === 'pending'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                        }`}
                                >
                                    Chờ duyệt ({pendingFeedbacks.length})
                                </button>
                                <button
                                    onClick={() => setFeedbackTab('approved')}
                                    className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${feedbackTab === 'approved'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        }`}
                                >
                                    Đã duyệt ({approvedFeedbacks.length})
                                </button>
                            </div>

                            {/* Feedback List */}
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {isLoadingFeedbacks ? (
                                    <div className="text-center py-10">
                                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    </div>
                                ) : (
                                    <>
                                        {(feedbackTab === 'pending' ? pendingFeedbacks : approvedFeedbacks).length === 0 ? (
                                            <div className="text-center text-gray-500 py-10">
                                                <MessageCircle size={48} className="mx-auto mb-4 opacity-30" />
                                                <p>{feedbackTab === 'pending' ? 'Không có bình luận chờ duyệt' : 'Chưa có bình luận nào được duyệt'}</p>
                                            </div>
                                        ) : (
                                            (feedbackTab === 'pending' ? pendingFeedbacks : approvedFeedbacks).map((feedback) => (
                                                <motion.div
                                                    key={feedback.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-white rounded-xl p-4 shadow-sm"
                                                >
                                                    {/* User Info */}
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <img
                                                            src={feedback.userAvatar}
                                                            alt={feedback.userName}
                                                            className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-bold text-gray-800">
                                                                {feedback.teacherName || feedback.userName}
                                                            </div>
                                                            {feedback.schoolName && (
                                                                <div className="text-xs text-purple-600 mb-0.5">{feedback.schoolName}</div>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        size={14}
                                                                        fill={feedback.rating >= star ? '#fbbf24' : 'none'}
                                                                        className={feedback.rating >= star ? 'text-yellow-400' : 'text-gray-300'}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(feedback.createdAt).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    </div>

                                                    {/* Message */}
                                                    <p className="text-gray-700 text-sm mb-3 italic">"{feedback.message}"</p>

                                                    {/* Actions */}
                                                    <div className="flex gap-2">
                                                        {feedbackTab === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApproveFeedback(feedback.id)}
                                                                    className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-1"
                                                                >
                                                                    <Check size={16} /> Duyệt
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectFeedback(feedback.id)}
                                                                    className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-1"
                                                                >
                                                                    <X size={16} /> Từ chối
                                                                </button>
                                                            </>
                                                        )}
                                                        {feedbackTab === 'approved' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEditFeedback(feedback)}
                                                                    className="py-2 px-3 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg font-semibold text-sm flex items-center gap-1"
                                                                >
                                                                    <Edit2 size={16} /> Sửa
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteFeedback(feedback.id)}
                                                                    className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg font-semibold text-sm flex items-center gap-1"
                                                                >
                                                                    <Trash2 size={16} /> Xóa
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'keys' && (
                        <div className="h-full flex flex-col">
                            {/* Sub-tabs for PRO vs BEE keys */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <button
                                    onClick={() => setKeySubTab('pro')}
                                    className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${keySubTab === 'pro'
                                        ? 'bg-purple-600 text-white shadow-lg'
                                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                        }`}
                                >
                                    <Key size={16} /> PRO- Giải Mã Bức Tranh ({keys.length})
                                </button>
                                <button
                                    onClick={() => setKeySubTab('bee')}
                                    className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${keySubTab === 'bee'
                                        ? 'bg-orange-500 text-white shadow-lg'
                                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                        }`}
                                >
                                    🐝 BEE- Ong về Tổ ({beeKeys.length})
                                </button>
                                <button
                                    onClick={() => setKeySubTab('skkn')}
                                    className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${keySubTab === 'skkn'
                                        ? 'bg-emerald-500 text-white shadow-lg'
                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        }`}
                                >
                                    ✍️ SKKN- Viết SKKN ({skknKeys.length})
                                </button>
                                <button
                                    onClick={() => setKeySubTab('kyyeu')}
                                    className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${keySubTab === 'kyyeu'
                                        ? 'bg-rose-500 text-white shadow-lg'
                                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                        }`}
                                >
                                    🎓 Kỷ Yếu ({kyYeuKeys.length})
                                </button>
                                <button
                                    onClick={() => setKeySubTab('videoExport')}
                                    className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${keySubTab === 'videoExport'
                                        ? 'bg-sky-500 text-white shadow-lg'
                                        : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                                        }`}
                                >
                                    Video xuất ({videoExportKeys.length})
                                </button>
                                <button
                                    onClick={() => setKeySubTab('videoTrial')}
                                    className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${keySubTab === 'videoTrial'
                                        ? 'bg-indigo-500 text-white shadow-lg'
                                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                        }`}
                                >
                                    Video dùng thử ({videoTrialAccounts.length}/{videoTrials.length})
                                </button>
                            </div>

                            {/* Button tao ma */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => keySubTab === 'videoTrial' ? handleCopyVideoTrialCode() : setShowCreateForm(true)}
                                className={`w-full text-white font-bold py-4 px-6 rounded-2xl shadow-lg mb-4 flex items-center justify-center gap-2 ${keySubTab === 'pro'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                    : keySubTab === 'bee'
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                                        : keySubTab === 'skkn'
                                            ? 'bg-gradient-to-r from-teal-500 to-emerald-600'
                                            : keySubTab === 'videoExport'
                                                ? 'bg-gradient-to-r from-sky-500 to-blue-600'
                                                : keySubTab === 'videoTrial'
                                                    ? 'bg-gradient-to-r from-indigo-500 to-sky-600'
                                                    : 'bg-gradient-to-r from-rose-500 to-pink-600'
                                    }`}
                            >
                                {keySubTab === 'videoTrial' && copiedKey === INTERACTIVE_VIDEO_TRIAL_CODE ? <CheckCircle size={24} /> : <Plus size={24} />}
                                {keySubTab === 'pro' ? 'Tạo mã PRO- (Giải Mã Bức Tranh)' : keySubTab === 'bee' ? 'Tạo mã BEE- (Ong về Tổ)' : keySubTab === 'skkn' ? 'Tạo mã SKKN- (Viết SKKN)' : keySubTab === 'videoExport' ? 'Tạo mã VIDX- (Video xuất file)' : keySubTab === 'videoTrial' ? (copiedKey === INTERACTIVE_VIDEO_TRIAL_CODE ? 'Đã copy mã dùng thử' : `Copy mã dùng thử: ${INTERACTIVE_VIDEO_TRIAL_CODE}`) : 'Tạo mã KYYEU- (Kỷ Yếu)'}
                            </motion.button>

                            <AnimatePresence>
                                {showCreateForm && keySubTab !== 'videoTrial' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-white rounded-2xl p-4 mb-4 shadow-lg"
                                    >
                                        <div className={`text-sm font-semibold mb-2 ${keySubTab === 'pro' ? 'text-purple-600' : keySubTab === 'bee' ? 'text-orange-600' : keySubTab === 'skkn' ? 'text-emerald-600' : keySubTab === 'videoExport' ? 'text-sky-600' : 'text-rose-600'}`}>
                                            {keySubTab === 'pro' ? 'Tạo mã PRO- cho Giải Mã Bức Tranh - Pro 49.000đ' : keySubTab === 'bee' ? 'Tạo mã BEE- (chỉ dùng cho Ong về Tổ)' : keySubTab === 'skkn' ? 'Tạo mã SKKN- (chỉ dùng cho Viết SKKN)' : keySubTab === 'videoExport' ? 'Tạo mã VIDX- cho xuất file video tương tác' : 'Tạo mã KYYEU- (thu hồi được, dùng cho app Kỷ Yếu)'}
                                        </div>
                                        <input
                                            type="text"
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Ghi chú (tên khách, SĐT...)"
                                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none mb-3 ${keySubTab === 'pro'
                                                ? 'border-purple-200 focus:border-purple-500'
                                                : keySubTab === 'bee'
                                                    ? 'border-orange-200 focus:border-orange-500'
                                                    : keySubTab === 'skkn'
                                                        ? 'border-emerald-200 focus:border-emerald-500'
                                                        : keySubTab === 'videoExport'
                                                            ? 'border-sky-200 focus:border-sky-500'
                                                            : 'border-rose-200 focus:border-rose-500'
                                                }`}
                                        />
                                        {keySubTab === 'videoExport' && (
                                            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-sky-50 p-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewVideoExportLimit(1)}
                                                    className={`rounded-lg px-3 py-2 text-sm font-bold ${newVideoExportLimit === 1 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700'}`}
                                                >
                                                    1 lượt - 20k
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewVideoExportLimit(10)}
                                                    className={`rounded-lg px-3 py-2 text-sm font-bold ${newVideoExportLimit === 10 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700'}`}
                                                >
                                                    10 lượt - 100k
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={keySubTab === 'pro' ? handleCreateKey : keySubTab === 'bee' ? handleCreateBeeKey : keySubTab === 'skkn' ? handleCreateSKKNKey : keySubTab === 'videoExport' ? handleCreateVideoExportKey : handleCreateKyYeuKey}
                                                className={`flex-1 text-white font-bold py-2 rounded-xl ${keySubTab === 'pro'
                                                    ? 'bg-purple-600 hover:bg-purple-700'
                                                    : keySubTab === 'bee'
                                                        ? 'bg-orange-500 hover:bg-orange-600'
                                                        : keySubTab === 'skkn'
                                                            ? 'bg-emerald-500 hover:bg-emerald-600'
                                                            : keySubTab === 'videoExport'
                                                                ? 'bg-sky-500 hover:bg-sky-600'
                                                                : 'bg-rose-500 hover:bg-rose-600'
                                                    }`}
                                            >
                                                Tạo & Copy
                                            </button>
                                            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl">
                                                Hủy
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex-1 overflow-y-auto space-y-3">
                                {keySubTab === 'pro' ? (
                                    // PRO Keys List
                                    keys.length === 0 ? (
                                        <div className="text-center text-gray-500 py-10">
                                            <Key size={48} className="mx-auto mb-4 opacity-30" />
                                            <p>Chưa có mã PRO nào</p>
                                        </div>
                                    ) : keys.map((item) => (
                                        <motion.div key={item.key} className="bg-white rounded-2xl p-4 shadow-md flex items-center justify-between">
                                            <div>
                                                <div className="font-mono text-lg font-bold text-purple-800 flex items-center gap-2">
                                                    {item.key}
                                                    {copiedKey === item.key && <span className="text-green-500 text-sm"><CheckCircle size={14} /> Đã copy!</span>}
                                                </div>
                                                <div className="text-sm text-gray-500">{item.note} • {item.createdAt}</div>
                                                <div className="mt-1 inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700">
                                                    Giải Mã Bức Tranh - Pro 49.000đ
                                                </div>
                                                {item.usedBy && (
                                                    <div className="text-xs text-green-600 flex items-center gap-2">
                                                        ✅ Đã dùng: {item.usedBy}
                                                        <button
                                                            onClick={() => handleRevokeProEmail(item.usedBy!)}
                                                            className="ml-1 px-2 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200 text-xs font-bold"
                                                        >
                                                            ❌ Thu hồi Pro
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopyKey(item.key)} className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                                                    <Copy size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteKey(item.key)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : keySubTab === 'bee' ? (
                                    // BEE Keys List
                                    beeKeys.length === 0 ? (
                                        <div className="text-center text-gray-500 py-10">
                                            <span className="text-5xl block mb-4">🐝</span>
                                            <p>Chưa có mã BEE nào</p>
                                            <p className="text-sm mt-2">Mã BEE chỉ dùng được cho game "Ong về Tổ (Tự soạn)"</p>
                                        </div>
                                    ) : beeKeys.map((item) => (
                                        <motion.div key={item.key} className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 shadow-md flex items-center justify-between border border-orange-200">
                                            <div>
                                                <div className="font-mono text-lg font-bold text-orange-700 flex items-center gap-2">
                                                    🐝 {item.key}
                                                    {copiedKey === item.key && <span className="text-green-500 text-sm"><CheckCircle size={14} /> Đã copy!</span>}
                                                </div>
                                                <div className="text-sm text-gray-500">{item.note} • {item.createdAt}</div>
                                                {item.usedBy && (
                                                    <div className="text-xs text-green-600 flex items-center gap-2">
                                                        ✅ Đã dùng: {item.usedBy}
                                                        <button
                                                            onClick={() => handleRevokeBeeProEmail(item.usedBy!)}
                                                            className="ml-1 px-2 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200 text-xs font-bold"
                                                        >
                                                            ❌ Thu hồi Pro
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopyKey(item.key)} className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                                                    <Copy size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteBeeKey(item.key)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : keySubTab === 'skkn' ? (
                                    // SKKN Keys List
                                    skknKeys.length === 0 ? (
                                        <div className="text-center text-gray-500 py-10">
                                            <span className="text-5xl block mb-4">✍️</span>
                                            <p>Chưa có mã SKKN nào</p>
                                            <p className="text-sm mt-2">Mã SKKN chỉ dùng được cho ứng dụng "Viết SKKN & Báo Cáo"</p>
                                        </div>
                                    ) : skknKeys.map((item) => (
                                        <motion.div key={item.key} className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 shadow-md flex items-center justify-between border border-emerald-200">
                                            <div>
                                                <div className="font-mono text-lg font-bold text-emerald-700 flex items-center gap-2">
                                                    ✍️ {item.key}
                                                    {copiedKey === item.key && <span className="text-green-500 text-sm"><CheckCircle size={14} /> Đã copy!</span>}
                                                </div>
                                                <div className="text-sm text-gray-500">{item.note} • {item.createdAt}</div>
                                                {item.usedBy && (
                                                    <div className="text-xs text-green-600 flex items-center gap-2">
                                                        ✅ Đã dùng: {item.usedBy}
                                                        <button
                                                            onClick={() => handleRevokeSKKNPro(item.usedBy!)}
                                                            className="ml-1 px-2 py-0.5 rounded bg-red-100 text-red-600 hover:bg-red-200 text-xs font-bold"
                                                        >
                                                            ❌ Thu hồi Pro
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopyKey(item.key)} className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                                                    <Copy size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteSKKNKey(item.key)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : keySubTab === 'videoExport' ? (
                                    videoExportKeys.length === 0 ? (
                                        <div className="text-center text-gray-500 py-10">
                                            <Package size={48} className="mx-auto mb-4 opacity-30" />
                                            <p>Chưa có mã VIDX nào</p>
                                            <p className="text-sm mt-2">Mã VIDX dùng để trừ lượt khi xuất HTML5/SCORM trong Video tương tác.</p>
                                        </div>
                                    ) : videoExportKeys.map((item) => (
                                        <motion.div key={item.key} className={`rounded-2xl p-4 shadow-md flex items-center justify-between border ${item.active ? 'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200' : 'bg-gray-100 border-gray-200 opacity-75'}`}>
                                            <div>
                                                <div className={`font-mono text-lg font-bold flex items-center gap-2 ${item.active ? 'text-sky-700' : 'text-gray-500'}`}>
                                                    {item.key}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {item.active ? 'Đang mở' : 'Đã thu hồi'}
                                                    </span>
                                                    {copiedKey === item.key && <span className="text-green-500 text-sm"><CheckCircle size={14} /> Đã copy!</span>}
                                                </div>
                                                <div className="text-sm text-gray-500">{item.note} • {item.createdAt}</div>
                                                <div className={`mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-bold ${(item.exportCount || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    <Package size={14} />
                                                    <span>Lượt xuất: {item.exportCount || 0}/{item.exportLimit || 0}</span>
                                                </div>
                                                {(item.usedBy || item.lastExportBy || item.lastExportAt || item.lastExportTitle) && (
                                                    <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                                                        {item.usedBy && <div>Gmail gắn mã: <span className="font-semibold text-gray-800">{item.usedBy}</span></div>}
                                                        {item.lastExportBy && <div>Gmail xuất gần nhất: <span className="font-semibold text-gray-800">{item.lastExportBy}</span></div>}
                                                        {item.lastExportTitle && <div>Bài xuất gần nhất: <span className="font-semibold text-gray-800">{item.lastExportTitle}</span></div>}
                                                        {item.lastExportType && <div>Định dạng: <span className="font-semibold text-gray-800">{item.lastExportType}</span></div>}
                                                        {item.lastExportAt && <div>Thời điểm xuất: <span className="font-semibold text-gray-800">{formatKyYeuDateTime(item.lastExportAt)}</span></div>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopyKey(item.key)} className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200" title="Copy mã">
                                                    <Copy size={18} />
                                                </button>
                                                <button onClick={() => handleToggleVideoExportKey(item.key, !item.active)} className={`p-2 rounded-lg ${item.active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`} title={item.active ? 'Thu hồi mã' : 'Mở lại mã'}>
                                                    {item.active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                                <button onClick={() => handleDeleteVideoExportKey(item.key)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200" title="Xóa mã">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : keySubTab === 'videoTrial' ? (
                                    <div className="space-y-3">
                                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <div className="text-sm font-bold text-indigo-700">Mã dùng thử chung cho Video tương tác</div>
                                                    <div className="mt-1 font-mono text-xl font-black text-indigo-900">{INTERACTIVE_VIDEO_TRIAL_CODE}</div>
                                                    <div className="mt-1 text-sm text-indigo-700">Dùng thử {INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT} lần xuất file. Khóa theo Gmail và thiết bị.</div>
                                                </div>
                                                <button onClick={handleCopyVideoTrialCode} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold text-white transition ${copiedKey === INTERACTIVE_VIDEO_TRIAL_CODE ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                                    {copiedKey === INTERACTIVE_VIDEO_TRIAL_CODE ? <CheckCircle size={18} /> : <Copy size={18} />}
                                                    {copiedKey === INTERACTIVE_VIDEO_TRIAL_CODE ? 'Đã copy' : 'Copy mã'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                                            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                                <div>
                                                    <div className="text-sm font-bold text-sky-700">Tài khoản đã kích hoạt dùng thử</div>
                                                    <div className="text-xs text-sky-700">Cập nhật theo Gmail, thiết bị và lượt xuất thử đã dùng.</div>
                                                </div>
                                                <div className="text-xs font-bold text-sky-800">{videoTrialAccounts.length} tài khoản</div>
                                            </div>
                                            {videoTrialAccounts.length === 0 ? (
                                                <div className="rounded-xl bg-white/70 px-3 py-3 text-sm text-slate-500">Chưa có Gmail nào kích hoạt mã dùng thử.</div>
                                            ) : (
                                                <div className="grid gap-2 lg:grid-cols-2">
                                                    {videoTrialAccounts.map((account) => {
                                                        const linkedTrial = videoTrials.find((trial) => trial.deviceId === account.deviceId);
                                                        const usedCount = Math.max(0, Number(linkedTrial?.exportUsageCount ?? account.exportUsageCount) || 0);
                                                        const lastUsedAt = account.lastUsedAt || linkedTrial?.lastUsedAt;
                                                        const accountActive = Boolean(linkedTrial && linkedTrial.active !== false && usedCount < INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT);

                                                        return (
                                                            <div key={`${account.email}-${account.deviceId}`} className="rounded-xl bg-white px-3 py-3 shadow-sm">
                                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-sm font-bold text-slate-900">{account.email}</div>
                                                                        <div className="mt-1 truncate font-mono text-xs text-slate-500">{account.deviceId}</div>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                                                        <button
                                                                            type="button"
                                                                            disabled={!linkedTrial}
                                                                            onClick={() => handleToggleVideoTrial(account.deviceId, !accountActive)}
                                                                            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${accountActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                                                                        >
                                                                            {accountActive ? 'Thu hồi' : 'Mở lại'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={!linkedTrial}
                                                                            onClick={() => handleResetVideoTrialToday(account.deviceId)}
                                                                            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
                                                                        >
                                                                            Reset 3 lần
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteVideoTrialAccount(account.email, account.deviceId)}
                                                                            className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-200"
                                                                        >
                                                                            Xóa
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                                                                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-indigo-700">Đã xuất: {usedCount}/{INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT}</span>
                                                                    <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-slate-700">Kích hoạt: {formatKyYeuDateTime(account.startedAt)}</span>
                                                                    {lastUsedAt && <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">Dùng gần nhất: {formatKyYeuDateTime(lastUsedAt)}</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {videoTrials.length === 0 ? (
                                            <div className="text-center text-gray-500 py-10">
                                                <Monitor size={48} className="mx-auto mb-4 opacity-30" />
                                                <p>Chưa có thiết bị nào kích hoạt dùng thử Video tương tác</p>
                                            </div>
                                        ) : videoTrials.map((item) => {
                                            const usedCount = Math.max(0, Number(item.exportUsageCount) || 0);
                                            const exhausted = usedCount >= INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT;
                                            const active = item.active !== false && !exhausted;

                                            return (
                                                <motion.div key={item.deviceId} className={`rounded-2xl p-4 shadow-md border ${active ? 'bg-gradient-to-r from-indigo-50 to-sky-50 border-indigo-200' : 'bg-gray-100 border-gray-200 opacity-80'}`}>
                                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-mono text-base font-black text-indigo-800">{item.deviceId}</span>
                                                                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-green-100 text-green-700' : exhausted ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {active ? 'Đang dùng' : exhausted ? 'Hết lượt' : 'Đã thu hồi'}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1 text-sm text-gray-600">
                                                                Gmail chính: <span className="font-semibold text-gray-900">{item.primaryEmail}</span>
                                                            </div>
                                                            {(item.emails || []).length > 1 && (
                                                                <div className="mt-1 text-xs text-gray-500">
                                                                    Gmail đã dùng trên máy này: {(item.emails || []).join(', ')}
                                                                </div>
                                                            )}
                                                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                                                                <span className="rounded-lg bg-white px-2.5 py-1 text-indigo-700">Đã xuất: {usedCount}/{INTERACTIVE_VIDEO_TRIAL_EXPORT_LIMIT}</span>
                                                                <span className="rounded-lg bg-white px-2.5 py-1 text-slate-700">Bắt đầu: {formatKyYeuDateTime(item.startedAt)}</span>
                                                                {item.lastUsedAt && <span className="rounded-lg bg-white px-2.5 py-1 text-slate-700">Dùng gần nhất: {formatKyYeuDateTime(item.lastUsedAt)}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 lg:justify-end">
                                                            <button onClick={() => handleToggleVideoTrial(item.deviceId, !item.active)} className={`rounded-lg px-3 py-2 text-sm font-bold ${item.active !== false ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                                                {item.active !== false ? 'Thu hồi' : 'Mở lại'}
                                                            </button>
                                                            <button onClick={() => handleResetVideoTrialToday(item.deviceId)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
                                                                Reset 3 lần
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    kyYeuKeys.length === 0 ? (
                                        <div className="text-center text-gray-500 py-10">
                                            <span className="text-5xl block mb-4">🎓</span>
                                            <p>Chưa có mã Kỷ Yếu nào</p>
                                            <p className="text-sm mt-2">Mã KYYEU dùng cho app Kỷ Yếu Cuối Năm, có thể thu hồi bất kỳ lúc nào.</p>
                                        </div>
                                    ) : kyYeuKeys.map((item) => (
                                        <motion.div key={item.key} className={`rounded-2xl p-4 shadow-md flex items-center justify-between border ${item.active ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200' : 'bg-gray-100 border-gray-200 opacity-75'}`}>
                                            <div>
                                                <div className={`font-mono text-lg font-bold flex items-center gap-2 ${item.active ? 'text-rose-700' : 'text-gray-500'}`}>
                                                    🎓 {item.key}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {item.active ? 'Đang mở' : 'Đã thu hồi'}
                                                    </span>
                                                    {copiedKey === item.key && <span className="text-green-500 text-sm"><CheckCircle size={14} /> Đã copy!</span>}
                                                </div>
                                                <div className="text-sm text-gray-500">{item.note} • {item.createdAt}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Lượt kích hoạt: {item.usageCount || 0}{item.usedBy ? ` • Gần nhất: ${item.usedBy}` : ''}
                                                </div>
                                                <div className={`mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-bold ${(item.exportCount || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    <Package size={14} />
                                                    <span>Xuất ZIP: {item.exportCount || 0}/{item.exportLimit || 0}</span>
                                                </div>
                                                {(item.lastExportBy || item.lastExportAt || item.lastExportClass || item.lastExportYear) && (
                                                    <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                                                        {item.lastExportBy && <div>Gmail xuất gần nhất: <span className="font-semibold text-gray-800">{item.lastExportBy}</span></div>}
                                                        {(item.lastExportClass || item.lastExportYear) && <div>Lớp/năm học: <span className="font-semibold text-gray-800">{[item.lastExportClass, item.lastExportYear].filter(Boolean).join(' - ')}</span></div>}
                                                        {item.lastExportAt && <div>Thời điểm xuất: <span className="font-semibold text-gray-800">{formatKyYeuDateTime(item.lastExportAt)}</span></div>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopyKey(item.key)} className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200" title="Copy mã">
                                                    <Copy size={18} />
                                                </button>
                                                <button onClick={() => handleToggleKyYeuKey(item.key, !item.active)} className={`p-2 rounded-lg ${item.active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`} title={item.active ? 'Thu hồi mã' : 'Mở lại mã'}>
                                                    {item.active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                                <button onClick={() => handleDeleteKyYeuKey(item.key)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200" title="Xóa mã">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'videos' && (
                        <div className="h-full flex flex-col">
                            {/* Add Video Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { resetVideoForm(); setShowVideoForm(true); }}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg mb-4 flex items-center justify-center gap-2"
                            >
                                <Plus size={24} /> Thêm Video AI mới
                            </motion.button>

                            {/* Video Form */}
                            <AnimatePresence>
                                {showVideoForm && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-white rounded-2xl p-4 mb-4 shadow-lg space-y-3"
                                    >
                                        <input type="text" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                                            placeholder="Tiêu đề video *" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
                                        <input type="text" value={videoForm.description} onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                                            placeholder="Mô tả ngắn" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
                                        <input type="text" value={videoForm.youtubeUrl} onChange={(e) => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                                            placeholder="Link YouTube *" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
                                        <div className="space-y-2">
                                            <input type="text" value={videoForm.thumbnail} onChange={(e) => {
                                                setVideoThumbnailUploadMessage('');
                                                setVideoForm({ ...videoForm, thumbnail: e.target.value });
                                            }}
                                                placeholder="Link ảnh bìa hoặc chọn ảnh từ máy" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
                                            <div className="flex flex-wrap gap-2">
                                                <label className={`inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer ${isUploadingImage ? 'opacity-60 pointer-events-none' : ''}`}>
                                                    {isUploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                    {isUploadingImage ? 'Đang nén và tải ảnh...' : 'Chọn ảnh bìa'}
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        disabled={isUploadingImage}
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            handleVideoThumbnailUpload(e.target.files?.[0]);
                                                            e.currentTarget.value = '';
                                                        }}
                                                    />
                                                </label>
                                                {videoForm.thumbnail && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setVideoForm({ ...videoForm, thumbnail: '' });
                                                            setVideoThumbnailUploadMessage('');
                                                        }}
                                                        className="px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-200 hover:bg-red-100 transition-colors"
                                                    >
                                                        Xóa ảnh
                                                    </button>
                                                )}
                                            </div>
                                            {videoThumbnailUploadMessage && (
                                                <p className="text-xs font-medium text-green-600">{videoThumbnailUploadMessage}</p>
                                            )}
                                            {videoForm.thumbnail && (
                                                <div className="aspect-video max-w-sm overflow-hidden rounded-xl bg-gray-100 border border-gray-200">
                                                    <img src={videoForm.thumbnail} alt="Ảnh bìa video" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            <input type="number" value={videoForm.price} onChange={(e) => setVideoForm({ ...videoForm, price: parseInt(e.target.value) || 0 })}
                                                placeholder="Giá (VNĐ) - Để 0 nếu miễn phí" className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
                                            <input type="text" value={videoForm.author} onChange={(e) => setVideoForm({ ...videoForm, author: e.target.value })}
                                                placeholder="Tác giả" className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
                                        </div>
                                        {videoForm.price === 0 && (
                                            <input type="text" value={videoForm.downloadUrl} onChange={(e) => setVideoForm({ ...videoForm, downloadUrl: e.target.value })}
                                                placeholder="Link tải về miễn phí (Google Drive, Mega...)" className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none bg-green-50" />
                                        )}
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={videoForm.isHot} onChange={(e) => setVideoForm({ ...videoForm, isHot: e.target.checked })} className="w-5 h-5" />
                                                <Flame size={16} className="text-orange-500" /> Đánh dấu Hot
                                            </label>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveVideo}
                                                disabled={isUploadingImage}
                                                className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isUploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                {editingVideo ? 'Cập nhật' : 'Thêm Video'}
                                            </button>
                                            <button onClick={resetVideoForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl">Hủy</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Videos List */}
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {videos.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10">
                                        <Film size={48} className="mx-auto mb-4 opacity-30" />
                                        <p>Chưa có video nào</p>
                                    </div>
                                ) : videos.map((video) => (
                                    <motion.div key={video.id} className="bg-white rounded-2xl p-4 shadow-md flex gap-4">
                                        <img src={video.thumbnail || 'https://via.placeholder.com/80x60'} alt="" className="w-20 h-14 object-cover rounded-lg flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-800 truncate">{video.title}</h4>
                                                {video.isHot && <Flame size={14} className="text-orange-500" />}
                                            </div>
                                            <p className="text-sm text-gray-500">{new Intl.NumberFormat('vi-VN').format(video.price)} VNĐ</p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button onClick={() => handleEditVideo(video)} className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDeleteVideo(video.id)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"><Trash2 size={18} /></button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="h-full flex flex-col">
                            {/* Order Filter */}
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => setOrderFilter('pending')} className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm ${orderFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                    Chờ xác nhận ({orders.filter(o => o.status === 'pending').length})
                                </button>
                                <button onClick={() => setOrderFilter('confirmed')} className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm ${orderFilter === 'confirmed' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                    Đã xác nhận ({orders.filter(o => o.status === 'confirmed').length})
                                </button>
                            </div>

                            {/* Orders List */}
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {filteredOrders.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10">
                                        <Package size={48} className="mx-auto mb-4 opacity-30" />
                                        <p>Không có đơn hàng nào</p>
                                    </div>
                                ) : filteredOrders.map((order) => (
                                    <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-md">
                                        {/* Order Header */}
                                        <div className="flex items-center justify-between mb-3 pb-3 border-b">
                                            <div>
                                                <div className="font-mono font-bold text-lg text-purple-800">{order.id}</div>
                                                <div className="text-sm text-gray-500">{order.userName} • {order.userEmail}</div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {order.status === 'pending' ? 'Chờ xác nhận' : order.status === 'confirmed' ? 'Đã xác nhận' : 'Đã hủy'}
                                            </span>
                                        </div>
                                        {/* Order Items */}
                                        <div className="space-y-2 mb-3">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg">
                                                    <Film size={14} className="text-blue-500" />
                                                    <span className="flex-1 truncate">{item.title}</span>
                                                    <span className="text-orange-600 font-semibold">{new Intl.NumberFormat('vi-VN').format(item.price)} VNĐ</span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Total & Actions */}
                                        <div className="flex items-center justify-between pt-3 border-t">
                                            <div className="text-lg font-bold text-orange-600">Tổng: {new Intl.NumberFormat('vi-VN').format(order.totalAmount)} VNĐ</div>
                                            <div className="flex gap-2">
                                                {order.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleConfirmOrder(order.id)} className="px-3 py-2 bg-emerald-500 text-white rounded-lg font-semibold text-sm flex items-center gap-1 hover:bg-emerald-600">
                                                            <Check size={16} /> Xác nhận
                                                        </button>
                                                        <button onClick={() => handleCancelOrder(order.id)} className="px-3 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600">Hủy</button>
                                                    </>
                                                )}
                                                {order.status === 'confirmed' && (
                                                    <button onClick={() => handleCopyVideoLinks(order)} className="px-3 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm flex items-center gap-1 hover:bg-blue-600">
                                                        <Link size={16} /> Copy links
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Edit Feedback Modal */}
                <AnimatePresence>
                    {editingFeedback && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setEditingFeedback(null)}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-50 bg-white rounded-2xl p-5 shadow-2xl"
                            >
                                <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                                    <Edit2 size={20} /> Chỉnh sửa bình luận
                                </h3>
                                <div className="flex items-center gap-3 mb-3 p-2 bg-purple-50 rounded-xl">
                                    <img
                                        src={editingFeedback.userAvatar}
                                        alt={editingFeedback.userName}
                                        className="w-9 h-9 rounded-full border-2 border-purple-200"
                                    />
                                    <span className="font-semibold text-purple-800">{editingFeedback.userName}</span>
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={editTeacherName}
                                        onChange={(e) => setEditTeacherName(e.target.value)}
                                        placeholder="Tên giáo viên"
                                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={editSchoolName}
                                        onChange={(e) => setEditSchoolName(e.target.value)}
                                        placeholder="Đơn vị công tác"
                                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-sm"
                                    />
                                </div>
                                <textarea
                                    value={editMessage}
                                    onChange={(e) => setEditMessage(e.target.value)}
                                    placeholder="Nội dung bình luận"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none resize-none mb-4"
                                    rows={3}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={!editMessage.trim()}
                                        className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Save size={18} /> Lưu thay đổi
                                    </button>
                                    <button
                                        onClick={() => setEditingFeedback(null)}
                                        className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {activeTab === 'apps' && (
                    <div className="h-full flex flex-col">
                        {/* Maintenance Mode - Compact */}
                        <div className={`rounded-xl px-3 py-2 mb-2 shadow-md transition-all ${appVisibility.maintenanceMode ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-teal-500 to-cyan-500'}`}>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{appVisibility.maintenanceMode ? '🚧' : '✅'}</span>
                                <span className="text-white font-bold text-xs flex-shrink-0">{appVisibility.maintenanceMode ? 'Đang bảo trì' : 'Hoạt động'}</span>
                                <input
                                    type="text"
                                    value={editMaintenanceMsg}
                                    onChange={e => setEditMaintenanceMsg(e.target.value)}
                                    className="flex-1 px-2 py-1 rounded-md bg-white/20 border border-white/30 text-white placeholder-white/50 text-[11px] focus:outline-none focus:border-white/60 min-w-0"
                                    placeholder="Thông báo bảo trì..."
                                />
                                <button
                                    onClick={() => setMaintenanceMode(appVisibility.maintenanceMode, editMaintenanceMsg)}
                                    className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded-md text-[11px] font-bold border border-white/30 flex-shrink-0"
                                >
                                    Lưu
                                </button>
                                <button
                                    onClick={async () => {
                                        const newMode = !appVisibility.maintenanceMode;
                                        await setMaintenanceMode(newMode, editMaintenanceMsg);
                                        if (newMode) await setAllAppsVisible(false);
                                        else await setAllAppsVisible(true);
                                    }}
                                    className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all flex-shrink-0 ${appVisibility.maintenanceMode ? 'bg-white text-red-600 hover:bg-red-50' : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'}`}
                                >
                                    {appVisibility.maintenanceMode ? '🟢 Bật lại' : '🔴 Bảo trì'}
                                </button>
                            </div>
                        </div>

                        {/* Update Notification Toggle */}
                        <div className={`rounded-xl px-3 py-2 mb-4 shadow-md transition-all ${appVisibility.showUpdateNotification ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{appVisibility.showUpdateNotification ? '🎉' : '💤'}</span>
                                    <span className="text-white font-bold text-sm">Thông báo SKKN nâng cấp</span>
                                </div>
                                <button
                                    onClick={async () => {
                                        await setUpdateNotification(!appVisibility.showUpdateNotification);
                                    }}
                                    className={`px-3 py-1 rounded-md font-bold text-[11px] transition-all flex-shrink-0 ${appVisibility.showUpdateNotification ? 'bg-white text-emerald-600 hover:bg-emerald-50' : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'}`}
                                >
                                    {appVisibility.showUpdateNotification ? '🟢 Đang Bật' : '🔴 Đã Tắt'}
                                </button>
                            </div>
                        </div>

                        {/* App List - Accordion */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
                            {(['Công cụ dạy học', 'Khóa học & AI', 'Ứng dụng 3D & VR', 'Mô phỏng khoa học', 'Học liệu tương tác', 'Công cụ viết'] as const).map(section => {
                                const sectionApps = ALL_APP_IDS.filter(id => APP_INFO[id].section === section);
                                if (sectionApps.length === 0) return null;
                                const enabledCount = sectionApps.filter(id => appVisibility.apps[id] !== false).length;
                                const allOn = enabledCount === sectionApps.length;
                                const isExpanded = expandedSections.includes(section);
                                const sectionIcons: Record<string, string> = {
                                    'Công cụ dạy học': '⚡', 'Mô phỏng khoa học': '🧪',
                                    'Khóa học & AI': '🧠', 'Ứng dụng 3D & VR': '📦', 'Học liệu tương tác': '📚', 'Công cụ viết': '✍️'
                                };
                                return (
                                    <div key={section} className="rounded-xl border border-gray-200 overflow-hidden bg-white/60">
                                        {/* Section Header - Always visible */}
                                        <div
                                            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-purple-50/50 transition-colors select-none"
                                            onClick={() => setExpandedSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section])}
                                        >
                                            <span className="text-base">{sectionIcons[section] || '📁'}</span>
                                            <span className="font-bold text-sm text-purple-900 flex-1">{section}</span>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${allOn ? 'bg-green-100 text-green-700' : enabledCount === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                                                {enabledCount}/{sectionApps.length}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); sectionApps.forEach(id => setAppVisible(id, !allOn)); }}
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${allOn ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'}`}
                                            >
                                                {allOn ? 'Tắt' : 'Bật'}
                                            </button>
                                            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                        {/* Expanded Content */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                                                        {sectionApps.map(appId => {
                                                            const info = APP_INFO[appId];
                                                            const isVisible = appVisibility.apps[appId] !== false;
                                                            return (
                                                                <div key={appId} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 border transition-all ${isVisible ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100'}`}>
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <span className="text-sm flex-shrink-0">{info.icon}</span>
                                                                        <span className={`font-medium text-xs truncate ${isVisible ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{info.name}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setAppVisible(appId, !isVisible)}
                                                                        className={`w-9 h-5 rounded-full relative transition-all duration-300 flex-shrink-0 ml-1.5 ${isVisible ? 'bg-green-500' : 'bg-gray-300'}`}
                                                                    >
                                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${isVisible ? 'left-[18px]' : 'left-0.5'}`} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
