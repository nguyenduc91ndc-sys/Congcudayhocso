import React, { useEffect, useState, useRef } from 'react';
import { saveSharedThuMoi, getSharedThuMoi, checkStudentRSVP, saveStudentRSVP } from '../utils/firebaseThuMoi';

interface Props {
  onBack: () => void;
  sharedId?: string | null;
  user?: { email: string; name: string } | null;
  onRequireLogin?: () => void;
}

const ThuMoiTuongTac: React.FC<Props> = ({ onBack, sharedId, user, onRequireLogin }) => {
  const [iframeSrc, setIframeSrc] = useState<string | null>(sharedId ? null : '/thumoiphtuongtac/thumoiphtuongtac/index.html');
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
    loadSharedData();
  }, [sharedId]);

  useEffect(() => {
    if (!sharedId && !user && onRequireLogin) {
      onRequireLogin();
    }
  }, [sharedId, user, onRequireLogin]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Xác nhận message từ iframe Thư mời
      if (event.data && event.data.type === 'THU_MOI_SHARE') {
        const config = event.data.config;
        if (config) {
          const shortId = await saveSharedThuMoi(config);
          if (shortId) {
            const shortUrl = `${window.location.origin}?app=thu_moi_tuong_tac&id=${shortId}`;
            // Gửi link rút gọn về lại iframe
            iframeRef.current?.contentWindow?.postMessage({
              type: 'THU_MOI_SHORT_URL',
              url: shortUrl
            }, '*');
          } else {
            // Fallback nếu lưu lỗi
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
        const { studentName } = event.data;
        if (sharedId && studentName) {
            await saveStudentRSVP(sharedId, studentName);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!sharedId && !user) {
    return null;
  }

  return (
    <div className="flex flex-col bg-slate-900" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/80 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all font-medium text-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Quay lại
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">✉️</span>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">Thư Mời Họp Phụ Huynh</h1>
            <p className="text-white/50 text-xs">Tạo thư mời tương tác & nhận xác nhận phụ huynh</p>
          </div>
        </div>
      </div>

      {/* Iframe */}
      {iframeSrc ? (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="Thư Mời Họp Phụ Huynh"
          className="flex-1 w-full border-none"
          style={{ height: 'calc(100vh - 56px)' }}
          allow="autoplay; clipboard-write"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/70">Đang tải thư mời...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThuMoiTuongTac;
