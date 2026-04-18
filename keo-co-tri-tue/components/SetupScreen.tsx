import React, { useState } from 'react';
import { MatchSettings } from '../types';

interface SetupScreenProps {
  initialSettings: MatchSettings;
  onStart: (settings: MatchSettings) => void;
  onAdmin: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ initialSettings, onStart, onAdmin }) => {
  const [settings, setSettings] = useState<MatchSettings>(initialSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(settings);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-20 bg-slate-900 select-none">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        
        {/* Left Side: Hero & Info */}
        <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
           <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-br from-white via-white to-slate-500 bg-clip-text text-transparent uppercase leading-tight tracking-tighter">
                Kéo Co <br /> <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Trí Tuệ</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-md font-medium leading-relaxed">
                Trò chơi kéo co phiên bản tương tác AI. Trả lời đúng để kéo đội đối phương về phía mình.
              </p>
           </div>

           {/* Hero Illustration */}
           <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-800/60 to-slate-900/80 rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex items-center justify-center">
              {/* Background glow effects */}
              <div className="absolute left-[10%] top-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/20 blur-[60px] rounded-full"></div>
              <div className="absolute right-[10%] top-1/2 -translate-y-1/2 w-40 h-40 bg-red-500/20 blur-[60px] rounded-full"></div>
              
              {/* Rope */}
              <div className="absolute left-[15%] right-[15%] top-[55%] h-3 bg-gradient-to-b from-amber-700 to-amber-900 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.15) 8px, rgba(0,0,0,0.15) 16px)' }}></div>
              
              {/* VS badge */}
              <div className="relative z-10 flex items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl rotate-45 flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.3)] border-2 border-yellow-300/50">
                  <span className="text-xl font-black text-white -rotate-45">VS</span>
                </div>
              </div>

              {/* Left warrior */}
              <img src="/keoco-warrior.png" alt="Đội Xanh" className="absolute left-[3%] bottom-[5%] h-[50%] w-auto object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
              {/* Right warrior (flipped) */}
              <img src="/keoco-warrior.png" alt="Đội Đỏ" className="absolute right-[3%] bottom-[5%] h-[50%] w-auto object-contain scale-x-[-1] drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]" />

              {/* Team labels */}
              <div className="absolute left-[8%] top-4 px-4 py-1.5 bg-blue-500/20 backdrop-blur-md rounded-full border border-blue-400/30">
                <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Đội Xanh</span>
              </div>
              <div className="absolute right-[8%] top-4 px-4 py-1.5 bg-red-500/20 backdrop-blur-md rounded-full border border-red-400/30">
                <span className="text-xs font-black text-red-400 uppercase tracking-widest">Đội Đỏ</span>
              </div>
           </div>

           {/* Feature Badges */}
           <div className="grid grid-cols-3 gap-4">
              <button 
                 type="button"
                 className="relative p-4 bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-2xl border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.2)] text-center group cursor-pointer w-full"
              >
                 <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🤖</div>
                 <div className="text-blue-400 font-black text-sm mb-0.5">AI Vision</div>
                 <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-slate-400 transition-colors">Hand Tracking</div>
                 
                 {/* Tooltip */}
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 p-3 bg-slate-800 text-xs text-slate-300 rounded-xl border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">
                    Tính năng nhận diện cử chỉ bằng Camera đang bật mặc định.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                 </div>
              </button>
              <button 
                 type="button"
                 className="relative p-4 bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-2xl border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.2)] text-center group cursor-pointer w-full"
              >
                 <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚔️</div>
                 <div className="text-red-400 font-black text-sm mb-0.5">PVP</div>
                 <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-slate-400 transition-colors">Đối kháng</div>

                 {/* Tooltip */}
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 p-3 bg-slate-800 text-xs text-slate-300 rounded-xl border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">
                    Đang ở chế độ chơi 2 đội (PVP). Chế độ PVE sắp ra mắt!
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                 </div>
              </button>
              <button 
                 type="button"
                 onClick={onAdmin}
                 className="p-4 bg-white/5 hover:bg-emerald-500/10 active:scale-95 transition-all rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] text-center group cursor-pointer w-full"
              >
                 <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📝</div>
                 <div className="text-emerald-400 font-black text-sm mb-0.5">Tự soạn</div>
                 <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-slate-400 transition-colors">Câu hỏi</div>
              </button>
           </div>
        </div>

        {/* Right Side: Form */}
        <div className="bg-slate-800/40 backdrop-blur-3xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-right duration-700">
           <div className="flex justify-between items-center mb-10">
              <h2 className="text-xs font-black text-blue-400 tracking-[0.3em] uppercase">Cấu hình trận đấu</h2>
              <button 
                onClick={onAdmin}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 hover:bg-slate-900 rounded-xl border border-white/5 transition-all text-xs font-bold text-slate-400 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
                QUẢN TRỊ
              </button>
           </div>

           <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Team Blue</label>
                    <input
                      type="text"
                      value={settings.team1Name}
                      onChange={(e) => setSettings({ ...settings, team1Name: e.target.value })}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-all shadow-inner"
                      placeholder="Tên đội 1..."
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Team Red</label>
                    <input
                      type="text"
                      value={settings.team2Name}
                      onChange={(e) => setSettings({ ...settings, team2Name: e.target.value })}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-red-500/50 transition-all shadow-inner"
                      placeholder="Tên đội 2..."
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                      <span>Số câu hỏi mỗi trận</span>
                      <span className="text-blue-400">{settings.questionsPerRound} câu</span>
                   </label>
                   <input
                     type="range"
                     min="5" max="30" step="5"
                     value={settings.questionsPerRound}
                     onChange={(e) => setSettings({ ...settings, questionsPerRound: parseInt(e.target.value) })}
                     className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                   />
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                      <span>Thời gian mỗi câu</span>
                      <span className="text-blue-400">{settings.timePerQuestion} giây</span>
                   </label>
                   <input
                     type="range"
                     min="10" max="60" step="5"
                     value={settings.timePerQuestion}
                     onChange={(e) => setSettings({ ...settings, timePerQuestion: parseInt(e.target.value) })}
                     className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                   />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xl rounded-[1.5rem] shadow-xl shadow-blue-900/40 active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-4 group"
                >
                  Bắt đầu trận đấu
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 group-hover:translate-x-1 transition-transform"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </button>
              </div>
           </form>
           
           <p className="mt-8 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
             Powered by Google MediaPipe AI Hand Tracking
           </p>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
