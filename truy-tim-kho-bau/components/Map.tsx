
import React from 'react';
import { ASSETS } from '../constants';
import { Check } from 'lucide-react';

interface Stage {
  id: number;
  name: string;
  icon: string;
}

interface MapProps {
  currentStage: number;
  completedStages: number[];
  isGameFinished?: boolean;
  stages?: Stage[];
}

const Map: React.FC<MapProps> = ({ currentStage, completedStages, isGameFinished, stages }) => {
  const defaultStages = [
    { id: 0, name: 'Chặng 1', icon: '🍄' },
    { id: 1, name: 'Chặng 2', icon: '💧' },
    { id: 2, name: 'Chặng 3', icon: '🧗' },
    { id: 3, name: 'Chặng 4', icon: '⛰️' },
    { id: 4, name: 'Chặng 5', icon: '💎' },
  ];

  const displayStages = stages || defaultStages;
  const stageCount = displayStages.length;

  // Tính vị trí Y dao động cho map
  const getYOffset = (index: number) => {
    const offsets = [15, -15, 20, -10, 0, 12, -18, 8, -12, 15];
    return offsets[index % offsets.length];
  };

  // Tính vị trí X trên SVG
  const getXPos = (index: number) => {
    if (stageCount <= 1) return 500;
    return 100 + (index * (800 / (stageCount - 1)));
  };

  return (
    <div className="relative w-full h-full bg-white/40 backdrop-blur-sm rounded-3xl border-4 border-[#FF9800] p-4 flex items-center justify-between overflow-visible">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 200">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Đường path chấm nối các chặng */}
        {stageCount > 1 && (
          <path
            d={`M ${getXPos(0)} 100 ${displayStages.slice(1).map((_, i) => {
              const x = getXPos(i + 1);
              const cy1 = i % 2 === 0 ? 150 : 50;
              return `Q ${(getXPos(i) + x) / 2} ${cy1}, ${x} 100`;
            }).join(' ')}`}
            fill="none"
            stroke="#795548"
            strokeWidth="6"
            strokeDasharray="15 15"
            strokeLinecap="round"
            className="opacity-30"
          />
        )}

        {/* Đường đã hoàn thành */}
        {displayStages.map((_, index) => {
          if (index === 0) return null;
          const isPrevCompleted = completedStages.includes(index - 1);
          if (!isPrevCompleted) return null;

          const x1 = getXPos(index - 1);
          const x2 = getXPos(index);
          const cy = (index - 1) % 2 === 0 ? 150 : 50;

          return (
            <path
              key={`path-${index}`}
              d={`M ${x1} 100 Q ${(x1 + x2) / 2} ${cy}, ${x2} 100`}
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
        {displayStages.map((stage, index) => {
          const isCompleted = completedStages.includes(index);
          const isCurrent = currentStage === index;
          const offset = getYOffset(index);

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
