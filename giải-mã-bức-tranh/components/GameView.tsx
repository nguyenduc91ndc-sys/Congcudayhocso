
import React, { useState, useEffect } from 'react';
import { GameConfig } from '../types';
import { playSound, preloadSounds } from '../utils/soundUtils';
import introVideo from '../Video/Video gioi thieu.mp4';

interface GameViewProps {
  studentName: string;
  config: GameConfig;
  onExit: () => void;
}

const GameView: React.FC<GameViewProps> = ({ studentName, config, onExit }) => {
  const [showIntroVideo, setShowIntroVideo] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.log('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const currentQuestion = config.questions[currentQuestionIndex];
  const totalQuestions = config.questions.length;

  const handleAnswer = (optionIndex: number) => {
    // Phát âm thanh click
    playSound('click');

    setSelectedOption(optionIndex);
    if (optionIndex === currentQuestion.correctIndex) {
      // Phát âm thanh trả lời đúng
      playSound('correct');
      setIsWrong(false);
      // Mở mảnh ghép tương ứng với câu hỏi hiện tại
      setRevealedTiles(prev => [...prev, currentQuestionIndex]);
      setTimeout(() => {
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedOption(null);
        } else {
          setGameComplete(true);
          playSound('victory');
        }
      }, 1200);
    } else {
      // Phát âm thanh trả lời sai
      playSound('wrong');
      setIsWrong(true);
      setTimeout(() => {
        setIsWrong(false);
        setSelectedOption(null);
      }, 800);
    }
  };

  // Preload âm thanh khi component mount
  useEffect(() => {
    preloadSounds();
  }, []);

  if (showIntroVideo) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
        {/* Colorful Animated Frame Wrapper */}
        <div className="relative w-full max-w-5xl rounded-[2rem] p-[6px] shadow-[0_0_40px_rgba(236,72,153,0.4)]">
          {/* Animated Gradient Border (Background Layer) */}
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 animate-[pulse_2s_ease-in-out_infinite]"></div>

          {/* Inner Black Box (Video Content) - No Animation Here */}
          <div className="relative w-full aspect-video bg-black rounded-[1.7rem] overflow-hidden shadow-2xl border-4 border-black ring-1 ring-white/20 z-10">
            <video
              src={introVideo}
              className="w-full h-full object-contain"
              autoPlay
              onEnded={() => setShowIntroVideo(false)}
            />

            {/* TV Screen Glare Effect (Optional subtle gradient overlay) */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-[1.7rem]"></div>

            <button
              onClick={() => setShowIntroVideo(false)}
              className="absolute bottom-6 right-6 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center gap-2 border-2 border-white/20 z-20 group"
            >
              Bỏ qua <span className="text-xl group-hover:translate-x-1 transition-transform">⏭️</span>
            </button>
          </div>

          {/* Decorative Cute Paws/Stars (Absolute positioned on the frame) */}
          <div className="absolute -top-4 -left-4 text-4xl animate-bounce">🐾</div>
          <div className="absolute -bottom-4 -right-4 text-4xl animate-bounce delay-100">✨</div>
          <div className="absolute -top-4 -right-4 text-4xl animate-pulse delay-75">🌟</div>
          <div className="absolute -bottom-4 -left-4 text-4xl animate-pulse delay-150">🐾</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col p-6 animate-fade-in overflow-hidden">
      {/* Background particles */}
      <div className="bg-particles"></div>

      {/* Header */}
      <header className="flex justify-between items-center glass-card p-5 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-float">
            🎓
          </div>
          <div>
            <h2 className="font-bold text-white text-xl">Xin chào, {studentName}!</h2>
            {/* Progress Bar Container */}
            <div className="flex flex-col w-[300px] md:w-[400px]">
              <div className="flex justify-between items-end mb-1 px-1">
                <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
                  {gameComplete ? '🎉 HOÀN THÀNH!' : `ĐANG TRẢ LỜI: ${currentQuestionIndex + 1} / ${totalQuestions}`}
                </span>
              </div>

              <div className="relative h-4 w-full bg-black/20 rounded-full backdrop-blur-sm border border-white/10 mt-2">
                {/* Track Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/30 -translate-y-1/2 rounded-full"></div>

                {/* Steps (Dots) */}
                {Array.from({ length: totalQuestions }).map((_, idx) => {
                  const isActive = idx <= currentQuestionIndex;
                  return (
                    <div
                      key={idx}
                      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all duration-500 ${isActive ? 'bg-yellow-400 border-yellow-200 scale-110 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-white/20 border-white/40'
                        }`}
                      style={{ left: `${(idx / (totalQuestions - 1 || 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  );
                })}

                {/* Moving Character (Cat) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-elastic-out z-10"
                  style={{
                    left: `${(Math.min(currentQuestionIndex, totalQuestions - 1) / (totalQuestions - 1 || 1)) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="relative">
                    <span className="text-3xl filter drop-shadow-lg block -mt-4 animate-bounce-gentle">
                      🐱
                    </span>
                    {/* Tooltip nhỏ báo vị trí */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/90 text-[10px] font-bold px-1.5 py-0.5 rounded text-indigo-900 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      Bạn ở đây
                    </div>
                  </div>
                </div>

                {/* Goal (Fish) */}
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-0"
                  style={{ right: '-10px' }}
                >
                  <span className="text-2xl filter drop-shadow-md animate-pulse">🐟</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="cute-3d-button px-6 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', boxShadow: '0 6px 0 #0891b2, 0 10px 20px rgba(79, 172, 254, 0.4)' }}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          >
            {isFullscreen ? '🔽 Thu nhỏ' : '📺 Phóng to'}
          </button>
          <button
            onClick={onExit}
            className="cute-3d-button px-8"
            style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', boxShadow: '0 6px 0 #d64469, 0 10px 20px rgba(245, 87, 108, 0.4)' }}
          >
            Thoát
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex items-center justify-center">
        {!gameComplete ? (
          <div className="w-full max-w-[1440px] grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Cột trái: Câu hỏi */}
            <div className={`bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/50 p-10 transition-all duration-300 ${isWrong ? 'animate-shake-container' : ''}`}>
              <div className="mb-8">
                <span className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold rounded-full mb-4">
                  Câu hỏi {currentQuestionIndex + 1}
                </span>
                <h3
                  className="font-bold leading-tight animate-slide-up"
                  key={`q-${currentQuestionIndex}`}
                  style={{
                    fontSize: currentQuestion.styles?.questionFontSize || '1.875rem',
                    color: currentQuestion.styles?.questionColor || '#1f2937'
                  }}
                >
                  {currentQuestion.content}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4" key={`options-${currentQuestionIndex}`}>
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQuestion.correctIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      onMouseEnter={() => playSound('hover')}
                      disabled={selectedOption !== null && !isWrong}
                      style={{
                        fontSize: currentQuestion.styles?.optionsFontSize || '1.25rem',
                        color: isSelected ? (isCorrect ? '#166534' : '#991b1b') : (currentQuestion.styles?.optionsColor || '#1f2937')
                      }}
                      className={`p-5 text-left font-bold rounded-2xl border-2 transition-all transform active:scale-95 flex items-center relative overflow-hidden group shadow-lg cursor-pointer ${isSelected
                        ? isCorrect
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-500 animate-correct-flair'
                          : 'bg-gradient-to-r from-red-100 to-pink-100 border-red-500 animate-wrong-shake'
                        : 'bg-white border-indigo-200 hover:border-indigo-400 hover:-translate-y-1 hover:shadow-xl'
                        }`}
                    >
                      <span className={`flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl text-center mr-4 text-lg font-black transition-all duration-300 ${isSelected
                        ? isCorrect
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white scale-110 shadow-lg'
                          : 'bg-gradient-to-br from-red-500 to-pink-600 text-white'
                        : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 group-hover:from-indigo-200 group-hover:to-purple-200'
                        }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {isSelected && isCorrect && (
                        <>
                          <span className="text-3xl ml-2">✓</span>
                          <span className="absolute -top-1 -right-1 text-5xl animate-bounce-happy filter drop-shadow-md z-10">
                            🐶❤️
                          </span>
                        </>
                      )}
                      {isSelected && !isCorrect && (
                        <>
                          <span className="text-3xl ml-2">✗</span>
                          <span className="absolute -top-1 -right-1 text-5xl animate-shake-sad filter drop-shadow-md z-10">
                            😿💧
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cột phải: Bức tranh */}
            <div className="flex items-center justify-center">
              <div className="relative aspect-video w-full bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/50 p-4 overflow-hidden">
                <div className="relative w-full h-full rounded-2xl overflow-hidden">
                  <img src={config.hiddenImage} alt="Secret" className="w-full h-full object-cover" />

                  {(() => {
                    // Tự động tính toán số hàng và cột tối ưu
                    const n = totalQuestions;
                    let cols = Math.ceil(Math.sqrt(n));
                    if (n <= 3) cols = n;
                    let rows = Math.ceil(n / cols);

                    // Logic swap để ưu tiên landscape (ngang > dọc) cho màn hình 16:9
                    if (cols < rows) [cols, rows] = [rows, cols];

                    const colorPalettes = [
                      ['#FF6B6B', '#FF8E53'], ['#4ECDC4', '#44A08D'], ['#667eea', '#764ba2'],
                      ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'],
                      ['#fa709a', '#fee140'], ['#a8edea', '#fed6e3'], ['#ff9a9e', '#fad0c4'],
                      ['#ffecd2', '#fcb69f'], ['#a18cd1', '#fbc2eb'], ['#ffd89b', '#19547b'],
                    ];

                    return (
                      <div className="absolute inset-0 flex flex-col">
                        {Array.from({ length: rows }).map((_, rowIdx) => {
                          // Tính số tile trong hàng này
                          const startIdx = rowIdx * cols;
                          const endIdx = Math.min(startIdx + cols, n);
                          const itemsInThisRow = endIdx - startIdx;

                          return (
                            <div key={rowIdx} className="flex flex-1">
                              {Array.from({ length: itemsInThisRow }).map((_, colIdx) => {
                                const idx = startIdx + colIdx;
                                const palette = colorPalettes[idx % colorPalettes.length];
                                const isRevealed = revealedTiles.includes(idx);

                                return (
                                  <div
                                    key={idx}
                                    className={`flex-1 relative transition-all duration-700 flex items-center justify-center ${isRevealed ? 'opacity-0 scale-0 rotate-180' : 'opacity-100 scale-100'}`}
                                    style={{
                                      background: `linear-gradient(145deg, ${palette[0]} 0%, ${palette[1]} 100%)`,
                                      transitionDelay: isRevealed ? `${(idx % 4) * 100}ms` : '0ms',
                                      boxShadow: 'inset 3px 3px 8px rgba(255,255,255,0.4), inset -2px -2px 6px rgba(0,0,0,0.15)',
                                      border: '1px solid rgba(255,255,255,0.15)',
                                      transform: isRevealed ? 'scale(0) rotate(180deg)' : 'scale(1)',
                                    }}
                                  >
                                    <span className="text-4xl font-black text-white drop-shadow-md select-none">
                                      {idx + 1}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Màn hình hoàn thành - Full Screen Show */
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a] animate-fade-in p-8">
            {/* Background particles overlay for ambient effect */}
            <div className="absolute inset-0 bg-particles opacity-50 z-0"></div>

            <div className="relative z-10 w-full max-w-5xl flex flex-col items-center gap-8">
              <div className="text-center space-y-2">
                <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 drop-shadow-2xl animate-bounce">
                  🏆 CHÚC MỪNG {studentName.toUpperCase()}! 🏆
                </h2>
                <p className="text-xl text-indigo-200 font-bold tracking-widest uppercase">
                  Bạn đã khám phá ra bí mật!
                </p>
              </div>

              {/* Khung ảnh tỏa sáng - Tỷ lệ ngang 16:9 */}
              <div className="relative w-full aspect-video max-h-[65vh] rounded-[2rem] p-2 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 animate-border-glow shadow-2xl">
                <div className="absolute inset-0 bg-white/20 blur-xl animate-pulse"></div>
                <div className="relative w-full h-full rounded-[1.8rem] overflow-hidden border-4 border-white/50 box-border">
                  <img
                    src={config.hiddenImage}
                    alt="Secret Revealed"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <button
                className="cute-3d-button px-10 py-4 text-xl min-w-[200px] hover:scale-110 transition-transform duration-300"
                onClick={() => window.location.reload()}
                style={{
                  background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                  boxShadow: '0 0 20px rgba(255, 107, 107, 0.6)'
                }}
              >
                🔄 Chơi lại
              </button>
            </div>

            {/* Confetti or decorations can be added here if needed */}
          </div>
        )
        }
      </main >

      <style>{`
        @keyframes border-glow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        .animate-border-glow {
          animation: border-glow 4s linear infinite;
        }
        /* ... existing keyframes ... */
        @keyframes shake-container { 
          0%, 100% { transform: translateX(0); } 
          25% { transform: translateX(-8px); } 
          75% { transform: translateX(8px); } 
        }
        @keyframes wrong-shake { 
          0%, 100% { transform: translateX(0); } 
          20%, 60% { transform: translateX(-6px); } 
          40%, 80% { transform: translateX(6px); } 
        }
        @keyframes correct-flair { 
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
          50% { transform: scale(1.02); box-shadow: 0 0 40px 15px rgba(34, 197, 94, 0.4); } 
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
        }
        @keyframes slide-up { 
          from { opacity: 0; transform: translateY(20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes bounce-happy {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.2); }
        }
        @keyframes shake-sad {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        .animate-shake-container { animation: shake-container 0.2s ease-in-out 2; }
        .animate-wrong-shake { animation: wrong-shake 0.4s ease-in-out; }
        .animate-correct-flair { animation: correct-flair 0.8s infinite; }
        .animate-slide-up { animation: slide-up 0.5s ease-out; }
        .animate-bounce-happy { animation: bounce-happy 0.6s ease-in-out infinite; }
        .animate-shake-sad { animation: shake-sad 0.5s ease-in-out infinite; }
      `}</style>
    </div >
  );
};

export default GameView;
