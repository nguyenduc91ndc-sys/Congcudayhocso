import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Copy, Trash2, Plus, ArrowLeft, CheckCircle, Users, BarChart3, Clock, Monitor } from 'lucide-react';
import { getAnalytics, Analytics, VisitorLog } from '../utils/analyticsUtils';

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
    const [activeTab, setActiveTab] = useState<'keys' | 'analytics'>('analytics');
    const [keys, setKeys] = useState<{ key: string; createdAt: string; note: string }[]>([]);
    const [newNote, setNewNote] = useState('');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [analytics, setAnalytics] = useState<Analytics>({ totalVisits: 0, uniqueVisitors: 0, todayVisits: 0, recentVisitors: [] });

    useEffect(() => {
        setKeys(getStoredKeys());
        setAnalytics(getAnalytics());

        // Cập nhật thống kê mỗi 5 giây
        const interval = setInterval(() => {
            setAnalytics(getAnalytics());
        }, 5000);

        return () => clearInterval(interval);
    }, []);

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
                <div className="flex gap-2 mb-4 sm:mb-6">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-2 transition-all text-sm sm:text-base ${activeTab === 'analytics'
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-white/50 text-purple-700 hover:bg-white/80'
                            }`}
                    >
                        <BarChart3 size={20} /> Thống kê
                    </button>
                    <button
                        onClick={() => setActiveTab('keys')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'keys'
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-white/50 text-purple-700 hover:bg-white/80'
                            }`}
                    >
                        <Key size={20} /> Mã Pro
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

                            {/* Recent Visitors */}
                            <div className="flex-1 overflow-y-auto">
                                <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                                    <Users size={18} /> Người dùng gần đây
                                </h3>
                                {analytics.recentVisitors.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10">
                                        <Users size={48} className="mx-auto mb-4 opacity-30" />
                                        <p>Chưa có lượt truy cập nào</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {analytics.recentVisitors.slice(0, 20).map((visitor, index) => (
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
                                                        <Clock size={12} /> {visitor.loginTime}
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
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
