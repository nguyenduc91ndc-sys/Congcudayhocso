import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Copy, CheckCircle, AlertCircle, QrCode, Building2 } from 'lucide-react';
import { Order } from '../types/videoStoreTypes';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onCancel: () => void;
}

// Thông tin ngân hàng
const BANK_INFO = {
    bankName: 'BIDV',
    accountNumber: '6701386512',
    accountHolder: 'NGUYEN THE DUC',
    bankCode: 'bidv' // Cho VietQR
};

const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    onClose,
    order,
    onCancel
}) => {
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 phút
    const [copied, setCopied] = useState<string | null>(null);

    // Format giá tiền VND
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN').format(price);
    };

    // Timer countdown
    useEffect(() => {
        if (!isOpen || !order) return;

        setTimeLeft(15 * 60);
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, order]);

    // Format time mm:ss
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Copy to clipboard
    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

    // VietQR URL
    const getVietQRUrl = () => {
        if (!order) return '';
        const amount = order.totalAmount;
        const addInfo = encodeURIComponent(order.paymentNote);
        return `https://img.vietqr.io/image/${BANK_INFO.bankCode}-${BANK_INFO.accountNumber}-compact2.jpg?amount=${amount}&addInfo=${addInfo}&accountName=${encodeURIComponent(BANK_INFO.accountHolder)}`;
    };

    if (!order) return null;

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
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 flex items-center justify-between sticky top-0">
                            <div className="flex items-center gap-3">
                                <QrCode size={24} />
                                <h2 className="text-xl font-bold">Thông Tin Thanh Toán</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Timer */}
                                <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                                    <Clock size={16} />
                                    <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-300' : ''}`}>
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1 bg-gray-200">
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: `${(timeLeft / (15 * 60)) * 100}%` }}
                                className={`h-full ${timeLeft < 60 ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-400 to-orange-500'}`}
                            />
                        </div>

                        {/* Hướng dẫn */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b">
                            <p className="text-center text-gray-700 text-sm">
                                Mở App Ngân hàng bất kỳ để quét mã <strong>VietQR</strong> hoặc chuyển khoản chính xác số tiền, nội dung bên dưới.
                                <br />
                                <span className="text-gray-500 text-xs">Quá trình xử lý có thể mất ít phút, xin vui lòng đợi...</span>
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* QR Code */}
                                <div className="flex flex-col items-center">
                                    <div className="bg-white border-4 border-blue-100 rounded-2xl p-4 shadow-lg">
                                        <img
                                            src={getVietQRUrl()}
                                            alt="VietQR Code"
                                            className="w-48 h-48 object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/qr-donate.png';
                                            }}
                                        />
                                    </div>
                                    <p className="text-gray-500 text-xs mt-3 text-center">
                                        Sử dụng ứng dụng ngân hàng của bạn để quét mã QR này
                                    </p>
                                </div>

                                {/* Bank Info */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Building2 size={20} className="text-blue-600" />
                                        <h3 className="font-bold text-gray-800">Thông Tin Thanh Toán</h3>
                                    </div>

                                    {/* Ngân hàng */}
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-gray-500 text-xs mb-1">Ngân hàng</p>
                                        <p className="font-semibold text-gray-800">{BANK_INFO.bankName}</p>
                                    </div>

                                    {/* Chủ tài khoản */}
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-gray-500 text-xs mb-1">Chủ tài khoản</p>
                                        <p className="font-semibold text-gray-800">{BANK_INFO.accountHolder}</p>
                                    </div>

                                    {/* Số tài khoản */}
                                    <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Số tài khoản</p>
                                            <p className="font-semibold text-gray-800 font-mono">{BANK_INFO.accountNumber}</p>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(BANK_INFO.accountNumber, 'account')}
                                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                        >
                                            {copied === 'account' ? (
                                                <CheckCircle size={18} className="text-green-500" />
                                            ) : (
                                                <Copy size={18} className="text-gray-400" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Số tiền */}
                                    <div className="bg-orange-50 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Số tiền</p>
                                            <p className="font-bold text-orange-600 text-lg">{formatPrice(order.totalAmount)} VNĐ</p>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(order.totalAmount.toString(), 'amount')}
                                            className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                                        >
                                            {copied === 'amount' ? (
                                                <CheckCircle size={18} className="text-green-500" />
                                            ) : (
                                                <Copy size={18} className="text-gray-400" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Nội dung chuyển khoản */}
                                    <div className="bg-yellow-50 rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Nội dung chuyển khoản</p>
                                            <p className="font-bold text-yellow-700 font-mono">{order.paymentNote}</p>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(order.paymentNote, 'note')}
                                            className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
                                        >
                                            {copied === 'note' ? (
                                                <CheckCircle size={18} className="text-green-500" />
                                            ) : (
                                                <Copy size={18} className="text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-yellow-800">
                                    <p className="font-semibold mb-1">Lưu ý:</p>
                                    <p>Vui lòng giữ nguyên nội dung chuyển khoản <strong>{order.paymentNote}</strong> để xác nhận thanh toán tự động.</p>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="mt-4 text-center">
                                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    Đang chờ thanh toán của bạn...
                                </div>
                            </div>

                            {/* Total */}
                            <div className="mt-6 flex justify-between items-center border-t pt-4">
                                <span className="text-gray-600 font-medium">Tổng Tiền</span>
                                <span className="text-2xl font-bold text-orange-500">{formatPrice(order.totalAmount)} VNĐ</span>
                            </div>

                            {/* Cancel button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onCancel}
                                className="w-full mt-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-pink-700 transition-all"
                            >
                                Huỷ đơn hàng
                            </motion.button>
                        </div>

                        {/* Footer notes */}
                        <div className="bg-gray-50 p-4 border-t">
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <AlertCircle size={16} />
                                Lưu Ý Khi Thanh Toán
                            </h4>
                            <div className="grid md:grid-cols-2 gap-3 text-xs text-gray-600">
                                <div className="flex items-start gap-2">
                                    <span>🔍</span>
                                    <p><strong>Xác minh tài khoản:</strong> Luôn kiểm tra tên và số tài khoản người nhận trước khi xác nhận thanh toán.</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span>📝</span>
                                    <p><strong>Nội dung chuyển khoản:</strong> Nhập chính xác {order.paymentNote} khi chuyển khoản.</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span>📌</span>
                                    <p><strong>Giữ trang này mở:</strong> Đừng đóng trang này cho đến khi thanh toán được xác nhận.</p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span>💬</span>
                                    <p><strong>Cần trợ giúp?</strong> Liên hệ với đội hỗ trợ nếu bạn gặp bất kỳ vấn đề nào trong quá trình thanh toán.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CheckoutModal;
