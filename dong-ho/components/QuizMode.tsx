import React, { useState, useCallback } from 'react';
import { Level, GameState, Question } from '../types';
import { TOTAL_QUESTIONS_PER_ROUND } from '../constants';
import ClockDisplay from './ClockDisplay';
import ScoreBoard from './ScoreBoard';
import Celebration from './Celebration';
import { generateQuestion, formatTimeShort } from '../utils/timeUtils';
import { playClick, playCorrect, playWrong } from '../utils/sounds';

interface QuizModeProps {
    level: Level;
    onBack: () => void;
    onGoHome: () => void;
}

const QuizMode: React.FC<QuizModeProps> = ({ level, onBack, onGoHome }) => {
    const [question, setQuestion] = useState<Question>(() => generateQuestion(level));
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        streak: 0,
        stars: 0,
        totalQuestions: TOTAL_QUESTIONS_PER_ROUND,
        correctAnswers: 0,
        currentQuestion: 0,
    });

    const handleSelect = useCallback((answer: string) => {
        if (selectedAnswer !== null) return;
        playClick();
        setSelectedAnswer(answer);

        const isCorrect = answer === question.correctAnswer;

        if (isCorrect) {
            setTimeout(() => playCorrect(), 150);
            setGameState(prev => ({
                ...prev,
                correctAnswers: prev.correctAnswers + 1,
                streak: prev.streak + 1,
                stars: prev.stars + 1,
                currentQuestion: prev.currentQuestion + 1,
            }));
        } else {
            setTimeout(() => playWrong(), 150);
            setGameState(prev => ({
                ...prev,
                streak: 0,
                currentQuestion: prev.currentQuestion + 1,
            }));
        }
    }, [selectedAnswer, question.correctAnswer]);

    const handleNext = useCallback(() => {
        if (gameState.currentQuestion >= TOTAL_QUESTIONS_PER_ROUND) {
            setShowCelebration(true);
            return;
        }
        setSelectedAnswer(null);
        setQuestion(generateQuestion(level));
    }, [gameState.currentQuestion, level]);

    const handlePlayAgain = useCallback(() => {
        setShowCelebration(false);
        setSelectedAnswer(null);
        setQuestion(generateQuestion(level));
        setGameState({
            score: 0, streak: 0, stars: 0,
            totalQuestions: TOTAL_QUESTIONS_PER_ROUND,
            correctAnswers: 0, currentQuestion: 0,
        });
    }, [level]);

    const getOptionClass = (option: string) => {
        if (selectedAnswer === null) return 'option-card';
        if (option === question.correctAnswer) return 'option-card option-correct';
        if (option === selectedAnswer) return 'option-card option-wrong';
        return 'option-card option-disabled';
    };

    return (
        <div className="app-container">
            <div className="container flex-col" style={{ minHeight: '100vh', padding: '20px' }}>
                {/* Header */}
                <div className="header-bar">
                    <button onClick={() => { playClick(); onBack(); }} className="btn btn-outline btn-sm">
                        ← Quay lại
                    </button>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        🏆 Chế độ Luyện tập
                    </div>
                </div>

                {/* Score */}
                <div style={{ padding: '0 0 12px' }}>
                    <ScoreBoard gameState={gameState} totalQuestions={TOTAL_QUESTIONS_PER_ROUND} />
                </div>

                {/* Main content */}
                <div className="flex-col flex-center" style={{ flex: 1, gap: '24px', padding: '8px 0' }}>
                    {/* Question */}
                    <div className="text-center">
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Đồng hồ đang chỉ mấy giờ?
                        </div>
                    </div>

                    {/* Clock (non-interactive) */}
                    <ClockDisplay
                        hour={question.time.hour}
                        minute={question.time.minute}
                        interactive={false}
                        showDigital={false}
                        clockSize={260}
                    />

                    {/* Options */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                        maxWidth: '500px',
                        width: '100%',
                    }}>
                        {question.options?.map((option, i) => (
                            <button
                                key={`${gameState.currentQuestion}-${i}`}
                                className={getOptionClass(option)}
                                onClick={() => handleSelect(option)}
                                disabled={selectedAnswer !== null}
                            >
                                <span style={{ marginRight: '8px', opacity: 0.6 }}>
                                    {String.fromCharCode(65 + i)}.
                                </span>
                                {option}
                            </button>
                        ))}
                    </div>

                    {/* Feedback + Next */}
                    {selectedAnswer !== null && (
                        <div className="flex-col flex-center gap-md" style={{ animation: 'fadeIn 0.3s ease' }}>
                            {selectedAnswer === question.correctAnswer ? (
                                <div style={{
                                    color: 'var(--correct)',
                                    fontWeight: '700',
                                    fontSize: '1.1rem',
                                }}>
                                    ✅ Chính xác!
                                </div>
                            ) : (
                                <div style={{
                                    color: 'var(--wrong)',
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                }}>
                                    ❌ Đáp án đúng: <strong style={{ color: 'var(--correct)' }}>{question.correctAnswer}</strong>
                                </div>
                            )}
                            <button onClick={handleNext} className="btn btn-primary">
                                {gameState.currentQuestion >= TOTAL_QUESTIONS_PER_ROUND ? '🏆 Xem kết quả' : 'Câu tiếp →'}
                            </button>
                        </div>
                    )}
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

export default QuizMode;
