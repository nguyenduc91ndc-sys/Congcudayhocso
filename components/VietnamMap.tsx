import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface VietnamMapProps {
    onBack: () => void;
}

const VietnamMap: React.FC<VietnamMapProps> = ({ onBack }) => {
    return (
        <div className="relative w-full h-screen bg-slate-900 flex flex-col">
            <div className="flex items-center gap-3 p-4 bg-slate-800/80 border-b border-slate-700">
                <button
                    onClick={onBack}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <div className="bg-emerald-600 p-2 rounded-xl">
                    <span className="text-xl">🗺️</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white">🗺️ Bản đồ Việt Nam</h1>
                    <p className="text-xs text-slate-400">Khám phá 34 tỉnh thành với bản đồ tương tác</p>
                </div>
            </div>
            <div className="flex-1 w-full">
                <iframe
                    src="/bandoso/vietnam-map-new.html"
                    className="w-full h-full border-0"
                    title="Bản đồ Việt Nam"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                />
            </div>
        </div>
    );
};

export default VietnamMap;
