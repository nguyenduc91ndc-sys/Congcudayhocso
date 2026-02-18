import React, { useState, useCallback, useEffect } from 'react';
import { Level, GameState, TimeValue } from '../types';
import { TOTAL_QUESTIONS_PER_ROUND } from '../constants';
import ClockDisplay from './ClockDisplay';
import ScoreBoard from './ScoreBoard';
import Celebration from './Celebration';
import { generateRandomTime, formatTimeShort, checkTimeMatch } from '../utils/timeUtils';
import { playClick, playCorrect, playWrong } from '../utils/sounds';

interface PracticeModeProps {
    level: Level;
    onBack: () => void;
    onGoHome: () => void;
}

const PracticeMode: React.FC<PracticeModeProps> = ({ level, onBack, onGoHome }) => {
    const [targetTime, setTargetTime] = useState<TimeValue>(() => generateRandomTime(level));
    const [userHour, setUserHour] = useState(12);
    const [userMinute, setUserMinute] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        streak: 0,
        stars: 0,
        totalQuestions: TOTAL_QUESTIONS_PER_ROUND,
        correctAnswers: 0,
        currentQuestion: 0,
    });

    const handleTimeChange = useCallback((h: number, m: number) => {
        if (feedback) return; // Don't allow changes during feedback
        setUserHour(h);
        setUserMinute(m);
        setShowHint(false);
    }, [feedback]);

    const handleCheck = useCallback(() => {
        if (feedback) return;
        playClick();

        const isCorrect = checkTimeMatch(targetTime, { hour: userHour, minute: userMinute }, 2);

        if (isCorrect) {
            playCorrect();
            setFeedback('correct');
            setGameState(prev => ({
                ...prev,
                correctAnswers: prev.correctAnswers + 1,
                streak: prev.streak + 1,
                stars: prev.stars + 1,
                currentQuestion: prev.currentQuestion + 1,
            }));
        } else {
            playWrong();
            setFeedback('wrong');
            setShowHint(true);
            setGameState(prev => ({
                ...prev,
                streak: 0,
                currentQuestion: prev.currentQuestion + 1,
            }));
        }
    }, [feedback, targetTime, userHour, userMinute]);

    const handleNext = useCallback(() => {
        if (gameState.currentQuestion >= TOTAL_QUESTIONS_PER_ROUND) {
            setShowCelebration(true);
            return;
        }
        setFeedback(null);
        setShowHint(false);
        setTargetTime(generateRandomTime(level));
        setUserHour(12);
        setUserMinute(0);
    }, [gameState.currentQuestion, level]);

    const handlePlayAgain = useCallback(() => {
        setShowCelebration(false);
        setFeedback(null);
        setShowHint(false);
        setTargetTime(generateRandomTime(level));
        setUserHour(12);
        setUserMinute(0);
        setGameState({
            score: 0, streak: 0, stars: 0,
            totalQuestions: TOTAL_QUESTIONS_PER_ROUND,
            correctAnswers: 0, currentQuestion: 0,
        });
    }, [level]);

    return (
        <div className="app-container">
            <div className="container flex-col" style={{ minHeight: '100vh', padding: '20px' }}>
                {/* Header */}
                <div className="header-bar">
                    <button onClick={() => { playClick(); onBack(); }} className="btn btn-outline btn-sm">
                        ← Quay lại
                    </button>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        🎮 Chế độ Thực hành
                    </div>
                </div>

                {/* Score */}
                <div style={{ padding: '0 0 12px' }}>
                    <ScoreBoard gameState={gameState} totalQuestions={TOTAL_QUESTIONS_PER_ROUND} />
                </div>

                {/* Main content */}
                <div className="flex-col flex-center" style={{ flex: 1, gap: '24px', padding: '8px 0' }}>
                    {/* Target time instruction */}
                    <div className="glass-card-light text-center" style={{ padding: '16px 28px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Hãy đặt đồng hồ chỉ:
                        </div>
                        <div style={{
                            fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
                            fontWeight: '800',
                            color: 'var(--accent-amber)',
                        }}>
                            🕐 {formatTimeShort(targetTime.hour, targetTime.minute)}
                        </div>
                    </div>

                    {/* Interactive clock */}
                    <ClockDisplay
                        hour={userHour}
                        minute={userMinute}
                        interactive={!feedback}
                        onTimeChange={handleTimeChange}
                        showDigital={true}
                        clockSize={280}
                    />

                    {/* Hint */}
                    {showHint && feedback === 'wrong' && (
                        <div style={{
                            padding: '12px 20px',
                            background: 'var(--wrong-bg)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--wrong)',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            animation: 'shake 0.5s ease-in-out',
                        }}>
                            ❌ Chưa đúng! Đáp án là {formatTimeShort(targetTime.hour, targetTime.minute)}
                        </div>
                    )}

                    {feedback === 'correct' && (
                        <div style={{
                            padding: '12px 20px',
                            background: 'var(--correct-bg)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--correct)',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            animation: 'correctPop 0.5s ease',
                        }}>
                            ✅ Chính xác! Giỏi lắm!
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex-center gap-md">
                        {!feedback ? (
                            <button onClick={handleCheck} className="btn btn-success btn-lg">
                                ✓ Kiểm tra
                            </button>
                        ) : (
                            <button onClick={handleNext} className="btn btn-primary btn-lg">
                                {gameState.currentQuestion >= TOTAL_QUESTIONS_PER_ROUND ? '🏆 Xem kết quả' : 'Câu tiếp →'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {showCelebration && (
                <Celebration
                    gameState={gameState}
                    onPlayAgain={handlePlayAgain}
                    onGoHome={onGoHome}
                />
            )}
        </div>
    );
};

export default PracticeMode;
