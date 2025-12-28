import React from 'react';
import { BeeSVG } from './GameAssets';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-yellow-50">
      {/* Yellow Nature Background (Same as App.tsx) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Sky Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-50 via-yellow-100 to-orange-50"></div>
        
        {/* Sun */}
        <div className="absolute top-10 right-20 w-32 h-32 bg-yellow-300 rounded-full blur-xl opacity-60 animate-pulse"></div>

        {/* Rolling Hills Layer 1 (Back) */}
        <svg className="absolute bottom-0 left-0 w-full h-[60%] z-0 opacity-50" preserveAspectRatio="none" viewBox="0 0 1440 320">
          <path fill="#FEF3C7" fillOpacity="1" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,224C840,245,960,267,1080,261.3C1200,256,1320,224,1380,208L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
        </svg>

        {/* Rolling Hills Layer 2 (Front) */}
        <svg className="absolute bottom-0 left-0 w-full h-[50%] z-0 opacity-60" preserveAspectRatio="none" viewBox="0 0 1440 320">
          <path fill="#FDE68A" fillOpacity="0.8" d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>

        {/* Flowers Decoration */}
        <div className="absolute bottom-[5%] left-[5%] text-orange-300 text-6xl opacity-60 animate-bounce-slow">✿</div>
        <div className="absolute bottom-[10%] right-[10%] text-yellow-500 text-5xl opacity-60 animate-bounce-slow" style={{ animationDelay: '1s' }}>✿</div>
      </div>

      {/* Main Container: Reduced padding to shrink height ~10% */}
      <div className="relative z-10 w-full max-w-5xl bg-white/95 shadow-2xl rounded-[2.5rem] p-6 md:p-8 border-8 border-yellow-400 text-center animate-float flex flex-col items-center justify-center">
        {/* Enforce a minimum aspect ratio look via padding or min-height, but allow expansion */}
        <div className="flex justify-center mb-4 relative">
          <div className="absolute -top-16 right-8 transform rotate-12">
              <span className="text-5xl animate-bounce delay-700">⚠️</span>
          </div>
          <div className="w-32 h-32 bg-gradient-to-br from-yellow-200 to-orange-100 rounded-full flex items-center justify-center shadow-inner border-4 border-white">
            <BeeSVG className="w-24 h-24" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500 mb-4 drop-shadow-sm font-nunito">
          Ong Về Tổ
        </h1>
        
        <div className="bg-orange-50 p-4 rounded-2xl border-4 border-dashed border-orange-200 mb-6 text-left relative w-full max-w-3xl mx-auto">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl pointer-events-none">🐝</div>
          <h2 className="text-xl font-bold text-orange-700 mb-3 flex items-center">
            <span className="text-2xl mr-2">📜</span> Hướng dẫn chơi:
          </h2>
          <ul className="space-y-2 text-orange-900 text-lg font-medium">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-3 mt-0.5 text-sm">1</span>
              <span>Giúp chú Ong vượt qua <span className="font-bold text-red-500">3 cửa ải</span> để về tổ.</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3 mt-0.5 text-sm">2</span>
              <span>Mỗi cửa ải là một <span className="font-bold text-blue-600">câu đố thú vị</span> mà em cần giải đáp.</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mr-3 mt-0.5 text-sm">3</span>
              <span>Trả lời đúng để đưa Ong về nhà an toàn nhé!</span>
            </li>
          </ul>
        </div>

        <button
          onClick={onStart}
          className="group relative inline-flex items-center justify-center px-10 py-4 text-xl font-bold text-white transition-all duration-200 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full shadow-[0_8px_0_rgb(194,65,12)] hover:shadow-[0_4px_0_rgb(194,65,12)] hover:translate-y-1 active:shadow-none active:translate-y-2 focus:outline-none"
        >
          <span className="mr-3 drop-shadow-md">Bắt Đầu Ngay</span>
          <svg className="w-6 h-6 transition-transform group-hover:translate-x-2 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default StartScreen;