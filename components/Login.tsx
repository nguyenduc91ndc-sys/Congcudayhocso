import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
          {/* Email Step - Default */}
          {step === 'email' && (
            <motion.form
              key="email-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailSubmit}
              className="space-y-6"
            >
              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="text-purple-500" size={24} />
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

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={!email.trim()}
                whileHover={{ scale: email.trim() ? 1.02 : 1 }}
                whileTap={{ scale: email.trim() ? 0.98 : 1 }}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all ${email.trim()
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg'
                  : 'bg-gray-300 cursor-not-allowed'
                  }`}
              >
                Tiếp tục
                <ArrowRight size={20} />
              </motion.button>

              {/* Switch to Pro Code */}
              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsProMode(true);
                    setStep('code');
                  }}
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 transition-all shadow-sm hover:shadow"
                >
                  <Crown size={16} className="text-purple-600 group-hover:scale-110 transition-transform" />
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
              className="space-y-6"
            >
              {/* Header with Back Button */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProMode(false);
                    setStep('email');
                  }}
                  className="text-sm text-purple-600 font-medium flex items-center gap-1"
                >
                  ← Quay lại nhập Email
                </button>
                <span className="text-purple-800 font-bold flex items-center gap-1">
                  <Crown size={16} /> Nhập mã Pro
                </span>
              </div>

              {/* Access Code Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key className="text-purple-500" size={24} />
                </div>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(formatCode(e.target.value));
                    setError('');
                  }}
                  placeholder="PRO-XXXX-XXXX"
                  className="w-full pl-12 pr-4 py-4 bg-white/70 border-2 border-purple-200 rounded-2xl focus:border-purple-500 focus:outline-none font-mono text-center text-lg tracking-wider placeholder:tracking-normal placeholder:font-sans"
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

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={!accessCode.trim() || isValidating}
                whileHover={{ scale: accessCode.trim() ? 1.02 : 1 }}
                whileTap={{ scale: accessCode.trim() ? 0.98 : 1 }}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all ${accessCode.trim() && !isValidating
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
                    Kích hoạt ngay
                    <ArrowRight size={20} />
                  </>
                )}
              </motion.button>
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