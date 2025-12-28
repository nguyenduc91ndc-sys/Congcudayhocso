import React from 'react';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';

interface BeeGameProps {
    onBack: () => void;
}

const BeeGame: React.FC<BeeGameProps> = ({ onBack }) => {
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-yellow-50 flex flex-col z-50">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 border-b border-yellow-500">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-2xl">🐝</span>
                        <div>
                            <h1 className="text-lg font-bold text-white">Ong về Tổ</h1>
                            <p className="text-xs text-white/80">Game trả lời câu hỏi vui nhộn</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                >
                    {isFullscreen ? (
                        <Minimize2 size={20} className="text-white" />
                    ) : (
                        <Maximize2 size={20} className="text-white" />
                    )}
                </button>
            </div>

            {/* Game iframe */}
            <div className="flex-1 w-full bg-yellow-100">
                <iframe
                    src="/bee-game.html"
                    className="w-full h-full border-0"
                    title="Ong về Tổ - Game"
                    allow="autoplay; fullscreen"
                />
            </div>
        </div>
    );
};

export default BeeGame;
