import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';

interface ClockExperimentProps {
    onBack: () => void;
}

const ClockExperiment: React.FC<ClockExperimentProps> = ({ onBack }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'BACK_TO_DASHBOARD') {
                onBack();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onBack]);

    // Listen for fullscreen changes
    useEffect(() => {
        const handler = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
            }
        };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    return (
        <div ref={containerRef} className="h-screen w-screen flex flex-col" style={{ background: '#0F172A' }}>
            {/* Iframe — the dong-ho sub-app has its own toolbar with back & fullscreen */}
            <iframe
                src="/dong-ho/"
                className="flex-1 w-full border-none"
                style={{ height: '100vh' }}
                allow="fullscreen"
            />
        </div>
    );
};

export default ClockExperiment;
