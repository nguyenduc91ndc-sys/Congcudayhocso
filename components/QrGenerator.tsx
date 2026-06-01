import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Download, Edit3, Link2, Loader2, QrCode, Save, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { User } from '../types';
import { createQrLink, deleteQrLink, QrLink, subscribeUserQrLinks, updateQrLink } from '../utils/firebaseQrLinks';

interface QrGeneratorProps {
    user: User;
    onBack: () => void;
}

type QrMode = 'static' | 'dynamic';

const templates = [
    { id: 'pastel', name: 'Kẹo ngọt', bg: '#fff1f2', fg: '#be185d', accent: '#f9a8d4' },
    { id: 'classroom', name: 'Lớp học', bg: '#ecfdf5', fg: '#047857', accent: '#6ee7b7' },
    { id: 'rainbow', name: 'Cầu vồng', bg: '#eff6ff', fg: '#2563eb', accent: '#a78bfa' },
    { id: 'minimal', name: 'Tối giản', bg: '#ffffff', fg: '#111827', accent: '#e5e7eb' },
    { id: 'festival', name: 'Lễ hội', bg: '#fff7ed', fg: '#c2410c', accent: '#fdba74' },
    { id: 'tech', name: 'Công nghệ', bg: '#eef2ff', fg: '#4338ca', accent: '#818cf8' },
];

type QrTemplate = typeof templates[number];

const qrFrames = [
    { id: 'soft', name: 'Bo tròn kẹo', hint: 'Mềm, sạch, dễ in' },
    { id: 'stars', name: 'Sao vui', hint: 'Nổi bật cho lớp học' },
    { id: 'flowers', name: 'Hoa điểm 10', hint: 'Dễ thương, tiểu học' },
    { id: 'notebook', name: 'Vở ô ly', hint: 'Gọn như phiếu học tập' },
    { id: 'rainbow', name: 'Cầu vồng', hint: 'Nhiều màu, bắt mắt' },
] as const;

type QrFrameId = typeof qrFrames[number]['id'];

const normalizeUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, color: string) => {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? outer : inner;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
};

const drawFlower = (ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, center: string) => {
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * 18, cy + Math.sin(angle) * 18, 14, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = center;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

const drawFrameOnCanvas = (ctx: CanvasRenderingContext2D, frameId: QrFrameId, template: QrTemplate) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (frameId === 'notebook') {
        ctx.strokeStyle = '#dbeafe';
        ctx.lineWidth = 3;
        for (let y = 140; y <= 760; y += 48) {
            ctx.beginPath();
            ctx.moveTo(122, y);
            ctx.lineTo(778, y);
            ctx.stroke();
        }
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(150, 118);
        ctx.lineTo(150, 782);
        ctx.stroke();
    }

    if (frameId === 'rainbow') {
        ['#22c55e', template.accent, template.fg, '#f59e0b'].forEach((color, index) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.roundRect(86 + index * 17, 86 + index * 17, 728 - index * 34, 728 - index * 34, 48 - index * 5);
            ctx.stroke();
        });
    } else {
        ctx.strokeStyle = template.accent;
        ctx.lineWidth = frameId === 'soft' ? 18 : 12;
        ctx.beginPath();
        ctx.roundRect(88, 88, 724, 724, 58);
        ctx.stroke();
    }

    if (frameId === 'soft') {
        ctx.fillStyle = template.fg;
        [[128, 128], [772, 128], [128, 772], [772, 772]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 18, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    if (frameId === 'stars') {
        [[145, 145], [755, 145], [145, 755], [755, 755], [450, 115], [450, 785], [115, 450], [785, 450]].forEach(([x, y], index) => {
            drawStar(ctx, x, y, index % 2 === 0 ? 22 : 17, index % 2 === 0 ? 9 : 7, index % 2 === 0 ? template.fg : template.accent);
        });
    }

    if (frameId === 'flowers') {
        [[145, 145], [755, 145], [145, 755], [755, 755]].forEach(([x, y], index) => {
            drawFlower(ctx, x, y, index % 2 === 0 ? template.accent : '#fdba74', template.fg);
        });
    }

    ctx.restore();
};

const QrGenerator: React.FC<QrGeneratorProps> = ({ user, onBack }) => {
    const [mode, setMode] = useState<QrMode>('static');
    const [title, setTitle] = useState('Mã QR của tôi');
    const [targetUrl, setTargetUrl] = useState('');
    const [templateId, setTemplateId] = useState('pastel');
    const [frameId, setFrameId] = useState<QrFrameId>('soft');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [dynamicLinks, setDynamicLinks] = useState<QrLink[]>([]);
    const [selectedDynamicId, setSelectedDynamicId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    const template = templates.find(item => item.id === templateId) || templates[0];
    const frame = qrFrames.find(item => item.id === frameId) || qrFrames[0];
    const selectedDynamic = dynamicLinks.find(item => item.id === selectedDynamicId) || null;
    const qrValue = useMemo(() => {
        if (mode === 'dynamic' && selectedDynamic) {
            return `${window.location.origin}/?qr=${selectedDynamic.id}`;
        }
        return normalizeUrl(targetUrl);
    }, [mode, selectedDynamic, targetUrl]);

    useEffect(() => {
        const unsubscribe = subscribeUserQrLinks(user.email || '', setDynamicLinks);
        return () => unsubscribe();
    }, [user.email]);

    useEffect(() => {
        let cancelled = false;

        const renderQr = async () => {
            if (!qrValue) {
                setQrDataUrl('');
                return;
            }

            const dataUrl = await QRCode.toDataURL(qrValue, {
                width: 420,
                margin: 2,
                color: {
                    dark: template.fg,
                    light: template.bg,
                },
                errorCorrectionLevel: 'H',
            });
            if (!cancelled) setQrDataUrl(dataUrl);
        };

        renderQr().catch(() => setQrDataUrl(''));
        return () => { cancelled = true; };
    }, [qrValue, template.bg, template.fg]);

    const createDynamic = async () => {
        if (!targetUrl.trim()) {
            setMessage('Vui lòng nhập link cần tạo QR.');
            return;
        }

        setIsSaving(true);
        setMessage('');
        try {
            const created = await createQrLink({
                title,
                targetUrl,
                ownerEmail: user.email || '',
                ownerName: user.name || '',
            });
            setSelectedDynamicId(created.id);
            setMessage('Đã tạo QR động. Bạn có thể đổi link sau mà QR cũ vẫn giữ nguyên.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không tạo được QR động.');
        } finally {
            setIsSaving(false);
        }
    };

    const saveDynamic = async () => {
        if (!selectedDynamic) return;
        setIsSaving(true);
        try {
            await updateQrLink(selectedDynamic.id, { title, targetUrl });
            setMessage('Đã lưu thay đổi QR động.');
        } catch {
            setMessage('Không lưu được QR động.');
        } finally {
            setIsSaving(false);
        }
    };

    const selectDynamic = (item: QrLink) => {
        setMode('dynamic');
        setSelectedDynamicId(item.id);
        setTitle(item.title);
        setTargetUrl(item.targetUrl);
        setMessage('');
    };

    const removeDynamic = async (id: string) => {
        if (!confirm('Xóa QR động này? QR đã in ra sẽ không chuyển hướng được nữa.')) return;
        await deleteQrLink(id);
        if (selectedDynamicId === id) setSelectedDynamicId(null);
    };

    const copyQrLink = async () => {
        if (!qrValue) return;
        await navigator.clipboard.writeText(qrValue);
        setMessage('Đã sao chép link QR.');
    };

    const downloadPng = async () => {
        if (!qrDataUrl) return;

        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = template.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const qrImage = new Image();
        qrImage.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(62, 62, 776, 776, 64);
            ctx.fill();

            drawFrameOnCanvas(ctx, frameId, template);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(174, 174, 552, 552, 34);
            ctx.fill();
            ctx.drawImage(qrImage, 190, 190, 520, 520);

            const link = document.createElement('a');
            link.download = `${(title || 'qr').replace(/[^\w-]+/g, '-').toLowerCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        qrImage.src = qrDataUrl;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-pink-50 to-amber-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
                    <button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700">
                        <ArrowLeft size={18} /> Quay lại
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-black sm:text-2xl">Tạo mã QR</h1>
                        <p className="text-xs text-slate-500 sm:text-sm">Tạo QR tĩnh hoặc QR động có thể sửa link sau.</p>
                    </div>
                </div>
            </header>

            <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_420px]">
                <section className="space-y-5">
                    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                        <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
                            {(['static', 'dynamic'] as QrMode[]).map(item => (
                                <button
                                    key={item}
                                    onClick={() => { setMode(item); setSelectedDynamicId(null); setMessage(''); }}
                                    className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                                >
                                    {item === 'static' ? 'QR tĩnh' : 'QR động'}
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="block">
                                <span className="text-sm font-bold text-slate-700">Tên lưu QR</span>
                                <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-slate-700">Link cần tạo QR</span>
                                <input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400" />
                            </label>
                        </div>

                        <div className="mt-5">
                            <span className="text-sm font-bold text-slate-700">Mẫu dễ thương</span>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {templates.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setTemplateId(item.id)}
                                        className={`rounded-xl border p-3 text-left transition ${templateId === item.id ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-400'}`}
                                        style={{ background: item.bg }}
                                    >
                                        <div className="mb-2 h-5 w-16 rounded-full" style={{ background: item.accent }} />
                                        <div className="font-bold" style={{ color: item.fg }}>{item.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-5">
                            <span className="text-sm font-bold text-slate-700">Khung viền tiểu học</span>
                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {qrFrames.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setFrameId(item.id)}
                                        className={`rounded-xl border bg-white p-3 text-left transition ${frameId === item.id ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-400'}`}
                                    >
                                        <div className="font-bold text-slate-900">{item.name}</div>
                                        <div className="text-xs font-semibold text-slate-500">{item.hint}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {mode === 'dynamic' && !selectedDynamic && (
                                <button onClick={createDynamic} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
                                    Tạo QR động
                                </button>
                            )}
                            {mode === 'dynamic' && selectedDynamic && (
                                <button onClick={saveDynamic} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-60">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Lưu thay đổi
                                </button>
                            )}
                            <button onClick={copyQrLink} disabled={!qrValue} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
                                <Copy size={18} /> Copy link QR
                            </button>
                            <button onClick={downloadPng} disabled={!qrDataUrl} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
                                <Download size={18} /> Tải PNG
                            </button>
                        </div>

                        {message && <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">{message}</p>}
                    </div>

                    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                        <h2 className="mb-3 font-black">QR động của tôi</h2>
                        {dynamicLinks.length === 0 ? (
                            <p className="text-sm text-slate-500">Bạn chưa có QR động nào.</p>
                        ) : (
                            <div className="grid gap-2">
                                {dynamicLinks.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3">
                                        <Link2 size={18} className="text-indigo-500" />
                                        <button onClick={() => selectDynamic(item)} className="min-w-0 flex-1 text-left">
                                            <div className="truncate font-bold">{item.title}</div>
                                            <div className="truncate text-xs text-slate-500">{item.targetUrl}</div>
                                        </button>
                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{item.scans || 0} lượt</span>
                                        <button onClick={() => selectDynamic(item)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Edit3 size={16} /></button>
                                        <button onClick={() => removeDynamic(item.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-3xl p-5 shadow-xl ring-1 ring-black/5" style={{ background: `linear-gradient(135deg, ${template.bg}, #ffffff)` }}>
                        <div
                            className="relative mx-auto aspect-square w-full max-w-[370px] overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-lg"
                            aria-label={`Xem trước QR với khung ${frame.name}`}
                            style={{ border: `10px solid ${frameId === 'rainbow' ? template.fg : template.accent}` }}
                        >
                            {frameId === 'notebook' && (
                                <div className="pointer-events-none absolute inset-0 opacity-80">
                                    <span className="absolute left-12 top-0 h-full w-1 rounded-full bg-rose-300" />
                                    {[18, 30, 42, 54, 66, 78].map(item => (
                                        <span key={item} className="absolute left-6 right-6 h-px bg-sky-200" style={{ top: `${item}%` }} />
                                    ))}
                                </div>
                            )}
                            {frameId === 'rainbow' && (
                                <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] border-[6px] border-emerald-400 shadow-[inset_0_0_0_6px_#f59e0b]" />
                            )}
                            {frameId === 'stars' && (
                                <>
                                    <span className="pointer-events-none absolute left-5 top-5 text-3xl" style={{ color: template.fg }}>★</span>
                                    <span className="pointer-events-none absolute right-6 top-8 text-2xl" style={{ color: template.accent }}>★</span>
                                    <span className="pointer-events-none absolute bottom-6 left-8 text-2xl" style={{ color: template.accent }}>★</span>
                                    <span className="pointer-events-none absolute bottom-5 right-5 text-3xl" style={{ color: template.fg }}>★</span>
                                </>
                            )}
                            {frameId === 'flowers' && (
                                <>
                                    <span className="pointer-events-none absolute left-4 top-4 text-3xl">🌸</span>
                                    <span className="pointer-events-none absolute right-4 top-5 text-3xl">🌼</span>
                                    <span className="pointer-events-none absolute bottom-4 left-5 text-3xl">🌼</span>
                                    <span className="pointer-events-none absolute bottom-4 right-4 text-3xl">🌸</span>
                                </>
                            )}
                            {frameId === 'soft' && (
                                <>
                                    <span className="pointer-events-none absolute left-7 top-7 h-5 w-5 rounded-full" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute right-7 top-7 h-5 w-5 rounded-full" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute bottom-7 left-7 h-5 w-5 rounded-full" style={{ background: template.fg }} />
                                    <span className="pointer-events-none absolute bottom-7 right-7 h-5 w-5 rounded-full" style={{ background: template.fg }} />
                                </>
                            )}
                            <div className="relative z-10 flex h-full items-center justify-center rounded-[1.5rem] bg-white p-3 shadow-inner">
                            {qrDataUrl ? (
                                <img src={qrDataUrl} alt="QR preview" className="w-full rounded-2xl" />
                            ) : (
                                <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400">
                                    Nhập link để xem QR
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default QrGenerator;
