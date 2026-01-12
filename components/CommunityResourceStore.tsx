import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Plus, Trash2, ExternalLink, X, Save, Edit2, Shield, Link as LinkIcon, Users, Gift
} from 'lucide-react';
import {
    CommunityResource,
    subscribeToResources,
    addResource,
    updateResource,
    deleteResource
} from '../utils/firebaseCommunityResources';

interface CommunityResourceStoreProps {
    onBack: () => void;
    isAdmin?: boolean;
    isLoggedIn?: boolean;
    onRequireLogin?: () => void;
}

const CommunityResourceStore: React.FC<CommunityResourceStoreProps> = ({
    onBack, isAdmin = false, isLoggedIn, onRequireLogin
}) => {
    const [resources, setResources] = useState<CommunityResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingResource, setEditingResource] = useState<CommunityResource | null>(null);

    // Test Admin Mode for localhost (only for development)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const [testAdminMode, setTestAdminMode] = useState(false);
    const effectiveIsAdmin = isAdmin || (isLocalhost && testAdminMode);

    // Form states
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formLink, setFormLink] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formIcon, setFormIcon] = useState('📁');
    const [isSaving, setIsSaving] = useState(false);

    // Popular emoji icons for resources
    const RESOURCE_ICONS = [
        '📁', '📖', '📚', '🎓', '✨', '💡', '🎯', '🚀',
        '🎨', '🎬', '🎵', '📝', '📈', '🔧', '🧠', '🌟',
        '📦', '🎁', '💻', '📱', '🌐', '❤️', '👍', '🏆'
    ];

    useEffect(() => {
        const unsubscribe = subscribeToResources((data) => {
            setResources(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddResource = async () => {
        if (!formTitle.trim() || !formLink.trim()) {
            alert('Vui lòng nhập tiêu đề và link!');
            return;
        }

        setIsSaving(true);
        try {
            if (editingResource) {
                await updateResource(editingResource.id, {
                    title: formTitle.trim(),
                    description: formDescription.trim(),
                    link: formLink.trim(),
                    category: formCategory.trim(),
                    icon: formIcon
                });
            } else {
                await addResource({
                    title: formTitle.trim(),
                    description: formDescription.trim(),
                    link: formLink.trim(),
                    category: formCategory.trim(),
                    icon: formIcon,
                    addedAt: Date.now()
                });
            }
            closeModal();
        } catch (error) {
            console.error('Error saving resource:', error);
            alert('Có lỗi xảy ra, vui lòng thử lại!');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteResource = async (id: string) => {
        if (window.confirm('Bạn có chắc muốn xóa tài nguyên này?')) {
            await deleteResource(id);
        }
    };

    const handleEditResource = (resource: CommunityResource) => {
        setEditingResource(resource);
        setFormTitle(resource.title);
        setFormDescription(resource.description);
        setFormLink(resource.link);
        setFormCategory(resource.category || '');
        setFormIcon(resource.icon || '📁');
        setShowAddModal(true);
    };

    const openAddModal = () => {
        setEditingResource(null);
        setFormTitle('');
        setFormDescription('');
        setFormLink('');
        setFormCategory('');
        setFormIcon('📁');
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingResource(null);
        setFormTitle('');
        setFormDescription('');
        setFormLink('');
        setFormCategory('');
        setFormIcon('📁');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 sticky top-0 z-40 bg-black/30 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                    <Users size={20} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-white">Kho Tài Nguyên Cộng Đồng</h1>
                                    <p className="text-xs text-white/60">Tài nguyên miễn phí từ cộng đồng</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Localhost Test Admin Toggle */}
                            {isLocalhost && !isAdmin && (
                                <button
                                    onClick={() => setTestAdminMode(!testAdminMode)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${testAdminMode
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                                        }`}
                                    title="Bật/tắt chế độ Admin để test"
                                >
                                    <Shield size={16} />
                                    <span className="hidden sm:inline">{testAdminMode ? 'Admin Mode ON' : 'Test Admin'}</span>
                                </button>
                            )}

                            {effectiveIsAdmin && (
                                <button
                                    onClick={openAddModal}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                                >
                                    <Plus size={18} />
                                    <span className="hidden sm:inline">Thêm tài nguyên</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-green-500 rounded-full animate-spin" />
                    </div>
                ) : resources.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Gift size={40} className="text-white/40" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Chưa có tài nguyên nào</h3>
                        <p className="text-white/60">
                            {effectiveIsAdmin ? 'Nhấn "Thêm tài nguyên" để bắt đầu chia sẻ!' : 'Tài nguyên sẽ sớm được cập nhật!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {resources.map((resource) => (
                            <motion.div
                                key={resource.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/10 border border-white/20 rounded-2xl p-5 hover:bg-white/15 transition-all group"
                            >
                                {/* Icon and Badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{resource.icon || '📁'}</span>
                                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                                            Miễn phí
                                        </span>
                                    </div>
                                    {resource.category && (
                                        <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full">
                                            {resource.category}
                                        </span>
                                    )}
                                </div>

                                {/* Title & Description */}
                                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{resource.title}</h3>
                                <p className="text-sm text-white/60 mb-4 line-clamp-3">{resource.description}</p>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <a
                                        href={resource.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                                    >
                                        <ExternalLink size={16} />
                                        Mở link
                                    </a>

                                    {effectiveIsAdmin && (
                                        <>
                                            <button
                                                onClick={() => handleEditResource(resource)}
                                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                                title="Sửa"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteResource(resource.id)}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                                title="Xóa"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Date */}
                                <p className="text-xs text-white/40 mt-3">
                                    Thêm: {new Date(resource.addedAt).toLocaleDateString('vi-VN')}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    {editingResource ? <Edit2 size={20} /> : <Plus size={20} />}
                                    {editingResource ? 'Sửa tài nguyên' : 'Thêm tài nguyên mới'}
                                </h3>
                                <button
                                    onClick={closeModal}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1">
                                        Tiêu đề <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="VD: Bộ slide bài giảng Toán lớp 5"
                                        className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                {/* Icon Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Chọn Icon
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {RESOURCE_ICONS.map((icon) => (
                                            <button
                                                key={icon}
                                                type="button"
                                                onClick={() => setFormIcon(icon)}
                                                className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${formIcon === icon
                                                    ? 'bg-green-500 ring-2 ring-green-400 scale-110'
                                                    : 'bg-white/10 hover:bg-white/20'
                                                    }`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1">
                                        Mô tả
                                    </label>
                                    <textarea
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        placeholder="Mô tả ngắn về tài nguyên..."
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                    />
                                </div>

                                {/* Link */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1">
                                        Link <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input
                                            type="url"
                                            value={formLink}
                                            onChange={(e) => setFormLink(e.target.value)}
                                            placeholder="https://drive.google.com/..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1">
                                        Danh mục (tùy chọn)
                                    </label>
                                    <input
                                        type="text"
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        placeholder="VD: Toán, Văn, AI..."
                                        className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={closeModal}
                                    className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAddResource}
                                    disabled={isSaving || !formTitle.trim() || !formLink.trim()}
                                    className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            {editingResource ? 'Cập nhật' : 'Thêm'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CommunityResourceStore;
