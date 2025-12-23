import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

interface KingGameProps {
    onBack: () => void;
}

const KingGame: React.FC<KingGameProps> = ({ onBack }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        // Adjust iframe height on load
        const handleResize = () => {
            if (iframeRef.current) {
                iframeRef.current.style.height = `${window.innerHeight - 60}px`;
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-800 to-orange-900">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-black/30 backdrop-blur-sm border-b border-white/10">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Quay lại</span>
                </button>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">👑</span> Đường đến Ngôi Vua
                </h1>
            </div>

            {/* Game iframe */}
            <iframe
                ref={iframeRef}
                src="/king/king/compact/index.html"
                className="w-full border-0"
                title="Đường đến Ngôi Vua"
                allow="autoplay"
            />
        </div>
    );
};

export default KingGame;
