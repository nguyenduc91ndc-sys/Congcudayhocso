import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ThatLuong3DProps {
    onBack: () => void;
}

const ThatLuong3D: React.FC<ThatLuong3DProps> = ({ onBack }) => {
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
                <div className="bg-gradient-to-br from-yellow-600 to-amber-700 p-2 rounded-xl">
                    <span className="text-xl">🕍</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white">🕍 Mô hình 3D - Thạt Luổng</h1>
                    <p className="text-xs text-slate-400">Khám phá kiến trúc Thạt Luổng với mô hình 3D tương tác</p>
                </div>
            </div>

            {/* Iframe container */}
            <div className="flex-1 w-full relative">
                <iframe
                    src="/Thatluong3d/index.html"
                    className="w-full h-full border-0 absolute inset-0"
                    title="Mô hình 3D - Thạt Luổng"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                />
            </div>
        </div>
    );
};

export default ThatLuong3D;
