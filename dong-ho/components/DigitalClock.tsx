import React from 'react';
import { formatDigital, formatTimeText } from '../utils/timeUtils';

interface DigitalClockProps {
    hour: number;
    minute: number;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const DigitalClock: React.FC<DigitalClockProps> = ({
    hour,
    minute,
    showLabel = true,
    size = 'md',
}) => {
    const digitalStr = formatDigital(hour, minute);
    const label = formatTimeText(hour, minute);
    const [hh, mm] = digitalStr.split(':');

    const fontSizes = {
        sm: 'clamp(1.8rem, 4vw, 2.5rem)',
        md: 'clamp(2.5rem, 6vw, 4rem)',
        lg: 'clamp(3rem, 8vw, 5rem)',
    };

    return (
        <div className="digital-clock" style={{ minWidth: size === 'sm' ? '160px' : '220px' }}>
            <div
                className="digital-time"
                style={{ fontSize: fontSizes[size] }}
                aria-label={`${hour} giờ ${minute} phút`}
            >
                <span>{hh}</span>
                <span className="colon" style={{ margin: '0 2px' }}>:</span>
                <span>{mm}</span>
            </div>
            {showLabel && (
                <div className="digital-label" style={{
                    fontSize: size === 'sm' ? '0.8rem' : 'clamp(0.9rem, 1.5vw, 1.15rem)',
                    marginTop: '10px',
                }}>
                    {label}
                </div>
            )}
        </div>
    );
};

export default DigitalClock;
