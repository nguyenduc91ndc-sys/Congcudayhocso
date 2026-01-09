
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
    signInWithGoogle,
    signOutUser,
    onAuthChange,
    checkProStatus,
    activateProCode,
    isAdmin,
    generateProCode,
    getAllProCodes
} from '../utils/authUtils';
import { BeeSVG } from './GameAssets';

interface LoginProps {
    onLogin: (name?: string, user?: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [user, setUser] = useState<User | null>(null);
    const [isPro, setIsPro] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Pro code activation
    const [showProInput, setShowProInput] = useState(false);
    const [proCodeInput, setProCodeInput] = useState('');
    const [proError, setProError] = useState('');
    const [proSuccess, setProSuccess] = useState(false);

    // Admin panel
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [proCodes, setProCodes] = useState<any[]>([]);
    const [newCode, setNewCode] = useState('');

    // Intro animation
    useEffect(() => {
        if (view === 'intro') {
            const timer = setTimeout(() => setView('main'), 2500);
            return () => clearTimeout(timer);
        }
    }, [view]);

    // Listen to auth state - AUTO LOGIN if already authenticated
    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = onAuthChange(async (authUser) => {
            setUser(authUser);
            if (authUser) {
                const proStatus = await checkProStatus(authUser.uid);
                const hasAccess = proStatus || isAdmin(authUser.email);
                setIsPro(hasAccess);

                // AUTO LOGIN: Nếu user đã đăng nhập và có quyền Pro -> vào thẳng
                if (hasAccess) {
                    onLogin(authUser.displayName || 'Giáo viên', authUser);
                }
            } else {
                setIsPro(false);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [onLogin]);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError('');
        try {
            const authUser = await signInWithGoogle();
            if (authUser) {
                const proStatus = await checkProStatus(authUser.uid);
                setIsPro(proStatus || isAdmin(authUser.email));
            }
        } catch (err: any) {
            setError('Đăng nhập thất bại. Vui lòng thử lại.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOutUser();
        setUser(null);
        setIsPro(false);
        setShowAdminPanel(false);
    };

    const handleStart = () => {
        if (user) {
            onLogin(user.displayName || 'Giáo viên', user);
        }
    };

    const handleActivateProCode = async () => {
        if (!user || !proCodeInput.trim()) return;
        setProError('');
        setProSuccess(false);

        try {
            await activateProCode(proCodeInput.trim(), user.uid, user.email || '');
            setIsPro(true);
            setProSuccess(true);
            setProCodeInput('');
            setTimeout(() => {
                setShowProInput(false);
                setProSuccess(false);
            }, 2000);
        } catch (err: any) {
            setProError(err.message || 'Mã không hợp lệ');
        }
    };

    const handleGenerateCode = async () => {
        if (!user) return;
        try {
            const code = await generateProCode(user.uid);
            setNewCode(code);
            // Refresh list
            const codes = await getAllProCodes();
            setProCodes(codes);
        } catch (err) {
            console.error(err);
        }
    };

    const loadAdminPanel = async () => {
        const codes = await getAllProCodes();
        setProCodes(codes);
        setShowAdminPanel(true);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full overflow-hidden p-6 bg-yellow-50">
            {/* Yellow Nature Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-50 via-yellow-100 to-orange-50"></div>
                <div className="absolute top-10 right-20 w-32 h-32 bg-yellow-300 rounded-full blur-xl opacity-60 animate-pulse"></div>
                <div className="absolute bottom-[5%] left-[5%] text-orange-300 text-6xl opacity-60 animate-bounce">✿</div>
                <div className="absolute bottom-[10%] right-[10%] text-yellow-500 text-5xl opacity-60 animate-bounce" style={{ animationDelay: '1s' }}>✿</div>
            </div>

            {view === 'intro' ? (
                <div className="text-center animate-fade-in space-y-8 px-4 relative z-10">
                    <div className="w-32 h-32 mx-auto">
                        <BeeSVG className="w-full h-full animate-bounce" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-orange-600 tracking-tight">
                        Chào mừng đến với
                    </h1>
                    <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-400">
                        "Ong Về Tổ"
                    </h2>
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            ) : (
                <div className="relative z-10 bg-white/95 shadow-2xl rounded-[2.5rem] p-8 w-full max-w-md text-center border-8 border-yellow-400">
                    <div className="w-20 h-20 mx-auto mb-4">
                        <BeeSVG className="w-full h-full" />
                    </div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500 mb-2">
                        ONG VỀ TỔ
                    </h2>
                    <p className="text-gray-500 mb-6 font-semibold">
                        Tạo quiz và chia sẻ link cho học sinh
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-xl text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {!user ? (
                        // Not logged in
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="font-bold text-gray-700 text-lg">
                                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập bằng Google'}
                            </span>
                        </button>
                    ) : (
                        // Logged in
                        <div className="space-y-4">
                            {/* User info */}
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                                <img
                                    src={user.photoURL || ''}
                                    alt={user.displayName || ''}
                                    className="w-12 h-12 rounded-full border-2 border-yellow-300"
                                />
                                <div className="text-left flex-1">
                                    <p className="font-bold text-orange-700">{user.displayName}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                                {isPro && (
                                    <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
                                        🐝 PRO
                                    </span>
                                )}
                            </div>

                            {/* Start button */}
                            {isPro ? (
                                <button
                                    onClick={handleStart}
                                    className="group relative w-full inline-flex items-center justify-center px-10 py-4 text-xl font-bold text-white transition-all duration-200 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full shadow-[0_8px_0_rgb(194,65,12)] hover:shadow-[0_4px_0_rgb(194,65,12)] hover:translate-y-1"
                                >
                                    🚀 Bắt đầu tạo Quiz
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-amber-600 font-semibold text-sm">
                                        ⚠️ Bạn chưa có quyền Pro. Nhập mã Pro để sử dụng.
                                    </p>

                                    {!showProInput ? (
                                        <button
                                            onClick={() => setShowProInput(true)}
                                            className="w-full py-3 px-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                                        >
                                            🔑 Nhập mã Pro
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={proCodeInput}
                                                onChange={(e) => setProCodeInput(e.target.value.toUpperCase())}
                                                placeholder="Nhập mã Pro (VD: BEE-XXXXXXXX)"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-mono text-center uppercase focus:border-orange-400 focus:outline-none"
                                            />
                                            {proError && <p className="text-red-500 text-sm">{proError}</p>}
                                            {proSuccess && <p className="text-green-500 text-sm">✅ Kích hoạt thành công!</p>}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowProInput(false)}
                                                    className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 font-bold rounded-xl"
                                                >
                                                    Hủy
                                                </button>
                                                <button
                                                    onClick={handleActivateProCode}
                                                    className="flex-1 py-2 px-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold rounded-xl"
                                                >
                                                    Kích hoạt
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Admin panel button */}
                            {isAdmin(user.email) && (
                                <button
                                    onClick={loadAdminPanel}
                                    className="w-full py-2 px-4 bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-bold rounded-xl text-sm"
                                >
                                    🐝 Quản lý mã Pro (Admin)
                                </button>
                            )}

                            {/* Sign out */}
                            <button
                                onClick={handleSignOut}
                                className="text-gray-400 hover:text-gray-600 font-semibold text-sm underline"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-400 font-medium">
                            🐝 Tạo quiz với chủ đề Ong về tổ và chia sẻ link cho học sinh
                        </p>
                    </div>
                </div>
            )}

            {/* Admin Panel Modal */}
            {showAdminPanel && user && isAdmin(user.email) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border-4 border-yellow-400">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-orange-700">🐝 Quản lý mã Pro - Ong Về Tổ</h3>
                            <button onClick={() => setShowAdminPanel(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                        </div>

                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <p className="text-sm text-yellow-700">
                                ⚠️ Mã Pro tạo ở đây <strong>chỉ dùng cho game "Ong Về Tổ"</strong>, không dùng được cho các game khác.
                            </p>
                        </div>

                        <button
                            onClick={handleGenerateCode}
                            className="w-full py-3 px-6 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold rounded-xl mb-4"
                        >
                            ➕ Tạo mã Pro mới (BEE-XXXXXXXX)
                        </button>

                        {newCode && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                                <p className="text-sm text-green-600 mb-1">Mã mới tạo:</p>
                                <p className="text-xl font-mono font-bold text-green-700">{newCode}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <p className="font-semibold text-gray-600">Danh sách mã ({proCodes.length}):</p>
                            {proCodes.map((item) => (
                                <div key={item.code} className={`p-3 rounded-xl border ${item.usedBy ? 'bg-gray-100 border-gray-200' : 'bg-green-50 border-green-200'}`}>
                                    <p className="font-mono font-bold">{item.code}</p>
                                    <p className="text-xs text-gray-500">
                                        {item.usedBy ? `✅ Đã dùng: ${item.usedByEmail}` : '🟢 Chưa sử dụng'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
