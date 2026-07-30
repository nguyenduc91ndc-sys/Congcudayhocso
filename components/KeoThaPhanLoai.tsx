import React, { useRef, useState } from 'react';
import { ArrowLeft, Check, Link2, Loader2, Maximize2 } from 'lucide-react';
import { shortenUrl } from '../utils/shareUtils';

interface KeoThaPhanLoaiProps {
    onBack: () => void;
}

const GAME_PATH = '/keo-tha-phan-loai/index.html';
const SHARE_PATH = '/?app=keo_tha_phan_loai';

const KeoThaPhanLoai: React.FC<KeoThaPhanLoaiProps> = ({ onBack }) => {
    const frameWrapRef = useRef<HTMLDivElement | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isShortening, setIsShortening] = useState(false);

    const getShareUrl = () => `${window.location.origin}${SHARE_PATH}`;

    const handleCopyLink = async () => {
        if (isShortening) return;
        setIsShortening(true);
        const fullUrl = getShareUrl();

        try {
            const shareUrl = await shortenUrl(fullUrl);
            await navigator.clipboard.writeText(shareUrl);
            setCopySuccess(true);
        } catch {
            try {
                await navigator.clipboard.writeText(fullUrl);
                setCopySuccess(true);
            } catch {
                const textarea = document.createElement('textarea');
                textarea.value = fullUrl;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                setCopySuccess(true);
            }
        } finally {
            setIsShortening(false);
            window.setTimeout(() => setCopySuccess(false), 2500);
        }
    };

    const handleFullscreen = () => {
        const target = frameWrapRef.current;
        if (!target) return;
        if (!document.fullscreenElement) {
            target.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };

    return (
        <div className="relative w-full h-screen bg-sky-950 flex flex-col">
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-slate-900/90 border-b border-white/10">
                <button
                    onClick={onBack}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    title="Quay lại"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>

                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 via-pink-400 to-amber-300 flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🎒</span>
                </div>

                <div className="flex-1 min-w-0">
                    <h1 className="text-base sm:text-lg font-bold text-white truncate">Kéo - Thả Phân Loại</h1>
                    <p className="text-xs text-slate-300 truncate">Game mầm non kéo thả theo nhóm, có âm thanh và điểm số</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopyLink}
                        disabled={isShortening}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${copySuccess
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                            } disabled:opacity-60`}
                        title="Sao chép link gửi cho học sinh"
                    >
                        {isShortening ? <Loader2 size={16} className="animate-spin" /> : copySuccess ? <Check size={16} /> : <Link2 size={16} />}
                        <span className="hidden sm:inline">{copySuccess ? 'Đã copy' : 'Copy link'}</span>
                    </button>

                    <button
                        onClick={handleFullscreen}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-sky-500 hover:bg-sky-400 text-white transition-all"
                        title="Phóng toàn màn hình"
                    >
                        <Maximize2 size={16} />
                        <span className="hidden md:inline">Toàn màn hình</span>
                    </button>
                </div>
            </div>

            <div
                ref={frameWrapRef}
                className="flex-1 w-full bg-black [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:bg-black"
            >
                <iframe
                    src={GAME_PATH}
                    className="w-full h-full border-0 bg-white"
                    title="Kéo - Thả Phân Loại"
                    allow="autoplay; clipboard-write; fullscreen"
                    allowFullScreen
                />
            </div>
        </div>
    );
};

export default KeoThaPhanLoai;
