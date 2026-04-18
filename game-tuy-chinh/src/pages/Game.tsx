import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { QuestionCard } from '../components/QuestionCard';
import { HandGestureDetector } from '../components/HandGestureDetector';
import { GestureResult } from '../hooks/useHandGesture';

export function Game() {
  const navigate = useNavigate();
  const { 
    currentQuestion, 
    currentQuestionIndex, 
    activeQuestions, 
    score, 
    gameState, 
    feedback, 
    answerQuestion,
    playerInfo
  } = useGame();

  const [currentGesture, setCurrentGesture] = useState<GestureResult>(null);

  useEffect(() => {
    if (gameState === 'idle') {
      navigate('/');
    } else if (gameState === 'result') {
      navigate('/result');
    }
  }, [gameState, navigate]);

  const handleGestureConfirm = (gesture: GestureResult) => {
    if (feedback || !gesture) return;
    
    let answerIndex = -1;
    if (gesture === 'A') answerIndex = 0;
    if (gesture === 'B') answerIndex = 1;
    if (gesture === 'C') answerIndex = 2;
    if (gesture === 'D') answerIndex = 3;

    if (answerIndex !== -1) {
      answerQuestion(answerIndex);
    }
  };

  if (!currentQuestion) return null;

  let selectedAnswerIndex = -1;
  if (currentGesture === 'A') selectedAnswerIndex = 0;
  if (currentGesture === 'B') selectedAnswerIndex = 1;
  if (currentGesture === 'C') selectedAnswerIndex = 2;
  if (currentGesture === 'D') selectedAnswerIndex = 3;

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col text-[var(--color-dark)] font-sans">
      <header className="bg-[var(--color-primary)] text-white px-8 py-4 flex justify-between items-center shadow-[0_4px_10px_rgba(0,0,0,0.1)] z-10">
        <div className="text-2xl font-black tracking-wide flex items-center gap-2">
          <span>🏛️</span>
          GAME TÙY CHỈNH
        </div>
        <div className="flex gap-4 items-center">
          <div className="bg-white/20 px-4 py-1.5 rounded-full font-semibold text-sm">
            {playerInfo?.name} - Lớp {playerInfo?.className}
          </div>
          <div className="bg-[var(--color-accent)] text-[var(--color-dark)] px-4 py-1.5 rounded-full font-semibold text-sm">
            Cấp độ: {playerInfo?.level === 'easy' ? 'Dễ' : playerInfo?.level === 'medium' ? 'Trung bình' : playerInfo?.level === 'hard' ? 'Khó' : 'Tất cả'}
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 p-5 max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col gap-5">
          <QuestionCard 
            question={currentQuestion} 
            selectedAnswer={selectedAnswerIndex !== -1 ? selectedAnswerIndex : null} 
            feedback={feedback}
            currentIndex={currentQuestionIndex}
            total={activeQuestions.length}
          />
        </div>

        <div className="flex flex-col gap-5">
          <HandGestureDetector 
            onGestureConfirm={handleGestureConfirm} 
            onGestureChange={setCurrentGesture}
            disabled={feedback !== null}
          />

          <div className="flex justify-around bg-[var(--color-dark)] text-white p-4 rounded-2xl">
            <div className="text-center">
              <span className="block text-xl font-black text-[var(--color-accent)]">{score}</span>
              <span className="text-[10px] uppercase opacity-70">Điểm</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-black text-[var(--color-accent)]">{currentQuestionIndex}</span>
              <span className="text-[10px] uppercase opacity-70">Đã trả lời</span>
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-2xl p-5 flex-1 shadow-[0_4px_15px_rgba(0,0,0,0.05)] border-2 border-slate-100">
            <div className="text-sm font-black uppercase mb-4 text-[#718096] flex items-center gap-2">
              <span className="w-2 h-4 bg-[var(--color-primary)] rounded-full"></span>
              Hướng dẫn cử chỉ
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                <div className="w-10 h-10 bg-white shadow-sm rounded-lg flex items-center justify-center text-xl">☝️</div>
                <div>
                  <div className="font-black text-[var(--color-dark)] text-sm">Cử chỉ A</div>
                  <div className="text-[11px] font-medium text-slate-500">Giơ 1 ngón tay</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                <div className="w-10 h-10 bg-white shadow-sm rounded-lg flex items-center justify-center text-xl">✌️</div>
                <div>
                  <div className="font-black text-[var(--color-dark)] text-sm">Cử chỉ B</div>
                  <div className="text-[11px] font-medium text-slate-500">Giơ 2 ngón tay</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                <div className="w-10 h-10 bg-white shadow-sm rounded-lg flex items-center justify-center text-xl">🤟</div>
                <div>
                  <div className="font-black text-[var(--color-dark)] text-sm">Cử chỉ C</div>
                  <div className="text-[11px] font-medium text-slate-500">Giơ 3 ngón tay</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                <div className="w-10 h-10 bg-white shadow-sm rounded-lg flex items-center justify-center text-xl">🖐️</div>
                <div>
                  <div className="font-black text-[var(--color-dark)] text-sm">Cử chỉ D</div>
                  <div className="text-[11px] font-medium text-slate-500">Giơ 5 ngón tay</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Dừng chọn</div>
                <p className="text-[10px] text-red-700 leading-relaxed font-medium">
                  Nắm tay lại (✊) để tạm dừng nhận diện hoặc tránh việc chọn nhầm khi đang suy nghĩ.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
