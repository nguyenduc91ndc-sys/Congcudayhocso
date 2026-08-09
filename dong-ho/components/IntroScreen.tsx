import React from 'react';
import { Screen } from '../types';
import { playClick, playWhoosh } from '../utils/sounds';
import ClassTimer from './ClassTimer';

interface IntroScreenProps {
    onSelectMode: (mode: Screen) => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onSelectMode }) => {
    const handleSelect = (mode: Screen) => {
        playClick();
        setTimeout(() => playWhoosh(), 100);
        onSelectMode(mode);
    };

    const modes = [
        {
            id: 'learn' as Screen,
            icon: '📖',
            title: 'Học tập nhé',
            desc: 'Tìm hiểu cách xem giờ trên đồng hồ từng bước',
            color: '#6C63FF',
            gradient: 'linear-gradient(135deg, #6C63FF, #4F46E5)',
        },
        {
            id: 'practice' as Screen,
            icon: '🎮',
            title: 'Thực hành nào',
            desc: 'Kéo kim đồng hồ đến giờ được yêu cầu',
            color: '#2DD4BF',
            gradient: 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
        },
        {
            id: 'quiz' as Screen,
            icon: '🏆',
            title: 'Luyện tập thôi',
            desc: 'Trả lời câu hỏi và ghi điểm cao',
            color: '#FBBF24',
            gradient: 'linear-gradient(135deg, #FBBF24, #D97706)',
        },
    ];

    return (
        <div className="flex-col flex-center" style={{ minHeight: '100vh', padding: '40px 20px', gap: '40px' }}>
            {/* Title */}
            <div className="text-center intro-hero" style={{ maxWidth: '600px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '12px' }}>⏰</div>
                <h1 className="title-xl" style={{ marginBottom: '12px' }}>
                    Xem Giờ Trên Đồng Hồ
                </h1>
                <p className="subtitle">
                    Làm quen với cách xem giờ, rèn kỹ năng quan sát và quản lí thời gian hằng ngày
                </p>
            </div>

            <div className="intro-tool-row">
                {/* Clock animation preview */}
                <div className="intro-clock-preview" style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'rgba(30, 41, 59, 0.85)',
                    border: '3px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}>
                    <svg viewBox="0 0 100 100" width="100" height="100">
                        {/* Simple clock preview */}
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
                            const a = (n * 30 - 90) * (Math.PI / 180);
                            const x = 50 + 36 * Math.cos(a);
                            const y = 50 + 36 * Math.sin(a);
                            return (
                                <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central"
                                    fill="#94A3B8" fontSize="8" fontWeight="600" fontFamily="Quicksand">
                                    {n}
                                </text>
                            );
                        })}
                        {/* Hour hand */}
                        <line x1="50" y1="50" x2="50" y2="26" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate"
                                from="0 50 50" to="360 50 50" dur="43200s" repeatCount="indefinite" />
                        </line>
                        {/* Minute hand */}
                        <line x1="50" y1="50" x2="50" y2="18" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate"
                                from="0 50 50" to="360 50 50" dur="3600s" repeatCount="indefinite" />
                        </line>
                        <circle cx="50" cy="50" r="3" fill="#F1F5F9" />
                    </svg>
                </div>

                <ClassTimer />
            </div>

            {/* Mode selection cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                maxWidth: '800px',
                width: '100%',
            }}>
                {modes.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => handleSelect(mode.id)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '2px solid rgba(255,255,255,0.08)',
                            borderRadius: '20px',
                            padding: '28px 20px',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            textAlign: 'center',
                            color: 'var(--text)',
                            fontFamily: 'Quicksand, sans-serif',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-6px)';
                            e.currentTarget.style.background = `${mode.color}15`;
                            e.currentTarget.style.borderColor = mode.color;
                            e.currentTarget.style.boxShadow = `0 8px 32px ${mode.color}30`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{mode.icon}</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '6px' }}>{mode.title}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{mode.desc}</div>
                        <div style={{
                            marginTop: '16px',
                            padding: '8px 24px',
                            background: mode.gradient,
                            borderRadius: '999px',
                            color: mode.id === 'quiz' ? '#1E293B' : 'white',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            display: 'inline-block',
                        }}>
                            Bắt đầu →
                        </div>
                    </button>
                ))}
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
                Dành cho học sinh Tiểu học — Lớp 1, 2, 3
            </div>
        </div>
    );
};

export default IntroScreen;
