import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AdminPanelProps {
  onBack: () => void;
  onSaveQuestions: (questions: Question[]) => void;
  initialQuestions: Question[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onSaveQuestions, initialQuestions }) => {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Sync with initial questions or localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('keo-co-tri-tue-questions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        setQuestions(parsed);
      }
    }
  }, []);

  const saveToStorage = (newQuestions: Question[]) => {
    localStorage.setItem('keo-co-tri-tue-questions', JSON.stringify(newQuestions));
    onSaveQuestions(newQuestions);
  };

  const handleAddQuestion = () => {
    setEditingQuestion({
      id: uuidv4(),
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0
    });
    setIsAdding(true);
  };

  const handleSaveEdit = () => {
    if (!editingQuestion?.text || editingQuestion.options?.some(opt => !opt)) {
      alert('Vui lòng điền đầy đủ thông tin câu hỏi và các đáp án!');
      return;
    }

    let newQuestions;
    if (isAdding) {
      newQuestions = [...questions, editingQuestion as Question];
    } else {
      newQuestions = questions.map(q => q.id === editingQuestion.id ? (editingQuestion as Question) : q);
    }

    setQuestions(newQuestions);
    saveToStorage(newQuestions);
    setEditingQuestion(null);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      const newQuestions = questions.filter(q => q.id !== id);
      setQuestions(newQuestions);
      saveToStorage(newQuestions);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 pt-20 bg-[#0f172a] text-slate-200">
      <div className="flex justify-between items-center mb-10 max-w-5xl mx-auto w-full">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent uppercase tracking-tight">
            Quản Trị Ngân Hàng Câu Hỏi
          </h1>
          <p className="text-slate-500 font-medium mt-1">Quản lý nội dung cho trò chơi Kéo Co Trí Tuệ</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleAddQuestion}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            THÊM CÂU HỎI MỚI
          </button>
          <button 
            onClick={onBack}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors font-bold border border-slate-700"
          >
            TRỞ VỀ TRANG CHỦ
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full space-y-6">
        
        {/* Editing Modal/Section */}
        {editingQuestion && (
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-blue-500/30 p-8 shadow-2xl mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 text-xl">📝</span>
              {isAdding ? 'THÊM MỚI CÂU HỎI' : 'CHỈNH SỬA CÂU HỎI'}
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Nội dung câu hỏi</label>
                <textarea 
                  value={editingQuestion.text}
                  onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-6 py-4 text-lg text-white font-medium focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  placeholder="Nhập nội dung câu hỏi tại đây..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editingQuestion.options?.map((opt, idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex justify-between">
                      <span>ĐÁP ÁN {String.fromCharCode(65 + idx)}</span>
                      {editingQuestion.correctOptionIndex === idx && <span className="text-emerald-500">ĐÁP ÁN ĐÚNG</span>}
                    </label>
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(editingQuestion.options || [])];
                          newOpts[idx] = e.target.value;
                          setEditingQuestion({...editingQuestion, options: newOpts});
                        }}
                        className={`flex-1 bg-[#0f172a] border rounded-xl px-5 py-3 text-white font-medium focus:outline-none transition-colors shadow-inner ${editingQuestion.correctOptionIndex === idx ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-slate-700 focus:border-blue-500'}`}
                        placeholder={`Đáp án ${idx + 1}...`}
                      />
                      <button 
                        onClick={() => setEditingQuestion({...editingQuestion, correctOptionIndex: idx})}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${editingQuestion.correctOptionIndex === idx ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-900/40' : 'bg-slate-700 text-slate-500 hover:bg-slate-600'}`}
                        title="Đánh dấu là đáp án đúng"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
                <button 
                  onClick={() => setEditingQuestion(null)}
                  className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                >
                  HỦY BỎ
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
                >
                  LƯU CÂU HỎI
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">📊</span>
              DANH SÁCH CÂU HỎI ({questions.length})
            </h3>
          </div>

          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-20 bg-[#0f172a]/50 rounded-2xl border border-dashed border-slate-700">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-slate-500 font-bold text-lg">Chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên!</p>
              </div>
            ) : (
              questions.map((q, index) => (
                <div key={q.id} className="group flex items-center gap-6 bg-[#0f172a]/80 hover:bg-[#0f172a] border border-white/5 p-6 rounded-2xl transition-all hover:scale-[1.01] hover:border-blue-500/30">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex flex-col items-center justify-center font-black text-slate-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <span className="text-[10px] leading-none mb-1 uppercase opacity-50">CÂU</span>
                    <span className="text-lg leading-none">{index + 1}</span>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-lg font-bold text-white mb-2 leading-tight">{q.text}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt, oIdx) => (
                        <span key={oIdx} className={`text-[10px] font-bold px-2 py-1 rounded border ${oIdx === q.correctOptionIndex ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}>
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingQuestion(q);
                        setIsAdding(false);
                      }}
                      className="p-3 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-all"
                      title="Chỉnh sửa"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(q.id)}
                      className="p-3 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all"
                      title="Xóa"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 py-6 border-t border-slate-800 max-w-5xl mx-auto w-full flex justify-between items-center opacity-50">
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-xs">SG</div>
            <span className="text-xs font-bold text-slate-400">DỮ LIỆU ĐANG ĐƯỢC LƯU LOCAL (LOCALSTORAGE)</span>
        </div>
        <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase italic">Hệ thống quản lý giáo dục GIAOVIENCN</p>
      </div>
    </div>
  );
};

export default AdminPanel;
