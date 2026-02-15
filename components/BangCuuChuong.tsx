import React, { useState } from 'react';
import { ArrowLeft, Download, Link2, Check, Loader2 } from 'lucide-react';
import { shortenUrl } from '../utils/shareUtils';

interface BangCuuChuongProps {
    onBack: () => void;
}

const BangCuuChuong: React.FC<BangCuuChuongProps> = ({ onBack }) => {
    const [copySuccess, setCopySuccess] = useState(false);
    const [isShortening, setIsShortening] = useState(false);

    const IFRAME_PATH = '/bangcuuchuongso/index.html';

    const handleDownloadZip = () => {
        const a = document.createElement('a');
        a.href = '/bangcuuchuongso.zip';
        a.download = 'bang-cuu-chuong-so.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleCopyLink = async () => {
        if (isShortening) return;
        setIsShortening(true);
        try {
            const fullUrl = `${window.location.origin}${IFRAME_PATH}`;
            const shortUrl = await shortenUrl(fullUrl);
            await navigator.clipboard.writeText(shortUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2500);
        } catch {
            // Fallback
            const fullUrl = `${window.location.origin}${IFRAME_PATH}`;
            try {
                await navigator.clipboard.writeText(fullUrl);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2500);
            } catch {
                const ta = document.createElement('textarea');
                ta.value = `${window.location.origin}${IFRAME_PATH}`;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2500);
            }
        } finally {
            setIsShortening(false);
        }
    };

    return (
        <div className="relative w-full h-screen bg-slate-900 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-slate-800/80 border-b border-slate-700">
                <button
                    onClick={onBack}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-xl">
                    <span className="text-xl">🔢</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-white">🔢 Bảng Cửu Chương Số</h1>
                    <p className="text-xs text-slate-400">Học liệu tương tác bảng cửu chương</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopyLink}
                        disabled={isShortening}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${copySuccess
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                            } disabled:opacity-60`}
                        title="Sao chép link rút gọn"
                    >
                        {isShortening ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : copySuccess ? (
                            <Check size={16} />
                        ) : (
                            <Link2 size={16} />
                        )}
                        <span className="hidden sm:inline">
                            {copySuccess ? 'Đã sao chép!' : 'Sao chép link'}
                        </span>
                    </button>
                    <button
                        onClick={handleDownloadZip}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white transition-all"
                        title="Tải ZIP (xem offline)"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Tải ZIP</span>
                    </button>
                </div>
            </div>

            {/* Iframe container */}
            <div className="flex-1 w-full">
                <iframe
                    src={IFRAME_PATH}
                    className="w-full h-full border-0"
                    title="Bảng Cửu Chương Số"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                />
            </div>
        </div>
    );
};

export default BangCuuChuong;
