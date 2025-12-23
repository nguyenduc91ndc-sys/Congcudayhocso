import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

interface StarWheelProps {
    onBack: () => void;
}

const StarWheel: React.FC<StarWheelProps> = ({ onBack }) => {
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-900">
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
                    <span className="text-2xl">⭐</span> Vòng Xoay Ngôi Sao
                </h1>
            </div>

            {/* Game iframe */}
            <iframe
                ref={iframeRef}
                src="./VÒNG XOAY NGÔI SAO/ngoisao.html"
                className="w-full border-0"
                title="Vòng Xoay Ngôi Sao"
                allow="autoplay"
            />
        </div>
    );
};

export default StarWheel;
