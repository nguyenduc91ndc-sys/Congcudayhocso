import React from 'react';

export const BeeSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="1" dy="2" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3"/>
        </feComponentTransfer>
        <feMerge> 
          <feMergeNode in="offsetblur"/>
          <feMergeNode in="SourceGraphic"/> 
        </feMerge>
      </filter>
    </defs>
    <g className="animate-float" filter="url(#shadow)">
      {/* Wings (Back) */}
      <path d="M 40 40 C 10 10, -10 50, 40 55 Z" fill="#E0F7FA" stroke="#B2EBF2" strokeWidth="2" className="animate-wings" style={{ transformOrigin: "40px 50px" }} />
      <path d="M 60 40 C 90 10, 110 50, 60 55 Z" fill="#E0F7FA" stroke="#B2EBF2" strokeWidth="2" className="animate-wings" style={{ transformOrigin: "60px 50px", animationDelay: '0.1s' }} />

      {/* Body */}
      <ellipse cx="50" cy="55" rx="35" ry="30" fill="#FFD54F" stroke="#F57F17" strokeWidth="2" />
      
      {/* Stripes */}
      <path d="M 30 35 Q 50 25 70 35" stroke="#3E2723" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M 20 55 Q 50 45 80 55" stroke="#3E2723" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M 28 75 Q 50 65 72 75" stroke="#3E2723" strokeWidth="8" fill="none" strokeLinecap="round" />
      
      {/* Face Area (lighter yellow) */}
      <ellipse cx="50" cy="50" rx="28" ry="22" fill="#FFE082" />

      {/* Eyes */}
      <circle cx="38" cy="48" r="5" fill="#3E2723" />
      <circle cx="39" cy="46" r="2" fill="white" /> {/* Sparkle */}
      
      <circle cx="62" cy="48" r="5" fill="#3E2723" />
      <circle cx="63" cy="46" r="2" fill="white" /> {/* Sparkle */}

      {/* Cheeks */}
      <circle cx="32" cy="55" r="3.5" fill="#FF8A80" opacity="0.6" />
      <circle cx="68" cy="55" r="3.5" fill="#FF8A80" opacity="0.6" />

      {/* Smile */}
      <path d="M 45 58 Q 50 63 55 58" stroke="#3E2723" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      
      {/* Antennae */}
      <path d="M 35 28 Q 30 10 20 15" stroke="#3E2723" strokeWidth="2" fill="none" />
      <circle cx="20" cy="15" r="2" fill="#3E2723" />
      
      <path d="M 65 28 Q 70 10 80 15" stroke="#3E2723" strokeWidth="2" fill="none" />
      <circle cx="80" cy="15" r="2" fill="#3E2723" />
      
      {/* Stinger */}
      <path d="M 50 85 L 47 92 L 53 92 Z" fill="#3E2723" />
    </g>
  </svg>
);

export const HiveSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(10, 5)">
      {/* Branch */}
      <path d="M 40 -15 Q 40 0 40 10" stroke="#795548" strokeWidth="4" fill="none" />
      <path d="M 0 -10 Q 50 -10 100 -5" stroke="#5D4037" strokeWidth="6" strokeLinecap="round" />
      
      {/* Leaves */}
      <path d="M 35 -5 Q 20 -5 20 -20 Q 35 -20 35 -5" fill="#66BB6A" />
      <path d="M 45 -5 Q 60 -5 60 -20 Q 45 -20 45 -5" fill="#81C784" />

      {/* Hive Body (Stacked rounded rectangles for cartoon look) */}
      <ellipse cx="50" cy="15" rx="20" ry="10" fill="#FFCA28" stroke="#F57F17" strokeWidth="1" />
      <ellipse cx="50" cy="30" rx="30" ry="14" fill="#FFC107" stroke="#F57F17" strokeWidth="1" />
      <ellipse cx="50" cy="50" rx="35" ry="18" fill="#FFB300" stroke="#F57F17" strokeWidth="1" />
      <ellipse cx="50" cy="70" rx="28" ry="14" fill="#FFA000" stroke="#F57F17" strokeWidth="1" />
      <ellipse cx="50" cy="85" rx="15" ry="8" fill="#FF8F00" stroke="#F57F17" strokeWidth="1" />

      {/* Entrance */}
      <circle cx="50" cy="55" r="10" fill="#3E2723" />
      
      {/* Highlights */}
      <path d="M 30 30 Q 40 25 50 30" stroke="white" strokeWidth="2" opacity="0.3" fill="none" />
      <path d="M 25 50 Q 35 45 45 50" stroke="white" strokeWidth="2" opacity="0.3" fill="none" />

      {/* Honey Drip */}
      <path d="M 50 85 Q 50 95 55 92 Q 52 98 50 98 Q 48 98 45 92 Q 50 95 50 85" fill="#FFD700" stroke="#FFA000" strokeWidth="0.5" />
    </g>
  </svg>
);

export const FlowerSVG = ({ color = "#FF69B4" }: { color?: string }) => (
  <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(50,50)">
      <circle cx="0" cy="-20" r="15" fill={color} />
      <circle cx="18" cy="-10" r="15" fill={color} />
      <circle cx="18" cy="10" r="15" fill={color} />
      <circle cx="0" cy="20" r="15" fill={color} />
      <circle cx="-18" cy="10" r="15" fill={color} />
      <circle cx="-18" cy="-10" r="15" fill={color} />
      <circle cx="0" cy="0" r="12" fill="#FFF" />
    </g>
  </svg>
);

export const WarningSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <g transform="translate(50, 50)">
      {/* Triangle Background */}
      <path 
        d="M 0 -35 L 40 35 L -40 35 Z" 
        fill="#FFEB3B" 
        stroke="#F57F17" 
        strokeWidth="4" 
        strokeLinejoin="round"
      />
      {/* Inner Triangle detail */}
       <path 
        d="M 0 -25 L 30 28 L -30 28 Z" 
        fill="none" 
        stroke="#FFF" 
        strokeWidth="2" 
        opacity="0.5"
      />
      {/* Exclamation mark */}
      <path d="M 0 -12 L 0 12" stroke="#E65100" strokeWidth="6" strokeLinecap="round" />
      <circle cx="0" cy="22" r="4" fill="#E65100" />
    </g>
  </svg>
);

export const SoundOnSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

export const SoundOffSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v6a23 23 0 0 1-2 2H3V7h4" />
    <path d="M11 5v6" />
    <path d="M16 9l5 5" />
    <path d="M21 9l-5 5" />
  </svg>
);