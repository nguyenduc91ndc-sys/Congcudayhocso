import React, { useEffect, useState, useRef } from 'react';
import { saveSharedThuMoi, updateSharedThuMoi, getSharedThuMoi, checkStudentRSVP, saveStudentRSVP, getUserThuMoiList, getRSVPs, deleteStudentRSVP } from '../utils/firebaseThuMoi';
import { Mail, Users, Plus, ArrowLeft, Calendar, MapPin, X, CheckCircle, XCircle, Pencil, ExternalLink, Trash2 } from 'lucide-react';

interface Props {
  onBack: () => void;
  sharedId?: string | null;
  user?: { email: string; name: string; id?: string } | null;
  onRequireLogin?: () => void;
}

const FACEBOOK_PROFILE_URL = 'https://www.facebook.com/duc.the3?locale=vi_VN';

const ThuMoiTuongTac: React.FC<Props> = ({ onBack, sharedId, user, onRequireLogin }) => {
  const [view, setView] = useState<'DASHBOARD' | 'IFRAME'>(sharedId ? 'IFRAME' : 'DASHBOARD');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [iframeLoadError, setIframeLoadError] = useState('');
  const [editingShortId, setEditingShortId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Dashboard states
  const [thuMoiList, setThuMoiList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!sharedId);
  const [dashboardError, setDashboardError] = useState('');
  
  // RSVP Modal states
  const [showRsvpModal, setShowRsvpModal] = useState<{shortId: string, className: string} | null>(null);
  const [rsvpData, setRsvpData] = useState<any[]>([]);
  const [loadingRsvp, setLoadingRsvp] = useState(false);
  const [deletingRsvpId, setDeletingRsvpId] = useState<string | null>(null);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 10000): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('LOAD_TIMEOUT')), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

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
    setDashboardError('');
    try {
      if (user?.email) {
        const list = await withTimeout(getUserThuMoiList(user.email), 10000);
        setThuMoiList(list);
      }
    } catch (error) {
      console.error('[ThuMoiTuongTac] Cannot load user invitations:', error);
      setDashboardError('Chưa tải được danh sách thư mời. Bạn vẫn có thể tạo thư mới, hoặc bấm tải lại sau vài giây.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadSharedData = async () => {
      if (sharedId) {
        setIframeSrc(null);
        setIframeLoadError('');
        try {
          const config = await withTimeout(getSharedThuMoi(sharedId));
          if (config) {
            const encoded = btoa(encodeURIComponent(JSON.stringify(config)));
            setIframeSrc(`/thumoiphtuongtac/thumoiphtuongtac/index.html?id=${sharedId}#${encoded}`);
          } else {
            setIframeLoadError('Không tìm thấy dữ liệu thư mời. Link có thể đã bị xóa hoặc chưa được lưu thành công.');
          }
        } catch (error) {
          console.error('[ThuMoiTuongTac] Cannot load shared invitation:', error);
          setIframeLoadError('Mạng hoặc Firebase phản hồi quá lâu. Vui lòng tải lại trang hoặc gửi lại link mới.');
        }
      }
    };
    if (view === 'IFRAME' && sharedId) {
      loadSharedData();
    } else if (view === 'IFRAME' && !sharedId && !editingShortId) {
      setIframeLoadError('');
      setIframeSrc('/thumoiphtuongtac/thumoiphtuongtac/index.html');
    }
  }, [sharedId, view, editingShortId]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Xác nhận message từ iframe Thư mời
      if (event.data && event.data.type === 'THU_MOI_SHARE') {
        const config = event.data.config;
        if (config) {
          try {
          const updated = editingShortId
            ? await withTimeout(updateSharedThuMoi(editingShortId, config, user?.id, user?.email), 12000)
            : true;
          const shortId = editingShortId
            ? editingShortId
            : await withTimeout(saveSharedThuMoi(config, user?.id, user?.email), 12000);
          if (!shortId || !updated) {
            throw new Error(editingShortId ? 'UPDATE_FAILED' : 'SAVE_FAILED');
          }
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
          } catch (error) {
            console.error('[ThuMoiTuongTac] Cannot save shared invitation:', error);
            const encoded = event.data.encoded;
            const fallbackUrl = encoded
              ? `${window.location.origin}/thumoiphtuongtac/thumoiphtuongtac/index.html#${encoded}`
              : '';
            iframeRef.current?.contentWindow?.postMessage({
              type: 'THU_MOI_SAVE_ERROR',
              fallbackUrl
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

  const handleDeleteRsvp = async (item: any) => {
    if (!showRsvpModal || !item?.id) return;
    const studentName = item.studentName || 'phản hồi này';
    const confirmed = window.confirm(`Xóa phản hồi của học sinh "${studentName}"? Thao tác này không thể hoàn tác.`);
    if (!confirmed) return;

    setDeletingRsvpId(item.id);
    const success = await deleteStudentRSVP(showRsvpModal.shortId, item.id);
    setDeletingRsvpId(null);

    if (!success) {
      alert('Chưa xóa được phản hồi. Vui lòng thử lại.');
      return;
    }

    setRsvpData(prev => prev.filter(rsvp => rsvp.id !== item.id));
    loadUserList();
  };

  const handleCreateNew = () => {
    setEditingShortId(null);
    setIframeLoadError('');
    setIframeSrc('/thumoiphtuongtac/thumoiphtuongtac/index.html');
    setView('IFRAME');
  };

  const handleEditInvitation = (item: any) => {
    const encoded = btoa(encodeURIComponent(JSON.stringify(item.config || {})));
    setEditingShortId(item.shortId);
    setIframeLoadError('');
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

  const isAttendResponse = (attendance?: string) => {
    const normalized = (attendance || 'Tham dự')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalized.includes('tham') || !normalized.includes('vang');
  };

  const rsvpSummary = rsvpData.reduce(
    (summary, item) => {
      if (isAttendResponse(item.attendance)) {
        summary.attend += 1;
      } else {
        summary.absent += 1;
      }
      summary.total += 1;
      return summary;
    },
    { total: 0, attend: 0, absent: 0 }
  );

  return (
    <div className="flex flex-col bg-slate-900" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur-sm border-b border-white/10 flex-shrink-0 z-10">
        <div className="flex min-w-0 items-center gap-3">
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
        {!sharedId && (
        <a
          href={FACEBOOK_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-3 inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1877f2] px-3 py-2 text-xs font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-[#0f66d8] sm:px-4 sm:text-sm"
          title="Theo dõi Facebook"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black text-[#1877f2]">f</span>
          <span className="hidden sm:inline">Theo dõi Facebook</span>
          <span className="sm:hidden">Facebook</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        )}
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
            ) : dashboardError ? (
              <div className="bg-slate-800/50 border border-amber-400/30 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-amber-200" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Chưa tải được danh sách</h3>
                <p className="text-white/60 mb-6">{dashboardError}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={loadUserList}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all border border-white/10"
                  >
                    Tải lại danh sách
                  </button>
                  <button
                    onClick={handleCreateNew}
                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-pink-500/25"
                  >
                    Tạo thư mời mới
                  </button>
                </div>
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
          ) : iframeLoadError ? (
            <div className="flex h-full items-center justify-center bg-slate-950 p-6 text-white">
              <div className="max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl">
                <Mail className="mx-auto mb-3 h-10 w-10 text-pink-200" />
                <h2 className="text-xl font-bold">Chưa mở được thư mời</h2>
                <p className="mt-3 text-sm leading-6 text-white/70">{iframeLoadError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-5 rounded-2xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white"
                >
                  Tải lại
                </button>
              </div>
            </div>
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
                <>
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Tổng phản hồi</p>
                    <p className="mt-2 text-3xl font-black text-white">{rsvpSummary.total}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">Tham dự</p>
                    <p className="mt-2 text-3xl font-black text-emerald-300">{rsvpSummary.attend}</p>
                  </div>
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-200/80">Vắng mặt</p>
                    <p className="mt-2 text-3xl font-black text-rose-300">{rsvpSummary.absent}</p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-700">
                  <table className="w-full text-left text-sm text-white/80">
                    <thead className="bg-slate-800 text-xs uppercase font-semibold text-white/60">
                      <tr>
                        <th className="px-6 py-4 rounded-tl-2xl">Thời gian</th>
                        <th className="px-6 py-4">Phụ huynh</th>
                        <th className="px-6 py-4">Học sinh</th>
                        <th className="px-6 py-4">Trạng thái</th>
                        <th className="px-6 py-4 rounded-tr-2xl text-right">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {rsvpData.map((item, idx) => {
                        const isAttend = isAttendResponse(item.attendance);
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
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteRsvp(item)}
                                disabled={deletingRsvpId === item.id}
                                className="inline-flex items-center justify-center rounded-xl bg-rose-500/10 p-2 text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-wait disabled:opacity-50"
                                title="Xóa phản hồi"
                                aria-label="Xóa phản hồi"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThuMoiTuongTac;
