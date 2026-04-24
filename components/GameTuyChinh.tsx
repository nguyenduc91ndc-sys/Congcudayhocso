import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface GameTuyChinhProps {
    onBack: () => void;
}

const GameTuyChinh: React.FC<GameTuyChinhProps> = ({ onBack }) => {
    return (
        <div className="relative w-full h-screen bg-slate-900">
            {/* Floating back button */}
            <button
                onClick={onBack}
                className="absolute top-2 left-2 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur-sm border border-white/20 shadow-lg"
                title="Quay lại"
            >
                <ArrowLeft size={18} className="text-white" />
            </button>
            <iframe
                src="/game-tùy-chỉnh/index.html"
                className="w-full h-full border-0"
                title="Game Tùy Chỉnh"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; camera; microphone"
                sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups allow-downloads"
            />
        </div>
    );
};

export default GameTuyChinh;
