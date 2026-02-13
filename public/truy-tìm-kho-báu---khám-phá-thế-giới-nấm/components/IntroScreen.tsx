
import React from 'react';
import { Play } from 'lucide-react';
import { ASSETS } from '../constants';

interface IntroScreenProps {
  onStart: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="w-[92%] max-w-7xl aspect-[1.6/1] bg-[#fdf5e6] rounded-[40px] border-[12px] border-[#FF9800] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        
        <div className="absolute top-0 left-0 text-9xl opacity-20 transform -translate-x-1/4 -translate-y-1/4 rotate-12">🍄</div>
        <div className="absolute bottom-0 right-0 text-9xl opacity-20 transform translate-x-1/4 translate-y-1/4 -rotate-12">🧭</div>

        <h1 className="text-3xl md:text-[51px] lg:text-[63px] font-black text-orange-700 mb-8 drop-shadow-lg tracking-tight leading-none uppercase">
          TRUY TÌM KHO BÁU
          <span className="block text-xl md:text-2xl lg:text-3xl text-green-700 mt-2 font-bold normal-case">Khám phá thế giới Nấm</span>
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-12 w-full max-w-5xl bg-white/50 p-10 rounded-3xl border-4 border-dashed border-orange-300">
          <div className="w-56 h-56 flex items-center justify-center bg-transparent shrink-0">
             <img src={ASSETS.LOGO} alt="Explorer Logo" className="w-full h-full object-contain animate-float" />
          </div>
          
          <div className="flex-1 text-left">
            <p className="text-2xl md:text-3xl lg:text-4xl text-gray-800 font-bold leading-relaxed">
              Em hãy cùng nhà thám hiểm vượt qua 5 chặng thử thách để mở kho báu thần kỳ của thế giới Nấm nhé! Hãy bắt đầu cuộc hành trình thôi nào!
            </p>
          </div>
        </div>

        <button 
          onClick={onStart}
          className="mt-12 group relative flex items-center gap-4 bg-orange-600 hover:bg-orange-700 text-white px-12 py-7 rounded-full text-[32px] lg:text-[43px] font-black shadow-[0_10px_0_rgba(154,52,18,1)] transform hover:-translate-y-2 active:translate-y-1 active:shadow-none transition-all duration-150"
        >
          <Play size={48} className="fill-current" />
          BẮT ĐẦU HÀNH TRÌNH
        </button>
      </div>
    </div>
  );
};

export default IntroScreen;
