import React from 'react';
import { ArrowLeft, Box } from 'lucide-react';

interface Geometry3DProps {
    onBack: () => void;
}

const Geometry3D: React.FC<Geometry3DProps> = ({ onBack }) => {
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
                <div className="bg-indigo-500 p-2 rounded-xl">
                    <Box size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white">🧊 Hình Học 3D</h1>
                    <p className="text-xs text-slate-400">Hình hộp chữ nhật tương tác</p>
                </div>
            </div>

            {/* Iframe container */}
            <div className="flex-1 w-full">
                <iframe
                    src="https://hinhhoc3d.netlify.app"
                    className="w-full h-full border-0"
                    title="Hình học 3D"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                />
            </div>
        </div>
    );
};

export default Geometry3D;
