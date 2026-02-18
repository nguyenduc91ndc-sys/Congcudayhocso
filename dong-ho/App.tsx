import React, { useState, useCallback, useRef } from 'react';
import { Screen, Level } from './types';
import IntroScreen from './components/IntroScreen';
import LevelSelector from './components/LevelSelector';
import LearnMode from './components/LearnMode';
import PracticeMode from './components/PracticeMode';
import QuizMode from './components/QuizMode';
import './styles.css';

const App: React.FC = () => {
    const [screen, setScreen] = useState<Screen>('intro');
    const [pendingMode, setPendingMode] = useState<Screen | null>(null);
    const [level, setLevel] = useState<Level>('exact');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSelectMode = useCallback((mode: Screen) => {
        if (mode === 'learn') {
            setScreen('learn');
        } else {
            setPendingMode(mode);
            setScreen('levelSelect' as any);
        }
    }, []);

    const handleSelectLevel = useCallback((selectedLevel: Level) => {
        setLevel(selectedLevel);
        if (pendingMode) {
            setScreen(pendingMode);
            setPendingMode(null);
        }
    }, [pendingMode]);

    const goHome = useCallback(() => {
        setScreen('intro');
        setPendingMode(null);
    }, []);

    const goBack = useCallback(() => {
        if (screen === 'learn' || (screen as string) === 'levelSelect') {
            goHome();
        } else {
            setPendingMode(screen);
            setScreen('levelSelect' as any);
        }
    }, [screen, goHome]);

    const handleBackToDashboard = useCallback(() => {
        // Send message to parent window (if embedded in iframe)
        window.parent.postMessage({ type: 'BACK_TO_DASHBOARD' }, '*');
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    }, []);

    // Listen for fullscreen changes
    React.useEffect(() => {
        const handler = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
            }
        };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // Check if embedded in iframe
    const isEmbedded = window !== window.parent;

    return (
        <div ref={containerRef} className="app-container">
            {/* Top toolbar */}
            <div className="clock-toolbar">
                {isEmbedded && (
                    <button
                        onClick={handleBackToDashboard}
                        className="toolbar-btn"
                        title="Quay lại Menu"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Quay lại</span>
                    </button>
                )}

                <div className="toolbar-title">
                    ⏰ Xem Giờ Trên Đồng Hồ
                </div>

                <button
                    onClick={toggleFullscreen}
                    className="toolbar-btn"
                    title={isFullscreen ? 'Thu nhỏ' : 'Phóng to màn hình'}
                >
                    {isFullscreen ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    )}
                    <span>{isFullscreen ? 'Thu nhỏ' : 'Phóng to'}</span>
                </button>
            </div>

            {screen === 'intro' && (
                <IntroScreen onSelectMode={handleSelectMode} />
            )}

            {(screen as string) === 'levelSelect' && (
                <LevelSelector
                    onSelect={handleSelectLevel}
                    onBack={goHome}
                    title={
                        pendingMode === 'practice'
                            ? '🎮 Thực hành — Chọn cấp độ'
                            : '🏆 Luyện tập — Chọn cấp độ'
                    }
                />
            )}

            {screen === 'learn' && (
                <LearnMode onBack={goHome} />
            )}

            {screen === 'practice' && (
                <PracticeMode
                    level={level}
                    onBack={goBack}
                    onGoHome={goHome}
                />
            )}

            {screen === 'quiz' && (
                <QuizMode
                    level={level}
                    onBack={goBack}
                    onGoHome={goHome}
                />
            )}
        </div>
    );
};

export default App;
