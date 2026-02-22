import React from 'react';
import { Info, BookOpen, Users, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

const AboutUs: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/40 to-transparent pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-blue-500/20 rounded-full mb-6">
                        <Info className="w-12 h-12 text-blue-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-outfit">Về Chúng Tôi</h1>
                    <p className="text-xl text-blue-200/80">Ứng dụng chuyển đổi số dành cho Giáo dục</p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <BookOpen className="w-10 h-10 text-emerald-400 mb-6" />
                        <h2 className="text-2xl font-semibold text-white mb-4">Sứ Mệnh</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Mang đến những công cụ hữu ích, dễ sử dụng giúp quý Thầy/Cô tiết kiệm thời gian chuẩn bị bài giảng, tổ chức các hoạt động học tập tương tác, tạo hứng thú cho học sinh và nâng cao chất lượng giáo dục.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <Cpu className="w-10 h-10 text-pink-400 mb-6" />
                        <h2 className="text-2xl font-semibold text-white mb-4">Tầm Nhìn</h2>
                        <p className="text-slate-300 leading-relaxed">
                            Trở thành nền tảng công nghệ giáo dục mã nguồn mở hàng đầu, nơi chia sẻ miễn phí các công cụ và tài nguyên dạy học 4.0 dành riêng cho giáo viên Việt Nam.
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center"
                >
                    <Users className="w-10 h-10 text-purple-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-semibold text-white mb-4">Người Sáng Lập</h2>
                    <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto">
                        Website được phát triển và duy trì bởi <strong>Thầy Thế Đức</strong>. Với mong muốn lan tỏa giá trị cộng đồng, mọi công cụ trên nền tảng này đều hướng đến mục tiêu hỗ trợ cộng đồng giáo viên một cách thiết thực nhất.
                    </p>
                    <div className="mt-8">
                        <img src="/og-image.png" alt="Giáo viên công nghệ logo" className="w-24 h-24 mx-auto rounded-2xl shadow-xl object-contain bg-white/10 p-2" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AboutUs;
