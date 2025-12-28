
import React from 'react';
import { Metal } from '../types';

interface SimulationCanvasProps {
  anode: Metal;
  cathode: Metal;
  isRunning: boolean;
  voltage: number;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ anode, cathode, isRunning, voltage }) => {
  const isSpontaneous = voltage >= 0;
  const isBulbOn = isRunning && isSpontaneous;
  
  const anodeColor = anode.color;
  const cathodeColor = cathode.color;

  return (
    <div className="w-full h-full relative bg-[#E6F8F3] overflow-hidden flex items-center justify-center">
      <svg viewBox="0 0 800 450" className="w-full h-full max-h-full max-w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="anodeLiquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={anode.solutionColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={anode.solutionColor} stopOpacity="0.7" />
          </linearGradient>
          
          <linearGradient id="cathodeLiquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cathode.solutionColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={cathode.solutionColor} stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="glassGradient" x1="0" y1="0" x2="1" y2="0">
             <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
             <stop offset="20%" stopColor="#ffffff" stopOpacity="0.5" />
             <stop offset="80%" stopColor="#ffffff" stopOpacity="0.5" />
             <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
          </linearGradient>
          
          <filter id="bulbGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="neonShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#5AFF15" />
          </filter>
        </defs>

        {/* --- Table Background (Purple Tint) --- */}
        <rect x="0" y="380" width="800" height="70" fill="#8C1A6A" opacity="0.15" />
        <rect x="0" y="380" width="800" height="4" fill="#8C1A6A" opacity="0.4" />
        
        {/* --- Wires --- */}
        <path 
          d="M 200 150 V 100 H 350" 
          fill="none" 
          stroke="#5C5C5C" 
          strokeWidth="5" 
          strokeLinecap="round"
        />
        <path 
          d="M 450 100 H 600 V 150" 
          fill="none" 
          stroke="#5C5C5C" 
          strokeWidth="5" 
          strokeLinecap="round"
        />

        {/* --- Salt Bridge --- */}
        <path 
          d="M 230 300 V 200 A 20 20 0 0 1 250 180 H 550 A 20 20 0 0 1 570 200 V 300"
          fill="none"
          stroke="#ffffff"
          strokeWidth="34"
          strokeLinecap="round"
          className="opacity-95"
        />
        <path 
          d="M 230 300 V 200 A 20 20 0 0 1 250 180 H 550 A 20 20 0 0 1 570 200 V 300"
          fill="none"
          stroke="#9D75CB"
          strokeWidth="24"
          strokeLinecap="round"
          strokeDasharray="6 4"
          opacity="0.2"
        />

        {/* ================= LEFT BEAKER (ANODE) ================= */}
        <g transform="translate(100, 200)">
          <rect x="0" y="0" width="200" height="180" rx="10" fill="url(#glassGradient)" stroke="#8C1A6A" strokeWidth="2" strokeOpacity="0.2" />
          <rect x="5" y="40" width="190" height="135" rx="5" fill="url(#anodeLiquid)" />
          
          <text x="100" y="140" textAnchor="middle" className="text-[10px] font-black fill-royalPlum opacity-30 tracking-widest uppercase">
            {anode.symbol} Solution
          </text>

          <rect x="80" y="-50" width="40" height="90" fill={anodeColor} stroke="#1e293b" strokeWidth="2" />
          
          <text x="100" y="-5" textAnchor="middle" dominantBaseline="middle" className="text-sm font-black fill-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {anode.symbol}
          </text>

          <rect x="80" y="40" width="40" height="80" fill={anodeColor} stroke="#1e293b" strokeWidth="2">
            {isRunning && isSpontaneous && (
                <>
                    <animate attributeName="width" from="40" to="24" dur="20s" fill="freeze" />
                    <animate attributeName="x" from="80" to="88" dur="20s" fill="freeze" />
                </>
            )}
          </rect>
          
          {isRunning && isSpontaneous && (
            <g>
               {[0, 1, 2].map((i) => (
                  <text key={`anode-ion-${i}`} x="80" y={70 + i * 30} fontSize="12" fill="#5AFF15" fontWeight="black" opacity="0">
                     {anode.symbol}<tspan dy="-4" fontSize="8">{anode.ionCharge}+</tspan>
                     <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur="2.5s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                     <animate attributeName="x" values="80;40" dur="2.5s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                  </text>
               ))}
            </g>
          )}

          <text x="100" y="220" textAnchor="middle" className="text-sm font-black fill-green-700 tracking-tighter uppercase">Anode (-)</text>
          <text x="100" y="240" textAnchor="middle" className="text-xl font-black fill-royalPlum">{anode.name.split(' ')[0]}</text>
        </g>

        {/* ================= RIGHT BEAKER (CATHODE) ================= */}
        <g transform="translate(500, 200)">
          <rect x="0" y="0" width="200" height="180" rx="10" fill="url(#glassGradient)" stroke="#8C1A6A" strokeWidth="2" strokeOpacity="0.2" />
          <rect x="5" y="40" width="190" height="135" rx="5" fill="url(#cathodeLiquid)" />

          <text x="100" y="140" textAnchor="middle" className="text-[10px] font-black fill-royalPlum opacity-30 tracking-widest uppercase">
            {cathode.symbol} Solution
          </text>
          
          <rect x="80" y="-50" width="40" height="90" fill={cathodeColor} stroke="#1e293b" strokeWidth="2" />
          <text x="100" y="-5" textAnchor="middle" dominantBaseline="middle" className="text-sm font-black fill-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {cathode.symbol}
          </text>

          <rect x="80" y="40" width="40" height="80" fill={cathodeColor} stroke="#1e293b" strokeWidth="2">
             {isRunning && isSpontaneous && (
                <>
                    <animate attributeName="width" from="40" to="60" dur="20s" fill="freeze" />
                    <animate attributeName="x" from="80" to="70" dur="20s" fill="freeze" />
                </>
            )}
          </rect>

          {isRunning && isSpontaneous && (
            <g>
               {[0, 1, 2].map((i) => (
                  <text key={`cathode-ion-${i}`} x="160" y={70 + i * 30} fontSize="12" fill="#9D75CB" fontWeight="black" opacity="0">
                     {cathode.symbol}<tspan dy="-4" fontSize="8">{cathode.ionCharge}+</tspan>
                     <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.9;1" dur="2.5s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                     <animate attributeName="x" values="160;100" dur="2.5s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                  </text>
               ))}
            </g>
          )}
          
          <text x="100" y="220" textAnchor="middle" className="text-sm font-black fill-lavender tracking-tighter uppercase">Cathode (+)</text>
          <text x="100" y="240" textAnchor="middle" className="text-xl font-black fill-royalPlum">{cathode.name.split(' ')[0]}</text>
        </g>

        {/* --- Light Bulb --- */}
        <g transform="translate(275, 75)">
            <rect x="15" y="42" width="20" height="8" fill="#475569" rx="2" />
            <circle 
              cx="25" 
              cy="25" 
              r="22" 
              fill={isBulbOn ? "#5AFF15" : "#f1f5f9"} 
              stroke={isBulbOn ? "#8C1A6A" : "#cbd5e1"} 
              strokeWidth="2"
              filter={isBulbOn ? "url(#bulbGlow)" : ""}
              className="transition-all duration-700"
            />
            <path d="M 18 30 Q 25 15 32 30" fill="none" stroke={isBulbOn ? "#ffffff" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* --- Voltmeter with Aquamarine Screen --- */}
        <g transform="translate(350, 60)">
          <rect x="0" y="0" width="110" height="70" rx="8" fill="#8C1A6A" shadow="lg" />
          <rect x="10" y="10" width="90" height="50" rx="4" fill="#AAFFE5" />
          <text x="55" y="45" textAnchor="middle" className="font-mono font-black fill-royalPlum" style={{ fontSize: '22px' }}>
            {voltage.toFixed(2)}<tspan fontSize="12" dx="2">V</tspan>
          </text>
        </g>

        {/* --- Electron Flow Animation (Neon Green) --- */}
        {isRunning && isSpontaneous && (
          <g>
            <path id="electronPath" d="M 200 150 L 200 100 L 600 100 L 600 150" fill="none" />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <circle r="6" fill="#5AFF15" filter="url(#neonShadow)">
                  <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`}>
                    <mpath href="#electronPath" />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
                </circle>
                {/* Electron label 'e-' */}
                <text fontSize="8" fontWeight="black" fill="#8C1A6A" textAnchor="middle" dominantBaseline="middle">
                   e-
                   <animateMotion dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`}>
                     <mpath href="#electronPath" />
                   </animateMotion>
                   <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
                </text>
              </g>
            ))}
          </g>
        )}

        {!isSpontaneous && (
           <g transform="translate(400, 140)">
              <rect x="-100" y="-15" width="200" height="30" rx="15" fill="#8C1A6A" />
              <text textAnchor="middle" dy="5" className="text-[10px] fill-white font-black uppercase tracking-tighter">
                PHẢN ỨNG KHÔNG TỰ DIỄN BIẾN
              </text>
           </g>
        )}
      </svg>
    </div>
  );
};

export default SimulationCanvas;
