import React from 'react';
import { GameState } from '../types';

interface ScoreBoardProps {
    gameState: GameState;
    totalQuestions: number;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ gameState, totalQuestions }) => {
    const progress = totalQuestions > 0 ? (gameState.currentQuestion / totalQuestions) * 100 : 0;

    return (
        <div className="flex-col gap-sm" style={{ width: '100%' }}>
            <div className="score-bar" style={{ justifyContent: 'center' }}>
                <div className="score-item">
                    <span className="icon">⭐</span>
                    <span>{gameState.stars}</span>
                </div>
                <div className="score-item">
                    <span className="icon">✅</span>
                    <span>{gameState.correctAnswers}/{gameState.currentQuestion}</span>
                </div>
                {gameState.streak >= 2 && (
                    <div className="score-item">
                        <span className="icon streak-fire">🔥</span>
                        <span>{gameState.streak}</span>
                    </div>
                )}
                <div className="score-item" style={{ opacity: 0.7 }}>
                    <span>Câu</span>
                    <span>{gameState.currentQuestion}/{totalQuestions}</span>
                </div>
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default ScoreBoard;
