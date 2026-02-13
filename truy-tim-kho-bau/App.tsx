
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, AppState, GameConfig, Question } from './types';
import { QUESTIONS, ASSETS } from './constants';
import IntroScreen from './components/IntroScreen';
import EndScreen from './components/EndScreen';
import Map from './components/Map';
import QuestionFrame from './components/QuestionFrame';
import AdminView from './components/AdminView';
import { getTreasureHuntConfig } from './utils/firebaseTreasureHunt';
import { Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';

const App: React.FC = () => {
  // Kiểm tra URL params
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId');

  const [mode, setMode] = useState<'loading' | 'admin' | 'game'>(gameId ? 'loading' : 'admin');
  const [gameQuestions, setGameQuestions] = useState<Question[]>(QUESTIONS);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [state, setState] = useState<AppState>({
    currentStage: 0,
    score: 0,
    gameState: GameState.INTRO,
    completedStages: []
  });

  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const bgmRef = useRef<HTMLAudioElement>(new Audio(ASSETS.BGM));

  // Load game config từ Firebase nếu có gameId
  useEffect(() => {
    if (gameId) {
      getTreasureHuntConfig(gameId).then(config => {
        if (config && config.questions && config.questions.length > 0) {
          setGameConfig(config);
          setGameQuestions(config.questions);
          setMode('game');
        } else {
          setLoadError(true);
          setMode('game'); // fallback to default
          setGameQuestions(QUESTIONS);
        }
      }).catch(() => {
        setLoadError(true);
        setMode('game');
      });
    }
  }, [gameId]);

  useEffect(() => {
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    bgmRef.current.muted = isMuted;
  }, [isMuted]);

  const startGame = () => {
    setState(prev => ({ ...prev, gameState: GameState.VIDEO_IN }));
    bgmRef.current.play().catch(e => console.log("BGM play blocked", e));
  };

  const handleVideoInEnd = () => {
    setState(prev => ({ ...prev, gameState: GameState.PLAYING }));
  };

  const handleAnswer = (correct: boolean) => {
    setIsCorrect(correct);
    if (correct && !state.completedStages.includes(state.currentStage)) {
      setState(prev => ({
        ...prev,
        score: prev.score + 1,
        completedStages: [...prev.completedStages, prev.currentStage]
      }));
    }
  };

  const nextStage = () => {
    setIsCorrect(null);
    if (state.currentStage < gameQuestions.length - 1) {
      setState(prev => ({ ...prev, currentStage: prev.currentStage + 1 }));
    } else {
      setState(prev => ({ ...prev, gameState: GameState.CONGRATS }));
      setTimeout(() => {
        setState(prev => ({ ...prev, gameState: GameState.VIDEO_OUT }));
      }, 5000);
    }
  };

  const handleVideoOutEnd = () => {
    setState(prev => ({ ...prev, gameState: GameState.END }));
  };

  const restartGame = () => {
    setState({
      currentStage: 0,
      score: 0,
      gameState: GameState.PLAYING,
      completedStages: []
    });
    setIsCorrect(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Preview từ AdminView
  const handlePreview = (config: GameConfig) => {
    setGameConfig(config);
    setGameQuestions(config.questions);
    setState({
      currentStage: 0,
      score: 0,
      gameState: GameState.INTRO,
      completedStages: []
    });
    setIsCorrect(null);
    setMode('game');
  };

  // Quay lại Admin
  const handleBackToAdmin = () => {
    bgmRef.current.pause();
    bgmRef.current.currentTime = 0;
    setMode('admin');
  };

  // Loading state
  if (mode === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏴‍☠️</div>
          <p className="text-xl font-bold text-orange-700">Đang tải game...</p>
        </div>
      </div>
    );
  }

  // Admin mode
  if (mode === 'admin') {
    return (
      <AdminView
        onExit={() => {
          // Gửi message cho parent iframe để quay lại
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'BACK_TO_DASHBOARD' }, '*');
          }
        }}
        onPreview={handlePreview}
      />
    );
  }

  // Tạo stages từ questions hiện tại
  const currentStages = gameQuestions.map((q, i) => ({
    id: i,
    name: q.stageName,
    icon: q.stageIcon
  }));

  const isVideoState = state.gameState === GameState.VIDEO_IN ||
    state.gameState === GameState.VIDEO_OUT ||
    state.gameState === GameState.CONGRATS ||
    state.gameState === GameState.END;

  // Game title
  const displayTitle = gameConfig?.title || 'TRUY TÌM KHO BÁU';
  const displaySubtitle = gameConfig?.subtitle || 'Khám phá thế giới Nấm';
  const displayDescription = gameConfig?.description || 'Em hãy cùng nhà thám hiểm vượt qua 5 chặng thử thách để mở kho báu thần kỳ nhé!';

  return (
    <div
      className="h-screen w-screen flex flex-col relative overflow-hidden font-sans"
      style={{
        backgroundImage: `url(${ASSETS.BACKGROUND})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Back button khi preview */}
      {!gameId && (
        <button
          onClick={handleBackToAdmin}
          className="fixed top-4 left-4 z-[60] bg-white/90 hover:bg-white px-4 py-2 rounded-xl font-bold text-orange-600 shadow-lg border-2 border-orange-300 transition-all hover:scale-105"
        >
          ← Quay lại soạn
        </button>
      )}

      {/* Grey overlay for video/congrats states */}
      {isVideoState && (
        <div className="absolute inset-0 bg-gray-800/40 backdrop-blur-[2px] z-40 transition-all duration-1000"></div>
      )}

      {state.gameState === GameState.INTRO && (
        <IntroScreen
          onStart={startGame}
          title={displayTitle}
          subtitle={displaySubtitle}
          description={displayDescription}
        />
      )}

      {state.gameState === GameState.VIDEO_IN && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="w-[80%] aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative">
            <video
              autoPlay
              className="w-full h-full object-contain"
              onEnded={handleVideoInEnd}
            >
              <source src={ASSETS.VIDEO_IN} type="video/mp4" />
            </video>
            <button
              onClick={handleVideoInEnd}
              className="absolute bottom-4 right-4 px-5 py-2 rounded-full bg-white/20 hover:bg-white/40 text-white/60 hover:text-white text-sm font-bold backdrop-blur-sm transition-all border border-white/20"
            >
              Bỏ qua ▸▸
            </button>
          </div>
        </div>
      )}

      {state.gameState === GameState.PLAYING && (
        <>
          <div className="h-[25%] p-4 z-10">
            <Map
              currentStage={state.currentStage}
              completedStages={state.completedStages}
              stages={currentStages}
            />
          </div>

          <div className="h-[70%] pb-4 flex items-center justify-center">
            <QuestionFrame
              question={gameQuestions[state.currentStage]}
              onAnswer={handleAnswer}
              onNext={nextStage}
              isCorrect={isCorrect}
              isLastStage={state.currentStage === gameQuestions.length - 1}
            />
          </div>

          <div className="absolute bottom-0 left-0 h-2 bg-orange-100 w-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-1000 ease-out shadow-[0_0_100px_rgba(255,152,0,1)]"
              style={{ width: `${((state.currentStage + 1) / gameQuestions.length) * 100}%` }}
            />
          </div>
        </>
      )}

      {(state.gameState === GameState.CONGRATS || state.gameState === GameState.VIDEO_OUT || state.gameState === GameState.END) && (
        <EndScreen
          score={state.score}
          total={gameQuestions.length}
          onRestart={restartGame}
          gameState={state.gameState}
          onVideoEnd={handleVideoOutEnd}
          onSkipVideo={handleVideoOutEnd}
        />
      )}

      <div className="fixed bottom-6 right-6 flex gap-4 z-50">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="bg-white/80 backdrop-blur-md p-3 rounded-full border-2 border-orange-400 text-orange-600 hover:scale-110 active:scale-95 transition-all shadow-lg"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        <button
          onClick={toggleFullscreen}
          className="bg-white/80 backdrop-blur-md p-3 rounded-full border-2 border-orange-400 text-orange-600 hover:scale-110 active:scale-95 transition-all shadow-lg"
          title="Toàn màn hình"
        >
          {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
        </button>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-scale-up {
          animation: scaleUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes scaleUp {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}
      </style>
    </div>
  );
};

export default App;
