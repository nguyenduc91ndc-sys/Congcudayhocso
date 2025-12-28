import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Flame, Play, Download } from 'lucide-react';
import { AIVideo } from '../types/videoStoreTypes';

interface VideoCardProps {
    video: AIVideo;
    onAddToCart: (video: AIVideo) => void;
    isInCart: boolean;
    isGuest?: boolean;
    onRequireLogin?: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onAddToCart, isInCart, isGuest, onRequireLogin }) => {
    // Format giá tiền VND
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
    };

    // Lấy YouTube video ID từ URL
    const getYouTubeVideoId = (url: string): string | null => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    // Lấy thumbnail từ YouTube hoặc dùng thumbnail tùy chỉnh
    const getThumbnail = () => {
        if (video.thumbnail) return video.thumbnail;
        const videoId = getYouTubeVideoId(video.youtubeUrl);
        if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        return 'https://via.placeholder.com/320x180?text=Video+AI';
    };

    // Render rating sao
    const renderRating = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={14}
                        className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                ))}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300"
        >
            {/* Thumbnail với watermark */}
            <div className="relative aspect-video overflow-hidden">
                <img
                    src={getThumbnail()}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/320x180?text=Video+AI';
                    }}
                />

                {/* Badge Hot */}
                {video.isHot && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <Flame size={12} />
                        Hot
                    </div>
                )}

                {/* Watermark */}
                <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded">
                    Nguyễn Đức- GV yêu CN
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Title */}
                <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-1 min-h-[2.5rem]">
                    {video.title}
                </h3>

                {/* Description */}
                <p className="text-gray-500 text-xs line-clamp-2 mb-2 min-h-[2rem]">
                    {video.description}
                </p>

                {/* Rating */}
                <div className="mb-2">
                    {renderRating(video.rating)}
                </div>

                {/* Author */}
                <p className="text-gray-400 text-xs mb-3">
                    Đăng Bởi: <span className="text-blue-500">{video.author}</span>
                </p>

                {/* Price */}
                <p className={`text-lg font-bold mb-3 ${video.price === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                    {video.price === 0 ? 'Miễn phí' : `Giá: ${formatPrice(video.price)}`}
                </p>

                {/* Buttons - Different for free vs paid */}
                {video.price === 0 ? (
                    // Free product - Show download button
                    <div className="flex gap-2">
                        <motion.a
                            href={video.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md"
                        >
                            <Play size={16} />
                            Xem Demo
                        </motion.a>
                        {isGuest ? (
                            <motion.button
                                onClick={() => onRequireLogin?.()}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                            >
                                <Download size={16} />
                                Tải về
                            </motion.button>
                        ) : (
                            <motion.a
                                href={video.downloadUrl || video.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                            >
                                <Download size={16} />
                                Tải về
                            </motion.a>
                        )}
                    </div>
                ) : (
                    // Paid product - Show demo + cart buttons
                    <div className="flex gap-2">
                        <motion.a
                            href={video.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md"
                        >
                            <Play size={16} />
                            Xem Demo
                        </motion.a>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onAddToCart(video)}
                            disabled={isInCart}
                            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${isInCart
                                ? 'bg-green-100 text-green-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                                }`}
                        >
                            <ShoppingCart size={16} />
                            {isInCart ? 'Đã thêm' : 'Thêm Giỏ'}
                        </motion.button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default VideoCard;
