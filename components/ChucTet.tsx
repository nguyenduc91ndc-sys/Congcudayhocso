import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ChucTetProps {
    onBack: () => void;
}

const ChucTet: React.FC<ChucTetProps> = ({ onBack }) => {
    return (
        <div className="relative w-full h-screen bg-slate-900 flex flex-col">
            <div className="flex items-center gap-3 p-4 bg-slate-800/80 border-b border-slate-700">
                <button
                    onClick={onBack}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} className="text-white" />
                </button>
                <div className="bg-gradient-to-br from-red-600 to-yellow-500 p-2 rounded-xl">
                    <span className="text-xl">🎊</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white">🎊 Mẫu Chúc Tết</h1>
                    <p className="text-xs text-slate-400">Tạo thiệp chúc Tết đẹp, xuất PNG/PDF và chia sẻ</p>
                </div>
            </div>
            <div className="flex-1 w-full">
                <iframe
                    src="/chuctettudong/index.html"
                    className="w-full h-full border-0"
                    title="Mẫu Chúc Tết"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                />
            </div>
        </div>
    );
};

export default ChucTet;
