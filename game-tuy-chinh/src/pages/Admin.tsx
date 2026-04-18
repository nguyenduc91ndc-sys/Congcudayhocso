import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Film, Music, FileSpreadsheet, Download, Upload, DatabaseBackup, LogIn, Link2, Copy, PlayCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Question, OptionMedia } from '../hooks/useGameLogic';
import { auth, googleProvider } from '../lib/firebaseConfig';
import { signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { saveCustomGame, getUserCustomGames, deleteCustomGame, getCustomGame, getGameLeaderboard, resetGameLeaderboard } from '../lib/firebaseService';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const downloadFile = (data: string, filename: string, type: string) => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function Admin() {
  const navigate = useNavigate();
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // View State: 'list' | 'editor' | 'leaderboard'
  const [viewState, setViewState] = useState<'list' | 'editor' | 'leaderboard'>('list');
  
  // Game List State
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  // Editor State
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gameTitle, setGameTitle] = useState('Bộ Câu Hỏi Mới');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  
  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Custom Dialog State (replaces window.confirm/alert which are blocked in iframes)
  const [dialog, setDialog] = useState<{ message: string; onConfirm: () => void; onCancel?: () => void; type: 'confirm' | 'alert' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setDialog({ message, onConfirm, onCancel, type: 'confirm' });
  };
  const showAlert = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Handle Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        loadMyGames(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      showAlert('❌ Đăng nhập thất bại: ' + (err as any).message);
    }
  };

  const loadMyGames = async (uid: string) => {
    setLoadingGames(true);
    const games = await getUserCustomGames(uid);
    setMyGames(games);
    setLoadingGames(false);
  };

  // 2. Manage Games
  const createNewGame = () => {
    setActiveGameId(null);
    setGameTitle('Bộ Câu Hỏi Mới');
    setQuestions([]);
    setViewState('editor');
  };

  const openGameEditor = async (gameId: string) => {
    setLoadingGames(true);
    const data = await getCustomGame(gameId);
    if (data) {
      setActiveGameId(gameId);
      setGameTitle(data.title);
      setQuestions(data.questions);
      setViewState('editor');
    }
    setLoadingGames(false);
  };

  const openLeaderboard = async (gameId: string) => {
    setLoadingGames(true);
    const data = await getCustomGame(gameId);
    if (data) {
      setActiveGameId(gameId);
      setGameTitle(data.title);
      const lb = await getGameLeaderboard(gameId);
      setLeaderboard(lb);
      setViewState('leaderboard');
    }
    setLoadingGames(false);
  };

  const saveEntireGame = async () => {
    if (!user) return;
    try {
      const newId = await saveCustomGame(gameTitle, questions, user.uid, activeGameId || undefined);
      setActiveGameId(newId);
      showAlert('✅ Đã lưu phiên bản game thành công!');
      loadMyGames(user.uid);
    } catch (err) {
      showAlert('❌ Lỗi lưu game: ' + err);
    }
  };

  const deleteGame = async (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    showConfirm('Bạn có chắc muốn xóa bộ câu hỏi này? Toàn bộ dữ liệu và BXH sẽ bị mất!', async () => {
      const success = await deleteCustomGame(gameId, user.uid);
      if (success) {
        setMyGames(prev => prev.filter(g => g.gameId !== gameId));
        showAlert('🗑️ Đã xóa game thành công!');
      }
    });
  };

  const copyLink = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Build URL pointing to the game's own page, not the parent dashboard
    const decodedPath = decodeURIComponent(window.location.pathname);
    const basePath = decodedPath.includes('game-tùy-chỉnh') 
      ? window.location.pathname
      : '/game-t%C3%B9y-ch%E1%BB%89nh/dist/index.html';
    const url = `${window.location.origin}${basePath}?id=${gameId}`;
    navigator.clipboard.writeText(url);
    showAlert('📋 Đã copy link: ' + url);
  };

  // 3. Question Editor Operations
  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'multiple-choice',
      question: 'Câu hỏi mới',
      content: { text: 'Câu hỏi mới' },
      options: [
        { text: 'Đáp án A' },
        { text: 'Đáp án B' },
        { text: 'Đáp án C' },
        { text: 'Đáp án D' }
      ],
      correctAnswer: 0,
      level: 'easy'
    };
    setQuestions([newQ, ...questions]);
    setEditingId(newQ.id);
    setEditForm(newQ);
  };

  const handleDeleteQuestion = (id: string) => {
    showConfirm('Bạn có chắc muốn xóa câu hỏi này?', () => {
      setQuestions(questions.filter(q => q.id !== id));
    });
  };

  const handleSaveQuestionEdit = () => {
    if (editingId && editForm) {
      const updatedQuestions = questions.map(q => 
        q.id === editingId ? { ...q, ...editForm } as Question : q
      );
      setQuestions(updatedQuestions);
      setEditingId(null);
    }
  };

  const handleResetLeaderboard = async () => {
    if (activeGameId && user) {
      showConfirm('Bạn có chắc muốn xóa toàn bộ bảng điểm của game này?', async () => {
        await resetGameLeaderboard(activeGameId!, user!.uid);
        setLeaderboard([]);
      });
    }
  };

  // ========== EXCEL & JSON EXPORT/IMPORT ==========
  const handleDownloadTemplate = () => {
    const wsData = [
      ['Nội dung câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng (A/B/C/D)', 'Độ khó (easy/medium/hard)'],
      ['Thủ đô của Việt Nam là gì?', 'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Huế', 'A', 'easy'],
      ['Vị vua nào dựng nước Âu Lạc?', 'Lê Lợi', 'An Dương Vương', 'Quang Trung', 'Lý Thái Tổ', 'B', 'medium'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CauHoi");
    XLSX.writeFile(wb, "Mau_Cau_Hoi.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        
        const newQuestions: Question[] = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[0]) continue;
          
          const qText = row[0];
          const optA = row[1] || '';
          const optB = row[2] || '';
          const optC = row[3] || '';
          const optD = row[4] || '';
          const correctKey = (row[5] || 'A').toString().toUpperCase().trim();
          const levelKey = (row[6] || 'easy').toString().toLowerCase().trim();
          
          let correctIdx = 0;
          if (correctKey === 'B') correctIdx = 1;
          else if (correctKey === 'C') correctIdx = 2;
          else if (correctKey === 'D') correctIdx = 3;

          const level = ['easy', 'medium', 'hard'].includes(levelKey) ? levelKey : 'easy';

          const newQ: Question = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
            type: 'multiple-choice',
            question: qText,
            content: { text: qText },
            options: [
              { text: optA },
              { text: optB },
              { text: optC },
              { text: optD }
            ],
            correctAnswer: correctIdx,
            level: level
          };
          newQuestions.push(newQ);
        }
        
        if (newQuestions.length > 0) {
          const merged = [...newQuestions, ...questions];
          setQuestions(merged);
          showAlert(`🎉 Đã thêm thành công ${newQuestions.length} câu hỏi từ Excel! Đừng quên bấm "LƯU TRÊN CLOUD" để lưu.`);
        }
      } catch (err) {
        showAlert('❌ Lỗi đọc file Excel: Vui lòng đảm bảo đúng định dạng file mẫu.');
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const handleBackupJSON = () => {
    const dataStr = JSON.stringify(questions, null, 2);
    downloadFile(dataStr, `Backup_${gameTitle}_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          showConfirm(`Đã phát hiện ${parsed.length} câu hỏi. GỘP (OK) hay GHI ĐÈ (Hủy)?`, () => {
            setQuestions(prev => [...prev, ...parsed]);
          }, () => {
            setQuestions(parsed);
          });
        }
      } catch (err) {
        showAlert('❌ Lỗi khi đọc file JSON: ' + err);
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  // ========== MEDIA UPLOAD ==========
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      if (target === 'question-image') {
        setEditForm({ ...editForm, content: { ...editForm.content, image: base64 } });
      } else if (target === 'question-video') {
        setEditForm({ ...editForm, content: { ...editForm.content, video: base64 } });
      } else if (target === 'question-audio') {
        setEditForm({ ...editForm, content: { ...editForm.content, audio: base64 } });
      } else if (target.startsWith('opt-')) {
        const [_, field, idxStr] = target.split('-');
        const idx = parseInt(idxStr);
        const newOpts = [...(editForm.options || [])] as OptionMedia[];
        if (typeof newOpts[idx] === 'string') newOpts[idx] = { text: newOpts[idx] as any };
        if (field === 'image') newOpts[idx].image = base64;
        if (field === 'audio') newOpts[idx].audio = base64;
        setEditForm({ ...editForm, options: newOpts });
      }
    } catch (err) {
      alert('Lỗi tải file: ' + err);
    }
    e.target.value = '';
  };

  const removeMedia = (target: string) => {
    if (target === 'question-image') {
      const newContent = { ...editForm.content };
      delete newContent.image;
      setEditForm({ ...editForm, content: newContent });
    } else if (target === 'question-video') {
      const newContent = { ...editForm.content };
      delete newContent.video;
      setEditForm({ ...editForm, content: newContent });
    } else if (target === 'question-audio') {
      const newContent = { ...editForm.content };
      delete newContent.audio;
      setEditForm({ ...editForm, content: newContent });
    } else if (target.startsWith('opt-')) {
      const [_, field, idxStr] = target.split('-');
      const idx = parseInt(idxStr);
      const newOpts = [...(editForm.options || [])] as OptionMedia[];
      if (field === 'image') delete newOpts[idx].image;
      if (field === 'audio') delete newOpts[idx].audio;
      setEditForm({ ...editForm, options: newOpts });
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Đang kiểm tra đăng nhập...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e2e8f0] flex items-center justify-center p-4">
         <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full text-center border-4 border-slate-100">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
               <LogIn className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">QUẢN TRỊ GAME</h1>
            <p className="text-slate-500 font-medium mb-8">Vui lòng đăng nhập giáo viên để trải nghiệm hệ thống trò chơi tách biệt</p>
            <button 
              onClick={handleLogin}
              className="w-full bg-blue-600 shadow-[0_6px_0_theme(colors.blue.800)] active:shadow-none active:translate-y-[6px] transition-all text-white py-4 rounded-2xl font-black text-lg"
            >
              ĐĂNG NHẬP VỚI GOOGLE
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e2e8f0] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header - 3D Card Style */}
        <header className="bg-white rounded-3xl p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-white/50 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden backdrop-blur-xl">
          <div className="flex items-center gap-4 z-10">
            <button 
              onClick={() => {
                if (viewState === 'list') navigate('/');
                else setViewState('list');
              }}
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl shadow-[inset_0_-4px_rgba(0,0,0,0.05)] hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent transform -skew-x-6 tracking-tight">
              {viewState === 'list' ? 'KHO GAME CỦA TÔI' : gameTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {viewState === 'editor' && (
                <button 
                  onClick={saveEntireGame}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-xl shadow-[0_4px_0_theme(colors.emerald.700)] active:translate-y-1 active:shadow-none transition-all mr-2"
                >
                   LƯU TRÊN CLOUD
                </button>
             )}
             <div className="flex items-center gap-3">
               {user.photoURL ? (
                 <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-slate-200" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
               ) : null}
               <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg border-2 border-white shadow-md ${user.photoURL ? 'hidden' : ''}`}>
                 {(user.displayName || '?')[0].toUpperCase()}
               </div>
               <div className="hidden md:block text-sm font-bold text-slate-600">{user.displayName}</div>
             </div>
          </div>
        </header>

        {loadingGames ? (
          <div className="bg-white/50 backdrop-blur rounded-3xl p-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-8 border-slate-200 border-t-blue-500 mb-6 animate-spin rounded-full shadow-xl"></div>
            <p className="text-lg font-black text-slate-600 uppercase tracking-widest">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* VIEW: GAME LIST */}
            {viewState === 'list' && (
              <div className="space-y-6">
                <button 
                  onClick={createNewGame}
                  className="w-full border-4 border-dashed border-slate-300 hover:border-blue-400 bg-white/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all"
                >
                  <Plus className="w-10 h-10" />
                  <span className="font-black tracking-widest">TẠO GAME MỚI</span>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myGames.map(game => (
                    <div key={game.gameId} className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl border-2 border-slate-100 hover:border-blue-200 transition-all group flex flex-col cursor-pointer" onClick={() => openGameEditor(game.gameId)}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-1.5">
                           ID: {game.gameId}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={(e) => copyLink(game.gameId, e)} className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors" title="Copy Link chơi">
                             <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => deleteGame(game.gameId, e)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors" title="Xóa Game">
                             <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-800 mb-2 truncate">{game.title}</h3>
                      <p className="text-sm font-medium text-slate-500 mb-6">{game.count} câu hỏi</p>
                      
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openGameEditor(game.gameId); }}
                          className="py-2.5 bg-slate-100 font-bold text-sm text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openLeaderboard(game.gameId); }}
                          className="py-2.5 bg-amber-50 font-bold text-sm text-amber-600 rounded-xl hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <DatabaseBackup className="w-4 h-4" /> BXH
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW: EDITOR */}
            {viewState === 'editor' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex-1">
                      <label className="text-[10px] font-black tracking-widest text-slate-400 mb-1 ml-2 block">TÊN BỘ CÂU HỎI</label>
                      <input 
                        value={gameTitle} 
                        onChange={e => setGameTitle(e.target.value)}
                        className="w-full text-2xl font-black text-slate-800 bg-transparent border-none outline-none focus:ring-0 p-2"
                        placeholder="Nhập tên..."
                      />
                   </div>
                   <div className="flex gap-2 text-sm font-bold bg-slate-50 p-2 rounded-2xl items-center">
                     <span className="p-2 text-slate-500">ID Game: {activeGameId || "Chưa lưu"}</span>
                     {activeGameId ? (
                        <button onClick={(e) => copyLink(activeGameId, e)} className="px-5 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all cursor-pointer font-black text-sm shadow-md hover:shadow-lg flex items-center gap-2">📋 Copy Link Mời</button>
                     ) : (
                        <span className="p-2 text-amber-500 text-xs">Bấm "LƯU TRÊN CLOUD" để lấy link</span>
                     )}
                   </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <button 
                      onClick={handleAddQuestion}
                      className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center gap-2 bg-blue-600 active:bg-blue-700 text-white p-4 rounded-3xl shadow-[0_6px_0_theme(colors.blue.800)] hover:-translate-y-1 hover:shadow-[0_8px_0_theme(colors.blue.800)] active:translate-y-1 active:shadow-[0_0px_0_theme(colors.blue.800)] transition-all"
                    >
                      <Plus className="w-8 h-8" />
                      <span className="font-bold text-sm tracking-wide">THÊM CÂU HỎI</span>
                    </button>

                    <button 
                      onClick={handleDownloadTemplate}
                      className="flex flex-col items-center justify-center gap-2 bg-white text-slate-700 p-4 rounded-3xl shadow-[0_6px_0_theme(colors.slate.200)] hover:-translate-y-1 hover:shadow-[0_8px_0_theme(colors.slate.200)] active:translate-y-1 active:shadow-[0_0px_0_theme(colors.slate.200)] border-2 border-slate-100 transition-all"
                    >
                      <Download className="w-7 h-7 text-green-500" />
                      <span className="font-bold text-xs uppercase text-center mt-1">Tải Form Mẫu</span>
                    </button>

                    <button 
                      onClick={() => excelInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 bg-white text-slate-700 p-4 rounded-3xl shadow-[0_6px_0_theme(colors.slate.200)] hover:-translate-y-1 hover:shadow-[0_8px_0_theme(colors.slate.200)] active:translate-y-1 active:shadow-[0_0px_0_theme(colors.slate.200)] border-2 border-slate-100 transition-all"
                    >
                      <FileSpreadsheet className="w-7 h-7 text-green-600" />
                      <span className="font-bold text-xs uppercase text-center mt-1">Nhập Excel</span>
                      <input type="file" accept=".xlsx, .xls" className="hidden" ref={excelInputRef} onChange={handleImportExcel} />
                    </button>

                    <button 
                      onClick={handleBackupJSON}
                      className="flex flex-col items-center justify-center gap-2 bg-white text-slate-700 p-4 rounded-3xl shadow-[0_6px_0_theme(colors.slate.200)] hover:-translate-y-1 hover:shadow-[0_8px_0_theme(colors.slate.200)] active:translate-y-1 active:shadow-[0_0px_0_theme(colors.slate.200)] border-2 border-slate-100 transition-all"
                    >
                      <DatabaseBackup className="w-7 h-7 text-purple-500" />
                      <span className="font-bold text-xs uppercase text-center mt-1">Backup JSON</span>
                    </button>

                    <button 
                      onClick={() => jsonInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 bg-white text-slate-700 p-4 rounded-3xl shadow-[0_6px_0_theme(colors.slate.200)] hover:-translate-y-1 hover:shadow-[0_8px_0_theme(colors.slate.200)] active:translate-y-1 active:shadow-[0_0px_0_theme(colors.slate.200)] border-2 border-slate-100 transition-all"
                    >
                      <Upload className="w-7 h-7 text-purple-600" />
                      <span className="font-bold text-xs uppercase text-center mt-1">Khôi phục JSON</span>
                      <input type="file" accept=".json" className="hidden" ref={jsonInputRef} onChange={handleRestoreJSON} />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6 mt-6">
                  {questions.map((q) => (
                    <div key={q.id}>
                      {editingId === q.id ? (
                        <div className="bg-white p-8 rounded-[3rem] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.15)] border-4 border-blue-500 relative before:absolute before:-inset-2 before:bg-blue-100/50 before:rounded-[3.5rem] before:-z-10 before:backdrop-blur-md">
                          {/* EDIT MODE */}
                          <div className="flex flex-col lg:flex-row gap-6 mb-8">
                             <div className="flex-1">
                               <label className="block text-[11px] font-black text-blue-600/80 mb-3 uppercase tracking-widest bg-blue-50 w-max px-3 py-1 rounded-full">Nội dung câu hỏi (Chữ)</label>
                               <textarea 
                                 value={editForm.content?.text || editForm.question}
                                 onChange={e => {
                                   const val = e.target.value;
                                   setEditForm({
                                     ...editForm, 
                                     question: val,
                                     content: { ...editForm.content, text: val }
                                   });
                                 }}
                                 className="w-full p-5 rounded-3xl bg-slate-50 border-2 border-slate-100 shadow-inner focus:border-blue-400 focus:bg-white outline-none font-bold text-slate-700 text-lg sm:text-xl transition-all resize-none min-h-[140px]"
                                 placeholder="Nhập nội dung câu hỏi tại đây..."
                               />
                             </div>
                             <div className="w-full lg:w-48 flex flex-col gap-3">
                               <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">Mức Độ</label>
                               <select 
                                 value={editForm.level}
                                 onChange={e => setEditForm({...editForm, level: e.target.value})}
                                 className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 font-black text-base outline-none shadow-sm cursor-pointer hover:border-slate-300"
                               >
                                  <option value="easy">🟩 DỄ</option>
                                  <option value="medium">🟨 VỪA</option>
                                  <option value="hard">🟥 KHÓ</option>
                               </select>
                             </div>
                          </div>

                          {/* Media Uploads */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-sm relative group overflow-hidden">
                              <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 opacity-70">
                                <ImageIcon className="w-4 h-4" /> Hình ảnh minh họa
                              </div>
                              <div className="aspect-video bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden transition-all hover:border-blue-300">
                                {editForm.content?.image ? (
                                  <>
                                    <img src={editForm.content.image} className="w-full h-full object-contain p-2" alt="Question content" />
                                    <button onClick={() => removeMedia('question-image')} className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full transition-transform hover:scale-110 shadow-lg"><X className="w-4 h-4" /></button>
                                  </>
                                ) : (
                                  <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center group">
                                    <div className="p-4 rounded-full bg-blue-50 group-hover:bg-blue-100 group-hover:scale-110 transition-all text-blue-500">
                                      <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs text-slate-400 font-bold mt-3 uppercase tracking-wider">Tải Hình Ảnh</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'question-image')} />
                                  </label>
                                )}
                              </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-sm relative group overflow-hidden">
                              <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 opacity-70">
                                <Film className="w-4 h-4" /> Video minh họa
                              </div>
                              <div className="aspect-video bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden transition-all hover:border-blue-300">
                                {editForm.content?.video ? (
                                  <>
                                    <video src={editForm.content.video} className="w-full h-full object-contain bg-black" controls />
                                    <button onClick={() => removeMedia('question-video')} className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full transition-transform hover:scale-110 shadow-lg"><X className="w-4 h-4" /></button>
                                  </>
                                ) : (
                                  <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center group">
                                    <div className="p-4 rounded-full bg-emerald-50 group-hover:bg-emerald-100 group-hover:scale-110 transition-all text-emerald-500">
                                      <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs text-slate-400 font-bold mt-3 uppercase tracking-wider">Tải Video</span>
                                    <input type="file" accept="video/*" className="hidden" onChange={e => handleFileUpload(e, 'question-video')} />
                                  </label>
                                )}
                              </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-sm relative group overflow-hidden">
                              <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 opacity-70">
                                <Music className="w-4 h-4" /> Âm thanh / Giọng đọc
                              </div>
                              <div className="aspect-video bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden transition-all hover:border-blue-300">
                                {editForm.content?.audio ? (
                                  <>
                                    <div className="p-4 w-full h-full flex items-center justify-center bg-purple-50/50">
                                      <audio src={editForm.content.audio} controls className="w-full" />
                                    </div>
                                    <button onClick={() => removeMedia('question-audio')} className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full transition-transform hover:scale-110 shadow-lg"><X className="w-4 h-4" /></button>
                                  </>
                                ) : (
                                  <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center group">
                                    <div className="p-4 rounded-full bg-purple-50 group-hover:bg-purple-100 group-hover:scale-110 transition-all text-purple-500">
                                      <Plus className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs text-slate-400 font-bold mt-3 uppercase tracking-wider">Tải Audio</span>
                                    <input type="file" accept="audio/*" className="hidden" onChange={e => handleFileUpload(e, 'question-audio')} />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Options */}
                          <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                             <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 opacity-70 px-2">
                               CẤU HÌNH ĐÁP ÁN (A B C D)
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {editForm.options?.map((opt, idx) => {
                                  const o = typeof opt === 'string' ? { text: opt } as OptionMedia : opt;
                                  const isCorrect = editForm.correctAnswer === idx;
                                  return (
                                    <div key={idx} className={`p-5 rounded-3xl border-4 transition-all duration-300 ${isCorrect ? 'bg-white border-green-500 shadow-[0_8px_20px_-10px_rgba(34,197,94,0.3)] scale-[1.02] z-10 relative' : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'}`}>
                                      <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-sm ${isCorrect ? 'bg-green-500 text-white shadow-green-200' : 'bg-slate-100 text-slate-600'}`}>
                                            {['A', 'B', 'C', 'D'][idx]}
                                          </span>
                                        </div>
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-colors ${isCorrect ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                                          <input 
                                            type="radio" 
                                            name="correctAnswer"
                                            checked={isCorrect} 
                                            onChange={() => setEditForm({ ...editForm, correctAnswer: idx })}
                                            className="w-5 h-5 text-green-600 focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
                                          />
                                          <span className={`text-xs font-black uppercase tracking-wider ${isCorrect ? 'text-green-600' : 'text-slate-400'}`}>Là Đáp Án Đúng</span>
                                        </label>
                                      </div>

                                      <input 
                                        value={o.text || ''}
                                        onChange={e => {
                                          const newOpts = [...(editForm.options || [])] as OptionMedia[];
                                          if (typeof newOpts[idx] === 'string') newOpts[idx] = { text: e.target.value };
                                          else newOpts[idx].text = e.target.value;
                                          setEditForm({ ...editForm, options: newOpts });
                                        }}
                                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none font-bold text-slate-700 mb-4 transition-all"
                                        placeholder="Nhập nội dung chữ..."
                                      />

                                      <div className="flex gap-4 h-24">
                                        <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-100 transition-colors flex items-center justify-center relative overflow-hidden group">
                                          {o.image ? (
                                            <>
                                              <img src={o.image} className="w-full h-full object-contain p-1" alt="option logo" />
                                              <button onClick={() => removeMedia(`opt-image-${idx}`)} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all font-black text-xs tracking-widest uppercase">XÓA ẢNH</button>
                                            </>
                                          ) : (
                                            <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                              <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-500 group-hover:-translate-y-1 transition-all" />
                                              <span className="text-[10px] font-black text-slate-400 tracking-wider mt-2 group-hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100">ĐÍNH KÈM</span>
                                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, `opt-image-${idx}`)} />
                                            </label>
                                          )}
                                        </div>
                                        <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-100 transition-colors flex items-center justify-center relative overflow-hidden group">
                                          {o.audio ? (
                                            <>
                                              <Music className="w-8 h-8 text-purple-500" />
                                              <button onClick={() => removeMedia(`opt-audio-${idx}`)} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all font-black text-xs tracking-widest uppercase">XÓA AUDIO</button>
                                            </>
                                          ) : (
                                            <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                              <Music className="w-6 h-6 text-slate-400 group-hover:text-purple-500 group-hover:-translate-y-1 transition-all" />
                                              <span className="text-[10px] font-black text-slate-400 tracking-wider mt-2 group-hover:text-purple-500 transition-all opacity-0 group-hover:opacity-100">ĐÍNH KÈM</span>
                                              <input type="file" accept="audio/*" className="hidden" onChange={e => handleFileUpload(e, `opt-audio-${idx}`)} />
                                            </label>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                             </div>
                          </div>

                          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-8 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm transition-all hover:bg-slate-200 uppercase tracking-widest"
                            >
                              HỦY BỎ TẠM THỜI
                            </button>
                            <button 
                              onClick={handleSaveQuestionEdit}
                              className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl shadow-[0_6px_0_theme(colors.blue.800)] hover:-translate-y-1 hover:shadow-[0_8px_0_theme(colors.blue.800)] active:translate-y-1 active:shadow-none font-black text-sm flex items-center gap-2 uppercase tracking-widest transition-all"
                            >
                              <Save className="w-5 h-5" /> ÁP DỤNG CÂU HỎI
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-transparent hover:border-blue-100 hover:shadow-md transition-all flex items-stretch gap-6 group relative">
                          <div className={`w-3 rounded-full ${q.level === 'easy' ? 'bg-green-400' : q.level === 'medium' ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                          
                          <div className="flex-1 min-w-0 py-2">
                            <div className="flex items-center gap-3 mb-2 opacity-70">
                              <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">{q.type}</span>
                              <div className="flex gap-1.5">
                                {q.content?.image && <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                                {q.content?.video && <Film className="w-3.5 h-3.5 text-emerald-500" />}
                                {q.content?.audio && <Music className="w-3.5 h-3.5 text-purple-500" />}
                              </div>
                            </div>
                            
                            <h3 className="font-extrabold text-slate-800 text-xl mb-4 truncate pr-8">
                              {q.content?.text || q.question}
                            </h3>

                            <div className="flex flex-wrap gap-2">
                              {q.options.map((opt, idx) => {
                                 const text = typeof opt === 'string' ? opt : opt.text;
                                 const isMedia = typeof opt !== 'string' && (opt.image || opt.audio);
                                 const isCorrect = idx === q.correctAnswer;
                                 return (
                                   <div key={idx} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] ${isCorrect ? 'bg-green-100 text-green-700 ring-2 ring-green-400/30' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                     <span className="opacity-40 mr-1">{['A', 'B', 'C', 'D'][idx]}.</span> {text}
                                     {isMedia && " 📎"}
                                     {isCorrect && ' ✓'}
                                   </div>
                                 );
                              })}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 justify-center ml-2 border-l border-slate-100 pl-6 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingId(q.id);
                                setEditForm(q);
                              }}
                              className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded-2xl transition-all shadow-[inset_0_-2px_rgba(0,0,0,0.05)]"
                              title="Sửa"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-3 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-[inset_0_-2px_rgba(0,0,0,0.05)]"
                              title="Xóa"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {questions.length === 0 && (
                    <div className="bg-slate-100/50 rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <DatabaseBackup className="w-10 h-10" />
                      </div>
                      <h3 className="font-extrabold text-slate-500 text-lg mb-2">CHƯA CÓ CÂU HỎI TRONG BỘ ROOT NÀY</h3>
                      <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium leading-relaxed">Hãy thêm bằng tay hoặc Khôi phục JSON / Excel.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: LEADERBOARD */}
            {viewState === 'leaderboard' && (
              <div className="bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">BẢNG VINH DANH {gameTitle}</h2>
                    <p className="text-slate-500 text-sm font-medium">Toàn bộ lịch sử điểm số của học sinh trong phiên bản game này.</p>
                  </div>
                  <button 
                    onClick={handleResetLeaderboard}
                    className="flex items-center gap-2 bg-red-100 text-red-600 px-6 py-3 rounded-2xl text-sm font-black hover:bg-red-600 hover:text-white shadow-[inset_0_-3px_rgba(0,0,0,0.1)] transition-all uppercase tracking-widest"
                  >
                    <Trash2 className="w-4 h-4" />
                    Reset Bảng Điểm Game
                  </button>
                </div>
                
                {leaderboard.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center bg-slate-50/50">
                    <div className="text-6xl mb-6 grayscale opacity-20">🏆</div>
                    <div className="text-slate-500 font-bold uppercase tracking-widest">Chưa có người nào tham gia phiên bản này</div>
                  </div>
                ) : (
                  <div className="px-4 py-2">
                    {leaderboard.map((entry, idx) => (
                      <div key={entry.id} className="group flex items-center justify-between p-4 my-2 border border-slate-100 bg-white hover:bg-emerald-50 hover:border-emerald-200 rounded-2xl transition-all shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 flex items-center justify-center font-black text-xl rounded-[1.25rem] ${idx === 0 ? 'bg-amber-100 text-amber-600 shadow-inner' : idx === 1 ? 'bg-slate-100 text-slate-500' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 text-lg">{entry.name}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 group-hover:text-emerald-600/70 transition-colors">Lớp {entry.className} • {new Date(entry.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="font-black text-3xl tracking-tight bg-gradient-to-br from-emerald-500 to-green-600 bg-clip-text text-transparent px-4">
                          {entry.score}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Custom Dialog Modal */}
      {dialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-slate-100" onClick={e => e.stopPropagation()}>
            <p className="text-lg font-bold text-slate-700 mb-6 leading-relaxed">{dialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { dialog.onCancel?.(); setDialog(null); }} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors cursor-pointer">
                Hủy
              </button>
              <button onClick={() => { dialog.onConfirm(); setDialog(null); }} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer">
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-md text-center animate-[fadeIn_0.3s_ease]">
          {toast}
        </div>
      )}
    </div>
  );
}
