import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import { User } from '../types';
import { Key, User as UserIcon, ArrowRight, AlertCircle, CheckCircle, Gift, Crown, Mail } from 'lucide-react';
import { getTrialStatusByEmail, upgradeToPro, setCurrentEmail, isValidEmail, canUseTrialByEmail } from '../utils/trialUtils';

interface LoginProps {
  onLogin: (user: User) => void;
}

// Mã Admin bí mật để đăng nhập lần đầu
const ADMIN_SECRET_CODE = 'ADMIN-NTD-2024';

// Kiểm tra mã truy cập hợp lệ từ localStorage hoặc mã Admin
const validateAccessCode = (code: string): { valid: boolean; note?: string; isAdmin?: boolean } => {
  const inputCode = code.toUpperCase().trim();

  if (inputCode === ADMIN_SECRET_CODE) {
    return { valid: true, note: 'Quyền Admin', isAdmin: true };
  }

  const savedKeys = localStorage.getItem('ntd_admin_keys');
  if (!savedKeys) return { valid: false };

  const keys: { key: string; createdAt: string; note: string }[] = JSON.parse(savedKeys);
  const foundKey = keys.find(k => k.key.toUpperCase() === inputCode);

  if (foundKey) {
    return { valid: true, note: foundKey.note };
  }
  return { valid: false };
};

// Tạo ID duy nhất cho người dùng
const generateUserId = (): string => {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Kiểm tra xem có đang ở trong in-app browser (Zalo, Facebook, etc.) không
const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || '';
  // Kiểm tra Zalo, Facebook, Instagram, Messenger, Line, etc.
  return /FBAN|FBAV|Zalo|Instagram|Line|Messenger|MicroMessenger/i.test(ua);
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [accessCode, setAccessCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [step, setStep] = useState<'choose' | 'email' | 'code' | 'name'>('choose');
  const [validatedNote, setValidatedNote] = useState('');
  const [isProMode, setIsProMode] = useState(false);
  const [trialStatus, setTrialStatus] = useState({ usesRemaining: 3, totalUses: 0, isPro: false });
  const [showInAppWarning] = useState(isInAppBrowser());
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  // Custom Google Login Hook
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoadingGoogle(true);
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const data = await userInfo.json();

        const avatar = data.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=7c3aed&textColor=ffffff`;

        const userData: User = {
          id: data.sub,
          name: data.name,
          avatar: avatar,
          email: data.email,
        };

        onLogin(userData);
      } catch (err) {
        console.error('Failed to translate token to user info', err);
        setError('Không thể lấy thông tin người dùng từ Google.');
      } finally {
        setIsLoadingGoogle(false);
      }
    },
    onError: () => {
      setError('Đăng nhập thất bại. Vui lòng thử lại.');
      setIsLoadingGoogle(false);
    },
  });

  // Hàm mở link trong trình duyệt mặc định
  const openInBrowser = () => {
    const url = window.location.href;
    // Thử các cách khác nhau để mở trong trình duyệt
    window.open(url, '_system');
    // Fallback: copy link và hướng dẫn user
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert('Đã copy link! Hãy mở trình duyệt Chrome/Safari và dán link vào để đăng nhập.');
    }
  };

  const handleGuestLogin = () => {
    setIsProMode(false);
    setStep('email'); // Yêu cầu nhập email trước
  };

  const handleProLogin = () => {
    setIsProMode(true);
    setStep('code');
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    // Kiểm tra còn lượt trial không
    const status = getTrialStatusByEmail(email);
    setTrialStatus(status);

    if (!status.isPro && status.usesRemaining <= 0) {
      setError(`Email ${email} đã hết 3 lượt dùng thử. Vui lòng sử dụng mã Pro để tiếp tục.`);
      return;
    }

    // Lưu email hiện tại
    setCurrentEmail(email);

    // Tự động tạo tên từ email (phần trước @) và đăng nhập luôn
    const nameFromEmail = email.split('@')[0]
      .replace(/[._-]/g, ' ') // Thay dấu . _ - thành khoảng trắng
      .replace(/\b\w/g, c => c.toUpperCase()); // Viết hoa chữ cái đầu

    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameFromEmail)}&backgroundColor=7c3aed&textColor=ffffff`;

    const userData: User = {
      id: generateUserId(),
      name: nameFromEmail,
      avatar: avatar,
      email: email,
    };

    onLogin(userData);
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsValidating(true);

    setTimeout(() => {
      const result = validateAccessCode(accessCode);
      if (result.valid) {
        setValidatedNote(result.note || '');
        upgradeToPro();
        setStep('name');
      } else {
        setError('Mã truy cập không hợp lệ. Vui lòng liên hệ Admin để được cấp mã.');
      }
      setIsValidating(false);
    }, 500);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError('Vui lòng nhập tên hiển thị');
      return;
    }

    // Tạo avatar từ tên
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName.trim())}&backgroundColor=7c3aed&textColor=ffffff`;

    const userData: User = {
      id: generateUserId(),
      name: displayName.trim(),
      avatar: avatar,
      email: email,
    };

    onLogin(userData);
  };

  const formatCode = (value: string): string => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return cleaned;
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative z-10 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[40px] p-8 sm:p-10 text-center"
      >
        {/* Avatar */}
        <div className="mb-6 inline-block">
          <img
            src="/avatar.jpg"
            alt="Avatar Giáo viên"
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-lg border-4 border-white/80"
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-purple-900 mb-2">
          Giáo viên yêu công nghệ
        </h1>
        <h2 className="text-lg sm:text-xl font-bold text-purple-700 mb-4">NTD</h2>

        <p className="text-purple-800/80 mb-6 text-base sm:text-lg font-medium">
          Video, trò chơi dạy học và hơn thế nữa
        </p>

        {/* Login Form */}
        <AnimatePresence mode="wait">
          {step === 'choose' && (
            <motion.div
              key="choose-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Google Login Button */}
              <div className="flex justify-center w-full px-4 sm:px-0">
                <motion.button
                  onClick={() => {
                    if (showInAppWarning) {
                      // Nếu đang ở Zalo/Facebook, mở link trong trình duyệt ngoài
                      const url = window.location.href;
                      // Copy link vào clipboard để tiện cho user
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(url).catch(() => { });
                      }

                      // Hiển thị hướng dẫn
                      const confirmed = window.confirm(
                        'Zalo/Facebook không hỗ trợ đăng nhập Google.\n\nBấm OK để mở bằng trình duyệt Chrome/Safari.\n(Link đã được copy, bạn có thể dán thủ công nếu cần)'
                      );

                      if (confirmed) {
                        window.open(url, '_system');
                        // Fallback cho một số thiết bị
                        window.location.href = url;
                      }
                    } else {
                      // Nếu không phải in-app browser, đăng nhập bình thường
                      login();
                    }
                  }}
                  disabled={isLoadingGoogle}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto min-w-[280px] py-4 px-6 rounded-full font-bold text-gray-700 bg-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 border border-gray-200"
                >
                  {isLoadingGoogle ? (
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                      <span className="text-lg">
                        {showInAppWarning ? 'Mở bằng trình duyệt để đăng nhập' : 'Đăng nhập với Google'}
                      </span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100/80 border border-red-300 rounded-xl p-3 flex items-start gap-2 text-left"
                >
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Email Step - cho Trial */}
          {step === 'email' && (
            <motion.form
              key="email-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailSubmit}
              className="space-y-4"
            >
              {/* Header */}
              <div className="bg-blue-100/60 rounded-xl p-3 flex items-center gap-2">
                <Gift className="text-blue-600" size={20} />
                <p className="font-bold text-blue-800 text-sm">Nhập email để dùng thử (3 lượt/email)</p>
              </div>

              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="text-purple-500" size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.toLowerCase().trim());
                    setError('');
                  }}
                  placeholder="email@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-white/70 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none text-center text-lg"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100/80 border border-red-300 rounded-xl p-3 flex items-start gap-2 text-left"
                >
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-purple-700 bg-white/60 border-2 border-purple-200 hover:bg-white/80 transition-all"
                >
                  ← Quay lại
                </button>
                <motion.button
                  type="submit"
                  disabled={!email.trim()}
                  whileHover={{ scale: email.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: email.trim() ? 0.98 : 1 }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${email.trim()
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg'
                    : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                  Tiếp tục
                  <ArrowRight size={18} />
                </motion.button>
              </div>
            </motion.form>
          )}

          {step === 'code' && (
            <motion.form
              key="code-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleCodeSubmit}
              className="space-y-4"
            >
              {/* Header */}
              <div className="bg-purple-100/60 rounded-xl p-3 flex items-center gap-2">
                <Crown className="text-purple-600" size={20} />
                <p className="font-bold text-purple-800 text-sm">Nhập mã Pro để xem không giới hạn</p>
              </div>

              {/* Access Code Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key className="text-purple-500" size={20} />
                </div>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(formatCode(e.target.value));
                    setError('');
                  }}
                  placeholder="Nhập mã (VD: PRO-XXXX-XXXX)"
                  className="w-full pl-12 pr-4 py-4 bg-white/70 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none font-mono text-center text-lg tracking-wider placeholder:text-sm placeholder:tracking-normal placeholder:font-sans"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100/80 border border-red-300 rounded-xl p-3 flex items-start gap-2 text-left"
                >
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-purple-700 bg-white/60 border-2 border-purple-200 hover:bg-white/80 transition-all"
                >
                  ← Quay lại
                </button>
                <motion.button
                  type="submit"
                  disabled={!accessCode.trim() || isValidating}
                  whileHover={{ scale: accessCode.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: accessCode.trim() ? 0.98 : 1 }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${accessCode.trim() && !isValidating
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg'
                    : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                  {isValidating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    </>
                  ) : (
                    <>
                      Tiếp tục
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.form>
          )}

          {step === 'name' && (
            <motion.form
              key="name-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleNameSubmit}
              className="space-y-4"
            >
              {/* Status Badge */}
              {isProMode ? (
                <div className="bg-green-100/80 border border-green-300 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={20} />
                  <div className="text-left">
                    <p className="font-bold text-green-800 text-sm">🎉 Mã Pro hợp lệ!</p>
                    {validatedNote && <p className="text-xs text-green-700">{validatedNote}</p>}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-100/80 border border-blue-300 rounded-xl p-3 flex items-center gap-2">
                  <Gift className="text-blue-600" size={20} />
                  <div className="text-left">
                    <p className="font-bold text-blue-800 text-sm">Chế độ dùng thử</p>
                    <p className="text-xs text-blue-700">
                      {trialStatus.isPro ? '✓ Đã nâng cấp Pro' : `Bạn có ${trialStatus.usesRemaining} lượt tạo video miễn phí`}
                    </p>
                  </div>
                </div>
              )}

              {/* Display Name Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="text-purple-500" size={20} />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setError('');
                  }}
                  placeholder="Nhập tên của bạn"
                  className="w-full pl-12 pr-4 py-4 bg-white/70 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none text-center text-lg"
                  autoFocus
                />
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100/80 border border-red-300 rounded-xl p-3 flex items-start gap-2 text-left"
                >
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(isProMode ? 'code' : 'email')}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-purple-700 bg-white/60 border-2 border-purple-200 hover:bg-white/80 transition-all"
                >
                  ← Quay lại
                </button>
                <motion.button
                  type="submit"
                  disabled={!displayName.trim()}
                  whileHover={{ scale: displayName.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: displayName.trim() ? 0.98 : 1 }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${displayName.trim()
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg'
                    : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                  Vào ngay! 🎉
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Contact Info */}
        <div className="mt-8 pt-6 border-t border-purple-200/50">
          <p className="text-sm text-purple-700/70 font-medium">
            Phát triển bởi <span className="font-bold text-purple-800">Đức Nguyễn</span>
          </p>
          <p className="text-xs text-purple-600/60 mt-1">
            Zalo: <a href="https://zalo.me/0975509490" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-purple-800 transition-colors">0975509490</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;