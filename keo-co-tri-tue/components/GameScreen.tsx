import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MatchSettings, Question, Team } from '../types';
import GestureCamera from './GestureCamera';
import { GestureType } from '../hooks/useHandTracking';
import { playSound } from '../utils/sounds';

interface GameScreenProps {
    settings: MatchSettings;
    questions: Question[];
    onEnd: (winner?: string) => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ settings, questions, onEnd }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(settings.timePerQuestion);
    const [currentTurn, setCurrentTurn] = useState<'team1' | 'team2'>('team1');
    const [tugPosition, setTugPosition] = useState(0); // -X to X in pixels
    const [isGameOver, setIsGameOver] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    // Gesture tracking for continuous detection (debounce)
    const [detectedGesture, setDetectedGesture] = useState<GestureType>('NONE');
    const [gestureHeldTime, setGestureHeldTime] = useState(0);
    const lastGestureRef = useRef<GestureType>('NONE');
    const REQUIRED_HOLD_TIME = 800; // 0.8 second to confirm selection

    const currentQuestion = questions[currentQuestionIndex];
    const MAX_TUG = 400; // Boundary of movement

    // Timer logic
    useEffect(() => {
        if (isGameOver || isTransitioning) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleTimeUp();
                    return settings.timePerQuestion;
                }
                if (prev === 6) playSound('countdown');
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isGameOver, isTransitioning, settings.timePerQuestion]);

    const handleTimeUp = () => {
        playSound('wrong');
        setCurrentTurn(prev => prev === 'team1' ? 'team2' : 'team1');
        moveToNextQuestion();
    };

    const moveToNextQuestion = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentQuestionIndex(prev => prev + 1);
                setTimeLeft(settings.timePerQuestion);
                setIsTransitioning(false);
            }, 1000); // 1s delay for feedback
        } else {
            setIsGameOver(true);
            const winnerName = tugPosition < 0 ? settings.team1Name : settings.team2Name;
            playSound('victory');
            onEnd(winnerName);
        }
    }, [currentQuestionIndex, questions.length, settings.timePerQuestion, onEnd, tugPosition, settings.team1Name, settings.team2Name]);

    const handleAnswerSelected = useCallback((answerIndex: number) => {
        if (isTransitioning) return;

        const isCorrect = answerIndex === currentQuestion.correctOptionIndex;
        
        if (isCorrect) {
            playSound('correct');
            // Move rope towards the team that answered correctly
            setTugPosition(prev => 
                currentTurn === 'team1' ? Math.max(prev - 60, -MAX_TUG) : Math.min(prev + 60, MAX_TUG)
            );
        } else {
            playSound('wrong');
        }

        // Switch turn and move to next question
        setCurrentTurn(prev => prev === 'team1' ? 'team2' : 'team1');
        moveToNextQuestion();
    }, [currentQuestion, currentTurn, moveToNextQuestion, isTransitioning]);

    // Handle gesture detection
    const onGestureDetected = useCallback((gesture: GestureType) => {
        if (isGameOver || isTransitioning) return;

        if (gesture === 'NONE') {
            setGestureHeldTime(0);
            setDetectedGesture('NONE');
            lastGestureRef.current = 'NONE';
            return;
        }

        if (gesture === lastGestureRef.current) {
            setGestureHeldTime(prev => prev + 30); 
            if (gestureHeldTime > REQUIRED_HOLD_TIME) {
                // Confirm selection
                let answerIndex = -1;
                if (gesture === 'A') answerIndex = 0;
                else if (gesture === 'B') answerIndex = 1;
                else if (gesture === 'C') answerIndex = 2;
                else if (gesture === 'D') answerIndex = 3;

                if (answerIndex !== -1) {
                    handleAnswerSelected(answerIndex);
                    setGestureHeldTime(0); 
                    setDetectedGesture('NONE');
                }
            }
        } else {
            setGestureHeldTime(0);
            lastGestureRef.current = gesture;
            setDetectedGesture(gesture);
        }
    }, [gestureHeldTime, handleAnswerSelected, isGameOver, isTransitioning]);

    return (
        <div className="w-full h-screen flex flex-col p-3 pt-4 bg-[#0f172a] select-none overflow-hidden" style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}>
            <style>
                {`
                @keyframes tugStrain {
                    0%, 100% { transform: scaleX(var(--tw-scale-x, 1)) rotate(0deg) translateY(0); }
                    25% { transform: scaleX(var(--tw-scale-x, 1)) rotate(-1.5deg) translateY(-2px); }
                    75% { transform: scaleX(var(--tw-scale-x, 1)) rotate(1deg) translateY(1px); }
                }
                .animate-tug-strain {
                    animation: tugStrain 1s ease-in-out infinite;
                }
                `}
            </style>
            
            {/* Top Header: Teams and Score */}
            <div className="flex justify-between items-center bg-slate-800/50 backdrop-blur-xl rounded-xl p-3 border border-white/10 shadow-2xl mb-3 relative overflow-hidden">
                <div className={`transition-all duration-500 flex flex-col items-center gap-1 ${currentTurn === 'team1' ? 'scale-105' : 'opacity-40 scale-90'}`}>
                   <div className="text-xl font-black text-blue-400 px-6 py-2 bg-blue-500/10 rounded-xl border border-blue-500/30">
                        {settings.team1Name}
                    </div>
                    {currentTurn === 'team1' && <div className="text-[9px] font-bold text-blue-400 animate-pulse tracking-widest">ĐẾN LƯỢT</div>}
                </div>

                <div className="flex flex-col items-center z-10">
                    <div className={`text-3xl font-black px-6 py-2 rounded-xl shadow-inner min-w-[100px] text-center border transition-all ${timeLeft <= 5 ? 'text-red-500 border-red-500 bg-red-500/10 animate-pulse' : 'text-white border-slate-700 bg-[#0f172a]'}`}>
                        {timeLeft}s
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-1 tracking-[0.2em] uppercase">
                        CÂU {currentQuestionIndex + 1} / {questions.length}
                    </div>
                </div>

                <div className={`transition-all duration-500 flex flex-col items-center gap-1 ${currentTurn === 'team2' ? 'scale-105' : 'opacity-40 scale-90'}`}>
                    <div className="text-xl font-black text-red-400 px-6 py-2 bg-red-500/10 rounded-xl border border-red-500/30">
                        {settings.team2Name}
                    </div>
                    {currentTurn === 'team2' && <div className="text-[9px] font-bold text-red-400 animate-pulse tracking-widest">ĐẾN LƯỢT</div>}
                </div>
                
                {/* Active Indicator Line */}
                <div className={`absolute bottom-0 h-1 bg-gradient-to-r ${currentTurn === 'team1' ? 'from-blue-500 to-transparent left-0 w-1/2' : 'from-transparent to-red-500 right-0 w-1/2'} transition-all duration-500`}></div>
            </div>

            {/* Main Play Area */}
            <div className="flex-1 flex gap-3 min-h-0">

                {/* Left: Question Panel */}
                <div className="flex-[3] flex flex-col bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/5 p-4 overflow-hidden shadow-2xl relative">
                    {isTransitioning && (
                        <div className="absolute inset-0 z-50 bg-[#0f172a]/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                             <div className="text-center">
                                 <div className="text-5xl mb-3 animate-bounce">⚡</div>
                                 <div className="text-lg font-black text-white tracking-widest uppercase">Đang chuẩn bị câu hỏi...</div>
                             </div>
                        </div>
                    )}

                    <div className="flex-1 flex items-center justify-center bg-slate-900/60 rounded-xl p-6 mb-3 border border-white/5 shadow-inner min-h-0">
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-center leading-tight drop-shadow-xl">
                            {currentQuestion?.text || 'Đang tải câu hỏi...'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {currentQuestion?.options.map((opt, idx) => {
                            const label = settings.answerDisplayType === 'letter' ? String.fromCharCode(65 + idx) : (idx + 1).toString();
                            const isSelected = detectedGesture === label;
                            const progressWidth = isSelected ? (gestureHeldTime / REQUIRED_HOLD_TIME) * 100 : 0;

                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => handleAnswerSelected(idx)}
                                    className={`relative group flex items-center gap-4 rounded-xl p-3 border transition-all duration-300 overflow-hidden cursor-pointer ${
                                        isSelected 
                                        ? 'bg-emerald-500/20 border-emerald-500/50 scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {/* Selection Progress Bar */}
                                    <div 
                                        className="absolute left-0 bottom-0 h-1 bg-emerald-500 transition-all duration-100 ease-linear"
                                        style={{ width: `${progressWidth}%` }}
                                    ></div>

                                    <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg text-lg font-black transition-colors ${
                                        isSelected ? 'bg-emerald-500 text-black' : 'bg-[#0f172a] text-slate-400 group-hover:text-white'
                                    }`}>
                                        {label}
                                    </div>
                                    <div className={`text-base font-bold transition-colors ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                        {opt}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Camera / Gesture Recognition Panel */}
                <div className="flex-[2] bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/5 p-3 flex flex-col shadow-2xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-black text-slate-400 tracking-[0.2em] uppercase">AI Gesture Vision</span>
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 px-2 py-1 bg-slate-900/50 rounded-md border border-white/5 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
                            ACTIVE
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-black rounded-xl border border-white/5 overflow-hidden shadow-2xl relative min-h-0">
                        <GestureCamera onGestureDetected={onGestureDetected} />
                    </div>

                    <div className="mt-2 p-3 bg-[#0f172a]/50 rounded-lg border border-white/5">
                        <div className="flex justify-between text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
                            <span>Sơ đồ cử chỉ</span>
                            <span>Phím tắt</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                           <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                               <span className="w-6 h-6 flex items-center justify-center bg-slate-800 rounded-md shadow-inner text-sm">✊</span> A (Chọn 1)
                           </div>
                           <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                               <span className="w-6 h-6 flex items-center justify-center bg-slate-800 rounded-md shadow-inner text-sm">☝️</span> B (Chọn 2)
                           </div>
                           <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                               <span className="w-6 h-6 flex items-center justify-center bg-slate-800 rounded-md shadow-inner text-sm">✌️</span> C (Chọn 3)
                           </div>
                           <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                               <span className="w-6 h-6 flex items-center justify-center bg-slate-800 rounded-md shadow-inner text-sm">🖐️</span> D (Chọn 4)
                           </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom: Tug of War Animation Area */}
            <div className="h-44 md:h-60 mt-3 bg-[#0f172a] rounded-2xl border border-white/10 px-6 py-2 relative overflow-hidden flex items-center shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]">
                {/* Arena Texture/Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(30,41,59,0.5)_0%,_transparent_80%)]"></div>
                
                {/* Background Decorations */}
                <div className="absolute inset-0 flex items-center justify-around opacity-10 blur-sm pointer-events-none">
                     <div className="text-7xl">🛡️</div>
                     <div className="text-7xl">⚔️</div>
                     <div className="text-7xl">🛡️</div>
                </div>

                {/* FULL UNIFIED TUG OF WAR SCENE */}
                <div 
                    className="absolute top-1/2 left-1/2 -translate-y-1/2 transition-transform duration-1000 ease-out z-10 w-max mt-2"
                    style={{ transform: `translate(calc(-50% + ${tugPosition}px), -50%)` }}
                >
                    <div className="relative w-max flex justify-center items-center transform-gpu animate-tug-strain origin-bottom">
                        <img 
                            src="/keoco-full.png" 
                            alt="Tug of War Match" 
                            className="h-36 md:h-[200px] w-auto max-w-none object-contain drop-shadow-2xl" 
                        />
                        
                        {/* Team 1 Label Overlay */}
                        <div className="absolute top-[0%] left-[8%] md:left-[10%] -translate-x-1/2 px-2 py-0.5 md:px-4 md:py-1.5 bg-blue-600/80 backdrop-blur-md rounded-full border border-blue-400/50 text-[10px] md:text-sm font-black text-white shadow-lg uppercase tracking-wider whitespace-nowrap z-20">
                            {settings.team1Name}
                        </div>
                        
                        {/* Team 2 Label Overlay */}
                        <div className="absolute top-[0%] right-[8%] md:right-[10%] translate-x-1/2 px-2 py-0.5 md:px-4 md:py-1.5 bg-red-600/80 backdrop-blur-md rounded-full border border-red-400/50 text-[10px] md:text-sm font-black text-white shadow-lg uppercase tracking-wider whitespace-nowrap z-20">
                            {settings.team2Name}
                        </div>
                    </div>
                </div>

                {/* Static Center Marker */}
                <div
                    className="absolute top-1/2 left-1/2 w-10 h-10 -translate-y-1/2 -translate-x-1/2 z-0"
                >
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full scale-150 animate-pulse"></div>
                        {/* Glowing vertical line indicating the exact center */}
                        <div className="absolute top-[-50px] bottom-[-50px] w-0.5 bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-50"></div>
                        {/* The static diamond marker */}
                        <div className="w-6 h-6 bg-red-600 rotate-45 border-[3px] border-white/90 shadow-[0_0_20px_rgba(220,38,38,1)] rounded-sm"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameScreen;
