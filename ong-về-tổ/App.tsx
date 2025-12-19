import React, { useState, useEffect, useRef } from 'react';
import StartScreen from './components/StartScreen';
import QuestionModal from './components/QuestionModal';
import VictoryScreen from './components/VictoryScreen';
import { BeeSVG, HiveSVG, WarningSVG, SoundOnSVG, SoundOffSVG } from './components/GameAssets';
import { QUESTIONS, TOTAL_STAGES } from './constants';
import { GameStage } from './types';

// Updated path points to be curvy and strictly in the TOP 40% of the screen
// to avoid overlapping with the modal at the bottom.
// 0: Start, 1: Q1, 2: Q2, 3: Q3, 4: Hive
const PATH_POINTS = [
  { x: 10, y: 20 },   // Start: Top Left
  { x: 30, y: 35 },   // Station 1: Dip down slightly
  { x: 50, y: 15 },   // Station 2: Loop up High
  { x: 70, y: 35 },   // Station 3: Dip down slightly
  { x: 90, y: 20 }    // Hive: Top Right
];

const INTRO_VIDEO_URL = "https://s2.file2s.com/Trochoiongveto/Giao%20nhi%E1%BB%87m%20v%E1%BB%A5.mp4";
const OUTRO_VIDEO_URL = "https://s2.file2s.com/Trochoiongveto/C%E1%BA%A3m%20%C6%A1n%20sau%20nhi%E1%BB%87m%20v%E1%BB%A5.mp4";

const YellowNatureBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Sky Gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-yellow-50 via-yellow-100 to-orange-50"></div>
    
    {/* Sun */}
    <div className="absolute top-10 right-20 w-20 h-20 bg-yellow-300 rounded-full blur-xl opacity-60 animate-pulse"></div>

    {/* Rolling Hills Layer 1 (Back) */}
    <svg className="absolute bottom-0 left-0 w-full h-[50%] z-0" preserveAspectRatio="none" viewBox="0 0 1440 320">
      <path fill="#FEF3C7" fillOpacity="1" d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,224C840,245,960,267,1080,261.3C1200,256,1320,224,1380,208L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
    </svg>

    {/* Rolling Hills Layer 2 (Front) */}
    <svg className="absolute bottom-0 left-0 w-full h-[40%] z-0" preserveAspectRatio="none" viewBox="0 0 1440 320">
      <path fill="#FDE68A" fillOpacity="0.8" d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
    </svg>

    {/* Flowers Decoration (Simple CSS/SVG Shapes) */}
    <div className="absolute bottom-[10%] left-[10%] text-orange-300 text-4xl opacity-80 animate-bounce-slow">✿</div>
    <div className="absolute bottom-[15%] left-[25%] text-yellow-500 text-3xl opacity-70" style={{ animationDelay: '1s' }}>❀</div>
    <div className="absolute bottom-[8%] left-[45%] text-orange-400 text-5xl opacity-80 animate-bounce-slow" style={{ animationDelay: '0.5s' }}>✿</div>
    <div className="absolute bottom-[12%] right-[30%] text-yellow-600 text-3xl opacity-60">❀</div>
    <div className="absolute bottom-[5%] right-[10%] text-orange-300 text-6xl opacity-80 animate-bounce-slow">✿</div>

    {/* Clouds */}
    <div className="absolute top-[15%] left-[10%] text-white text-6xl opacity-60 animate-float">☁</div>
    <div className="absolute top-[10%] right-[20%] text-white text-8xl opacity-40 animate-float" style={{ animationDelay: '2s' }}>☁</div>
  </div>
);

const LoadingScreen = () => (
  <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-orange-50 font-nunito overflow-hidden">
    <div className="absolute inset-0 bg-yellow-100 opacity-50">
       <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjAgTDIwIDAgTBM0MCAyMCBMMjAgNDAgWiIgZmlsbD0iI0ZFQjkwMCIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-30 animate-[spin_60s_linear_infinite]"></div>
    </div>

    <div className="relative mb-10">
      {/* Decorative Rotating Ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-8 border-dashed border-orange-200 rounded-full animate-[spin_10s_linear_infinite]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 border-4 border-yellow-300 rounded-full animate-[spin_8s_linear_infinite_reverse]"></div>

      {/* Main Character */}
      <div className="relative z-10 animate-bounce">
        <BeeSVG className="w-40 h-40 drop-shadow-xl" />
      </div>
      
      {/* Orbiting Honey Pot */}
      <div className="absolute top-0 left-1/2 w-full h-full animate-[spin_3s_linear_infinite]">
         <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-3xl transform rotate-180">🍯</div>
      </div>
    </div>

    {/* Stylish Loading Text */}
    <div className="relative z-10 flex flex-col items-center">
      <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500 tracking-[0.2em] mb-4 animate-pulse uppercase" style={{ textShadow: '2px 2px 4px rgba(249, 115, 22, 0.2)' }}>
        Loading...
      </h1>
      
      {/* Custom Progress Bar */}
      <div className="w-64 h-4 bg-white rounded-full border-2 border-orange-200 p-1 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-[loadingBar_2s_ease-in-out_infinite]" style={{ width: '50%' }}></div>
        {/* Shine effect */}
        <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-[shimmer_1.5s_infinite]"></div>
      </div>
    </div>

    <style>{`
      @keyframes loadingBar {
        0% { width: 5%; }
        50% { width: 95%; }
        100% { width: 5%; }
      }
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useState<GameStage>(GameStage.INTRO);
  // currentStationIndex: 0 = Start, 1 = Station 1, etc.
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [beePosition, setBeePosition] = useState(PATH_POINTS[0]);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize Audio
  useEffect(() => {
    // Background Music
    audioRef.current = new Audio('https://s2.file2s.com/nhacnengamechotreem.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.35; // Volume at 35%
    
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Audio Playback Logic
  useEffect(() => {
    const playAudio = async () => {
      if (audioRef.current) {
        // Stop music during videos
        const isVideoPlaying = gameState === GameStage.INTRO_VIDEO || gameState === GameStage.OUTRO_VIDEO;
        
        if (!isLoading && gameState !== GameStage.INTRO && !isVideoPlaying && !isMusicMuted) {
          try {
            audioRef.current.volume = 0.35; // Ensure volume is set
            await audioRef.current.play();
          } catch (e) {
            console.log("Audio autoplay blocked, requires interaction");
          }
        } else {
          // In all other cases (muted, loading, intro, video playing), pause music
          audioRef.current.pause();
        }
      }
    };
    playAudio();
  }, [gameState, isLoading, isMusicMuted]);

  // SFX Helper Functions
  const playCorrectSound = () => {
    const sfx = new Audio('https://s2.file2s.com/amthanhhieuung/dung-6.mp3');
    sfx.volume = 1.0;
    sfx.play().catch(e => console.log("SFX play failed", e));
  };

  const playWrongSound = () => {
    const sfx = new Audio('https://s2.file2s.com/amthanhhieuung/sai-4.mp3');
    sfx.volume = 1.0;
    sfx.play().catch(e => console.log("SFX play failed", e));
  };

  // Handlers
  const handleStartGame = () => {
    // 1. Play Intro Video first
    setGameState(GameStage.INTRO_VIDEO);
  };

  const handleIntroVideoEnded = () => {
    // 2. Video ended, Start the game mechanics
    setGameState(GameStage.PLAYING);
    setCurrentStationIndex(0);
    setBeePosition(PATH_POINTS[0]);
    
    // DELAY the movement to Station 1 so the user sees the bee at Start first
    setTimeout(() => {
       moveToStation(1);
    }, 600); 
  };

  const handleOutroVideoEnded = () => {
    // 5. Outro video ended, show full victory screen with buttons
    setGameState(GameStage.VICTORY);
  };

  const moveToStation = (index: number) => {
    // Update Bee Target Position
    setBeePosition(PATH_POINTS[index]);
    setCurrentStationIndex(index);

    // Wait for animation to finish then open modal if it's a question station (1, 2, 3)
    if (index > 0 && index <= TOTAL_STAGES) {
      setTimeout(() => {
        setIsModalOpen(true);
      }, 2000); // 2s travel time
    } else if (index === TOTAL_STAGES + 1) {
      // Reached Hive
      setTimeout(() => {
        // 3. Show Pending Victory (Congratulation Table ONLY)
        setGameState(GameStage.VICTORY_PENDING);
        
        // 4. After 2 seconds, switch to Outro Video
        setTimeout(() => {
          setGameState(GameStage.OUTRO_VIDEO);
        }, 2500);
      }, 2000);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setIsModalOpen(false);
      // Move to next station
      moveToStation(currentStationIndex + 1);
    }
  };

  const handleRestart = () => {
    setIsLoading(true);
    setGameState(GameStage.INTRO);
    setCurrentStationIndex(0);
    setBeePosition(PATH_POINTS[0]);
    setIsModalOpen(false);
    
    // Re-trigger loading timer
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  const toggleMusic = () => {
    setIsMusicMuted(!isMusicMuted);
  };

  // Video Render Helper - MODAL STYLE (70% width, centered)
  const renderVideoOverlay = (src: string, onEnded: () => void) => (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <div className="relative w-[70%] max-w-5xl shadow-2xl rounded-xl overflow-hidden bg-black ring-4 ring-yellow-400">
        <video 
          src={src} 
          autoPlay 
          className="w-full h-auto aspect-video"
          onEnded={onEnded}
          controls={false} // Hide controls for cinematic feel
        />
        {/* Skip button optional */}
        <button 
          onClick={onEnded}
          className="absolute bottom-4 right-4 px-4 py-1.5 bg-white/20 hover:bg-white/40 text-white text-sm rounded-full backdrop-blur-md transition-colors"
        >
          Bỏ qua &gt;&gt;
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Determine what to render behind the video
  // If INTRO_VIDEO, we keep showing StartScreen behind
  // If OUTRO_VIDEO, we keep showing the Map behind
  const showStartScreen = gameState === GameStage.INTRO || gameState === GameStage.INTRO_VIDEO;

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans select-none bg-yellow-50">
      
      {/* Background and Main Content */}
      {showStartScreen ? (
        <StartScreen onStart={handleStartGame} />
      ) : (
        <>
          <YellowNatureBackground />

          {/* Game Area */}
          <div className="relative z-10 w-full h-full flex flex-col">
            
            {/* Persistent Title Header with Highlight Effect */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none mt-2 w-full flex justify-center">
                <div className="bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-400 px-8 py-2 rounded-b-3xl shadow-[0_4px_0_rgb(194,65,12)] border-2 border-t-0 border-white/50 animate-float">
                    <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider drop-shadow-md flex items-center gap-2">
                       <span>🐝</span> Trò chơi "Ong Về Tổ" <span>🌻</span>
                    </h1>
                </div>
            </div>

            {/* Header/HUD - Z-INDEX 100 to stay above everything */}
            <div className="absolute top-16 left-4 right-4 flex justify-between items-center z-[100] pointer-events-none">
              <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border-4 border-yellow-400 flex items-center gap-3 pointer-events-auto">
                <span className="text-2xl">🍯</span>
                <div>
                  <p className="text-[10px] text-yellow-800 font-bold uppercase tracking-wider">Cửa ải</p>
                  <p className="text-lg font-extrabold text-yellow-600 leading-none">
                    {Math.min(currentStationIndex, TOTAL_STAGES)} / {TOTAL_STAGES}
                  </p>
                </div>
              </div>

              {/* Mute Button - Explicitly z-100 and pointer-events-auto to ensure clickability */}
              <button 
                onClick={toggleMusic}
                className={`pointer-events-auto w-12 h-12 bg-white/95 backdrop-blur-md rounded-full shadow-xl border-[3px] flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isMusicMuted ? 'border-gray-400 text-gray-500 bg-gray-50' : 'border-green-400 text-green-600 bg-green-50'}`}
                title={isMusicMuted ? "Bật nhạc nền" : "Tắt nhạc nền"}
                style={{ zIndex: 101 }} 
              >
                {isMusicMuted ? <SoundOffSVG className="w-6 h-6" /> : <SoundOnSVG className="w-6 h-6" />}
              </button>
            </div>

            {/* Play Area (The Path) */}
            <div className="flex-1 relative w-full h-full mt-10">
              
              {/* SVG Path Line - CURVY and SMOOTH (Bezier Curves) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Shadow path */}
                 <path 
                  d={`M ${PATH_POINTS[0].x} ${PATH_POINTS[0].y} 
                     C ${PATH_POINTS[0].x + 10} ${PATH_POINTS[0].y}, ${PATH_POINTS[1].x - 10} ${PATH_POINTS[1].y}, ${PATH_POINTS[1].x} ${PATH_POINTS[1].y}
                     S ${PATH_POINTS[2].x - 10} ${PATH_POINTS[2].y}, ${PATH_POINTS[2].x} ${PATH_POINTS[2].y}
                     S ${PATH_POINTS[3].x - 10} ${PATH_POINTS[3].y}, ${PATH_POINTS[3].x} ${PATH_POINTS[3].y}
                     S ${PATH_POINTS[4].x - 10} ${PATH_POINTS[4].y}, ${PATH_POINTS[4].x} ${PATH_POINTS[4].y}`}
                  fill="none"
                  stroke="#FFF" // White shadow
                  strokeWidth="5"
                  className="opacity-60"
                  transform="translate(0, 0.5)"
                />
                {/* Main dashed path */}
                <path 
                  d={`M ${PATH_POINTS[0].x} ${PATH_POINTS[0].y} 
                     C ${PATH_POINTS[0].x + 10} ${PATH_POINTS[0].y}, ${PATH_POINTS[1].x - 10} ${PATH_POINTS[1].y}, ${PATH_POINTS[1].x} ${PATH_POINTS[1].y}
                     S ${PATH_POINTS[2].x - 10} ${PATH_POINTS[2].y}, ${PATH_POINTS[2].x} ${PATH_POINTS[2].y}
                     S ${PATH_POINTS[3].x - 10} ${PATH_POINTS[3].y}, ${PATH_POINTS[3].x} ${PATH_POINTS[3].y}
                     S ${PATH_POINTS[4].x - 10} ${PATH_POINTS[4].y}, ${PATH_POINTS[4].x} ${PATH_POINTS[4].y}`}
                  fill="none"
                  stroke="#D97706" // Amber-600
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  className="drop-shadow-sm opacity-90"
                />
              </svg>

              {/* Checkpoints (Warning Signs) - Stations 1, 2, 3 */}
              {[1, 2, 3].map((stageIndex) => {
                const point = PATH_POINTS[stageIndex];
                const isPassed = currentStationIndex > stageIndex;
                const isCurrent = currentStationIndex === stageIndex;

                return (
                  <div 
                    key={stageIndex}
                    className="absolute w-16 h-16 md:w-20 md:h-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-10 flex flex-col items-center"
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  >
                     <div className={`relative w-full h-full transition-transform duration-500 ${isCurrent ? 'scale-125' : 'scale-100'} ${isPassed ? 'grayscale opacity-70' : ''}`}>
                        <WarningSVG />
                        
                        {/* Number Badge */}
                        <div className="absolute -top-2 -right-2 bg-white text-orange-700 font-bold w-8 h-8 rounded-full flex items-center justify-center border-2 border-orange-500 shadow-sm text-sm">
                          {stageIndex}
                        </div>
                     </div>
                  </div>
                );
              })}

              {/* The Hive (Finish Line) - Point 4 */}
              <div 
                className="absolute w-32 h-32 md:w-44 md:h-44 -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ left: `${PATH_POINTS[4].x}%`, top: `${PATH_POINTS[4].y}%` }}
              >
                 <HiveSVG className="drop-shadow-2xl filter brightness-110" />
              </div>

              {/* The Start Point - Point 0 */}
              <div 
                className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 z-0 opacity-80"
                style={{ left: `${PATH_POINTS[0].x}%`, top: `${PATH_POINTS[0].y}%` }}
              >
                 <div className="bg-orange-500/50 w-full h-full rounded-full animate-ping"></div>
                 <div className="absolute inset-0 bg-orange-500 w-full h-full rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-xs shadow-md">
                   START
                 </div>
              </div>

              {/* The Player (Bee) */}
              <div 
                className="absolute z-30 w-24 h-24 md:w-36 md:h-36 -translate-x-1/2 -translate-y-1/2 transition-all duration-[2000ms] ease-in-out"
                style={{ 
                  left: `${beePosition.x}%`,
                  top: `${beePosition.y}%`,
                }}
              >
                <div className="relative w-full h-full">
                  <BeeSVG className="drop-shadow-2xl" />
                  
                  {/* Cute speech bubble */}
                  {!isModalOpen && gameState === GameStage.PLAYING && currentStationIndex < 4 && currentStationIndex > 0 && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-2xl rounded-bl-none text-sm font-extrabold text-orange-500 whitespace-nowrap animate-bounce shadow-lg border-2 border-orange-200">
                          Cẩn thận!
                      </div>
                  )}
                   {/* Flying speech bubble */}
                   {isModalOpen === false && gameState === GameStage.PLAYING && currentStationIndex === 0 && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-2xl rounded-bl-none text-sm font-extrabold text-blue-500 whitespace-nowrap animate-bounce shadow-lg border-2 border-blue-200">
                          Về tổ thôi!
                      </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Video Overlays */}
      {gameState === GameStage.INTRO_VIDEO && renderVideoOverlay(INTRO_VIDEO_URL, handleIntroVideoEnded)}
      {gameState === GameStage.OUTRO_VIDEO && renderVideoOverlay(OUTRO_VIDEO_URL, handleOutroVideoEnded)}

      {/* Question Modal */}
      {isModalOpen && gameState === GameStage.PLAYING && (
        <QuestionModal 
          question={QUESTIONS[currentStationIndex - 1]} // Station 1 = Question 0
          onAnswer={handleAnswer}
          playCorrectSound={playCorrectSound}
          playWrongSound={playWrongSound}
        />
      )}

      {/* Victory Screen */}
      {(gameState === GameStage.VICTORY_PENDING || gameState === GameStage.VICTORY) && (
        <VictoryScreen 
          onRestart={handleRestart} 
          showButtons={gameState === GameStage.VICTORY} 
        />
      )}
    </div>
  );
}

export default App;