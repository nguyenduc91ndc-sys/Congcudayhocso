import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, Eye, LayoutTemplate, Palette, Play, Settings2, SlidersHorizontal, Type, UserRound, X } from 'lucide-react';
import { VideoPlayerTheme, VideoPlayerLayout, VideoQuestionStyle } from '../types';

interface PlayerThemeCustomizerProps {
  theme: VideoPlayerTheme;
  onChange: (theme: VideoPlayerTheme) => void;
}

const colorSchemes = [
  { name: 'Tím hồng', primaryColor: '#7c3aed', secondaryColor: '#ec4899', accentColor: '#f59e0b', backgroundColor: '#111827' },
  { name: 'Xanh biển', primaryColor: '#2563eb', secondaryColor: '#06b6d4', accentColor: '#f97316', backgroundColor: '#0f172a' },
  { name: 'Lá non', primaryColor: '#16a34a', secondaryColor: '#14b8a6', accentColor: '#eab308', backgroundColor: '#052e2b' },
  { name: 'Cam sáng', primaryColor: '#f97316', secondaryColor: '#ef4444', accentColor: '#8b5cf6', backgroundColor: '#1f1308' },
  { name: 'Hồng pastel', primaryColor: '#db2777', secondaryColor: '#f472b6', accentColor: '#22c55e', backgroundColor: '#312033' },
  { name: 'Đen neon', primaryColor: '#22d3ee', secondaryColor: '#a855f7', accentColor: '#facc15', backgroundColor: '#030712' },
  { name: 'Gradient kẹo', primaryColor: '#22c55e', secondaryColor: '#ec4899', accentColor: '#f9a8d4', backgroundColor: '#07111f' },
  { name: 'Gradient biển', primaryColor: '#06b6d4', secondaryColor: '#2563eb', accentColor: '#a78bfa', backgroundColor: '#061526' },
  { name: 'Gradient hoàng hôn', primaryColor: '#f97316', secondaryColor: '#db2777', accentColor: '#facc15', backgroundColor: '#201020' },
];

const gradientPresets: Array<{ name: string; description: string; theme: Partial<VideoPlayerTheme> }> = [
  {
    name: 'Gradient kẹo',
    description: 'Tươi, hợp bài tiểu học.',
    theme: {
      primaryColor: '#22c55e',
      secondaryColor: '#ec4899',
      accentColor: '#f9a8d4',
      backgroundColor: '#07111f',
      layout: 'cinema',
      questionStyle: 'gradient',
      radius: 28,
      fontFamily: 'Nunito',
    },
  },
  {
    name: 'Gradient biển',
    description: 'Mát, rõ chữ, chuyên nghiệp.',
    theme: {
      primaryColor: '#06b6d4',
      secondaryColor: '#2563eb',
      accentColor: '#a78bfa',
      backgroundColor: '#061526',
      layout: 'cinema',
      questionStyle: 'gradient',
      radius: 26,
      fontFamily: 'Be Vietnam Pro',
    },
  },
  {
    name: 'Gradient hoàng hôn',
    description: 'Ấm, nổi bật khi trình chiếu.',
    theme: {
      primaryColor: '#f97316',
      secondaryColor: '#db2777',
      accentColor: '#facc15',
      backgroundColor: '#201020',
      layout: 'sidebar',
      questionStyle: 'gradient',
      radius: 28,
      fontFamily: 'Nunito',
    },
  },
];

const fonts = ['Nunito', 'Arial', 'Be Vietnam Pro', 'Inter', 'Tahoma'];

const layouts: Array<{ value: VideoPlayerLayout; label: string; description: string }> = [
  { value: 'cinema', label: 'Rạp chiếu', description: 'Video nổi bật, thanh điều khiển mềm.' },
  { value: 'full', label: 'Toàn màn hình', description: 'Tối giản, tập trung vào nội dung.' },
  { value: 'sidebar', label: 'Có thanh bên', description: 'Hợp với bài nhiều câu hỏi.' },
];

const questionStyles: Array<{ value: VideoQuestionStyle; label: string }> = [
  { value: 'glass', label: 'Trong suốt' },
  { value: 'card', label: 'Thẻ sáng' },
  { value: 'playful', label: 'Vui nhộn' },
  { value: 'gradient', label: 'Gradient' },
];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const fileToDataUrl = (file: File) => blobToDataUrl(file);

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Cannot load image'));
  image.src = src;
});

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('Cannot compress image'));
  }, type, quality);
});

const compressLogoImage = async (file: File) => {
  const source = await fileToDataUrl(file);
  if (file.type === 'image/svg+xml' && file.size <= 1024 * 1024) {
    return { dataUrl: source, originalSize: file.size, compressedSize: file.size };
  }

  const image = await loadImage(source);
  const maxSize = 512;
  const ratio = Math.min(1, maxSize / Math.max(image.width || maxSize, image.height || maxSize));
  const width = Math.max(1, Math.round((image.width || maxSize) * ratio));
  const height = Math.max(1, Math.round((image.height || maxSize) * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not supported');
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const attempts = [
    { type: 'image/webp', quality: 0.86 },
    { type: 'image/webp', quality: 0.72 },
    { type: 'image/jpeg', quality: 0.78 },
  ];

  let bestBlob: Blob | null = null;
  for (const attempt of attempts) {
    try {
      const blob = await canvasToBlob(canvas, attempt.type, attempt.quality);
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (blob.size <= 1024 * 1024) break;
    } catch {
      // Continue with the next browser-supported format.
    }
  }

  if (!bestBlob) {
    return { dataUrl: source, originalSize: file.size, compressedSize: file.size };
  }

  const dataUrl = await blobToDataUrl(bestBlob);
  return {
    dataUrl: bestBlob.size < file.size ? dataUrl : source,
    originalSize: file.size,
    compressedSize: Math.min(bestBlob.size, file.size),
  };
};

const ThemePreviewModal: React.FC<{ theme: VideoPlayerTheme; onClose: () => void }> = ({ theme, onClose }) => {
  const isSidebar = theme.layout === 'sidebar';
  const questionSurface = theme.questionStyle === 'card'
    ? { backgroundColor: theme.surfaceColor, color: theme.textColor, borderColor: '#e5e7eb' }
    : theme.questionStyle === 'gradient'
      ? { background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor} 58%, ${theme.accentColor})`, color: '#ffffff', borderColor: 'rgba(255,255,255,0.38)' }
    : theme.questionStyle === 'playful'
      ? { background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.secondaryColor})`, color: '#ffffff', borderColor: 'rgba(255,255,255,0.35)' }
      : { backgroundColor: 'rgba(15,23,42,0.78)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-5xl overflow-hidden border border-white/15 bg-slate-900 shadow-2xl"
        style={{
          borderRadius: theme.radius + 10,
          fontFamily: `${theme.fontFamily}, Nunito, Arial, sans-serif`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-lg font-black text-white">Xem trước giao diện xuất bản</h3>
            <p className="text-sm text-slate-400">Mẫu này mô phỏng player sau khi xuất HTML5/SCORM.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div
          className="p-5 sm:p-6"
          style={{
            background: `radial-gradient(circle at 15% 0%, ${theme.primaryColor}66, transparent 34%), radial-gradient(circle at 85% 10%, ${theme.secondaryColor}55, transparent 34%), ${theme.backgroundColor}`,
          }}
        >
          <div className={`mx-auto overflow-hidden border-4 border-white/30 bg-black shadow-2xl ${isSidebar ? 'grid w-full max-w-[900px] md:grid-cols-[minmax(0,1fr)_220px]' : 'w-full max-w-[820px]'}`} style={{ borderRadius: theme.radius }}>
            <div className="relative aspect-video min-w-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black">
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: theme.primaryColor }}>
                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/20">
                  {theme.logoImage ? <img src={theme.logoImage} alt="Logo" className="h-full w-full object-contain" /> : (theme.logoText || 'GV')}
                </span>
                {theme.publishTitle || 'Bài giảng tương tác'}
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                {theme.publishSubtitle || 'Thiết kế bởi Giáo viên CN'}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <button type="button" className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-2xl">
                  <Play size={38} fill="currentColor" className="ml-1" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-black/45 px-5 py-4">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-2/5 rounded-full" style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }} />
                </div>
                <span className="text-xs font-bold text-white">{theme.footerRightText || '01:24'}</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 p-6">
                <div className="w-full max-w-[430px] border p-5 shadow-2xl" style={{ ...questionSurface, borderRadius: Math.max(14, theme.radius) }}>
                  <h4 className="mb-4 text-center text-lg font-black">Câu hỏi hiện ra trong video?</h4>
                  {['A. Đáp án thứ nhất', 'B. Đáp án thứ hai', 'C. Đáp án thứ ba'].map((item, index) => (
                    <div key={item} className="mb-2 flex items-center justify-between rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-700">
                      <span>{item}</span>
                      {index === 1 && <CheckCircle2 size={18} className="text-emerald-500" />}
                    </div>
                  ))}
                  <button type="button" className="mt-2 w-full rounded-full py-3 text-sm font-black text-white" style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}>
                    Trả lời ngay
                  </button>
                </div>
              </div>
            </div>

            {isSidebar && (
              <aside className="hidden min-w-0 border-l border-slate-200 bg-white/95 p-4 text-slate-800 md:block">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white p-1 text-sm font-black shadow-md ring-1 ring-slate-200" style={{ color: theme.primaryColor }}>
                  {theme.logoImage ? <img src={theme.logoImage} alt="Logo" className="h-full w-full object-contain" /> : (theme.logoText || 'GV')}
                </div>
                <h4 className="mb-1 text-base font-black" style={{ color: theme.primaryColor }}>Mục lục bài học</h4>
                <p className="mb-4 text-xs text-slate-500">3 câu hỏi tương tác</p>
                {theme.showAuthorPanel && (
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-50 text-sm font-black" style={{ color: theme.primaryColor }}>
                        {theme.authorAvatarImage ? <img src={theme.authorAvatarImage} alt="Ảnh tác giả" className="h-full w-full object-cover" /> : (theme.authorName || 'GV').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tác giả</p>
                        <p className="truncate font-black text-slate-800">{theme.authorName || 'Tên giáo viên'}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{theme.authorInfo || 'Đơn vị, chức danh, số điện thoại...'}</p>
                      </div>
                    </div>
                  </div>
                )}
                {[1, 2, 3].map((item) => (
                  <div key={item} className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold">
                    Câu hỏi {item}
                  </div>
                ))}
              </aside>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
          <div className="mr-auto text-sm font-semibold text-slate-400">
            {theme.footerLeftText || theme.guideText || 'Học sinh xem video và trả lời câu hỏi để tiếp tục.'}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-white px-5 py-2 text-sm font-black text-slate-800 hover:bg-slate-100">
            Đóng xem trước
          </button>
        </div>
      </div>
    </div>
  );
};

const PlayerThemeCustomizer: React.FC<PlayerThemeCustomizerProps> = ({ theme, onChange }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [activePanel, setActivePanel] = useState<'publish' | 'colors' | 'layout' | null>(null);
  const [logoStatus, setLogoStatus] = useState('');
  const [authorAvatarStatus, setAuthorAvatarStatus] = useState('');
  const updateTheme = (patch: Partial<VideoPlayerTheme>) => onChange({ ...theme, ...patch });
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh logo.');
      return;
    }
    if (file.size > 1024 * 1024) {
      alert('Logo nên nhỏ hơn 1MB để file xuất nhẹ hơn.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateTheme({ logoImage: String(reader.result || '') });
    reader.readAsDataURL(file);
  };
  const handleCompressedLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh logo.');
      return;
    }
    setLogoStatus('Đang nén logo...');
    try {
      const result = await compressLogoImage(file);
      updateTheme({ logoImage: result.dataUrl });
      const saved = result.originalSize - result.compressedSize;
      setLogoStatus(saved > 1024
        ? `Đã nén: ${formatBytes(result.originalSize)} -> ${formatBytes(result.compressedSize)}`
        : `Logo đã tối ưu: ${formatBytes(result.compressedSize)}`);
    } catch {
      setLogoStatus('');
      alert('Không nén được logo này. Vui lòng thử ảnh PNG/JPG/WebP khác.');
    }
  };
  const handleCompressedAuthorAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh đại diện.');
      return;
    }
    setAuthorAvatarStatus('Đang nén ảnh...');
    try {
      const result = await compressLogoImage(file);
      updateTheme({ authorAvatarImage: result.dataUrl });
      const saved = result.originalSize - result.compressedSize;
      setAuthorAvatarStatus(saved > 1024
        ? `Đã nén: ${formatBytes(result.originalSize)} -> ${formatBytes(result.compressedSize)}`
        : `Ảnh đã tối ưu: ${formatBytes(result.compressedSize)}`);
    } catch {
      setAuthorAvatarStatus('');
      alert('Không nén được ảnh này. Vui lòng thử ảnh PNG/JPG/WebP khác.');
    }
  };

  const panelButtonClass = (id: 'publish' | 'colors' | 'layout') =>
    `flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${activePanel === id ? 'border-purple-300 bg-purple-50 text-purple-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setShowPreview(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
      >
        <Eye size={18} /> Xem trước giao diện
      </button>

      <button type="button" onClick={() => setActivePanel(activePanel === 'publish' ? null : 'publish')} className={panelButtonClass('publish')}>
        <span className="flex items-center gap-2 text-sm font-black"><UserRound size={17} /> Thông tin xuất bản</span>
        <ChevronDown size={18} className={`transition ${activePanel === 'publish' ? 'rotate-180' : ''}`} />
      </button>

      {activePanel === 'publish' && (
      <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <UserRound size={18} className="text-purple-600" />
          <h4 className="font-bold text-gray-800">Thông tin xuất bản</h4>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-sm font-black text-purple-700 ring-1 ring-purple-100">
              {theme.logoImage ? <img src={theme.logoImage} alt="Logo" className="h-full w-full object-contain" /> : (theme.logoText || 'GV')}
            </div>
            <div className="min-w-0 flex-1">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-purple-600 px-3 py-2 text-xs font-black text-white hover:bg-purple-700">
                Tải logo lên
                <input type="file" accept="image/*" onChange={handleCompressedLogoUpload} className="hidden" />
              </label>
              {theme.logoImage && (
                <button type="button" onClick={() => updateTheme({ logoImage: '' })} className="ml-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-purple-100 hover:text-red-600">
                  Xóa
                </button>
              )}
              <p className="mt-1 truncate text-[11px] font-semibold text-purple-500">PNG/JPG/WebP, nên dùng ảnh vuông.</p>
              {logoStatus && <p className="mt-1 truncate text-[11px] font-black text-emerald-600">{logoStatus}</p>}
            </div>
          </div>
          {!theme.logoImage && (
            <input
              type="text"
              value={theme.logoText}
              onChange={(e) => updateTheme({ logoText: e.target.value.slice(0, 8) })}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
              placeholder="Chữ thay logo khi chưa tải ảnh: GV"
            />
          )}
          <input
            type="text"
            value={theme.publishTitle}
            onChange={(e) => updateTheme({ publishTitle: e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
            placeholder="Tiêu đề xuất bản"
          />
          <input
            type="text"
            value={theme.publishSubtitle}
            onChange={(e) => updateTheme({ publishSubtitle: e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
            placeholder="Dòng phụ/đơn vị"
          />
          <input
            type="text"
            value={theme.authorName}
            onChange={(e) => updateTheme({ authorName: e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
            placeholder="Tên tác giả"
          />
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-sm font-black text-purple-700 ring-1 ring-gray-200">
              {theme.authorAvatarImage ? <img src={theme.authorAvatarImage} alt="Ảnh tác giả" className="h-full w-full object-cover" /> : (theme.authorName || 'GV').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-slate-800 px-3 py-2 text-xs font-black text-white hover:bg-slate-700">
                Tải ảnh tác giả
                <input type="file" accept="image/*" onChange={handleCompressedAuthorAvatarUpload} className="hidden" />
              </label>
              {theme.authorAvatarImage && (
                <button type="button" onClick={() => updateTheme({ authorAvatarImage: '' })} className="ml-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-gray-200 hover:text-red-600">
                  Xóa
                </button>
              )}
              <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">Nếu không tải ảnh, hệ thống dùng chữ viết tắt.</p>
              {authorAvatarStatus && <p className="mt-1 truncate text-[11px] font-black text-emerald-600">{authorAvatarStatus}</p>}
            </div>
          </div>
          <textarea
            value={theme.authorInfo}
            onChange={(e) => updateTheme({ authorInfo: e.target.value })}
            className="min-h-[72px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
            placeholder="Thông tin thêm: trường, chức danh, số điện thoại..."
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Settings2 size={18} className="text-purple-600" />
          <h4 className="font-bold text-gray-800">Điều khiển và chân trang</h4>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={theme.footerLeftText}
            onChange={(e) => updateTheme({ footerLeftText: e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
            placeholder="Text góc trái dưới"
          />
          <input
            type="text"
            value={theme.footerRightText}
            onChange={(e) => updateTheme({ footerRightText: e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
            placeholder="Text góc phải dưới"
          />
          <textarea
            value={theme.guideText}
            onChange={(e) => updateTheme({ guideText: e.target.value })}
            className="min-h-[70px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
            placeholder="Nội dung hướng dẫn học sinh..."
          />
          <label className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">
            Hiện thông tin tác giả
            <input
              type="checkbox"
              checked={theme.showAuthorPanel}
              onChange={(e) => updateTheme({ showAuthorPanel: e.target.checked })}
              className="h-4 w-4 accent-purple-600"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">
            Tự động chuyển video
            <input
              type="checkbox"
              checked={theme.autoAdvance}
              onChange={(e) => updateTheme({ autoAdvance: e.target.checked })}
              className="h-4 w-4 accent-purple-600"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">
            Bật báo cáo điểm
            <input
              type="checkbox"
              checked={theme.showScoreReport}
              onChange={(e) => updateTheme({ showScoreReport: e.target.checked })}
              className="h-4 w-4 accent-purple-600"
            />
          </label>
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="mb-2 text-xs font-black uppercase text-gray-500">Bat/tat thanh duoi khi xuat file</p>
            <div className="space-y-2">
              {([
                ['showFooterBar', 'Dong chu chan trang'],
                ['showControlBar', 'Toan bo thanh dieu khien'],
                ['showBackButton', 'Nut lui'],
                ['showPlayButton', 'Nut phat/tam dung'],
                ['showNextButton', 'Nut toi'],
                ['showRestartButton', 'Nut lam lai'],
                ['showPageIndicator', 'So trang 1/1'],
                ['showProgressBar', 'Thanh tien trinh'],
                ['showTimeDisplay', 'Thoi luong'],
                ['showFullscreenButton', 'Nut toan man hinh'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
                  {label}
                  <input
                    type="checkbox"
                    checked={theme[key]}
                    onChange={(e) => updateTheme({ [key]: e.target.checked })}
                    className="h-4 w-4 accent-purple-600"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      <button type="button" onClick={() => setActivePanel(activePanel === 'colors' ? null : 'colors')} className={panelButtonClass('colors')}>
        <span className="flex items-center gap-2 text-sm font-black"><Palette size={17} /> Màu sắc player</span>
        <ChevronDown size={18} className={`transition ${activePanel === 'colors' ? 'rotate-180' : ''}`} />
      </button>

      {activePanel === 'colors' && (
      <>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Palette size={18} className="text-purple-600" />
          <h4 className="font-bold text-gray-800">Giao diện Gradient nhanh</h4>
        </div>
        <div className="grid gap-2">
          {gradientPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => updateTheme(preset.theme)}
              className={`rounded-2xl border p-3 text-left transition-all ${theme.questionStyle === 'gradient' && theme.primaryColor === preset.theme.primaryColor ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/40'}`}
            >
              <div
                className="mb-2 h-10 rounded-xl"
                style={{ background: `linear-gradient(90deg, ${preset.theme.primaryColor}, ${preset.theme.secondaryColor}, ${preset.theme.accentColor})` }}
              />
              <span className="block text-sm font-black text-gray-800">{preset.name}</span>
              <span className="block text-xs font-semibold text-gray-500">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={18} className="text-purple-600" />
          <h4 className="font-bold text-gray-800">Bảng màu player</h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.name}
              type="button"
              onClick={() => updateTheme(scheme)}
              className={`rounded-xl border-2 p-2 transition-all ${theme.primaryColor === scheme.primaryColor ? 'border-purple-500 shadow-md' : 'border-gray-200 hover:border-purple-200'}`}
              title={scheme.name}
            >
              <div className="flex h-8 overflow-hidden rounded-lg">
                <span className="flex-1" style={{ backgroundColor: scheme.primaryColor }} />
                <span className="flex-1" style={{ backgroundColor: scheme.secondaryColor }} />
                <span className="flex-1" style={{ backgroundColor: scheme.accentColor }} />
              </div>
              <span className="mt-1 block truncate text-[11px] font-semibold text-gray-600">{scheme.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map((key) => (
          <label key={key} className="text-xs font-bold text-gray-600">
            {key === 'primaryColor' ? 'Chính' : key === 'secondaryColor' ? 'Phụ' : 'Nhấn'}
            <input
              type="color"
              value={theme[key]}
              onChange={(e) => updateTheme({ [key]: e.target.value })}
              className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
            />
          </label>
        ))}
      </div>
      </>
      )}

      <button type="button" onClick={() => setActivePanel(activePanel === 'layout' ? null : 'layout')} className={panelButtonClass('layout')}>
        <span className="flex items-center gap-2 text-sm font-black"><LayoutTemplate size={17} /> Bố cục và font</span>
        <ChevronDown size={18} className={`transition ${activePanel === 'layout' ? 'rotate-180' : ''}`} />
      </button>

      {activePanel === 'layout' && (
      <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <LayoutTemplate size={18} className="text-purple-600" />
          <h4 className="font-bold text-gray-800">Bố cục</h4>
        </div>
        <div className="space-y-2">
          {layouts.map((layout) => (
            <button
              key={layout.value}
              type="button"
              onClick={() => updateTheme({ layout: layout.value })}
              className={`w-full rounded-xl border p-3 text-left transition-all ${theme.layout === layout.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
            >
              <span className="block text-sm font-bold text-gray-800">{layout.label}</span>
              <span className="block text-xs text-gray-500">{layout.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={18} className="text-purple-600" />
          <h4 className="font-bold text-gray-800">Bo góc và câu hỏi</h4>
        </div>
        <label className="block text-xs font-bold text-gray-600">
          Corner radius: {theme.radius}px
          <input
            type="range"
            min={0}
            max={36}
            value={theme.radius}
            onChange={(e) => updateTheme({ radius: Number(e.target.value) })}
            className="mt-2 w-full accent-purple-600"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {questionStyles.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => updateTheme({ questionStyle: style.value })}
              className={`rounded-xl px-2 py-2 text-xs font-bold ${theme.questionStyle === style.value ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Type size={18} className="text-purple-600" />
          <h4 className="font-bold text-gray-800">Font chữ</h4>
        </div>
        <select
          value={theme.fontFamily}
          onChange={(e) => updateTheme({ fontFamily: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
        >
          {fonts.map((font) => <option key={font} value={font}>{font}</option>)}
        </select>
      </div>
      </>
      )}

      {showPreview && <ThemePreviewModal theme={theme} onClose={() => setShowPreview(false)} />}
    </div>
  );
};

export default PlayerThemeCustomizer;
