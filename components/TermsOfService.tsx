import React from 'react';
import { ScrollText, CheckCircle, AlertTriangle, Users, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/40 to-transparent pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-indigo-500/20 rounded-full mb-6 relative">
                        <ScrollText className="w-12 h-12 text-indigo-400" />
                        <div className="absolute inset-0 bg-indigo-400/20 rounded-full blur-xl animate-pulse" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-outfit">Điều Khoản Sử Dụng</h1>
                    <p className="text-xl text-indigo-200/80">Cập nhật lần cuối: 26/02/2026</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 md:p-12 border border-white/10 shadow-2xl"
                >
                    <div className="space-y-12">
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                                <h2 className="text-2xl font-semibold text-white">1. Chấp Nhận Điều Khoản</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                                Bằng việc truy cập và sử dụng trang web <strong className="text-white">Công cụ dạy học số - Giáo viên Công nghệ</strong> (giaoviencn.io.vn), bạn đồng ý tuân thủ và chịu ràng buộc bởi các điều khoản và điều kiện sử dụng sau đây. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng không sử dụng trang web.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Users className="w-6 h-6 text-blue-400" />
                                <h2 className="text-2xl font-semibold text-white">2. Mục Đích Sử Dụng</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed mb-4">
                                Trang web được tạo ra với mục đích <strong className="text-white">hỗ trợ giáo viên</strong> trong việc giảng dạy và ứng dụng công nghệ vào bài giảng. Các công cụ và tài nguyên trên trang web chỉ được sử dụng cho mục đích giáo dục, phi thương mại.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-300">
                                <li>Sử dụng các công cụ dạy học số (Video tương tác, Trò chơi giáo dục, Mô phỏng khoa học...) cho mục đích giảng dạy.</li>
                                <li>Chia sẻ tài nguyên giáo dục với đồng nghiệp và học sinh.</li>
                                <li>Không sử dụng trang web để phát tán nội dung vi phạm pháp luật hoặc đạo đức.</li>
                            </ul>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Scale className="w-6 h-6 text-purple-400" />
                                <h2 className="text-2xl font-semibold text-white">3. Quyền Sở Hữu Trí Tuệ</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed mb-4">
                                Toàn bộ nội dung, thiết kế, hình ảnh, mã nguồn và các tài liệu trên trang web là tài sản trí tuệ của <strong className="text-white">Thầy Thế Đức</strong> và được bảo vệ bởi luật bản quyền Việt Nam.
                            </p>
                            <p className="text-slate-300 leading-relaxed">
                                Bạn được phép sử dụng các công cụ trên trang web cho mục đích cá nhân và giáo dục. Nghiêm cấm sao chép, phân phối hoặc sử dụng nội dung vì mục đích thương mại mà không có sự đồng ý bằng văn bản từ chúng tôi.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                                <h2 className="text-2xl font-semibold text-white">4. Giới Hạn Trách Nhiệm</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed mb-4">
                                Chúng tôi nỗ lực đảm bảo trang web hoạt động ổn định và nội dung chính xác. Tuy nhiên, chúng tôi không chịu trách nhiệm về:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-300">
                                <li>Gián đoạn dịch vụ do lỗi kỹ thuật hoặc bảo trì hệ thống.</li>
                                <li>Mất mát dữ liệu do nguyên nhân ngoài tầm kiểm soát.</li>
                                <li>Nội dung do người dùng tạo ra và chia sẻ trên nền tảng.</li>
                            </ul>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <ScrollText className="w-6 h-6 text-indigo-400" />
                                <h2 className="text-2xl font-semibold text-white">5. Thay Đổi Điều Khoản</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                                Chúng tôi có quyền cập nhật hoặc thay đổi các điều khoản sử dụng này bất kỳ lúc nào mà không cần thông báo trước. Việc bạn tiếp tục sử dụng trang web sau khi các thay đổi được đăng tải đồng nghĩa với việc bạn chấp nhận các điều khoản mới.
                            </p>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/10 text-center">
                        <p className="text-slate-400">
                            Mọi thắc mắc về điều khoản sử dụng, vui lòng liên hệ Thầy Thế Đức hoặc gửi email về: <span className="text-white">nguyenduc91ndc@gmail.com</span>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TermsOfService;
