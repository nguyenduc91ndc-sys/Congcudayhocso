import React from 'react';

interface TrackProps {
  score1: number;
  score2: number;
}

export const Track: React.FC<TrackProps> = ({ score1, score2 }) => {
  // Đảm bảo score hiển thị tối đa là 100%
  const s1 = Math.min(100, Math.max(0, score1));
  const s2 = Math.min(100, Math.max(0, score2));

  return (
    <div className="relative w-full h-[50vh] bg-green-500 overflow-hidden border-b-8 border-white select-none shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1)]">
      {/* Cỏ đan xen (Grass Stripes) */}
      <div className="absolute inset-0 flex select-none pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <div key={i} className={`flex-1 h-full ${i % 2 === 0 ? 'bg-black/10' : 'bg-transparent'}`}></div>
        ))}
      </div>

      {/* Đường chạy điền kinh (Athletic Track) */}
      <div className="absolute top-[15%] h-[70%] w-full bg-[#c0392b] border-y-8 border-orange-200/80 shadow-[inset_0_10px_20px_rgba(0,0,0,0.3)] pointer-events-none z-0">
        {/* Vạch chia làn */}
        <div className="absolute top-1/2 w-full h-0 border-t-4 border-dashed border-white/60 -translate-y-1/2"></div>
        {/* Ghi chú làn */}
        <div className="absolute top-2 left-[2%] text-white/40 font-black text-xl tracking-widest pl-4">LÀN 1</div>
        <div className="absolute bottom-2 left-[2%] text-white/40 font-black text-xl tracking-widest pl-4">LÀN 2</div>
      </div>

      {/* Vạch xuất phát */}
      <div className="absolute top-0 bottom-0 left-[10%] w-3 bg-white shadow-[2px_0_10px_rgba(0,0,0,0.3)] z-0 flex justify-center">
         <div className="absolute top-4 bg-white text-green-800 font-black px-4 py-1.5 rounded-full shadow-lg border-2 border-green-200 text-sm whitespace-nowrap">START</div>
      </div>
      
      {/* Vạch đích (Checkerboard cờ đích) */}
      <div className="absolute top-0 bottom-0 right-[5%] w-12 flex border-l-4 border-yellow-400 z-10 shadow-2xl skew-x-[-10deg] overflow-hidden">
        <div className="absolute top-4 -left-10 bg-yellow-400 text-red-700 font-black px-4 py-1.5 rounded-lg shadow-lg rotate-[-10deg] border-2 border-red-500 z-50 text-sm whitespace-nowrap hidden lg:block">END</div>
        <div className="flex-1 flex flex-col">
          {[...Array(16)].map((_, i) => <div key={`col1-${i}`} className={`flex-1 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-white'}`}></div>)}
        </div>
        <div className="flex-1 flex flex-col">
          {[...Array(16)].map((_, i) => <div key={`col2-${i}`} className={`flex-1 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-900'}`}></div>)}
        </div>
        <div className="flex-1 flex flex-col">
          {[...Array(16)].map((_, i) => <div key={`col3-${i}`} className={`flex-1 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-white'}`}></div>)}
        </div>
      </div>

      {/* Làn chạy Đội 1 */}
      <div className="absolute top-[15%] w-full h-[35%] flex items-center">
        
        {/* Nhân vật 1 - dùng transition-all thời gian 0.5s để tạo animation */}
        <div 
          className="absolute z-20 flex flex-col items-center justify-end transform -translate-x-1/2 transition-all duration-500 ease-out"
          style={{ left: `calc(10% + ${s1 * 0.85}%)` }}
        >
          <div className="relative flex flex-col items-center animate-bounce">
            <svg width="90" height="150" viewBox="0 0 90 150" className="z-20 drop-shadow-2xl overflow-visible">
              {/* Pigtails */}
              <path d="M 25 45 Q 0 75 20 95" stroke="#4a2c11" strokeWidth="10" fill="none" strokeLinecap="round"/>
              <path d="M 65 45 Q 90 75 70 95" stroke="#4a2c11" strokeWidth="10" fill="none" strokeLinecap="round"/>
              
              {/* Face */}
              <circle cx="45" cy="50" r="22" fill="#ffdfbf"/>
              
              {/* Hair Top/Bangs */}
              <path d="M 23 50 Q 45 15 67 50 Q 45 35 23 50" fill="#4a2c11"/>
              
              {/* Eyes */}
              <circle cx="36" cy="50" r="3" fill="#1a202c"/> 
              <circle cx="54" cy="50" r="3" fill="#1a202c"/>
              
              {/* Blush */}
              <circle cx="32" cy="56" r="3" fill="#ffbda3"/>
              <circle cx="58" cy="56" r="3" fill="#ffbda3"/>
              
              {/* Smile */}
              <path d="M 41 58 Q 45 64 49 58" stroke="#c53030" strokeWidth="2" fill="none" strokeLinecap="round"/>

              {/* Green Headband */}
              <path d="M 24 43 Q 45 47 66 43 L 67 47 Q 45 52 23 47 Z" fill="#22c55e"/>
              <path d="M 24 43 Q 15 48 10 58" stroke="#22c55e" strokeWidth="4" fill="none" strokeLinecap="round"/>

              {/* Sack Back */}
              <path d="M 15 75 Q 45 65 75 75 Q 45 85 15 75 Z" fill="#b98a5e"/>

              {/* Sack Body */}
              <path d="M 15 75 Q 0 110 15 145 Q 45 155 75 145 Q 90 110 75 75 Q 45 95 15 75 Z" fill="#d2a679"/>
              <path d="M 15 75 Q 0 110 15 145 Q 45 155 75 145 Q 90 110 75 75 Q 45 95 15 75 Z" fill="rgba(34,197,94,0.2)"/>
              {/* Fold */}
              <path d="M 15 75 Q 45 95 75 75 Q 45 65 15 75 Z" fill="#e6b380"/>
              {/* Rope */}
              <path d="M 13 81 Q 45 101 77 81" stroke="#8c6239" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
              
              {/* Text */}
              <text x="45" y="125" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="900" fontFamily="sans-serif">ĐỘI XANH</text>

              {/* Hands */}
              <ellipse cx="25" cy="80" rx="4" ry="6" fill="#ffdfbf" transform="rotate(-20 25 80)"/>
              <ellipse cx="65" cy="80" rx="4" ry="6" fill="#ffdfbf" transform="rotate(20 65 80)"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Làn chạy Đội 2 */}
      <div className="absolute top-[50%] w-full h-[35%] flex items-center">

        <div 
          className="absolute z-20 flex flex-col items-center justify-end transform -translate-x-1/2 transition-all duration-500 ease-out"
          style={{ left: `calc(10% + ${s2 * 0.85}%)`, transitionDelay: '0.1s' }}
        >
          <div className="relative flex flex-col items-center animate-bounce" style={{ animationDelay: '0.2s' }}>
            <svg width="90" height="150" viewBox="0 0 90 150" className="z-20 drop-shadow-2xl overflow-visible">
              {/* Face */}
              <circle cx="45" cy="50" r="22" fill="#ffeadd"/>
              
              {/* Spiky Hair */}
              <path d="M 23 50 Q 25 15 45 15 Q 65 15 67 50 Q 45 35 23 50" fill="#2d3748"/>
              <path d="M 30 25 L 35 10 L 45 20 L 55 10 L 60 25" stroke="#2d3748" strokeWidth="3" fill="#2d3748" strokeLinejoin="round"/>
              
              {/* Eyes */}
              <circle cx="36" cy="50" r="3" fill="#1a202c"/> 
              <circle cx="54" cy="50" r="3" fill="#1a202c"/>
              
              {/* Blush */}
              <circle cx="32" cy="56" r="3" fill="#ffbda3"/>
              <circle cx="58" cy="56" r="3" fill="#ffbda3"/>
              
              {/* Smile */}
              <path d="M 39 58 Q 45 66 51 58" stroke="#c53030" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

              {/* Red Headband */}
              <path d="M 24 43 Q 45 47 66 43 L 67 47 Q 45 52 23 47 Z" fill="#ef4444"/>
              <path d="M 66 43 Q 75 48 80 58" stroke="#ef4444" strokeWidth="4" fill="none" strokeLinecap="round"/>

              {/* Sack Back */}
              <path d="M 15 75 Q 45 65 75 75 Q 45 85 15 75 Z" fill="#b98a5e"/>

              {/* Sack Body */}
              <path d="M 15 75 Q 0 110 15 145 Q 45 155 75 145 Q 90 110 75 75 Q 45 95 15 75 Z" fill="#d2a679"/>
              <path d="M 15 75 Q 0 110 15 145 Q 45 155 75 145 Q 90 110 75 75 Q 45 95 15 75 Z" fill="rgba(239,68,68,0.2)"/>
              
              {/* Fold */}
              <path d="M 15 75 Q 45 95 75 75 Q 45 65 15 75 Z" fill="#e6b380"/>
              {/* Rope */}
              <path d="M 13 81 Q 45 101 77 81" stroke="#8c6239" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
              
              {/* Text */}
              <text x="45" y="125" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="900" fontFamily="sans-serif">ĐỘI ĐỎ</text>

              {/* Hands */}
              <ellipse cx="25" cy="80" rx="4" ry="6" fill="#ffeadd" transform="rotate(-20 25 80)"/>
              <ellipse cx="65" cy="80" rx="4" ry="6" fill="#ffeadd" transform="rotate(20 65 80)"/>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Tên Game Góc Trái */}
      <div className="absolute top-4 left-4 bg-white/90 px-4 py-2 rounded-full font-black text-green-700 shadow flex items-center gap-2">
        <span className="text-2xl">🏁</span> NHẢY BAO BỐ
      </div>
    </div>
  );
};
