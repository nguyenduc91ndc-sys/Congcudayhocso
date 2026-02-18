import React from 'react';
import AnalogClock from './AnalogClock';
import DigitalClock from './DigitalClock';

interface ClockDisplayProps {
    hour: number;
    minute: number;
    interactive?: boolean;
    onTimeChange?: (hour: number, minute: number) => void;
    highlightHour?: boolean;
    highlightMinute?: boolean;
    showDigital?: boolean;
    clockSize?: number;
}

const ClockDisplay: React.FC<ClockDisplayProps> = ({
    hour,
    minute,
    interactive = false,
    onTimeChange,
    highlightHour = false,
    highlightMinute = false,
    showDigital = true,
    clockSize = 380,
}) => {
    return (
        <div className="clock-layout">
            <div style={{ flexShrink: 0 }}>
                <AnalogClock
                    hour={hour}
                    minute={minute}
                    interactive={interactive}
                    onTimeChange={onTimeChange}
                    highlightHour={highlightHour}
                    highlightMinute={highlightMinute}
                    size={clockSize}
                />
            </div>
            {showDigital && (
                <div style={{ flexShrink: 0 }}>
                    <DigitalClock
                        hour={hour}
                        minute={minute}
                        showLabel={true}
                    />
                </div>
            )}
        </div>
    );
};

export default ClockDisplay;
