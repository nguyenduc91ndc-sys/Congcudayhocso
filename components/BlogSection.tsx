import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, Clock, ChevronRight, ArrowLeft, ExternalLink, PlayCircle, X } from 'lucide-react';

// --- Sample Blog Data ---
export interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    content: React.ReactNode;
    date: string;
    category: string;
    readTime: string;
    imageUrl: string;
}

export const blogPosts: BlogPost[] = [
    {
        id: '1',
        title: 'Chuyển đổi số trong giáo dục: Bắt đầu từ đâu?',
        excerpt: 'Hướng dẫn từng bước dành cho giáo viên muốn ứng dụng công nghệ vào bài giảng một cách hiệu quả mà không tốn quá nhiều thời gian học công cụ mới.',
        date: '22/02/2026',
        category: 'Phương pháp giảng dạy',
        readTime: '5 phút',
        imageUrl: '/anhmoitaphuan.jpg',
        content: (
            <div className="space-y-6 text-slate-300 leading-relaxed">
                <p>
                    Chuyển đổi số trong giáo dục không chỉ đơn thuần là việc sử dụng máy chiếu hay bài giảng PowerPoint. Đó là một quá trình thay đổi toàn diện cách thức truyền đạt kiến thức, kết nối giữa thầy và trò, và tối ưu hóa việc quản lý lớp học.
                </p>
                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">1. Đừng cố gắng "số hóa" mọi thứ cùng lúc</h3>
                <p>
                    Sai lầm phổ biến nhất của các thầy cô khi mới bắt đầu là cố gắng áp dụng quá nhiều công cụ cùng một lúc (Kahoot, Quizizz, Padlet, Canva, v.v.). Điều này không chỉ gây quá tải cho giáo viên mà còn làm học sinh phân tâm.
                </p>
                <p>
                    <strong>Lời khuyên:</strong> Hãy bắt đầu với một công cụ cốt lõi. Ví dụ, nếu bạn dạy môn Khoa học, hãy thử ứng dụng "Thí nghiệm ảo" để học sinh hình dung rõ hơn về phản ứng hóa học hoặc cấu tạo tế bào, thay vì chỉ xem hình ảnh tĩnh trong sách giáo khoa.
                </p>
                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">2. Ưu tiên tính tương tác</h3>
                <p>
                    Bản chất cốt lõi của bài giảng số là <strong>sự tương tác</strong>. Học sinh hiện đại tiếp thu tốt hơn thông qua việc tham gia trực tiếp. Thay vì bài giảng một chiều, hãy ngắt quãng bằng các câu hỏi ngắn (như sử dụng Công cụ Video Tương tác của hệ thống).
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                    <li>Sử dụng Vòng quay gọi tên để tăng tính ngẫu nhiên và hồi hộp.</li>
                    <li>Sử dụng game "Ong về tổ" hoặc "Giải mã bức tranh" để thay thế các bài kiểm tra 15 phút khô khan.</li>
                </ul>
                <div className="bg-blue-900/30 border border-blue-500/30 p-6 rounded-xl mt-8">
                    <h4 className="text-xl text-blue-300 font-semibold mb-2">💡 Tóm lại:</h4>
                    <p className="text-blue-100/80">Công nghệ chỉ là công cụ, phương pháp sư phạm của người thầy mới là linh hồn của bài giảng. Hãy dùng công nghệ để giải phóng thời gian của bạn, từ đó tập trung nhiều hơn vào việc truyền cảm hứng cho học sinh.</p>
                </div>
            </div>
        )
    },
    {
        id: '2',
        title: 'Học qua trò chơi (Gamification): Bí quyết giữ chân trẻ tiểu học',
        excerpt: 'Tại sao trẻ em có thể chơi game hàng giờ mà không chán? Làm thế nào để áp dụng cơ chế thiết kế game vào việc dạy học cho học sinh tiểu học?',
        date: '20/02/2026',
        category: 'Tâm lý học đường',
        readTime: '7 phút',
        imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=600&auto=format&fit=crop',
        content: (
            <div className="space-y-6 text-slate-300 leading-relaxed">
                <p>
                    Gamification (Trò chơi hóa) là việc ứng dụng các nguyên lý thiết kế trò chơi vào các lĩnh vực phi trò chơi (như giáo dục). Đối với học sinh tiểu học, tư duy trực quan hình ảnh và sự chú ý ngắn hạn đòi hỏi tiết học phải có nhịp độ nhanh và thú vị.
                </p>
                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">Cơ chế cốt lõi của Gamification</h3>
                <ul className="list-disc pl-6 space-y-4">
                    <li>
                        <strong>Hệ thống điểm thưởng (Points):</strong> Thay vì điểm số truyền thống từ 1-10, hãy quy đổi thành "Điểm kinh nghiệm" (EXP) hoặc "Điểm ma thuật". Học sinh sẽ cảm thấy việc tích lũy những điểm số nhỏ này thú vị hơn.
                    </li>
                    <li>
                        <strong>Huy hiệu (Badges):</strong> Trao danh hiệu cho các hành vi tốt. Ví dụ: Huy hiệu "Ong chăm chỉ" cho bé làm bài tập nhanh nhất, Huy hiệu "Nhà thông thái" cho câu trả lời xuất sắc.
                    </li>
                    <li>
                        <strong>Bảng xếp hạng (Leaderboards):</strong> Kích thích sự cạnh tranh lành mạnh. (Lưu ý: Chỉ nên xếp hạng tốp đầu để tránh làm các em đứng cuối tự ti).
                    </li>
                </ul>
                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">Các game có sẵn trên hệ thống bạn nên thử:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h4 className="font-bold text-amber-400 mb-2">🐝 Vi khuẩn phiêu lưu</h4>
                        <p className="text-sm">Thay thế bài ôn tập cuối giờ hoặc kiểm tra kiến thức bài cũ vô cùng hiệu quả.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h4 className="font-bold text-orange-400 mb-2">🏴‍☠️ Truy tìm kho báu</h4>
                        <p className="text-sm">Phù hợp học theo nhóm, rèn luyện kỹ năng giải quyết vấn đề của các em.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: '3',
        title: 'Hướng dẫn tạo bài giảng Video tương tác siêu nhanh',
        excerpt: 'Chỉ với chiếc điện thoại hoặc laptop cùng kỹ năng lấy link YouTube, bạn hoàn toàn có thể tạo ra những bài giảng Video có câu hỏi bật lên (Pop-up quiz) hấp dẫn.',
        date: '18/02/2026',
        category: 'Thực hành công cụ',
        readTime: '3 phút',
        imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=600&auto=format&fit=crop',
        content: (
            <div className="space-y-6 text-slate-300 leading-relaxed">
                <p>
                    Video bài giảng là một phần không thể thiếu trong mô hình Lớp học đảo ngược (Flipped Classroom). Tuy nhiên, học sinh thường dễ mất tập trung nếu chỉ ngồi xem thụ động từ đầu đến cuối. Tính năng <strong>Video Tương Tác</strong> ra đời để giải quyết vấn đề đó.
                </p>
                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">3 Bước cơ bản:</h3>
                <ol className="list-decimal pl-6 space-y-4">
                    <li>
                        <strong>Chọn Video:</strong> Lên YouTube tìm một video kiến thức phù hợp (Ví dụ: Sự quang hợp của cây xanh). Copy đường dẫn của video đó.
                    </li>
                    <li>
                        <strong>Tạo Video tương tác:</strong> Vào tính năng "Video tương tác" trên Dashboard, dán đường dẫn YouTube vào. Hệ thống sẽ tự động bắt video của bạn.
                    </li>
                    <li>
                        <strong>Chèn câu hỏi:</strong> Tua đoạn video đến giây bạn muốn kiểm tra (ví dụ phút thứ 1:20), dừng lại và chọn "Thêm câu hỏi". Nhập câu hỏi trắc nghiệm và đánh dấu đáp án đúng. Bạn có thể thêm nhiều câu hỏi tùy thích dọc theo chiều dài video.
                    </li>
                    <li>
                        <strong>Lưu và Chia sẻ:</strong> Bấm Lưu bài giảng. Hệ thống cung cấp cho bạn 1 đường link cực gắn qua Zalo để gửi cho học sinh làm bài duyệt trên điện thoại hoặc máy tính cực mượt. Học sinh phải trả lời đúng mới được xem tiếp video!
                    </li>
                </ol>
                <p className="mt-8 italic font-medium flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" /> Hãy trải nghiệm ngay tại mục Công Cụ Dạy Học!
                </p>
            </div>
        )
    },
    {
        id: '4',
        title: 'Kho Prompt Gemini & Veo 3 dành cho Giáo viên: Tạo Infographic, Phiếu bài tập, Video chỉ trong vài phút',
        excerpt: 'Tổng hợp các câu lệnh (Prompt) thực tế giúp giáo viên tạo infographic, sơ đồ tư duy, phiếu bài tập và video tình huống bằng Gemini AI & Veo 3 — kèm mẹo xử lý lỗi font tiếng Việt.',
        date: '26/02/2026',
        category: 'AI trong giáo dục',
        readTime: '8 phút',
        imageUrl: '/Chuyendoiso.jpg',
        content: (
            <div className="space-y-6 text-slate-300 leading-relaxed">
                <p>
                    Bạn đã biết <strong className="text-white">Google Gemini</strong> có thể chat hỏi đáp, nhưng bạn có biết nó còn có thể <strong>tạo hình ảnh infographic, phiếu bài tập có minh họa, sơ đồ tư duy</strong> và thậm chí <strong>tạo video tình huống dạy học</strong> với Veo 3? Bài viết này tổng hợp các Prompt "chuẩn chỉ" mà bạn có thể copy và dùng ngay!
                </p>

                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">📊 1. Tạo Infographic bằng Gemini</h3>
                <p>
                    Gemini có thể tạo infographic trực quan, chuyên nghiệp cho bài giảng. Chỉ cần mô tả nội dung và phong cách mong muốn:
                </p>
                <div className="bg-white/5 border border-white/10 p-5 rounded-xl mt-4">
                    <p className="text-sm text-purple-300 font-semibold mb-2">💡 Prompt mẫu - Infographic:</p>
                    <p className="text-sm italic text-slate-400">
                        "Tạo infographic cho 'Vòng tuần hoàn của nước trong tự nhiên', phong cách sinh động, chuyên nghiệp, có các icon dễ thương cho học sinh tiểu học."
                    </p>
                </div>
                <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl mt-4">
                    <p className="text-sm text-amber-300 font-semibold mb-1">⚠️ Lưu ý quan trọng: Lỗi font tiếng Việt</p>
                    <p className="text-sm text-amber-100/70">
                        Gemini đôi khi tạo ảnh bị lỗi font tiếng Việt. <strong>Giải pháp:</strong> Tải ảnh lên <strong>Canva</strong> → dùng công cụ chỉnh sửa để sửa lại phần văn bản. Cách này vừa giữ được hình ảnh đẹp AI tạo, vừa đảm bảo chữ tiếng Việt chuẩn.
                    </p>
                </div>

                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">🧠 2. Tạo Sơ đồ tư duy</h3>
                <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                    <p className="text-sm text-purple-300 font-semibold mb-2">💡 Prompt mẫu - Sơ đồ tư duy:</p>
                    <p className="text-sm italic text-slate-400">
                        "Dựa trên nội dung sau, hãy giúp tôi tạo prompt để vẽ sơ đồ tư duy cho phù hợp, sinh động với học sinh lớp 4: [Dán nội dung bài học vào đây]"
                    </p>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                    Mẹo: Cho Gemini đọc nội dung bài học trước, rồi yêu cầu nó tự tạo prompt vẽ sơ đồ tư duy — kết quả sẽ chính xác hơn rất nhiều!
                </p>

                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">📝 3. Tạo Phiếu bài tập có hình ảnh</h3>
                <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                    <p className="text-sm text-purple-300 font-semibold mb-2">💡 Prompt mẫu - Phiếu bài tập:</p>
                    <p className="text-sm italic text-slate-400">
                        "Dựa vào chính xác nội dung sau, hãy viết cho tôi 1 prompt tạo phiếu bài tập cho học sinh lớp 4, phong cách sinh động, có icon minh họa dễ thương: [Dán nội dung bài học]"
                    </p>
                </div>
                <p className="mt-3">
                    <strong>Quy trình 2 bước hiệu quả:</strong>
                </p>
                <ol className="list-decimal pl-6 space-y-2 mt-2">
                    <li><strong>Bước 1:</strong> Cho Gemini đọc nội dung bài → yêu cầu nó viết prompt tạo phiếu bài tập.</li>
                    <li><strong>Bước 2:</strong> Copy prompt đó, dán lại vào Gemini → nhận được phiếu bài tập hoàn chỉnh có hình ảnh.</li>
                </ol>

                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">🎬 4. Tạo Video tình huống với Veo 3</h3>
                <p>
                    <strong className="text-purple-300">Veo 3</strong> (truy cập qua <strong>Google Labs → Flow</strong>) cho phép tạo video ngắn chất lượng cao. Dưới đây là các prompt đã được thử nghiệm thành công:
                </p>
                <div className="bg-white/5 border border-white/10 p-5 rounded-xl mt-4 space-y-4">
                    <div>
                        <p className="text-sm text-green-300 font-semibold mb-1">🏆 Video vật thể 3D:</p>
                        <p className="text-sm italic text-slate-400">
                            "Chiếc cúp đặt trên đế tròn kim loại vàng, có vòng đèn LED trắng hắt sáng ở chân đế. Bối cảnh studio sạch sẽ, mờ ảo, ánh sáng phản chiếu lấp lánh. Chất lượng 8K, siêu thực."
                        </p>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                        <p className="text-sm text-blue-300 font-semibold mb-1">👨‍👩‍👧 Video tình huống dạy học:</p>
                        <p className="text-sm italic text-slate-400">
                            "Tạo video cậu bé hỏi bà về khối lượng gạo nếp và đậu xanh. Camera giữ góc nhìn ổn định, chuyển động nhẹ. Bối cảnh nhà bếp Việt Nam, ánh sáng tự nhiên ấm áp."
                        </p>
                    </div>
                </div>

                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl mt-4">
                    <p className="text-sm text-red-300 font-semibold mb-1">🎭 Mẹo kiểm soát nhân vật trong video:</p>
                    <p className="text-sm text-red-100/70">
                        Thêm dòng này vào prompt để nhân vật <strong>không nói, không cử động miệng</strong> sai ý đồ: <em>"TUYỆT ĐỐI KHÔNG NÓI, KHÔNG lip-sync, môi luôn khép kín, biểu cảm tĩnh, chỉ mỉm cười nhẹ và quan sát."</em>
                    </p>
                </div>

                <h3 className="text-2xl font-semibold text-white mt-8 mb-4">🔑 5. Bí quyết dùng Prompt hiệu quả</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h4 className="font-bold text-green-400 mb-2">✅ Nên làm</h4>
                        <ul className="text-sm space-y-1.5">
                            <li>• Mô tả <strong>chi tiết</strong>: lớp, môn, phong cách</li>
                            <li>• Dán nội dung bài học trước để AI hiểu</li>
                            <li>• Dùng từ khóa: "8K", "sinh động", "chuyên nghiệp"</li>
                            <li>• Kết hợp Gemini + Canva để sửa font</li>
                            <li>• Tải PDF sách giáo khoa cho AI phân tích</li>
                        </ul>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <h4 className="font-bold text-red-400 mb-2">❌ Không nên</h4>
                        <ul className="text-sm space-y-1.5">
                            <li>• Prompt quá ngắn, thiếu ngữ cảnh</li>
                            <li>• Dùng ảnh AI có lỗi font mà không sửa</li>
                            <li>• Copy kết quả mà không kiểm tra lại</li>
                            <li>• Bỏ qua bước biên tập nội dung</li>
                            <li>• Quên ghi lại prompt hay để dùng lại</li>
                        </ul>
                    </div>
                </div>

                <div className="bg-indigo-900/30 border border-indigo-500/30 p-6 rounded-xl mt-8">
                    <h4 className="text-xl text-indigo-300 font-semibold mb-2">🚀 Bắt đầu ngay!</h4>
                    <p className="text-indigo-100/80">
                        Truy cập <strong>gemini.google.com</strong> để tạo ảnh và phiếu bài tập. Truy cập <strong>labs.google.com</strong> (tìm "Flow") để tạo video. Tất cả đều <strong>miễn phí</strong> với tài khoản Google. Copy các prompt ở trên và thử ngay hôm nay!
                    </p>
                </div>
            </div>
        )
    }
];

// --- Components ---

const FEATURED_VIDEO = {
    title: 'Biến ảnh thành video AI miễn phí cho bài giảng',
    description: 'Hướng dẫn nhanh cách dùng AI tạo video từ ảnh, phù hợp làm tư liệu minh họa cho tiết học.',
    youtubeUrl: 'https://youtu.be/osNFv1dRkik',
    embedUrl: 'https://www.youtube.com/embed/osNFv1dRkik?autoplay=1&rel=0',
    thumbnailUrl: 'https://img.youtube.com/vi/osNFv1dRkik/hqdefault.jpg',
};

const FeaturedGuideVideo: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-500/14 via-white/6 to-cyan-500/10 shadow-xl shadow-amber-500/5"
            >
                <div className="grid gap-0 md:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className="group relative aspect-video min-h-[220px] overflow-hidden bg-slate-950 text-left"
                        title="Xem video hướng dẫn"
                    >
                        <img
                            src={FEATURED_VIDEO.thumbnailUrl}
                            alt={FEATURED_VIDEO.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                        <div className="absolute inset-0 grid place-items-center">
                            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-2xl shadow-amber-500/30 transition-transform group-hover:scale-110">
                                <PlayCircle size={34} />
                            </span>
                        </div>
                        <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                            Video hướng dẫn nổi bật
                        </span>
                    </button>

                    <div className="flex flex-col justify-center p-6 sm:p-7">
                        <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
                            <PlayCircle size={14} />
                            Học nhanh qua video
                        </div>
                        <h3 className="text-2xl font-black leading-tight text-white sm:text-3xl">
                            {FEATURED_VIDEO.title}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                            {FEATURED_VIDEO.description}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => setIsOpen(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-300"
                            >
                                <PlayCircle size={17} />
                                Xem hướng dẫn
                            </button>
                            <a
                                href={FEATURED_VIDEO.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
                            >
                                <ExternalLink size={16} />
                                Mở YouTube
                            </a>
                        </div>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.96, y: 12 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.96, y: 12 }}
                            className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                                <h3 className="truncate text-sm font-bold text-white sm:text-base">{FEATURED_VIDEO.title}</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                                    title="Đóng video"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="aspect-video bg-black">
                                <iframe
                                    src={FEATURED_VIDEO.embedUrl}
                                    title={FEATURED_VIDEO.title}
                                    className="h-full w-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const BlogList: React.FC<{ onReadPost: (post: BlogPost) => void }> = ({ onReadPost }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
                <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5 }}
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-purple-500/10 transition-all flex flex-col group cursor-pointer"
                    onClick={() => onReadPost(post)}
                >
                    {/* Image Thumbnail */}
                    <div className="h-48 overflow-hidden relative">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                        <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Category badge */}
                        <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                            <span className="text-xs font-semibold text-white">{post.category}</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center gap-4 text-xs text-white/50 mb-3 font-medium">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{post.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Đọc {post.readTime}</span>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-purple-400 transition-colors">
                            {post.title}
                        </h3>

                        <p className="text-sm text-slate-400 line-clamp-3 mb-6 flex-1">
                            {post.excerpt}
                        </p>

                        <div className="flex items-center text-purple-400 font-semibold text-sm gap-1 group-hover:gap-2 transition-all">
                            Đọc tiếp <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

const BlogReader: React.FC<{ post: BlogPost; onBack: () => void }> = ({ post, onBack }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto pb-12"
        >
            <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all font-medium text-sm mb-8"
            >
                <ArrowLeft className="w-4 h-4" />
                Quay lại danh sách
            </button>

            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {/* Header Image */}
                <div className="h-64 sm:h-80 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10" />
                    <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-6 left-6 right-6 z-20">
                        <div className="flex items-center gap-3 text-sm text-white/70 mb-3 font-medium">
                            <span className="px-3 py-1 bg-purple-500/80 rounded-full text-white">{post.category}</span>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{post.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 hidden sm:flex">
                                <Clock className="w-4 h-4" />
                                <span>{post.readTime}</span>
                            </div>
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg leading-tight">
                            {post.title}
                        </h1>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 sm:p-10 lg:p-14">
                    <p className="text-xl text-purple-200/90 font-medium leading-relaxed mb-10 italic">
                        "{post.excerpt}"
                    </p>

                    <div className="prose prose-invert prose-purple max-w-none">
                        {post.content}
                    </div>

                    {/* Author block */}
                    <div className="mt-16 pt-8 border-t border-white/10 flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-white text-xl">
                            Đ
                        </div>
                        <div>
                            <h4 className="font-semibold text-white">Thầy Thế Đức</h4>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export const BlogSection: React.FC = () => {
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

    return (
        <div className="min-h-[60vh]">
            <AnimatePresence mode="wait">
                {selectedPost ? (
                    <BlogReader
                        key="reader"
                        post={selectedPost}
                        onBack={() => setSelectedPost(null)}
                    />
                ) : (
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <BookOpen size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Cẩm nang & Chia sẻ</h2>
                                <p className="text-sm text-white/60">Kinh nghiệm giảng dạy, chuyển đổi số và ứng dụng công nghệ</p>
                            </div>
                        </div>
                        <FeaturedGuideVideo />
                        <BlogList onReadPost={setSelectedPost} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
