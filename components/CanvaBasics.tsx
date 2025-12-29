import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Play, Plus, Trash2, ExternalLink, Youtube, X, Save, Edit2, Shield
} from 'lucide-react';
import {
    CanvaVideo,
    subscribeToCanvaVideos,
    addCanvaVideo,
    updateCanvaVideo,
    deleteCanvaVideo
} from '../utils/firebaseCanvaBasics';

interface CanvaBasicsProps {
    onBack: () => void;
    isAdmin?: boolean;
    isLoggedIn?: boolean;
    onRequireLogin?: () => void;
}

// Extract YouTube video ID
const getYoutubeVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/live\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

// Extract YouTube playlist ID
const getYoutubePlaylistId = (url: string): string | null => {
    const match = url.match(/[?&]list=([^&\n?#]+)/);
    return match ? match[1] : null;
};

// Check if URL is a valid YouTube URL (video or playlist)
const isValidYoutubeUrl = (url: string): boolean => {
    return !!(getYoutubeVideoId(url) || getYoutubePlaylistId(url));
};

// Get embed URL for video or playlist
const getYoutubeEmbedUrl = (url: string): string => {
    const videoId = getYoutubeVideoId(url);
    const playlistId = getYoutubePlaylistId(url);

    if (videoId && playlistId) {
        // Video trong playlist
        return `https://www.youtube.com/embed/${videoId}?list=${playlistId}&autoplay=1`;
    } else if (playlistId) {
        // Chỉ playlist
        return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`;
    } else if (videoId) {
        // Chỉ video đơn
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    return '';
};

// Get thumbnail for video or playlist
const getYoutubeThumbnail = (url: string): string | null => {
    const videoId = getYoutubeVideoId(url);
    if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    // Playlist - thử lấy thumbnail từ video đầu tiên nếu có
    return null;
};

const CanvaBasics: React.FC<CanvaBasicsProps> = ({ onBack, isAdmin = false, isLoggedIn, onRequireLogin }) => {
    const [videos, setVideos] = useState<CanvaVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingVideo, setEditingVideo] = useState<CanvaVideo | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newThumbnail, setNewThumbnail] = useState('');
    const [error, setError] = useState('');
    const [playingVideo, setPlayingVideo] = useState<CanvaVideo | null>(null);
    const [saving, setSaving] = useState(false);

    // Subscribe to Firebase realtime updates
    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToCanvaVideos((fetchedVideos) => {
            setVideos(fetchedVideos.sort((a, b) => b.addedAt - a.addedAt));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddVideo = async () => {
        if (!isAdmin) {
            setError('Chỉ Admin mới có quyền thêm video');
            return;
        }

        setError('');

        if (!newTitle.trim()) {
            setError('Vui lòng nhập tiêu đề video');
            return;
        }

        if (!newUrl.trim()) {
            setError('Vui lòng nhập đường dẫn YouTube');
            return;
        }

        if (!isValidYoutubeUrl(newUrl)) {
            setError('Đường dẫn YouTube không hợp lệ (hỗ trợ video và playlist)');
            return;
        }

        setSaving(true);

        try {
            if (editingVideo) {
                // Update existing video
                const success = await updateCanvaVideo(editingVideo.id, {
                    title: newTitle.trim(),
                    youtubeUrl: newUrl.trim(),
                    description: newDescription.trim() || undefined,
                    customThumbnail: newThumbnail.trim() || undefined
                });
                if (!success) {
                    setError('Không thể cập nhật video. Vui lòng thử lại.');
                    setSaving(false);
                    return;
                }
            } else {
                // Add new video
                const newId = await addCanvaVideo({
                    title: newTitle.trim(),
                    youtubeUrl: newUrl.trim(),
                    description: newDescription.trim() || undefined,
                    customThumbnail: newThumbnail.trim() || undefined,
                    addedAt: Date.now()
                });
                if (!newId) {
                    setError('Không thể thêm video. Vui lòng thử lại.');
                    setSaving(false);
                    return;
                }
            }

            // Reset form
            setShowAddModal(false);
            setEditingVideo(null);
            setNewTitle('');
            setNewUrl('');
            setNewDescription('');
            setNewThumbnail('');
        } catch (err) {
            setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteVideo = async (id: string) => {
        if (!isAdmin) {
            alert('Chỉ Admin mới có quyền xóa video');
            return;
        }

        if (window.confirm('Bạn có chắc muốn xóa video này?')) {
            const success = await deleteCanvaVideo(id);
            if (!success) {
                alert('Không thể xóa video. Vui lòng thử lại.');
            }
        }
    };

    const handleEditVideo = (video: CanvaVideo) => {
        if (!isAdmin) {
            alert('Chỉ Admin mới có quyền chỉnh sửa video');
            return;
        }

        setEditingVideo(video);
        setNewTitle(video.title);
        setNewUrl(video.youtubeUrl);
        setNewDescription(video.description || '');
        setNewThumbnail(video.customThumbnail || '');
        setShowAddModal(true);
    };

    const openAddModal = () => {
        if (!isAdmin) {
            alert('Chỉ Admin mới có quyền thêm video');
            return;
        }

        setEditingVideo(null);
        setNewTitle('');
        setNewUrl('');
        setNewDescription('');
        setNewThumbnail('');
        setError('');
        setShowAddModal(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-cyan-900">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} className="text-white" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="text-2xl">🎨</span> Canva cơ bản
                                </h1>
                                <p className="text-sm text-white/60">Video hướng dẫn từ cộng đồng</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Admin badge */}
                            {isAdmin && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                                    <Shield size={14} className="text-amber-400" />
                                    <span className="text-amber-400 text-sm font-medium">Admin</span>
                                </div>
                            )}

                            {/* Add button - chỉ hiện cho Admin */}
                            {isAdmin && (
                                <button
                                    onClick={openAddModal}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-colors font-medium"
                                >
                                    <Plus size={18} />
                                    Thêm video
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="text-center py-16">
                        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white/60">Đang tải dữ liệu...</p>
                    </div>
                ) : videos.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto bg-teal-600/20 rounded-full flex items-center justify-center mb-6">
                            <Youtube size={40} className="text-teal-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Chưa có video nào</h2>
                        <p className="text-white/60 mb-6">
                            {isAdmin
                                ? 'Thêm video hướng dẫn Canva từ YouTube để chia sẻ với cộng đồng'
                                : 'Chưa có video được thêm bởi Admin'}
                        </p>
                        {isAdmin && (
                            <button
                                onClick={openAddModal}
                                className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-colors font-medium"
                            >
                                <Plus size={18} className="inline mr-2" />
                                Thêm video đầu tiên
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videos.map((video) => {
                            // Ưu tiên customThumbnail, nếu không có thì lấy từ YouTube
                            const thumbnail = video.customThumbnail || getYoutubeThumbnail(video.youtubeUrl);
                            const isPlaylist = !!getYoutubePlaylistId(video.youtubeUrl) && !getYoutubeVideoId(video.youtubeUrl);
                            return (
                                <motion.div
                                    key={video.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/10 border border-white/20 rounded-2xl overflow-hidden hover:border-teal-500/50 transition-all group"
                                >
                                    {/* Thumbnail */}
                                    <div
                                        className="relative aspect-video cursor-pointer"
                                        onClick={() => {
                                            if (!isLoggedIn && onRequireLogin) {
                                                onRequireLogin();
                                                return;
                                            }
                                            setPlayingVideo(video);
                                        }}
                                    >
                                        {thumbnail ? (
                                            <img
                                                src={thumbnail}
                                                alt={video.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const videoId = getYoutubeVideoId(video.youtubeUrl);
                                                    if (videoId) {
                                                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-teal-600 to-cyan-700 flex flex-col items-center justify-center">
                                                <Youtube size={40} className="text-white/80 mb-2" />
                                                <span className="text-white/60 text-sm">Playlist</span>
                                            </div>
                                        )}
                                        {/* Playlist badge */}
                                        {isPlaylist && (
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-xs text-white font-medium">
                                                📋 Playlist
                                            </div>
                                        )}
                                        {/* Play overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                                <Play size={28} className="text-white ml-1" fill="white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        <h3 className="text-white font-semibold mb-2 line-clamp-2">{video.title}</h3>
                                        {video.description && (
                                            <p className="text-white/60 text-sm mb-3 line-clamp-2">{video.description}</p>
                                        )}
                                        {/* Playlist hint */}
                                        {getYoutubePlaylistId(video.youtubeUrl) && (
                                            <div className="mb-3 p-2 bg-teal-500/20 border border-teal-500/30 rounded-lg">
                                                <p className="text-teal-300 text-xs flex items-center gap-1.5">
                                                    <span>💡</span>
                                                    <span>Nhấn vào để xem nhiều video trong playlist</span>
                                                </p>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <a
                                                href={isLoggedIn ? video.youtubeUrl : '#'}
                                                target={isLoggedIn ? '_blank' : undefined}
                                                rel={isLoggedIn ? 'noopener noreferrer' : undefined}
                                                onClick={(e) => {
                                                    if (!isLoggedIn && onRequireLogin) {
                                                        e.preventDefault();
                                                        onRequireLogin();
                                                    }
                                                }}
                                                className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-1"
                                            >
                                                <ExternalLink size={14} />
                                                Xem trên YouTube
                                            </a>
                                            {/* Chỉ hiện nút sửa/xóa cho Admin */}
                                            {isAdmin && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditVideo(video)}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-teal-400 transition-colors"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVideo(video.id)}
                                                        className="p-2 hover:bg-red-600/20 rounded-lg text-white/60 hover:text-red-400 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Add/Edit Video Modal - Chỉ cho Admin */}
            <AnimatePresence>
                {showAddModal && isAdmin && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white">
                                    {editingVideo ? 'Chỉnh sửa video' : 'Thêm video mới'}
                                </h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-1 hover:bg-slate-700 rounded-lg text-slate-400"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-white/80 mb-1 block">Tiêu đề video *</label>
                                    <input
                                        type="text"
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        placeholder="VD: Hướng dẫn tạo bài thuyết trình với Canva"
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-white/80 mb-1 block">Đường dẫn YouTube *</label>
                                    <input
                                        type="text"
                                        value={newUrl}
                                        onChange={e => setNewUrl(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-white/80 mb-1 block">Mô tả (tùy chọn)</label>
                                    <textarea
                                        value={newDescription}
                                        onChange={e => setNewDescription(e.target.value)}
                                        placeholder="Mô tả ngắn về nội dung video..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-500 focus:outline-none resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-white/80 mb-1 block">
                                        Ảnh bìa (tùy chọn - dùng cho playlist)
                                    </label>
                                    <input
                                        type="text"
                                        value={newThumbnail}
                                        onChange={e => setNewThumbnail(e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-teal-500 focus:outline-none"
                                    />
                                    <p className="text-xs text-white/40 mt-1">
                                        💡 Dán link ảnh để hiển thị ảnh bìa cho playlist
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm mt-3">{error}</p>
                            )}

                            <button
                                onClick={handleAddVideo}
                                disabled={saving}
                                className="w-full mt-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        {editingVideo ? 'Cập nhật' : 'Thêm video'}
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Video Player Modal */}
            <AnimatePresence>
                {playingVideo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setPlayingVideo(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-4xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-semibold text-lg truncate pr-4">{playingVideo.title}</h3>
                                <button
                                    onClick={() => setPlayingVideo(null)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-white"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="aspect-video bg-black rounded-xl overflow-hidden">
                                <iframe
                                    src={getYoutubeEmbedUrl(playingVideo.youtubeUrl)}
                                    title={playingVideo.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CanvaBasics;
