import React, { useState, useEffect, useRef, useCallback } from 'react';
import { shortenUrl } from '../utils/shareUtils';

// ==================== TYPES & CONSTANTS ====================
interface Props {
  onBack: () => void;
}

interface SeasonInfo {
  name: string;
  emoji: string;
  description: string;
  color: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

const SEASONS: Record<string, SeasonInfo> = {
  spring: { name: 'Mùa Xuân', emoji: '🌸', description: 'Ấm áp, cây cối đâm chồi nảy lộc, hoa nở rộ', color: '#a3e635' },
  summer: { name: 'Mùa Hạ', emoji: '☀️', description: 'Nóng bức, ngày dài đêm ngắn, mưa rào', color: '#facc15' },
  autumn: { name: 'Mùa Thu', emoji: '🍂', description: 'Mát mẻ, lá vàng rơi, trời trong xanh', color: '#f97316' },
  winter: { name: 'Mùa Đông', emoji: '❄️', description: 'Lạnh giá, ngày ngắn đêm dài, cây trụi lá', color: '#38bdf8' },
};

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'Trái Đất quay quanh Mặt Trời mất bao lâu?',
    options: ['30 ngày', '365,25 ngày', '24 giờ', '12 tháng âm lịch'],
    correct: 1,
  },
  {
    question: 'Trục Trái Đất nghiêng bao nhiêu độ so với mặt phẳng quỹ đạo?',
    options: ['0°', '23,5°', '45°', '90°'],
    correct: 1,
  },
  {
    question: 'Ngày Hạ chí ở Bắc bán cầu thường rơi vào khoảng thời gian nào?',
    options: ['21 tháng 3', '21 tháng 6', '23 tháng 9', '22 tháng 12'],
    correct: 1,
  },
  {
    question: 'Nguyên nhân chính gây ra các mùa trên Trái Đất là gì?',
    options: [
      'Khoảng cách từ Trái Đất đến Mặt Trời thay đổi',
      'Trục Trái Đất nghiêng và sự quay quanh Mặt Trời',
      'Mặt Trời thay đổi cường độ ánh sáng',
      'Mặt Trăng che khuất Mặt Trời',
    ],
    correct: 1,
  },
  {
    question: 'Khi Bắc bán cầu đang là Mùa Hạ thì Nam bán cầu đang là mùa gì?',
    options: ['Mùa Xuân', 'Mùa Hạ', 'Mùa Thu', 'Mùa Đông'],
    correct: 3,
  },
];

// ==================== MAIN COMPONENT ====================
const EarthSeasonsSimulation: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'explore' | 'learn' | 'quiz'>('explore');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isShortening, setIsShortening] = useState(false);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Copy & shorten link
  const handleCopyLink = async () => {
    const fullUrl = window.location.href;
    setIsShortening(true);
    try {
      const shortUrl = await shortenUrl(fullUrl);
      await navigator.clipboard.writeText(shortUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      // Fallback
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = fullUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } finally {
      setIsShortening(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'linear-gradient(135deg, #0f0a2e 0%, #1a1145 30%, #0d1f4b 60%, #081028 100%)',
      display: 'flex', flexDirection: 'column', fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      color: '#e2e8f0', overflow: 'hidden',
    }}>
      {/* Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3), rgba(59,130,246,0.3))',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16,
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 12, padding: '8px 16px', color: '#e2e8f0', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600,
          fontFamily: 'inherit', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
        >
          ← Quay lại
        </button>
        <h1 style={{
          margin: 0, fontSize: 20, fontWeight: 800, textAlign: 'center', flex: 1,
          background: 'linear-gradient(90deg, #a78bfa, #60a5fa, #34d399)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          🌍 Chuyển Động Trái Đất & Các Mùa
        </h1>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            disabled={isShortening}
            title={copySuccess ? 'Đã sao chép link rút gọn!' : 'Sao chép link rút gọn'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '8px 14px', borderRadius: 12, border: 'none',
              cursor: isShortening ? 'wait' : 'pointer', fontFamily: 'inherit',
              fontWeight: 700, fontSize: 13, transition: 'all 0.25s',
              background: copySuccess
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              boxShadow: copySuccess
                ? '0 4px 15px rgba(34,197,94,0.4)'
                : '0 4px 15px rgba(99,102,241,0.3)',
              opacity: isShortening ? 0.7 : 1,
            }}
          >
            {isShortening ? (
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : copySuccess ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Đã chép!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Copy link
              </>
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Phóng to toàn màn hình'}
            style={{
              width: 40, height: 40, borderRadius: 12, border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.25s',
              background: isFullscreen
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'rgba(255,255,255,0.1)',
              color: '#fff',
              boxShadow: isFullscreen ? '0 4px 15px rgba(34,197,94,0.4)' : 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isFullscreen ? (
                <><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></>
              ) : (
                <><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8, padding: '10px 20px',
        background: 'rgba(0,0,0,0.2)', flexShrink: 0,
      }}>
        {([
          { id: 'explore' as const, label: '🔭 Khám Phá', },
          { id: 'learn' as const, label: '📚 Học Tập', },
          { id: 'quiz' as const, label: '✏️ Luyện Tập', },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 24px', borderRadius: 30, border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.3s',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(255,255,255,0.08)',
              color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.6)',
              boxShadow: activeTab === tab.id ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
              transform: activeTab === tab.id ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'explore' && <ExploreTab />}
        {activeTab === 'learn' && <LearnTab />}
        {activeTab === 'quiz' && <QuizTab />}
      </div>
    </div>
  );
};

// ==================== EXPLORE TAB (Canvas Simulation) ====================
const ExploreTab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [day, setDay] = useState(80); // ~Xuân phân
  const [speed, setSpeed] = useState(1);
  const [axialTilt, setAxialTilt] = useState(23.5);
  const [latitude, setLatitude] = useState(21);
  
  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });
  
  // Drag earth state
  const isDraggingEarthRef = useRef(false);

  // Stars cache
  const starsRef = useRef<{x: number; y: number; size: number; brightness: number; twinkleSpeed: number}[]>([]);
  
  const dayRef = useRef(day);
  const speedRef = useRef(speed);
  const isPlayingRef = useRef(isPlaying);
  
  useEffect(() => { dayRef.current = day; }, [day]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Generate stars once
  useEffect(() => {
    if (starsRef.current.length === 0) {
      const stars = [];
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random(), y: Math.random(),
          size: Math.random() * 2 + 0.5,
          brightness: Math.random() * 0.5 + 0.5,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
        });
      }
      starsRef.current = stars;
    }
  }, []);

  // Get season from day
  const getSeason = useCallback((d: number): string => {
    const normalized = ((d - 1) % 365) + 1;
    if (normalized >= 80 && normalized < 172) return 'spring';
    if (normalized >= 172 && normalized < 266) return 'summer';
    if (normalized >= 266 && normalized < 355) return 'autumn';
    return 'winter';
  }, []);

  // Calculate day length in hours
  const getDayLength = useCallback((d: number, lat: number, tilt: number): number => {
    const declination = tilt * Math.sin((2 * Math.PI / 365) * (d - 81));
    const latRad = (lat * Math.PI) / 180;
    const decRad = (declination * Math.PI) / 180;
    let cosHA = -Math.tan(latRad) * Math.tan(decRad);
    cosHA = Math.max(-1, Math.min(1, cosHA));
    const hourAngle = Math.acos(cosHA);
    return (2 * hourAngle * 12) / Math.PI;
  }, []);

  // Get date string from day number
  const getDateStr = useCallback((d: number): string => {
    const date = new Date(2024, 0, 1);
    date.setDate(d);
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }, []);

  // Position on ellipse
  const getEarthPos = useCallback((d: number, cx: number, cy: number, a: number, b: number) => {
    const angle = (2 * Math.PI * (d - 1)) / 365 - Math.PI / 2;
    return { x: cx + a * Math.cos(angle), y: cy + b * Math.sin(angle), angle };
  }, []);

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    let frameTime = 0;

    const draw = (timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      
      ctx.save();
      ctx.scale(dpr, dpr);

      // Apply zoom and pan
      ctx.save();
      const currentZoom = zoom;
      const currentPanX = panOffset.x;
      const currentPanY = panOffset.y;
      
      // Clear with gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#0a0520');
      bgGrad.addColorStop(0.5, '#0d1038');
      bgGrad.addColorStop(1, '#06081a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Apply zoom/pan transform
      ctx.translate(w / 2 + currentPanX, h / 2 + currentPanY);
      ctx.scale(currentZoom, currentZoom);
      ctx.translate(-(w / 2), -(h / 2));

      // Draw stars
      const time = timestamp * 0.001;
      starsRef.current.forEach(star => {
        const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed * 50);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle})`;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const cx = w / 2;
      const cy = h / 2;
      const orbitA = Math.min(w, h) * 0.35;
      const orbitB = orbitA * 0.6;

      // Draw orbit (dashed gradient)
      ctx.strokeStyle = 'rgba(139,92,246,0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, orbitA, orbitB, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Sun with glow
      const sunR = 30;
      // Outer glow
      const glowGrad = ctx.createRadialGradient(cx, cy, sunR * 0.5, cx, cy, sunR * 4);
      glowGrad.addColorStop(0, 'rgba(255, 220, 100, 0.3)');
      glowGrad.addColorStop(0.3, 'rgba(255, 180, 50, 0.15)');
      glowGrad.addColorStop(1, 'rgba(255, 150, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, sunR * 4, 0, Math.PI * 2);
      ctx.fill();

      // Corona rays
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 12; i++) {
        const rayAngle = (i * Math.PI * 2) / 12 + time * 0.3;
        const rayLen = sunR * 1.8 + Math.sin(time * 2 + i) * 8;
        ctx.strokeStyle = `rgba(255, 200, 80, ${0.15 + Math.sin(time + i) * 0.05})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rayAngle) * sunR * 1.1, Math.sin(rayAngle) * sunR * 1.1);
        ctx.lineTo(Math.cos(rayAngle) * rayLen, Math.sin(rayAngle) * rayLen);
        ctx.stroke();
      }
      ctx.restore();

      // Sun body
      const sunGrad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, sunR);
      sunGrad.addColorStop(0, '#fffbe6');
      sunGrad.addColorStop(0.3, '#fde047');
      sunGrad.addColorStop(0.7, '#f59e0b');
      sunGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
      ctx.fill();

      // 4 Season markers
      const seasonPoints = [
        { day: 80, label: 'Xuân phân', emoji: '🌸' },
        { day: 172, label: 'Hạ chí', emoji: '☀️' },
        { day: 266, label: 'Thu phân', emoji: '🍂' },
        { day: 355, label: 'Đông chí', emoji: '❄️' },
      ];
      seasonPoints.forEach(sp => {
        const pos = getEarthPos(sp.day, cx, cy, orbitA, orbitB);
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText(sp.emoji, pos.x, pos.y - 18);
        ctx.font = '11px Nunito, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(sp.label, pos.x, pos.y - 4);
      });

      // Earth
      const currentDay = dayRef.current;
      const earthPos = getEarthPos(currentDay, cx, cy, orbitA, orbitB);
      const earthR = 14;

      // Earth glow
      const earthGlow = ctx.createRadialGradient(earthPos.x, earthPos.y, earthR, earthPos.x, earthPos.y, earthR * 2.5);
      earthGlow.addColorStop(0, 'rgba(96, 165, 250, 0.25)');
      earthGlow.addColorStop(1, 'rgba(96, 165, 250, 0)');
      ctx.fillStyle = earthGlow;
      ctx.beginPath();
      ctx.arc(earthPos.x, earthPos.y, earthR * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Earth body
      const earthGrad = ctx.createRadialGradient(earthPos.x - 3, earthPos.y - 3, 1, earthPos.x, earthPos.y, earthR);
      earthGrad.addColorStop(0, '#60a5fa');
      earthGrad.addColorStop(0.4, '#3b82f6');
      earthGrad.addColorStop(0.7, '#2563eb');
      earthGrad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(earthPos.x, earthPos.y, earthR, 0, Math.PI * 2);
      ctx.fill();

      // Continents hint (green patches)
      ctx.fillStyle = 'rgba(34,197,94,0.5)';
      ctx.beginPath();
      ctx.arc(earthPos.x - 3, earthPos.y - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(earthPos.x + 4, earthPos.y + 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(earthPos.x + 1, earthPos.y - 5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Axial tilt line
      const tiltRad = (axialTilt * Math.PI) / 180;
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(
        earthPos.x + Math.sin(tiltRad) * earthR * 2,
        earthPos.y - Math.cos(tiltRad) * earthR * 2
      );
      ctx.lineTo(
        earthPos.x - Math.sin(tiltRad) * earthR * 2,
        earthPos.y + Math.cos(tiltRad) * earthR * 2
      );
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow at top of tilt
      const arrowX = earthPos.x + Math.sin(tiltRad) * earthR * 2;
      const arrowY = earthPos.y - Math.cos(tiltRad) * earthR * 2;
      ctx.fillStyle = 'rgba(248, 113, 113, 0.8)';
      ctx.beginPath();
      ctx.arc(arrowX, arrowY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Sunlight ray to Earth
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(earthPos.x, earthPos.y);
      ctx.stroke();

      ctx.restore(); // zoom/pan transform
      ctx.restore(); // dpr scale

      // Auto-advance day
      if (isPlayingRef.current) {
        const elapsed = timestamp - frameTime;
        if (elapsed > 30) {
          frameTime = timestamp;
          const newDay = ((dayRef.current - 1 + speedRef.current * 0.5) % 365) + 1;
          dayRef.current = newDay;
          setDay(Math.round(newDay * 10) / 10);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [zoom, panOffset, axialTilt, getEarthPos, getSeason, getDayLength]);

  // Zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(5, prev * delta)));
  }, []);

  // Pan with middle mouse / right click drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    } else if (e.button === 0) {
      // Check if clicking near Earth for drag
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2 + panOffset.x;
      const cy = h / 2 + panOffset.y;
      const orbitA = Math.min(w, h) * 0.35 * zoom;
      const orbitB = orbitA * 0.6;
      const angle = (2 * Math.PI * (day - 1)) / 365 - Math.PI / 2;
      const ex = cx + orbitA * Math.cos(angle);
      const ey = cy + orbitB * Math.sin(angle);
      const dx = e.clientX - rect.left - ex;
      const dy = e.clientY - rect.top - ey;
      if (Math.sqrt(dx * dx + dy * dy) < 30 * zoom) {
        isDraggingEarthRef.current = true;
      }
    }
  }, [zoom, panOffset, day]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (isDraggingEarthRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2 + panOffset.x;
      const cy = h / 2 + panOffset.y;
      const orbitA = Math.min(w, h) * 0.35 * zoom;
      const orbitB = orbitA * 0.6;
      const mx = e.clientX - rect.left - cx;
      const my = e.clientY - rect.top - cy;
      let angle = Math.atan2(my / orbitB, mx / orbitA);
      angle = angle + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;
      const newDay = Math.round((angle / (Math.PI * 2)) * 365) + 1;
      setDay(Math.max(1, Math.min(365, newDay)));
      dayRef.current = newDay;
    }
  }, [zoom, panOffset]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    isDraggingEarthRef.current = false;
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Touch handling for mobile zoom/pan
  const touchStartRef = useRef<{touches: {x: number; y: number}[]; dist: number; zoom: number}>({touches: [], dist: 0, zoom: 1});
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
      touchStartRef.current = {
        touches: [{x: t1.clientX, y: t1.clientY}, {x: t2.clientX, y: t2.clientY}],
        dist, zoom
      };
    } else if (e.touches.length === 1) {
      // Single touch drag earth
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2 + panOffset.x;
      const cy = h / 2 + panOffset.y;
      const orbitA = Math.min(w, h) * 0.35 * zoom;
      const orbitB = orbitA * 0.6;
      const angle = (2 * Math.PI * (day - 1)) / 365 - Math.PI / 2;
      const ex = cx + orbitA * Math.cos(angle);
      const ey = cy + orbitB * Math.sin(angle);
      const dx = e.touches[0].clientX - rect.left - ex;
      const dy = e.touches[0].clientY - rect.top - ey;
      if (Math.sqrt(dx * dx + dy * dy) < 40 * zoom) {
        isDraggingEarthRef.current = true;
      }
    }
  }, [zoom, panOffset, day]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
      const scale = dist / touchStartRef.current.dist;
      setZoom(Math.max(0.3, Math.min(5, touchStartRef.current.zoom * scale)));
      // Pan
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const startMidX = (touchStartRef.current.touches[0].x + touchStartRef.current.touches[1].x) / 2;
      const startMidY = (touchStartRef.current.touches[0].y + touchStartRef.current.touches[1].y) / 2;
      setPanOffset(prev => ({ x: prev.x + (midX - startMidX) * 0.05, y: prev.y + (midY - startMidY) * 0.05 }));
    } else if (e.touches.length === 1 && isDraggingEarthRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2 + panOffset.x;
      const cy = h / 2 + panOffset.y;
      const orbitA = Math.min(w, h) * 0.35 * zoom;
      const orbitB = orbitA * 0.6;
      const mx = e.touches[0].clientX - rect.left - cx;
      const my = e.touches[0].clientY - rect.top - cy;
      let angle = Math.atan2(my / orbitB, mx / orbitA);
      angle = angle + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;
      const newDay = Math.round((angle / (Math.PI * 2)) * 365) + 1;
      setDay(Math.max(1, Math.min(365, newDay)));
      dayRef.current = newDay;
    }
  }, [zoom, panOffset]);

  const handleTouchEnd = useCallback(() => {
    isDraggingEarthRef.current = false;
  }, []);

  const currentSeason = getSeason(day);
  const dayLength = getDayLength(day, latitude, axialTilt);
  const seasonInfo = SEASONS[currentSeason];

  const sliderStyle: React.CSSProperties = {
    width: '100%', height: 6, borderRadius: 3,
    appearance: 'none' as any, WebkitAppearance: 'none' as any,
    background: 'rgba(255,255,255,0.15)', outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Canvas Area */}
      <div ref={containerRef} style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}>
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ width: '100%', height: '100%', cursor: isDraggingEarthRef.current ? 'grabbing' : 'default' }}
        />
        {/* Zoom controls overlay */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} style={zoomBtnStyle}>+</button>
          <button onClick={() => setZoom(z => Math.max(0.3, z / 1.2))} style={zoomBtnStyle}>−</button>
          <button onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} style={{...zoomBtnStyle, fontSize: 12}}>⟲</button>
        </div>
        {/* Zoom level indicator */}
        <div style={{
          position: 'absolute', bottom: 16, left: 70, color: 'rgba(255,255,255,0.4)',
          fontSize: 12, fontWeight: 600,
        }}>
          {Math.round(zoom * 100)}%
        </div>
        {/* Drag hint */}
        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'right',
        }}>
          🖱️ Scroll để thu phóng · Alt+Kéo để di chuyển · Kéo Trái Đất trên quỹ đạo
        </div>
      </div>

      {/* Control Panel */}
      <div style={{
        width: 320, flexShrink: 0, padding: 20, overflowY: 'auto',
        background: 'rgba(255,255,255,0.03)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Day slider */}
        <div style={cardStyle}>
          <label style={labelStyle}>📅 Ngày thứ: <b>{Math.round(day)}</b> ({getDateStr(Math.round(day))})</label>
          <input type="range" min={1} max={365} step={1} value={Math.round(day)}
            onChange={e => { const v = Number(e.target.value); setDay(v); dayRef.current = v; }}
            style={sliderStyle} className="custom-slider"
          />
        </div>

        {/* Speed slider */}
        <div style={cardStyle}>
          <label style={labelStyle}>⚡ Tốc độ: <b>{speed.toFixed(1)}x</b></label>
          <input type="range" min={0.1} max={5} step={0.1} value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            style={sliderStyle} className="custom-slider"
          />
        </div>

        {/* Tilt slider */}
        <div style={cardStyle}>
          <label style={labelStyle}>📐 Trục nghiêng: <b>{axialTilt.toFixed(1)}°</b></label>
          <input type="range" min={0} max={45} step={0.5} value={axialTilt}
            onChange={e => setAxialTilt(Number(e.target.value))}
            style={sliderStyle} className="custom-slider"
          />
        </div>

        {/* Latitude slider */}
        <div style={cardStyle}>
          <label style={labelStyle}>🌐 Vĩ độ: <b>{latitude}° Bắc</b></label>
          <input type="range" min={0} max={90} step={1} value={latitude}
            onChange={e => setLatitude(Number(e.target.value))}
            style={sliderStyle} className="custom-slider"
          />
        </div>

        {/* Season info card */}
        <div style={{
          ...cardStyle,
          background: `linear-gradient(135deg, ${seasonInfo.color}22, ${seasonInfo.color}11)`,
          borderColor: `${seasonInfo.color}44`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>{seasonInfo.emoji}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: seasonInfo.color }}>
                {seasonInfo.name}
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                Ngày dài: <b>{dayLength.toFixed(1)} giờ</b>
              </div>
            </div>
          </div>
          {/* Day/night bar */}
          <div style={{
            height: 8, borderRadius: 4, overflow: 'hidden',
            background: '#1e293b', display: 'flex',
          }}>
            <div style={{
              width: `${(dayLength / 24) * 100}%`,
              background: `linear-gradient(90deg, #fbbf24, #f59e0b)`,
              borderRadius: 4, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.5, marginTop: 2 }}>
            <span>☀️ Ngày</span>
            <span>🌙 Đêm</span>
          </div>
          <p style={{ fontSize: 13, opacity: 0.7, margin: '8px 0 0', lineHeight: 1.5 }}>
            {seasonInfo.description}
          </p>
        </div>

        {/* Control buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setIsPlaying(!isPlaying)} style={{
            flex: 1, padding: '12px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 15, fontFamily: 'inherit', transition: 'all 0.2s',
            background: isPlaying
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', boxShadow: isPlaying
              ? '0 4px 15px rgba(239,68,68,0.3)'
              : '0 4px 15px rgba(34,197,94,0.3)',
          }}>
            {isPlaying ? '⏸ Tạm dừng' : '▶ Chạy mô phỏng'}
          </button>
          <button onClick={() => { setDay(80); dayRef.current = 80; setIsPlaying(false); setZoom(1); setPanOffset({x:0,y:0}); }} style={{
            padding: '12px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
            fontWeight: 700, fontSize: 15, fontFamily: 'inherit', color: '#e2e8f0',
            transition: 'all 0.2s',
          }}>
            ↺ Đặt lại
          </button>
        </div>
        <p style={{ fontSize: 11, opacity: 0.4, textAlign: 'center', margin: 0 }}>
          * Bạn có thể kéo trực tiếp Trái Đất trên quỹ đạo
        </p>
      </div>

      {/* Custom slider thumb style */}
      <style>{`
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa, #6366f1);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(99,102,241,0.5);
          border: 2px solid rgba(255,255,255,0.3);
        }
        .custom-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa, #6366f1);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(99,102,241,0.5);
          border: 2px solid rgba(255,255,255,0.3);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const zoomBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0',
  fontSize: 18, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'inherit',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
  borderRadius: 16, padding: 16,
  border: '1px solid rgba(255,255,255,0.1)',
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 10, fontSize: 13, opacity: 0.8, fontWeight: 600,
};

// ==================== LEARN TAB (Drag & Drop) ====================
const LearnTab: React.FC = () => {
  const [assignments, setAssignments] = useState<Record<string, string | null>>({
    spring: null, summer: null, autumn: null, winter: null,
  });
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, boolean | null>>({
    spring: null, summer: null, autumn: null, winter: null,
  });
  const [completed, setCompleted] = useState(false);

  const seasonCards = [
    { id: 'spring', image: '🌸🌷🌼', bgColor: '#dcfce7', label: 'Hoa nở rộ, cây xanh tươi', icon: '🌸' },
    { id: 'summer', image: '☀️🏖️🌊', bgColor: '#fef9c3', label: 'Nắng nóng, đi biển', icon: '☀️' },
    { id: 'autumn', image: '🍂🍁🌾', bgColor: '#fed7aa', label: 'Lá vàng rơi, thu hoạch', icon: '🍂' },
    { id: 'winter', image: '❄️⛄🌨️', bgColor: '#dbeafe', label: 'Tuyết rơi, lạnh giá', icon: '❄️' },
  ];

  const seasonLabels = [
    { id: 'spring', label: 'Mùa Xuân' },
    { id: 'summer', label: 'Mùa Hạ' },
    { id: 'autumn', label: 'Mùa Thu' },
    { id: 'winter', label: 'Mùa Đông' },
  ];

  // Shuffle labels
  const [shuffledLabels] = useState(() => {
    const arr = [...seasonLabels];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const handleDragStart = (labelId: string) => {
    setDragItem(labelId);
  };

  const handleDrop = (cardId: string) => {
    if (!dragItem) return;
    const newAssignments = { ...assignments };
    // Remove dragItem from any previous assignment
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key] === dragItem) newAssignments[key] = null;
    });
    newAssignments[cardId] = dragItem;
    setAssignments(newAssignments);
    setDragItem(null);

    // Check if correct
    const newFeedback = { ...feedback };
    newFeedback[cardId] = dragItem === cardId;
    setFeedback(newFeedback);

    // Check if all assigned and correct
    const allAssigned = Object.values(newAssignments).every(v => v !== null);
    if (allAssigned) {
      const allCorrect = Object.entries(newAssignments).every(([k, v]) => k === v);
      if (allCorrect) {
        setTimeout(() => setCompleted(true), 500);
      }
    }
  };

  const handleReset = () => {
    setAssignments({ spring: null, summer: null, autumn: null, winter: null });
    setFeedback({ spring: null, summer: null, autumn: null, winter: null });
    setCompleted(false);
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 30, gap: 30,
      overflow: 'auto',
    }}>
      <h2 style={{
        margin: 0, fontSize: 22, fontWeight: 800, textAlign: 'center',
        background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        🎯 Ghép tên mùa vào đúng hình ảnh
      </h2>

      {completed && (
        <div style={{
          padding: '12px 30px', borderRadius: 20,
          background: 'linear-gradient(135deg, #22c55e33, #16a34a33)',
          border: '1px solid #22c55e55', fontSize: 18, fontWeight: 700,
          animation: 'pulse 2s infinite',
        }}>
          🎉 Xuất sắc! Bạn đã ghép đúng tất cả!
        </div>
      )}

      {/* Season cards grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
        width: '100%', maxWidth: 900,
      }}>
        {seasonCards.map(card => (
          <div
            key={card.id}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(card.id)}
            style={{
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
              borderRadius: 20, padding: 16, textAlign: 'center',
              border: feedback[card.id] === true
                ? '2px solid #22c55e'
                : feedback[card.id] === false
                  ? '2px solid #ef4444'
                  : '2px dashed rgba(255,255,255,0.2)',
              transition: 'all 0.3s',
              minHeight: 220, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>{card.image}</div>
            <p style={{ fontSize: 13, opacity: 0.6, margin: '4px 0' }}>{card.label}</p>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
            {/* Drop zone */}
            <div style={{
              padding: '10px 20px', borderRadius: 12, minHeight: 42,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: assignments[card.id]
                ? (feedback[card.id] ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)')
                : 'rgba(255,255,255,0.05)',
              border: '1px dashed rgba(255,255,255,0.15)',
              fontSize: 14, fontWeight: 700, width: '100%',
              color: feedback[card.id] ? '#22c55e' : feedback[card.id] === false ? '#ef4444' : 'rgba(255,255,255,0.4)',
            }}>
              {assignments[card.id]
                ? seasonLabels.find(s => s.id === assignments[card.id])?.label
                : 'Kéo thả vào đây'}
            </div>
          </div>
        ))}
      </div>

      {/* Draggable labels */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {shuffledLabels.map(label => {
          const isAssigned = Object.values(assignments).includes(label.id);
          return (
            <div
              key={label.id}
              draggable={!isAssigned}
              onDragStart={() => handleDragStart(label.id)}
              style={{
                padding: '12px 24px', borderRadius: 16, cursor: isAssigned ? 'default' : 'grab',
                background: isAssigned
                  ? 'rgba(255,255,255,0.03)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: isAssigned ? 'rgba(255,255,255,0.2)' : '#fff',
                fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                boxShadow: isAssigned ? 'none' : '0 4px 15px rgba(99,102,241,0.3)',
                transition: 'all 0.2s',
                opacity: isAssigned ? 0.3 : 1,
                textDecoration: isAssigned ? 'line-through' : 'none',
              }}
            >
              {label.label}
            </div>
          );
        })}
      </div>

      <button onClick={handleReset} style={{
        padding: '10px 30px', borderRadius: 14,
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
        color: '#e2e8f0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'all 0.2s',
      }}>
        ↺ Làm lại
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
};

// ==================== QUIZ TAB ====================
const QuizTab: React.FC = () => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<boolean[]>(new Array(QUIZ_QUESTIONS.length).fill(false));
  const [showResult, setShowResult] = useState(false);

  const q = QUIZ_QUESTIONS[currentQ];

  const handleAnswer = (idx: number) => {
    if (answered[currentQ]) return;
    setSelected(idx);
    const newAnswered = [...answered];
    newAnswered[currentQ] = true;
    setAnswered(newAnswered);
    if (idx === q.correct) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQ < QUIZ_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
    } else {
      setShowResult(true);
    }
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setAnswered(new Array(QUIZ_QUESTIONS.length).fill(false));
    setShowResult(false);
  };

  if (showResult) {
    const percent = Math.round((score / QUIZ_QUESTIONS.length) * 100);
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 30, gap: 24,
      }}>
        <div style={{ fontSize: 80 }}>
          {percent >= 80 ? '🏆' : percent >= 60 ? '👍' : '📚'}
        </div>
        <h2 style={{
          margin: 0, fontSize: 28, fontWeight: 800,
          background: percent >= 80
            ? 'linear-gradient(90deg, #fbbf24, #22c55e)'
            : 'linear-gradient(90deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {percent >= 80 ? 'Xuất sắc!' : percent >= 60 ? 'Khá tốt!' : 'Cần cố gắng thêm!'}
        </h2>
        <p style={{ fontSize: 20, fontWeight: 600, opacity: 0.8 }}>
          Điểm: <b style={{ color: '#fbbf24' }}>{score}/{QUIZ_QUESTIONS.length}</b> ({percent}%)
        </p>
        <button onClick={handleRestart} style={{
          padding: '14px 40px', borderRadius: 16,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
        }}>
          🔄 Làm lại
        </button>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 30, gap: 24,
      maxWidth: 700, margin: '0 auto',
    }}>
      {/* Progress */}
      <div style={{ width: '100%', display: 'flex', gap: 6 }}>
        {QUIZ_QUESTIONS.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 6, borderRadius: 3,
            background: i <= currentQ
              ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
              : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      <div style={{ fontSize: 13, opacity: 0.5, fontWeight: 600 }}>
        Câu {currentQ + 1} / {QUIZ_QUESTIONS.length}
      </div>

      {/* Question */}
      <div style={{
        ...cardStyle, width: '100%', textAlign: 'center', padding: 24,
      }}>
        <p style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.6 }}>
          {q.question}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = q.correct === i;
          const isAnswered = answered[currentQ];
          let bg = 'rgba(255,255,255,0.06)';
          let borderColor = 'rgba(255,255,255,0.1)';
          if (isAnswered) {
            if (isCorrect) { bg = 'rgba(34,197,94,0.15)'; borderColor = '#22c55e'; }
            else if (isSelected) { bg = 'rgba(239,68,68,0.15)'; borderColor = '#ef4444'; }
          } else if (isSelected) {
            bg = 'rgba(99,102,241,0.2)'; borderColor = '#6366f1';
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)} style={{
              padding: '14px 20px', borderRadius: 14,
              background: bg, border: `2px solid ${borderColor}`,
              color: '#e2e8f0', fontSize: 15, fontWeight: 600,
              cursor: isAnswered ? 'default' : 'pointer', fontFamily: 'inherit',
              textAlign: 'left', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 800,
                flexShrink: 0,
              }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
              {isAnswered && isCorrect && <span style={{ marginLeft: 'auto' }}>✅</span>}
              {isAnswered && isSelected && !isCorrect && <span style={{ marginLeft: 'auto' }}>❌</span>}
            </button>
          );
        })}
      </div>

      {answered[currentQ] && (
        <button onClick={handleNext} style={{
          padding: '14px 40px', borderRadius: 16,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          transition: 'all 0.2s',
        }}>
          {currentQ < QUIZ_QUESTIONS.length - 1 ? 'Câu tiếp →' : 'Xem kết quả 🏆'}
        </button>
      )}
    </div>
  );
};

export default EarthSeasonsSimulation;
