
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wheel } from './components/Wheel';
import { Confetti } from './components/Confetti';
import { WinnerModal } from './components/WinnerModal';
import { EditModal } from './components/EditModal';
import { PlayIcon, ResetIcon, SoundOnIcon, SoundOffIcon, EditIcon } from './components/Icons';
import { STUDENT_LIST_DEFAULT, SOUND_URLS } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [masterStudentList, setMasterStudentList] = useState<string[]>(STUDENT_LIST_DEFAULT);
  const [availableStudents, setAvailableStudents] = useState<string[]>(STUDENT_LIST_DEFAULT);
  const [winners, setWinners] = useState<string[]>([]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // UI States
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGoogleImportOpen, setIsGoogleImportOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // --- Refs ---
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const winnerAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Audio Setup ---
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

  // --- Handlers ---
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

    // Calculate final rotation to point to the winner
    const sliceCenter = (winnerIndex * degreesPerSlice) + (degreesPerSlice / 2);
    const offset = 360 - sliceCenter;
    const spins = 360 * 8; // 8 full spins
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
    const names = newListText.split('\n')
      .map(name => name.trim())
      .filter(name => name !== "");

    if (names.length === 0) {
      alert("Danh sách không được để trống!");
      return;
    }

    setMasterStudentList(names);
    setAvailableStudents(names);
    setWinners([]);
    setIsSpinning(false);
    setGameStarted(false);
    setSelectedStudent(null);
    setShowConfetti(false);
    setShowWinnerModal(false);
    setRotation(0);
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
    <div className="min-h-screen bg-gradient-to-br from-rose-400 via-pink-500 to-pink-600 text-slate-900 flex flex-col items-center p-4 overflow-x-hidden relative font-roboto">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-white rounded-full blur-[100px] mix-blend-overlay animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-pink-200 rounded-full blur-[100px] mix-blend-overlay animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {showConfetti && <Confetti />}

      <WinnerModal
        isOpen={showWinnerModal}
        winnerName={selectedStudent}
        onContinue={handleContinueAfterWin}
      />

      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveList}
        currentStudents={masterStudentList}
      />

      {/* Google Sheets Import Modal */}
      {isGoogleImportOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md mx-4 border-4 border-green-300">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" />
              </svg>
              <h2 className="text-xl font-bold text-green-700">Nhập bảng tính Google</h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Dán link Google Sheet (cột đầu tiên sẽ được lấy làm danh sách)
            </p>
            <p className="text-xs text-orange-600 mb-3 bg-orange-50 p-2 rounded-lg">
              ⚠️ Sheet phải được chia sẻ: <strong>"Bất kỳ ai có liên kết đều xem được"</strong>
            </p>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => { setSheetUrl(e.target.value); setImportError(''); }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:border-green-500 focus:outline-none mb-3"
            />
            {importError && <p className="text-red-500 text-sm mb-3">❌ {importError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setIsGoogleImportOpen(false)}
                className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (!sheetUrl.trim()) {
                    setImportError('Vui lòng nhập URL!');
                    return;
                  }
                  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                  if (!match) {
                    setImportError('URL không hợp lệ!');
                    return;
                  }
                  setIsImporting(true);
                  try {
                    const res = await fetch(`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=0`);
                    if (!res.ok) throw new Error('Không thể truy cập sheet!');
                    const csv = await res.text();
                    const names = csv.split('\n').map(l => l.split(',')[0]?.trim().replace(/"/g, '')).filter(n => n);
                    if (names.length === 0) throw new Error('Không có dữ liệu!');
                    setMasterStudentList(names);
                    setAvailableStudents(names);
                    setWinners([]);
                    setRotation(0);
                    setIsGoogleImportOpen(false);
                  } catch (e: any) {
                    setImportError(e.message || 'Lỗi import!');
                  } finally {
                    setIsImporting(false);
                  }
                }}
                disabled={isImporting}
                className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isImporting ? 'Đang tải...' : '✓ Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Home Button - Left Side */}
      <a
        href="/"
        className="absolute top-4 left-6 z-30 p-3 bg-white/90 hover:bg-white backdrop-blur-md rounded-full transition-all border-2 border-pink-300 shadow-lg hover:scale-110"
        title="Quay về trang chủ"
      >
        <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      </a>

      {/* Header Actions */}
      <div className="absolute top-4 right-6 z-30 flex gap-3">
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="p-3 bg-white/90 hover:bg-white backdrop-blur-md rounded-full transition-all border-2 border-pink-300 shadow-lg group hover:scale-110"
          title="Chỉnh sửa danh sách"
        >
          <EditIcon className="w-6 h-6 text-pink-600" />
        </button>

        <button
          onClick={toggleMute}
          className="p-3 bg-white/90 hover:bg-white backdrop-blur-md rounded-full transition-all border-2 border-pink-300 shadow-lg hover:scale-110"
          title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {isMuted ? <SoundOffIcon className="w-6 h-6 text-gray-600" /> : <SoundOnIcon className="w-6 h-6 text-pink-600" />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-3 bg-white/90 hover:bg-white backdrop-blur-md rounded-full transition-all border-2 border-pink-300 shadow-lg hover:scale-110"
          title="Toàn màn hình"
        >
          <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
        </button>
      </div>

      <header className="text-center mb-8 z-20 mt-2 w-full">
        <h1 className="font-bungee text-4xl md:text-6xl text-white drop-shadow-md tracking-wider uppercase leading-tight" style={{ textShadow: '3px 3px 0 #be185d, 4px 4px 8px rgba(0,0,0,0.3)' }}>
          Vòng Quay May Mắn
        </h1>
      </header>

      <main className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full max-w-[1400px] z-10 flex-grow">
        {/* Đã quay */}
        <div className="w-full lg:w-1/4 order-2 lg:order-1 flex flex-col h-[400px] lg:h-[600px]">
          <div className="bg-white/80 p-4 rounded-t-2xl shadow-lg border-b-4 border-pink-400 backdrop-blur-sm text-center">
            <h2 className="text-xl font-bungee text-pink-800 uppercase">Đã Quay ({winners.length})</h2>
          </div>
          <div className="bg-white/60 p-4 rounded-b-2xl shadow-lg backdrop-blur-sm flex-grow overflow-y-auto custom-scrollbar border-x-2 border-b-2 border-white/50">
            {winners.length === 0 ? (
              <div className="h-full flex items-center justify-center italic text-pink-900/50 font-bold">Chưa có ai</div>
            ) : (
              <ul className="space-y-2">
                {winners.map((winner, index) => (
                  <li key={index} className="bg-white p-3 rounded-lg text-pink-900 font-bold border-l-8 border-pink-500 shadow-sm flex items-center gap-3 animate-[fade-in_0.3s_ease-out]">
                    <span className="bg-pink-100 text-pink-700 min-w-[24px] h-6 rounded-full flex items-center justify-center text-xs font-black border border-pink-200">{winners.length - index}</span>
                    {winner}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Vòng quay chính */}
        <div className="w-full lg:w-1/2 order-1 lg:order-2 flex flex-col items-center justify-start pt-0 lg:pt-4">
          <div className="relative mb-8">
            <div className="p-4 bg-white/40 rounded-full backdrop-blur-md border-[8px] border-white/80 shadow-[0_0_50px_rgba(0,0,0,0.25)]">
              <Wheel students={availableStudents} rotation={rotation} isSpinning={isSpinning} />
            </div>
          </div>

          <div className="flex gap-4 z-10">
            {!gameStarted || availableStudents.length > 0 ? (
              <button
                onClick={handleSpinClick}
                disabled={isSpinning || availableStudents.length === 0}
                className="font-bungee text-xl md:text-3xl bg-gradient-to-b from-yellow-300 to-yellow-500 text-red-700 py-4 px-12 rounded-full shadow-[0_6px_0_#b45309,0_15px_20px_rgba(0,0,0,0.2)] transform hover:-translate-y-1 active:translate-y-1 transition-all disabled:opacity-50 border-4 border-white flex items-center gap-3"
              >
                <PlayIcon className="w-8 h-8" /> {isSpinning ? 'ĐANG QUAY...' : 'QUAY'}
              </button>
            ) : (
              <button
                onClick={handleResetClick}
                className="font-bungee text-xl md:text-2xl bg-gradient-to-b from-red-400 to-red-600 text-white py-4 px-10 rounded-full shadow-[0_6px_0_#7f1d1d,0_15px_20px_rgba(0,0,0,0.2)] transform active:translate-y-1 transition-all border-4 border-white flex items-center gap-2"
              >
                <ResetIcon className="w-6 h-6" /> CHƠI LẠI
              </button>
            )}
          </div>
          {availableStudents.length === 0 && winners.length > 0 && (
            <div className="mt-6 px-8 py-3 bg-white/90 rounded-full shadow-lg animate-bounce">
              <p className="text-xl font-bold text-pink-700">🎉 Đã hoàn thành danh sách! 🎉</p>
            </div>
          )}
        </div>

        {/* Chưa quay */}
        <div className="w-full lg:w-1/4 order-3 lg:order-3 flex flex-col h-[400px] lg:h-[600px]">
          <div className="bg-white/80 p-4 rounded-t-2xl shadow-lg border-b-4 border-blue-400 backdrop-blur-sm text-center">
            <h2 className="text-xl font-bungee text-blue-800 uppercase">Chưa Quay ({availableStudents.length})</h2>
          </div>
          <div className="bg-white/60 p-4 rounded-b-2xl shadow-lg backdrop-blur-sm flex-grow overflow-y-auto custom-scrollbar border-x-2 border-b-2 border-white/50">
            {availableStudents.length === 0 ? (
              <div className="h-full flex items-center justify-center italic text-blue-900/50 font-bold">Đã quay hết!</div>
            ) : (
              <ul className="grid grid-cols-1 gap-2">
                {availableStudents.map((student, index) => (
                  <li key={index} className="bg-white/80 hover:bg-white p-2 px-4 rounded-full text-center text-sm font-bold text-slate-800 border border-white shadow-sm transition-transform hover:scale-105">
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

export default App;
