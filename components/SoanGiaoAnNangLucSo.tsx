import React, { useEffect } from 'react';

interface SoanGiaoAnNangLucSoProps {
    onBack: () => void;
}

const APP_URL = '/xdkhbdcv3439/xdkhbdcv3439/public/index.html';

const SoanGiaoAnNangLucSo: React.FC<SoanGiaoAnNangLucSoProps> = ({ onBack }) => {
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'GIAOVIENCN_BACK') {
                onBack();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onBack]);

    return (
        <div className="relative w-full h-screen bg-slate-950 flex flex-col">
            <iframe
                src={APP_URL}
                title="Soạn giáo án tích hợp Năng lực số - AI vào kế hoạch bài dạy"
                className="flex-1 w-full border-0 bg-white"
                allow="clipboard-read; clipboard-write; fullscreen"
            />
        </div>
    );
};

export default SoanGiaoAnNangLucSo;
