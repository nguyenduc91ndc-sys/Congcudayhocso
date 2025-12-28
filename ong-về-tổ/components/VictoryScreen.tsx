import React from 'react';
import { BeeSVG, HiveSVG } from './GameAssets';

interface VictoryScreenProps {
  onRestart: () => void;
  showButtons: boolean; // Control visibility of buttons/icons
}

const VictoryScreen: React.FC<VictoryScreenProps> = ({ onRestart, showButtons }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center border-4 border-yellow-400 relative overflow-hidden">
        {/* Confetti effect background (simplified with Tailwind circles) */}
        {showButtons && (
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-10 left-10 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                <div className="absolute top-20 right-20 w-6 h-6 bg-blue-500 rounded-full animate-ping delay-100"></div>
                <div className="absolute bottom-10 left-1/2 w-5 h-5 bg-green-500 rounded-full animate-ping delay-200"></div>
            </div>
        )}

        <h2 className="text-4xl font-extrabold text-yellow-600 mb-4">
          Chúc Mừng!
        </h2>
        
        {/* Only show icons and buttons if showButtons is true (after video) */}
        {showButtons && (
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="w-24 h-24 transform translate-x-4">
               <BeeSVG />
            </div>
            <div className="text-3xl animate-pulse">❤️</div>
            <div className="w-24 h-24">
               <HiveSVG />
            </div>
          </div>
        )}

        <p className="text-xl text-gray-700 mb-8 leading-relaxed">
          Các em đã xuất sắc trả lời đúng tất cả các câu hỏi và đưa chú Ong về tổ an toàn! 
          <br/>
          {showButtons && <span className="font-bold text-yellow-600 block mt-2 animate-bounce">Các em thật giỏi! 🌟</span>}
        </p>

        {showButtons && (
          <button
            onClick={onRestart}
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white transition-all bg-green-500 rounded-full hover:bg-green-600 shadow-lg transform hover:scale-105"
          >
            Chơi Lại
          </button>
        )}
      </div>
    </div>
  );
};

export default VictoryScreen;