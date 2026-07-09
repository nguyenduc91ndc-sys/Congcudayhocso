import React, { useEffect } from 'react';

interface VietnamMapProps {
    onBack: () => void;
}

const VietnamMap: React.FC<VietnamMapProps> = ({ onBack }) => {
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'BACK_TO_DASHBOARD') {
                onBack();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onBack]);

    return (
        <div className="relative h-screen w-screen bg-slate-900">
            <iframe
                src="/bandoso/vietnam-map-new.html"
                className="h-full w-full border-0"
                title="Bản đồ Việt Nam"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
            />
        </div>
    );
};

export default VietnamMap;
