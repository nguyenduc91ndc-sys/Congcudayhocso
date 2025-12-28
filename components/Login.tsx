import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';
import { Key, User as UserIcon, AlertCircle, CheckCircle, Gift, Crown, Code2, MessageCircle, Sparkles, Play, GraduationCap, Heart, Laptop, ArrowRight } from 'lucide-react';
import { getTrialStatusByEmail, upgradeToPro, setCurrentEmail, isValidEmail, canUseTrialByEmail } from '../utils/trialUtils';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

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

  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [validatedNote, setValidatedNote] = useState('');
  const [isProMode, setIsProMode] = useState(false);
  const [trialStatus, setTrialStatus] = useState({ usesRemaining: 3, totalUses: 0, isPro: false });

  // Decode JWT từ Google credential
  const decodeJWT = (token: string) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  };

  // Xử lý đăng nhập Google thành công
  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Không thể lấy thông tin từ Google');
      return;
    }

    try {
      const decoded = decodeJWT(credentialResponse.credential);
      const googleEmail = decoded.email;
      const googleName = decoded.name || decoded.given_name || googleEmail.split('@')[0];
      const googleAvatar = decoded.picture; // Ảnh hồ sơ Google!

      // Kiểm tra trial
      const status = getTrialStatusByEmail(googleEmail);
      if (!canUseTrialByEmail(googleEmail)) {
        setError('Email này đã hết lượt dùng thử miễn phí. Vui lòng nâng cấp Pro!');
        return;
      }

      setCurrentEmail(googleEmail);

      // Fallback nếu không có ảnh Google
      const avatar = googleAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleName)}&backgroundColor=7c3aed&textColor=ffffff`;

      const userData: User = {
        id: generateUserId(),
        name: googleName,
        avatar: avatar,
        email: googleEmail,
      };

      onLogin(userData);
    } catch (err) {
      setError('Đã xảy ra lỗi khi đăng nhập với Google');
      console.error('Google login error:', err);
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
    <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-4">
      {/* Animated Gradient Border Wrapper */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md animated-border-wrapper"
      >
        <div className="animated-border-inner p-5 sm:p-6 text-center">
          {/* Avatar */}
          <div className="mb-3 inline-block">
            <img
              src="/avatar.jpg"
              alt="Avatar Giáo viên"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-lg border-3 border-white/80"
            />
          </div>

          <h1 className="font-outfit text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-800 via-purple-700 to-pink-600 mb-2 mt-2 drop-shadow-md tracking-tight">
            Giáo viên yêu công nghệ
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-purple-600"
            >
              <GraduationCap size={18} />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-pink-500"
            >
              <Heart size={14} fill="currentColor" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className="text-blue-500"
            >
              <Laptop size={18} />
            </motion.div>
          </div>

          <p className="text-purple-800/80 mb-6 text-sm sm:text-base font-medium">
            Game, video và các công cụ dạy học...
          </p>

          {/* Login Form */}
          <AnimatePresence mode="wait">
            {/* Email Step - Default */}
            {step === 'email' && (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {/* Google Login Button - Main Primary Action */}
                <div className="flex justify-center py-4">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Đăng nhập Google thất bại')}
                    type="standard"
                    shape="pill"
                    text="signin_with"
                    size="large"
                    locale="vi"
                    useOneTap
                  />
                </div>

                {/* Switch to Pro Code */}
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProMode(true);
                      setStep('code');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-purple-700 bg-purple-100/50 hover:bg-purple-100 hover:text-purple-900 transition-all border border-purple-200/50"
                  >
                    <Crown size={18} />
                    <span>Đăng nhập Pro</span>
                  </button>
                </div>
              </motion.div>
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
          <div className="mt-4">
            <a
              href="https://youtu.be/gfMUjPfxX0U"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium text-sm rounded-lg shadow hover:shadow-lg transition-all hover:scale-105"
            >
              <Play size={14} fill="currentColor" />
              <span>Video giới thiệu</span>
            </a>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-purple-200/30">
            <a
              href="https://zalo.me/0975509490"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-purple-600 hover:text-purple-800 transition-colors"
            >
              <Sparkles size={12} className="text-amber-500" />
              <span className="font-bold">Đức Nguyễn</span>
              <span className="font-medium text-purple-500">· Zalo 0975509490</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;