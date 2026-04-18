import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { Leaderboard } from '../components/Leaderboard';
import { motion } from 'framer-motion';
import { RotateCcw, Home as HomeIcon } from 'lucide-react';

export function Result() {
  const navigate = useNavigate();
  const { score, playerInfo, resetGame, gameState, gameId, gameTitle } = useGame();
  const [rank, setRank] = React.useState<number | null>(null);

  useEffect(() => {
    if (gameState === 'idle') {
      navigate('/');
      return;
    }

    // Rank is now best managed via the Leaderboard component itself or 
    // we could fetch it here if we really wanted to show 'Hạng X' explicitly.
    // Given the score is saved in useGameLogic.endGame, we just show the results here.
  }, [gameState, navigate]);

  const handlePlayAgain = () => {
    const currentId = gameId; // Keep ID to navigate back to same game
    resetGame();
    navigate(currentId ? `/?id=${currentId}` : '/');
  };

  const handleHome = () => {
    resetGame();
    navigate('/');
  };

  if (!playerInfo) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 text-center relative overflow-hidden border border-slate-100"
          >
            {/* Confetti effect background (simplified) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-10 left-10 w-4 h-4 bg-red-400 rounded-full animate-bounce"></div>
              <div className="absolute top-20 right-20 w-6 h-6 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="absolute bottom-20 left-1/4 w-5 h-5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.7s' }}></div>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight">
              Chúc mừng, {playerInfo.name}! 🎉
            </h1>
            <p className="text-slate-500 font-bold text-lg mb-2">{gameTitle || 'Bài thi lịch sử'}</p>
            <p className="text-slate-400 font-medium mb-8">Bạn đã hoàn thành xuất sắc!</p>

            <div className="inline-block bg-gradient-to-br from-blue-50 to-purple-50 p-8 md:p-12 rounded-full border-[12px] border-white shadow-2xl mb-10 relative">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Tổng điểm đạt được</div>
              <div className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 leading-none">
                {score}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <button 
                onClick={handlePlayAgain}
                className="px-8 py-5 bg-[var(--color-primary)] text-white rounded-2xl font-black text-xl shadow-[0_6px_0_#9b2c2c] hover:translate-y-[2px] hover:shadow-[0_3px_0_#9b2c2c] transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <RotateCcw className="w-6 h-6" />
                CHƠI LẠI
              </button>
              <button 
                onClick={handleHome}
                className="px-8 py-5 bg-white text-slate-700 border-2 border-slate-200 rounded-2xl font-black text-xl shadow-[0_6px_0_#cbd5e1] hover:translate-y-[2px] hover:shadow-[0_3px_0_#cbd5e1] transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <HomeIcon className="w-6 h-6" />
                DỀ TRANG CHỦ
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div
           initial={{ opacity: 0, x: 30 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.2 }}
        >
          <Leaderboard limit={20} gameId={gameId} />
        </motion.div>

      </div>
    </div>
  );
}

