import React, { useEffect } from 'react';
import { GameState } from '../types';
import { STAR_THRESHOLDS, TOTAL_QUESTIONS_PER_ROUND } from '../constants';
import { playFanfare } from '../utils/sounds';

interface CelebrationProps {
    gameState: GameState;
    onPlayAgain: () => void;
    onGoHome: () => void;
}

const Celebration: React.FC<CelebrationProps> = ({ gameState, onPlayAgain, onGoHome }) => {
    const percentage = Math.round((gameState.correctAnswers / gameState.totalQuestions) * 100);

    let stars = 0;
    if (gameState.correctAnswers >= STAR_THRESHOLDS.gold) stars = 3;
    else if (gameState.correctAnswers >= STAR_THRESHOLDS.silver) stars = 2;
    else if (gameState.correctAnswers >= STAR_THRESHOLDS.bronze) stars = 1;

    const messages = [
        { min: 90, text: '🎉 Xuất sắc! Em giỏi quá!', emoji: '🌟' },
        { min: 70, text: '👏 Tốt lắm! Tiếp tục phát huy!', emoji: '⭐' },
        { min: 50, text: '💪 Khá rồi! Cố gắng thêm nhé!', emoji: '🙂' },
        { min: 0, text: '📚 Hãy học thêm và thử lại nhé!', emoji: '💡' },
    ];

    const message = messages.find(m => percentage >= m.min) || messages[messages.length - 1];

    useEffect(() => {
        playFanfare();
        // Fire confetti if available
        try {
            import('canvas-confetti').then(confetti => {
                if (confetti.default) {
                    confetti.default({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#6C63FF', '#38BDF8', '#FBBF24', '#FF6B6B', '#2DD4BF'],
                    });
                    setTimeout(() => {
                        confetti.default!({
                            particleCount: 50,
                            angle: 60,
                            spread: 55,
                            origin: { x: 0 },
                        });
                        confetti.default!({
                            particleCount: 50,
                            angle: 120,
                            spread: 55,
                            origin: { x: 1 },
                        });
                    }, 500);
                }
            }).catch(() => { });
        } catch { }
    }, []);

    return (
        <div className="celebration-overlay">
            <div className="celebration-content">
                <div className="glass-card" style={{
                    padding: '40px',
                    maxWidth: '440px',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '8px' }}>{message.emoji}</div>

                    {/* Stars */}
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px', letterSpacing: '8px' }}>
                        {[1, 2, 3].map(i => (
                            <span key={i} style={{
                                opacity: i <= stars ? 1 : 0.2,
                                filter: i <= stars ? 'none' : 'grayscale(1)',
                                transition: `all 0.5s ease ${i * 0.2}s`,
                            }}>⭐</span>
                        ))}
                    </div>

                    <h2 className="title-md" style={{ marginBottom: '8px' }}>{message.text}</h2>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '24px',
                        margin: '20px 0',
                        color: 'var(--text-secondary)',
                    }}>
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--correct)' }}>
                                {gameState.correctAnswers}
                            </div>
                            <div style={{ fontSize: '0.8rem' }}>Đúng</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border)' }} />
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text)' }}>
                                {gameState.totalQuestions}
                            </div>
                            <div style={{ fontSize: '0.8rem' }}>Tổng</div>
                        </div>
                        <div style={{ width: '1px', background: 'var(--border)' }} />
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-amber)' }}>
                                {percentage}%
                            </div>
                            <div style={{ fontSize: '0.8rem' }}>Tỉ lệ</div>
                        </div>
                    </div>

                    <div className="flex-center gap-md" style={{ marginTop: '24px' }}>
                        <button onClick={onPlayAgain} className="btn btn-primary btn-lg">
                            🔄 Chơi lại
                        </button>
                        <button onClick={onGoHome} className="btn btn-outline">
                            🏠 Trang chủ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Celebration;
