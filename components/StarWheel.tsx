import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

interface StarWheelProps {
    onBack: () => void;
}

const StarWheel: React.FC<StarWheelProps> = ({ onBack }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        // Adjust iframe height on load - full screen
        const handleResize = () => {
            if (iframeRef.current) {
                iframeRef.current.style.height = `${window.innerHeight}px`;
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen relative">
            {/* Floating Back Button */}
            <button
                onClick={onBack}
                className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-xl transition-colors backdrop-blur-sm border border-white/20 shadow-lg"
            >
                <ArrowLeft size={20} />
                <span className="font-medium">Quay lại</span>
            </button>

            {/* Game iframe - Full screen */}
            <iframe
                ref={iframeRef}
                src="/vong-xoay-ngoi-sao/ngoisao.html"
                className="w-full border-0"
                title="Vòng Xoay Ngôi Sao"
                allow="autoplay"
            />
        </div>
    );
};

export default StarWheel;
