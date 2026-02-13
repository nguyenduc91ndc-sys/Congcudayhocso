import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface DenHung3DProps {
    onBack: () => void;
}

const DenHung3D: React.FC<DenHung3DProps> = ({ onBack }) => {
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
                <div className="bg-gradient-to-br from-amber-600 to-red-700 p-2 rounded-xl">
                    <span className="text-xl">🏛️</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white">🏛️ Phòng Tranh 3D - Đền Hùng</h1>
                    <p className="text-xs text-slate-400">Dã ngoại ảo tham quan Đền Hùng với VR 360°</p>
                </div>
            </div>

            {/* Iframe container */}
            <div className="flex-1 w-full">
                <iframe
                    src="/Denhung3d/index.html"
                    className="w-full h-full border-0"
                    title="Phòng Tranh 3D - Đền Hùng"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                />
            </div>
        </div>
    );
};

export default DenHung3D;
