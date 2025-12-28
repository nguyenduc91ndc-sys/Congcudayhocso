import React, { useState, useEffect } from 'react';
import { ArrowLeft, Maximize2, Minimize2, Lock, Phone, Crown, CheckCircle } from 'lucide-react';
import { upgradeBeeGameToPro } from '../utils/trialUtils';
import { canUseBeeGameTrialByDevice, useBeeGameTrialByDevice, getDeviceTrialStatus, upgradeDeviceToPro } from '../utils/firebaseDeviceTrial';

interface BeeGameEditableProps {
    onBack: () => void;
    userEmail?: string;
}

const BeeGameEditable: React.FC<BeeGameEditableProps> = ({ onBack, userEmail }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [trialStatus, setTrialStatus] = useState<{ playsRemaining: number; totalPlays: number; isPro: boolean } | null>(null);
    const [showProModal, setShowProModal] = useState(false);

    // State cho nhập mã
    const [licenseCode, setLicenseCode] = useState('');
    const [licenseError, setLicenseError] = useState('');
    const [licenseSuccess, setLicenseSuccess] = useState(false);

    useEffect(() => {
        const checkTrial = async () => {
            if (userEmail) {
                const status = await getDeviceTrialStatus(userEmail);
                setTrialStatus({ playsRemaining: status.beeGameRemaining, totalPlays: 5 - status.beeGameRemaining, isPro: status.isPro });

                // Nếu hết lượt dùng thử và không phải Pro, hiển thị modal
                if (!status.isPro && status.beeGameRemaining <= 0) {
                    setShowProModal(true);
                }
            }
        };
        checkTrial();
    }, [userEmail]);

    // Lắng nghe message từ iframe khi save câu hỏi
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'BEE_GAME_SAVE' && userEmail) {
                // Chỉ trừ lượt nếu chưa là Pro
                if (trialStatus && !trialStatus.isPro && trialStatus.playsRemaining > 0) {
                    const result = await useBeeGameTrialByDevice(userEmail);
                    setTrialStatus({ playsRemaining: result.remaining, totalPlays: 5 - result.remaining, isPro: false });

                    // Nếu hết lượt sau khi save, hiển thị modal
                    if (result.remaining <= 0) {
                        setShowProModal(true);
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [userEmail, trialStatus]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Kiểm tra mã có hợp lệ không (không gọi activateWithCode để tránh nâng Pro cho Video)
    const isValidBeeGameCode = (code: string): boolean => {
        const ADMIN_SECRET_CODE = 'ADMIN-NTD-2024';
        const FIXED_KEYS = ['PRO-DEMO-2024', 'BEE-PRO-2024'];
        const inputCode = code.toUpperCase().trim();

        if (inputCode === ADMIN_SECRET_CODE) return true;
        if (FIXED_KEYS.includes(inputCode)) return true;

        const savedKeys = localStorage.getItem('ntd_admin_keys');
        if (!savedKeys) return false;

        const keys: { key: string }[] = JSON.parse(savedKeys);
        return keys.some(k => k.key.toUpperCase() === inputCode);
    };

    // Xử lý nhập mã nâng cấp
    const handleActivateCode = async () => {
        if (!licenseCode.trim()) {
            setLicenseError('Vui lòng nhập mã nâng cấp!');
            return;
        }

        // Kiểm tra mã - KHÔNG gọi activateWithCode để tránh nâng Pro cho Video
        if (isValidBeeGameCode(licenseCode.trim())) {
            // Mã hợp lệ - CHỈ nâng cấp Bee Game Pro cho user này
            if (userEmail) {
                upgradeBeeGameToPro(userEmail);
                await upgradeDeviceToPro(userEmail); // Upgrade Firebase device
                setTrialStatus({ playsRemaining: 999, totalPlays: 0, isPro: true });
            }
            setLicenseSuccess(true);
            setLicenseError('');
            setTimeout(() => {
                setShowProModal(false);
            }, 1500);
        } else {
            setLicenseError('Mã không hợp lệ! Liên hệ AD: 0975509490');
            setLicenseSuccess(false);
        }
    };

    // Tạo URL với user parameter để phân biệt câu hỏi theo user
    const gameUrl = userEmail
        ? `/bee-game-editable.html?user=${encodeURIComponent(userEmail)}`
        : '/bee-game-editable.html';

    // Modal yêu cầu nâng Pro
    const ProModal = () => (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-4 border-yellow-400 relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>

                {licenseSuccess ? (
                    // Thông báo thành công
                    <div className="py-8">
                        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle size={50} className="text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-600 mb-2">
                            Nâng cấp thành công! 🎉
                        </h2>
                        <p className="text-gray-600">Bạn đã là thành viên PRO!</p>
                    </div>
                ) : (
                    <>
                        {/* Lock icon */}
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center border-4 border-yellow-400">
                            <Lock size={40} className="text-orange-500" />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Hết lượt dùng thử! 😢
                        </h2>

                        <p className="text-gray-600 mb-6">
                            Bạn đã sử dụng hết <span className="font-bold text-orange-500">5 lượt</span> dùng thử miễn phí.
                            <br />Nâng cấp <span className="font-bold text-yellow-600">PRO</span> để sử dụng không giới hạn!
                        </p>

                        {/* Input nhập mã */}
                        <div className="mb-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={licenseCode}
                                    onChange={(e) => {
                                        setLicenseCode(e.target.value.toUpperCase());
                                        setLicenseError('');
                                    }}
                                    placeholder="Nhập mã nâng cấp..."
                                    className="flex-1 px-4 py-3 border-2 border-yellow-300 rounded-xl focus:border-orange-400 focus:outline-none text-center font-mono text-lg uppercase"
                                />
                                <button
                                    onClick={handleActivateCode}
                                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                                >
                                    Kích hoạt
                                </button>
                            </div>
                            {licenseError && (
                                <p className="text-red-500 text-sm mt-2">{licenseError}</p>
                            )}
                        </div>

                        {/* Contact info */}
                        <div className="bg-yellow-50 rounded-xl p-4 border-2 border-dashed border-yellow-300">
                            <p className="text-sm text-gray-600 mb-2">Chưa có mã? Liên hệ để nhận mã nâng cấp:</p>
                            <div className="flex items-center justify-center gap-2 text-orange-700 font-medium">
                                <Phone size={18} />
                                <span>AD: <span className="font-bold text-lg">0975509490</span></span>
                            </div>
                        </div>

                        {/* Back button */}
                        <button
                            onClick={onBack}
                            className="mt-6 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                        >
                            ← Quay lại Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 w-full h-full bg-yellow-50 flex flex-col z-50">
            {/* Pro Modal */}
            {showProModal && <ProModal />}

            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-400 border-b border-amber-500">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-2xl">🐝</span>
                        <div>
                            <h1 className="text-lg font-bold text-white">Ong về Tổ - Tự Soạn</h1>
                            <p className="text-xs text-white/80">Tự tạo câu hỏi và chia sẻ</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Trial status badge */}
                    {trialStatus && !trialStatus.isPro && (
                        <div className="hidden sm:flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
                            <span className="text-white/80 text-sm">Còn lại:</span>
                            <span className="text-white font-bold">{trialStatus.playsRemaining}/5</span>
                        </div>
                    )}
                    {trialStatus?.isPro && (
                        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-300 to-yellow-500 px-3 py-1.5 rounded-full">
                            <Crown size={16} className="text-yellow-800" />
                            <span className="text-yellow-800 font-bold text-sm">PRO</span>
                        </div>
                    )}

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                    >
                        {isFullscreen ? (
                            <Minimize2 size={20} className="text-white" />
                        ) : (
                            <Maximize2 size={20} className="text-white" />
                        )}
                    </button>
                </div>
            </div>

            {/* Game iframe - chỉ hiển thị nếu còn lượt hoặc là Pro */}
            {(!showProModal) && (
                <div className="flex-1 w-full bg-yellow-100">
                    <iframe
                        src={gameUrl}
                        className="w-full h-full border-0"
                        title="Ong về Tổ - Tự Soạn"
                        allow="autoplay; fullscreen"
                    />
                </div>
            )}
        </div>
    );
};

export default BeeGameEditable;
