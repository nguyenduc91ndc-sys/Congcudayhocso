import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    CheckCircle2,
    Ear,
    Eye,
    Hand,
    HelpCircle,
    RefreshCcw,
    ShieldCheck,
    Sparkles,
    Trophy,
    Volume2,
    XCircle,
} from 'lucide-react';

interface SensesExplorerSimulationProps {
    onBack: () => void;
}

type SenseId = 'sight' | 'hearing' | 'smell' | 'taste' | 'touch';
type SectionId = 'journey' | 'missions' | 'care' | 'challenge';

interface SenseStation {
    id: SenseId;
    name: string;
    senseName: string;
    organ: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
    scene: string;
    example: string;
    protect: string;
}

const stations: SenseStation[] = [
    {
        id: 'sight',
        name: 'Trạm Ánh sáng',
        senseName: 'Thị giác',
        organ: 'Mắt',
        color: 'text-sky-700',
        bg: 'from-sky-100 to-blue-50',
        icon: <Eye className="h-8 w-8" />,
        scene: 'Nhìn thấy màu sắc, hình dạng, chữ viết và đường đi xung quanh.',
        example: 'Quan sát cầu vồng, đọc biển báo, xem tranh trong sách.',
        protect: 'Đọc nơi đủ sáng, giữ khoảng cách với màn hình, không dụi mắt bằng tay bẩn.',
    },
    {
        id: 'hearing',
        name: 'Trạm Âm thanh',
        senseName: 'Thính giác',
        organ: 'Tai',
        color: 'text-violet-700',
        bg: 'from-violet-100 to-fuchsia-50',
        icon: <Ear className="h-8 w-8" />,
        scene: 'Nghe tiếng nói, tiếng nhạc, tiếng chuông và các âm thanh báo hiệu.',
        example: 'Nghe cô giáo giảng bài, nghe tiếng trống trường, nghe bạn gọi tên.',
        protect: 'Không nghe âm thanh quá lớn, không đưa vật nhọn vào tai, lau tai nhẹ nhàng.',
    },
    {
        id: 'smell',
        name: 'Trạm Hương thơm',
        senseName: 'Khứu giác',
        organ: 'Mũi',
        color: 'text-emerald-700',
        bg: 'from-emerald-100 to-teal-50',
        icon: <span className="text-4xl" aria-hidden="true">🌼</span>,
        scene: 'Nhận ra mùi thơm, mùi lạ, mùi thức ăn hoặc mùi khói cần tránh xa.',
        example: 'Ngửi mùi hoa, nhận ra mùi bánh mới nướng, phát hiện mùi khét.',
        protect: 'Đeo khẩu trang khi bụi, không ngửi hóa chất lạ, giữ mũi sạch.',
    },
    {
        id: 'taste',
        name: 'Trạm Vị ngon',
        senseName: 'Vị giác',
        organ: 'Lưỡi',
        color: 'text-rose-700',
        bg: 'from-rose-100 to-orange-50',
        icon: <span className="text-4xl" aria-hidden="true">🍋</span>,
        scene: 'Cảm nhận vị ngọt, chua, mặn, đắng và cay của thức ăn.',
        example: 'Nếm vị chua của chanh, vị ngọt của mật ong, vị mặn của muối.',
        protect: 'Không ăn thức ăn quá nóng, không nếm đồ lạ, đánh răng và súc miệng đều đặn.',
    },
    {
        id: 'touch',
        name: 'Trạm Chạm nhẹ',
        senseName: 'Xúc giác',
        organ: 'Da',
        color: 'text-amber-700',
        bg: 'from-amber-100 to-yellow-50',
        icon: <Hand className="h-8 w-8" />,
        scene: 'Cảm nhận nóng, lạnh, mềm, cứng, nhẵn hoặc ráp khi tiếp xúc.',
        example: 'Chạm vào khăn mềm, cốc nước mát, viên đá lạnh hoặc bề mặt nhám.',
        protect: 'Rửa tay sạch, tránh chạm vật nóng, che chắn da khi nắng gắt.',
    },
];

const missionItems: Array<{ id: string; label: string; cue: string; sense: SenseId }> = [
    { id: 'm1', label: 'Đọc tên bạn trên bảng', cue: 'Bảng có chữ rõ nét', sense: 'sight' },
    { id: 'm2', label: 'Nghe tiếng trống ra chơi', cue: 'Âm thanh vang lên', sense: 'hearing' },
    { id: 'm3', label: 'Nhận ra mùi cơm mới nấu', cue: 'Mùi thơm từ bếp', sense: 'smell' },
    { id: 'm4', label: 'Nếm miếng cam chua ngọt', cue: 'Vị trên đầu lưỡi', sense: 'taste' },
    { id: 'm5', label: 'Biết ly nước đang lạnh', cue: 'Cảm giác mát ở tay', sense: 'touch' },
    { id: 'm6', label: 'Nhìn đèn giao thông', cue: 'Màu đỏ, vàng, xanh', sense: 'sight' },
    { id: 'm7', label: 'Nghe bạn đọc bài', cue: 'Lời nói của bạn', sense: 'hearing' },
    { id: 'm8', label: 'Chạm vào vải nhung mềm', cue: 'Bề mặt êm và mịn', sense: 'touch' },
];

const careSituations = [
    { text: 'Đọc sách ở nơi đủ ánh sáng.', safe: true },
    { text: 'Nghe tai nghe âm lượng rất lớn trong thời gian dài.', safe: false },
    { text: 'Rửa tay sau khi chơi ngoài sân.', safe: true },
    { text: 'Tự ý ngửi chai hóa chất không có nhãn.', safe: false },
    { text: 'Thổi nguội thức ăn nóng trước khi nếm.', safe: true },
    { text: 'Dùng bút nhọn ngoáy vào tai.', safe: false },
];

const quizQuestions = [
    {
        question: 'Khi muốn nghe tiếng chim hót, em dùng giác quan nào?',
        options: ['Thị giác', 'Thính giác', 'Vị giác'],
        correct: 1,
    },
    {
        question: 'Mũi giúp em nhận biết điều gì?',
        options: ['Mùi hương', 'Màu sắc', 'Âm thanh'],
        correct: 0,
    },
    {
        question: 'Để biết nước đá lạnh, em dùng giác quan nào?',
        options: ['Xúc giác', 'Khứu giác', 'Thính giác'],
        correct: 0,
    },
    {
        question: 'Việc nào giúp bảo vệ mắt?',
        options: ['Đọc sách sát mắt', 'Đọc nơi đủ ánh sáng', 'Dụi mắt bằng tay bẩn'],
        correct: 1,
    },
    {
        question: 'Lưỡi giúp em cảm nhận điều gì?',
        options: ['Vị của thức ăn', 'Mùi của hoa', 'Tiếng chuông'],
        correct: 0,
    },
];

const navItems: Array<{ id: SectionId; label: string; icon: React.ReactNode }> = [
    { id: 'journey', label: 'Tham quan', icon: <Sparkles size={16} /> },
    { id: 'missions', label: 'Nhiệm vụ', icon: <HelpCircle size={16} /> },
    { id: 'care', label: 'Bảo vệ', icon: <ShieldCheck size={16} /> },
    { id: 'challenge', label: 'Thử thách', icon: <Trophy size={16} /> },
];

const SensesExplorerSimulation: React.FC<SensesExplorerSimulationProps> = ({ onBack }) => {
    const [section, setSection] = useState<SectionId>('journey');
    const [activeSense, setActiveSense] = useState<SenseId>('sight');
    const [selectedMission, setSelectedMission] = useState<string | null>(missionItems[0]?.id || null);
    const [missionAnswers, setMissionAnswers] = useState<Record<string, SenseId>>({});
    const [careAnswers, setCareAnswers] = useState<Record<number, boolean>>({});
    const [quizIndex, setQuizIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [vietnameseVoice, setVietnameseVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [speechNotice, setSpeechNotice] = useState('');

    const currentStation = stations.find((station) => station.id === activeSense) || stations[0];
    const selectedMissionItem = missionItems.find((item) => item.id === selectedMission) || null;
    const missionDone = missionItems.filter((item) => missionAnswers[item.id] === item.sense).length;
    const careDone = careSituations.filter((item, index) => careAnswers[index] === item.safe).length;
    const quizScore = quizQuestions.filter((item, index) => quizAnswers[index] === item.correct).length;
    const currentQuestion = quizQuestions[quizIndex];

    const stationMap = useMemo(
        () => Object.fromEntries(stations.map((station) => [station.id, station] as const)) as Record<SenseId, SenseStation>,
        []
    );

    const findVietnameseVoice = () => {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        return voices.find((voice) => voice.lang.toLowerCase().startsWith('vi'))
            || voices.find((voice) => /vietnam|tiếng việt|tieng viet|viet/i.test(`${voice.name} ${voice.lang}`))
            || null;
    };

    useEffect(() => {
        if (!('speechSynthesis' in window)) return;

        const loadVoices = () => {
            setVietnameseVoice(findVietnameseVoice());
        };

        loadVoices();
        window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
        return () => {
            window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
            window.speechSynthesis.cancel();
        };
    }, []);

    const playCorrectSound = () => {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        const gain = audioContext.createGain();
        gain.connect(audioContext.destination);
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.22, audioContext.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.34);

        [660, 880, 1175].forEach((frequency, index) => {
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + index * 0.08);
            oscillator.connect(gain);
            oscillator.start(audioContext.currentTime + index * 0.08);
            oscillator.stop(audioContext.currentTime + index * 0.08 + 0.16);
        });

        window.setTimeout(() => audioContext.close(), 520);
    };

    const speakStation = () => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const voice = vietnameseVoice || findVietnameseVoice();
        if (!voice) {
            setSpeechNotice('Trình duyệt chưa có giọng tiếng Việt. Hãy bật/cài voice Vietnamese trong hệ thống hoặc dùng Edge/Chrome có giọng vi-VN.');
            return;
        }

        setVietnameseVoice(voice);
        setSpeechNotice('');
        const speech = new SpeechSynthesisUtterance(`${currentStation.organ}. ${currentStation.senseName}. ${currentStation.scene}`);
        speech.voice = voice;
        speech.lang = voice.lang || 'vi-VN';
        speech.rate = 0.85;
        speech.pitch = 1.05;
        window.speechSynthesis.speak(speech);
    };

    const resetAll = () => {
        setSection('journey');
        setActiveSense('sight');
        setSelectedMission(missionItems[0]?.id || null);
        setMissionAnswers({});
        setCareAnswers({});
        setQuizIndex(0);
        setQuizAnswers({});
        setSpeechNotice('');
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };

    const renderJourney = () => (
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-white/60 bg-white/75 p-4 shadow-xl shadow-sky-900/10 backdrop-blur">
                <div className="relative min-h-[430px] overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-100 via-white to-amber-100 p-5">
                    <div className="absolute right-6 top-6 h-20 w-20 rounded-full bg-yellow-300/60 blur-xl" />
                    <div className="absolute bottom-8 left-8 h-24 w-24 rounded-full bg-emerald-300/40 blur-2xl" />
                    <div className="relative mx-auto mt-5 flex h-[360px] max-w-[320px] flex-col items-center justify-center">
                        <div className="relative h-56 w-44 rounded-[48%] border-4 border-amber-200 bg-gradient-to-b from-orange-100 to-rose-100 shadow-2xl">
                            <button onClick={() => setActiveSense('sight')} className="absolute left-9 top-20 h-10 w-10 rounded-full border-2 border-sky-400 bg-white text-sky-700 shadow-lg transition hover:scale-110" title="Mắt">👁</button>
                            <button onClick={() => setActiveSense('sight')} className="absolute right-9 top-20 h-10 w-10 rounded-full border-2 border-sky-400 bg-white text-sky-700 shadow-lg transition hover:scale-110" title="Mắt">👁</button>
                            <button onClick={() => setActiveSense('smell')} className="absolute left-1/2 top-32 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-emerald-400 bg-white shadow-lg transition hover:scale-110" title="Mũi">👃</button>
                            <button onClick={() => setActiveSense('taste')} className="absolute bottom-4 left-1/2 h-9 w-16 -translate-x-1/2 rounded-full border-2 border-rose-400 bg-white shadow-lg transition hover:scale-110" title="Lưỡi">👅</button>
                            <button onClick={() => setActiveSense('hearing')} className="absolute -left-8 top-24 h-16 w-10 rounded-full border-2 border-violet-400 bg-violet-50 shadow-lg transition hover:scale-110" title="Tai">👂</button>
                            <button onClick={() => setActiveSense('hearing')} className="absolute -right-8 top-24 h-16 w-10 rounded-full border-2 border-violet-400 bg-violet-50 shadow-lg transition hover:scale-110" title="Tai">👂</button>
                        </div>
                        <button onClick={() => setActiveSense('touch')} className="mt-5 rounded-2xl border-2 border-amber-400 bg-white px-5 py-3 text-sm font-black text-amber-700 shadow-lg transition hover:scale-105" title="Da và xúc giác">
                            ✋ Chạm và cảm nhận
                        </button>
                    </div>
                </div>
            </div>

            <div className={`rounded-3xl border border-white/60 bg-gradient-to-br ${currentStation.bg} p-6 shadow-xl shadow-sky-900/10`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-black uppercase tracking-wide text-slate-500">{currentStation.name}</p>
                        <h2 className={`mt-1 text-3xl font-black ${currentStation.color}`}>{currentStation.organ} - {currentStation.senseName}</h2>
                    </div>
                    <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-white ${currentStation.color} shadow-lg`}>
                        {currentStation.icon}
                    </div>
                </div>

                <div className="mt-6 grid gap-4">
                    <div className="rounded-2xl bg-white/80 p-4">
                        <h3 className="text-sm font-black text-slate-800">Em nhận biết được gì?</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{currentStation.scene}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-4">
                        <h3 className="text-sm font-black text-slate-800">Ví dụ gần gũi</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{currentStation.example}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 p-4">
                        <h3 className="text-sm font-black text-slate-800">Cách bảo vệ</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{currentStation.protect}</p>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button onClick={speakStation} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-700">
                        <Volume2 size={16} /> Nghe giới thiệu
                    </button>
                    <button onClick={() => setSection('missions')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-600">
                        <Sparkles size={16} /> Làm nhiệm vụ
                    </button>
                </div>
                {speechNotice && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                        {speechNotice}
                    </p>
                )}
            </div>
        </div>
    );

    const renderMissions = () => (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl shadow-sky-900/10">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-black text-emerald-700">Nhiệm vụ giác quan</p>
                        <h2 className="text-2xl font-black text-slate-900">{missionDone}/{missionItems.length} đúng</h2>
                    </div>
                    <button onClick={() => { setMissionAnswers({}); setSelectedMission(missionItems[0]?.id || null); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
                        <RefreshCcw size={16} /> Làm lại
                    </button>
                </div>
                <div className="mt-4 grid gap-3">
                    {missionItems.map((item) => {
                        const answer = missionAnswers[item.id];
                        const isCorrect = answer === item.sense;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setSelectedMission(item.id)}
                                className={`text-left rounded-2xl border p-4 transition ${selectedMission === item.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'} ${isCorrect ? 'opacity-60' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-black text-slate-800">{item.label}</span>
                                    {answer && (isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />)}
                                </div>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{item.cue}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl shadow-sky-900/10">
                <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 p-5">
                    <p className="text-sm font-bold text-slate-600">Đang chọn</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedMissionItem?.label || 'Chọn một nhiệm vụ'}</h3>
                    <p className="mt-2 text-sm text-slate-600">{selectedMissionItem?.cue || 'Sau đó chọn giác quan phù hợp bên dưới.'}</p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {stations.map((station) => {
                        const selectedAnswer = selectedMissionItem ? missionAnswers[selectedMissionItem.id] : undefined;
                        const isChosen = selectedAnswer === station.id;
                        return (
                            <button
                                key={station.id}
                                onClick={() => {
                                    if (!selectedMissionItem) return;
                                    if (station.id === selectedMissionItem.sense) playCorrectSound();
                                    setMissionAnswers((prev) => ({ ...prev, [selectedMissionItem.id]: station.id }));
                                    const currentIndex = missionItems.findIndex((item) => item.id === selectedMissionItem.id);
                                    const next = missionItems.slice(currentIndex + 1).find((item) => !missionAnswers[item.id]);
                                    if (station.id === selectedMissionItem.sense && next) {
                                        setTimeout(() => setSelectedMission(next.id), 350);
                                    }
                                }}
                                className={`rounded-2xl border bg-gradient-to-br ${station.bg} p-4 text-left transition hover:-translate-y-1 hover:shadow-lg ${isChosen ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-white'}`}
                            >
                                <div className={`flex items-center gap-3 ${station.color}`}>
                                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-white shadow">{station.icon}</div>
                                    <div>
                                        <p className="text-sm font-black">{station.organ}</p>
                                        <p className="text-xs font-bold opacity-80">{station.senseName}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {selectedMissionItem && missionAnswers[selectedMissionItem.id] && (
                    <div className={`mt-5 rounded-2xl p-4 text-sm font-bold ${missionAnswers[selectedMissionItem.id] === selectedMissionItem.sense ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {missionAnswers[selectedMissionItem.id] === selectedMissionItem.sense
                            ? `Đúng rồi! Nhiệm vụ này cần ${stationMap[selectedMissionItem.sense].senseName.toLowerCase()}.`
                            : `Chưa đúng. Gợi ý: ${selectedMissionItem.cue.toLowerCase()}.`}
                    </div>
                )}
            </div>
        </div>
    );

    const renderCare = () => (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl shadow-sky-900/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-sky-700">Góc bảo vệ giác quan</p>
                    <h2 className="text-2xl font-black text-slate-900">Chọn việc nên làm và không nên làm</h2>
                </div>
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-700">{careDone}/{careSituations.length} chính xác</div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                {careSituations.map((item, index) => {
                    const answered = careAnswers[index];
                    const isCorrect = answered === item.safe;
                    return (
                        <div key={item.text} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="font-bold text-slate-800">{item.text}</p>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => {
                                        if (item.safe) playCorrectSound();
                                        setCareAnswers((prev) => ({ ...prev, [index]: true }));
                                    }}
                                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-black transition ${answered === true ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                >
                                    Nên làm
                                </button>
                                <button
                                    onClick={() => {
                                        if (!item.safe) playCorrectSound();
                                        setCareAnswers((prev) => ({ ...prev, [index]: false }));
                                    }}
                                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-black transition ${answered === false ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                                >
                                    Không nên
                                </button>
                            </div>
                            {answered !== undefined && (
                                <p className={`mt-3 text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {isCorrect ? 'Chính xác.' : 'Hãy suy nghĩ lại để bảo vệ cơ thể tốt hơn.'}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderChallenge = () => {
        const answered = quizAnswers[quizIndex];
        const isFinished = Object.keys(quizAnswers).length === quizQuestions.length;
        return (
            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl shadow-sky-900/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-black text-amber-700">Thử thách cuối</p>
                        <h2 className="text-2xl font-black text-slate-900">Huy hiệu Nhà khám phá giác quan</h2>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700">Điểm: {quizScore}/{quizQuestions.length}</div>
                </div>

                {isFinished ? (
                    <div className="mt-6 rounded-3xl bg-gradient-to-br from-amber-100 via-white to-emerald-100 p-8 text-center">
                        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-amber-400 text-white shadow-xl">
                            <Trophy size={46} />
                        </div>
                        <h3 className="mt-5 text-3xl font-black text-slate-900">Hoàn thành!</h3>
                        <p className="mx-auto mt-3 max-w-xl text-slate-600">
                            Em đã trả lời đúng {quizScore}/{quizQuestions.length} câu. Hãy tiếp tục quan sát, lắng nghe và bảo vệ các giác quan mỗi ngày.
                        </p>
                        <button onClick={() => { setQuizIndex(0); setQuizAnswers({}); }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white hover:bg-amber-600">
                            <RefreshCcw size={16} /> Làm lại thử thách
                        </button>
                    </div>
                ) : (
                    <div className="mt-6 rounded-3xl bg-gradient-to-br from-slate-50 to-sky-50 p-5">
                        <p className="text-sm font-black text-slate-500">Câu {quizIndex + 1}/{quizQuestions.length}</p>
                        <h3 className="mt-2 text-2xl font-black text-slate-900">{currentQuestion.question}</h3>
                        <div className="mt-5 grid gap-3">
                            {currentQuestion.options.map((option, index) => {
                                const chosen = answered === index;
                                const correct = currentQuestion.correct === index;
                                return (
                                    <button
                                        key={option}
                                        onClick={() => {
                                            if (index === currentQuestion.correct) playCorrectSound();
                                            setQuizAnswers((prev) => ({ ...prev, [quizIndex]: index }));
                                        }}
                                        disabled={answered !== undefined}
                                        className={`rounded-2xl border p-4 text-left font-bold transition ${chosen && correct ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : chosen ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300'} disabled:cursor-default`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        {answered !== undefined && (
                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                                <p className={`text-sm font-black ${answered === currentQuestion.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {answered === currentQuestion.correct ? 'Chính xác!' : `Đáp án đúng là: ${currentQuestion.options[currentQuestion.correct]}.`}
                                </p>
                                <button onClick={() => setQuizIndex((prev) => prev + 1)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-700">
                                    Câu tiếp theo
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-amber-50 text-slate-900">
            <div className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700">
                        <ArrowLeft size={17} /> Về trang chính
                    </button>
                    <div className="flex flex-wrap gap-2">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSection(item.id)}
                                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition ${section === item.id ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25' : 'bg-white text-slate-600 hover:bg-cyan-50'}`}
                            >
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={resetAll} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                        <RefreshCcw size={16} /> Làm mới
                    </button>
                </div>
            </div>

            <main className="mx-auto max-w-7xl px-4 py-6">
                <section className="mb-6 overflow-hidden rounded-[28px] bg-gradient-to-r from-cyan-600 via-sky-600 to-emerald-500 p-6 text-white shadow-2xl shadow-cyan-900/20">
                    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                        <div>
                            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide">
                                <Sparkles size={14} /> Mô phỏng TNXH lớp 1
                            </p>
                            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">Biệt đội 5 giác quan</h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                                Một học liệu tương tác mới để học sinh nhận biết mắt, tai, mũi, lưỡi, da và luyện cách bảo vệ các giác quan trong đời sống.
                            </p>
                        </div>
                        <div className="rounded-3xl bg-white/15 p-4 ring-1 ring-white/20">
                            <div className="grid grid-cols-5 gap-2">
                                {stations.map((station) => (
                                    <button
                                        key={station.id}
                                        onClick={() => { setActiveSense(station.id); setSection('journey'); }}
                                        className="grid aspect-square place-items-center rounded-2xl bg-white/90 text-slate-800 shadow-lg transition hover:-translate-y-1"
                                        title={`${station.organ} - ${station.senseName}`}
                                    >
                                        <span className={station.color}>{station.icon}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {section === 'journey' && renderJourney()}
                {section === 'missions' && renderMissions()}
                {section === 'care' && renderCare()}
                {section === 'challenge' && renderChallenge()}
            </main>
        </div>
    );
};

export default SensesExplorerSimulation;
