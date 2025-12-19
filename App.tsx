import React, { useState, useEffect, Suspense, lazy } from 'react';
import SnowBackground from './components/SnowBackground';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import VideoEditor from './components/VideoEditor';
import VideoPlayer from './components/VideoPlayer';
import AdminPanel from './components/AdminPanel';
import Geometry3D from './components/Geometry3D';
import BeeGame from './components/BeeGame';
import VongQuay from './components/VongQuay';
import LuckyWheel from './components/LuckyWheel';
import { User, ViewState, VideoLesson } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { decodeVideoData } from './utils/shareUtils';
import { logVisit } from './utils/analyticsUtils';

// Email admin được phép vào trang quản lý mã
const ADMIN_EMAILS = ['ducnguyen.giaovien@gmail.com', 'nguyenduc91ndc@gmail.com'];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<VideoLesson | null>(null);

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
    if (sharedData) {
      const decodedLesson = decodeVideoData(sharedData);
      if (decodedLesson) {
        setCurrentLesson(decodedLesson);
        setView('PLAYER');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    }

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
      setView('DASHBOARD');
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('ntd_user', JSON.stringify(loggedInUser));
    // Ghi nhận lượt truy cập
    logVisit(loggedInUser.id, loggedInUser.name, loggedInUser.avatar);
    // Load lessons cho user mới đăng nhập
    const userLessonsKey = getLessonsStorageKey(loggedInUser.email);
    const savedLessons = localStorage.getItem(userLessonsKey);
    if (savedLessons) {
      setLessons(JSON.parse(savedLessons));
    } else {
      setLessons([]);
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

  const handleCreateNew = () => {
    setCurrentLesson(null); // Reset current for creating new
    setView('CREATE_EDIT');
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
    setCurrentLesson(null);
    setView('DASHBOARD');
  }

  return (
    <ThemeProvider>
      <div className="w-full min-h-screen font-sans text-gray-800 overflow-hidden relative selection:bg-purple-200">
        <SnowBackground />

        {/* Content Layer */}
        <div className="relative z-10 w-full h-full">
          {view === 'LOGIN' && (
            <Login onLogin={handleLogin} />
          )}

          {view === 'DASHBOARD' && user && (
            <Dashboard
              user={user}
              lessons={lessons}
              onCreateNew={handleCreateNew}
              onPlay={handlePlayLesson}
              onEdit={handleEditLesson}
              onLogout={handleLogout}
              onDelete={handleDeleteLesson}
              onAdmin={() => setView('ADMIN')}
              onGeometry3D={() => setView('GEOMETRY_3D')}
              onBeeGame={() => setView('BEE_GAME')}
              onVongQuay={() => setView('VONG_QUAY')}
              onLuckyWheel={() => setView('LUCKY_WHEEL')}
              isAdmin={ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')}
            />
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

          {view === 'VONG_QUAY' && (
            <VongQuay onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'LUCKY_WHEEL' && (
            <LuckyWheel onBack={() => setView('DASHBOARD')} />
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;