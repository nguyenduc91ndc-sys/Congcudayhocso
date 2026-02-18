import React, { useRef, useCallback, useEffect, useState } from 'react';
import { hourToAngle, minuteToAngle, calculateAngleFromCenter, angleToMinute, angleToHour } from '../utils/timeUtils';
import { playTick } from '../utils/sounds';

interface AnalogClockProps {
    hour: number;
    minute: number;
    interactive?: boolean;
    onTimeChange?: (hour: number, minute: number) => void;
    highlightHour?: boolean;
    highlightMinute?: boolean;
    size?: number;
    showSecondHand?: boolean;
}

const AnalogClock: React.FC<AnalogClockProps> = ({
    hour,
    minute,
    interactive = false,
    onTimeChange,
    highlightHour = false,
    highlightMinute = false,
    size = 320,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState<'hour' | 'minute' | null>(null);
    const [lastTickMinute, setLastTickMinute] = useState(minute);

    const cx = 160;
    const cy = 160;
    const radius = 140;

    const hourAngle = hourToAngle(hour, minute);
    const minuteAngle = minuteToAngle(minute);

    const getPointerPos = useCallback((e: React.PointerEvent | PointerEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const scaleX = 320 / rect.width;
        const scaleY = 320 / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent, hand: 'hour' | 'minute') => {
        if (!interactive) return;
        e.preventDefault();
        e.stopPropagation();
        setDragging(hand);
        (e.target as Element).setPointerCapture(e.pointerId);
    }, [interactive]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging || !interactive || !onTimeChange) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const angle = calculateAngleFromCenter(cx, cy, pos.x, pos.y);

        if (dragging === 'minute') {
            const newMinute = angleToMinute(angle);
            // Detect hour wrap
            let newHour = hour;
            if (minute > 45 && newMinute < 15) {
                newHour = (hour % 12) + 1;
                if (newHour > 12) newHour = 1;
            } else if (minute < 15 && newMinute > 45) {
                newHour = hour - 1;
                if (newHour < 1) newHour = 12;
            }
            if (newMinute !== lastTickMinute) {
                playTick();
                setLastTickMinute(newMinute);
            }
            onTimeChange(newHour, newMinute);
        } else {
            const newHour = angleToHour(angle);
            onTimeChange(newHour, minute);
        }
    }, [dragging, interactive, onTimeChange, hour, minute, lastTickMinute, getPointerPos]);

    const handlePointerUp = useCallback(() => {
        setDragging(null);
    }, []);

    // Render hour numbers
    const numbers = [];
    for (let i = 1; i <= 12; i++) {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const numR = radius - 24;
        const x = cx + numR * Math.cos(angle);
        const y = cy + numR * Math.sin(angle);
        const isHighlighted = highlightHour && (hour % 12 || 12) === i;
        numbers.push(
            <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHighlighted ? '#6C63FF' : '#E2E8F0'}
                fontSize={isHighlighted ? '20' : '16'}
                fontWeight={isHighlighted ? '800' : '600'}
                fontFamily="Quicksand, sans-serif"
                style={{ transition: 'all 0.3s ease' }}
            >
                {i}
            </text>
        );
    }

    // Render minute ticks
    const ticks = [];
    for (let i = 0; i < 60; i++) {
        const angle = (i * 6 - 90) * (Math.PI / 180);
        const isMajor = i % 5 === 0;
        const innerR = isMajor ? radius - 10 : radius - 6;
        const outerR = radius;
        const isHighlightedTick = highlightMinute && i === minute;
        ticks.push(
            <line
                key={`tick-${i}`}
                x1={cx + innerR * Math.cos(angle)}
                y1={cy + innerR * Math.sin(angle)}
                x2={cx + outerR * Math.cos(angle)}
                y2={cy + outerR * Math.sin(angle)}
                stroke={isHighlightedTick ? '#38BDF8' : isMajor ? '#64748B' : '#334155'}
                strokeWidth={isMajor ? 2.5 : 1}
                strokeLinecap="round"
                style={{ transition: 'stroke 0.3s ease' }}
            />
        );
    }

    // Hand endpoints
    const hourLen = 65;
    const minuteLen = 95;
    const hourRad = (hourAngle - 90) * (Math.PI / 180);
    const minuteRad = (minuteAngle - 90) * (Math.PI / 180);

    const hourEndX = cx + hourLen * Math.cos(hourRad);
    const hourEndY = cy + hourLen * Math.sin(hourRad);
    const minuteEndX = cx + minuteLen * Math.cos(minuteRad);
    const minuteEndY = cy + minuteLen * Math.sin(minuteRad);

    // Back extension (small tail behind center)
    const hourBackX = cx - 14 * Math.cos(hourRad);
    const hourBackY = cy - 14 * Math.sin(hourRad);
    const minuteBackX = cx - 18 * Math.cos(minuteRad);
    const minuteBackY = cy - 18 * Math.sin(minuteRad);

    return (
        <svg
            ref={svgRef}
            viewBox="0 0 320 320"
            width={size}
            height={size}
            style={{
                maxWidth: '100%',
                cursor: interactive ? (dragging ? 'grabbing' : 'pointer') : 'default',
                userSelect: 'none',
                touchAction: 'none',
                filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* Clock face */}
            <defs>
                <radialGradient id="clockFaceGrad" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#2A3352" />
                    <stop offset="100%" stopColor="#1E293B" />
                </radialGradient>
            </defs>

            {/* Outer ring */}
            <circle cx={cx} cy={cy} r={radius + 6} fill="none" stroke="#475569" strokeWidth="2" />
            <circle cx={cx} cy={cy} r={radius + 2} fill="url(#clockFaceGrad)" stroke="#334155" strokeWidth="3" />

            {/* Inner decoration circle */}
            <circle cx={cx} cy={cy} r={radius - 16} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

            {/* Ticks */}
            {ticks}

            {/* Numbers */}
            {numbers}

            {/* === HOUR HAND === */}
            {/* Invisible wide hit area for easy grabbing */}
            {interactive && (
                <line
                    x1={hourBackX} y1={hourBackY}
                    x2={hourEndX} y2={hourEndY}
                    stroke="transparent"
                    strokeWidth="24"
                    strokeLinecap="round"
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => handlePointerDown(e, 'hour')}
                />
            )}
            {/* Visible hour hand */}
            <line
                x1={hourBackX} y1={hourBackY}
                x2={hourEndX} y2={hourEndY}
                stroke={highlightHour ? '#A78BFA' : '#EF4444'}
                strokeWidth="8"
                strokeLinecap="round"
                style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                    transition: dragging === 'hour' ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    pointerEvents: 'none',
                }}
            />
            {/* Drag handle circle at tip of hour hand */}
            {interactive && (
                <circle
                    cx={hourEndX} cy={hourEndY} r="12"
                    fill={highlightHour ? '#A78BFA' : '#EF4444'}
                    fillOpacity="0.3"
                    stroke={highlightHour ? '#A78BFA' : '#EF4444'}
                    strokeWidth="2"
                    style={{
                        cursor: 'grab',
                        transition: dragging === 'hour' ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    onPointerDown={(e) => handlePointerDown(e, 'hour')}
                />
            )}

            {/* === MINUTE HAND === */}
            {/* Invisible wide hit area for easy grabbing */}
            {interactive && (
                <line
                    x1={minuteBackX} y1={minuteBackY}
                    x2={minuteEndX} y2={minuteEndY}
                    stroke="transparent"
                    strokeWidth="20"
                    strokeLinecap="round"
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => handlePointerDown(e, 'minute')}
                />
            )}
            {/* Visible minute hand */}
            <line
                x1={minuteBackX} y1={minuteBackY}
                x2={minuteEndX} y2={minuteEndY}
                stroke={highlightMinute ? '#38BDF8' : '#3B82F6'}
                strokeWidth="5"
                strokeLinecap="round"
                style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                    transition: dragging === 'minute' ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    pointerEvents: 'none',
                }}
            />
            {/* Drag handle circle at tip of minute hand */}
            {interactive && (
                <circle
                    cx={minuteEndX} cy={minuteEndY} r="10"
                    fill={highlightMinute ? '#38BDF8' : '#3B82F6'}
                    fillOpacity="0.25"
                    stroke={highlightMinute ? '#38BDF8' : '#3B82F6'}
                    strokeWidth="2"
                    style={{
                        cursor: 'grab',
                        transition: dragging === 'minute' ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    onPointerDown={(e) => handlePointerDown(e, 'minute')}
                />
            )}

            {/* Center dot */}
            <circle cx={cx} cy={cy} r="10" fill="#F1F5F9" />
            <circle cx={cx} cy={cy} r="5" fill="#6C63FF" />

            {/* Interactive glow hint */}
            {interactive && !dragging && (
                <circle
                    cx={cx}
                    cy={cy}
                    r={radius - 16}
                    fill="none"
                    stroke="rgba(108,99,255,0.15)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    style={{ animation: 'spin 30s linear infinite' }}
                >
                    <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from={`0 ${cx} ${cy}`}
                        to={`360 ${cx} ${cy}`}
                        dur="30s"
                        repeatCount="indefinite"
                    />
                </circle>
            )}
        </svg>
    );
};

export default AnalogClock;
