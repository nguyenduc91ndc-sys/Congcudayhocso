import React from 'react';
import { Shield, Lock, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/40 to-transparent pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-full mb-6 relative">
                        <Shield className="w-12 h-12 text-purple-400" />
                        <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-xl animate-pulse" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-outfit">Chính Sách Bảo Mật</h1>
                    <p className="text-xl text-purple-200/80">Cập nhật lần cuối: 22/02/2026</p>
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
                                <Lock className="w-6 h-6 text-blue-400" />
                                <h2 className="text-2xl font-semibold text-white">1. Mục Đích Thu Thập Thông Tin Cá Nhân</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                                Chúng tôi (Công cụ dạy học số - Giáo viên công nghệ) thu thập thông tin của bạn nhằm mục đích chính là mang lại trải nghiệm sử dụng ứng dụng tốt nhất. Các thông tin thu thập bao gồm Email hoặc Tên người dùng (khi đăng nhập bằng Google) chỉ được sử dụng để cá nhân hóa dữ liệu của bạn, lưu trữ quá trình làm việc (như các bài giảng đã lưu) và đồng bộ hóa qua các thiết bị.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <FileText className="w-6 h-6 text-green-400" />
                                <h2 className="text-2xl font-semibold text-white">2. Phạm Vi Sử Dụng Thông Tin</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                                Chúng tôi cam kết tuyệt đối không bán, chia sẻ hoặc tiết lộ thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại. Thông tin chỉ được sử dụng trong phạm vi cung cấp dịch vụ của trang web, hỗ trợ kỹ thuật khi có yêu cầu từ phía người dùng, và phân tích lưu lượng truy cập tổng hợp (ẩn danh) để cải thiện chất lượng ứng dụng.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <AlertCircle className="w-6 h-6 text-yellow-400" />
                                <h2 className="text-2xl font-semibold text-white">3. Thời Gian Lưu Trữ Dữ Liệu</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed mb-4">
                                Dữ liệu cá nhân của Thành viên sẽ được lưu trữ tự động trên máy chủ của nền tảng Firebase (Google) cho đến khi có yêu cầu hủy bỏ từ phía người dùng.
                            </p>
                            <p className="text-slate-300 leading-relaxed">
                                Người dùng có quyền tự kiểm tra, cập nhật, điều chỉnh hoặc hủy bỏ thông tin cá nhân của mình bất kỳ lúc nào bằng cách sử dụng chức năng "Đăng xuất" hoặc liên hệ trực tiếp với chúng tôi để yêu cầu xóa toàn bộ dữ liệu tài khoản.
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <RefreshCw className="w-6 h-6 text-purple-400" />
                                <h2 className="text-2xl font-semibold text-white">4. Quảng Cáo (AdSense) & Cookie</h2>
                            </div>
                            <p className="text-slate-300 leading-relaxed mb-4">
                                Trang web có thể sử dụng quảng cáo từ bên thứ ba (ví dụ: Google AdSense). Các nhà cung cấp bên thứ ba, bao gồm Google, sử dụng cookie để phân phát quảng cáo dựa trên các lượt truy cập trước đó của người dùng vào trang web của chúng tôi hoặc các trang web khác.
                            </p>
                            <p className="text-slate-300 leading-relaxed">
                                Việc Google sử dụng cookie quảng cáo cho phép Google và các đối tác phân phát quảng cáo cho người dùng của chúng tôi dựa trên lượt truy cập của họ vào trang web này và/hoặc các trang web khác trên Internet. Người dùng có thể chọn không tham gia quảng cáo được cá nhân hóa bằng cách truy cập <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Trung tâm quảng cáo của Google</a>.
                            </p>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/10 text-center">
                        <p className="text-slate-400">
                            Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ Thầy Thế Đức hoặc gửi email về: <span className="text-white">nguyenduc91ndc@gmail.com</span>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
