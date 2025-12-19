import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const SnowBackground: React.FC = () => {
  const { currentTheme } = useTheme();

  const bubbles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    animationDuration: 8 + Math.random() * 15,
    animationDelay: Math.random() * 8,
    size: 15 + Math.random() * 40,
    color: currentTheme.bubbleColors[Math.floor(Math.random() * currentTheme.bubbleColors.length)],
  }));

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-all duration-1000"
      style={{
        background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, ${currentTheme.gradientVia}, ${currentTheme.gradientTo})`,
      }}
    >
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(120vh) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-20vh) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute rounded-full"
          style={{
            left: `${bubble.left}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            background: `radial-gradient(circle at 30% 30%, white, ${bubble.color})`,
            boxShadow: `0 8px 32px ${bubble.color}, inset 0 -5px 20px rgba(255,255,255,0.4)`,
            animation: `float-up ${bubble.animationDuration}s ease-in-out infinite`,
            animationDelay: `-${bubble.animationDelay}s`,
            bottom: -50,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
};

export default SnowBackground;