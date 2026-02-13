
import React, { useState, useEffect } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { ASSETS } from '../constants';

interface EndScreenProps {
  score: number;
  total: number;
  onRestart: () => void;
  gameState: string;
  onVideoEnd: () => void;
}

const EndScreen: React.FC<EndScreenProps> = ({ score, total, onRestart, gameState, onVideoEnd }) => {
  const [showRestart, setShowRestart] = useState(false);

  const getMessage = () => {
    if (score === total) return "Thật tuyệt vời! Em là một nhà thám hiểm tài ba!";
    if (score >= total / 2) return "Làm tốt lắm! Em đã hiểu rất rõ về thế giới nấm!";
    return "Cố gắng lên nhé! Thế giới nấm vẫn còn nhiều điều thú vị chờ em khám phá!";
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-4">
      {gameState === 'CONGRATS' && (
        <div className="w-[85%] max-w-4xl bg-white rounded-[40px] border-[15px] border-[#FFC107] p-12 text-center shadow-[0_0_100px_rgba(255,193,7,0.3)] animate-scale-up">
          <div className="flex justify-center mb-8">
             <div className="relative">
               <Trophy size={160} className="text-yellow-500 drop-shadow-xl animate-bounce" />
               <span className="absolute -top-4 -right-4 text-7xl">✨</span>
               <span className="absolute -bottom-4 -left-4 text-7xl">🍄</span>
             </div>
          </div>

          <h2 className="text-6xl font-black text-orange-600 mb-6">CHÚC MỪNG EM!</h2>
          
          <p className="text-4xl font-bold text-gray-800 mb-4 px-10 leading-snug">
            Em đã chinh phục thế giới NẤM và mở được kho báu thần kỳ!
          </p>

          <div className="inline-block bg-orange-100 px-10 py-4 rounded-3xl border-4 border-orange-300 mb-8">
            <span className="text-5xl font-black text-orange-700">Điểm của em: {score}/{total}</span>
          </div>

          <p className="text-3xl text-green-700 font-bold italic">
            "{getMessage()}"
          </p>
        </div>
      )}

      {(gameState === 'VIDEO_OUT' || gameState === 'END') && (
        <div className="w-[80%] aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative">
          <video 
            autoPlay 
            className="w-full h-full object-contain"
            onEnded={() => {
              onVideoEnd();
              setShowRestart(true);
            }}
          >
            <source src={ASSETS.VIDEO_OUT} type="video/mp4" />
          </video>
          
          {showRestart && (
            <div className="absolute inset-0 flex items-end justify-center pb-12 animate-fade-in bg-black/20">
              <button 
                onClick={onRestart}
                className="group flex items-center gap-4 bg-green-600 hover:bg-green-700 text-white px-10 py-5 rounded-full text-3xl font-black shadow-lg transform hover:scale-110 active:scale-95 transition-all duration-200"
              >
                <RotateCcw size={40} />
                CHƠI LẠI
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EndScreen;
