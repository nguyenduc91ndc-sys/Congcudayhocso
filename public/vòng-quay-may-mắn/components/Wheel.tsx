
import React from 'react';
import { WHEEL_COLORS } from '../constants';
import { polarToCartesian, describeArc } from '../utils/geometry';

interface WheelProps {
  students: string[];
  rotation: number;
  isSpinning: boolean;
}

export const Wheel: React.FC<WheelProps> = ({ students, rotation, isSpinning }) => {
  const numStudents = students.length;
  if (numStudents === 0) return null;

  const anglePerSlice = 360 / numStudents;
  // Tăng bán kính từ 200 lên 242 để tận dụng tối đa viewBox 500x500
  const radius = 242;
  const center = 250;

  return (
    <div className="relative w-[340px] h-[340px] sm:w-[450px] sm:h-[450px] md:w-[540px] md:h-[540px] flex items-center justify-center transition-all duration-300">
      <div 
        className="absolute w-full h-full rounded-full shadow-[0_25px_60px_rgba(255,182,193,0.5)] border-[10px] border-white"
        style={{
          transition: isSpinning ? 'transform 10s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.5s ease-out',
          transform: `rotate(${rotation}deg)`,
        }}
      >
        <svg viewBox="0 0 500 500" className="w-full h-full overflow-visible">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.15"/>
            </filter>
          </defs>
          <g transform="translate(0,0)" filter="url(#shadow)">
            {students.map((student, i) => {
              const startAngle = i * anglePerSlice;
              const endAngle = (i + 1) * anglePerSlice;
              const textAngle = startAngle + anglePerSlice / 2;
              
              // Đặt chữ ở vị trí 65% bán kính để tránh bị che bởi viền ngoài và tâm
              const textPosition = polarToCartesian(center, center, radius * 0.65, textAngle);

              // Tối ưu kích thước font chữ dựa trên số lượng học sinh
              let baseFontSize = 16;
              if (numStudents > 40) baseFontSize = 7.5;
              else if (numStudents > 30) baseFontSize = 9;
              else if (numStudents > 20) baseFontSize = 11;
              else if (numStudents > 12) baseFontSize = 13;
              
              // Điều chỉnh đặc biệt cho tên dài cụ thể hoặc yêu cầu riêng
              const finalFontSize = student === "Nguyễn Khánh Ngân" ? baseFontSize - 0.5 : baseFontSize;

              return (
                <g key={`${student}-${i}`}>
                  <path
                    d={describeArc(center, center, radius, startAngle, endAngle)}
                    fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                    stroke="#fff"
                    strokeWidth="2"
                    className="transition-colors duration-300"
                  />
                  <text
                    x={textPosition.x}
                    y={textPosition.y}
                    dy=".35em"
                    textAnchor="middle"
                    fill="#FFF"
                    fontSize={finalFontSize}
                    fontWeight="900"
                    transform={`rotate(${textAngle + 90}, ${textPosition.x}, ${textPosition.y})`}
                    className="select-none font-roboto uppercase tracking-tighter"
                    style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.3)' }}
                  >
                    {student.length > 15 ? student.substring(0, 14) + '..' : student}
                  </text>
                </g>
              );
            })}
          </g>
          {/* Trang trí tâm vòng quay */}
          <circle cx={center} cy={center} r="25" fill="#fff" shadow-sm="true" />
          <circle cx={center} cy={center} r="15" fill="#FF6B6B" />
          <circle cx={center} cy={center} r="5" fill="#FFF" opacity="0.9" />
        </svg>
      </div>
      
      {/* Kim chỉ thị (Pointer) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-20" style={{filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'}}>
        <svg width="60" height="70" viewBox="0 0 100 120">
          <path d="M50 120 L100 40 L50 0 L0 40 Z" fill="#FFD700" stroke="#FFF" strokeWidth="4"/>
          <circle cx="50" cy="40" r="12" fill="#FFF" />
        </svg>
      </div>
    </div>
  );
};
