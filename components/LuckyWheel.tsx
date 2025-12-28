import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, RotateCcw, Volume2, VolumeX, Edit3, Maximize2 } from 'lucide-react';

// ===== CONSTANTS =====
const STUDENT_LIST_DEFAULT = [
    "Học sinh 1", "Học sinh 2", "Học sinh 3", "Học sinh 4", "Học sinh 5",
    "Học sinh 6", "Học sinh 7", "Học sinh 8", "Học sinh 9", "Học sinh 10",
    "Học sinh 11", "Học sinh 12", "Học sinh 13", "Học sinh 14", "Học sinh 15"
];

const WHEEL_COLORS = [
    "#FF6B6B", "#FF8E72", "#FFA07A", "#FFB6C1",
    "#FF69B4", "#FF1493", "#DB7093", "#C71585",
    "#FF7F50", "#FF6347", "#FF4500", "#E9967A",
    "#F08080", "#CD5C5C", "#DC143C", "#B22222"
];

const SOUND_URLS = {
    bgm: "https://s2.file2s.com/amthanhhieuung/NenGamenhenhang.mp3",
    spin: "https://s2.file2s.com/amthanhhieuung/Am%20thanh-%20chiecnonkydieu.wav",
    win: "https://s2.file2s.com/amthanhhieuung/Am_thanh_chucmungchienthang.mp3"
};

// ===== GEOMETRY UTILS =====
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        "L", x, y,
        "L", start.x, start.y,
        "Z"
    ].join(" ");
};

// ===== WHEEL COMPONENT =====
const Wheel: React.FC<{ students: string[]; rotation: number; isSpinning: boolean }> = ({ students, rotation, isSpinning }) => {
    const numStudents = students.length;
    if (numStudents === 0) return <div className="w-[300px] h-[300px] flex items-center justify-center text-gray-500">Không có học sinh</div>;

    const anglePerSlice = 360 / numStudents;
    const radius = 242;
    const center = 250;

    return (
        <div className="relative w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] md:w-[450px] md:h-[450px] flex items-center justify-center">
            <div
                className="absolute w-full h-full rounded-full shadow-[0_25px_60px_rgba(255,182,193,0.5)] border-[8px] border-white"
                style={{
                    transition: isSpinning ? 'transform 10s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.5s ease-out',
                    transform: `rotate(${rotation}deg)`,
                }}
            >
                <svg viewBox="0 0 500 500" className="w-full h-full overflow-visible">
                    <defs>
                        <filter id="wheelShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
                        </filter>
                    </defs>
                    <g filter="url(#wheelShadow)">
                        {students.map((student, i) => {
                            const startAngle = i * anglePerSlice;
                            const endAngle = (i + 1) * anglePerSlice;
                            const textAngle = startAngle + anglePerSlice / 2;
                            const textPosition = polarToCartesian(center, center, radius * 0.65, textAngle);

                            let baseFontSize = 16;
                            if (numStudents > 40) baseFontSize = 7.5;
                            else if (numStudents > 30) baseFontSize = 9;
                            else if (numStudents > 20) baseFontSize = 11;
                            else if (numStudents > 12) baseFontSize = 13;

                            return (
                                <g key={`${student}-${i}`}>
                                    <path
                                        d={describeArc(center, center, radius, startAngle, endAngle)}
                                        fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                                        stroke="#fff"
                                        strokeWidth="2"
                                    />
                                    <text
                                        x={textPosition.x}
                                        y={textPosition.y}
                                        dy=".35em"
                                        textAnchor="middle"
                                        fill="#FFF"
                                        fontSize={baseFontSize}
                                        fontWeight="900"
                                        transform={`rotate(${textAngle + 90}, ${textPosition.x}, ${textPosition.y})`}
                                        className="select-none uppercase"
                                        style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.3)' }}
                                    >
                                        {student.length > 15 ? student.substring(0, 14) + '..' : student}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                    <circle cx={center} cy={center} r="25" fill="#fff" />
                    <circle cx={center} cy={center} r="15" fill="#FF6B6B" />
                    <circle cx={center} cy={center} r="5" fill="#FFF" opacity="0.9" />
                </svg>
            </div>

            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
                <svg width="50" height="60" viewBox="0 0 100 120">
                    <path d="M50 120 L100 40 L50 0 L0 40 Z" fill="#FFD700" stroke="#FFF" strokeWidth="4" />
                    <circle cx="50" cy="40" r="12" fill="#FFF" />
                </svg>
            </div>
        </div>
    );
};

// ===== CONFETTI COMPONENT =====
const Confetti: React.FC = () => {
    const colors = ['#FF9AA2', '#FFB7B2', '#FFD1DC', '#E0BBE4', '#B5EAD7', '#FFF'];
    return (
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-50">
            {[...Array(80)].map((_, i) => {
                const style: React.CSSProperties = {
                    position: 'absolute',
                    width: `${Math.random() * 10 + 5}px`,
                    height: `${Math.random() * 10 + 5}px`,
                    backgroundColor: colors[i % colors.length],
                    top: `-20px`,
                    left: `${Math.random() * 100}%`,
                    opacity: 0.9,
                    borderRadius: '2px',
                    transform: `rotate(${Math.random() * 360}deg)`,
                    animation: `fall ${Math.random() * 3 + 4}s linear forwards`,
                    animationDelay: `${Math.random() * 2}s`
                };
                return <div key={i} style={style} />;
            })}
        </div>
    );
};

// ===== WINNER MODAL =====
const WinnerModal: React.FC<{ isOpen: boolean; winnerName: string | null; onContinue: () => void }> = ({ isOpen, winnerName, onContinue }) => {
    if (!isOpen || !winnerName) return null;
    return (
        <div className="fixed inset-0 bg-white/40 flex flex-col items-center justify-center z-50 backdrop-blur-md">
            <div className="text-center p-8 rounded-3xl border border-white/40 shadow-lg bg-white/30">
                <p className="text-3xl md:text-5xl font-bold text-pink-600 mb-6">🎉 CHÚC MỪNG 🎉</p>
                <h2 className="text-4xl md:text-6xl font-black my-6 text-pink-500" style={{ textShadow: '3px 3px 0px #FFF' }}>
                    {winnerName}
                </h2>
            </div>
            <button
                onClick={onContinue}
                className="mt-6 px-10 py-4 text-xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-lg hover:scale-105 transition-transform border-4 border-white"
            >
                Tiếp Tục
            </button>
        </div>
    );
};

// ===== EDIT MODAL =====
const EditModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (text: string) => void; currentStudents: string[] }> = ({
    isOpen, onClose, onSave, currentStudents
}) => {
    const [editText, setEditText] = useState("");

    useEffect(() => {
        if (isOpen) setEditText(currentStudents.join('\n'));
    }, [isOpen, currentStudents]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-br from-pink-100 to-white p-6 rounded-3xl shadow-2xl w-full max-w-md border-4 border-pink-200">
                <h2 className="text-2xl font-bold text-pink-500 text-center mb-4">Chỉnh Sửa Danh Sách</h2>
                <p className="text-center text-pink-400 mb-4 text-sm">Nhập tên mỗi học sinh trên một dòng.</p>
                <textarea
                    className="w-full h-64 p-4 rounded-xl bg-pink-50 text-pink-800 border-2 border-pink-200 focus:border-pink-400 outline-none resize-none"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Nguyễn Văn A&#10;Trần Thị B&#10;..."
                />
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-400 text-white rounded-full font-bold">Hủy</button>
                    <button onClick={() => onSave(editText)} className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-bold">Lưu</button>
                </div>
            </div>
        </div>
    );
};

// ===== CSS KEYFRAMES =====
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fall {
    to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
`;
if (!document.head.querySelector('[data-lucky-wheel-styles]')) {
    styleSheet.setAttribute('data-lucky-wheel-styles', 'true');
    document.head.appendChild(styleSheet);
}

// ===== MAIN COMPONENT =====
interface LuckyWheelProps {
    onBack: () => void;
}

const LuckyWheel: React.FC<LuckyWheelProps> = ({ onBack }) => {
    const [masterStudentList, setMasterStudentList] = useState<string[]>(STUDENT_LIST_DEFAULT);
    const [availableStudents, setAvailableStudents] = useState<string[]>(STUDENT_LIST_DEFAULT);
    const [winners, setWinners] = useState<string[]>([]);

    const [isSpinning, setIsSpinning] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const [showConfetti, setShowConfetti] = useState(false);
    const [showWinnerModal, setShowWinnerModal] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const spinAudioRef = useRef<HTMLAudioElement | null>(null);
    const winnerAudioRef = useRef<HTMLAudioElement | null>(null);
    const bgmAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        spinAudioRef.current = new Audio(SOUND_URLS.spin);
        winnerAudioRef.current = new Audio(SOUND_URLS.win);
        bgmAudioRef.current = new Audio(SOUND_URLS.bgm);

        if (bgmAudioRef.current) {
            bgmAudioRef.current.loop = true;
            bgmAudioRef.current.volume = 0.2;
        }
        return () => {
            spinAudioRef.current?.pause();
            winnerAudioRef.current?.pause();
            bgmAudioRef.current?.pause();
        };
    }, []);

    const playBgm = useCallback(() => {
        if (bgmAudioRef.current && !isMuted && bgmAudioRef.current.paused) {
            bgmAudioRef.current.play().catch(() => { });
        }
    }, [isMuted]);

    const handleSpinClick = () => {
        if (isSpinning || availableStudents.length === 0) return;

        playBgm();
        setIsSpinning(true);
        setShowWinnerModal(false);
        setShowConfetti(false);

        if (spinAudioRef.current && !isMuted) {
            spinAudioRef.current.currentTime = 0;
            spinAudioRef.current.play().catch(() => { });
        }

        const winnerIndex = Math.floor(Math.random() * availableStudents.length);
        const winner = availableStudents[winnerIndex];
        const degreesPerSlice = 360 / availableStudents.length;

        const sliceCenter = (winnerIndex * degreesPerSlice) + (degreesPerSlice / 2);
        const offset = 360 - sliceCenter;
        const spins = 360 * 8;
        const nextRotation = rotation + spins + (offset - (rotation % 360));

        setRotation(nextRotation);

        setTimeout(() => {
            setIsSpinning(false);
            setGameStarted(true);
            setSelectedStudent(winner);
            setShowWinnerModal(true);
            setShowConfetti(true);

            if (spinAudioRef.current) spinAudioRef.current.pause();
            if (winnerAudioRef.current && !isMuted) {
                winnerAudioRef.current.currentTime = 0;
                winnerAudioRef.current.play().catch(() => { });
            }
        }, 10000);
    };

    const handleContinueAfterWin = () => {
        if (!selectedStudent) return;
        setShowWinnerModal(false);
        setWinners(prev => [selectedStudent, ...prev]);
        setAvailableStudents(prev => prev.filter(s => s !== selectedStudent));
        setSelectedStudent(null);
        setShowConfetti(false);
    };

    const handleResetClick = () => {
        setAvailableStudents(masterStudentList);
        setWinners([]);
        setIsSpinning(false);
        setGameStarted(false);
        setSelectedStudent(null);
        setShowConfetti(false);
        setShowWinnerModal(false);
        setRotation(0);
    };

    const handleSaveList = (newListText: string) => {
        const names = newListText.split('\n').map(name => name.trim()).filter(name => name !== "");
        if (names.length === 0) {
            alert("Danh sách không được để trống!");
            return;
        }
        setMasterStudentList(names);
        setAvailableStudents(names);
        handleResetClick();
        setIsEditModalOpen(false);
    };

    const toggleMute = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        if (bgmAudioRef.current) bgmAudioRef.current.muted = newMutedState;
        if (spinAudioRef.current) spinAudioRef.current.muted = newMutedState;
        if (winnerAudioRef.current) winnerAudioRef.current.muted = newMutedState;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-400 via-pink-500 to-pink-600 text-slate-900 flex flex-col items-center p-4 overflow-x-hidden relative">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden z-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white rounded-full blur-[100px] mix-blend-overlay animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-200 rounded-full blur-[100px] mix-blend-overlay animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {showConfetti && <Confetti />}
            <WinnerModal isOpen={showWinnerModal} winnerName={selectedStudent} onContinue={handleContinueAfterWin} />
            <EditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveList} currentStudents={masterStudentList} />

            {/* Header */}
            <div className="w-full flex items-center justify-between z-20 mb-4">
                <button onClick={onBack} className="p-3 bg-white/80 hover:bg-white rounded-full shadow-lg transition-colors">
                    <ArrowLeft size={24} className="text-pink-600" />
                </button>
                <h1 className="text-2xl md:text-4xl font-black text-white text-center flex-1" style={{ textShadow: '2px 2px 0 #be185d' }}>
                    🎡 VÒNG QUAY MAY MẮN
                </h1>
                <div className="flex gap-2">
                    <button onClick={() => setIsEditModalOpen(true)} className="p-3 bg-white/80 hover:bg-white rounded-full shadow-lg" title="Chỉnh sửa">
                        <Edit3 size={20} className="text-pink-600" />
                    </button>
                    <button onClick={toggleMute} className="p-3 bg-white/80 hover:bg-white rounded-full shadow-lg" title={isMuted ? "Bật âm" : "Tắt âm"}>
                        {isMuted ? <VolumeX size={20} className="text-gray-600" /> : <Volume2 size={20} className="text-pink-600" />}
                    </button>
                    <button onClick={toggleFullscreen} className="p-3 bg-white/80 hover:bg-white rounded-full shadow-lg" title="Toàn màn hình">
                        <Maximize2 size={20} className="text-pink-600" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex flex-col lg:flex-row items-start justify-center gap-4 w-full max-w-6xl z-10 flex-grow">
                {/* Winners List */}
                <div className="w-full lg:w-1/4 order-2 lg:order-1 flex flex-col max-h-[300px] lg:max-h-[500px]">
                    <div className="bg-white/80 p-3 rounded-t-xl shadow-lg border-b-4 border-pink-400 text-center">
                        <h2 className="text-lg font-bold text-pink-800">🏆 Đã Quay ({winners.length})</h2>
                    </div>
                    <div className="bg-white/60 p-3 rounded-b-xl shadow-lg flex-grow overflow-y-auto">
                        {winners.length === 0 ? (
                            <div className="h-full flex items-center justify-center italic text-pink-900/50 font-bold">Chưa có ai</div>
                        ) : (
                            <ul className="space-y-2">
                                {winners.map((winner, index) => (
                                    <li key={index} className="bg-white p-2 rounded-lg text-pink-900 font-bold border-l-4 border-pink-500 shadow-sm flex items-center gap-2 text-sm">
                                        <span className="bg-pink-100 text-pink-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">{winners.length - index}</span>
                                        {winner}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Wheel */}
                <div className="w-full lg:w-1/2 order-1 lg:order-2 flex flex-col items-center pt-2">
                    <div className="p-3 bg-white/40 rounded-full backdrop-blur-md border-[6px] border-white/80 shadow-2xl mb-4">
                        <Wheel students={availableStudents} rotation={rotation} isSpinning={isSpinning} />
                    </div>

                    <div className="flex gap-4 z-10">
                        {availableStudents.length > 0 ? (
                            <button
                                onClick={handleSpinClick}
                                disabled={isSpinning}
                                className="flex items-center gap-2 text-xl font-black bg-gradient-to-b from-yellow-300 to-yellow-500 text-red-700 py-3 px-8 rounded-full shadow-lg hover:-translate-y-1 active:translate-y-1 transition-all disabled:opacity-50 border-4 border-white"
                            >
                                <Play size={28} fill="currentColor" /> {isSpinning ? 'ĐANG QUAY...' : 'QUAY'}
                            </button>
                        ) : (
                            <button
                                onClick={handleResetClick}
                                className="flex items-center gap-2 text-xl font-black bg-gradient-to-b from-red-400 to-red-600 text-white py-3 px-8 rounded-full shadow-lg active:translate-y-1 transition-all border-4 border-white"
                            >
                                <RotateCcw size={24} /> CHƠI LẠI
                            </button>
                        )}
                    </div>

                    {availableStudents.length === 0 && winners.length > 0 && (
                        <div className="mt-4 px-6 py-2 bg-white/90 rounded-full shadow-lg animate-bounce">
                            <p className="text-lg font-bold text-pink-700">🎉 Đã hoàn thành! 🎉</p>
                        </div>
                    )}
                </div>

                {/* Available List */}
                <div className="w-full lg:w-1/4 order-3 flex flex-col max-h-[300px] lg:max-h-[500px]">
                    <div className="bg-white/80 p-3 rounded-t-xl shadow-lg border-b-4 border-blue-400 text-center">
                        <h2 className="text-lg font-bold text-blue-800">📋 Chưa Quay ({availableStudents.length})</h2>
                    </div>
                    <div className="bg-white/60 p-3 rounded-b-xl shadow-lg flex-grow overflow-y-auto">
                        {availableStudents.length === 0 ? (
                            <div className="h-full flex items-center justify-center italic text-blue-900/50 font-bold">Đã quay hết!</div>
                        ) : (
                            <ul className="grid grid-cols-1 gap-1">
                                {availableStudents.map((student, index) => (
                                    <li key={index} className="bg-white/80 hover:bg-white p-2 rounded-full text-center text-xs font-bold text-slate-800 border border-white shadow-sm transition-transform hover:scale-105">
                                        {student}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LuckyWheel;
