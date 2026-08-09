import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    BellRing,
    Hourglass,
    Pause,
    Play,
    RotateCcw,
    Timer,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { playClick, playSecondBeep, playTimerFinish } from '../utils/sounds';

type TimerMode = 'countdown' | 'stopwatch';

const PRESETS = [
    { label: '30s', seconds: 30 },
    { label: '1p', seconds: 60 },
    { label: '3p', seconds: 180 },
    { label: '5p', seconds: 300 },
    { label: '10p', seconds: 600 },
];

const ACCENTS = [
    { name: 'Tím', value: '#6C63FF' },
    { name: 'Xanh', value: '#2DD4BF' },
    { name: 'Vàng', value: '#FBBF24' },
    { name: 'Hồng', value: '#F472B6' },
];

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const ClassTimer: React.FC = () => {
    const [mode, setMode] = useState<TimerMode>('countdown');
    const [duration, setDuration] = useState(300);
    const [remaining, setRemaining] = useState(300);
    const [elapsed, setElapsed] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [secondSound, setSecondSound] = useState(true);
    const [finishSound, setFinishSound] = useState(true);
    const [accent, setAccent] = useState(ACCENTS[0].value);

    const startAtRef = useRef(0);
    const endAtRef = useRef(0);
    const baseElapsedRef = useRef(0);
    const lastSecondRef = useRef<number | null>(null);
    const finishedRef = useRef(false);

    const displaySeconds = mode === 'countdown' ? remaining : elapsed;
    const minutesValue = Math.floor(duration / 60);
    const secondsValue = duration % 60;
    const countdownFinished = mode === 'countdown' && remaining === 0 && !isRunning;
    const isUrgent = mode === 'countdown' && isRunning && remaining <= 10;

    const progress = useMemo(() => {
        if (mode === 'stopwatch') {
            return (elapsed % 60) / 60;
        }

        return duration > 0 ? (duration - remaining) / duration : 0;
    }, [duration, elapsed, mode, remaining]);

    useEffect(() => {
        if (!isRunning) {
            return;
        }

        const intervalId = window.setInterval(() => {
            const now = Date.now();

            if (mode === 'countdown') {
                const nextRemaining = Math.max(0, Math.ceil((endAtRef.current - now) / 1000));
                setRemaining(nextRemaining);

                if (nextRemaining === 0) {
                    setIsRunning(false);
                    if (!finishedRef.current) {
                        finishedRef.current = true;
                        if (finishSound) {
                            playTimerFinish();
                        }
                    }
                }
            } else {
                const nextElapsed = baseElapsedRef.current + Math.floor((now - startAtRef.current) / 1000);
                setElapsed(nextElapsed);
            }
        }, 120);

        return () => window.clearInterval(intervalId);
    }, [finishSound, isRunning, mode]);

    useEffect(() => {
        if (!isRunning || !secondSound) {
            lastSecondRef.current = displaySeconds;
            return;
        }

        if (lastSecondRef.current === null) {
            lastSecondRef.current = displaySeconds;
            return;
        }

        if (displaySeconds !== lastSecondRef.current) {
            const shouldBeep = mode === 'stopwatch' ? displaySeconds > 0 : displaySeconds > 0;
            lastSecondRef.current = displaySeconds;

            if (shouldBeep) {
                playSecondBeep();
            }
        }
    }, [displaySeconds, isRunning, mode, secondSound]);

    const updateDuration = (nextDuration: number) => {
        const safeDuration = clamp(nextDuration, 1, 99 * 60 + 59);
        setDuration(safeDuration);
        if (mode === 'countdown' && !isRunning) {
            setRemaining(safeDuration);
        }
        finishedRef.current = false;
    };

    const handleMinuteChange = (value: string) => {
        const nextMinutes = clamp(Number(value) || 0, 0, 99);
        updateDuration(nextMinutes * 60 + secondsValue);
    };

    const handleSecondChange = (value: string) => {
        const nextSeconds = clamp(Number(value) || 0, 0, 59);
        updateDuration(minutesValue * 60 + nextSeconds);
    };

    const selectMode = (nextMode: TimerMode) => {
        playClick();
        setIsRunning(false);
        setMode(nextMode);
        setElapsed(0);
        setRemaining(duration);
        lastSecondRef.current = null;
        finishedRef.current = false;
    };

    const start = () => {
        playClick();
        finishedRef.current = false;
        lastSecondRef.current = displaySeconds;

        if (mode === 'countdown') {
            const startRemaining = remaining > 0 ? remaining : duration;
            setRemaining(startRemaining);
            endAtRef.current = Date.now() + startRemaining * 1000;
        } else {
            baseElapsedRef.current = elapsed;
            startAtRef.current = Date.now();
        }

        setIsRunning(true);
    };

    const pause = () => {
        playClick();
        if (mode === 'stopwatch') {
            baseElapsedRef.current = elapsed;
        }
        setIsRunning(false);
    };

    const reset = () => {
        playClick();
        setIsRunning(false);
        setRemaining(duration);
        setElapsed(0);
        lastSecondRef.current = null;
        finishedRef.current = false;
    };

    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const strokeOffset = circumference * (1 - progress);

    return (
        <section className="class-timer" style={{ '--timer-accent': accent } as React.CSSProperties}>
            <div className="timer-header">
                <div>
                    <div className="timer-eyebrow">
                        <Timer size={15} />
                        Bấm giờ lớp học
                    </div>
                    <h2>{mode === 'countdown' ? 'Đếm ngược sinh động' : 'Bấm giờ sinh động'}</h2>
                </div>
                <button
                    className={`timer-sound-btn ${secondSound ? 'active' : ''}`}
                    onClick={() => setSecondSound((value) => !value)}
                    title={secondSound ? 'Tắt âm báo từng giây' : 'Bật âm báo từng giây'}
                    type="button"
                >
                    {secondSound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
            </div>

            <div className="timer-mode-switch" role="tablist" aria-label="Chế độ bấm giờ">
                <button
                    className={mode === 'countdown' ? 'active' : ''}
                    onClick={() => selectMode('countdown')}
                    type="button"
                >
                    <Hourglass size={16} />
                    Đếm ngược
                </button>
                <button
                    className={mode === 'stopwatch' ? 'active' : ''}
                    onClick={() => selectMode('stopwatch')}
                    type="button"
                >
                    <Timer size={16} />
                    Bấm giờ
                </button>
            </div>

            <div className="timer-body">
                <div className={`timer-ring ${isRunning ? 'running' : ''} ${isUrgent ? 'urgent' : ''} ${countdownFinished ? 'done' : ''}`}>
                    <svg viewBox="0 0 140 140" aria-hidden="true">
                        <circle className="timer-ring-track" cx="70" cy="70" r={radius} />
                        <circle
                            className="timer-ring-progress"
                            cx="70"
                            cy="70"
                            r={radius}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeOffset}
                        />
                    </svg>
                    <div className="timer-time">
                        <strong>{formatTime(displaySeconds)}</strong>
                        <span>{countdownFinished ? 'Hết giờ' : isRunning ? 'Đang chạy' : 'Sẵn sàng'}</span>
                    </div>
                </div>

                <div className="timer-controls">
                    {mode === 'countdown' && (
                        <>
                            <div className="timer-inputs">
                                <label>
                                    Phút
                                    <input
                                        type="number"
                                        min="0"
                                        max="99"
                                        value={minutesValue}
                                        onChange={(event) => handleMinuteChange(event.target.value)}
                                        disabled={isRunning}
                                    />
                                </label>
                                <label>
                                    Giây
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={secondsValue}
                                        onChange={(event) => handleSecondChange(event.target.value)}
                                        disabled={isRunning}
                                    />
                                </label>
                            </div>

                            <div className="timer-presets">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.seconds}
                                        className={duration === preset.seconds ? 'active' : ''}
                                        onClick={() => updateDuration(preset.seconds)}
                                        disabled={isRunning}
                                        type="button"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="timer-actions">
                        {isRunning ? (
                            <button className="timer-main-btn pause" onClick={pause} type="button">
                                <Pause size={18} />
                                Tạm dừng
                            </button>
                        ) : (
                            <button className="timer-main-btn" onClick={start} type="button">
                                <Play size={18} />
                                Bắt đầu
                            </button>
                        )}
                        <button className="timer-reset-btn" onClick={reset} type="button" title="Đặt lại">
                            <RotateCcw size={18} />
                        </button>
                    </div>

                    <div className="timer-options">
                        <button
                            className={finishSound ? 'active' : ''}
                            onClick={() => setFinishSound((value) => !value)}
                            type="button"
                        >
                            <BellRing size={15} />
                            Âm kết thúc
                        </button>
                        <div className="timer-palette" aria-label="Màu đồng hồ">
                            {ACCENTS.map((item) => (
                                <button
                                    key={item.value}
                                    className={accent === item.value ? 'active' : ''}
                                    style={{ backgroundColor: item.value }}
                                    onClick={() => setAccent(item.value)}
                                    title={item.name}
                                    type="button"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ClassTimer;
