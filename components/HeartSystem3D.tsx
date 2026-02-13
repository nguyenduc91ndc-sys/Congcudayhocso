import React from 'react';
import { ArrowLeft, Heart } from 'lucide-react';

interface HeartSystem3DProps {
    onBack: () => void;
}

const HeartSystem3D: React.FC<HeartSystem3DProps> = ({ onBack }) => {
    return (
        <div className="relative w-full h-screen bg-slate-900 flex flex-col">
            <div className="flex items-center gap-3 p-4 bg-slate-800/80 border-b border-slate-700">
                <button
                    onClick={onBack}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <div className="bg-red-600 p-2 rounded-xl">
                    <Heart size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white">❤️ Hệ tuần hoàn 3D</h1>
                    <p className="text-xs text-slate-400">Mô hình tim và hệ tuần hoàn 3D sống động</p>
                </div>
            </div>
            <div className="flex-1 w-full">
                <iframe
                    src="/trai-tim-3d/heart-3d-viewer/index.html"
                    className="w-full h-full border-0"
                    title="Hệ tuần hoàn 3D"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                />
            </div>
        </div>
    );
};

export default HeartSystem3D;
