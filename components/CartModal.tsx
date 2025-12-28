import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Trash2, CreditCard } from 'lucide-react';
import { AIVideo } from '../types/videoStoreTypes';

interface CartModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: AIVideo[];
    onRemoveItem: (videoId: string) => void;
    onCheckout: () => void;
}

const CartModal: React.FC<CartModalProps> = ({
    isOpen,
    onClose,
    cartItems,
    onRemoveItem,
    onCheckout
}) => {
    // Tính tổng tiền
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);

    // Format giá tiền VND
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShoppingCart size={24} />
                                <h2 className="text-xl font-bold">Giỏ Hàng</h2>
                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                                    {cartItems.length} sản phẩm
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="p-4 max-h-[50vh] overflow-y-auto">
                            {cartItems.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <ShoppingCart size={48} className="mx-auto mb-3 opacity-50" />
                                    <p>Giỏ hàng trống</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cartItems.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="flex gap-3 p-3 bg-gray-50 rounded-xl"
                                        >
                                            {/* Thumbnail */}
                                            <img
                                                src={item.thumbnail}
                                                alt={item.title}
                                                className="w-20 h-14 object-cover rounded-lg"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x56?text=Video';
                                                }}
                                            />

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-gray-800 text-sm line-clamp-1">
                                                    {item.title}
                                                </h4>
                                                <p className="text-orange-500 font-bold text-sm mt-1">
                                                    {formatPrice(item.price)}
                                                </p>
                                            </div>

                                            {/* Remove button */}
                                            <button
                                                onClick={() => onRemoveItem(item.id)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {cartItems.length > 0 && (
                            <div className="border-t p-4 bg-gray-50">
                                {/* Total */}
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-gray-600 font-medium">Tổng tiền:</span>
                                    <span className="text-2xl font-bold text-orange-500">
                                        {formatPrice(totalAmount)}
                                    </span>
                                </div>

                                {/* Checkout button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onCheckout}
                                    className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all"
                                >
                                    <CreditCard size={20} />
                                    Thanh Toán
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CartModal;
