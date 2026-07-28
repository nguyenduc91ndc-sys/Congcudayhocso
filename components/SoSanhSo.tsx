import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    Check,
    ChevronRight,
    Link2,
    Minus,
    Plus,
    RotateCcw,
    Sparkles,
    Timer,
    Trophy,
    X,
} from 'lucide-react';

interface SoSanhSoProps {
    onBack: () => void;
}

type Mode = 'explore' | 'choose' | 'count' | 'speed';
type Relation = '<' | '=' | '>';

interface CountObject {
    name: string;
    icon: string;
    tileClass: string;
}

interface Problem {
    left: number;
    right: number;
    object: CountObject;
}

const OBJECTS: CountObject[] = [
    { name: 'qua tao', icon: '🍎', tileClass: 'bg-red-50 border-red-200' },
    { name: 'ngoi sao', icon: '⭐', tileClass: 'bg-amber-50 border-amber-200' },
    { name: 'but chi', icon: '✏️', tileClass: 'bg-sky-50 border-sky-200' },
    { name: 'quyen vo', icon: '📘', tileClass: 'bg-indigo-50 border-indigo-200' },
    { name: 'vien bi', icon: '🔵', tileClass: 'bg-cyan-50 border-cyan-200' },
    { name: 'bong hoa', icon: '🌼', tileClass: 'bg-yellow-50 border-yellow-200' },
];

const MODES: Array<{ id: Mode; label: string; tone: string }> = [
    { id: 'explore', label: 'Khám phá', tone: 'from-cyan-400 to-sky-500' },
    { id: 'choose', label: 'Chọn dấu', tone: 'from-emerald-400 to-teal-500' },
    { id: 'count', label: 'Đếm vật', tone: 'from-amber-400 to-orange-500' },
    { id: 'speed', label: 'Nhanh tay', tone: 'from-fuchsia-400 to-rose-500' },
];

const LEVELS = [5, 10, 20];
const SIGNS: Relation[] = ['<', '=', '>'];

const compare = (left: number, right: number): Relation => {
    if (left > right) return '>';
    if (left < right) return '<';
    return '=';
};

const relationText = (relation: Relation): string => {
    if (relation === '>') return 'lớn hơn';
    if (relation === '<') return 'bé hơn';
    return 'bằng';
};

const randomInt = (max: number) => Math.floor(Math.random() * (max + 1));

const createProblem = (maxValue: number): Problem => ({
    left: randomInt(maxValue),
    right: randomInt(maxValue),
    object: OBJECTS[Math.floor(Math.random() * OBJECTS.length)],
});

const clamp = (value: number, maxValue: number) => Math.max(0, Math.min(maxValue, value));

let answerAudioContext: AudioContext | null = null;

const getAnswerAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!answerAudioContext) answerAudioContext = new AudioContextCtor();
    return answerAudioContext;
};

const playAnswerSound = (isCorrect: boolean) => {
    try {
        const ctx = getAnswerAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => undefined);
        }

        const now = ctx.currentTime;
        const notes = isCorrect
            ? [
                { freq: 523.25, start: 0, duration: 0.16 },
                { freq: 659.25, start: 0.12, duration: 0.18 },
                { freq: 783.99, start: 0.26, duration: 0.28 },
            ]
            : [
                { freq: 240, start: 0, duration: 0.18 },
                { freq: 180, start: 0.18, duration: 0.28 },
            ];

        notes.forEach(note => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.type = isCorrect ? 'triangle' : 'sine';
            oscillator.frequency.setValueAtTime(note.freq, now + note.start);

            gainNode.gain.setValueAtTime(0.0001, now + note.start);
            gainNode.gain.exponentialRampToValueAtTime(isCorrect ? 0.22 : 0.16, now + note.start + 0.03);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

            oscillator.start(now + note.start);
            oscillator.stop(now + note.start + note.duration + 0.04);
        });
    } catch {
        // Audio is optional; visual feedback still works if the browser blocks sound.
    }
};

const SoSanhSo: React.FC<SoSanhSoProps> = ({ onBack }) => {
    const [mode, setMode] = useState<Mode>('choose');
    const [maxValue, setMaxValue] = useState(10);
    const [problem, setProblem] = useState<Problem>(() => createProblem(10));
    const [exploreLeft, setExploreLeft] = useState(3);
    const [exploreRight, setExploreRight] = useState(5);
    const [selectedSign, setSelectedSign] = useState<Relation | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [answered, setAnswered] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [copied, setCopied] = useState(false);

    const activeRelation = mode === 'explore'
        ? compare(exploreLeft, exploreRight)
        : compare(problem.left, problem.right);

    const statement = useMemo(() => {
        const left = mode === 'explore' ? exploreLeft : problem.left;
        const right = mode === 'explore' ? exploreRight : problem.right;
        return `${left} ${relationText(compare(left, right))} ${right}`;
    }, [exploreLeft, exploreRight, mode, problem.left, problem.right]);

    useEffect(() => {
        if (mode !== 'speed' || timeLeft <= 0) return;

        const timer = window.setInterval(() => {
            setTimeLeft(current => Math.max(0, current - 1));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [mode, timeLeft]);

    const resetRound = (nextMode = mode, nextMax = maxValue) => {
        setProblem(createProblem(nextMax));
        setSelectedSign(null);
        setFeedback(null);
        setScore(0);
        setStreak(0);
        setAnswered(0);
        setTimeLeft(60);
        setMode(nextMode);
    };

    const nextProblem = () => {
        setProblem(createProblem(maxValue));
        setSelectedSign(null);
        setFeedback(null);
    };

    const handlePickMode = (nextMode: Mode) => {
        resetRound(nextMode, maxValue);
    };

    const handlePickLevel = (nextMax: number) => {
        setMaxValue(nextMax);
        setExploreLeft(current => clamp(current, nextMax));
        setExploreRight(current => clamp(current, nextMax));
        resetRound(mode, nextMax);
    };

    const handleAnswer = (sign: Relation) => {
        if (mode === 'speed' && timeLeft === 0) return;
        if (feedback) return;

        const isCorrect = sign === activeRelation;
        playAnswerSound(isCorrect);
        setSelectedSign(sign);
        setFeedback(isCorrect ? 'correct' : 'wrong');
        setAnswered(current => current + 1);
        setScore(current => current + (isCorrect ? 10 + Math.min(streak, 5) : 0));
        setStreak(current => (isCorrect ? current + 1 : 0));

        if (mode === 'speed' && isCorrect) {
            window.setTimeout(nextProblem, 650);
        }
    };

    const handleCopyLink = async () => {
        const url = `${window.location.origin}${window.location.pathname}?app=so_sanh_so`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const renderItems = (count: number, object: CountObject) => (
        <div className="grid min-h-[132px] grid-cols-5 content-center gap-2 rounded-[28px] border-2 border-dashed border-white/80 bg-white/70 p-3 shadow-inner sm:grid-cols-6 md:min-h-[168px] md:grid-cols-5 lg:grid-cols-6">
            {count === 0 ? (
                <div className="col-span-5 flex h-24 items-center justify-center rounded-2xl bg-slate-50 text-4xl font-black text-slate-300 sm:col-span-6 md:col-span-5 lg:col-span-6">
                    0
                </div>
            ) : (
                Array.from({ length: count }).map((_, index) => (
                    <div
                        key={`${object.name}-${index}`}
                        className={`flex aspect-square items-center justify-center rounded-2xl border text-2xl shadow-sm md:text-3xl ${object.tileClass}`}
                    >
                        {object.icon}
                    </div>
                ))
            )}
        </div>
    );

    const numberPanel = (label: string, value: number, side: 'left' | 'right') => (
        <div className="min-w-0 rounded-[30px] border-4 border-white bg-white/90 p-4 text-center shadow-xl">
            <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white shadow-lg ${side === 'left' ? 'bg-sky-500' : 'bg-rose-500'}`}>
                {label}
            </div>
            <div className={`mx-auto flex aspect-square max-h-40 min-h-28 w-full max-w-40 items-center justify-center rounded-[28px] text-6xl font-black text-white shadow-inner md:text-7xl ${side === 'left' ? 'bg-gradient-to-br from-cyan-400 to-blue-500' : 'bg-gradient-to-br from-pink-400 to-red-500'}`}>
                {value}
            </div>
        </div>
    );

    const countPanel = (label: string, value: number, side: 'left' | 'right') => (
        <div className="min-w-0 rounded-[30px] border-4 border-white bg-white/90 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-base font-black text-white ${side === 'left' ? 'bg-sky-500' : 'bg-rose-500'}`}>
                    {label}
                </div>
                <div className="rounded-2xl bg-slate-100 px-4 py-2 text-2xl font-black text-slate-800">
                    {value}
                </div>
            </div>
            {renderItems(value, problem.object)}
        </div>
    );

    const explorePanel = (label: string, value: number, setValue: React.Dispatch<React.SetStateAction<number>>, side: 'left' | 'right') => (
        <div className="min-w-0 rounded-[30px] border-4 border-white bg-white/90 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-base font-black text-white ${side === 'left' ? 'bg-sky-500' : 'bg-rose-500'}`}>
                    {label}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setValue(current => clamp(current - 1, maxValue))}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm transition hover:bg-slate-200"
                        aria-label={`Giam ben ${label}`}
                    >
                        <Minus size={18} />
                    </button>
                    <div className="flex h-12 min-w-14 items-center justify-center rounded-2xl bg-slate-900 px-3 text-2xl font-black text-white">
                        {value}
                    </div>
                    <button
                        type="button"
                        onClick={() => setValue(current => clamp(current + 1, maxValue))}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm transition hover:bg-slate-200"
                        aria-label={`Tang ben ${label}`}
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>
            {renderItems(value, problem.object)}
        </div>
    );

    const signButtonClass = (sign: Relation) => {
        const isSelected = selectedSign === sign;
        const isCorrectSign = feedback && sign === activeRelation;
        const isWrongSelected = feedback === 'wrong' && isSelected;

        if (isCorrectSign) return 'border-emerald-500 bg-emerald-500 text-white shadow-emerald-200';
        if (isWrongSelected) return 'border-rose-500 bg-rose-500 text-white shadow-rose-200';
        if (isSelected) return 'border-sky-500 bg-sky-500 text-white shadow-sky-200';
        return 'border-white bg-white text-slate-800 shadow-slate-200 hover:-translate-y-1 hover:bg-sky-50';
    };

    return (
        <div className="min-h-screen bg-[#d9f7ff] text-slate-900">
            <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#d9f7ff_0%,#fff5c7_42%,#f0ffe5_100%)]">
                <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 px-3 py-3 shadow-sm backdrop-blur md:px-5">
                    <div className="mx-auto flex max-w-7xl items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md transition hover:bg-slate-700"
                            aria-label="Quay lai"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-pink-400 to-sky-400 text-2xl shadow-lg">
                            🔢
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-lg font-black text-slate-900 md:text-2xl">Bé So Sánh Số</h1>
                            <p className="hidden text-sm font-semibold text-slate-500 sm:block">Luyện lớn hơn, bé hơn, bằng nhau cho mầm non và tiểu học</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="flex h-11 items-center gap-2 rounded-2xl bg-sky-600 px-3 text-sm font-bold text-white shadow-md transition hover:bg-sky-700 md:px-4"
                        >
                            {copied ? <Check size={18} /> : <Link2 size={18} />}
                            <span className="hidden sm:inline">{copied ? 'Đã sao chép' : 'Chia sẻ'}</span>
                        </button>
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-3 py-4 md:px-5 md:py-6">
                    <section className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="flex gap-2 overflow-x-auto rounded-[28px] border-4 border-white bg-white/65 p-2 shadow-lg">
                            {MODES.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handlePickMode(item.id)}
                                    className={`min-w-fit rounded-2xl px-4 py-3 text-sm font-black transition md:text-base ${mode === item.id
                                        ? `bg-gradient-to-r ${item.tone} text-white shadow-md`
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-2 rounded-[28px] border-4 border-white bg-white/65 p-2 shadow-lg">
                            {LEVELS.map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => handlePickLevel(level)}
                                    className={`rounded-2xl px-3 py-3 text-sm font-black transition ${maxValue === level
                                        ? 'bg-slate-900 text-white shadow-md'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    0-{level}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-[28px] border-4 border-white bg-white/75 p-4 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                                    <Trophy size={22} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase text-slate-500">Điểm</div>
                                    <div className="text-2xl font-black text-slate-900">{score}</div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[28px] border-4 border-white bg-white/75 p-4 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white">
                                    <Sparkles size={22} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase text-slate-500">Chuỗi đúng</div>
                                    <div className="text-2xl font-black text-slate-900">{streak}</div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[28px] border-4 border-white bg-white/75 p-4 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white ${mode === 'speed' ? 'bg-rose-500' : 'bg-sky-500'}`}>
                                    <Timer size={22} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase text-slate-500">{mode === 'speed' ? 'Thời gian' : 'Lượt làm'}</div>
                                    <div className="text-2xl font-black text-slate-900">{mode === 'speed' ? `${timeLeft}s` : answered}</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="flex flex-1 flex-col gap-4 rounded-[34px] border-4 border-white bg-white/45 p-3 shadow-2xl md:p-5">
                        {mode === 'explore' ? (
                            <div className="grid flex-1 items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
                                {explorePanel('A', exploreLeft, setExploreLeft, 'left')}
                                <div className="flex items-center justify-center">
                                    <div className="flex h-28 w-28 items-center justify-center rounded-[32px] border-4 border-white bg-slate-900 text-7xl font-black text-white shadow-xl md:h-36 md:w-36 md:text-8xl">
                                        {activeRelation}
                                    </div>
                                </div>
                                {explorePanel('B', exploreRight, setExploreRight, 'right')}
                            </div>
                        ) : (
                            <div className="grid flex-1 items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
                                {mode === 'count'
                                    ? countPanel('A', problem.left, 'left')
                                    : numberPanel('A', problem.left, 'left')}
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="flex h-24 w-24 items-center justify-center rounded-[30px] border-4 border-white bg-white text-5xl font-black text-slate-300 shadow-xl md:h-32 md:w-32 md:text-7xl">
                                        ?
                                    </div>
                                    {feedback && (
                                        <div className={`flex min-h-12 items-center gap-2 rounded-2xl px-4 py-3 text-center text-sm font-black shadow-lg md:text-base ${feedback === 'correct' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                            {feedback === 'correct' ? <Check size={20} /> : <X size={20} />}
                                            {feedback === 'correct' ? 'Đúng rồi' : `Đáp án là ${activeRelation}`}
                                        </div>
                                    )}
                                </div>
                                {mode === 'count'
                                    ? countPanel('B', problem.right, 'right')
                                    : numberPanel('B', problem.right, 'right')}
                            </div>
                        )}

                        <div className="rounded-[28px] border-4 border-white bg-white/80 p-4 text-center shadow-lg">
                            <div className="mb-3 text-xl font-black text-slate-800 md:text-2xl">
                                {mode === 'explore' ? statement : 'Chọn dấu thích hợp'}
                            </div>
                            {mode !== 'explore' && (
                                <div className="grid grid-cols-3 gap-3">
                                    {SIGNS.map(sign => (
                                        <button
                                            key={sign}
                                            type="button"
                                            onClick={() => handleAnswer(sign)}
                                            className={`min-h-20 rounded-[26px] border-4 text-5xl font-black shadow-lg transition md:min-h-24 md:text-6xl ${signButtonClass(sign)}`}
                                        >
                                            {sign}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => resetRound(mode, maxValue)}
                                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-black text-slate-700 shadow-lg transition hover:bg-slate-50"
                            >
                                <RotateCcw size={20} />
                                Làm lại
                            </button>
                            {mode !== 'explore' && (
                                <button
                                    type="button"
                                    onClick={nextProblem}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-base font-black text-white shadow-lg transition hover:bg-slate-700"
                                >
                                    Câu tiếp theo
                                    <ChevronRight size={20} />
                                </button>
                            )}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default SoSanhSo;
