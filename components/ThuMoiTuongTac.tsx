import React, { useEffect, useState, useRef } from 'react';
import { saveSharedThuMoi, updateSharedThuMoi, getSharedThuMoi, checkStudentRSVP, saveStudentRSVP, getUserThuMoiList, getRSVPs } from '../utils/firebaseThuMoi';
import { Mail, Users, Plus, ArrowLeft, Calendar, MapPin, X, CheckCircle, XCircle, Pencil } from 'lucide-react';

interface Props {
  onBack: () => void;
  sharedId?: string | null;
  user?: { email: string; name: string; id?: string } | null;
  onRequireLogin?: () => void;
}

const ThuMoiTuongTac: React.FC<Props> = ({ onBack, sharedId, user, onRequireLogin }) => {
  const [view, setView] = useState<'DASHBOARD' | 'IFRAME'>(sharedId ? 'IFRAME' : 'DASHBOARD');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [editingShortId, setEditingShortId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Dashboard states
  const [thuMoiList, setThuMoiList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!sharedId);
  
  // RSVP Modal states
  const [showRsvpModal, setShowRsvpModal] = useState<{shortId: string, className: string} | null>(null);
  const [rsvpData, setRsvpData] = useState<any[]>([]);
  const [loadingRsvp, setLoadingRsvp] = useState(false);

  useEffect(() => {
    if (!sharedId && !user && onRequireLogin) {
      onRequireLogin();
      return;
    }
    
    if (!sharedId && user?.email) {
      loadUserList();
    }
  }, [sharedId, user, onRequireLogin]);

  const loadUserList = async () => {
    setIsLoading(true);
    if (user?.email) {
      const list = await getUserThuMoiList(user.email);
      setThuMoiList(list);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const loadSharedData = async () => {
      if (sharedId) {
        const config = await getSharedThuMoi(sharedId);
        if (config) {
          const encoded = btoa(encodeURIComponent(JSON.stringify(config)));
          setIframeSrc(`/thumoiphtuongtac/thumoiphtuongtac/index.html?id=${sharedId}#${encoded}`);
        } else {
          setIframeSrc('/thumoiphtuongtac/thumoiphtuongtac/index.html');
        }
      }
    };
    if (view === 'IFRAME' && sharedId) {
      loadSharedData();
    } else if (view === 'IFRAME' && !sharedId && !editingShortId) {
      setIframeSrc('/thumoiphtuongtac/thumoiphtuongtac/index.html');
    }
  }, [sharedId, view, editingShortId]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Xác nhận message từ iframe Thư mời
      if (event.data && event.data.type === 'THU_MOI_SHARE') {
        const config = event.data.config;
        if (config) {
          const updated = editingShortId
            ? await updateSharedThuMoi(editingShortId, config, user?.id, user?.email)
            : true;
          const shortId = editingShortId || await saveSharedThuMoi(config, user?.id, user?.email);
          if (shortId) {
            const shortUrl = `${window.location.origin}?app=thu_moi_tuong_tac&id=${shortId}`;
            iframeRef.current?.contentWindow?.postMessage({
              type: 'THU_MOI_SHORT_URL',
              url: shortUrl,
              closeAfterSave: Boolean(event.data.closeAfterSave && editingShortId && updated)
            }, '*');
            if (updated && editingShortId) {
              loadUserList();
            } else if (editingShortId && !updated) {
              alert('Chưa cập nhật được thư mời. Vui lòng thử lại.');
            }
          } else {
            const encoded = event.data.encoded;
            const fallbackUrl = `${window.location.origin}/thumoiphtuongtac/thumoiphtuongtac/index.html?id=${shortId}#${encoded}`;
            iframeRef.current?.contentWindow?.postMessage({
              type: 'THU_MOI_SHORT_URL',
              url: fallbackUrl
            }, '*');
          }
        }
      } else if (event.data && event.data.type === 'CHECK_RSVP') {
        const { studentName, requestId } = event.data;
        if (sharedId && studentName) {
            const hasSubmitted = await checkStudentRSVP(sharedId, studentName);
            iframeRef.current?.contentWindow?.postMessage({
                type: 'RSVP_CHECK_RESULT',
                requestId,
                hasSubmitted
            }, '*');
        }
      } else if (event.data && event.data.type === 'SAVE_RSVP') {
        const { studentName, parentName, attendance } = event.data;
        if (sharedId && studentName) {
            await saveStudentRSVP(sharedId, studentName, parentName, attendance);
        }
      } else if (event.data && event.data.type === 'THU_MOI_CLOSE_EDITOR') {
        setView('DASHBOARD');
        setEditingShortId(null);
        setIframeSrc(null);
        loadUserList();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sharedId, user, editingShortId]);

  const handleOpenRsvp = async (shortId: string, className: string) => {
    setShowRsvpModal({ shortId, className });
    setLoadingRsvp(true);
    const data = await getRSVPs(shortId);
    setRsvpData(data);
    setLoadingRsvp(false);
  };

  const handleCreateNew = () => {
    setEditingShortId(null);
    setIframeSrc('/thumoiphtuongtac/thumoiphtuongtac/index.html');
    setView('IFRAME');
  };

  const handleEditInvitation = (item: any) => {
    const encoded = btoa(encodeURIComponent(JSON.stringify(item.config || {})));
    setEditingShortId(item.shortId);
    setIframeSrc(`/thumoiphtuongtac/thumoiphtuongtac/index.html?edit=${item.shortId}#${encoded}`);
    setView('IFRAME');
  };

  const handleCloseIframe = () => {
    if (sharedId) {
      onBack(); // Nếu là link xem thẳng thì back về nơi xuất phát
    } else {
      setView('DASHBOARD');
      setEditingShortId(null);
      loadUserList(); // Load lại để update ds
    }
  };

  if (!sharedId && !user) {
    return null;
  }

  return (
    <div className="flex flex-col bg-slate-900" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur-sm border-b border-white/10 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={view === 'IFRAME' ? handleCloseIframe : onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {view === 'IFRAME' && !sharedId ? 'Quay lại' : 'Quay lại'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">✉️</span>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">Thư Mời Họp Phụ Huynh</h1>
              <p className="text-white/50 text-xs">{view === 'DASHBOARD' ? 'Bảng điều khiển giáo viên' : 'Tạo thư mời tương tác'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD VIEW */}
      {view === 'DASHBOARD' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Thư mời của bạn</h2>
                <p className="text-white/60">Quản lý các thư mời và xem danh sách phụ huynh xác nhận.</p>
              </div>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-pink-500/25"
              >
                <Plus className="w-5 h-5" />
                Tạo thư mời mới
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : thuMoiList.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-white/50" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Chưa có thư mời nào</h3>
                <p className="text-white/50 mb-6">Bạn chưa tạo thư mời họp phụ huynh nào. Hãy bắt đầu tạo ngay nhé!</p>
                <button
                  onClick={handleCreateNew}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all border border-white/10"
                >
                  Tạo thư mời đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {thuMoiList.map((item) => (
                  <div key={item.shortId} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-pink-500/50 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">Lớp {item.config?.className || 'Chưa rõ'}</h3>
                        <p className="text-white/50 text-sm flex items-center gap-1"><Calendar className="w-4 h-4"/> {new Date(item.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <div className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {item.rsvpCount || 0}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex items-start gap-2 text-sm text-white/70">
                        <Calendar className="w-4 h-4 mt-0.5 text-white/40 flex-shrink-0" />
                        <span className="line-clamp-1">{item.config?.date || 'Chưa rõ thời gian'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-white/70">
                        <MapPin className="w-4 h-4 mt-0.5 text-white/40 flex-shrink-0" />
                        <span className="line-clamp-1">{item.config?.location || 'Chưa rõ địa điểm'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenRsvp(item.shortId, item.config?.className || '')}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                      >
                        Xem phản hồi
                      </button>
                      <button
                        onClick={() => handleEditInvitation(item)}
                        className="p-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 rounded-xl transition-colors"
                        title="Chỉnh sửa thư mời"
                        aria-label="Chỉnh sửa thư mời"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                            const url = `${window.location.origin}?app=thu_moi_tuong_tac&id=${item.shortId}`;
                            navigator.clipboard.writeText(url);
                            alert('Đã copy link thư mời!');
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                        title="Copy link"
                      >
                        🔗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* IFRAME VIEW */}
      {view === 'IFRAME' && (
        <div className="flex-1 relative">
          {iframeSrc ? (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="Thư Mời Họp Phụ Huynh"
              className="w-full h-full border-none bg-white"
              allow="autoplay; clipboard-write"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-white h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/70">Đang tải thư mời...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RSVP Modal */}
      {showRsvpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h3 className="text-2xl font-bold text-white">Danh sách phản hồi</h3>
                <p className="text-white/50">Lớp {showRsvpModal.className}</p>
              </div>
              <button 
                onClick={() => setShowRsvpModal(null)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingRsvp ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : rsvpData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/50">Chưa có phụ huynh nào gửi phản hồi.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-700">
                  <table className="w-full text-left text-sm text-white/80">
                    <thead className="bg-slate-800 text-xs uppercase font-semibold text-white/60">
                      <tr>
                        <th className="px-6 py-4 rounded-tl-2xl">Thời gian</th>
                        <th className="px-6 py-4">Phụ huynh</th>
                        <th className="px-6 py-4">Học sinh</th>
                        <th className="px-6 py-4 rounded-tr-2xl">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {rsvpData.map((item, idx) => {
                        const isAttend = item.attendance ? item.attendance.toLowerCase().includes('tham dự') : true;
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-white/50">
                              {new Date(item.timestamp).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 font-medium text-white">
                              {item.parentName || <span className="text-white/30 italic">Không có tên</span>}
                            </td>
                            <td className="px-6 py-4">
                              {item.studentName}
                            </td>
                            <td className="px-6 py-4">
                              {isAttend ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium text-xs">
                                  <CheckCircle className="w-3.5 h-3.5" /> Tham dự
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 font-medium text-xs">
                                  <XCircle className="w-3.5 h-3.5" /> Vắng mặt
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThuMoiTuongTac;
