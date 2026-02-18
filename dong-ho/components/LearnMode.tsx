import React, { useState, useEffect, useCallback } from 'react';
import ClockDisplay from './ClockDisplay';
import { LEARN_STEPS } from '../constants';
import { playClick, playWhoosh, playCorrect } from '../utils/sounds';

interface LearnModeProps {
    onBack: () => void;
}

const LearnMode: React.FC<LearnModeProps> = ({ onBack }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [animating, setAnimating] = useState(false);

    const step = LEARN_STEPS[stepIndex];
    const isLast = stepIndex === LEARN_STEPS.length - 1;
    const isFirst = stepIndex === 0;

    const goNext = useCallback(() => {
        if (isLast || animating) return;
        setAnimating(true);
        playClick();
        setTimeout(() => {
            setStepIndex(s => s + 1);
            setAnimating(false);
            if (stepIndex === LEARN_STEPS.length - 2) {
                playCorrect();
            }
        }, 200);
    }, [isLast, animating, stepIndex]);

    const goPrev = useCallback(() => {
        if (isFirst || animating) return;
        setAnimating(true);
        playClick();
        setTimeout(() => {
            setStepIndex(s => s - 1);
            setAnimating(false);
        }, 200);
    }, [isFirst, animating]);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [goNext, goPrev]);

    return (
        <div className="app-container">
            <div className="container flex-col" style={{ minHeight: '100vh', padding: '20px' }}>
                {/* Header */}
                <div className="header-bar">
                    <button onClick={() => { playClick(); onBack(); }} className="btn btn-outline btn-sm">
                        ← Quay lại
                    </button>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        📖 Chế độ Học tập
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-col flex-center" style={{
                    flex: 1,
                    gap: '28px',
                    padding: '20px 0',
                    opacity: animating ? 0.5 : 1,
                    transition: 'opacity 0.2s ease',
                }}>
                    {/* Step title */}
                    <div className="text-center">
                        <h2 className="title-md" style={{ marginBottom: '4px' }}>
                            {step.title}
                        </h2>
                        <div style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                        }}>
                            Bước {stepIndex + 1} / {LEARN_STEPS.length}
                        </div>
                    </div>

                    {/* Clock display */}
                    <ClockDisplay
                        hour={step.time.hour}
                        minute={step.time.minute}
                        highlightHour={step.highlightHour}
                        highlightMinute={step.highlightMinute}
                        showDigital={true}
                        clockSize={280}
                    />

                    {/* Description bubble */}
                    <div className="speech-bubble" style={{ textAlign: 'center' }}>
                        <p style={{ lineHeight: '1.8' }}>{step.description}</p>
                    </div>

                    {/* Step dots */}
                    <div className="step-dots">
                        {LEARN_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`step-dot ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'completed' : ''}`}
                                onClick={() => {
                                    if (i !== stepIndex) {
                                        playClick();
                                        setStepIndex(i);
                                    }
                                }}
                            />
                        ))}
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex-center gap-md">
                        {!isFirst && (
                            <button onClick={goPrev} className="btn btn-outline">
                                ← Trước
                            </button>
                        )}
                        {!isLast ? (
                            <button onClick={goNext} className="btn btn-primary btn-lg">
                                Tiếp theo →
                            </button>
                        ) : (
                            <button onClick={() => { playClick(); onBack(); }} className="btn btn-success btn-lg">
                                🎉 Hoàn thành!
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LearnMode;
