
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (role: UserRole, name?: string) => void;
}

const TRIAL_KEY = 'decode_game_trial_count';
const MAX_TRIALS = 5;

const getTrialCount = (): number => {
  const saved = localStorage.getItem(TRIAL_KEY);
  return saved ? parseInt(saved, 10) : MAX_TRIALS;
};

const decrementTrial = (): number => {
  const current = getTrialCount();
  const newCount = Math.max(0, current - 1);
  localStorage.setItem(TRIAL_KEY, String(newCount));
  return newCount;
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<'intro' | 'main'>('intro');
  const [trialsRemaining, setTrialsRemaining] = useState(getTrialCount());

  // Hiệu ứng chào mừng ban đầu
  useEffect(() => {
    if (view === 'intro') {
      const timer = setTimeout(() => setView('main'), 2500);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const handleStartTrial = () => {
    if (trialsRemaining > 0) {
      const remaining = decrementTrial();
      setTrialsRemaining(remaining);
      onLogin(UserRole.TEACHER);
    }
  };

  const handleResetTrials = () => {
    localStorage.setItem(TRIAL_KEY, String(MAX_TRIALS));
    setTrialsRemaining(MAX_TRIALS);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full overflow-hidden p-6">
      {/* Background particles */}
      <div className="bg-particles"></div>

      {view === 'intro' ? (
        <div className="text-center animate-fade-in space-y-8 px-4">
          <div className="text-9xl animate-float">🎨</div>
          <h1 className="text-4xl md:text-6xl font-black text-white text-glow tracking-tight">
            Chào mừng đến với
          </h1>
          <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-glow">
            "Giải Mã Bức Tranh"
          </h2>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      ) : (
        <div className="cute-card p-10 w-full max-w-md text-center animate-fade-in">
          <div className="text-6xl mb-4 animate-float">🧩</div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            GIẢI MÃ BỨC TRANH
          </h2>
          <p className="text-gray-500 mb-6 font-semibold">
            Tạo quiz và chia sẻ link cho học sinh
          </p>

          {/* Trial counter */}

          {/* Trial counter removed */}


          {trialsRemaining > 0 ? (
            <button
              onClick={handleStartTrial}
              className="cute-3d-button w-full text-xl"
            >
              🚀 Bắt đầu
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-4 rounded-2xl border-2 border-amber-200">
                <p className="text-amber-800 font-bold mb-2">🌟 Nâng cấp Pro để sử dụng không giới hạn</p>
                <p className="text-sm text-amber-600">Liên hệ: Zalo 0975509490</p>
              </div>
              <button
                onClick={handleResetTrials}
                className="text-indigo-500 hover:text-indigo-700 font-semibold text-sm underline"
              >
                🔄 Reset lượt dùng thử (Demo)
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-400 font-medium">
              💡 Tạo quiz với hình ảnh bí ẩn và chia sẻ link cho học sinh
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
