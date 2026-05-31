import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, HelpCircle, Volume2, VolumeX, X } from 'lucide-react';

interface SoanGiaoAnNangLucSoProps {
    onBack: () => void;
}

const APP_URL = 'https://ungdungsoan-ga.netlify.app/';
const GROQ_KEYS_URL = 'https://console.groq.com/keys';

const GUIDE_TEXT = [
    'Bước 1. Bấm nút Hướng dẫn API trên thanh công cụ.',
    'Bước 2. Nếu dùng Groq, mở trang console.groq.com/keys, đăng nhập, rồi chọn Create API Key.',
    'Bước 3. Sao chép mã bắt đầu bằng gsk gạch dưới.',
    'Bước 4. Quay lại ứng dụng, dán mã vào ô Nhập API Key, sau đó bắt đầu soạn giáo án.',
    'Lưu ý. API Key chỉ nên dùng trên máy cá nhân và không chia sẻ công khai.'
].join(' ');

const SoanGiaoAnNangLucSo: React.FC<SoanGiaoAnNangLucSoProps> = ({ onBack }) => {
    const [showGuide, setShowGuide] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const speakGuide = () => {
        if (!('speechSynthesis' in window)) {
            setShowGuide(true);
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(GUIDE_TEXT);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.95;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setShowGuide(true);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    };

    return (
        <div className="relative w-full h-screen bg-slate-950 flex flex-col">
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900/95 border-b border-white/10 shadow-lg">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span className="hidden sm:inline">Quay lại trang chính</span>
                    <span className="sm:hidden">Quay lại</span>
                </button>

                <div className="flex-1 min-w-0">
                    <h1 className="truncate text-sm sm:text-lg font-bold text-white">
                        Soạn giáo án tích hợp Năng lực số - AI vào kế hoạch bài dạy
                    </h1>
                    <p className="hidden sm:block text-xs text-slate-400">Công cụ được mở trực tiếp trong GIAOVIENCN</p>
                </div>

                <button
                    onClick={() => setShowGuide(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/30 font-semibold transition-colors"
                    title="Xem hướng dẫn lấy API Key"
                >
                    <HelpCircle size={18} />
                    <span className="hidden lg:inline">Hướng dẫn API</span>
                </button>

                <button
                    onClick={isSpeaking ? stopSpeaking : speakGuide}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 border border-cyan-400/30 font-semibold transition-colors"
                    title={isSpeaking ? 'Dừng đọc hướng dẫn' : 'Nghe hướng dẫn bằng lời'}
                >
                    {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    <span className="hidden lg:inline">{isSpeaking ? 'Dừng đọc' : 'Nghe hướng dẫn'}</span>
                </button>

                <button
                    onClick={() => window.open(APP_URL, '_blank')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                    title="Mở trong tab mới"
                >
                    <ExternalLink size={18} />
                    <span className="hidden md:inline">Mở tab mới</span>
                </button>
            </div>

            <iframe
                src={APP_URL}
                title="Soạn giáo án tích hợp Năng lực số - AI vào kế hoạch bài dạy"
                className="flex-1 w-full border-0 bg-white"
                allow="clipboard-read; clipboard-write; fullscreen"
            />

            {showGuide && (
                <div className="absolute right-3 top-[76px] z-30 w-[min(92vw,460px)] rounded-2xl border border-white/15 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:right-4">
                    <div className="mb-3 flex items-start gap-3">
                        <div className="rounded-xl bg-amber-500/20 p-2 text-amber-200">
                            <HelpCircle size={20} />
                        </div>
                        <div className="flex-1">
                            <h2 className="font-bold">Hướng dẫn lấy API Key Groq</h2>
                            <p className="mt-1 text-sm text-slate-300">Dùng khi ô API Key trong ứng dụng yêu cầu mã để tạo giáo án bằng AI.</p>
                        </div>
                        <button
                            onClick={() => { setShowGuide(false); stopSpeaking(); }}
                            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                            title="Đóng"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <ol className="space-y-2 text-sm leading-relaxed text-slate-200">
                        <li><strong>1.</strong> Bấm mở <strong>Groq Console</strong>, đăng nhập hoặc đăng ký tài khoản.</li>
                        <li><strong>2.</strong> Vào mục <strong>API Keys</strong>, chọn <strong>Create API Key</strong>.</li>
                        <li><strong>3.</strong> Đặt tên bất kỳ, ví dụ <strong>giao-an-ai</strong>, rồi sao chép mã bắt đầu bằng <strong>gsk_</strong>.</li>
                        <li><strong>4.</strong> Quay lại khung ứng dụng, dán mã vào ô <strong>Nhập API Key</strong>.</li>
                    </ol>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            onClick={isSpeaking ? stopSpeaking : speakGuide}
                            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-400"
                        >
                            {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            {isSpeaking ? 'Dừng đọc' : 'Nghe hướng dẫn'}
                        </button>
                        <button
                            onClick={() => window.open(GROQ_KEYS_URL, '_blank')}
                            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
                        >
                            <ExternalLink size={16} />
                            Mở Groq Console
                        </button>
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                        Do trang soạn giáo án đang được nhúng từ domain khác, GIAOVIENCN không thể tự dán API Key vào ô bên trong. Bạn cần dán thủ công để bảo mật.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SoanGiaoAnNangLucSo;
