import React, { useState } from 'react';
import { Award, BadgeCheck, BookOpen, CheckCircle2, ChevronDown, Download, Eye, GraduationCap, ImageIcon, LayoutTemplate, MessageCircle, MousePointerClick, Palette, PenLine, Play, Settings2, SlidersHorizontal, Sparkles, Type, Upload, UserRound, X } from 'lucide-react';
import { VideoPlayerTheme, VideoPlayerLayout, VideoQuestionStyle, VideoSidebarCardStyle, normalizeVideoPlayerTheme } from '../types';

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
  { name: 'Gradient hoàng hôn', primaryColor: '#fb7185', secondaryColor: '#f97316', accentColor: '#fbbf24', backgroundColor: '#201020' },
  { name: 'Gradient ngọc hồng', primaryColor: '#10b981', secondaryColor: '#ec4899', accentColor: '#38bdf8', backgroundColor: '#061b1f' },
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
      primaryColor: '#fb7185',
      secondaryColor: '#f97316',
      accentColor: '#fbbf24',
      backgroundColor: '#201020',
      layout: 'sidebar',
      questionStyle: 'gradient',
      radius: 28,
      fontFamily: 'Nunito',
    },
  },
  {
    name: 'Gradient ngọc hồng',
    description: 'Sáng, sang, hợp video thiếu nhi.',
    theme: {
      primaryColor: '#10b981',
      secondaryColor: '#ec4899',
      accentColor: '#38bdf8',
      backgroundColor: '#061b1f',
      layout: 'cinema',
      questionStyle: 'gradient',
      radius: 28,
      fontFamily: 'Play',
      sidebarCardStyle: 'glow',
      sidebarCardPulse: true,
    },
  },
];

const fonts = [
  { label: 'Play Bold', value: 'Play' },
  { label: 'Paytone One', value: 'Paytone One' },
  { label: 'Nunito', value: 'Nunito' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Be Vietnam Pro', value: 'Be Vietnam Pro' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Tahoma', value: 'Tahoma' },
];

const reportAppsScriptCode = `function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const to = String(payload.to || '').trim();
    const subject = String(payload.subject || 'Báo cáo kết quả học tập').trim();
    const text = String(payload.text || '').trim();
    const html = String(payload.html || '').trim();

    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(to)) {
      return jsonResponse({ ok: false, error: 'Email nhận báo cáo không hợp lệ' });
    }

    GmailApp.sendEmail(to, subject, text || 'Báo cáo kết quả học tập', {
      htmlBody: html || text.replace(/\\n/g, '<br>'),
      name: 'GiaoVienCN'
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'GiaoVienCN result report mailer' });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;

const startGraphicToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const startAbstractGraphic = (from: string, mid: string, to: string, accent: string) => startGraphicToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${to}"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="36"/></filter></defs><rect width="960" height="540" fill="url(#bg)"/><circle cx="180" cy="120" r="150" fill="${accent}" opacity=".42" filter="url(#blur)"/><circle cx="760" cy="140" r="190" fill="#ffffff" opacity=".18" filter="url(#blur)"/><circle cx="560" cy="420" r="210" fill="${accent}" opacity=".28" filter="url(#blur)"/><rect x="112" y="98" width="736" height="344" rx="44" fill="#ffffff" opacity=".12" stroke="#ffffff" stroke-opacity=".32" stroke-width="3"/><rect x="184" y="352" width="260" height="20" rx="10" fill="#ffffff" opacity=".34"/><rect x="184" y="386" width="168" height="16" rx="8" fill="#ffffff" opacity=".22"/></svg>`);

const startWaveGraphic = (bg: string, waveA: string, waveB: string, sun: string) => startGraphicToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" fill="${bg}"/><circle cx="760" cy="118" r="58" fill="${sun}" opacity=".65"/><path d="M0 342c120-62 220-62 340 0s220 62 340 0 180-62 280-18v216H0z" fill="${waveA}" opacity=".88"/><path d="M0 392c126-45 224-45 338 0s224 44 340 0 185-44 282-14v162H0z" fill="${waveB}" opacity=".9"/><rect x="94" y="86" width="330" height="190" rx="30" fill="#ffffff" opacity=".68"/><rect x="134" y="132" width="190" height="20" rx="10" fill="${waveB}" opacity=".82"/><rect x="134" y="178" width="240" height="16" rx="8" fill="${waveA}" opacity=".72"/></svg>`);

const startScienceGraphic = (bgA: string, bgB: string, accent: string) => startGraphicToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></linearGradient></defs><rect width="960" height="540" fill="url(#bg)"/><g fill="none" stroke="${accent}" stroke-width="5" opacity=".58"><circle cx="270" cy="250" r="84"/><ellipse cx="270" cy="250" rx="150" ry="42" transform="rotate(28 270 250)"/><ellipse cx="270" cy="250" rx="150" ry="42" transform="rotate(-28 270 250)"/><path d="M520 132h212M520 184h126M520 236h244M520 288h172"/></g><circle cx="270" cy="250" r="22" fill="${accent}"/><rect x="492" y="110" width="304" height="230" rx="34" fill="#ffffff" opacity=".72"/><path d="M614 390h164M696 308v82" stroke="${accent}" stroke-width="20" stroke-linecap="round"/><circle cx="696" cy="416" r="42" fill="${accent}" opacity=".82"/></svg>`);

const startArtGraphic = (bgA: string, bgB: string, accent: string) => startGraphicToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></linearGradient></defs><rect width="960" height="540" fill="url(#bg)"/><rect x="146" y="98" width="668" height="344" rx="42" fill="#fff" opacity=".58"/><circle cx="268" cy="226" r="72" fill="${accent}" opacity=".78"/><circle cx="388" cy="292" r="58" fill="#60a5fa" opacity=".72"/><circle cx="520" cy="210" r="68" fill="#f472b6" opacity=".72"/><circle cx="642" cy="306" r="64" fill="#34d399" opacity=".7"/><path d="M180 392c132-74 230-74 360 0s216 64 300 12" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round" opacity=".65"/></svg>`);

const startBlankGraphic = (bg: string, accent = '#ffffff') => startGraphicToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" fill="${bg}"/><rect x="0" y="0" width="960" height="540" fill="${accent}" opacity=".08"/><rect x="92" y="86" width="776" height="368" rx="42" fill="#ffffff" opacity=".18" stroke="#ffffff" stroke-opacity=".28" stroke-width="2"/></svg>`);

const startGraphicPresets = [
  {
    category: 'Màu sắc & Trừu tượng',
    name: 'Lớp học sáng',
    description: 'Nhẹ, rõ chữ',
    image: startGraphicToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff7ed"/><stop offset="1" stop-color="#ecfeff"/></linearGradient><linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f59e0b"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs><rect width="960" height="540" fill="url(#bg)"/><path d="M0 390c130-66 244-42 352 0s225 65 352 6c89-41 171-43 256-10v154H0z" fill="#bae6fd"/><rect x="94" y="88" width="360" height="232" rx="28" fill="#ffffff" opacity=".86"/><rect x="126" y="126" width="210" height="22" rx="11" fill="#fbbf24"/><rect x="126" y="174" width="280" height="18" rx="9" fill="#c7d2fe"/><rect x="126" y="212" width="240" height="18" rx="9" fill="#bbf7d0"/><rect x="574" y="118" width="186" height="186" rx="42" fill="url(#card)" opacity=".92"/><path d="M620 202h94M667 155v94" stroke="#fff" stroke-width="24" stroke-linecap="round"/><circle cx="790" cy="84" r="26" fill="#38bdf8"/><circle cx="842" cy="134" r="16" fill="#f472b6"/><circle cx="525" cy="392" r="42" fill="#fde68a"/></svg>`),
  },
  {
    category: 'Màu sắc & Trừu tượng',
    name: 'Sân khấu sao',
    description: 'Nổi bật',
    image: startGraphicToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111827"/><stop offset=".55" stop-color="#312e81"/><stop offset="1" stop-color="#701a75"/></linearGradient><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f0abfc" stop-opacity=".75"/><stop offset="1" stop-color="#f0abfc" stop-opacity="0"/></linearGradient></defs><rect width="960" height="540" fill="url(#bg)"/><path d="M298 0h122L340 540H132zM590 0h132l108 540H610z" fill="url(#beam)" opacity=".36"/><rect x="250" y="128" width="460" height="230" rx="42" fill="#ffffff" opacity=".12"/><path d="M480 124l24 74 78 1-64 45 24 74-62-46-63 46 24-74-63-45 78-1z" fill="#facc15"/><rect x="330" y="386" width="300" height="22" rx="11" fill="#22d3ee"/><rect x="382" y="424" width="196" height="16" rx="8" fill="#f9a8d4"/><circle cx="154" cy="124" r="18" fill="#67e8f9"/><circle cx="812" cy="94" r="24" fill="#f472b6"/><circle cx="798" cy="392" r="14" fill="#facc15"/></svg>`),
  },
  {
    category: 'Văn học & Lịch sử',
    name: 'Vở học vui',
    description: 'Thân thiện',
    image: startGraphicToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fefce8"/><stop offset="1" stop-color="#fdf2f8"/></linearGradient></defs><rect width="960" height="540" fill="url(#bg)"/><path d="M96 94h768v352H96z" fill="#fff" opacity=".72"/><path d="M140 132h680M140 188h680M140 244h680M140 300h680M140 356h680" stroke="#bfdbfe" stroke-width="4"/><path d="M210 88v400" stroke="#fecaca" stroke-width="5"/><rect x="572" y="132" width="164" height="216" rx="22" fill="#a7f3d0"/><rect x="602" y="164" width="104" height="16" rx="8" fill="#059669"/><rect x="602" y="206" width="80" height="16" rx="8" fill="#34d399"/><path d="M276 212l44-44 44 44-44 44z" fill="#f59e0b"/><circle cx="332" cy="330" r="46" fill="#c4b5fd"/><path d="M758 412c-78-34-145-34-214 0" stroke="#f472b6" stroke-width="18" stroke-linecap="round"/></svg>`),
  },
  {
    category: 'Toán học & Khoa học',
    name: 'Công nghệ nhẹ',
    description: 'Hiện đại',
    image: startGraphicToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ecfeff"/><stop offset="1" stop-color="#eef2ff"/></linearGradient></defs><rect width="960" height="540" fill="url(#bg)"/><g fill="none" stroke="#93c5fd" stroke-width="4" opacity=".7"><path d="M160 148h198v126H160z"/><path d="M358 211h124M482 211v98M482 309h154M636 309v84"/><path d="M636 393h162"/></g><rect x="130" y="118" width="256" height="186" rx="28" fill="#fff" opacity=".82"/><rect x="190" y="172" width="136" height="24" rx="12" fill="#2563eb"/><rect x="190" y="222" width="96" height="18" rx="9" fill="#06b6d4"/><rect x="582" y="248" width="116" height="116" rx="28" fill="#8b5cf6"/><path d="M618 306h44M640 284v44" stroke="#fff" stroke-width="16" stroke-linecap="round"/><circle cx="800" cy="393" r="42" fill="#22c55e"/><circle cx="482" cy="211" r="15" fill="#0ea5e9"/><circle cx="636" cy="309" r="15" fill="#a855f7"/></svg>`),
  },
  { category: 'Màu sắc & Trừu tượng', name: 'Aurora tím', description: 'Sang, dịu', image: startAbstractGraphic('#111827', '#4c1d95', '#0f766e', '#f472b6') },
  { category: 'Màu sắc & Trừu tượng', name: 'Cam xanh', description: 'Ấm hiện đại', image: startAbstractGraphic('#431407', '#164e63', '#052e16', '#f59e0b') },
  { category: 'Màu sắc & Trừu tượng', name: 'Pastel sạch', description: 'Rất nhẹ', image: startAbstractGraphic('#eef2ff', '#fdf2f8', '#ecfeff', '#a78bfa') },
  { category: 'Thiên nhiên & Đời sống', name: 'Đồi xanh', description: 'Mềm mắt', image: startWaveGraphic('#f0fdf4', '#86efac', '#22c55e', '#fde68a') },
  { category: 'Thiên nhiên & Đời sống', name: 'Biển sáng', description: 'Mát, rõ', image: startWaveGraphic('#eff6ff', '#bae6fd', '#38bdf8', '#fef3c7') },
  { category: 'Thiên nhiên & Đời sống', name: 'Hoàng hôn', description: 'Ấm nhẹ', image: startWaveGraphic('#fff7ed', '#fed7aa', '#fb923c', '#fde68a') },
  { category: 'Toán học & Khoa học', name: 'Nguyên tử xanh', description: 'Khoa học', image: startScienceGraphic('#ecfeff', '#eef2ff', '#0ea5e9') },
  { category: 'Toán học & Khoa học', name: 'Phòng lab tím', description: 'Hiện đại', image: startScienceGraphic('#f5f3ff', '#fdf2f8', '#8b5cf6') },
  { category: 'Nghệ thuật & Sáng tạo', name: 'Màu nước', description: 'Sáng tạo', image: startArtGraphic('#fff7ed', '#ecfeff', '#f59e0b') },
  { category: 'Nghệ thuật & Sáng tạo', name: 'Bảng màu', description: 'Vui tươi', image: startArtGraphic('#fdf2f8', '#eef2ff', '#ec4899') },
  { category: 'Văn học & Lịch sử', name: 'Trang sách', description: 'Trang nhã', image: startWaveGraphic('#fffbeb', '#fde68a', '#d97706', '#fef3c7') },
  { category: 'Văn học & Lịch sử', name: 'Giấy cổ nhẹ', description: 'Ấm, rõ chữ', image: startAbstractGraphic('#fef3c7', '#fed7aa', '#fefce8', '#92400e') },
  { category: 'Ảnh & nền trống', name: 'Trắng sạch', description: 'Dễ đọc', image: startBlankGraphic('#ffffff', '#e2e8f0') },
  { category: 'Ảnh & nền trống', name: 'Phấn hồng', description: 'Nhẹ nhàng', image: startBlankGraphic('#fff1f2', '#f9a8d4') },
  { category: 'Ảnh & nền trống', name: 'Xám xanh', description: 'Tối giản', image: startBlankGraphic('#f8fafc', '#93c5fd') },
  { category: 'Ảnh & nền trống', name: 'Kem giấy', description: 'Ấm mắt', image: startBlankGraphic('#fffbeb', '#fcd34d') },
  { category: 'Ảnh & nền trống', name: 'Mint sáng', description: 'Mềm', image: startBlankGraphic('#ecfdf5', '#34d399') },
  { category: 'Ảnh & nền trống', name: 'Tím hồng', description: 'Nổi bật', image: startAbstractGraphic('#4338ca', '#7c3aed', '#ec4899', '#f0abfc') },
  { category: 'Ảnh & nền trống', name: 'Xanh tím', description: 'Hiện đại', image: startAbstractGraphic('#06b6d4', '#2563eb', '#312e81', '#67e8f9') },
  { category: 'Ảnh & nền trống', name: 'Cầu vồng mềm', description: 'Tươi', image: startAbstractGraphic('#f43f5e', '#fef3c7', '#38bdf8', '#a78bfa') },
];

const startGraphicCategories = ['Màu sắc & Trừu tượng', 'Toán học & Khoa học', 'Nghệ thuật & Sáng tạo', 'Văn học & Lịch sử', 'Thiên nhiên & Đời sống', 'Ảnh & nền trống'] as const;

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

const sidebarCardStyles: Array<{ value: VideoSidebarCardStyle; label: string; description: string }> = [
  { value: 'glow', label: 'Phát sáng mềm', description: 'Nổi bật vừa phải, hợp khi trình chiếu.' },
  { value: 'neon', label: 'Neon nổi bật', description: 'Viền sáng rõ cho bài học sinh động.' },
  { value: 'soft', label: 'Sáng nhẹ', description: 'Dễ đọc, ít hiệu ứng.' },
  { value: 'solid', label: 'Đậm chắc', description: 'Tương phản cao, hợp nền tối.' },
];

const sidebarIcons = ['👩‍🏫', '⭐', '🎯', '📘', '🏆', '✅', '🚀', '🌟', '🔔', '💡'];

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

const StartGraphicLibraryModal: React.FC<{
  currentImage?: string;
  onSelect: (image: string) => void;
  onClose: () => void;
}> = ({ currentImage, onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<typeof startGraphicCategories[number]>('Màu sắc & Trừu tượng');
  const visiblePresets = startGraphicPresets.filter((preset) => preset.category === activeCategory);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-400/30">
              <ImageIcon size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-white">Thư viện Nền Vector SVG</h3>
              <p className="text-xs font-semibold text-slate-400">Siêu nhẹ & nhanh, chọn là đóng gói theo file xuất.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[224px_minmax(0,1fr)]">
          <aside className="border-b border-slate-800 bg-slate-950 p-3 md:border-b-0 md:border-r">
            <div className="grid gap-1">
              {startGraphicCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-xl px-3 py-3 text-left text-sm font-black transition ${activeCategory === category ? 'bg-indigo-600/25 text-indigo-100 ring-1 ring-indigo-400/35' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visiblePresets.map((preset) => {
                const selected = currentImage === preset.image;
                return (
                  <button
                    key={`${preset.category}-${preset.name}`}
                    type="button"
                    onClick={() => {
                      onSelect(preset.image);
                      onClose();
                    }}
                    className={`group overflow-hidden rounded-xl border bg-slate-900 text-left transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-950/40 ${selected ? 'border-indigo-400 ring-2 ring-indigo-500/40' : 'border-slate-700'}`}
                  >
                    <div className="relative aspect-video overflow-hidden bg-slate-800">
                      <img src={preset.image} alt={preset.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      <span className={`absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg px-3 py-1.5 text-[11px] font-black shadow-lg ${selected ? 'bg-emerald-500 text-white' : 'bg-black/70 text-white opacity-0 backdrop-blur transition group-hover:opacity-100'}`}>
                        {selected ? 'Đang dùng' : 'Sử dụng mẫu này'}
                      </span>
                      <span className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-3 py-2 opacity-0 transition group-hover:opacity-100">
                        <span className="block truncate text-xs font-black text-white">{preset.name}</span>
                        <span className="block truncate text-[10px] font-semibold text-white/70">{preset.description}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlayerThemeCustomizer: React.FC<PlayerThemeCustomizerProps> = ({ theme, onChange }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showStartLibrary, setShowStartLibrary] = useState(false);
  const [showReportGuide, setShowReportGuide] = useState(false);
  const [activePanel, setActivePanel] = useState<'publish' | 'start' | 'colors' | 'layout' | null>(null);
  const [logoStatus, setLogoStatus] = useState('');
  const [authorAvatarStatus, setAuthorAvatarStatus] = useState('');
  const [reportGuideCopyStatus, setReportGuideCopyStatus] = useState('');
  const [reportTestStatus, setReportTestStatus] = useState('');
  const updateTheme = (patch: Partial<VideoPlayerTheme>) => onChange({ ...theme, ...patch });
  const copyReportAppsScriptCode = async () => {
    try {
      await navigator.clipboard.writeText(reportAppsScriptCode);
      setReportGuideCopyStatus('Đã sao chép mã.');
    } catch {
      setReportGuideCopyStatus('Không tự sao chép được, hãy bôi đen mã bên dưới để copy.');
    }
  };
  const sendTestReport = async () => {
    const to = String(theme.reportEmail || '').trim();
    const reportUrl = String(theme.reportApiUrl || '').trim();

    if (!to) {
      setReportTestStatus('Nhập Gmail nhận báo cáo trước.');
      return;
    }

    if (!reportUrl) {
      setReportTestStatus('Dán link Apps Script đuôi /exec trước.');
      return;
    }

    const payload = {
      to,
      subject: 'GiaoVienCN - Thử gửi báo cáo',
      text: `Đây là email thử gửi báo cáo từ GiaoVienCN.\nThời gian: ${new Date().toLocaleString('vi-VN')}`,
      html: `<p><b>Đây là email thử gửi báo cáo từ GiaoVienCN.</b></p><p>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>`,
      learnerName: 'Email thử',
      lessonTitle: 'Kiểm tra cấu hình gửi báo cáo',
    };

    setReportTestStatus('Đang gửi thử...');
    try {
      const directAppsScript = /script\.google\.com|script\.googleusercontent\.com/i.test(reportUrl);
      const response = await fetch(reportUrl, directAppsScript ? {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      } : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!directAppsScript && !response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Không gửi được email thử.');
      }

      setReportTestStatus('Đã gửi yêu cầu. Kiểm tra Gmail và mục Spam.');
    } catch (error) {
      setReportTestStatus(error instanceof Error ? error.message : 'Không gửi được email thử.');
    }
  };
  const handleBackupTheme = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      theme: normalizeVideoPlayerTheme(theme),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'giao-dien-video-tuong-tac.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const importedTheme = parsed.theme || parsed;
        onChange(normalizeVideoPlayerTheme(importedTheme));
      } catch {
        alert('File giao diện không hợp lệ. Vui lòng chọn file JSON đã backup từ hệ thống.');
      }
    };
    reader.readAsText(file);
  };
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
  const handleThemeImageUpload = async (
    field: 'startBackgroundImage' | 'certificateLogoImage' | 'certificateSealImage' | 'certificateSignatureImage',
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh PNG/JPG/WebP.');
      return;
    }
    try {
      const result = await compressLogoImage(file);
      updateTheme({ [field]: result.dataUrl } as Partial<VideoPlayerTheme>);
    } catch {
      alert('Không xử lý được ảnh này. Vui lòng thử ảnh PNG/JPG/WebP khác.');
    }
  };

  const panelButtonClass = (id: 'publish' | 'start' | 'colors' | 'layout') =>
    `flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${activePanel === id ? 'border-purple-300 bg-purple-50 text-purple-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`;

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="group flex min-h-[86px] flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-3 py-3 text-center text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/18 ring-1 ring-white/25 transition group-hover:bg-white/25">
            <Eye size={19} />
          </span>
          <span className="text-sm font-black leading-tight">Xem trước</span>
          <span className="text-[11px] font-bold leading-tight text-white/75">Preview</span>
        </button>
        <button
          type="button"
          onClick={handleBackupTheme}
          className="group flex min-h-[86px] flex-col items-center justify-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-center text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-100 hover:shadow-sm"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-violet-700 shadow-sm ring-1 ring-violet-100 transition group-hover:bg-violet-600 group-hover:text-white">
            <Download size={18} />
          </span>
          <span className="text-sm font-black leading-tight">Sao lưu</span>
          <span className="text-[11px] font-bold leading-tight text-violet-500">Giao diện</span>
        </button>
        <label className="group flex min-h-[86px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-sm">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100 transition group-hover:bg-emerald-600 group-hover:text-white">
            <Upload size={18} />
          </span>
          <span className="text-sm font-black leading-tight">Nhập</span>
          <span className="text-[11px] font-bold leading-tight text-emerald-500">Giao diện</span>
          <input type="file" accept="application/json,.json" onChange={handleImportTheme} className="hidden" />
        </label>
      </div>

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
            placeholder="Tên giáo viên trên thư khen"
          />
          <p className="-mt-2 text-[11px] font-semibold text-slate-400">
            Tên này sẽ xuất hiện ở phần giáo viên cuối thư khen.
          </p>
          <input
            type="email"
            value={theme.reportEmail || ''}
            onChange={(e) => updateTheme({ reportEmail: e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
            placeholder="Gmail nhận báo cáo"
          />
          <p className="-mt-2 text-[11px] font-semibold text-slate-400">
            Nút gửi báo cáo sẽ gửi thẳng kết quả tới địa chỉ này.
          </p>
          <div className="space-y-2">
            <input
              type="url"
              value={theme.reportApiUrl || ''}
              onChange={(e) => updateTheme({ reportApiUrl: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
              placeholder="Link Apps Script gửi báo cáo"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={sendTestReport}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
              >
                <CheckCircle2 size={14} />
                Gửi thử
              </button>
              <button
                type="button"
                onClick={() => setShowReportGuide(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 ring-1 ring-indigo-100 transition hover:bg-indigo-100"
              >
                <BookOpen size={14} />
                Hướng dẫn
              </button>
            </div>
          </div>
          <p className="-mt-2 text-[11px] font-semibold text-slate-400">
            Dán link Web App đuôi /exec để file ZIP tự gửi qua internet.
          </p>
          {reportTestStatus && (
            <p className="-mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600">
              {reportTestStatus}
            </p>
          )}
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
            <p className="mb-2 text-xs font-black uppercase text-gray-500">Bật/tắt thanh dưới khi xuất file</p>
            <div className="space-y-2">
              {([
                ['showFooterBar', 'Dòng chữ chân trang'],
                ['showControlBar', 'Toàn bộ thanh điều khiển'],
                ['showBackButton', 'Nút lùi'],
                ['showPlayButton', 'Nút phát/tạm dừng'],
                ['showNextButton', 'Nút tới'],
                ['showRestartButton', 'Nút làm lại'],
                ['showPageIndicator', 'Số trang 1/1'],
                ['showProgressBar', 'Thanh tiến trình'],
                ['showTimeDisplay', 'Thời lượng'],
                ['showFullscreenButton', 'Nút toàn màn hình'],
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

      <button type="button" onClick={() => setActivePanel(activePanel === 'start' ? null : 'start')} className={panelButtonClass('start')}>
        <span className="flex items-center gap-2 text-sm font-black"><Settings2 size={17} /> Trang bắt đầu & Thư khen</span>
        <ChevronDown size={18} className={`transition ${activePanel === 'start' ? 'rotate-180' : ''}`} />
      </button>

      {activePanel === 'start' && (
      <>
      <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-200">
              <Settings2 size={18} />
            </span>
            <div>
              <h4 className="font-black text-gray-900">Trang bắt đầu</h4>
              <p className="text-[11px] font-bold text-amber-700">Màn nhập tên trước khi học sinh vào bài.</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-700">
              <BookOpen size={14} className="text-amber-600" />
              Tiêu đề màn bắt đầu
            </span>
            <input
              type="text"
              value={theme.startTitle}
              onChange={(e) => updateTheme({ startTitle: e.target.value })}
              className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:border-amber-400 focus:outline-none"
              placeholder="Tiêu đề: Vào bài học"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-700">
              <MessageCircle size={14} className="text-amber-600" />
              Lời hướng dẫn
            </span>
            <textarea
              value={theme.startSubtitle}
              onChange={(e) => updateTheme({ startSubtitle: e.target.value })}
              className="min-h-[72px] w-full resize-none rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:border-amber-400 focus:outline-none"
              placeholder="Dòng hướng dẫn trên màn bắt đầu"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-700">
              <MousePointerClick size={14} className="text-amber-600" />
              Chữ trên nút
            </span>
            <input
              type="text"
              value={theme.startButtonText}
              onChange={(e) => updateTheme({ startButtonText: e.target.value })}
              className="w-full rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:border-amber-400 focus:outline-none"
              placeholder="Chữ nút bắt đầu"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white px-3 py-2.5 shadow-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <GraduationCap size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-gray-800">Yêu cầu nhập lớp</span>
                <span className="block text-[11px] font-semibold text-slate-500">Bật khi cần ghi lớp lên thư khen.</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={theme.requireLearnerClass}
              onChange={(e) => updateTheme({ requireLearnerClass: e.target.checked })}
              className="h-5 w-5 shrink-0 accent-amber-500"
            />
          </label>
          <div className="rounded-2xl border border-amber-100 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                <ImageIcon size={16} className="text-amber-600" />
                Kho nền mở màn
              </span>
              {theme.startBackgroundImage && (
                <button type="button" onClick={() => updateTheme({ startBackgroundImage: '' })} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Xóa nền">
                  <X size={14} strokeWidth={2.6} />
                </button>
              )}
            </div>
            <div className="mb-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              <div className="aspect-video w-full">
                {theme.startBackgroundImage ? (
                  <img src={theme.startBackgroundImage} alt="Nền mở màn" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-center text-slate-400">
                    <div>
                      <Sparkles size={24} className="mx-auto mb-1" />
                      <p className="text-xs font-black">Chọn nền mẫu hoặc tải ảnh</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowStartLibrary(true)}
              className="mb-3 flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-100"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
                  <ImageIcon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-indigo-950">Mở thư viện SVG</span>
                  <span className="block truncate text-[11px] font-bold text-indigo-600">Nhiều nhóm nền nhẹ cho giáo viên chọn</span>
                </span>
              </span>
              <ChevronDown size={17} className="-rotate-90 text-indigo-500" />
            </button>
            <div className="grid grid-cols-2 gap-2">
              {startGraphicPresets.slice(0, 4).map((preset) => (
                <button
                  key={`${preset.category}-${preset.name}`}
                  type="button"
                  onClick={() => updateTheme({ startBackgroundImage: preset.image })}
                  className={`overflow-hidden rounded-xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md ${theme.startBackgroundImage === preset.image ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-100'}`}
                >
                  <img src={preset.image} alt={preset.name} className="h-14 w-full object-cover" />
                  <span className="block px-2 py-1.5">
                    <span className="block truncate text-[11px] font-black text-slate-800">{preset.name}</span>
                    <span className="block truncate text-[10px] font-bold text-slate-400">{preset.description}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-white shadow-sm shadow-amber-200 hover:bg-amber-600">
                <Upload size={14} />
                Tải ảnh riêng
                <input type="file" accept="image/*" onChange={(event) => handleThemeImageUpload('startBackgroundImage', event)} className="hidden" />
              </label>
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-amber-700">Nền này chỉ dùng cho màn nhập tên/lớp và được đóng gói theo file xuất.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <h4 className="font-bold text-gray-800">Thư khen</h4>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={theme.certificateTitle}
            onChange={(e) => updateTheme({ certificateTitle: e.target.value })}
            className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-emerald-400 focus:outline-none"
            placeholder="Tiêu đề: Thư khen"
          />
          <input
            type="text"
            value={theme.certificateSubtitle}
            onChange={(e) => updateTheme({ certificateSubtitle: e.target.value })}
            className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-emerald-400 focus:outline-none"
            placeholder="Dòng phụ trên thư khen"
          />
          <textarea
            value={theme.certificateMessage}
            onChange={(e) => updateTheme({ certificateMessage: e.target.value })}
            className="min-h-[76px] w-full resize-none rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-emerald-400 focus:outline-none"
            placeholder="Nội dung lời khen"
          />
          <div className="grid gap-2">
            {([
              {
                field: 'certificateLogoImage',
                label: 'Logo thư khen',
                hint: 'Góc trái',
                Icon: ImageIcon,
              },
              {
                field: 'certificateSealImage',
                label: 'Con dấu',
                hint: 'Góc phải',
                Icon: BadgeCheck,
              },
              {
                field: 'certificateSignatureImage',
                label: 'Chữ ký',
                hint: 'Cuối thư',
                Icon: PenLine,
              },
            ] as const).map(({ field, label, hint, Icon }) => {
              const hasImage = Boolean(theme[field]);
              return (
                <div
                  key={field}
                  className={`group grid grid-cols-[minmax(0,1fr)_72px] gap-3 rounded-2xl border p-3 transition ${hasImage ? 'border-emerald-200 bg-white shadow-sm' : 'border-dashed border-emerald-200 bg-white/70 hover:border-emerald-300 hover:bg-white'}`}
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${hasImage ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                        <Icon size={16} strokeWidth={2.6} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black text-slate-800">{label}</span>
                        <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{hint}</span>
                      </span>
                      {hasImage && <CheckCircle2 size={15} className="ml-auto shrink-0 text-emerald-600" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2 text-[11px] font-black text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700">
                        <Upload size={13} />
                        {hasImage ? 'Đổi ảnh' : 'Tải ảnh'}
                        <input type="file" accept="image/*" onChange={(event) => handleThemeImageUpload(field, event)} className="hidden" />
                      </label>
                      {hasImage && (
                        <button
                          type="button"
                          onClick={() => updateTheme({ [field]: '' } as Partial<VideoPlayerTheme>)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          title={`Xóa ${label}`}
                        >
                          <X size={14} strokeWidth={2.6} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid h-20 place-items-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                    {hasImage ? (
                      <img src={theme[field]} alt={label} className="h-full w-full object-contain p-2" />
                    ) : (
                      <Award size={22} className="text-slate-300" />
                    )}
                  </div>
                </div>
              );
            })}
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
          {fonts.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <div className="mb-3 flex items-center gap-2">
          <Type size={18} className="text-purple-600" />
          <h4 className="font-bold text-gray-800">Cỡ chữ và thẻ câu hỏi</h4>
        </div>
        <label className="block text-xs font-bold text-gray-600">
          Cỡ chữ toàn player: {theme.fontScale || 100}%
          <input
            type="range"
            min={90}
            max={118}
            step={2}
            value={theme.fontScale || 100}
            onChange={(e) => updateTheme({ fontScale: Number(e.target.value) })}
            className="mt-2 w-full accent-purple-600"
          />
        </label>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {sidebarCardStyles.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => updateTheme({ sidebarCardStyle: style.value })}
              className={`rounded-xl border p-3 text-left transition ${theme.sidebarCardStyle === style.value ? 'border-purple-400 bg-white shadow-sm' : 'border-slate-200 bg-white/70 hover:bg-white'}`}
            >
              <span className="block text-sm font-black text-slate-800">{style.label}</span>
              <span className="block text-xs font-semibold text-slate-500">{style.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_170px]">
          <label className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-700 ring-1 ring-slate-100">
            Nhấp nháy nhẹ câu đang học
            <input
              type="checkbox"
              checked={theme.sidebarCardPulse}
              onChange={(e) => updateTheme({ sidebarCardPulse: e.target.checked })}
              className="h-4 w-4 accent-purple-600"
            />
          </label>
          <label className="block rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
            <span className="mb-1 block text-[11px] font-black uppercase text-slate-500">Icon trước câu hỏi</span>
            <input
              type="text"
              value={theme.sidebarIcon || ''}
              onChange={(e) => updateTheme({ sidebarIcon: e.target.value.slice(0, 4) })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-lg font-black text-slate-800 outline-none focus:border-purple-400"
              placeholder="👩‍🏫"
              title="Icon hiển thị trước Câu 1, Câu 2..."
            />
          </label>
        </div>
        <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
          <p className="mb-2 text-[11px] font-black uppercase text-slate-500">Chọn nhanh</p>
          <div className="grid grid-cols-5 gap-2">
            {sidebarIcons.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => updateTheme({ sidebarIcon: icon })}
                className={`grid h-10 place-items-center rounded-xl border text-lg transition ${theme.sidebarIcon === icon ? 'border-purple-400 bg-purple-50 shadow-sm' : 'border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-50/60'}`}
                title={`Dùng icon ${icon}`}
              >
                {icon}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">Icon dùng emoji nên file xuất rất nhẹ và chạy độc lập.</p>
        </div>
      </div>
      </>
      )}

      {showReportGuide && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase text-indigo-500">Gửi báo cáo về Gmail</p>
                <h3 className="text-lg font-black text-slate-900">Cách lấy link Apps Script</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportGuide(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                aria-label="Đóng hướng dẫn"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5 text-sm font-semibold text-slate-600">
              <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-100">
                Học sinh không cần đăng nhập Gmail. File ZIP chỉ cần có internet và đã dán đúng link Web App.
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-indigo-900">Mã này dùng chung cho mọi giáo viên</p>
                    <p className="mt-1 text-xs font-semibold text-indigo-700">Bấm sao chép, rồi dán thay toàn bộ mã mặc định trong Apps Script.</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyReportAppsScriptCode}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    Sao chép mã
                  </button>
                </div>
                {reportGuideCopyStatus && <p className="mt-2 text-xs font-black text-indigo-700">{reportGuideCopyStatus}</p>}
                <textarea
                  readOnly
                  value={reportAppsScriptCode}
                  className="mt-3 h-28 w-full resize-none rounded-xl border border-indigo-100 bg-white p-3 font-mono text-[11px] font-semibold text-slate-700 outline-none"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
              <ol className="space-y-3">
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-black text-slate-900">1. Mở Google Apps Script:</span> vào <span className="font-mono text-indigo-700">script.google.com</span> và tạo project mới.
                </li>
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-black text-slate-900">2. Dán mã gửi Gmail:</span> dùng nội dung file <span className="font-mono text-indigo-700">google-apps-script/send-result-report.gs</span>.
                </li>
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-black text-slate-900">3. Deploy Web App:</span> chọn <span className="font-mono">Execute as: Me</span> và <span className="font-mono">Who has access: Anyone</span>.
                </li>
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-black text-slate-900">4. Copy link /exec:</span> dán link đó vào ô <span className="font-black text-indigo-700">Link Apps Script gửi báo cáo</span>.
                </li>
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-black text-slate-900">5. Bấm Gửi thử:</span> kiểm tra Gmail và mục Spam để chắc cấu hình đã chạy.
                </li>
                <li className="rounded-2xl bg-slate-50 p-4">
                  <span className="font-black text-slate-900">6. Xuất ZIP lại:</span> khi học sinh bấm <span className="font-black text-emerald-700">Xuất thư khen</span>, báo cáo sẽ tự gửi về Gmail đã nhập.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {showPreview && <ThemePreviewModal theme={theme} onClose={() => setShowPreview(false)} />}
      {showStartLibrary && (
        <StartGraphicLibraryModal
          currentImage={theme.startBackgroundImage}
          onSelect={(image) => updateTheme({ startBackgroundImage: image })}
          onClose={() => setShowStartLibrary(false)}
        />
      )}
    </div>
  );
};

export default PlayerThemeCustomizer;
