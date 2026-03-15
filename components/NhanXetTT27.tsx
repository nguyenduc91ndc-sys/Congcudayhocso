import React from 'react';

interface Props {
  onBack: () => void;
}

const NhanXetTT27: React.FC<Props> = ({ onBack }) => {
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
          <span className="text-xl">📝</span>
          <div>
            <h2 className="text-white font-bold text-sm">TT27 Auto Nhận Xét</h2>
            <p className="text-white/50 text-xs">Tự động sinh nhận xét chuẩn Thông tư 27</p>
          </div>
        </div>
      </div>

      {/* iframe */}
      <iframe
        src="/nhan-xet-tt27/index.html"
        className="flex-1 w-full border-0"
        title="TT27 Auto Nhận Xét"
      />
    </div>
  );
};

export default NhanXetTT27;
