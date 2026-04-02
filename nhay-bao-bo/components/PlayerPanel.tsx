import React, { useEffect } from 'react';
import { Question } from '../types';

interface PlayerPanelProps {
  teamName: string;
  theme: 'blue' | 'red';
  question: Question | null;
  score: number;
  isPenalty: boolean;
  penaltyTimeLeft: number;
  keys: string[]; // ['A', 'B', 'C', 'D'] or ['W', 'A', 'S', 'D'] for display and binding
  keyCodes: string[]; // actual e.key values: ['w', 'a', 's', 'd'] or ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']
  onAnswer: (selectedIndex: number) => void;
  isFinished: boolean;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  teamName,
  theme,
  question,
  score,
  isPenalty,
  penaltyTimeLeft,
  keys,
  keyCodes,
  onAnswer,
  isFinished,
}) => {
  const isBlue = theme === 'blue';
  const bgColor = isBlue ? 'bg-blue-600' : 'bg-red-500';
  const borderColor = isBlue ? 'border-blue-400' : 'border-red-400';
  const scoreBgColor = isBlue ? 'bg-blue-800' : 'bg-red-700';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if finished, penaltied, or no question
      if (isFinished || isPenalty || !question) return;

      const keyIndex = keyCodes.indexOf(e.key);
      if (keyIndex !== -1) {
        onAnswer(keyIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, isPenalty, question, keyCodes, onAnswer]);

  if (isFinished) {
    return (
      <div className={`flex-1 ${bgColor} p-6 h-[50vh] flex flex-col items-center justify-center text-white relative`}>
        <div className="absolute inset-0 bg-black/20" />
        <h2 className="text-4xl font-black mb-4 z-10 animate-bounce">XUẤT SẮC! 🎉</h2>
        <p className="text-xl font-bold z-10">Đã hoàn thành đường đua!</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className={`flex-1 ${bgColor} p-6 h-[50vh] flex items-center justify-center text-white/50 text-xl font-bold`}>
        Đang chờ câu hỏi...
      </div>
    );
  }

  return (
    <div className={`flex-1 ${bgColor} p-6 md:p-8 h-[50vh] flex flex-col text-white relative overflow-hidden transition-all duration-300`}>
      {/* Overlay Penalty */}
      {isPenalty && (
        <div className="absolute inset-0 bg-red-900/90 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
          <h1 className="text-6xl font-black text-red-100 mb-4 animate-pulse">SAI RỒI!</h1>
          <div className="w-24 h-24 rounded-full border-8 border-red-500 border-t-white animate-spin flex items-center justify-center">
            <span className="text-4xl font-bold animate-none text-white" style={{ animation: 'none' }}>{Math.ceil(penaltyTimeLeft / 1000)}</span>
          </div>
          <p className="mt-4 text-xl font-bold text-red-200">Đang đóng băng...</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider">{teamName}</h2>
        <div className={`${scoreBgColor} px-4 py-1.5 rounded-full font-bold text-lg shadow-inner`}>
          {Math.round(score)}%
        </div>
      </div>

      {/* Question Text */}
      <div className="flex-1 flex items-center justify-center mb-6">
        <h3 className="text-2xl md:text-4xl font-bold text-center leading-tight drop-shadow-md">
          {question.text}
        </h3>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-2 gap-4 mt-auto">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onAnswer(idx)}
            disabled={isPenalty || isFinished}
            className={`
              relative p-4 md:p-6 rounded-2xl font-bold text-lg md:text-xl transition-transform active:scale-95 shadow-lg flex items-center justify-center
              bg-white text-gray-800 hover:bg-gray-100 border-b-4 ${borderColor}
            `}
          >
            {/* Phím tắt gc trên trái */}
            <span className="absolute top-2 left-3 text-xs md:text-sm font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded opacity-70">
              {keys[idx]}
            </span>
            <span className="text-center">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
