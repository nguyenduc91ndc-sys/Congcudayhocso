import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Facebook, Heart, Laptop, Loader2, LogIn, MessageCircle, RefreshCw, ShieldCheck, Sparkles, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';
import type { User as PlatformUser } from '../../types';
import {
  checkHappyClassAccess,
  getFirebaseTeacher,
  signInFirebaseTeacher,
  signOutFirebaseTeacher,
  watchFirebaseTeacher,
  type HappyClassAccessDecision,
} from './firebase';

const ZALO_GROUP_N2_URL = 'https://zalo.me/g/xllue7odsjmevwrgwll6';
const FACEBOOK_URL = 'https://www.facebook.com/duc.the3?locale=vi_VN';

type GateStatus = 'checking' | 'allowed' | 'auth-required' | 'denied' | 'revoked' | 'device-limit' | 'account-mismatch' | 'error';

type HappyClassAccessGateProps = {
  platformUser: PlatformUser | null;
  onBack: () => void;
  onSwitchAccount: () => void;
  children: React.ReactNode;
};

function isLocalPreviewUser(user: PlatformUser | null) {
  return import.meta.env.DEV && user?.email === 'dev-preview@giaovien.local';
}

export default function HappyClassAccessGate({ platformUser, onBack, onSwitchAccount, children }: HappyClassAccessGateProps) {
  const [status, setStatus] = useState<GateStatus>(() => isLocalPreviewUser(platformUser) ? 'allowed' : 'checking');
  const [decision, setDecision] = useState<HappyClassAccessDecision | null>(null);
  const [detail, setDetail] = useState('');
  const [qrCode, setQrCode] = useState('');
  const email = platformUser?.email?.trim().toLowerCase() || '';

  useEffect(() => {
    QRCode.toDataURL(ZALO_GROUP_N2_URL, { width: 260, margin: 2, color: { dark: '#17113f', light: '#ffffff' } })
      .then(setQrCode)
      .catch(() => setQrCode(''));
  }, []);

  const verify = useCallback(async () => {
    if (isLocalPreviewUser(platformUser)) {
      setStatus('allowed');
      return;
    }
    if (!email) {
      setStatus('denied');
      setDetail('Tài khoản hiện tại chưa có email Google để kiểm tra quyền.');
      return;
    }
    if (!getFirebaseTeacher()) {
      setStatus('auth-required');
      return;
    }

    setStatus('checking');
    setDetail('');
    try {
      const result = await checkHappyClassAccess(email);
      setDecision(result);
      setStatus(result.status);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'FIREBASE_SIGN_IN_REQUIRED') setStatus('auth-required');
      else {
        setStatus('error');
        setDetail('Chưa thể kiểm tra quyền truy cập. Dữ liệu trên máy vẫn được giữ nguyên; vui lòng kiểm tra Internet rồi thử lại.');
      }
    }
  }, [email, platformUser]);

  useEffect(() => {
    if (isLocalPreviewUser(platformUser)) return;
    let cancelled = false;
    const unsubscribe = watchFirebaseTeacher(() => {
      if (!cancelled) void verify();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [platformUser, verify]);

  const reconnectGoogle = async () => {
    setStatus('checking');
    setDetail('');
    try {
      if (getFirebaseTeacher()) await signOutFirebaseTeacher();
      await signInFirebaseTeacher();
      await verify();
    } catch {
      setStatus('error');
      setDetail('Chưa thể xác minh Google. Hãy cho phép cửa sổ đăng nhập bật lên rồi thử lại.');
    }
  };

  if (status === 'allowed') return <>{children}</>;

  const isWaiting = status === 'checking';
  const isBlocked = status === 'denied' || status === 'revoked' || status === 'device-limit';
  const heading = status === 'device-limit'
    ? 'Tài khoản đã dùng đủ 2 thiết bị'
    : status === 'revoked'
      ? 'Quyền truy cập đang tạm khóa'
      : isBlocked
        ? 'Ứng dụng cần được cấp quyền'
        : status === 'account-mismatch'
          ? 'Tài khoản Google chưa trùng khớp'
          : status === 'error'
            ? 'Chưa thể kiểm tra quyền'
            : status === 'auth-required'
              ? 'Xác minh tài khoản Google'
              : 'Đang kiểm tra quyền truy cập';

  const description = status === 'device-limit'
    ? 'Email này đã đăng ký đủ hai trình duyệt. Thầy/cô vui lòng liên hệ Admin để xóa thiết bị cũ hoặc đặt lại danh sách thiết bị.'
    : status === 'revoked'
      ? 'Tài khoản đã được thu hồi quyền. Thầy/cô vui lòng liên hệ Admin để được mở lại miễn phí.'
      : status === 'denied'
        ? 'Để truy cập app, thầy/cô cần được cấp quyền. Thầy/cô vui lòng tham gia nhóm Zalo để được hỗ trợ miễn phí.'
        : status === 'account-mismatch'
          ? `GIAOVIENCN đang dùng ${email}, nhưng hệ thống bảo mật đang xác minh ${decision?.status === 'account-mismatch' ? decision.firebaseEmail : 'một email khác'}.`
          : status === 'auth-required'
            ? 'Thầy/cô đã đăng nhập GIAOVIENCN. Hãy xác minh Google một lần để kết nối an toàn với kho dữ liệu Lớp Hạnh Phúc.'
            : detail || 'Hệ thống đang đối chiếu email và thiết bị với danh sách do Admin cấp.';

  return (
    <div className="relative min-h-screen overflow-x-hidden border-t-[5px] border-purple-800 bg-[radial-gradient(circle_at_18%_12%,rgba(255,220,117,.42),transparent_25%),radial-gradient(circle_at_82%_18%,rgba(235,118,222,.28),transparent_28%),linear-gradient(135deg,#fff7e4_0%,#ffeaf4_34%,#f2e6ff_68%,#e1f3ff_100%)] px-3 py-4 font-sans text-slate-800 sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute left-[7%] top-[13%] h-44 w-44 rounded-full bg-yellow-300/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] right-[8%] h-64 w-64 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute left-[14%] top-[30%] text-3xl text-amber-400/70">✦</div>
      <div className="pointer-events-none absolute right-[12%] top-[15%] text-4xl text-pink-400/60">♥</div>

      <main className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border-[4px] border-[#ffd85a] bg-white/95 shadow-[0_9px_0_#6f228f,0_30px_80px_rgba(91,35,124,.28)] backdrop-blur-xl">
        <header className="relative z-10 flex min-h-16 items-center justify-between gap-3 border-b-[3px] border-[#ffd85a] bg-[linear-gradient(180deg,#fffefb_0%,#fff5fb_100%)] px-4 py-3 shadow-[0_5px_0_#7e268f] sm:px-6">
          <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border-2 border-purple-100 bg-white px-3 py-2 text-sm font-black text-purple-800 shadow-[0_3px_0_#d9b4df] transition hover:-translate-y-0.5 hover:bg-purple-50">
            <ArrowLeft size={18} /> Về GIAOVIENCN
          </button>
          <div className="flex items-center gap-2 text-right">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] border-2 border-[#ffe574] bg-gradient-to-b from-fuchsia-500 to-orange-400 text-white shadow-[0_4px_0_#9b327e,0_8px_16px_rgba(151,47,120,.22)]"><Heart size={19} fill="currentColor" /></span>
            <span className="hidden sm:block"><strong className="block text-sm font-black text-purple-950">Lớp Hạnh Phúc</strong><small className="block font-bold text-purple-500">Ứng dụng miễn phí cho giáo viên</small></span>
          </div>
        </header>

        <div className="grid md:grid-cols-[1.08fr_.92fr]">
          <section className="relative overflow-hidden border-b-[3px] border-[#ffd85a] bg-gradient-to-br from-[#8f28ce] via-[#d538b4] to-[#ff795d] p-6 text-white md:border-b-0 md:border-r-[3px] sm:p-8 lg:p-10">
            <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full border-[34px] border-[#ffd66a]/15" />
            <div className="absolute -right-7 top-6 h-44 w-44 rounded-full border-[22px] border-white/10" />
            <div className="absolute bottom-8 right-10 text-5xl text-white/15">✦</div>

            <div className="relative flex items-start gap-4">
              <motion.div
                animate={isBlocked ? { y: [0, -5, 0], rotate: [0, -2, 2, 0] } : undefined}
                transition={{ duration: 2.1, repeat: Infinity }}
                className="grid h-16 w-16 flex-none place-items-center rounded-[22px] border-[3px] border-[#fff0a0] bg-gradient-to-b from-[#ffe97a] to-[#ff9b42] text-purple-800 shadow-[0_6px_0_#76208b,0_12px_24px_rgba(92,26,111,.28)]"
              >
                {isWaiting ? <Loader2 className="animate-spin" size={31} /> : <ShieldCheck size={33} />}
              </motion.div>
              <div className="pt-1">
                <p className="mb-1 text-[11px] font-black uppercase tracking-[.2em] text-yellow-200">Cổng dành cho giáo viên</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold text-white/90"><Sparkles size={13} /> An toàn · Riêng tư · Miễn phí</span>
              </div>
            </div>

            <h1 className="relative mt-6 max-w-xl text-3xl font-black leading-[1.12] tracking-tight text-[#ffe568] sm:text-[40px]" style={{ WebkitTextStroke: '1px rgba(116,53,83,.32)', textShadow: '0 2px 0 #fff2a8, 0 5px 0 #b45a20, 0 9px 18px rgba(75,25,83,.34)' }}>{heading}</h1>
            <p className="relative mt-4 max-w-xl text-sm font-semibold leading-6 text-white/90 sm:text-[15px]">{description}</p>

            {isBlocked && (
              <motion.div
                animate={{ boxShadow: ['0 0 0 0 rgba(255,225,91,.12)', '0 0 0 8px rgba(255,225,91,.18)', '0 0 0 0 rgba(255,225,91,.12)'] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="relative mt-5 rounded-2xl border-[3px] border-[#ffe16b] bg-gradient-to-b from-[#fff8c8] to-[#ffe68d] px-4 py-3 text-sm font-black leading-5 text-purple-950 shadow-[0_5px_0_#a9545d]"
              >
                Để truy cập ứng dụng, thầy/cô cần được Admin cấp quyền miễn phí qua nhóm Zalo hỗ trợ.
              </motion.div>
            )}

            {email && (
              <div className="relative mt-5 flex items-center gap-3 rounded-2xl border-2 border-white/60 bg-purple-950/15 p-3.5 shadow-[0_4px_0_rgba(103,30,115,.75)]">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-white/50 bg-white/20"><CheckCircle2 size={21} /></span>
                <span className="min-w-0"><small className="block text-[10px] font-extrabold uppercase tracking-wider text-white/65">Email GIAOVIENCN đang dùng</small><strong className="mt-0.5 block break-all text-sm sm:text-base">{email}</strong></span>
              </div>
            )}

            <div className="relative mt-5 flex flex-wrap gap-3">
              {(status === 'auth-required' || status === 'account-mismatch') && (
                <button onClick={() => void reconnectGoogle()} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border-[3px] border-[#ffe06c] bg-gradient-to-b from-white to-[#fff5fb] px-5 py-3 text-sm font-black text-purple-700 shadow-[0_6px_0_#75218c,0_10px_18px_rgba(80,25,99,.24)] transition hover:-translate-y-0.5">
                  <LogIn size={18} /> Xác minh bằng Google
                </button>
              )}
              {status === 'error' && (
                <button onClick={() => void verify()} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border-[3px] border-[#ffe06c] bg-white px-5 py-3 text-sm font-black text-purple-700 shadow-[0_6px_0_#75218c] transition hover:-translate-y-0.5">
                  <RefreshCw size={18} /> Kiểm tra lại
                </button>
              )}
              <button onClick={onSwitchAccount} className="min-h-12 rounded-2xl border-2 border-white/70 bg-white/15 px-5 py-3 text-sm font-black text-white shadow-[0_5px_0_#87266f] transition hover:-translate-y-0.5 hover:bg-white/25">Đổi tài khoản</button>
            </div>
          </section>

          <section className="flex flex-col justify-center bg-[radial-gradient(circle_at_90%_10%,rgba(255,213,95,.2),transparent_26%),linear-gradient(155deg,#ffffff_0%,#fff7fc_55%,#f5edff_100%)] p-5 sm:p-7 lg:p-8">
            {isWaiting ? (
              <div className="grid min-h-80 place-items-center text-center">
                <div><Loader2 className="mx-auto animate-spin text-fuchsia-600" size={44} /><strong className="mt-4 block text-lg text-purple-900">Đang kiểm tra email và thiết bị…</strong><span className="mt-2 block text-sm font-semibold text-slate-500">Thầy/cô vui lòng đợi trong giây lát.</span></div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-blue-100 text-blue-600"><MessageCircle size={25} /></span>
                  <div><strong className="block text-lg font-black text-purple-950">Nhận quyền miễn phí</strong><span className="text-xs font-semibold text-slate-500">Tham gia cộng đồng giáo viên trên Zalo</span></div>
                </div>

                <div className="grid items-center gap-4 sm:grid-cols-[138px_1fr] md:grid-cols-1 lg:grid-cols-[138px_1fr]">
                  {qrCode && <div className="mx-auto hidden rounded-[22px] border-[3px] border-[#ffd85a] bg-white p-2 shadow-[0_6px_0_#7b278e,0_12px_22px_rgba(91,34,111,.2)] sm:block md:hidden lg:block"><img src={qrCode} alt="QR tham gia nhóm Zalo N2 GIAOVIENCN" className="h-[122px] w-[122px] rounded-xl" /></div>}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled aria-disabled="true" className="flex min-h-12 cursor-not-allowed items-center justify-center gap-1 rounded-2xl border-[3px] border-red-200 bg-slate-200 px-2 py-3 text-center text-xs font-black text-slate-500 shadow-[0_5px_0_#94a3b8]">
                        N1 · ĐÃ ĐẦY
                      </button>
                      <a href={ZALO_GROUP_N2_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-1 rounded-2xl border-[3px] border-[#7be4ff] bg-gradient-to-r from-blue-600 to-cyan-500 px-2 py-3 text-center text-xs font-black text-white shadow-[0_6px_0_#1854ad,0_10px_18px_rgba(24,84,173,.2)] transition hover:-translate-y-0.5">
                        <Smartphone size={17} /> N2 · VÀO NHÓM
                      </a>
                    </div>
                  </div>
                </div>

                <div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-purple-100" />Kết nối cùng Thầy Đức<span className="h-px flex-1 bg-purple-100" /></div>
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border-[3px] border-[#b8d7ff] bg-blue-50/90 p-3.5 text-blue-900 shadow-[0_5px_0_#588ac7] transition hover:-translate-y-0.5 hover:bg-blue-100">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl border-2 border-white bg-blue-600 text-white shadow-[0_4px_0_#174ea6]"><Facebook size={22} fill="currentColor" /></span>
                  <span><strong className="block text-sm font-black">Nhấn theo dõi Facebook Thầy Đức</strong><small className="mt-0.5 block font-semibold text-blue-700">Xem thêm nhiều chia sẻ hữu ích về CNTT</small></span>
                </a>
                {status === 'device-limit' && <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800"><Laptop className="mt-0.5 flex-none" size={17} /> Admin có thể xóa thiết bị cũ hoặc đặt lại danh sách hai thiết bị trong trang quản trị.</div>}
              </>
            )}
          </section>
        </div>
      </main>
      <p className="relative mx-auto mt-3 max-w-5xl text-center text-xs font-bold text-purple-700/70">Dữ liệu lớp học trên máy vẫn được giữ nguyên khi tài khoản chưa được cấp quyền.</p>
    </div>
  );
}
