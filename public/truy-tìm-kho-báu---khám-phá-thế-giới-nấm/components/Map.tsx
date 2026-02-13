
import React from 'react';
import { STAGES, ASSETS } from '../constants';
import { Check } from 'lucide-react';

interface MapProps {
  currentStage: number;
  completedStages: number[];
  isGameFinished?: boolean;
}

const Map: React.FC<MapProps> = ({ currentStage, completedStages, isGameFinished }) => {
  const yOffsets = [15, -15, 20, -10, 0];

  return (
    <div className="relative w-full h-full bg-white/40 backdrop-blur-sm rounded-3xl border-4 border-[#FF9800] p-4 flex items-center justify-between overflow-hidden">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 200">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        <path 
          d="M 100 100 C 200 150, 300 50, 500 100 S 800 150, 900 100" 
          fill="none" 
          stroke="#795548" 
          strokeWidth="6" 
          strokeDasharray="15 15" 
          strokeLinecap="round"
          className="opacity-30"
        />

        {STAGES.map((_, index) => {
          if (index === 0) return null;
          const isPrevCompleted = completedStages.includes(index - 1);
          if (!isPrevCompleted) return null;

          const paths = [
            "M 100 100 C 150 125, 200 135, 300 100", 
            "M 300 100 C 400 65, 450 65, 500 100",  
            "M 500 100 C 550 135, 600 135, 700 100", 
            "M 700 100 C 800 65, 850 65, 900 100"   
          ];

          return (
            <path 
              key={`path-${index}`}
              d={paths[index-1]}
              fill="none" 
              stroke="#FF9800" 
              strokeWidth="8" 
              strokeLinecap="round"
              filter="url(#glow)"
              className="animate-pulse transition-all duration-1000"
            />
          );
        })}
      </svg>

      <div className="flex w-full justify-around items-center relative z-10">
        {STAGES.map((stage, index) => {
          const isCompleted = completedStages.includes(index);
          const isCurrent = currentStage === index;
          const offset = yOffsets[index] || 0;
          
          return (
            <div 
              key={stage.id} 
              className="flex flex-col items-center gap-1 relative"
              style={{ transform: `translateY(${offset}px)` }}
            >
              {isCurrent && !isGameFinished && (
                 <div className="absolute -top-16 animate-bounce flex flex-col items-center z-20">
                   <img src={ASSETS.MAP_EXPLORER} alt="Explorer" className="w-16 h-16 object-contain" />
                 </div>
              )}
              
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all duration-500 shadow-lg border-4
                ${isCompleted ? 'bg-green-100 border-green-500' : isCurrent ? 'bg-yellow-100 border-yellow-500 scale-110' : 'bg-white border-gray-300 opacity-80'}
              `}>
                {isCompleted ? <Check className="text-green-600 w-10 h-10" /> : stage.icon}
              </div>
              
              <span className={`text-sm font-black whitespace-nowrap bg-white/80 px-2 rounded-full border border-orange-100 ${isCurrent ? 'text-orange-700' : 'text-gray-600'}`}>
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Map;
