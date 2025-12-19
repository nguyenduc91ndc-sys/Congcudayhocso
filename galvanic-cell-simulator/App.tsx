
import React, { useState, useEffect, useMemo } from 'react';
import { METALS, DEFAULT_ANODE, DEFAULT_CATHODE } from './constants';
import { Metal } from './types';
import SimulationCanvas from './components/SimulationCanvas';
import ReactionPanel from './components/ReactionPanel';
import { Play, RotateCcw, Info, FlaskConical } from 'lucide-react';

export default function App() {
  const [anode, setAnode] = useState<Metal>(DEFAULT_ANODE);
  const [cathode, setCathode] = useState<Metal>(DEFAULT_CATHODE);
  const [isRunning, setIsRunning] = useState(false);
  
  // Calculate voltage
  const voltage = useMemo(() => {
    return parseFloat((cathode.potential - anode.potential).toFixed(2));
  }, [anode, cathode]);

  // Stop simulation if metals change
  useEffect(() => {
    setIsRunning(false);
  }, [anode, cathode]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setAnode(DEFAULT_ANODE);
    setCathode(DEFAULT_CATHODE);
  };

  return (
    <div className="h-screen w-screen bg-aquamarine/10 text-slate-800 flex flex-col overflow-hidden">
      {/* Header with Royal Plum */}
      <header className="h-14 px-6 flex items-center justify-between bg-royalPlum text-white shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-neonGreen rounded-lg text-royalPlum shadow-sm">
            <FlaskConical size={20} />
          </div>
          <h1 className="text-lg md:text-xl font-black tracking-tight uppercase">Mô Phỏng Pin Điện Hóa</h1>
        </div>
        <p className="text-xs font-bold text-aquamarine hidden md:block uppercase tracking-widest opacity-80">
          Electrochemical Laboratory
        </p>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* Simulation Area */}
        <main className="flex-[3] p-4 flex flex-col min-h-0 bg-white/40">
          <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden border-4 border-royalPlum/10 shadow-xl relative">
             <SimulationCanvas 
                anode={anode} 
                cathode={cathode} 
                isRunning={isRunning} 
                voltage={voltage} 
              />
          </div>
        </main>

        {/* Sidebar Controls */}
        <aside className="flex-[1] min-w-[340px] p-4 border-l border-royalPlum/10 bg-white flex flex-col gap-4 overflow-y-auto shadow-2xl z-0">
          
          <div className="space-y-3">
            <h2 className="font-black text-royalPlum border-b-2 border-royalPlum/20 pb-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-amethyst rounded-full"></span>
              CẤU TẠO PIN
            </h2>
            
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
               {/* Anode Selection - Neon Green Accent */}
              <div className="bg-neonGreen/10 p-3 rounded-xl border-2 border-neonGreen/30 shadow-sm transition-all hover:shadow-md">
                <label className="block text-[10px] font-black text-green-800 mb-1 uppercase tracking-tighter">Anode (-) Oxi hóa</label>
                <select 
                  value={anode.symbol} 
                  onChange={(e) => setAnode(METALS.find(m => m.symbol === e.target.value) || anode)}
                  className="w-full text-sm font-bold p-2 bg-white border border-neonGreen/20 rounded-lg focus:ring-2 focus:ring-neonGreen"
                >
                  {METALS.map(m => (
                    <option key={m.symbol} value={m.symbol} disabled={m.symbol === cathode.symbol}>
                      {m.name} ({m.potential > 0 ? '+' : ''}{m.potential}V)
                    </option>
                  ))}
                </select>
              </div>

              {/* Cathode Selection - Lavender Accent */}
              <div className="bg-lavender/10 p-3 rounded-xl border-2 border-lavender/30 shadow-sm transition-all hover:shadow-md">
                <label className="block text-[10px] font-black text-lavender mb-1 uppercase tracking-tighter">Cathode (+) Khử</label>
                <select 
                  value={cathode.symbol} 
                  onChange={(e) => setCathode(METALS.find(m => m.symbol === e.target.value) || cathode)}
                  className="w-full text-sm font-bold p-2 bg-white border border-lavender/20 rounded-lg focus:ring-2 focus:ring-lavender"
                >
                  {METALS.map(m => (
                    <option key={m.symbol} value={m.symbol} disabled={m.symbol === anode.symbol}>
                      {m.name} ({m.potential > 0 ? '+' : ''}{m.potential}V)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
               <button 
                  onClick={handleStart}
                  disabled={isRunning}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 ${
                      isRunning 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300' 
                      : 'bg-amethyst text-white hover:bg-royalPlum hover:shadow-neonGreen/20 hover:shadow-lg'
                  }`}
               >
                  <Play size={18} fill="currentColor" /> BẮT ĐẦU
               </button>
               <button 
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 py-3 px-6 bg-white text-royalPlum border-2 border-royalPlum/20 rounded-xl font-black text-sm hover:bg-aquamarine/20 transition-all shadow-sm active:scale-95"
               >
                  <RotateCcw size={18} />
               </button>
            </div>
          </div>

          <div className="h-0.5 bg-royalPlum/5 my-2"></div>

          {/* Reaction Panel */}
          <ReactionPanel anode={anode} cathode={cathode} voltage={voltage} />

           {/* Info Box */}
          <div className="mt-auto bg-royalPlum text-white p-3 rounded-xl text-xs shadow-inner">
            <div className="flex items-center gap-2 font-black mb-1 text-neonGreen">
              <Info size={14} /> THÔNG TIN HỆ THỐNG
            </div>
            Dòng điện chỉ sinh ra khi phản ứng tự diễn biến (E°pin > 0). Electron sẽ di chuyển từ Anode sang Cathode.
          </div>

        </aside>

      </div>
    </div>
  );
}
