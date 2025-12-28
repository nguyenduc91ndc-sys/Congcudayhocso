import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Store, Loader2 } from 'lucide-react';
import VideoCard from './VideoCard';
import CartModal from './CartModal';
import CheckoutModal from './CheckoutModal';
import { AIVideo, Order } from '../types/videoStoreTypes';
import { subscribeToVideos } from '../utils/firebaseVideoStore';
import { createOrder, cancelOrder } from '../utils/firebaseOrders';

interface VideoStoreProps {
    onBack: () => void;
    userId: string;
    userEmail: string;
    userName: string;
    onRequireLogin?: () => void;
}

const VideoStore: React.FC<VideoStoreProps> = ({ onBack, userId, userEmail, userName, onRequireLogin }) => {
    const isGuest = userId === 'guest';
    const [videos, setVideos] = useState<AIVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [cartItems, setCartItems] = useState<AIVideo[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [processing, setProcessing] = useState(false);

    // Load videos realtime
    useEffect(() => {
        const unsubscribe = subscribeToVideos((fetchedVideos) => {
            setVideos(fetchedVideos);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Thêm vào giỏ hàng
    const handleAddToCart = (video: AIVideo) => {
        if (!cartItems.find(item => item.id === video.id)) {
            setCartItems([...cartItems, video]);
        }
    };

    // Xóa khỏi giỏ
    const handleRemoveFromCart = (videoId: string) => {
        setCartItems(cartItems.filter(item => item.id !== videoId));
    };

    // Kiểm tra sản phẩm đã trong giỏ chưa
    const isInCart = (videoId: string) => {
        return cartItems.some(item => item.id === videoId);
    };

    // Tiến hành thanh toán
    const handleCheckout = async () => {
        if (cartItems.length === 0) return;

        setProcessing(true);
        try {
            const order = await createOrder(userId, userEmail, userName, cartItems);
            if (order) {
                setCurrentOrder(order);
                setShowCart(false);
                setShowCheckout(true);
            } else {
                alert('Có lỗi khi tạo đơn hàng. Vui lòng thử lại!');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Có lỗi xảy ra. Vui lòng thử lại!');
        } finally {
            setProcessing(false);
        }
    };

    // Hủy đơn hàng
    const handleCancelOrder = async () => {
        if (!currentOrder) return;

        const confirmed = window.confirm('Bạn có chắc muốn hủy đơn hàng này?');
        if (confirmed) {
            await cancelOrder(currentOrder.id);
            setCurrentOrder(null);
            setShowCheckout(false);
            setCartItems([]);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    {/* Back button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        <ArrowLeft size={20} />
                        <span className="hidden sm:inline">Quay lại</span>
                    </motion.button>

                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <Store size={24} className="text-purple-600" />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Kho Video AI
                        </h1>
                    </div>

                    {/* Cart button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCart(true)}
                        className="relative p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                    >
                        <ShoppingCart size={22} />
                        {cartItems.length > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                            >
                                {cartItems.length}
                            </motion.span>
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Page Title */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        🎬 Video AI Giáo Dục
                    </h2>
                    <p className="text-gray-500">
                        Bộ sưu tập video AI chất lượng cao cho giáo dục
                    </p>
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                        <p className="text-gray-500">Đang tải danh sách video...</p>
                    </div>
                ) : videos.length === 0 ? (
                    /* Empty state */
                    <div className="text-center py-20">
                        <Store size={64} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-500 mb-2">
                            Chưa có video nào
                        </h3>
                        <p className="text-gray-400">
                            Admin sẽ sớm thêm video mới. Hãy quay lại sau nhé!
                        </p>
                    </div>
                ) : (
                    /* Video Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {videos.map((video, index) => (
                            <motion.div
                                key={video.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <VideoCard
                                    video={video}
                                    onAddToCart={handleAddToCart}
                                    isInCart={isInCart(video.id)}
                                    isGuest={isGuest}
                                    onRequireLogin={onRequireLogin}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart Modal */}
            <CartModal
                isOpen={showCart}
                onClose={() => setShowCart(false)}
                cartItems={cartItems}
                onRemoveItem={handleRemoveFromCart}
                onCheckout={handleCheckout}
            />

            {/* Checkout Modal */}
            <CheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                order={currentOrder}
                onCancel={handleCancelOrder}
            />

            {/* Processing overlay */}
            {processing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
                        <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
                        <p className="text-gray-700 font-medium">Đang xử lý đơn hàng...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoStore;
