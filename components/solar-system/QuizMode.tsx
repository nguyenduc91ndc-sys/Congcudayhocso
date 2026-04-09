import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { quizData } from './data';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { playCorrectSound, playIncorrectSound, playVictorySound } from '../../utils/soundUtils';
import confetti from 'canvas-confetti';

export const QuizMode: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>(new Array(quizData.length).fill(-1));
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const handleSelectOption = (index: number) => {
    if (userAnswers[currentQuestion] !== -1) return; // Prevent changing answer
    
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = index;
    setUserAnswers(newAnswers);
    setShowExplanation(true);

    if (index === quizData[currentQuestion].correct) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }
  };

  const handleNext = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
      const score = userAnswers.filter((ans, idx) => ans === quizData[idx].correct).length;
      if (score >= quizData.length / 2) {
        playVictorySound();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setUserAnswers(new Array(quizData.length).fill(-1));
    setShowExplanation(false);
    setIsFinished(false);
  };

  if (isFinished) {
    const score = userAnswers.filter((ans, idx) => ans === quizData[idx].correct).length;
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl w-full max-w-md text-center shadow-2xl"
        >
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.5)] border-4 border-indigo-300">
            <span className="text-4xl font-black text-white leading-none">{score * 2}</span>
            <span className="text-sm font-bold text-indigo-200">ĐIỂM</span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {score >= 3 ? "Tuyệt vời! Bé rất giỏi 🏆" : "Cố gắng lên nhé! ✌️"}
          </h2>
          <p className="text-indigo-200 mb-8 font-medium">Số câu đúng: {score}/{quizData.length}</p>

          <button
            onClick={handleRetry}
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw size={20} /> Làm lại
          </button>
        </motion.div>
      </div>
    );
  }

  const q = quizData[currentQuestion];
  const hasAnswered = userAnswers[currentQuestion] !== -1;

  return (
    <div className="w-full h-full flex flex-col items-center pt-8 sm:pt-12 px-4 overflow-y-auto">
      {/* Question Nav */}
      <div className="flex gap-3 mb-8">
        {quizData.map((_, idx) => {
          let stateClass = "bg-white/10 text-white/50 border-transparent";
          if (idx === currentQuestion) stateClass = "bg-indigo-500 text-white border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-110";
          else if (userAnswers[idx] !== -1) {
            stateClass = userAnswers[idx] === quizData[idx].correct 
              ? "bg-emerald-500 text-white border-emerald-300" 
              : "bg-rose-500 text-white border-rose-300";
          }

          return (
            <div key={idx} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${stateClass}`}>
              {idx + 1}
            </div>
          );
        })}
      </div>

      {/* Question Card */}
      <motion.div 
        key={currentQuestion}
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full max-w-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 sm:p-10 rounded-[2rem] shadow-2xl"
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-8 text-center leading-tight">
          {q.question}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.options.map((opt, idx) => {
            let btnClass = "bg-white/5 border-white/10 text-white hover:bg-white/15";
            if (hasAnswered) {
              if (idx === q.correct) btnClass = "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.4)]";
              else if (idx === userAnswers[currentQuestion]) btnClass = "bg-rose-500 border-rose-400 text-white";
              else btnClass = "bg-white/5 border-white/10 text-white/50 opacity-50";
            }

            return (
              <button
                key={idx}
                disabled={hasAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 font-semibold text-sm sm:text-base leading-relaxed transition-all duration-300 ${btnClass} ${!hasAnswered && 'active:scale-[0.98]'}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
              className="overflow-hidden"
            >
              <div className="p-4 sm:p-6 rounded-2xl bg-indigo-900/40 border border-indigo-500/30 flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  {userAnswers[currentQuestion] === q.correct ? (
                    <CheckCircle2 size={24} className="text-emerald-400" />
                  ) : (
                    <XCircle size={24} className="text-rose-400" />
                  )}
                </div>
                <div>
                  <h4 className={`font-bold mb-1 ${userAnswers[currentQuestion] === q.correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {userAnswers[currentQuestion] === q.correct ? 'Chính xác!' : 'Chưa đúng rồi!'}
                  </h4>
                  <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">{q.explanation}</p>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleNext}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 shadow-[0_5px_20px_rgba(245,158,11,0.4)] transition-transform active:scale-95 uppercase tracking-wide"
                >
                  {currentQuestion < quizData.length - 1 ? 'Tiếp theo' : 'Hoàn thành'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
