import React, { useState, useEffect } from 'react';
import { ArrowLeft, Maximize2, Minimize2, Lock, Phone, Crown, CheckCircle, Loader2 } from 'lucide-react';
import { upgradeBeeGameToPro } from '../utils/trialUtils';
import { canUseBeeGameTrialByDevice, useBeeGameTrialByDevice, getDeviceTrialStatus, upgradeDeviceToPro } from '../utils/firebaseDeviceTrial';
import { validateBeeProKey, activateBeeProForEmail, isEmailBeePro } from '../utils/firebaseBeeProKeys';

interface BacteriaGameEditableProps {
    onBack: () => void;
    userEmail?: string;
}

const BacteriaGameEditable: React.FC<BacteriaGameEditableProps> = ({ onBack, userEmail }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [trialStatus, setTrialStatus] = useState<{ playsRemaining: number; totalPlays: number; isPro: boolean } | null>(null);
    const [showProModal, setShowProModal] = useState(false);

    // State cho nhập mã
    const [licenseCode, setLicenseCode] = useState('');
    const [licenseError, setLicenseError] = useState('');
    const [licenseSuccess, setLicenseSuccess] = useState(false);
    const [isCheckingCode, setIsCheckingCode] = useState(false);

    useEffect(() => {
        const checkTrial = async () => {
            if (userEmail) {
                // Kiểm tra email có phải PRO không
                const emailIsPro = await isEmailBeePro(userEmail);
                if (emailIsPro) {
                    setTrialStatus({ playsRemaining: 999, totalPlays: 0, isPro: true });
                    return;
                }

                // Nếu không, kiểm tra device trial
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
            if (event.data?.type === 'BACTERIA_GAME_SAVE' && userEmail) {
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

    // Xử lý nhập mã nâng cấp - Kiểm tra từ Firebase
    const handleActivateCode = async () => {
        if (!licenseCode.trim()) {
            setLicenseError('Vui lòng nhập mã nâng cấp!');
            return;
        }

        setIsCheckingCode(true);
        setLicenseError('');

        try {
            // Kiểm tra mã từ Firebase
            const result = await validateBeeProKey(licenseCode.trim());

            if (result.valid) {
                // Mã hợp lệ - Kích hoạt PRO cho Gmail của user
                if (userEmail) {
                    await activateBeeProForEmail(userEmail, licenseCode.trim());
                    upgradeBeeGameToPro(userEmail);
                    await upgradeDeviceToPro(userEmail);
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
        } catch (error) {
            setLicenseError('Lỗi kiểm tra mã! Vui lòng thử lại.');
            setLicenseSuccess(false);
        } finally {
            setIsCheckingCode(false);
        }
    };

    // Tạo URL với user parameter để phân biệt câu hỏi theo user
    const gameUrl = userEmail
        ? `/bacteria-game-editable.html?user=${encodeURIComponent(userEmail)}`
        : '/bacteria-game-editable.html';

    // Modal yêu cầu nâng Pro
    const ProModal = () => (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-4 border-green-400 relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-teal-500 to-cyan-500"></div>

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
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-100 to-teal-100 rounded-full flex items-center justify-center border-4 border-green-400">
                            <Lock size={40} className="text-green-500" />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Hết lượt dùng thử! 😢
                        </h2>

                        <p className="text-gray-600 mb-6">
                            Bạn đã sử dụng hết <span className="font-bold text-green-500">5 lượt</span> dùng thử miễn phí.
                            <br />Nâng cấp <span className="font-bold text-teal-600">PRO</span> để sử dụng không giới hạn!
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
                                    className="flex-1 px-4 py-3 border-2 border-green-300 rounded-xl focus:border-teal-400 focus:outline-none text-center font-mono text-lg uppercase"
                                />
                                <button
                                    onClick={handleActivateCode}
                                    disabled={isCheckingCode || !licenseCode.trim()}
                                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isCheckingCode ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Đang kiểm tra...
                                        </>
                                    ) : (
                                        'Kích hoạt'
                                    )}
                                </button>
                            </div>
                            {licenseError && (
                                <p className="text-red-500 text-sm mt-2">{licenseError}</p>
                            )}
                        </div>

                        {/* Contact info */}
                        <div className="bg-green-50 rounded-xl p-4 border-2 border-dashed border-green-300">
                            <p className="text-sm text-gray-600 mb-2">Chưa có mã? Liên hệ để nhận mã nâng cấp:</p>
                            <div className="flex items-center justify-center gap-2 text-green-700 font-medium">
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
        <div className="fixed inset-0 w-full h-full bg-green-50 flex flex-col z-50">
            {/* Pro Modal */}
            {showProModal && <ProModal />}

            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-green-400 to-teal-400 border-b border-green-500">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-2xl">🦠</span>
                        <div>
                            <h1 className="text-lg font-bold text-white">Vi Khuẩn Phiêu Lưu - Tự Soạn</h1>
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
                        <div className="flex items-center gap-1 bg-gradient-to-r from-green-300 to-teal-400 px-3 py-1.5 rounded-full">
                            <Crown size={16} className="text-green-800" />
                            <span className="text-green-800 font-bold text-sm">PRO</span>
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
                <div className="flex-1 w-full bg-green-100">
                    <iframe
                        src={gameUrl}
                        className="w-full h-full border-0"
                        title="Vi Khuẩn Phiêu Lưu - Tự Soạn"
                        allow="autoplay; fullscreen"
                    />
                </div>
            )}
        </div>
    );
};

export default BacteriaGameEditable;
