import React from 'react';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { cn } from '../lib/utils';
import { Question } from '../hooks/useGameLogic';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: number | null;
  feedback: 'correct' | 'incorrect' | null;
  currentIndex?: number;
  total?: number;
}

export function QuestionCard({ question, selectedAnswer, feedback, currentIndex = 0, total = 0 }: QuestionCardProps) {
  const letters = ['A', 'B', 'C', 'D'];
  const content = question.content || { text: question.question };
  
  return (
    <div className="bg-[var(--color-card-bg)] rounded-[3rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex-1 flex flex-col border-[6px] border-[var(--color-secondary)] relative overflow-hidden">
      {feedback && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md rounded-[2.5rem]",
            feedback === 'correct' ? "bg-green-500/30" : "bg-[var(--color-primary)]/30"
          )}
        >
          <motion.div 
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            className={cn(
              "w-48 h-48 rounded-full flex items-center justify-center text-8xl shadow-2xl border-8 border-white",
              feedback === 'correct' ? "bg-green-500 text-white" : "bg-[var(--color-primary)] text-white"
            )}
          >
            {feedback === 'correct' ? '✓' : '✗'}
          </motion.div>
        </motion.div>
      )}

      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[var(--color-secondary)] text-white px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-[0.2em] shadow-lg z-10">
        Câu hỏi {String(currentIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 mt-6 mb-10 overflow-y-auto custom-scrollbar pr-2">
        {/* Question Text */}
        {content.text && (
          <h2 className="text-[28px] md:text-[36px] font-black leading-tight text-[var(--color-dark)] text-center">
            {content.text}
          </h2>
        )}

        {/* Question Media Content */}
        <div className="w-full max-w-2xl space-y-4">
          {content.image && (
            <motion.img 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              src={content.image} 
              className="w-full max-h-[300px] object-contain rounded-3xl shadow-xl border-4 border-white" 
              referrerPolicy="no-referrer"
            />
          )}
          {content.video && (
            <motion.video 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              src={content.video} 
              controls 
              autoPlay
              className="w-full max-h-[300px] object-contain rounded-3xl shadow-xl border-4 border-white outline-none" 
            />
          )}
          {content.audio && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur p-4 rounded-2xl flex items-center gap-4 border-2 border-slate-100 shadow-sm"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Music className="w-6 h-6" />
              </div>
              <audio src={content.audio} controls className="flex-1 h-10" />
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === question.correctAnswer;
          const o = typeof option === 'string' ? { text: option } : option;
          
          let stateClass = "bg-white border-slate-100 hover:border-slate-300 shadow-sm";
          let tagClass = "bg-slate-100 text-slate-400";
          
          if (feedback) {
            if (isCorrect) {
              stateClass = "bg-green-50 border-green-500 ring-4 ring-green-100";
              tagClass = "bg-green-500 text-white";
            } else if (isSelected && !isCorrect) {
              stateClass = "bg-red-50 border-[var(--color-primary)] ring-4 ring-red-100";
              tagClass = "bg-[var(--color-primary)] text-white";
            }
          } else if (isSelected) {
            stateClass = "bg-blue-50 border-blue-500 scale-[1.02] shadow-xl ring-4 ring-blue-100";
            tagClass = "bg-blue-500 text-white";
          }

          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className={cn(
                "rounded-3xl p-4 flex items-center gap-4 border-4 transition-all duration-300 cursor-pointer relative",
                stateClass
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-sm",
                tagClass
              )}>
                {letters[index]}
              </div>
              
              <div className="flex-1 flex flex-col gap-2">
                {o.text && <span className="font-black text-lg text-slate-700 leading-tight">{o.text}</span>}
                {o.image && (
                  <img src={o.image} className="h-20 object-contain rounded-xl border-2 border-white shadow-sm self-start" referrerPolicy="no-referrer" />
                )}
                {o.audio && (
                  <audio src={o.audio} controls className="h-8 w-full" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
