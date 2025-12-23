import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';
import { Key, User as UserIcon, ArrowRight, AlertCircle, CheckCircle, Gift, Crown, Mail, Code2, MessageCircle, Sparkles, Play } from 'lucide-react';
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

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [accessCode, setAccessCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [validatedNote, setValidatedNote] = useState('');
  const [isProMode, setIsProMode] = useState(false);
  const [trialStatus, setTrialStatus] = useState({ usesRemaining: 3, totalUses: 0, isPro: false });

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

    if (canUseTrialByEmail(email)) {
      // Lưu email hiện tại
      setCurrentEmail(email);

      // Tự động tạo tên từ email và đăng nhập luôn
      // Lấy phần trước @ và viết hoa chữ cái đầu
      const autoName = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);

      // Tạo avatar
      const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(autoName)}&backgroundColor=7c3aed&textColor=ffffff`;

      const userData: User = {
        id: generateUserId(),
        name: autoName, // Sử dụng tên tự tạo
        avatar: avatar,
        email: email,
      };

      onLogin(userData);

    } else {
      setError('Email này đã hết lượt dùng thử miễn phí. Vui lòng nâng cấp Pro!');
    }
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

        // Tự động đăng nhập luôn với tên mặc định "Pro User" hoặc gì đó nếu chưa có tên
        const autoName = "Thành viên Pro";
        const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(autoName)}&backgroundColor=10b981&textColor=ffffff`;

        const userData: User = {
          id: generateUserId(),
          name: autoName,
          avatar: avatar,
          // Không set email nếu là code pro ẩn danh, hoặc set email dummy nếu cần
        };

        onLogin(userData);
      } else {
        setError('Mã truy cập không hợp lệ. Vui lòng liên hệ Admin để được cấp mã.');
      }
      setIsValidating(false);
    }, 500);
  };

  const formatCode = (value: string): string => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return cleaned;
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative z-10 p-4">
      {/* Animated Gradient Border Wrapper */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md animated-border-wrapper"
      >
        <div className="animated-border-inner p-6 sm:p-8 text-center">
          {/* Avatar */}
          <div className="mb-4 inline-block">
            <img
              src="/avatar.jpg"
              alt="Avatar Giáo viên"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg border-4 border-white/80"
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-purple-900 mb-1">
            Giáo viên yêu công nghệ
          </h1>
          <h2 className="text-base sm:text-lg font-bold text-purple-700 mb-3">NTD</h2>

          <p className="text-purple-800/80 mb-5 text-sm sm:text-base font-medium">
            Video, trò chơi dạy học và hơn thế nữa
          </p>

          {/* Login Form */}
          <AnimatePresence mode="wait">
            {/* Email Step - Default */}
            {step === 'email' && (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleEmailSubmit}
                className="space-y-4"
              >
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
                    className="w-full pl-10 pr-4 py-3 bg-white/70 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none text-center text-base"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-100/80 border border-red-300 rounded-lg p-2 flex items-start gap-2 text-left"
                  >
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-red-700">{error}</p>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={!email.trim()}
                  whileHover={{ scale: email.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: email.trim() ? 0.98 : 1 }}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${email.trim()
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-md'
                    : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                  Tiếp tục
                  <ArrowRight size={18} />
                </motion.button>

                {/* Switch to Pro Code */}
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProMode(true);
                      setStep('code');
                    }}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 transition-all shadow-sm hover:shadow"
                  >
                    <Crown size={14} className="text-purple-600 group-hover:scale-110 transition-transform" />
                    <span>Tôi đã có mã kích hoạt Pro</span>
                  </button>
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
                {/* Header with Back Button */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProMode(false);
                      setStep('email');
                    }}
                    className="text-xs text-purple-600 font-medium flex items-center gap-1"
                  >
                    ← Quay lại
                  </button>
                  <span className="text-purple-800 font-bold flex items-center gap-1 text-sm">
                    <Crown size={14} /> Nhập mã Pro
                  </span>
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
                    placeholder="PRO-XXXX-XXXX"
                    className="w-full pl-10 pr-4 py-3 bg-white/70 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none font-mono text-center text-base tracking-wider placeholder:tracking-normal placeholder:font-sans"
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-100/80 border border-red-300 rounded-lg p-2 flex items-start gap-2 text-left"
                  >
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-red-700">{error}</p>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={!accessCode.trim() || isValidating}
                  whileHover={{ scale: accessCode.trim() ? 1.02 : 1 }}
                  whileTap={{ scale: accessCode.trim() ? 0.98 : 1 }}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${accessCode.trim() && !isValidating
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-md'
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
                      Kích hoạt ngay
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}


          </AnimatePresence>

          {/* Video Intro Button */}
          <div className="mt-5">
            <a
              href="https://youtu.be/gfMUjPfxX0U"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play size={14} className="text-white ml-0.5" fill="currentColor" />
              </div>
              <span className="text-sm">Xem video giới thiệu</span>
            </a>
          </div>

          {/* Premium Footer Signature */}
          <div className="mt-6 pt-4 border-t border-purple-200/30">
            <a
              href="https://zalo.me/0975509490"
              target="_blank"
              rel="noopener noreferrer"
              className="premium-footer flex items-center justify-center gap-2 text-xs font-medium text-purple-700/80 hover:text-purple-900 cursor-pointer"
            >
              <Sparkles size={12} className="text-amber-500" />
              <span className="text-shimmer font-bold">Đức Nguyễn</span>
              <span className="text-purple-400">·</span>
              <span className="text-purple-600/70">Zalo 0975509490</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;