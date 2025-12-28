import React, { useState } from 'react';
import { Question } from '../types';
import LatexRenderer from '../../utils/LatexRenderer';

interface QuestionModalProps {
  question: Question;
  onAnswer: (isCorrect: boolean) => void;
  playCorrectSound: () => void;
  playWrongSound: () => void;
}

const QuestionModal: React.FC<QuestionModalProps> = ({ question, onAnswer, playCorrectSound, playWrongSound }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const handleOptionClick = (optionId: string) => {
    if (showFeedback === 'correct') return; // Prevent clicking after correct answer

    setSelectedOption(optionId);

    if (optionId === question.correctAnswerId) {
      setShowFeedback('correct');
      playCorrectSound(); // Play success sound immediately
      // Delay to show success message before closing
      setTimeout(() => {
        onAnswer(true);
      }, 1500);
    } else {
      setShowFeedback('incorrect');
      playWrongSound(); // Play error sound immediately
    }
  };

  const tryAgain = () => {
    setShowFeedback(null);
    setSelectedOption(null);
  };

  return (
    // Reduced bottom padding (pb-4 md:pb-6) to move modal down by ~2%
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-4 md:pb-6 px-4 pointer-events-none">
      {/* 
        Changes implemented:
        1. max-w-[630px]: Increased width by ~15% (from 550px)
        2. min-h-[35vh]: Decreased min-height by ~5% (from 40vh)
      */}
      <div className="relative w-full max-w-[630px] min-h-[35vh] bg-white rounded-[2rem] shadow-2xl overflow-visible border-[6px] border-white ring-4 ring-yellow-300 animate-float pointer-events-auto flex flex-col">

        {/* Decorative Elements */}
        <div className="absolute -top-6 -left-6 text-5xl transform -rotate-12 drop-shadow-lg">🌸</div>
        <div className="absolute -bottom-6 -right-6 text-5xl transform rotate-12 drop-shadow-lg">🍀</div>

        {/* Header with cute shape */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-4 text-center rounded-t-[1.5rem] border-b-4 border-yellow-200 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-white drop-shadow-md tracking-wide">
            Câu hỏi số {question.id}
          </h2>
        </div>

        {/* Content - Adjusted padding for new height */}
        <div className="flex-1 p-6 py-4 md:py-6 bg-yellow-50/95 flex flex-col justify-center rounded-b-[1.5rem] relative">
          <p className="text-xl md:text-2xl text-yellow-900 font-bold mb-4 leading-relaxed text-center font-nunito">
            <LatexRenderer text={question.question} />
          </p>

          <div className="space-y-3 relative">
            {/* Options List */}
            {question.options.map((option) => {
              let buttonStyle = "border-2 border-yellow-200 bg-white hover:bg-yellow-100 hover:scale-[1.02] text-gray-700 shadow-sm";

              if (selectedOption === option.id) {
                // We keep the selected styling visible behind overlay just in case
                if (showFeedback === 'correct') {
                  buttonStyle = "bg-green-100 border-green-500 text-green-800 font-bold ring-4 ring-green-200 scale-[1.02]";
                } else if (showFeedback === 'incorrect') {
                  buttonStyle = "bg-red-100 border-red-500 text-red-800 ring-4 ring-red-200";
                }
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.id)}
                  // Maintained text size
                  className={`w-full p-3 md:p-4 text-left rounded-2xl transition-all duration-200 text-xl md:text-2xl group ${buttonStyle}`}
                  disabled={showFeedback !== null}
                >
                  <span className={`inline-block w-10 h-10 text-center leading-10 rounded-full mr-4 font-bold transition-colors text-xl ${selectedOption === option.id && showFeedback === 'correct' ? 'bg-green-500 text-white' :
                    selectedOption === option.id && showFeedback === 'incorrect' ? 'bg-red-500 text-white' :
                      'bg-yellow-200 text-yellow-800 group-hover:bg-yellow-300'
                    }`}>
                    {option.id}
                  </span>
                  <LatexRenderer text={option.text} />
                </button>
              );
            })}

            {/* FEEDBACK OVERLAY: Positioned absolutely over the options to mask them and show feedback "on top" */}
            {/* Removed animate-bounce to make it static as requested */}
            {showFeedback === 'incorrect' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-2xl border-4 border-red-300 shadow-xl">
                <p className="text-red-600 font-bold text-2xl mb-4 text-center px-4">Chưa đúng rồi em ơi! Thử lại nhé! 🤔</p>
                <button
                  onClick={tryAgain}
                  className="px-8 py-3 bg-red-500 text-white rounded-full font-bold text-xl hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                >
                  Thử lại
                </button>
              </div>
            )}

            {showFeedback === 'correct' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-2xl border-4 border-green-300">
                <p className="text-green-600 font-bold text-4xl animate-pulse text-center px-4">🎉 Xuất sắc! Quá giỏi! 🎉</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionModal;