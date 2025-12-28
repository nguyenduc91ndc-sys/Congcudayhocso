
import React from 'react';
import { Metal } from '../types';

interface ReactionPanelProps {
  anode: Metal;
  cathode: Metal;
  voltage: number;
}

const ReactionPanel: React.FC<ReactionPanelProps> = ({ anode, cathode, voltage }) => {
  const isSpontaneous = voltage >= 0;

  const formatValue = (val: number) => {
    return val < 0 ? `(${val.toFixed(2)})` : val.toFixed(2);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-black text-royalPlum/60 uppercase tracking-widest border-b border-royalPlum/10 pb-1">Chi tiết hóa học</h3>
      
      <div className="flex flex-col gap-3">
        {/* Oxidation Half-Reaction - Using Neon Green */}
        <div className="bg-gradient-to-br from-neonGreen/10 to-neonGreen/5 p-3 rounded-xl border-l-4 border-neonGreen shadow-sm">
          <h4 className="font-black text-green-900 text-[10px] mb-1 uppercase">Cực Âm (Anode) - Sự oxi hóa</h4>
          <div className="font-mono text-xs md:text-sm font-bold text-slate-700 bg-white/50 p-1 rounded">
            {anode.symbol}<sub>(s)</sub> &rarr; {anode.symbol}<sup>{anode.ionCharge}+</sup> + {anode.ionCharge}e<sup>-</sup>
          </div>
          <div className="text-[10px] font-bold text-slate-500 mt-1">
            E° = <span className="text-royalPlum">{anode.potential > 0 ? '+' : ''}{anode.potential.toFixed(2)} V</span>
          </div>
        </div>

        {/* Reduction Half-Reaction - Using Lavender */}
        <div className="bg-gradient-to-br from-lavender/20 to-lavender/5 p-3 rounded-xl border-l-4 border-lavender shadow-sm">
          <h4 className="font-black text-royalPlum text-[10px] mb-1 uppercase">Cực Dương (Cathode) - Sự khử</h4>
          <div className="font-mono text-xs md:text-sm font-bold text-slate-700 bg-white/50 p-1 rounded">
             {cathode.symbol}<sup>{cathode.ionCharge}+</sup> + {cathode.ionCharge}e<sup>-</sup> &rarr; {cathode.symbol}<sub>(s)</sub>
          </div>
          <div className="text-[10px] font-bold text-slate-500 mt-1">
            E° = <span className="text-royalPlum">{cathode.potential > 0 ? '+' : ''}{cathode.potential.toFixed(2)} V</span>
          </div>
        </div>
      </div>

      {/* Net Calculation - Using Amethyst / Royal Plum */}
      <div className={`mt-2 p-3 rounded-xl border-2 shadow-sm ${isSpontaneous ? 'bg-aquamarine/10 border-aquamarine' : 'bg-red-50 border-red-200'}`}>
        <h4 className="font-black text-royalPlum text-[10px] uppercase">Suất điện động (E°<sub>pin</sub>)</h4>
        
        <div className="text-[10px] text-slate-400 italic mb-1 font-mono">
            E°<sub>pin</sub> = E°<sub>(+)</sub> - E°<sub>(-)</sub>
        </div>

        <div className="flex items-baseline gap-1 font-mono text-xl mt-1">
            <span className="text-sm text-slate-500">{formatValue(cathode.potential)} - {formatValue(anode.potential)} = </span>
            <span className={`font-black ${isSpontaneous ? 'text-amethyst' : 'text-red-600'}`}>
                {voltage > 0 ? '+' : ''}{voltage.toFixed(2)} V
            </span>
        </div>
      </div>
    </div>
  );
};

export default ReactionPanel;
