
import React, { useState, useEffect } from 'react';
import { UserRole, GameConfig, Question, FirebaseUser } from './types';
import { INITIAL_CONFIG } from './constants';
import Login from './components/Login';
import GameView from './components/GameView';
import AdminView from './components/AdminView';
import { getGameConfig } from './utils/firebaseGameConfigs';

// Helper to check if URL has gameId parameter
const getGameIdFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('gameId');
};

const App: React.FC = () => {
  const gameIdFromUrl = getGameIdFromUrl();
  const isSharedLink = !!gameIdFromUrl;

  const [role, setRole] = useState<UserRole>(UserRole.GUEST);
  const [studentName, setStudentName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(isSharedLink);
  const [loadError, setLoadError] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  const [gameConfig, setGameConfig] = useState<GameConfig>(() => {
    const saved = localStorage.getItem('decode_game_config');
    return saved ? JSON.parse(saved) : INITIAL_CONFIG;
  });

  // Load config from Firebase if shared link
  useEffect(() => {
    if (gameIdFromUrl) {
      setIsLoading(true);
      getGameConfig(gameIdFromUrl)
        .then((config) => {
          if (config) {
            setGameConfig(config);
            setShowNameInput(true);
          } else {
            setLoadError('Không tìm thấy game. Link có thể đã hết hạn.');
          }
        })
        .catch((err) => {
          console.error('Error loading game:', err);
          setLoadError('Lỗi khi tải game. Vui lòng thử lại.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [gameIdFromUrl]);

  useEffect(() => {
    // Chỉ lưu vào localStorage nếu không phải shared link
    if (!isSharedLink) {
      try {
        localStorage.setItem('decode_game_config', JSON.stringify(gameConfig));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        // Có thể thêm thông báo lỗi nhẹ ở đây nếu muốn
      }
    }
  }, [gameConfig, isSharedLink]);

  const handleLogin = (selectedRole: UserRole, name?: string, user?: FirebaseUser) => {
    setRole(selectedRole);
    if (name) setStudentName(name);
    if (user) setCurrentUser(user);
  };

  const handleStudentStart = (name: string) => {
    setStudentName(name);
    setRole(UserRole.STUDENT);
    setShowNameInput(false);
  };

  const handleUpdateConfig = (newConfig: GameConfig) => {
    setGameConfig(newConfig);
  };

  const logout = () => {
    if (isSharedLink) {
      // Nếu là shared link, quay về màn hình nhập tên
      setRole(UserRole.GUEST);
      setStudentName('');
      setShowNameInput(true);
    } else {
      setRole(UserRole.GUEST);
      setStudentName('');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Background particles */}
      <div className="bg-particles"></div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="cute-card p-10 max-w-lg w-full text-center">
            <div className="text-7xl mb-6 animate-bounce">⏳</div>
            <h1 className="text-2xl font-black text-indigo-600 mb-2">
              Đang tải game...
            </h1>
            <p className="text-gray-500">Vui lòng chờ trong giây lát</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {loadError && !isLoading && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="cute-card p-10 max-w-lg w-full text-center">
            <div className="text-7xl mb-6">😢</div>
            <h1 className="text-2xl font-black text-red-500 mb-2">
              Oops! Có lỗi xảy ra
            </h1>
            <p className="text-gray-600 mb-6">{loadError}</p>
            <button
              onClick={() => window.location.href = window.location.pathname}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Màn hình nhập tên cho học sinh từ shared link */}
      {showNameInput && isSharedLink && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
          <div className="cute-card p-10 max-w-lg w-full text-center">
            <div className="text-7xl mb-6 animate-float">🎨</div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
              Giải Mã Bức Tranh Bí Ẩn
            </h1>
            <p className="text-gray-600 mb-8 font-semibold">
              Trả lời đúng các câu hỏi để khám phá bức tranh!
            </p>

            <div className="mb-6">
              <label className="block text-left text-indigo-700 font-bold mb-2 ml-1">
                👋 Tên của em là:
              </label>
              <input
                type="text"
                id="student-name-input"
                className="w-full px-5 py-4 rounded-2xl text-lg font-semibold"
                placeholder="Nhập tên của em..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = document.getElementById('student-name-input') as HTMLInputElement;
                    if (input && input.value.trim()) {
                      handleStudentStart(input.value.trim());
                    }
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('student-name-input') as HTMLInputElement;
                if (input && input.value.trim()) {
                  handleStudentStart(input.value.trim());
                }
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '16px 32px',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 6px 0 #4c51bf, 0 10px 20px rgba(102, 126, 234, 0.4)',
                pointerEvents: 'auto'
              }}
            >
              🚀 Bắt đầu chơi!
            </button>
          </div>
        </div>
      )}

      {/* Màn hình login cho Admin (khi không phải shared link) */}
      {!isSharedLink && role === UserRole.GUEST && <Login onLogin={handleLogin} />}

      {/* Game View cho học sinh */}
      {role === UserRole.STUDENT && (
        <GameView
          studentName={studentName}
          config={gameConfig}
          onExit={logout}
        />
      )}

      {/* Admin View cho giáo viên */}
      {role === UserRole.TEACHER && (
        <AdminView
          config={gameConfig}
          onUpdateConfig={handleUpdateConfig}
          onExit={logout}
          user={currentUser}
        />
      )}
    </div>
  );
};

export default App;
