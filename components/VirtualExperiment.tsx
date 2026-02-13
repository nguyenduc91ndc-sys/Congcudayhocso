import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, BookOpen, X, CheckCircle, XCircle, ZoomIn, ZoomOut, Maximize, Link2, Check, FlaskConical } from 'lucide-react';

interface VirtualExperimentProps {
    onBack: () => void;
}

const quizData = [
    { q: "Khi muối hòa tan hoàn toàn vào nước, ta được gì?", options: ["Dung dịch nước muối", "Hỗn hợp vẩn đục", "Nước tinh khiết"], correct: 0 },
    { q: "Quá trình nước biến thành hơi khi đun nóng gọi là gì?", options: ["Sự ngưng tụ", "Sự bay hơi", "Sự nóng chảy"], correct: 1 },
    { q: "Làm sao để tách muối ra khỏi dung dịch nước muối?", options: ["Lọc bằng giấy lọc", "Phơi nắng hoặc đun cạn", "Dùng nam châm"], correct: 1 },
    { q: "Trong dung dịch nước muối, nước đóng vai trò là gì?", options: ["Chất tan", "Dung môi", "Chất rắn"], correct: 1 },
    { q: "Người dân làm muối từ nước biển bằng cách nào?", options: ["Đun sôi nước biển", "Dẫn nước biển vào ruộng rồi để mặt trời làm bay hơi nước", "Lọc nước biển qua cát"], correct: 1 },
];

const STEPS = [
    "Bước 1: Kéo thìa đến hũ muối để lấy muối",
    "Bước 2: Kéo thìa (có muối) vào cốc nước để hòa tan",
    "⏳ Đang khuấy tan muối...",
    "Bước 3: Kéo cốc dung dịch đổ vào bát sứ",
    "Bước 4: Kéo đèn cồn đặt dưới kiềng để đun",
    "🔥 Nước đang bay hơi...",
    "✅ Thu được lớp muối trắng sau khi nước bay hơi hết!"
];

// Helper: which items should glow at each step
const GLOW_MAP: Record<number, string[]> = {
    0: ['spoon', 'saltJar'],
    1: ['spoon', 'beaker'],
    3: ['beaker', 'bowl'],
    4: ['burner', 'tripod'],
};

const VirtualExperiment: React.FC<VirtualExperimentProps> = ({ onBack }) => {
    const [step, setStep] = useState(0);
    const [spoonHasSalt, setSpoonHasSalt] = useState(false);
    const [isStirring, setIsStirring] = useState(false);
    const [waterInBeaker, setWaterInBeaker] = useState(65);
    const [waterInBowl, setWaterInBowl] = useState(0);
    const [beakerPouring, setBeakerPouring] = useState(false);
    const [flameOn, setFlameOn] = useState(false);
    const [steamActive, setSteamActive] = useState(false);
    const [saltVisible, setSaltVisible] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [currentQ, setCurrentQ] = useState(0);
    const [score, setScore] = useState(0);
    const [answered, setAnswered] = useState<number | null>(null);
    const [quizDone, setQuizDone] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [copySuccess, setCopySuccess] = useState(false);

    const zoomIn = () => setZoom(z => Math.min(z + 0.15, 2));
    const zoomOut = () => setZoom(z => Math.max(z - 0.15, 0.5));
    const zoomReset = () => setZoom(1);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = window.location.href;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    const shouldGlow = (id: string) => (GLOW_MAP[step] || []).includes(id);

    // Drag state
    const [dragItem, setDragItem] = useState<string | null>(null);
    const [positions, setPositions] = useState({
        spoon: { x: 0, y: 0 },
        beaker: { x: 0, y: 0 },
        burner: { x: 0, y: 0 },
    });
    const spoonRef = useRef<HTMLDivElement>(null);
    const beakerRef = useRef<HTMLDivElement>(null);
    const burnerRef = useRef<HTMLDivElement>(null);
    const saltJarRef = useRef<HTMLDivElement>(null);
    const bowlRef = useRef<HTMLDivElement>(null);
    const tripodRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const isOverlapping = (el1: HTMLDivElement | null, el2: HTMLDivElement | null) => {
        if (!el1 || !el2) return false;
        const r1 = el1.getBoundingClientRect();
        const r2 = el2.getBoundingClientRect();
        return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
    };

    const handlePointerDown = (item: string) => (e: React.PointerEvent) => {
        if (step === 2 || step === 5) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setDragItem(item);
        dragStartRef.current = { x: e.clientX - positions[item as keyof typeof positions].x, y: e.clientY - positions[item as keyof typeof positions].y };
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!dragItem) return;
        setPositions(prev => ({ ...prev, [dragItem]: { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y } }));
    }, [dragItem]);

    const handlePointerUp = useCallback(() => {
        if (!dragItem) return;
        if (step === 0 && dragItem === 'spoon' && isOverlapping(spoonRef.current, saltJarRef.current)) {
            setSpoonHasSalt(true); setStep(1);
        } else if (step === 1 && dragItem === 'spoon' && isOverlapping(spoonRef.current, beakerRef.current)) {
            setStep(2); setIsStirring(true);
            setTimeout(() => { setIsStirring(false); setSpoonHasSalt(false); setStep(3); }, 2500);
        } else if (step === 3 && dragItem === 'beaker' && isOverlapping(beakerRef.current, bowlRef.current)) {
            setBeakerPouring(true);
            setTimeout(() => { setWaterInBeaker(0); setWaterInBowl(60); setTimeout(() => { setBeakerPouring(false); setStep(4); }, 1200); }, 800);
        } else if (step === 4 && dragItem === 'burner' && isOverlapping(burnerRef.current, tripodRef.current)) {
            setFlameOn(true); setStep(5); setSteamActive(true);
            setTimeout(() => { setWaterInBowl(0); setSaltVisible(true); setFlameOn(false); setSteamActive(false); setStep(6); }, 7000);
        }
        setDragItem(null);
    }, [dragItem, step]);

    useEffect(() => {
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => { window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp); };
    }, [handlePointerMove, handlePointerUp]);

    const resetExperiment = () => {
        setStep(0); setSpoonHasSalt(false); setIsStirring(false); setWaterInBeaker(65); setWaterInBowl(0);
        setBeakerPouring(false); setFlameOn(false); setSteamActive(false); setSaltVisible(false);
        setPositions({ spoon: { x: 0, y: 0 }, beaker: { x: 0, y: 0 }, burner: { x: 0, y: 0 } });
    };

    const handleAnswer = (idx: number) => {
        if (answered !== null) return;
        setAnswered(idx);
        if (idx === quizData[currentQ].correct) setScore(s => s + 1);
        setTimeout(() => {
            if (currentQ < quizData.length - 1) { setCurrentQ(q => q + 1); setAnswered(null); }
            else setQuizDone(true);
        }, 1500);
    };

    const startQuiz = () => { setShowQuiz(true); setCurrentQ(0); setScore(0); setAnswered(null); setQuizDone(false); };

    // ── Glow ring component ──
    const GlowRing = ({ active, color = '#60a5fa' }: { active: boolean; color?: string }) => active ? (
        <motion.div
            className="absolute -inset-3 rounded-2xl pointer-events-none z-0"
            animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.04, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ border: `2.5px dashed ${color}`, boxShadow: `0 0 20px ${color}40, inset 0 0 20px ${color}15` }}
        />
    ) : null;

    // ── Label component ──
    const Label = ({ text, glow = false }: { text: string; glow?: boolean }) => (
        <div className="mt-1.5 px-4 py-1.5 rounded-xl text-center" style={{
            background: glow ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            border: glow ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.15)',
            boxShadow: glow ? '0 0 12px rgba(96,165,250,0.2)' : 'none',
        }}>
            <span className="text-sm font-bold" style={{ color: glow ? '#93c5fd' : 'rgba(255,255,255,0.75)' }}>{text}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 select-none overflow-hidden" style={{ touchAction: 'none' }}>

            {/* ═══════ BACKGROUND ═══════ */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #0c1a2e 0%, #162a4a 35%, #1a3355 55%, #0f1f38 100%)' }} />
            {/* Hex grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '30px 30px'
            }} />
            {/* Top ambient glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full" style={{
                background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
                filter: 'blur(60px)'
            }} />
            {/* Center glow behind tripod */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[500px] h-[400px] rounded-full" style={{
                background: 'radial-gradient(ellipse, rgba(147,197,253,0.06) 0%, transparent 60%)',
                filter: 'blur(50px)'
            }} />

            {/* Bottom edge - thin line only */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,94,60,0.3), transparent)' }} />

            {/* ═══════ TOP TOOLBAR ═══════ */}
            <div className="absolute top-0 left-0 right-0 z-[60] h-12" style={{
                background: 'rgba(12,26,46,0.85)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 2px 20px rgba(0,0,0,0.3)'
            }}>
                <div className="h-full px-3 flex items-center justify-between">
                    {/* Back */}
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onBack}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white/80 hover:text-white text-sm font-semibold transition"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <ArrowLeft size={16} /> Quay lại
                    </motion.button>

                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                            <FlaskConical size={17} className="text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-sm font-bold text-white/90 uppercase tracking-wider">Tách muối ra khỏi dung dịch muối</h1>
                            <p className="text-xs text-white/40">Khoa học 5 • Thí nghiệm ảo tương tác</p>
                        </div>
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button onClick={zoomOut} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition"><ZoomOut size={15} /></button>
                            <button onClick={zoomReset} className="h-8 px-2 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition border-x border-white/10 min-w-[44px]">{Math.round(zoom * 100)}%</button>
                            <button onClick={zoomIn} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition"><ZoomIn size={15} /></button>
                        </div>
                        <button onClick={zoomReset} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}><Maximize size={15} /></button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={copyLink}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                            style={{
                                background: copySuccess ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                                border: copySuccess ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
                                color: copySuccess ? '#4ade80' : 'rgba(255,255,255,0.6)'
                            }}>
                            {copySuccess ? <><Check size={13} /> Đã chép</> : <><Link2 size={13} /> Copy link</>}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* ═══════ STATUS BAR ═══════ */}
            <motion.div key={step} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-50">
                <div className="px-6 py-2 rounded-xl text-sm font-semibold whitespace-nowrap" style={{
                    ...(step === 6
                        ? { background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80', boxShadow: '0 0 25px rgba(34,197,94,0.12)' }
                        : step === 2 || step === 5
                            ? { background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', boxShadow: '0 0 20px rgba(251,191,36,0.1)' }
                            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }
                    ),
                    backdropFilter: 'blur(12px)',
                }}>
                    {STEPS[step]}
                </div>
            </motion.div>

            {/* ═══════ LEFT SIDEBAR: STEP PROGRESS ═══════ */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1">
                {[
                    { s: 0, label: '1', desc: 'Lấy muối' },
                    { s: 1, label: '2', desc: 'Hòa tan' },
                    { s: 3, label: '3', desc: 'Rót dung dịch' },
                    { s: 4, label: '4', desc: 'Đun sôi' },
                    { s: 6, label: '✓', desc: 'Kết quả' },
                ].map((item, i) => {
                    const done = step >= item.s;
                    const active = step === item.s || (item.s === 1 && step === 2) || (item.s === 4 && step === 5);
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <div className="flex flex-col items-center">
                                <motion.div
                                    animate={active ? { scale: [1, 1.15, 1] } : {}}
                                    transition={active ? { duration: 1, repeat: Infinity } : {}}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                                    style={{
                                        background: done ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.06)',
                                        border: active ? '2px solid #60a5fa' : done ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                        color: done ? '#fff' : 'rgba(255,255,255,0.3)',
                                        boxShadow: active ? '0 0 15px rgba(59,130,246,0.3)' : 'none'
                                    }}>{item.label}</motion.div>
                                {i < 4 && <div className="w-[1px] h-5" style={{ background: done ? '#3b82f6' : 'rgba(255,255,255,0.08)' }} />}
                            </div>
                            <span className="text-[11px] font-semibold hidden lg:block" style={{ color: active ? '#93c5fd' : done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', minWidth: 70 }}>{item.desc}</span>
                        </div>
                    );
                })}
            </div>

            {/* ═══════ ZOOM WRAPPER ═══════ */}
            <div style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center 75%',
                transition: 'transform 0.25s ease',
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                pointerEvents: zoom === 1 ? 'auto' as const : 'auto' as const,
            }}>

                {/* ───── TRIPOD + BOWL (center) ───── */}
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center" style={{ bottom: '150px' }}>
                    <div ref={tripodRef} className="relative flex flex-col items-center">
                        <GlowRing active={shouldGlow('tripod') || shouldGlow('bowl')} color="#60a5fa" />
                        {/* Bowl */}
                        <div ref={bowlRef} className="relative overflow-hidden z-10" style={{
                            width: 180, height: 80,
                            background: 'linear-gradient(180deg, #f7f7f7, #e8e8e8, #ddd)',
                            border: '3px solid #ccc',
                            borderRadius: '10px 10px 90px 90px',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.25), inset 0 3px 15px rgba(255,255,255,0.5), inset 0 -5px 15px rgba(0,0,0,0.05)'
                        }}>
                            {/* Rim highlight */}
                            <div className="absolute top-0 left-[10%] right-[10%] h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }} />
                            {/* Water */}
                            <div className="absolute bottom-0 w-full transition-all duration-[1500ms]" style={{ height: `${waterInBowl}%`, background: 'linear-gradient(180deg, rgba(147,197,253,0.3), rgba(96,165,250,0.55))', borderRadius: '0 0 87px 87px' }}>
                                {/* Water surface shimmer */}
                                <div className="absolute top-0 left-0 right-0 h-2" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25), transparent)' }} />
                            </div>
                            {/* Salt result */}
                            {saltVisible && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                                    className="absolute bottom-2 left-[10%] w-[80%] h-6" style={{
                                        background: 'linear-gradient(180deg, #fafafa, #e8e8e8, #ddd)',
                                        borderRadius: '30% 30% 50% 50%',
                                        border: '1px solid #d0d0d0',
                                        boxShadow: '0 -4px 15px rgba(255,255,255,0.5), inset 0 2px 5px rgba(0,0,0,0.06)'
                                    }} />
                            )}
                            {/* Steam */}
                            {steamActive && Array.from({ length: 10 }).map((_, i) => (
                                <motion.div key={i} className="absolute rounded-full"
                                    style={{ width: 12 + Math.random() * 20, height: 12 + Math.random() * 20, left: `${5 + Math.random() * 90}%`, bottom: '100%', background: 'rgba(255,255,255,0.2)', filter: 'blur(5px)' }}
                                    animate={{ y: [0, -120 - Math.random() * 100], scale: [0.3, 2], opacity: [0, 0.6, 0] }}
                                    transition={{ duration: 1.5 + Math.random() * 0.8, repeat: Infinity, delay: i * 0.2, ease: 'easeOut' }}
                                />
                            ))}
                        </div>
                        {/* Wire gauze */}
                        <div style={{ width: 210, height: 6, background: 'linear-gradient(180deg, #666, #444)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', borderRadius: 2 }} />
                        {/* Tripod legs */}
                        <svg width="200" height="100" viewBox="0 0 200 100" className="mt-[-2px]">
                            <line x1="30" y1="0" x2="10" y2="100" stroke="#555" strokeWidth="6" strokeLinecap="round" />
                            <line x1="100" y1="0" x2="100" y2="100" stroke="#555" strokeWidth="6" strokeLinecap="round" />
                            <line x1="170" y1="0" x2="190" y2="100" stroke="#555" strokeWidth="6" strokeLinecap="round" />
                        </svg>
                        {/* Flame */}
                        {flameOn && (
                            <motion.div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 0 }}
                                animate={{ scaleY: [1, 1.15, 0.95, 1.1, 1], scaleX: [1, 0.95, 1.05, 0.98, 1] }}
                                transition={{ duration: 0.25, repeat: Infinity }}>
                                {/* Outer flame */}
                                <div className="w-8 h-16 relative" style={{ filter: 'blur(0.5px)' }}>
                                    <div className="absolute inset-0 rounded-[50%_50%_20%_20%]" style={{ background: 'radial-gradient(ellipse at 50% 85%, #ff6f00 0%, #ff9800 30%, #ffcc02 50%, transparent 75%)' }} />
                                    <div className="absolute inset-[15%] rounded-[50%_50%_20%_20%]" style={{ background: 'radial-gradient(ellipse at 50% 80%, #fff 0%, #ffe082 30%, #ffb74d 60%, transparent 80%)' }} />
                                </div>
                                {/* Glow */}
                                <div className="absolute -inset-4 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,152,0,0.15) 0%, transparent 70%)', filter: 'blur(10px)' }} />
                            </motion.div>
                        )}
                    </div>
                    {/* Label is now outside the relative wrapper */}
                    <div className="mt-4">
                        <Label text="Bát sứ + Kiềng" glow={shouldGlow('bowl') || shouldGlow('tripod')} />
                    </div>
                </div>

                {/* ───── SALT JAR (top-right area, static) ───── */}
                <div ref={saltJarRef} className="absolute flex flex-col items-center z-20" style={{ right: '18%', top: '25%' }}>
                    <GlowRing active={shouldGlow('saltJar')} color="#f97316" />
                    <div className="relative rounded-2xl flex flex-col items-center" style={{
                        width: 100, height: 130,
                        background: 'linear-gradient(160deg, #fff 0%, #f9fafb 40%, #f3f4f6 100%)',
                        border: '2.5px solid #e5e7eb',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)'
                    }}>
                        {/* Cap */}
                        <div className="w-full h-7 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.1)' }}>
                            <div className="w-full h-full rounded-t-2xl" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2), transparent)' }} />
                        </div>
                        {/* Label */}
                        <div className="flex-grow flex items-center justify-center">
                            <span className="text-xl font-black text-orange-600 tracking-widest">MUỐI</span>
                        </div>
                        {/* Salt grains visual */}
                        <div className="w-20 h-8 mb-3 rounded-lg relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #fafafa, #e8e8e8)', border: '1px solid #e0e0e0' }}>
                            {Array.from({ length: 15 }).map((_, i) => (
                                <div key={i} className="absolute rounded-sm" style={{
                                    width: 3 + Math.random() * 3, height: 3 + Math.random() * 3,
                                    left: `${Math.random() * 85}%`, top: `${Math.random() * 70}%`,
                                    background: 'rgba(255,255,255,0.9)',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                                }} />
                            ))}
                        </div>
                    </div>
                    <Label text="Hũ muối" glow={shouldGlow('saltJar')} />
                </div>

                {/* ───── SPOON (top-center, draggable) ───── */}
                <div ref={spoonRef} onPointerDown={handlePointerDown('spoon')}
                    className="absolute flex flex-col items-center z-50"
                    style={{ left: '48%', top: '22%', transform: `translate(${positions.spoon.x}px, ${positions.spoon.y}px)`, cursor: step === 2 || step === 5 ? 'not-allowed' : 'grab' }}>
                    <GlowRing active={shouldGlow('spoon')} />
                    <motion.div className="flex flex-col items-center"
                        animate={isStirring ? { x: [0, 6, 0, -6, 0], y: [0, 3, 6, 3, 0] } : {}}
                        transition={isStirring ? { duration: 0.3, repeat: Infinity } : {}}>
                        {/* Handle */}
                        <div style={{ width: 8, height: 60, background: 'linear-gradient(90deg, #9ca3af, #d4d4d8, #a1a1aa)', borderRadius: '5px 5px 2px 2px', boxShadow: '2px 0 4px rgba(0,0,0,0.1)' }} />
                        {/* Bowl */}
                        <div className="relative -mt-1" style={{ width: 34, height: 44, background: 'linear-gradient(160deg, #d4d4d8, #a1a1aa, #9ca3af)', borderRadius: '50%', boxShadow: '0 5px 12px rgba(0,0,0,0.2), inset 0 3px 8px rgba(255,255,255,0.3), inset 0 -2px 6px rgba(0,0,0,0.1)' }}>
                            {/* Inner concave */}
                            <div className="absolute top-2 left-2 right-2 bottom-3 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(255,255,255,0.1))', boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.1)' }} />
                            {spoonHasSalt && (
                                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    className="absolute top-3 left-[20%] w-[60%] h-3 rounded-full"
                                    style={{ background: 'linear-gradient(180deg, #fff, #f0f0f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                            )}
                        </div>
                    </motion.div>
                    <Label text="Thìa" glow={shouldGlow('spoon')} />
                </div>

                {/* ───── BEAKER (left side, draggable) ───── */}
                <div ref={beakerRef} onPointerDown={handlePointerDown('beaker')}
                    className="absolute flex flex-col items-center z-40"
                    style={{
                        left: '15%', top: '42%',
                        transform: `translate(${positions.beaker.x}px, ${positions.beaker.y}px) ${beakerPouring ? 'rotate(50deg)' : 'rotate(0deg)'}`,
                        transformOrigin: 'top right', transition: beakerPouring ? 'transform 0.8s ease' : 'none',
                        cursor: step === 2 || step === 5 ? 'not-allowed' : 'grab',
                    }}>
                    <GlowRing active={shouldGlow('beaker')} color="#3b82f6" />
                    <div className="relative" style={{
                        width: 100, height: 135,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                        border: '3px solid rgba(147,197,253,0.4)',
                        borderRadius: '0 0 20px 20px',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.2), inset 0 0 25px rgba(147,197,253,0.05)'
                    }}>
                        {/* Spout left */}
                        <div className="absolute -top-2 -left-2 w-4 h-3" style={{ borderLeft: '3px solid rgba(147,197,253,0.4)', borderTop: '3px solid rgba(147,197,253,0.4)', borderRadius: '6px 0 0 0' }} />
                        {/* Rim */}
                        <div className="absolute -top-[3px] left-3 right-0 h-[3px]" style={{ background: 'rgba(147,197,253,0.4)' }} />
                        {/* Water */}
                        <div className="absolute bottom-0 w-full transition-all duration-1000" style={{
                            height: `${waterInBeaker}%`,
                            background: 'linear-gradient(180deg, rgba(96,165,250,0.25), rgba(59,130,246,0.45))',
                            borderRadius: '0 0 17px 17px',
                        }}>
                            <div className="absolute top-0 left-0 right-0 h-3" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2), transparent)' }} />
                        </div>
                        {/* Measurement marks */}
                        {[30, 45, 60, 75].map(p => (
                            <div key={p} className="absolute right-2" style={{ top: `${p}%`, width: p % 30 === 0 ? 10 : 6, height: 1, background: 'rgba(255,255,255,0.15)' }} />
                        ))}
                        {/* Volume text */}
                        <div className="absolute w-full text-center top-[28%] text-xl font-bold" style={{ color: waterInBeaker > 0 ? 'rgba(147,197,253,0.7)' : 'rgba(255,255,255,0.2)' }}>
                            {waterInBeaker > 0 ? '80ml' : '0ml'}
                        </div>
                    </div>
                    <Label text="Cốc nước" glow={shouldGlow('beaker')} />
                </div>

                {/* ───── BURNER (right side, draggable) ───── */}
                <div ref={burnerRef} onPointerDown={handlePointerDown('burner')}
                    className="absolute flex flex-col items-center z-40"
                    style={{ right: '16%', top: '52%', transform: `translate(${positions.burner.x}px, ${positions.burner.y}px)`, cursor: step === 2 || step === 5 ? 'not-allowed' : 'grab' }}>
                    <GlowRing active={shouldGlow('burner')} color="#f59e0b" />
                    <div className="flex flex-col items-center">
                        {/* Wick */}
                        <div style={{ width: 4, height: 18, background: 'linear-gradient(180deg, #555, #333)', borderRadius: '2px 2px 0 0' }} />
                        {/* Reservoir */}
                        <div className="relative -mt-[2px]" style={{
                            width: 72, height: 56,
                            borderRadius: '50% 50% 8px 8px',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                            border: '2.5px solid rgba(147,197,253,0.35)',
                            boxShadow: '0 6px 16px rgba(0,0,0,0.2), inset 0 0 15px rgba(147,197,253,0.05)',
                            overflow: 'hidden'
                        }}>
                            <div className="absolute bottom-0 w-full h-[40%]" style={{ background: 'linear-gradient(180deg, rgba(96,165,250,0.15), rgba(59,130,246,0.3))' }}>
                                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15), transparent)' }} />
                            </div>
                        </div>
                        {/* Base */}
                        <div style={{ width: 100, height: 10, background: 'linear-gradient(180deg, #555, #333)', borderRadius: 4, boxShadow: '0 3px 8px rgba(0,0,0,0.3)' }} />
                    </div>
                    <Label text="Đèn cồn" glow={shouldGlow('burner')} />
                </div>

            </div>{/* end zoom wrapper */}

            {/* ═══════ BOTTOM CONTROLS ═══════ */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={resetExperiment}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white transition"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 4px 12px rgba(239,68,68,0.1)' }}>
                    <RotateCcw size={14} /> Làm lại
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startQuiz}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white transition"
                    style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 4px 12px rgba(34,197,94,0.1)' }}>
                    <BookOpen size={14} /> Luyện tập
                </motion.button>
            </div>

            {/* ═══════ QUIZ OVERLAY ═══════ */}
            <AnimatePresence>
                {showQuiz && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                        <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
                            className="w-[92%] max-w-lg relative rounded-3xl overflow-hidden"
                            style={{ background: 'linear-gradient(160deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                            <div className="h-1" style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)' }} />
                            <div className="p-7">
                                <button onClick={() => setShowQuiz(false)} className="absolute top-4 right-5 text-white/30 hover:text-white/60 transition"><X size={22} /></button>
                                {quizDone ? (
                                    <div className="text-center">
                                        <div className="text-5xl mb-3">🌟</div>
                                        <h3 className="text-xl font-bold text-white mb-1">Hoàn thành!</h3>
                                        <p className="text-white/50 mb-5">Điểm: <span className="font-bold text-green-400">{score}/{quizData.length}</span></p>
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={startQuiz} className="px-5 py-2.5 rounded-xl font-bold text-white text-xs" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>Làm lại</button>
                                            <button onClick={() => setShowQuiz(false)} className="px-5 py-2.5 rounded-xl font-bold text-white text-xs" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)' }}>Đóng</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[10px] text-white/25 mb-1.5 text-center font-semibold uppercase tracking-widest">Câu {currentQ + 1}/{quizData.length}</div>
                                        <h3 className="text-base font-bold text-white/90 mb-5 text-center leading-relaxed">{quizData[currentQ].q}</h3>
                                        <div className="space-y-2.5">
                                            {quizData[currentQ].options.map((opt, idx) => {
                                                let bg = 'rgba(255,255,255,0.03)'; let border = 'rgba(255,255,255,0.07)'; let textCol = 'rgba(255,255,255,0.75)'; let op = '1';
                                                if (answered !== null) {
                                                    if (idx === quizData[currentQ].correct) { bg = 'rgba(34,197,94,0.12)'; border = 'rgba(34,197,94,0.4)'; textCol = '#4ade80'; }
                                                    else if (idx === answered) { bg = 'rgba(239,68,68,0.12)'; border = 'rgba(239,68,68,0.4)'; textCol = '#f87171'; }
                                                    else op = '0.3';
                                                }
                                                return (
                                                    <button key={idx} onClick={() => handleAnswer(idx)} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition"
                                                        style={{ background: bg, border: `1px solid ${border}`, color: textCol, opacity: op, cursor: answered ? 'default' : 'pointer' }}>
                                                        <div className="flex items-center gap-2">
                                                            {answered !== null && idx === quizData[currentQ].correct && <CheckCircle size={16} className="text-green-400 flex-shrink-0" />}
                                                            {answered !== null && idx === answered && idx !== quizData[currentQ].correct && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                                                            <span>{opt}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {answered !== null && (
                                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                                className={`mt-3 text-center font-bold text-xs ${answered === quizData[currentQ].correct ? 'text-green-400' : 'text-red-400'}`}>
                                                {answered === quizData[currentQ].correct ? '✅ Chính xác!' : '❌ Sai rồi!'}
                                            </motion.div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VirtualExperiment;
