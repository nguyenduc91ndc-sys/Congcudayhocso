import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref as dbRef, set, remove, onValue, off } from 'firebase/database';
import { database } from '../utils/firebaseConfig';

// Tạo panorama image cho phòng 3D bằng Canvas
function generateRoomPanorama(roomType: string): string {
    const W = 2048, H = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const p: Record<string, { wall: string; floor: string; ceil: string }> = {
        'cong-nghe': { wall: '#dde3ea', floor: '#37474f', ceil: '#78909c' },
        'tu-nhien':  { wall: '#f1f8e9', floor: '#388e3c', ceil: '#a5d6a7' },
        'lich-su':   { wall: '#fdf6ec', floor: '#6d4c41', ceil: '#bcaaa4' },
    };
    const c = p[roomType] || p['cong-nghe'];
    // Trần
    const ceil = ctx.createLinearGradient(0, 0, 0, H * 0.32);
    ceil.addColorStop(0, c.ceil); ceil.addColorStop(1, '#ffffff');
    ctx.fillStyle = ceil; ctx.fillRect(0, 0, W, H * 0.32);
    // Tường
    ctx.fillStyle = c.wall; ctx.fillRect(0, H * 0.32, W, H * 0.4);
    // Sàn
    const floor = ctx.createLinearGradient(0, H * 0.72, 0, H);
    floor.addColorStop(0, '#aaaaaa'); floor.addColorStop(1, c.floor);
    ctx.fillStyle = floor; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    // Góc tường
    for (let i = 0; i <= 4; i++) {
        const x = (i / 4) * W;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x - 4, H * 0.32, 8, H * 0.4);
    }
    // Chân tường
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, H * 0.70, W, H * 0.02);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, H * 0.72, W, H * 0.015);
    // Gờ trần
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(0, H * 0.32, W, H * 0.015);
    return canvas.toDataURL('image/jpeg', 0.82);
}

// ─── Types ───────────────────────────────────────────────────────────────────
type RoomType = 'cong-nghe' | 'tu-nhien' | 'lich-su';
interface FrameData { imageUrl: string; description: string; }
interface Gallery {
    id: string; title: string; type: RoomType;
    frames: Record<string, FrameData>; // key: "1"~"15"
    createdAt: number; ownerEmail: string;
}

interface Props { user: { email: string; name: string } | null; onRequireLogin?: () => void; onBack?: () => void; }

const MAX_ROOMS = 3; const MAX_FRAMES = 15;
const emailKey = (e: string) => e.replace(/[.@]/g, '_');

const ROOM_TYPES: { id: RoomType; label: string; icon: string; bg: string; accent: string }[] = [
    { id: 'cong-nghe', label: 'Công Nghệ', icon: '🖥️', bg: 'from-slate-700 to-slate-900', accent: '#6366f1' },
    { id: 'tu-nhien', label: 'Tự nhiên',  icon: '🌿', bg: 'from-emerald-700 to-green-900', accent: '#10b981' },
    { id: 'lich-su',  label: 'Lịch Sử',  icon: '📚', bg: 'from-amber-700 to-stone-900',   accent: '#f59e0b' },
];
const getRoomType = (id: RoomType) => ROOM_TYPES.find(r => r.id === id) || ROOM_TYPES[0];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PhongTranh3D({ user, onRequireLogin, onBack }: Props) {
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [loading, setLoading] = useState(true);
    const [screen, setScreen] = useState<'list' | 'create' | 'edit' | 'view'>('list');
    const [active, setActive] = useState<Gallery | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

    useEffect(() => {
        if (!user) return;
        const r = dbRef(database, `phong_tranh_3d/${emailKey(user.email)}`);
        const unsub = onValue(r, snap => {
            setGalleries(snap.exists() ? Object.values(snap.val() as Record<string, Gallery>).sort((a,b)=>b.createdAt-a.createdAt) : []);
            setLoading(false);
        });
        return () => off(r);
    }, [user]);

    if (!user) return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 z-[100]" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
            <div className="text-7xl">🧊</div>
            <h2 className="text-2xl font-bold text-white">Phòng 3D Panorama</h2>
            <p className="text-indigo-300 text-center max-w-xs">Đăng nhập để tạo và quản lý phòng triển lãm 3D</p>
            <button onClick={onRequireLogin} className="px-8 py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>Đăng nhập</button>
        </div>
    );

    if (screen === 'view' && active) return <RoomViewer gallery={active} onBack={() => { setScreen('list'); setActive(null); }} />;
    if (screen === 'edit' && active) return <RoomEditor gallery={active} user={user} onBack={() => { setScreen('list'); setActive(null); }} notify={notify} />;
    if (screen === 'create') return (
        <CreateModal onBack={() => setScreen('list')} user={user} roomCount={galleries.length} notify={notify} onCreated={_g => { setScreen('list'); notify('Đã tạo phòng!'); }} />
    );

    const handleDelete = async (id: string) => {
        await remove(dbRef(database, `phong_tranh_3d/${emailKey(user.email)}/${id}`));
        setDeleteConfirm(null); notify('Đã xóa phòng!');
    };

    return (
        <div className="fixed inset-0 flex z-[100] overflow-hidden" style={{ background: '#f5f4fe' }}>
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-4 right-4 z-[999] px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-xl"
                        style={{ background: toast.ok ? '#16a34a' : '#dc2626' }}>
                        {toast.ok ? '✅' : '❌'} {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Sidebar ── */}
            <aside className="w-52 flex-shrink-0 flex flex-col gap-1 py-5 px-3 sticky top-0 h-screen overflow-y-auto"
                style={{ background: 'white', borderRight: '1px solid #e0d7ff' }}>
                <div className="flex items-center gap-2 mb-1 px-2">
                    <button onClick={onBack} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-600 mb-2 transition-colors">
                        ← Về trang chủ
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-5 px-2">
                    <span className="text-3xl">🧊</span>
                    <div><div className="font-bold text-purple-800 text-sm leading-tight">Phòng 3D</div><div className="font-bold text-purple-600 text-xs">Panorama</div></div>
                </div>
                <NavItem icon="❓" label="Hướng dẫn sử dụng" onClick={() => window.open('https://www.facebook.com/groups/giaovienyeucongnghe','_blank')} />
                <div className="mx-2 my-1 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2" style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}>
                    🚀 Đã dùng {galleries.length}/{MAX_ROOMS} lượt tạo phòng
                </div>
                <button onClick={() => setScreen('create')}
                    className="flex items-center gap-2 mx-2 my-1 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-800 hover:bg-gray-50 transition-colors">
                    <span className="text-lg font-bold">+</span> Tạo phòng mới
                </button>
                <NavItem icon="🧊" label="Phòng của tôi" active onClick={() => setScreen('list')} />
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 p-7 overflow-y-auto">
                <div className="mb-6">
                    <h1 className="flex items-center gap-2 text-xl font-bold" style={{ color: '#5b21b6' }}>
                        <span>🧊</span> Phòng của tôi
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Quản lý các phòng trưng bày 360 của bạn</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
                ) : galleries.length === 0 ? (
                    <EmptyState onCreate={() => setScreen('create')} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {galleries.map(g => (
                            <RoomCard key={g.id} gallery={g}
                                onView={() => { setActive(g); setScreen('view'); }}
                                onEdit={() => { setActive(g); setScreen('edit'); }}
                                onDelete={() => setDeleteConfirm(g.id)} />
                        ))}
                        {galleries.length < MAX_ROOMS && (
                            <button onClick={() => setScreen('create')}
                                className="h-52 rounded-2xl border-2 border-dashed border-purple-300 flex flex-col items-center justify-center gap-2 text-purple-400 hover:border-purple-500 hover:text-purple-600 transition-colors"
                                style={{ background: '#faf5ff' }}>
                                <span className="text-5xl font-light">+</span>
                                <span className="text-sm font-semibold">Tạo phòng mới</span>
                            </button>
                        )}
                    </div>
                )}
            </main>

            {/* Delete confirm */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[500] flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setDeleteConfirm(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
                            <div className="text-5xl mb-3">🗑️</div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">Xóa phòng tranh?</h3>
                            <p className="text-gray-500 text-sm mb-6">Hành động này không thể hoàn tác.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold">Hủy</button>
                                <button onClick={() => handleDelete(deleteConfirm!)} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: '#ef4444' }}>Xóa ngay</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
    return (
        <button onClick={onClick} className="flex items-center gap-2 mx-2 my-0.5 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-left transition-all"
            style={{ background: active ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : 'transparent', color: active ? '#fff' : '#6d28d9' }}>
            <span>{icon}</span> {label}
        </button>
    );
}

// ─── Room Card ────────────────────────────────────────────────────────────────
function RoomCard({ gallery, onView, onEdit, onDelete }: { gallery: Gallery; onView: ()=>void; onEdit: ()=>void; onDelete: ()=>void }) {
    const rt = getRoomType(gallery.type);
    const frameCount = Object.keys(gallery.frames || {}).length;
    const date = new Date(gallery.createdAt).toLocaleDateString('vi-VN');
    const thumb = Object.values(gallery.frames || {}).find(f => f.imageUrl)?.imageUrl;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            style={{ border: '1px solid #e0d7ff', background: '#fff' }}>
            <div className={`relative h-28 bg-gradient-to-br ${rt.bg} flex items-center justify-center`}>
                {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover absolute inset-0" /> : null}
                <span className="text-5xl opacity-60 relative z-10">{rt.icon}</span>
            </div>
            <div className="p-4">
                <p className="text-xs font-semibold mb-1" style={{ color: rt.accent }}>{rt.icon} {rt.label}</p>
                <h3 className="font-bold text-gray-800 truncate mb-3">{gallery.title}</h3>
                <div className="flex gap-4 text-xs text-gray-400 mb-4">
                    <span>📅 Ngày tạo: {date}</span>
                    <span>🖼️ Khung ảnh: {frameCount}/{MAX_FRAMES}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={onView} className="flex-1 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
                        👁️ Vào xem
                    </button>
                    <button onClick={onEdit} className="px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">✏️ Sửa</button>
                    <button onClick={onDelete} className="px-3 py-2 rounded-xl text-sm font-semibold border border-red-100 text-red-500 hover:bg-red-50">🗑️ Xóa</button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: ()=>void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="text-8xl">🧊</motion.div>
            <h3 className="text-xl font-bold text-gray-700">Chưa có phòng nào</h3>
            <p className="text-gray-400 text-sm text-center">Bắt đầu bằng cách tạo phòng trưng bày 3D đầu tiên của bạn</p>
            <button onClick={onCreate} className="px-8 py-3 rounded-2xl font-bold text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
                ✨ Tạo phòng Đầu Tiên
            </button>
        </div>
    );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ onBack, user, roomCount, notify, onCreated }: {
    onBack: ()=>void; user: { email: string; name: string };
    roomCount: number; notify: (m: string, ok?: boolean)=>void; onCreated: (g: Gallery)=>void;
}) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<RoomType>('cong-nghe');
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if (!title.trim()) { notify('Vui lòng nhập tên phòng!', false); return; }
        if (roomCount >= MAX_ROOMS) { notify('Đã đạt giới hạn 3 phòng!', false); return; }
        setSaving(true);
        const id = `room_${Date.now()}`;
        const g: Gallery = { id, title: title.trim(), type, frames: {}, createdAt: Date.now(), ownerEmail: user.email };
        await set(dbRef(database, `phong_tranh_3d/${emailKey(user.email)}/${id}`), g);
        setSaving(false);
        onCreated(g);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">✨ Tạo phòng Mới</h2>
                    <button onClick={onBack} className="text-white/70 hover:text-white text-xl font-bold">✕</button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên phòng *</label>
                        <input value={title} onChange={e => setTitle(e.target.value.slice(0, 50))}
                            placeholder="Ví dụ: Phòng Công Nghệ, phòng Lịch Sử..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                        <p className="text-right text-xs text-gray-400 mt-1">{title.length}/50</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Loại phòng *</label>
                        <div className="flex gap-2">
                            {ROOM_TYPES.map(rt => (
                                <button key={rt.id} onClick={() => setType(rt.id)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                                    style={{ borderColor: type === rt.id ? rt.accent : '#e5e7eb', background: type === rt.id ? rt.accent : '#fff', color: type === rt.id ? '#fff' : '#374151' }}>
                                    {rt.icon} {rt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold">Hủy</button>
                        <button onClick={handleCreate} disabled={saving}
                            className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-70"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
                            {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang tạo...</> : '✨ Tạo phòng'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Room Editor (Pannellum 3D) ───────────────────────────────────────────────
function RoomEditor({ gallery, user, onBack, notify }: {
    gallery: Gallery; user: { email: string; name: string };
    onBack: ()=>void; notify: (m: string, ok?: boolean)=>void;
}) {
    const rt = getRoomType(gallery.type);
    const [frames, setFrames] = useState<Record<string, FrameData>>(gallery.frames || {});
    const [editFrame, setEditFrame] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const panoramaRef = useRef<string>('');

    // Tạo panorama 1 lần khi mount
    useEffect(() => {
        panoramaRef.current = generateRoomPanorama(gallery.type);
    }, [gallery.type]);

    // Lắng nghe postMessage từ iframe
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (!e.data?.type) return;
            if (e.data.type === 'ready') {
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'init', panorama: panoramaRef.current,
                    frames, isViewer: false
                }, '*');
            } else if (e.data.type === 'edit-frame') {
                setEditFrame(e.data.num);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [frames]);

    const handleSave = async () => {
        setSaving(true);
        await set(dbRef(database, `phong_tranh_3d/${emailKey(user.email)}/${gallery.id}/frames`), frames);
        setSaving(false); notify('Đã lưu phòng!'); onBack();
    };

    const handleFrameSave = (idx: number, data: FrameData) => {
        const updated = { ...frames, [idx]: data };
        setFrames(updated);
        setEditFrame(null);
        // Cập nhật hotspot trong iframe
        iframeRef.current?.contentWindow?.postMessage({
            type: 'refresh-hotspots', frames: updated
        }, '*');
    };

    return (
        <div className="flex flex-col" style={{ height: '100vh', background: '#111' }}>
            {/* Top bar */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3"
                style={{ background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-colors">
                    {saving ? '⏳' : '←'} Lưu phòng &amp; Quay lại
                </button>
                <h2 className="text-white font-bold text-sm truncate mx-4">Chỉnh sửa: {gallery.title}</h2>
                <span className="flex-shrink-0 text-xs px-3 py-1 rounded-full font-semibold" style={{ background: rt.accent, color: '#fff' }}>{rt.icon} {rt.label}</span>
            </div>

            {/* Pannellum + Sidebar */}
            <div className="flex flex-1 overflow-hidden">
                <iframe
                    ref={iframeRef}
                    src="/room-viewer.html"
                    className="flex-1 border-0"
                    allow="fullscreen"
                    title="Room Viewer"
                />
                {/* Hotspots sidebar */}
                <div className="w-44 flex-shrink-0 flex flex-col overflow-y-auto"
                    style={{ background: '#0f0f1e', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="px-3 py-3 text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Hotspots</div>
                    {Array.from({ length: MAX_FRAMES }, (_, i) => i + 1).map(n => {
                        const f = frames[n];
                        return (
                            <button key={n} onClick={() => setEditFrame(n)}
                                className="flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors border-b hover:bg-white/5"
                                style={{ color: f?.imageUrl ? '#e2e8f0' : 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.05)' }}>
                                <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                                    style={{ background: f?.imageUrl ? rt.accent : 'rgba(255,255,255,0.12)', color: '#fff' }}>{n}</span>
                                Khung {n}
                                {f?.imageUrl && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <AnimatePresence>
                {editFrame !== null && (
                    <FrameEditModal
                        frameNum={editFrame}
                        initial={frames[editFrame] || { imageUrl: '', description: '' }}
                        user={user} galleryId={gallery.id}
                        onSave={data => handleFrameSave(editFrame!, data)}
                        onClose={() => setEditFrame(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Frame Edit Modal ─────────────────────────────────────────────────────────
function FrameEditModal({ frameNum, initial, user, galleryId, onSave, onClose }: {
    frameNum: number; initial: FrameData; user: { email: string; name: string };
    galleryId: string; onSave: (d: FrameData)=>void; onClose: ()=>void;
}) {
    const [imageUrl, setImageUrl] = useState(initial.imageUrl);
    const [description, setDescription] = useState(initial.description);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        setUploading(true); setProgress(10);
        const reader = new FileReader();
        reader.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
        reader.onload = () => { setImageUrl(reader.result as string); setProgress(100); setUploading(false); };
        reader.onerror = () => { setUploading(false); };
        reader.readAsDataURL(file);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: '#1e1e3a', color: '#fff' }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 className="font-bold">Chỉnh sửa Khung {frameNum}</h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white text-xl">✕</button>
                </div>
                <div className="p-6 space-y-5">
                    {/* Preview */}
                    {imageUrl && (
                        <div className="rounded-xl overflow-hidden h-36 bg-black">
                            <img src={imageUrl} alt="" className="w-full h-full object-contain" />
                        </div>
                    )}
                    {/* Upload */}
                    <div>
                        <p className="text-sm font-semibold mb-2">📸 Chọn ảnh từ máy tính:</p>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden"
                            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                        <button onClick={() => fileRef.current?.click()} disabled={uploading}
                            className="w-full py-2 rounded-xl text-sm font-semibold border border-white/20 hover:bg-white/10 transition-colors">
                            {uploading ? `Đang tải... ${progress}%` : 'Choose File'}
                        </button>
                        {uploading && (
                            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: '#7c3aed' }} />
                            </div>
                        )}
                    </div>
                    {/* Divider */}
                    <div className="flex items-center gap-3 text-white/30 text-xs"><div className="flex-1 h-px bg-white/10" />Hoặc nhập link ngoài<div className="flex-1 h-px bg-white/10" /></div>
                    {/* URL */}
                    <div>
                        <div className="flex justify-between mb-1.5"><label className="text-sm font-semibold">Đường dẫn ảnh (URL):</label><a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:underline">Link ngoài là gì?</a></div>
                        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
                    </div>
                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold mb-1.5">Mô tả tranh:</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                            placeholder="Nhập mô tả cho ảnh..."
                            className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }} />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/20 text-sm font-semibold text-white/70 hover:bg-white/5">Hủy</button>
                        <button onClick={() => onSave({ imageUrl, description })}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>💾 Lưu lại</button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Room Viewer (Pannellum 3D) ───────────────────────────────────────────────
function RoomViewer({ gallery, onBack }: { gallery: Gallery; onBack: ()=>void }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const panoramaRef = useRef<string>('');
    const frames = gallery.frames || {};
    const [lightbox, setLightbox] = useState<{ imageUrl: string; description: string } | null>(null);

    useEffect(() => {
        panoramaRef.current = generateRoomPanorama(gallery.type);
    }, [gallery.type]);

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (!e.data?.type) return;
            if (e.data.type === 'ready') {
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'init', panorama: panoramaRef.current,
                    frames, isViewer: true
                }, '*');
            } else if (e.data.type === 'view-frame') {
                setLightbox({ imageUrl: e.data.imageUrl, description: e.data.description });
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [frames]);

    const shareUrl = () => {
        navigator.clipboard.writeText(`${window.location.origin}?room=${gallery.id}`);
    };

    return (
        <div className="flex flex-col" style={{ height: '100vh', background: '#111' }}>
            {/* Top bar */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3"
                style={{ background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={onBack} className="text-white/80 hover:text-white text-sm font-semibold flex items-center gap-2">← Quay lại</button>
                <h2 className="text-white font-bold text-sm truncate mx-4">{gallery.title}</h2>
                <div className="flex gap-2">
                    <button onClick={shareUrl} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white border border-white/20 hover:bg-white/10">🔗 Chia sẻ</button>
                    <button onClick={() => iframeRef.current?.requestFullscreen?.()} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white border border-white/20 hover:bg-white/10">⛶ Full Screen</button>
                </div>
            </div>

            {/* Pannellum iframe */}
            <iframe
                ref={iframeRef}
                src="/room-viewer.html"
                className="flex-1 border-0 w-full"
                allow="fullscreen"
                title="Room Viewer"
            />

            {/* Lightbox */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.92)' }} onClick={() => setLightbox(null)}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={e => e.stopPropagation()} className="max-w-2xl w-full text-center">
                            <img src={lightbox.imageUrl} alt="" className="max-h-[70vh] w-full object-contain rounded-2xl shadow-2xl" />
                            {lightbox.description && <p className="mt-4 text-white/80 text-sm">{lightbox.description}</p>}
                            <button onClick={() => setLightbox(null)} className="mt-5 px-6 py-2 rounded-xl text-white text-sm border border-white/20 hover:bg-white/10">Đóng</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

