import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ContactUs: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const subject = encodeURIComponent(`[Liên hệ từ ${name}] - Công cụ dạy học số`);
        const body = encodeURIComponent(`Họ tên: ${name}\nEmail: ${email}\n\nNội dung:\n${message}`);
        window.open(`mailto:nguyenduc91ndc@gmail.com?subject=${subject}&body=${body}`, '_self');
        setSent(true);
        setTimeout(() => setSent(false), 4000);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/40 to-transparent pointer-events-none" />
            <div className="absolute top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-indigo-500/20 rounded-full mb-6">
                        <Send className="w-12 h-12 text-indigo-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-outfit">Liên Hệ Với Chúng Tôi</h1>
                    <p className="text-xl text-indigo-200/80 max-w-2xl mx-auto">Chúng tôi luôn lắng nghe và sẵn sàng hỗ trợ bạn. Hãy gửi thông điệp của bạn cho chúng tôi!</p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-8"
                    >
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
                            <h2 className="text-2xl font-semibold text-white mb-8">Thông Tin Liên Hệ</h2>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-500/20 rounded-xl">
                                        <Phone className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Điện Thoại / Zalo</p>
                                        <p className="text-lg text-white font-medium">0975 509 490</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-indigo-500/20 rounded-xl">
                                        <Mail className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Email Hỗ Trợ</p>
                                        <p className="text-lg text-white font-medium">nguyenduc91ndc@gmail.com</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-emerald-500/20 rounded-xl">
                                        <MapPin className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Địa Chỉ</p>
                                        <p className="text-lg text-white font-medium">Việt Nam</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Social Links Box */}
                        <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center">
                            <h3 className="text-lg font-medium text-white mb-4">Kết nối qua mạng xã hội</h3>
                            <div className="flex justify-center gap-4">
                                <a href="https://www.facebook.com/share/g/1BtnwVgAfX/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl transition-colors">
                                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                </a>
                            </div>
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
                    >
                        <h2 className="text-2xl font-semibold text-white mb-6">Gửi Lời Nhắn</h2>

                        <AnimatePresence mode="wait">
                            {sent ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="py-12 text-center"
                                >
                                    <CheckCircle size={56} className="mx-auto text-green-400 mb-4" />
                                    <p className="text-xl font-bold text-green-400 mb-2">Đã mở ứng dụng Email!</p>
                                    <p className="text-slate-400">Vui lòng nhấn Gửi trong ứng dụng email của bạn để hoàn tất.</p>
                                </motion.div>
                            ) : (
                                <motion.form
                                    key="form"
                                    className="space-y-6"
                                    onSubmit={handleSubmit}
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Họ và Tên</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Nhập tên của bạn"
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Nội Dung Tiêu Điểm</label>
                                        <textarea
                                            rows={4}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Bạn cần hỗ trợ hay muốn góp ý điều gì?"
                                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-5 h-5" />
                                        <span>Gửi Tin Nhắn</span>
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
