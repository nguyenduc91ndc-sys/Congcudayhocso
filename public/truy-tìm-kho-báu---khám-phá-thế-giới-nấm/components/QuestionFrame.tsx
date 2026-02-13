
import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../types';
import { ASSETS } from '../constants';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface QuestionFrameProps {
  question: Question;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  isCorrect: boolean | null;
  isLastStage: boolean;
}

const QuestionFrame: React.FC<QuestionFrameProps> = ({ question, onAnswer, onNext, isCorrect, isLastStage }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const correctAudio = useRef<HTMLAudioElement>(new Audio(ASSETS.SFX_CORRECT));
  const wrongAudio = useRef<HTMLAudioElement>(new Audio(ASSETS.SFX_WRONG));
  const tingAudio = useRef<HTMLAudioElement>(new Audio(ASSETS.SFX_TRANSITION));

  useEffect(() => {
    setSelectedOption(null);
    setShowExplanation(false);
  }, [question]);

  const handleOptionClick = (option: string) => {
    if (showExplanation) return;
    setSelectedOption(option);
    const correct = option === question.answer;
    onAnswer(correct);
    
    if (correct) {
      correctAudio.current.currentTime = 0;
      correctAudio.current.play();
      setShowExplanation(true);
    } else {
      wrongAudio.current.currentTime = 0;
      wrongAudio.current.play();
    }
  };

  const handleNextClick = () => {
    tingAudio.current.currentTime = 0;
    tingAudio.current.play();
    onNext();
  };

  // Determine which image to show
  const currentImage = (isLastStage && isCorrect) ? ASSETS.CHANG5_B : question.stageImage;

  return (
    <div className="w-[85%] h-full mx-auto flex gap-6 bg-white/70 backdrop-blur-md rounded-3xl border-[6px] border-[#FF9800] p-6 shadow-2xl relative overflow-hidden">
      {/* Left: Stage Image */}
      <div className="w-1/3 h-full rounded-2xl overflow-hidden shadow-inner border-2 border-orange-200 bg-white">
        <img 
          src={currentImage} 
          alt={question.stageName} 
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
        />
      </div>

      {/* Right: Question and Answers */}
      <div className="w-2/3 h-full flex flex-col justify-between overflow-y-auto pr-2">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-lg font-bold">
              {question.stageName} - {question.type}
            </span>
            
            <div className="flex items-center gap-4">
              {isCorrect !== null && (
                 <div className={`flex items-center gap-2 font-bold text-xl ${isCorrect ? 'text-green-600' : 'text-red-500'} ${!showExplanation ? 'animate-bounce' : ''}`}>
                   {isCorrect ? <><CheckCircle2 size={24} /> Đúng rồi!</> : <><XCircle size={24} /> Thử lại xem sao!</>}
                 </div>
              )}

              {showExplanation && (
                <button 
                  onClick={handleNextClick}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full text-xl font-bold shadow-lg transform hover:scale-105 active:scale-95 transition-all animate-fade-in"
                >
                  TIẾP TỤC <ArrowRight size={24} />
                </button>
              )}
            </div>
          </div>
          
          <h2 className="text-[32px] font-bold text-orange-900 leading-tight mb-4 shrink-0">
            {question.question}
          </h2>

          <div className="grid grid-cols-1 gap-3 overflow-y-auto">
            {question.options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isWrong = isSelected && !isCorrect;
              const isRight = isSelected && isCorrect;

              return (
                <button
                  key={idx}
                  disabled={showExplanation && !isRight}
                  onClick={() => handleOptionClick(option)}
                  className={`
                    w-full text-left px-6 py-3 rounded-xl text-[28px] font-medium transition-all duration-300
                    border-2 flex items-center justify-between group
                    ${isSelected ? 'shadow-lg ring-2 ring-orange-400' : 'hover:bg-orange-50 border-orange-100'}
                    ${isRight ? 'bg-green-100 border-green-500 text-green-800' : 
                      isWrong ? 'bg-red-50 border-red-300 text-red-600' : 
                      'bg-white text-gray-800 border-orange-100'}
                  `}
                >
                  <span className="leading-tight">{option}</span>
                  {isRight && <CheckCircle2 className="text-green-600 shrink-0" size={32} />}
                  {isWrong && <XCircle className="text-red-500 shrink-0" size={32} />}
                </button>
              );
            })}
          </div>
        </div>

        {showExplanation && (
          <div className="mt-4 p-5 bg-orange-100/90 rounded-2xl border-2 border-orange-300 animate-fade-in shadow-inner shrink-0">
            <p className="text-[26px] text-orange-900 font-medium leading-relaxed italic">
              <strong>💡 Giải thích:</strong> {question.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionFrame;
