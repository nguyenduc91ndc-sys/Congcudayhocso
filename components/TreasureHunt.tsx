import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';

interface TreasureHuntProps {
    onBack: () => void;
}

const TreasureHunt: React.FC<TreasureHuntProps> = ({ onBack }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'BACK_TO_DASHBOARD') {
                onBack();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onBack]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    return (
        <div ref={containerRef} className="h-screen w-screen flex flex-col bg-orange-50">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg z-10">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all font-bold text-sm"
                >
                    <ArrowLeft size={18} />
                    Quay lại
                </button>
                <h1 className="font-black text-lg">🏴‍☠️ Truy Tìm Kho Báu</h1>
                <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                    title="Toàn màn hình"
                >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            </div>

            {/* Game iframe */}
            <iframe
                src="/truy-tim-kho-bau/"
                className="flex-1 w-full border-none"
                style={{ height: 'calc(100vh - 48px)' }}
                allow="fullscreen"
            />
        </div>
    );
};

export default TreasureHunt;
