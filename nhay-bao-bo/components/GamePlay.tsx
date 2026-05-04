import React, { useState, useEffect, useRef } from 'react';
import { Track } from './Track';
import { PlayerPanel } from './PlayerPanel';
import { Question, TeamId, GameState, INITIAL_TEAM_STATE } from '../types';
import confetti from 'canvas-confetti';
import { Maximize, Settings as SettingsIcon, RotateCcw, Home as HomeIcon } from 'lucide-react';

let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const playSound = (type: 'correct' | 'incorrect' | 'win') => {
  if (type === 'win') {
    new Audio('/sounds/Am_thanh_chuc_mung_chien_thang-www_tiengdong_com.mp3').play().catch(() => {});
    return;
  }
  if (type === 'incorrect') {
    new Audio('/sounds/Am_thanh_tra_loi_sai-www_tiengdong_com.mp3').play().catch(() => {});
    return;
  }
  
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
};

interface GamePlayProps {
  questions: Question[];
  onBackToSettings: () => void;
  onHome: () => void;
}

export const GamePlay: React.FC<GamePlayProps> = ({ questions, onBackToSettings, onHome }) => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'playing',
    questions: questions,
    team1: { ...INITIAL_TEAM_STATE }, // Blue
    team2: { ...INITIAL_TEAM_STATE }, // Red
    winner: null,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mốc chiến thắng là phải trả lời đúng bằng tổng số câu hỏi đã nhập
  const TARGET_SCORE = questions.length;

  const triggerWin = (team: TeamId) => {
    playSound('win');
    setGameState(prev => ({ ...prev, status: 'finished', winner: team }));
    
    // Confetti effect
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleAnswer = (team: TeamId, answerIndex: number) => {
    if (gameState.status !== 'playing') return;
    const tState = gameState[team];
    if (tState.isPenalty || tState.isFinished) return;

    const currentQ = questions[tState.currentQuestionIndex];
    
    if (answerIndex === currentQ.correctAnswerIndex) {
      playSound('correct');
      // Đúng -> Tăng điểm, tiến tới câu tiếp theo
      const newScore = tState.score + 1;
      const nextIndex = (tState.currentQuestionIndex + 1) % questions.length;
      
      setGameState(prev => {
        const newState = {
          ...prev,
          [team]: {
            ...prev[team],
            score: newScore,
            currentQuestionIndex: nextIndex,
            isFinished: newScore >= TARGET_SCORE
          }
        };
        if (newScore >= TARGET_SCORE && prev.status === 'playing') {
           setTimeout(() => triggerWin(team), 100); // delay slight for state update
        }
        return newState;
      });

      // Bắn pháo hoa nhỏ
      const xOrigin = team === 'team1' ? 0.25 : 0.75;
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.8, x: xOrigin },
        colors: team === 'team1' ? ['#3b82f6', '#ffffff'] : ['#ef4444', '#ffffff']
      });

    } else {
      playSound('incorrect');
      // Sai -> Phạt 3s, sau đó chuyển câu
      setGameState(prev => ({
        ...prev,
        [team]: { ...prev[team], isPenalty: true, penaltyTimeLeft: 3000 }
      }));
    }
  };

  // Vòng lặp đếm quá trình phạt
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    timerRef.current = setInterval(() => {
      setGameState(prev => {
        let changed = false;
        const newState = { ...prev };

        ['team1', 'team2'].forEach((t) => {
          const team = t as TeamId;
          if (newState[team].isPenalty) {
            changed = true;
            newState[team].penaltyTimeLeft -= 100;
            
            if (newState[team].penaltyTimeLeft <= 0) {
              // Hết phạt -> Bỏ qua câu đó, chuyển sang câu tiếp
              newState[team].isPenalty = false;
              newState[team].penaltyTimeLeft = 0;
              newState[team].currentQuestionIndex = (newState[team].currentQuestionIndex + 1) % questions.length;
            }
          }
        });

        return changed ? newState : prev;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.status, questions.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleRestart = () => {
    setGameState({
      status: 'playing',
      questions: questions,
      team1: { ...INITIAL_TEAM_STATE },
      team2: { ...INITIAL_TEAM_STATE },
      winner: null,
    });
  };

  // Tính phần trăm chặng đua
  const percent1 = (gameState.team1.score / TARGET_SCORE) * 100;
  const percent2 = (gameState.team2.score / TARGET_SCORE) * 100;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-900 font-sans">
      {/* TRANG TRÍ MÀN HÌNH CHỜ / KẾT THÚC */}
      {gameState.status === 'finished' && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center animate-bounce">
            <h1 className={`text-6xl md:text-8xl font-black mb-8 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] ${gameState.winner === 'team1' ? 'text-blue-500' : 'text-red-500'}`}>
              ĐỘI {gameState.winner === 'team1' ? 'XANH' : 'ĐỎ'} CHIẾN THẮNG!
            </h1>
            <div className="flex gap-4 justify-center">
              <button onClick={handleRestart} className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition text-xl flex items-center gap-2">
                <RotateCcw /> Chơi lại
              </button>
              <button onClick={onBackToSettings} className="px-8 py-4 bg-gray-700 text-white font-bold rounded-full hover:bg-gray-600 transition text-xl flex items-center gap-2">
                <SettingsIcon /> Về cài đặt
              </button>
              <button onClick={onHome} className="px-8 py-4 bg-gray-700 text-white font-bold rounded-full hover:bg-gray-600 transition text-xl flex items-center gap-2">
                <HomeIcon /> Trang chủ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button onClick={handleRestart} className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow transition" title="Chơi lại">
          <RotateCcw size={20} />
        </button>
        <button onClick={toggleFullscreen} className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow transition" title="Toàn màn hình">
          <Maximize size={20} />
        </button>
        <button onClick={onBackToSettings} className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow transition" title="Cấu hình">
          <SettingsIcon size={20} />
        </button>
        <button onClick={onHome} className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow transition" title="Trang chủ">
          <HomeIcon size={20} />
        </button>
      </div>

      {/* TRACK (Nửa trên) */}
      <Track score1={percent1} score2={percent2} />

      {/* QUESTION PANELS (Nửa dưới) */}
      <div className="flex w-full flex-1">
        <PlayerPanel
          teamName="ĐỘI XANH"
          theme="blue"
          question={questions[gameState.team1.currentQuestionIndex] || null}
          score={percent1}
          isPenalty={gameState.team1.isPenalty}
          penaltyTimeLeft={gameState.team1.penaltyTimeLeft}
          keys={['W', 'A', 'S', 'D']}
          keyCodes={['KeyW', 'KeyA', 'KeyS', 'KeyD']}
          onAnswer={(idx) => handleAnswer('team1', idx)}
          isFinished={gameState.team1.isFinished}
        />
        <div className="w-2 bg-gray-900 z-10 shadow-2xl relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 border-4 border-gray-700 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                VS
            </div>
        </div>
        <PlayerPanel
          teamName="ĐỘI ĐỎ"
          theme="red"
          question={questions[gameState.team2.currentQuestionIndex] || null}
          score={percent2}
          isPenalty={gameState.team2.isPenalty}
          penaltyTimeLeft={gameState.team2.penaltyTimeLeft}
          keys={['▲', '◀', '▼', '▶']}
          keyCodes={['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']}
          onAnswer={(idx) => handleAnswer('team2', idx)}
          isFinished={gameState.team2.isFinished}
        />
      </div>
    </div>
  );
};
