import React, { useState } from 'react';
import { CheckCircle2, Eye, LayoutTemplate, Palette, Play, Settings2, SlidersHorizontal, Type, UserRound, X } from 'lucide-react';
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
];

const ThemePreviewModal: React.FC<{ theme: VideoPlayerTheme; onClose: () => void }> = ({ theme, onClose }) => {
  const isSidebar = theme.layout === 'sidebar';
  const questionSurface = theme.questionStyle === 'card'
    ? { backgroundColor: theme.surfaceColor, color: theme.textColor, borderColor: '#e5e7eb' }
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
          className="p-5"
          style={{
            background: `radial-gradient(circle at 15% 0%, ${theme.primaryColor}66, transparent 34%), radial-gradient(circle at 85% 10%, ${theme.secondaryColor}55, transparent 34%), ${theme.backgroundColor}`,
          }}
        >
          <div className={`mx-auto overflow-hidden border-4 border-white/30 bg-black shadow-2xl ${isSidebar ? 'grid max-w-4xl grid-cols-[1fr_230px]' : 'max-w-4xl'}`} style={{ borderRadius: theme.radius }}>
            <div className="relative aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-black">
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: theme.primaryColor }}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">{theme.logoText || 'GV'}</span>
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
                <div className="w-full max-w-md border p-5 shadow-2xl" style={{ ...questionSurface, borderRadius: Math.max(14, theme.radius) }}>
                  <h4 className="mb-4 text-center text-xl font-black">Câu hỏi hiện ra trong video?</h4>
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
              <aside className="hidden bg-white/95 p-4 text-slate-800 md:block">
                <h4 className="mb-1 text-base font-black" style={{ color: theme.primaryColor }}>Mục lục bài học</h4>
                <p className="mb-4 text-xs text-slate-500">3 câu hỏi tương tác</p>
                {theme.showAuthorPanel && (
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tác giả</p>
                    <p className="font-black text-slate-800">{theme.authorName || 'Tên giáo viên'}</p>
                    <p className="mt-1 text-xs text-slate-500">{theme.authorInfo || 'Đơn vị, chức danh, số điện thoại...'}</p>
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
  const [activePanel, setActivePanel] = useState<'publish' | 'colors' | 'layout'>('publish');
  const updateTheme = (patch: Partial<VideoPlayerTheme>) => onChange({ ...theme, ...patch });

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setShowPreview(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl"
      >
        <Eye size={18} /> Xem trước giao diện
      </button>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
        {[
          { id: 'publish', label: 'Thông tin' },
          { id: 'colors', label: 'Màu sắc' },
          { id: 'layout', label: 'Bố cục' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActivePanel(tab.id as 'publish' | 'colors' | 'layout')}
            className={`rounded-lg px-2 py-2 text-xs font-black transition ${activePanel === tab.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activePanel === 'publish' && (
      <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <UserRound size={18} className="text-purple-600" />
          <h4 className="font-bold text-gray-800">Thông tin xuất bản</h4>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={theme.logoText}
            onChange={(e) => updateTheme({ logoText: e.target.value.slice(0, 8) })}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-purple-400 focus:outline-none"
            placeholder="Logo/chữ góc: GV"
          />
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
        </div>
      </div>
      </>
      )}

      {activePanel === 'colors' && (
      <>
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
        <div className="mt-3 grid grid-cols-3 gap-2">
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
