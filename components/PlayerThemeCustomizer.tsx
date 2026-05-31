import React from 'react';
import { LayoutTemplate, Palette, SlidersHorizontal, Type } from 'lucide-react';
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

const PlayerThemeCustomizer: React.FC<PlayerThemeCustomizerProps> = ({ theme, onChange }) => {
  const updateTheme = (patch: Partial<VideoPlayerTheme>) => onChange({ ...theme, ...patch });

  return (
    <div className="space-y-5">
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
    </div>
  );
};

export default PlayerThemeCustomizer;
