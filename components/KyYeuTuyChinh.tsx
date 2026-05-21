import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, ExternalLink, GraduationCap, KeyRound, Loader2, MessageCircle, PlayCircle, Users } from 'lucide-react';
import { activateKyYeuAccessForEmail, hasActiveKyYeuAccess, KYYEU_ZALO_GROUP_URL } from '../utils/firebaseKyYeuAccess';

interface KyYeuTuyChinhProps {
    onBack: () => void;
    userEmail?: string;
    userName?: string;
}

const GUIDE_VIDEO_ID = 'NOAJFSkeJYE';
const GUIDE_VIDEO_URL = `https://youtu.be/${GUIDE_VIDEO_ID}`;
const KYYEU_ACCESS_SESSION_KEY = 'kyyeu_access_session';
const KYYEU_ACCESS_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const FIREBASE_ACCESS_CHECK_TIMEOUT_MS = 10000;
const FIREBASE_ACCESS_SUBMIT_TIMEOUT_MS = 15000;
const KYYEU_GUEST_SESSION_EMAIL = 'guest@kyyeu.local';
const KYYEU_ZALO_GROUP_QR_SRC = '/kyyeu-zalo-kyyeu-tuy-chinh-card-20260521.png?v=20260521b';
const FACEBOOK_PROFILE_URL = 'https://www.facebook.com/duc.the3?locale=vi_VN';

const grantKyYeuAccessSession = (email: string) => {
    const now = Date.now();
    sessionStorage.setItem(KYYEU_ACCESS_SESSION_KEY, JSON.stringify({
        email: email.toLowerCase().trim(),
        grantedAt: now,
        expiresAt: now + KYYEU_ACCESS_SESSION_TTL_MS
    }));
};

const hasValidKyYeuAccessSession = (email: string): boolean => {
    try {
        const rawSession = sessionStorage.getItem(KYYEU_ACCESS_SESSION_KEY);
        const accessSession = rawSession ? JSON.parse(rawSession) : null;
        return Boolean(
            accessSession &&
            accessSession.email === email.toLowerCase().trim() &&
            Number(accessSession.expiresAt) > Date.now()
        );
    } catch (error) {
        return false;
    }
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            promise,
            new Promise<null>((resolve) => {
                timeoutId = setTimeout(() => resolve(null), timeoutMs);
            })
        ]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

const KyYeuTuyChinh: React.FC<KyYeuTuyChinhProps> = ({ onBack, userEmail, userName }) => {
    const [isChecking, setIsChecking] = useState(true);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasEnteredApp, setHasEnteredApp] = useState(false);

    useEffect(() => {
        let mounted = true;

        const checkAccess = async () => {
            const sessionEmail = userEmail || KYYEU_GUEST_SESSION_EMAIL;
            grantKyYeuAccessSession(sessionEmail);
            setIsUnlocked(true);
            setIsChecking(false);
            return;

            if (!userEmail) {
                setIsChecking(false);
                return;
            }

            setError('');
            const hasCachedSession = hasValidKyYeuAccessSession(userEmail);
            if (hasCachedSession) {
                setIsUnlocked(true);
                setIsChecking(false);
            }

            try {
                const hasAccess = await withTimeout(hasActiveKyYeuAccess(userEmail), FIREBASE_ACCESS_CHECK_TIMEOUT_MS);
                if (!mounted) return;

                if (hasAccess === null) {
                    if (!hasCachedSession) {
                        sessionStorage.removeItem(KYYEU_ACCESS_SESSION_KEY);
                        setIsUnlocked(false);
                        setError('Mang cham hoac Firebase khong phan hoi. Vui long thu lai, doi mang, hoac nhap ma truy cap.');
                        setIsChecking(false);
                    }
                    return;
                }

                if (hasAccess) {
                    grantKyYeuAccessSession(userEmail);
                } else {
                    sessionStorage.removeItem(KYYEU_ACCESS_SESSION_KEY);
                }
                setIsUnlocked(hasAccess);
                setIsChecking(false);
            } catch (error) {
                if (!mounted) return;
                if (!hasCachedSession) {
                    sessionStorage.removeItem(KYYEU_ACCESS_SESSION_KEY);
                    setIsUnlocked(false);
                    setError('Khong kiem tra duoc quyen truy cap. Vui long kiem tra ket noi mang va thu lai.');
                    setIsChecking(false);
                }
            }
        };

        checkAccess();
        return () => {
            mounted = false;
        };
    }, [userEmail]);

    useEffect(() => {
        if (!isUnlocked) {
            sessionStorage.removeItem(KYYEU_ACCESS_SESSION_KEY);
            return;
        }

        grantKyYeuAccessSession(userEmail || KYYEU_GUEST_SESSION_EMAIL);
    }, [isUnlocked, userEmail]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!userEmail) {
            setError('Vui lòng đăng nhập trước khi nhập mã.');
            return;
        }

        const code = accessCode.toUpperCase().replace(/\s+/g, '').trim();
        if (!code) {
            setError('Vui lòng nhập mã truy cập.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        const result = await withTimeout(
            activateKyYeuAccessForEmail(userEmail, code),
            FIREBASE_ACCESS_SUBMIT_TIMEOUT_MS
        );
        setIsSubmitting(false);

        if (result === null) {
            setError('Mang cham hoac Firebase khong phan hoi. Vui long thu lai sau it phut.');
            return;
        }

        if (!result.success) {
            setError(result.reason || 'Mã chưa đúng hoặc đã bị thu hồi.');
            return;
        }

        grantKyYeuAccessSession(userEmail);
        setIsUnlocked(true);
    };

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-900">
            <div className="z-50 flex flex-shrink-0 items-center gap-3 border-b border-white/10 bg-slate-800/90 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-sm">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-[0.98]"
                    title="Quay lại"
                    aria-label="Quay lại trang GVCN"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại
                </button>
                <div className="flex min-w-0 items-center gap-2">
                    <GraduationCap className="h-5 w-5 flex-shrink-0 text-pink-200" />
                    <div className="min-w-0">
                        <h1 className="truncate text-sm font-bold leading-tight text-white sm:text-base">Kỷ Yếu Cuối Năm</h1>
                        <p className="truncate text-xs text-white/50">{hasEnteredApp ? 'Tạo album kỷ niệm và chia sẻ cho lớp' : 'Xem hướng dẫn, vào nhóm hỗ trợ rồi bắt đầu tạo'}</p>
                    </div>
                </div>
                <a
                    href={FACEBOOK_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1877f2] px-3 py-2 text-xs font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-[#0f66d8] sm:px-4 sm:text-sm"
                    title="Theo dõi Facebook"
                >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black text-[#1877f2]">f</span>
                    <span className="hidden sm:inline">Theo dõi Facebook</span>
                    <span className="sm:hidden">Facebook</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>

            {isChecking ? (
                <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-950 text-white">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-pink-200" />
                        <span className="text-sm font-semibold">Đang kiểm tra quyền truy cập...</span>
                    </div>
                </div>
            ) : isUnlocked && hasEnteredApp ? (
                <iframe
                    src="/kiyeucuoinam/kiyeucuoinam/index.html?preview=1&v=20260521"
                    className="min-h-0 flex-1 border-0"
                    title="Kỷ yếu cuối năm"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; camera; microphone; fullscreen"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups allow-downloads"
                />
            ) : (
                <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.22),transparent_32%),linear-gradient(135deg,#0f172a,#182338_52%,#102f3c)] px-4 py-5 sm:px-6 sm:py-6 xl:py-8">
                    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                        <section className="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] shadow-2xl shadow-black/25 backdrop-blur-xl">
                            <div className="relative bg-gradient-to-br from-sky-100 via-white to-emerald-50 p-5 text-slate-900 sm:p-6 xl:p-8">
                                <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-pink-300/40 blur-2xl" />
                                <div className="relative grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_190px] xl:grid-cols-[minmax(0,1fr)_220px]">
                                    <div className="min-w-0">
                                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/85 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
                                            <Users className="h-4 w-4" />
                                            Nhóm hỗ trợ cộng đồng
                                        </div>
                                        <h2 className="max-w-[13ch] text-3xl font-black leading-tight tracking-tight text-slate-900 sm:max-w-none sm:text-4xl">
                                            Kỷ Yếu Cuối Năm
                                        </h2>
                                        <p className="mt-2 max-w-2xl text-sm font-medium leading-5 text-slate-600 sm:text-base sm:leading-6">
                                            Chào {userName || 'thầy/cô'}, thầy/cô có thể vào app để tạo kỷ yếu ngay. Khu vực này có video hướng dẫn, nhóm Zalo và QR cộng đồng để xem nhanh cách làm và hỏi hỗ trợ khi cần.
                                        </p>
                                    </div>
                                    <div className="hidden justify-self-end rounded-3xl bg-white/80 p-3 shadow-xl ring-1 ring-white/70 md:block">
                                        <img src="/kiyeucuoinam/cover-nenmoi-desktop.png" alt="Kỷ yếu cuối năm" className="h-28 w-44 rounded-2xl object-cover xl:h-32 xl:w-52" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-5 xl:p-7">
                                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-white">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-pink-100">
                                                <GraduationCap className="h-4 w-4" />
                                                Vào app tự do
                                            </div>
                                            <h3 className="text-xl font-black leading-tight">Tạo kỷ yếu cuối năm cho lớp</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setHasEnteredApp(true)}
                                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-pink-500/25 transition hover:from-pink-400 hover:to-rose-400 active:scale-[0.98]"
                                        >
                                            <PlayCircle className="h-4 w-4" />
                                            Bắt đầu tạo kỷ yếu
                                        </button>
                                    </div>
                                </div>

                                <a
                                    href={FACEBOOK_PROFILE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 flex items-center gap-3 rounded-2xl border border-blue-300/30 bg-[#1877f2] p-4 text-white shadow-xl shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-[#0f66d8]"
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-black text-[#1877f2]">f</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black leading-snug sm:text-base">Theo dõi Facebook để nhận mẫu mới</span>
                                        <span className="mt-1 block text-xs font-medium leading-5 text-white/80 sm:text-sm">Cập nhật thêm mẫu kỷ yếu, thư mời và mẹo dùng app nhanh.</span>
                                    </span>
                                    <ExternalLink className="h-4 w-4 shrink-0" />
                                </a>

                                <form onSubmit={handleSubmit} className="hidden rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                                        <KeyRound className="h-4 w-4 text-pink-200" />
                                        Nhập mã truy cập Kỷ Yếu
                                    </label>
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <input
                                            value={accessCode}
                                            onChange={(event) => {
                                                setAccessCode(event.target.value.toUpperCase());
                                                setError('');
                                            }}
                                            placeholder="Ví dụ: KYYEU-ABCDEFGH"
                                            className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-white px-4 py-3 font-mono text-base font-bold tracking-wide text-slate-900 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-300/25"
                                            autoComplete="off"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-pink-500/25 transition hover:from-pink-400 hover:to-rose-400 disabled:cursor-wait disabled:opacity-70"
                                        >
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                            Mở công cụ
                                        </button>
                                    </div>
                                    {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-100">{error}</p>}
                                </form>

                                <div className="mt-4 grid items-stretch gap-3 md:grid-cols-2 xl:gap-4">
                                    <a
                                        href={KYYEU_ZALO_GROUP_URL}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group flex min-h-[158px] flex-col justify-between overflow-hidden rounded-2xl border border-blue-300/30 bg-[#0068ff] p-4 text-white shadow-xl shadow-blue-900/20 transition hover:-translate-y-0.5 hover:bg-[#0057d6] hover:shadow-2xl"
                                    >
                                        <div>
                                            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                                                <MessageCircle className="h-5 w-5" />
                                            </span>
                                            <div className="text-base font-black leading-snug xl:text-lg">VÀO NHÓM ZALO HỖ TRỢ</div>
                                            <p className="mt-2 text-sm font-medium leading-5 text-white/80">
                                                Hỏi nhanh khi cần hỗ trợ trong quá trình tạo, chỉnh và chia sẻ kỷ yếu.
                                            </p>
                                        </div>
                                        <div className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#0068ff] transition group-hover:bg-blue-50">
                                            Tham gia nhóm
                                        </div>
                                    </a>

                                    <div className="flex min-h-[158px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-xl shadow-black/15">
                                        <div className="relative aspect-video w-full bg-slate-900">
                                            <iframe
                                                src={`https://www.youtube.com/embed/${GUIDE_VIDEO_ID}`}
                                                title="Video hướng dẫn tạo kỷ yếu cuối năm"
                                                className="absolute inset-0 z-10 h-full w-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                            />
                                            <img
                                                src={`https://img.youtube.com/vi/${GUIDE_VIDEO_ID}/hqdefault.jpg`}
                                                alt="Video demo giới thiệu app"
                                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/20" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg">
                                                    <PlayCircle className="h-6 w-6" />
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-1 flex-col justify-center p-3">
                                            <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-pink-100">
                                                <PlayCircle className="h-3.5 w-3.5" />
                                                Video hướng dẫn
                                            </div>
                                            <div className="text-sm font-black leading-snug text-white xl:text-base">
                                                VIDEO HƯỚNG DẪN TẠO KỶ YẾU
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-white/65 xl:text-sm">
                                                Xem thao tác tạo kỷ yếu, chỉnh nội dung và chia sẻ thành phẩm.
                                            </p>
                                            <a
                                                href={GUIDE_VIDEO_URL}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-2 text-xs font-bold text-pink-100 underline-offset-4 hover:underline xl:text-sm"
                                            >
                                                Mở video trên YouTube
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <aside className="rounded-3xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
                            <h3 className="text-xl font-black text-white">Nhóm Zalo hỗ trợ</h3>
                            <div className="mt-4 space-y-3">
                                {[
                                    'Tham gia nhóm cộng đồng App tùy chỉnh.',
                                    'Xem video hướng dẫn và các thông báo ghim trong nhóm.',
                                    'Hỏi trực tiếp khi cần hỗ trợ thao tác trong app.',
                                    'Nếu có lỗi khi tạo kỷ yếu, tạo QR hoặc chia sẻ, thầy/cô hỏi trực tiếp trong nhóm để được hỗ trợ.'
                                ].map((item, index) => (
                                    <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-white">
                                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-900">{index + 1}</span>
                                        <p className="text-sm leading-6 text-white/80">{item}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 rounded-2xl bg-white p-4 text-center">
                                <img
                                    src={KYYEU_ZALO_GROUP_QR_SRC}
                                    alt="QR nhóm Zalo hỗ trợ Kỷ Yếu"
                                    className="mx-auto h-72 w-52 rounded-xl object-contain"
                                />
                                <p className="mt-3 text-sm font-bold text-slate-900">Quét QR bằng Zalo để vào nhóm</p>
                                <p className="mt-1 text-xs text-slate-500">Nhóm dùng để hỏi nhanh khi cần hỗ trợ sử dụng.</p>
                            </div>
                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KyYeuTuyChinh;
