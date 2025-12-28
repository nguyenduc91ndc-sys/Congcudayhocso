import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Copy, Trash2, Plus, ArrowLeft, CheckCircle, Users, BarChart3, Clock, Monitor, MessageCircle, Star, XCircle, Check, X, Edit2, Save, Eye, ShoppingBag, Film, Package, Flame, Link, ExternalLink, Upload, ImageIcon, Loader2 } from 'lucide-react';
import { getAnalytics, Analytics, VisitorLog } from '../utils/analyticsUtils';
import { getAllFeedbacks, getPendingFeedbacks, getApprovedFeedbacks, approveFeedback, rejectFeedback, deleteFeedback, updateFeedback, Feedback } from '../utils/feedbackUtils';
import { getVisitStats, setVisitCount } from '../utils/visitCounter';
import { getRecentVisitors, FirebaseVisitor } from '../utils/firebaseVisitors';
import { AIVideo, Order } from '../types/videoStoreTypes';
import { subscribeToVideos, addVideo, updateVideo, deleteVideo } from '../utils/firebaseVideoStore';
import { subscribeToOrders, confirmOrder, cancelOrder } from '../utils/firebaseOrders';
import { uploadImage, isValidImage } from '../utils/firebaseStorage';

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

// Lấy danh sách mã từ localStorage
const getStoredKeys = (): { key: string; createdAt: string; note: string }[] => {
    const saved = localStorage.getItem('ntd_admin_keys');
    return saved ? JSON.parse(saved) : [];
};

// Lưu danh sách mã vào localStorage
const saveKeys = (keys: { key: string; createdAt: string; note: string }[]) => {
    localStorage.setItem('ntd_admin_keys', JSON.stringify(keys));
};

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'analytics' | 'keys' | 'feedbacks' | 'videos' | 'orders'>('analytics');
    const [keys, setKeys] = useState<{ key: string; createdAt: string; note: string }[]>([]);
    const [newNote, setNewNote] = useState('');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [analytics, setAnalytics] = useState<Analytics>({ totalVisits: 0, uniqueVisitors: 0, todayVisits: 0, recentVisitors: [] });

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setKeys(getStoredKeys());
        setAnalytics(getAnalytics());
        loadFeedbacks();
        loadGlobalVisitCount();
        loadFirebaseVisitors();

        // Subscribe to videos
        const unsubscribeVideos = subscribeToVideos(setVideos);
        // Subscribe to orders
        const unsubscribeOrders = subscribeToOrders(setOrders);

        // Cập nhật thống kê mỗi 5 giây
        const interval = setInterval(() => {
            setAnalytics(getAnalytics());
        }, 5000);

        return () => {
            clearInterval(interval);
            unsubscribeVideos();
            unsubscribeOrders();
        };
    }, []);

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
    };

    const loadFirebaseVisitors = async () => {
        const visitors = await getRecentVisitors(50);
        setFirebaseVisitors(visitors);
    };

    // Video handlers
    const resetVideoForm = () => {
        setVideoForm({ title: '', description: '', thumbnail: '', price: 0, youtubeUrl: '', downloadUrl: '', author: 'Nguyễn Đức', rating: 5, isHot: false });
        setEditingVideo(null);
        setShowVideoForm(false);
    };

    const handleSaveVideo = async () => {
        if (!videoForm.title || !videoForm.youtubeUrl) return;
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

    const handleCreateKey = () => {
        const newKey = generateRandomKey();
        const newEntry = {
            key: newKey,
            createdAt: new Date().toLocaleDateString('vi-VN'),
            note: newNote || 'Khách hàng mới',
        };
        const updatedKeys = [newEntry, ...keys];
        setKeys(updatedKeys);
        saveKeys(updatedKeys);
        setNewNote('');
        setShowCreateForm(false);
        navigator.clipboard.writeText(newKey);
        setCopiedKey(newKey);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleDeleteKey = (keyToDelete: string) => {
        if (window.confirm('Xóa mã này?')) {
            const updatedKeys = keys.filter(k => k.key !== keyToDelete);
            setKeys(updatedKeys);
            saveKeys(updatedKeys);
        }
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
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

    const handleEditFeedback = (feedback: Feedback) => {
        setEditingFeedback(feedback);
        setEditMessage(feedback.message);
    };

    const handleSaveEdit = async () => {
        if (!editingFeedback || !editMessage.trim()) return;
        await updateFeedback(editingFeedback.id, editMessage.trim());
        setEditingFeedback(null);
        setEditMessage('');
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
                                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white text-center shadow-lg">
                                    <div className="text-2xl sm:text-3xl font-bold">{analytics.todayVisits}</div>
                                    <div className="text-xs sm:text-sm opacity-80">Hôm nay</div>
                                </div>
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

                            {/* Recent Visitors */}
                            <div className="flex-1 overflow-y-auto">
                                <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                                    <Users size={18} /> Người dùng gần đây (Firebase)
                                </h3>
                                {firebaseVisitors.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10">
                                        <Users size={48} className="mx-auto mb-4 opacity-30" />
                                        <p>Chưa có lượt truy cập nào</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {firebaseVisitors.slice(0, 20).map((visitor, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3"
                                            >
                                                <img
                                                    src={visitor.avatar}
                                                    alt={visitor.name}
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-800">{visitor.name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <Clock size={12} /> {new Date(visitor.loginTime).toLocaleString('vi-VN')}
                                                        <Monitor size={12} /> {visitor.device}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
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
                                                            <div className="font-bold text-gray-800">{feedback.userName}</div>
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
                            {/* Nút tạo mã */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowCreateForm(true)}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg mb-4 flex items-center justify-center gap-2"
                            >
                                <Plus size={24} /> Tạo mã Pro mới
                            </motion.button>

                            <AnimatePresence>
                                {showCreateForm && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-white rounded-2xl p-4 mb-4 shadow-lg"
                                    >
                                        <input
                                            type="text"
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Ghi chú (tên khách, SĐT...)"
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none mb-3"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleCreateKey} className="flex-1 bg-purple-600 text-white font-bold py-2 rounded-xl hover:bg-purple-700">
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
                                {keys.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10">
                                        <Key size={48} className="mx-auto mb-4 opacity-30" />
                                        <p>Chưa có mã nào</p>
                                    </div>
                                ) : keys.map((item) => (
                                    <motion.div key={item.key} className="bg-white rounded-2xl p-4 shadow-md flex items-center justify-between">
                                        <div>
                                            <div className="font-mono text-lg font-bold text-purple-800 flex items-center gap-2">
                                                {item.key}
                                                {copiedKey === item.key && <span className="text-green-500 text-sm"><CheckCircle size={14} /> Đã copy!</span>}
                                            </div>
                                            <div className="text-sm text-gray-500">{item.note} • {item.createdAt}</div>
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
                                ))}
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
                                            <button onClick={handleSaveVideo} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2">
                                                <Save size={18} /> {editingVideo ? 'Cập nhật' : 'Thêm Video'}
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
                                <textarea
                                    value={editMessage}
                                    onChange={(e) => setEditMessage(e.target.value)}
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
            </div>
        </div>
    );
};

export default AdminPanel;
