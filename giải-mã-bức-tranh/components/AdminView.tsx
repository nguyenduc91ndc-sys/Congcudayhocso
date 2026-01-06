
import React, { useState } from 'react';
import { GameConfig, Question, QuestionStyles, FirebaseUser } from '../types';
import Button from './Button';
import { saveGameConfig } from '../utils/firebaseGameConfigs';

interface AdminViewProps {
  config: GameConfig;
  onUpdateConfig: (config: GameConfig) => void;
  onExit: () => void;
  user?: FirebaseUser | null;
}

const AdminView: React.FC<AdminViewProps> = ({ config, onUpdateConfig, onExit, user }) => {
  const [localConfig, setLocalConfig] = useState<GameConfig>(config);
  const [successMsg, setSuccessMsg] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLocalConfig({ ...localConfig, hiddenImage: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      content: 'Câu hỏi mới?',
      options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
      correctIndex: 0,
      styles: { questionFontSize: '1.5rem', questionColor: '#1f2937', optionsFontSize: '1.125rem', optionsColor: '#1f2937' }
    };
    setLocalConfig({ ...localConfig, questions: [...localConfig.questions, newQuestion] });
  };

  const removeQuestion = (id: string) => setLocalConfig({ ...localConfig, questions: localConfig.questions.filter(q => q.id !== id) });
  const updateQuestion = (id: string, updates: Partial<Question>) => setLocalConfig({ ...localConfig, questions: localConfig.questions.map(q => q.id === id ? { ...q, ...updates } : q) });
  const updateStyles = (id: string, styleUpdates: Partial<QuestionStyles>) => setLocalConfig({ ...localConfig, questions: localConfig.questions.map(q => q.id === id ? { ...q, styles: { ...(q.styles || {}), ...styleUpdates } } : q) });

  const handleSave = async () => {
    // 1. Lưu cục bộ
    onUpdateConfig(localConfig);

    // 2. Lưu lên Firebase để lấy link
    setIsSaving(true);
    try {
      const gameId = await saveGameConfig(localConfig, user?.uid);
      const baseUrl = window.location.origin + window.location.pathname;
      const link = `${baseUrl}?gameId=${gameId}`;
      setShareLink(link);
      setSuccessMsg('Đã lưu & Tạo link thành công!');
    } catch (error) {
      console.error('Error saving game:', error);
      setSuccessMsg('Đã lưu nháp (Lỗi tạo link online)');
    } finally {
      setIsSaving(false);
      // Giữ thông báo lâu hơn chút để người dùng kịp đọc
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleShare = async () => {
    setIsSaving(true);
    try {
      // Lưu config lên Firebase và lấy gameId ngắn gọn
      const gameId = await saveGameConfig(localConfig, user?.uid);
      const baseUrl = window.location.origin + window.location.pathname;
      const link = `${baseUrl}?gameId=${gameId}`;
      setShareLink(link);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error creating share link:', error);
      setSuccessMsg('Lỗi tạo link! Vui lòng thử lại.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareLink);
        setSuccessMsg('Đã sao chép link!');
        setTimeout(() => setSuccessMsg(''), 2000);
      } else {
        // Fallback for older browsers or when clipboard API is blocked
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setSuccessMsg('Đã sao chép link!');
        setTimeout(() => setSuccessMsg(''), 2000);
      }
    } catch (err) {
      // Ultimate fallback - show prompt to copy manually
      console.error('Copy failed:', err);
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setSuccessMsg('Đã sao chép link!');
      } catch (e) {
        setSuccessMsg('Không thể copy tự động. Hãy copy thủ công.');
      }
      document.body.removeChild(textArea);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col p-6 animate-fade-in overflow-auto">

      {/* Modal Notification (Better than Alert) */}
      {successMsg && (
        <div
          onClick={() => setSuccessMsg('')}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in cursor-pointer"
        >
          <div className="bg-white rounded-3xl p-8 shadow-2xl transform transition-all scale-100 flex flex-col items-center gap-4 animate-bounce-short border-4 border-green-400">
            <div className="text-6xl">🎉</div>
            <h3 className="text-2xl font-black text-gray-800 text-center">
              {successMsg}
            </h3>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center glass-card p-5 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
            ⚙️
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">QUẢN TRỊ TRÒ CHƠI</h2>
            <p className="text-indigo-300 text-sm font-semibold">Tạo quiz và chia sẻ cho học sinh</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="cute-3d-button px-6"
            style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', boxShadow: '0 6px 0 #0d7d71, 0 10px 20px rgba(17, 153, 142, 0.4)' }}
          >
            🔗 Tạo Link Chia Sẻ
          </button>
          <button
            onClick={onExit}
            className="cute-3d-button px-6"
            style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', boxShadow: '0 6px 0 #d64469, 0 10px 20px rgba(245, 87, 108, 0.4)' }}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Xem trước ảnh */}
        <div className="flex flex-col gap-6">
          <div className="bg-white/90 backdrop-blur-xl shadow-xl rounded-3xl border border-white/50 p-6 flex flex-col items-center">
            <h3 className="font-bold text-indigo-700 mb-4 flex items-center gap-2 text-lg">
              🖼️ BỨC TRANH BÍ ẨN
            </h3>
            <div className="relative aspect-video w-full rounded-2xl border-4 border-dashed border-indigo-200 overflow-hidden group hover:border-indigo-400 transition-all bg-gradient-to-br from-indigo-50 to-purple-50">
              {localConfig.hiddenImage ? (
                <img src={localConfig.hiddenImage} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-indigo-300 font-bold">
                  <span className="text-5xl mb-2">🎨</span>
                  <span>Chưa có ảnh</span>
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm gap-2">
                <span className="text-white font-bold bg-indigo-500 px-6 py-3 rounded-xl hover:bg-indigo-600 transition-colors">
                  📤 Tải ảnh mới
                </span>
                <span className="text-white/70 text-sm">Nhấn để chọn ảnh</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl shadow-xl rounded-3xl border border-white/50 p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-indigo-800">📊 Trạng thái:</span>
              <span className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-black rounded-full shadow-lg">
                ✓ SẴN SÀNG
              </span>
            </div>
            <p className="text-sm text-indigo-600 leading-relaxed">
              Tạo câu hỏi và lưu lại, sau đó nhấn <strong>"Tạo Link Chia Sẻ"</strong> để gửi cho học sinh.
            </p>
          </div>
        </div>

        {/* Cột phải (2 phần): Danh sách câu hỏi */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white/90 backdrop-blur-xl shadow-xl rounded-3xl border border-white/50 p-6 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-indigo-100">
              <h3 className="font-bold text-indigo-700 flex items-center gap-2 text-xl">
                📝 DANH SÁCH CÂU HỎI ({localConfig.questions.length})
              </h3>
              <button
                onClick={addQuestion}
                className="cute-3d-button"
                style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', boxShadow: '0 6px 0 #0d7d71, 0 10px 20px rgba(17, 153, 142, 0.4)' }}
              >
                + Thêm câu hỏi
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 max-h-[500px]">
              {localConfig.questions.map((q, qIdx) => (
                <div key={q.id} className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl relative group transition-all hover:shadow-lg border-2 border-transparent hover:border-indigo-200">
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg font-black text-xl z-10 opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-black text-indigo-600 mb-2 uppercase tracking-tight">
                        Câu hỏi {qIdx + 1}:
                      </label>
                      <textarea
                        id={`question-${q.id}`}
                        value={q.content}
                        onChange={(e) => updateQuestion(q.id, { content: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        autoComplete="off"
                        className="w-full p-4 rounded-xl min-h-[80px] font-bold resize-none focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                      />
                      <div className="mt-3 flex gap-6 items-center bg-white p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500">CỠ CHỮ:</span>
                          <select
                            value={q.styles?.questionFontSize}
                            onChange={(e) => updateStyles(q.id, { questionFontSize: e.target.value })}
                            className="text-sm p-2 border rounded-lg bg-indigo-50 font-semibold"
                          >
                            {['1rem', '1.25rem', '1.5rem', '1.875rem', '2.25rem'].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500">MÀU:</span>
                          <input
                            type="color"
                            value={q.styles?.questionColor || '#1f2937'}
                            onChange={(e) => updateStyles(q.id, { questionColor: e.target.value })}
                            className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx}>
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="radio"
                              checked={q.correctIndex === oIdx}
                              onChange={() => updateQuestion(q.id, { correctIndex: oIdx })}
                              className="w-5 h-5 accent-green-500"
                            />
                            <span className={`text-xs font-bold ${q.correctIndex === oIdx ? 'text-green-600' : 'text-gray-500'}`}>
                              ĐÁP ÁN {String.fromCharCode(65 + oIdx)} {q.correctIndex === oIdx && '✓'}
                            </span>
                          </div>
                          <input
                            id={`option-${q.id}-${oIdx}`}
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[oIdx] = e.target.value;
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoComplete="off"
                            className={`w-full p-3 rounded-xl font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none ${q.correctIndex === oIdx ? 'border-green-300 bg-green-50 ring-2 ring-green-200' : 'bg-white'}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {localConfig.questions.length === 0 && (
                <div className="text-center py-16 text-indigo-300">
                  <span className="text-6xl block mb-4">📝</span>
                  <p className="font-bold text-lg">Chưa có câu hỏi nào</p>
                  <p className="text-sm mt-2">Nhấn "Thêm câu hỏi" để bắt đầu</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-6 border-t border-indigo-100">
              {/* Preview Button - Always visible, constructs temporary link or just disabled until saved?
                  Actually, Preview implies viewing the LIVE link. So we should probably Save before Preview too?
                  Let's make Copy Link do Save+Copy. 
                  And Preview do Save+Open? or just Open if exists.
                  Let's keep it simple: Show buttons always.
                */}
              <button
                type="button"
                onClick={async () => {
                  // Save & Open
                  setIsSaving(true);
                  try {
                    const gameId = await saveGameConfig(localConfig, user?.uid);
                    const baseUrl = window.location.origin + window.location.pathname;
                    const link = `${baseUrl}?gameId=${gameId}`;
                    setShareLink(link);
                    window.open(link, '_blank');
                  } catch (e) {
                    console.error(e);
                    setSuccessMsg('Lỗi khi mở xem thử!');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="transition-transform hover:scale-105"
                style={{
                  background: 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '16px',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  marginRight: '10px'
                }}
                disabled={isSaving}
              >
                👁️ Xem thử
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Save & Copy
                  setIsSaving(true);
                  try {
                    const gameId = await saveGameConfig(localConfig, user?.uid);
                    const baseUrl = window.location.origin + window.location.pathname;
                    const link = `${baseUrl}?gameId=${gameId}`;
                    setShareLink(link);

                    // Copy logic
                    if (navigator.clipboard) {
                      await navigator.clipboard.writeText(link);
                    } else {
                      // Fallback
                      const textArea = document.createElement('textarea');
                      textArea.value = link;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                    }
                    setSuccessMsg('✅ Đã tạo link & Copy thành công!');

                    // Auto hide after 1 second (Quick!)
                    setTimeout(() => setSuccessMsg(''), 1000);
                  } catch (e) {
                    console.error(e);
                    setSuccessMsg('❌ Lỗi khi tạo link!');
                    setTimeout(() => setSuccessMsg(''), 1000);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="transition-transform hover:scale-105"
                style={{
                  background: '#fff',
                  color: '#10b981',
                  border: '2px solid #10b981',
                  borderRadius: '16px',
                  padding: '14px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  marginRight: '10px'
                }}
                disabled={isSaving}
              >
                📋 Copy Link
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }}
                disabled={isSaving}
                style={{
                  background: isSaving ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px 48px',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 0 #4c51bf, 0 10px 20px rgba(102, 126, 234, 0.4)',
                  pointerEvents: 'auto'
                }}
              >
                {isSaving ? '⏳ Đang lưu...' : '💾 LƯU CẤU HÌNH'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#4338ca', marginBottom: '8px' }}>
              Link Chia Sẻ Đã Sẵn Sàng!
            </h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              Gửi link này cho học sinh để các em có thể chơi ngay
            </p>

            <div style={{
              backgroundColor: '#e0e7ff',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <p style={{
                color: '#3730a3',
                fontFamily: 'monospace',
                fontSize: '14px',
                wordBreak: 'break-all',
                textAlign: 'left'
              }}>
                {shareLink.length > 100 ? shareLink.substring(0, 100) + '...' : shareLink}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  copyToClipboard();
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #0d7d71, 0 6px 15px rgba(17, 153, 142, 0.4)',
                  pointerEvents: 'auto'
                }}
              >
                📋 Sao chép Link
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowShareModal(false);
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #4c51bf, 0 6px 15px rgba(102, 126, 234, 0.4)',
                  pointerEvents: 'auto'
                }}
              >
                Đóng
              </button>
            </div>

            <p style={{ fontSize: '14px', color: '#999', marginTop: '24px' }}>
              💡 Lưu ý: Học sinh chỉ cần mở link và nhập tên để chơi
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
