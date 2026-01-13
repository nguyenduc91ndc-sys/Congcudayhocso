import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SnowBackground from './components/SnowBackground';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import VideoEditor from './components/VideoEditor';
import VideoPlayer from './components/VideoPlayer';
import AdminPanel from './components/AdminPanel';
import Geometry3D from './components/Geometry3D';
import BeeGame from './components/BeeGame';
import BeeGameEditable from './components/BeeGameEditable';
import BacteriaGameEditable from './components/BacteriaGameEditable';
import VongQuay from './components/VongQuay';
import LuckyWheel from './components/LuckyWheel';
import KingGame from './components/KingGame';
import StarWheel from './components/StarWheel';
import VideoStore from './components/VideoStore';
import InteractiveVideoModule from './components/InteractiveVideoModule';
import AICourseStore from './components/AICourseStore';
import AICourseAdmin from './components/AICourseAdmin';
import CanvaBasics from './components/CanvaBasics';
import CommunityResourceStore from './components/CommunityResourceStore';
import NewYearWelcome from './components/NewYearWelcome';
import Footer from './components/Footer';
import ZaloBrowserWarning from './components/ZaloBrowserWarning';
import { User, ViewState, VideoLesson } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { decodeVideoData } from './utils/shareUtils';
import { getSharedVideo } from './utils/firebaseShareLinks';
import { logVisit } from './utils/analyticsUtils';
import { incrementVisitCount } from './utils/visitCounter';
import { logVisitorToFirebase, logLoginHistory, checkAndMigrateIfNeeded } from './utils/firebaseVisitors';

// Email admin được phép vào trang quản lý mã
const ADMIN_EMAILS = ['ducnguyen.giaovien@gmail.com', 'nguyenduc91ndc@gmail.com'];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('DASHBOARD'); // Default to Dashboard
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<VideoLesson | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false); // Login modal for guest
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null); // Action after login
  const [showNewYearWelcome, setShowNewYearWelcome] = useState(false); // New Year welcome modal

  // Lấy storage key theo email user
  const getLessonsStorageKey = (email?: string): string => {
    const userEmail = email || localStorage.getItem('ntd_current_email') || 'guest';
    return `ntd_lessons_${userEmail.toLowerCase().trim()}`;
  };

  // Load data from localStorage
  useEffect(() => {
    // Kiểm tra URL param để mở video chia sẻ (không cần đăng nhập)
    const urlParams = new URLSearchParams(window.location.search);

    // Kiểm tra param 'v' (nén mới) hoặc 'data' (cũ)
    const sharedData = urlParams.get('v') || urlParams.get('data');

    const loadSharedVideo = async () => {
      if (sharedData) {
        // Nếu ID ngắn (< 30 ký tự) -> lấy từ Firebase
        if (sharedData.length < 30) {
          const firebaseLesson = await getSharedVideo(sharedData);
          if (firebaseLesson) {
            setCurrentLesson(firebaseLesson);
            setView('PLAYER');
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
          }
        }

        // Fallback: thử giải nén LZ-String (link dài cũ)
        const decodedLesson = decodeVideoData(sharedData);
        if (decodedLesson) {
          setCurrentLesson(decodedLesson);
          setView('PLAYER');
          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        }
      }
      return false;
    };

    loadSharedVideo().then((hasSharedVideo) => {
      if (hasSharedVideo) return;

      // Load saved user
      const savedUser = localStorage.getItem('ntd_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Load lessons cho user này
        const userLessonsKey = getLessonsStorageKey(parsedUser.email);
        const savedLessons = localStorage.getItem(userLessonsKey);
        if (savedLessons) {
          setLessons(JSON.parse(savedLessons));
        }

        // Check and log history if needed (throttle 30 mins OR new day)
        const lastLogTime = localStorage.getItem('ntd_last_log_time');
        const now = Date.now();

        let shouldLog = false;
        if (!lastLogTime) {
          shouldLog = true;
        } else {
          const lastLogDate = new Date(parseInt(lastLogTime));
          const currentDate = new Date(now);
          // Check if different day
          const isNewDay = lastLogDate.getDate() !== currentDate.getDate() ||
            lastLogDate.getMonth() !== currentDate.getMonth() ||
            lastLogDate.getFullYear() !== currentDate.getFullYear();
          // Check time diff > 30 mins
          const isTimeElapsed = (now - parseInt(lastLogTime) > 30 * 60 * 1000);

          shouldLog = isNewDay || isTimeElapsed;
        }

        if (shouldLog) {
          // Log vào lịch sử
          logLoginHistory(parsedUser.id, parsedUser.name, parsedUser.email || '', parsedUser.avatar);
          // Update last log time
          localStorage.setItem('ntd_last_log_time', now.toString());

          // Log vào visitor logs (cho danh sách hiển thị realtime nếu dùng)
          incrementVisitCount();
          logVisitorToFirebase(parsedUser.id, parsedUser.name, parsedUser.avatar, parsedUser.email);
        }
      }
      // Always stay on DASHBOARD (default view)

      // Migration: copy dữ liệu cũ từ visitorLogs sang loginHistory (chỉ chạy 1 lần)
      checkAndMigrateIfNeeded();

      // Auto-show New Year welcome on first visit (trong mùa Tết)
      const hasSeenNewYear = localStorage.getItem('ntd_seen_new_year_2026');
      const nowDate = new Date();
      // Hiển thị từ 15/12 đến hết 28/2 (mùa Tết)
      const isNewYearSeason = (nowDate.getMonth() === 11 && nowDate.getDate() >= 15) || // 15/12 trở đi
        nowDate.getMonth() === 0 || // Tháng 1
        (nowDate.getMonth() === 1 && nowDate.getDate() <= 28); // Đến hết 28/2

      if (!hasSeenNewYear && isNewYearSeason && !sharedData) {
        setTimeout(() => {
          setShowNewYearWelcome(true);
          localStorage.setItem('ntd_seen_new_year_2026', 'true');
        }, 1000); // Delay 1s để app load xong
      }
    });
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('ntd_user', JSON.stringify(loggedInUser));
    localStorage.setItem('ntd_last_log_time', Date.now().toString());
    // Ghi nhận lượt truy cập (local)
    logVisit(loggedInUser.id, loggedInUser.name, loggedInUser.avatar);
    // Tăng lượt truy cập chung (Firebase)
    incrementVisitCount();
    // Lưu visitor vào Firebase
    logVisitorToFirebase(loggedInUser.id, loggedInUser.name, loggedInUser.avatar, loggedInUser.email);
    // Lưu vào lịch sử đăng nhập lâu dài (1 năm)
    logLoginHistory(loggedInUser.id, loggedInUser.name, loggedInUser.email || '', loggedInUser.avatar);
    // Load lessons cho user mới đăng nhập
    const userLessonsKey = getLessonsStorageKey(loggedInUser.email);
    const savedLessons = localStorage.getItem(userLessonsKey);
    if (savedLessons) {
      setLessons(JSON.parse(savedLessons));
    } else {
      setLessons([]);
    }
    setShowLoginModal(false);
    // Execute pending action if any
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    setUser(null);
    setLessons([]); // Clear lessons khi logout
    localStorage.removeItem('ntd_user');
    setView('LOGIN');
  }

  const handleSaveLesson = (lesson: VideoLesson) => {
    const updatedLessons = [...lessons, lesson];
    setLessons(updatedLessons);
    const storageKey = getLessonsStorageKey(user?.email);
    localStorage.setItem(storageKey, JSON.stringify(updatedLessons));
    setView('DASHBOARD');
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa bài giảng này không?')) {
      const updatedLessons = lessons.filter(l => l.id !== lessonId);
      setLessons(updatedLessons);
      const storageKey = getLessonsStorageKey(user?.email);
      localStorage.setItem(storageKey, JSON.stringify(updatedLessons));
    }
  };

  // Helper: require login to perform action
  const requireLogin = (action: () => void) => {
    if (user) {
      action();
    } else {
      setPendingAction(() => action);
      setShowLoginModal(true);
    }
  };

  const handleCreateNew = () => {
    requireLogin(() => {
      setCurrentLesson(null);
      setView('CREATE_EDIT');
    });
  }

  const handlePlayLesson = (lesson: VideoLesson) => {
    setCurrentLesson(lesson);
    setView('PLAYER');
  }

  const handlePreview = (lesson: VideoLesson) => {
    setCurrentLesson(lesson);
    setView('PLAYER');
  }

  const handleEditLesson = (lesson: VideoLesson) => {
    setCurrentLesson(lesson);
    setView('CREATE_EDIT');
  }

  const handleUpdateLesson = (updatedLesson: VideoLesson) => {
    // Kiểm tra xem là tạo mới hay cập nhật
    const existingIndex = lessons.findIndex(l => l.id === updatedLesson.id);
    let updatedLessons: VideoLesson[];

    if (existingIndex >= 0) {
      // Cập nhật lesson đã có
      updatedLessons = [...lessons];
      updatedLessons[existingIndex] = updatedLesson;
    } else {
      // Tạo mới
      updatedLessons = [...lessons, updatedLesson];
    }

    setLessons(updatedLessons);
    const storageKey = getLessonsStorageKey(user?.email);
    localStorage.setItem(storageKey, JSON.stringify(updatedLessons));
    // Không navigate về Dashboard - để VideoEditor hiển thị thẻ video đã lưu
  }

  return (
    <ThemeProvider>
      <div className="w-full min-h-screen font-sans text-gray-800 overflow-hidden relative selection:bg-purple-200">
        <SnowBackground />

        {/* Content Layer */}
        <ZaloBrowserWarning />
        <div className="relative z-10 w-full min-h-screen flex flex-col">
          {view === 'LOGIN' && (
            <Login onLogin={handleLogin} />
          )}

          {view === 'DASHBOARD' && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                <Dashboard
                  user={user || { id: 'guest', name: 'Khách', avatar: '' }}
                  lessons={lessons}
                  onCreateNew={handleCreateNew}
                  onPlay={handlePlayLesson}
                  onEdit={handleEditLesson}
                  onLogout={user ? handleLogout : () => setShowLoginModal(true)}
                  onDelete={handleDeleteLesson}
                  onAdmin={() => requireLogin(() => setView('ADMIN'))}
                  onGeometry3D={() => requireLogin(() => setView('GEOMETRY_3D'))}
                  onBeeGame={() => requireLogin(() => setView('BEE_GAME'))}
                  onBeeGameEditable={() => requireLogin(() => setView('BEE_GAME_EDITABLE'))}
                  onBacteriaGame={() => requireLogin(() => setView('BACTERIA_GAME'))}
                  onVongQuay={() => requireLogin(() => setView('VONG_QUAY'))}
                  onLuckyWheel={() => requireLogin(() => setView('LUCKY_WHEEL'))}
                  onKingGame={() => requireLogin(() => setView('KING_GAME'))}
                  onStarWheel={() => requireLogin(() => setView('STAR_WHEEL'))}
                  onVideoStore={() => setView('VIDEO_STORE')}
                  onInteractiveVideo={() => requireLogin(() => setView('INTERACTIVE_VIDEO'))}
                  onAICourseStore={() => setView('AI_COURSE_STORE')}
                  onCanvaBasics={() => setView('CANVA_BASICS')}
                  onCommunityResources={() => requireLogin(() => setView('COMMUNITY_RESOURCES'))}
                  onNewYear={() => setShowNewYearWelcome(true)}
                  isAdmin={user ? ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') : false}
                  isGuest={!user}
                />
              </div>
              <Footer />
            </div>
          )}
          {view === 'CREATE_EDIT' && (
            <div className="h-screen p-4 md:p-8">
              <div className="h-full bg-white/30 backdrop-blur-xl border border-white/40 rounded-[30px] shadow-2xl p-6">
                <VideoEditor
                  lesson={currentLesson}
                  onSave={handleUpdateLesson}
                  onCancel={() => {
                    setCurrentLesson(null);
                    setView('DASHBOARD');
                  }}
                  onPreview={handlePreview}
                />
              </div>
            </div>
          )}

          {view === 'PLAYER' && currentLesson && (
            <VideoPlayer
              lesson={currentLesson}
              onBack={() => setView(currentLesson.id === 'preview' ? 'CREATE_EDIT' : 'DASHBOARD')}
            />
          )}

          {view === 'ADMIN' && (
            <AdminPanel onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'GEOMETRY_3D' && (
            <Geometry3D onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'BEE_GAME' && (
            <BeeGame onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'BEE_GAME_EDITABLE' && (
            <BeeGameEditable onBack={() => setView('DASHBOARD')} userEmail={user?.email} />
          )}

          {view === 'BACTERIA_GAME' && (
            <BacteriaGameEditable onBack={() => setView('DASHBOARD')} userEmail={user?.email} />
          )}

          {view === 'VONG_QUAY' && (
            <VongQuay onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'LUCKY_WHEEL' && (
            <LuckyWheel onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'KING_GAME' && (
            <KingGame onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'STAR_WHEEL' && (
            <StarWheel onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'VIDEO_STORE' && (
            <VideoStore
              onBack={() => setView('DASHBOARD')}
              userId={user?.id || 'guest'}
              userEmail={user?.email || ''}
              userName={user?.name || 'Khách'}
              onRequireLogin={() => setShowLoginModal(true)}
            />
          )}

          {view === 'INTERACTIVE_VIDEO' && (
            <InteractiveVideoModule
              lessons={lessons}
              onSave={handleUpdateLesson}
              onDelete={handleDeleteLesson}
              onPlay={handlePlayLesson}
              onBack={() => setView('DASHBOARD')}
            />
          )}

          {view === 'AI_COURSE_STORE' && (
            <AICourseStore
              onBack={() => setView('DASHBOARD')}
              isAdmin={user ? ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') : false}
              onAdmin={() => setView('AI_COURSE_ADMIN')}
              isLoggedIn={!!user}
              onRequireLogin={() => setShowLoginModal(true)}
            />
          )}

          {view === 'AI_COURSE_ADMIN' && (
            <AICourseAdmin
              onBack={() => setView('DASHBOARD')}
            />
          )}

          {view === 'CANVA_BASICS' && (
            <CanvaBasics
              onBack={() => setView('DASHBOARD')}
              isAdmin={user ? ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') : false}
              isLoggedIn={!!user}
              onRequireLogin={() => setShowLoginModal(true)}
            />
          )}

          {view === 'COMMUNITY_RESOURCES' && (
            <CommunityResourceStore
              onBack={() => setView('DASHBOARD')}
              isAdmin={user ? ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') : false}
              isLoggedIn={!!user}
              onRequireLogin={() => setShowLoginModal(true)}
            />
          )}

          {/* Login Modal for guests */}
          <AnimatePresence>
            {showLoginModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                onClick={() => {
                  setShowLoginModal(false);
                  setPendingAction(null);
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  className="w-full max-w-md"
                >
                  <Login onLogin={handleLogin} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* New Year Welcome Modal */}
          <AnimatePresence>
            {showNewYearWelcome && (
              <NewYearWelcome onClose={() => setShowNewYearWelcome(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;