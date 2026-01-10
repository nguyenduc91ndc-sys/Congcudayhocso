import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Maximize, Minimize } from "lucide-react";

// ======= VÒNG TRÒN GỌI TÊN – 30 HỌC SINH (BẢN NÂNG CẤP) =======

const SLOT_COUNT_DEFAULT = 30;
const STORAGE_KEY = 'vong_tron_goi_ten_data'; // Key mới cho ứng dụng này

// Danh sách thử thách và lời khen ngẫu nhiên
const CHALLENGES = [
    "Hãy hát một bài hát yêu thích! 🎤",
    "Kể một câu chuyện cười cho cả lớp nghe! 😄",
    "Làm 10 cái nhảy tại chỗ! 🤸",
    "Nói tên 5 con vật trong 10 giây! 🐾",
    "Vẽ một bức tranh trong 30 giây! 🎨",
    "Hát một đoạn nhạc bất kỳ! 🎵",
    "Đọc một bài thơ cho cả lớp! 📚",
    "Bắt chước tiếng một con vật! 🐶",
    "Nhảy một điệu nhảy vui! 💃",
    "Kể một kỷ niệm vui ở trường! 🌟",
    "Nói 3 điều em yêu thích về lớp mình! ❤️",
    "Tạo một bộ mặt vui nhộn! 🤪",
];

const COMPLIMENTS = [
    "Em thật xuất sắc! Tiếp tục phát huy nhé! ⭐",
    "Cô rất tự hào về em! 🌟",
    "Em là ngôi sao sáng của lớp! 🌟",
    "Em có nụ cười tỏa nắng! ☀️",
    "Em thật chăm chỉ và đáng yêu! 💪",
    "Em luôn cố gắng hết mình! 🌟",
    "Em có tư duy rất sáng tạo! 💡",
    "Em là tấm gương tốt cho các bạn! 🌈",
    "Tiếp tục tỏa sáng em nhé! ✨",
    "Em thật tuyệt vời! 🎉",
];

// ======= TIỆN ÍCH =======
function useObjectUrlsCleaner(urls: string[]) {
    useEffect(() => {
        return () => {
            urls.forEach((u) => {
                try { URL.revokeObjectURL(u); } catch { }
            });
        };
    }, [urls]);
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleRad: number) {
    return { x: centerX + radius * Math.cos(angleRad), y: centerY + radius * Math.sin(angleRad) };
}

// ======= PHÁO HOA (Canvas) =======
function Fireworks({ run, onDone }: { run: boolean; onDone?: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const particlesRef = useRef<any[]>([]);
    const startedRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let running = false;
        const gravity = 0.05;

        function spawnBurst(x: number, y: number) {
            const count = 80 + Math.floor(Math.random() * 40);
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
                const speed = 2 + Math.random() * 3.2;
                particlesRef.current.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 60 + Math.random() * 40,
                    age: 0,
                    size: 2 + Math.random() * 2,
                    hue: Math.floor(Math.random() * 360),
                });
            }
        }

        function loop() {
            if (!running) return;
            const { width, height } = canvas;

            // Clear canvas với transparent thay vì đen
            ctx.clearRect(0, 0, width, height);

            if (Math.random() < 0.04) {
                const x = 60 + Math.random() * (width - 120);
                const y = 60 + Math.random() * (height / 2);
                spawnBurst(x, y);
            }

            particlesRef.current.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += gravity * 0.2;
                p.age++;
            });
            particlesRef.current = particlesRef.current.filter((p) => p.age < p.life);

            particlesRef.current.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${p.hue}, 90%, 60%)`;
                ctx.fill();
            });

            if (performance.now() - startedRef.current > 3200) {
                running = false;
                onDone && onDone();
                return;
            }

            rafRef.current = requestAnimationFrame(loop);
        }

        if (run) {
            running = true;
            startedRef.current = performance.now();
            particlesRef.current = [];

            // Clear canvas trước khi bắt đầu
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            spawnBurst(canvas.width / 2, canvas.height / 2);

            rafRef.current = requestAnimationFrame(loop);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [run, onDone]);

    return (
        <canvas
            ref={canvasRef}
            width={720}
            height={420}
            className="absolute inset-0 w-full h-full"
        />
    );
}

// ======= ÂM THANH (WebAudio) =======
function useSound(enabled: boolean) {
    const ctxRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        return () => {
            try { ctxRef.current?.close(); } catch { }
        };
    }, []);

    function ensureCtx() {
        if (!enabled) return null;
        if (!ctxRef.current) {
            const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!Ctx) return null;
            ctxRef.current = new Ctx();
        }
        return ctxRef.current;
    }

    const tick = (freq = 660, durationMs = 40) => {
        const ctx = ensureCtx();
        if (!ctx) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = freq;
        g.gain.value = 0.0001;
        o.connect(g); g.connect(ctx.destination);
        const now = ctx.currentTime;

        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
        o.start();
        o.stop(now + durationMs / 1000 + 0.02);
    };

    const celebrate = () => {
        const ctx = ensureCtx();
        if (!ctx) return;
        const notes = [523.25, 659.25, 783.99];
        const now = ctx.currentTime;
        notes.forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "sine";
            o.frequency.value = f;
            g.gain.value = 0.0001;
            o.connect(g); g.connect(ctx.destination);
            const t0 = now + i * 0.08;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
            o.start(t0);
            o.stop(t0 + 1.05);
        });
    };

    return { tick, celebrate };
}

// ======= MODAL NHẬP TÊN HÀNG LOẠT =======
function BulkNameInputModal({
    students,
    onClose,
    onSave,
    slotCount
}: {
    students: { id: number; name: string }[];
    onClose: () => void;
    onSave: (rawText: string) => void;
    slotCount: number;
}) {
    const initialText = useMemo(() => students.map(s => s.name).join('\n'), [students]);
    const [rawText, setRawText] = useState(initialText);

    const nameCount = useMemo(() => {
        return rawText.split('\n')
            .map(line => line.trim())
            .filter(name => name.length > 0)
            .length;
    }, [rawText]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: "blur(4px)" }}>
            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 w-[min(92vw,500px)] border border-teal-100 ring-4 ring-teal-50">
                <h2 className="text-xl font-bold mb-3 text-teal-700">Nhập Danh Sách Tên Học Sinh</h2>
                <p className="text-sm text-slate-600 mb-4">
                    Vui lòng nhập tên học sinh, mỗi tên trên một dòng. Tối đa {slotCount} tên.
                </p>

                <textarea
                    className="w-full h-64 p-3 border border-slate-200 rounded-xl resize-none focus:border-teal-500 focus:ring focus:ring-teal-200 focus:ring-opacity-50 font-mono text-sm shadow-inner"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Ví dụ:\nNguyễn Văn A\nTrần Thị B\nLê Hoàng C"
                />

                <div className="flex justify-between items-center mt-4">
                    <p className={`text-sm font-medium ${nameCount > slotCount ? 'text-rose-600' : 'text-slate-600'}`}>
                        Đã nhập: <span className="font-bold">{nameCount}</span> / {slotCount} tên
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm text-slate-600 font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => onSave(rawText)}
                            disabled={nameCount === 0 || nameCount > slotCount}
                            className={`px-4 py-2 rounded-full text-white font-bold shadow-md transition-all ${nameCount === 0 || nameCount > slotCount
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-lg hover:scale-105'
                                }`}
                        >
                            Lưu Danh Sách
                        </button>
                    </div>
                </div>

                <button
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white hover:bg-slate-100 border shadow transition-colors text-xl font-bold text-slate-600 flex items-center justify-center"
                    onClick={onClose}
                    title="Đóng"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

// ======= SLOT COMPONENT =======
function Slot({
    index,
    name,
    img,
    left,
    top,
    size,
    active,
    selected,
    onPickImage,
    onClearImage,
    onRename,
}: {
    index: number;
    name: string;
    img?: string;
    left: number;
    top: number;
    size: number;
    active: boolean;
    selected: boolean;
    onPickImage: (file: File) => void;
    onClearImage: () => void;
    onRename: (name: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [editing, setEditing] = useState(false);
    const [tempName, setTempName] = useState(name);

    useEffect(() => setTempName(name), [name]);

    const handleOpenFile = () => inputRef.current?.click();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) onPickImage(f);
        e.target.value = '';
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.remove("border-dashed", "border-teal-400", "scale-105");
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            onPickImage(file);
        }
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add("border-dashed", "border-teal-400", "scale-105");
    };

    const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove("border-dashed", "border-teal-400", "scale-105");
    };

    const ringClass = selected
        ? "ring-4 ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] scale-110 z-20"
        : active
            ? "ring-4 ring-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.5)] scale-105 z-10"
            : "ring-2 ring-white shadow-md hover:ring-teal-300 hover:shadow-lg";

    return (
        <div
            className={`absolute flex flex-col items-center transition-all duration-200 ${selected ? "z-30" : "z-10"}`}
            style={{ left, top, width: size, height: size + 30 }}
        >
            <div
                className={`relative rounded-full overflow-hidden bg-white transition-all duration-200 ${ringClass}`}
                style={{ width: size, height: size }}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                {img ? (
                    <>
                        <img src={img} alt={name} className="w-full h-full object-cover" />
                        <button
                            onClick={onClearImage}
                            title="Xoá ảnh"
                            className="absolute top-0 right-0 w-1/3 h-1/3 min-w-[16px] min-h-[16px] rounded-full bg-rose-500 text-white text-[10px] md:text-xs shadow-md hover:bg-rose-600 transition-colors font-bold flex items-center justify-center opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleOpenFile}
                        className="w-full h-full flex items-center justify-center text-xl md:text-2xl text-slate-300 hover:text-teal-500 hover:bg-teal-50 transition-colors"
                        title="Thêm ảnh"
                    >
                        +
                    </button>
                )}
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="mt-1 w-[140%] text-center px-1">
                {editing ? (
                    <input
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={() => {
                            setEditing(false);
                            onRename(tempName.trim() || name);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        className="w-full text-[10px] px-1 py-0.5 border border-teal-200 rounded-md text-center shadow-inner focus:ring-1 focus:ring-teal-400 outline-none"
                        autoFocus
                    />
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        className={`mx-auto px-2 py-0.5 rounded-md text-[10px] md:text-[11px] font-bold max-w-full truncate shadow-sm transition-all border block ${selected
                            ? "bg-rose-500 text-white border-rose-600 shadow-rose-200 transform scale-110"
                            : active
                                ? "bg-orange-100 text-orange-700 border-orange-200"
                                : "bg-white/90 backdrop-blur text-slate-600 border-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200"
                            }`}
                        title="Nhấn để đổi tên"
                    >
                        {name}
                    </button>
                )}
            </div>
        </div>
    );
}

// ======= ỨNG DỤNG CHÍNH =======
interface VongQuayProps {
    onBack: () => void;
}

export default function VongQuay({ onBack }: VongQuayProps) {
    // Helper function to load saved data
    const loadSavedData = () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error("Error loading localStorage", e);
        }
        return null;
    };

    const [slotCount, setSlotCount] = useState<number>(() => {
        const saved = loadSavedData();
        return saved?.slotCount ?? SLOT_COUNT_DEFAULT;
    });

    const [students, setStudents] = useState<{ id: number; name: string; img?: string }[]>(
        () => {
            const saved = loadSavedData();
            if (saved?.students && Array.isArray(saved.students) && saved.students.length > 0) {
                return saved.students;
            }
            return Array.from({ length: SLOT_COUNT_DEFAULT }, (_, i) => ({ id: i, name: `HS ${i + 1}` }));
        }
    );
    const [highlight, setHighlight] = useState<number | null>(null);
    const [selected, setSelected] = useState<number | null>(null);
    const [spinning, setSpinning] = useState(false);
    const [speedMs, setSpeedMs] = useState<number>(80);
    const [soundOn, setSoundOn] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);
    const [showNameInputModal, setShowNameInputModal] = useState(false);
    const [randomSuggestion, setRandomSuggestion] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Fullscreen logic
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const { tick, celebrate } = useSound(soundOn);

    const spinTimerRef = useRef<number | null>(null);
    const objectUrls = useMemo(() => students.map((s) => s.img).filter(Boolean) as string[], [students]);
    useObjectUrlsCleaner(objectUrls);

    // Auto-save to LocalStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                slotCount,
                students
            }));
        } catch (e) {
            console.error("Error saving localStorage", e);
        }
    }, [slotCount, students]);

    const containerRef = useRef<HTMLDivElement | null>(null);

    const handleStart = () => {
        if (spinning) return;
        setSelected(null);
        setShowModal(false);
        setRandomSuggestion(null);
        setShowFireworks(false);
        setSpinning(true);
        setHighlight((h) => (h == null ? 0 : h));

        const totalDuration = 3500 + Math.random() * 3000;
        const startTime = performance.now();

        const tickStep = () => {
            setHighlight((h) => {
                const next = (h == null ? 0 : (h + 1) % slotCount);
                tick(720, 30);
                return next;
            });
        };

        if (spinTimerRef.current) clearInterval(spinTimerRef.current);
        spinTimerRef.current = window.setInterval(tickStep, Math.max(20, speedMs));

        const stopAt = () => {
            if (spinTimerRef.current) { clearInterval(spinTimerRef.current); spinTimerRef.current = null; }

            setHighlight((h) => {
                const extraSteps = Math.floor(Math.random() * (slotCount * 1.2));
                const finalIdx = ((h ?? 0) + extraSteps) % slotCount;

                setSelected(finalIdx);
                setSpinning(false);

                setTimeout(() => {
                    celebrate();
                    setShowModal(true);
                    setShowFireworks(true);
                }, 120);
                return finalIdx;
            });
        };

        const raf = () => {
            const now = performance.now();
            if (now - startTime >= totalDuration) {
                stopAt();
            } else {
                requestAnimationFrame(raf);
            }
        };
        requestAnimationFrame(raf);
    };

    const handleResetAll = () => {
        if (confirm("Bạn có chắc muốn xóa tất cả dữ liệu (ảnh, tên) và đặt lại về mặc định không?")) {
            localStorage.removeItem(STORAGE_KEY);
            setSlotCount(SLOT_COUNT_DEFAULT);
            setStudents(Array.from({ length: SLOT_COUNT_DEFAULT }, (_, i) => ({ id: i, name: `HS ${i + 1}` })));
            setSelected(null);
            setHighlight(null);
            setShowModal(false);
            setShowFireworks(false);
        }
    };

    // Helper: Convert File to Base64 with Resizing
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 400; // Tăng lên để ảnh nét hơn
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    // Tăng chất lượng lên 0.8 (vẫn an toàn cho localStorage)
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleBulkUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const newImages: string[] = [];
        for (const file of Array.from(files)) {
            try {
                const base64 = await fileToBase64(file);
                newImages.push(base64);
            } catch (e) {
                console.error("Error converting file", file.name, e);
            }
        }

        setStudents((prev) => {
            const next = [...prev];
            let imgIdx = 0;
            for (let i = 0; i < next.length && imgIdx < newImages.length; i++) {
                if (!next[i].img) {
                    next[i] = { ...next[i], img: newImages[imgIdx] };
                    imgIdx++;
                }
            }
            return next;
        });
    };

    const updateSlotCount = (val: number) => {
        const newCount = Math.max(2, Math.min(100, val));
        setSlotCount(newCount);

        setStudents((prev) => {
            if (newCount > prev.length) {
                const added = Array.from({ length: newCount - prev.length }, (_, i) => ({
                    id: prev.length + i + Math.random(),
                    name: `HS ${prev.length + i + 1}`,
                }));
                return [...prev, ...added];
            } else {
                return prev.slice(0, newCount);
            }
        });
    };

    const handleBulkNameUpdate = (rawText: string) => {
        const newNames = rawText
            .split('\n')
            .map(line => line.trim())
            .filter(name => name.length > 0)
            .slice(0, slotCount);

        setStudents(prev => {
            const next = [...prev];

            newNames.forEach((name, i) => {
                if (i < next.length) {
                    next[i] = { ...next[i], name };
                }
            });

            for (let i = newNames.length; i < next.length; i++) {
                if (!next[i]) {
                    next[i] = { id: i, name: `HS ${i + 1}` };
                }
            }

            return next;
        });

        setShowNameInputModal(false);
    };

    const setSlotImage = async (i: number, file: File) => {
        try {
            const base64 = await fileToBase64(file);
            setStudents((prev) => prev.map((s, idx) => (idx === i ? { ...s, img: base64 } : s)));
        } catch (e) {
            console.error("Error setting slot image", e);
        }
    };

    const clearSlotImage = (i: number) => {
        setStudents((prev) => prev.map((s, idx) => (idx === i ? { ...s, img: undefined } : s)));
    };

    const setSlotName = (i: number, name: string) => {
        setStudents((prev) => prev.map((s, idx) => (idx === i ? { ...s, name } : s)));
    };

    const radiusPercent = 38;
    const slotSizePx = useMemo(() => Math.max(32, Math.min(64, 2200 / slotCount)), [slotCount]);

    const positions = useMemo(() => {
        const count = slotCount;
        const arr: { left: number; top: number; angle: number }[] = [];

        const width = containerRef.current?.clientWidth ?? 600;
        const height = containerRef.current?.clientHeight ?? 600;

        const side = Math.min(width, height);

        const cx = width / 2;
        const cy = height / 2;

        const r = (radiusPercent / 100) * side;

        for (let i = 0; i < count; i++) {
            const angle = (2 * Math.PI * i) / count - Math.PI / 2;
            const { x, y } = polarToCartesian(cx, cy, r, angle);
            arr.push({ left: x - slotSizePx / 2, top: y - slotSizePx / 2, angle });
        }
        return arr;
    }, [slotCount, radiusPercent, slotSizePx, containerRef.current?.clientWidth, containerRef.current?.clientHeight]);

    const [, setForceUpdate] = useState(0);
    useEffect(() => {
        const handleResize = () => setForceUpdate(n => n + 1);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="w-full h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-teal-50 text-slate-800 font-sans relative overflow-hidden">
            {/* Hình nền */}
            <div
                className="absolute inset-0 z-0 opacity-40 mix-blend-multiply pointer-events-none"
                style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}
            ></div>

            {/* Blobs trang trí */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none"></div>
            <div className="absolute -bottom-32 left-20 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 pointer-events-none"></div>

            {/* Main Container */}
            <div className="relative z-10 flex flex-col h-full w-full max-w-6xl mx-auto p-2 md:p-4">

                {/* Header */}
                <header className="shrink-0 flex items-center justify-between gap-4 mb-2">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
                        title="Quay lại"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>

                    <div className="text-center flex-1">
                        <h1 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-rose-600 tracking-wider drop-shadow-sm">
                            VÒNG TRÒN GỌI TÊN
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 font-medium mt-1 hidden md:block">
                            Kéo thả ảnh hoặc nhấn <span className="font-bold text-rose-500">+</span>. Nhấn <span className="font-bold text-orange-500">Bắt đầu</span> để quay.
                        </p>
                    </div>

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors text-slate-600 hover:text-teal-600"
                        title={isFullscreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}
                    >
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                </header>

                {/* Thanh điều khiển */}
                <div className="shrink-0 flex flex-wrap items-center justify-center gap-2 md:gap-4 mb-2 p-2 bg-white/70 backdrop-blur-md rounded-xl shadow-lg border border-white/50 ring-1 ring-slate-100 max-h-[120px] overflow-y-auto">
                    <button
                        onClick={handleStart}
                        disabled={spinning}
                        className={`px-4 py-2 md:px-6 md:py-2 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 font-bold text-sm md:text-base whitespace-nowrap ${spinning
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-rose-500 to-orange-500 text-white"
                            }`}
                    >
                        {spinning ? "Đang quay..." : "BẮT ĐẦU"}
                    </button>

                    <div className="flex gap-2">
                        <label className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white/80 shadow-sm">
                            <span className="text-xs md:text-sm font-semibold text-slate-600">Số lượng</span>
                            <input
                                type="number"
                                min={2}
                                max={100}
                                value={slotCount}
                                onChange={(e) => updateSlotCount(Number(e.target.value))}
                                className="w-12 border border-slate-300 rounded-md px-1 py-0.5 text-center bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-400 text-teal-700 font-bold text-sm"
                                disabled={spinning}
                            />
                        </label>

                        <label className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-white/80 shadow-sm">
                            <span className="text-xs md:text-sm font-semibold text-slate-600">Tốc độ</span>
                            <input
                                type="number"
                                min={20}
                                max={400}
                                step={10}
                                value={speedMs}
                                onChange={(e) => setSpeedMs(Math.max(20, Math.min(400, Number(e.target.value) || 80)))}
                                className="w-12 border border-slate-300 rounded-md px-1 py-0.5 text-center bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-400 text-teal-700 font-bold text-sm"
                                disabled={spinning}
                            />
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <label className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-teal-100 bg-teal-50/50 hover:bg-teal-100/80 text-teal-700 cursor-pointer transition-colors shadow-sm" title="Tải nhiều ảnh">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleBulkUpload(e.target.files)} />
                            <span className="text-xs md:text-sm font-bold hidden sm:inline">Ảnh</span>
                        </label>

                        <button
                            onClick={() => setShowNameInputModal(true)}
                            className="px-3 py-1.5 rounded-full border border-teal-100 bg-teal-50/50 hover:bg-teal-100/80 text-teal-700 font-bold text-xs md:text-sm transition-colors shadow-sm whitespace-nowrap"
                        >
                            Nhập Tên
                        </button>

                        <button
                            onClick={handleResetAll}
                            className="px-3 py-1.5 rounded-full border border-rose-100 bg-rose-50/50 hover:bg-rose-100/80 text-rose-600 font-bold text-xs md:text-sm transition-colors shadow-sm whitespace-nowrap"
                        >
                            Xoá hết
                        </button>
                    </div>

                    <label className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white/80 shadow-sm cursor-pointer ml-auto hover:bg-slate-50" title="Bật/Tắt âm thanh">
                        {soundOn ? '🔊' : '🔇'}
                        <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} className="hidden" />
                    </label>
                </div>

                {/* Area chứa Vòng tròn */}
                <div className="flex-1 relative flex items-center justify-center min-h-0 w-full overflow-hidden">
                    <div
                        ref={containerRef}
                        className="relative bg-white/80 backdrop-blur-xl rounded-full shadow-2xl border-4 border-white ring-4 ring-teal-50 transition-all duration-300"
                        style={{
                            width: "min(90vmin, 650px)",
                            height: "min(90vmin, 650px)",
                            aspectRatio: "1/1"
                        }}
                    >
                        <div className="absolute inset-[8%] rounded-full border-[3px] border-dashed border-slate-300/50 pointer-events-none" />

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={handleStart}
                                disabled={spinning}
                                className={`w-[20%] h-[20%] min-w-[80px] min-h-[80px] rounded-full text-lg md:text-2xl font-black shadow-2xl transition-all duration-300 transform flex items-center justify-center border-4 md:border-8 border-white/30 backdrop-blur-sm ${spinning
                                    ? "bg-slate-400 text-slate-100 cursor-not-allowed grayscale"
                                    : "bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 text-white hover:scale-110 hover:rotate-3 active:scale-95 shadow-orange-500/40"
                                    }`}
                            >
                                {spinning ? "..." : "QUAY"}
                            </button>
                        </div>

                        {students.slice(0, slotCount).map((s, i) => (
                            <Slot
                                key={s.id}
                                index={i}
                                name={s.name}
                                img={s.img}
                                left={positions[i]?.left ?? 0}
                                top={positions[i]?.top ?? 0}
                                size={slotSizePx}
                                active={highlight === i}
                                selected={selected === i}
                                onPickImage={(file) => setSlotImage(i, file)}
                                onClearImage={() => clearSlotImage(i)}
                                onRename={(name) => setSlotName(i, name)}
                            />
                        ))}

                        {showFireworks && (
                            <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden">
                                <Fireworks run={showFireworks} onDone={() => setShowFireworks(false)} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0 text-[10px] md:text-xs font-medium text-slate-400/80 text-center mt-1 pb-1">
                    Mẹo: Trên điện thoại, hãy xoay ngang màn hình để có trải nghiệm tốt nhất.
                </div>

                {showNameInputModal && (
                    <BulkNameInputModal
                        students={students}
                        onClose={() => setShowNameInputModal(false)}
                        onSave={handleBulkNameUpdate}
                        slotCount={slotCount}
                    />
                )}

                {showModal && selected != null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="relative bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 w-[min(90vw,500px)] border-4 border-rose-200 overflow-hidden">

                            {/* Pháo hoa - ở layer sau cùng */}
                            <div className="absolute inset-0 z-0 pointer-events-none">
                                <Fireworks run={showFireworks} />
                            </div>

                            {/* Nội dung modal - z-index cao */}
                            <div className="relative z-10 flex flex-col items-center">
                                <h2 className="text-center text-3xl md:text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">
                                    🎉 CHÚC MỪNG! 🎉
                                </h2>

                                {/* Ảnh học sinh */}
                                <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-rose-400 shadow-xl mb-4 bg-rose-100">
                                    {students[selected]?.img ? (
                                        <img
                                            src={students[selected].img}
                                            alt={students[selected].name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-6xl">
                                            👤
                                        </div>
                                    )}
                                </div>

                                {/* Tên học sinh */}
                                <div className="text-2xl md:text-3xl font-black text-slate-800 bg-gradient-to-r from-rose-100 to-orange-100 px-6 py-3 rounded-2xl shadow-lg border-2 border-rose-200 text-center">
                                    {students[selected]?.name || `HS ${selected + 1}`}
                                </div>

                                {/* Nút gợi ý thử thách */}
                                <button
                                    onClick={() => {
                                        const allSuggestions = [...CHALLENGES, ...COMPLIMENTS];
                                        const random = allSuggestions[Math.floor(Math.random() * allSuggestions.length)];
                                        setRandomSuggestion(random);
                                    }}
                                    className="mt-4 px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    🎲 Gợi ý Thử thách
                                </button>

                                {/* Hiển thị gợi ý */}
                                {randomSuggestion && (
                                    <div className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-orange-200 rounded-xl text-center max-w-sm">
                                        <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">🎯 Thử thách</p>
                                        <p className="text-lg font-semibold text-slate-700">{randomSuggestion}</p>
                                    </div>
                                )}
                            </div>

                            {/* Nút đóng */}
                            <button
                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-500 font-bold transition-colors z-20 flex items-center justify-center text-lg shadow-md border"
                                onClick={() => setShowModal(false)}
                                title="Đóng"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
