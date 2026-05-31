import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SnowBackground from './components/SnowBackground';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import VideoEditor from './components/VideoEditor';
import VideoPlayer from './components/VideoPlayer';
import AdminPanel from './components/AdminPanel';
import Geometry3D from './components/Geometry3D';
import DenHung3D from './components/DenHung3D';
import HeartSystem3D from './components/HeartSystem3D';
import VietnamMap from './components/VietnamMap';
import ChucTet from './components/ChucTet';
import PuzzleGame from './components/PuzzleGame';
import TreasureHunt from './components/TreasureHunt';
import VirtualExperiment from './components/VirtualExperiment';
import EarthSeasonsSimulation from './components/EarthSeasonsSimulation';
import ClockExperiment from './components/ClockExperiment';
import ThatLuong3D from './components/ThatLuong3D';
import BangCuuChuong from './components/BangCuuChuong';
import GameTuongTac from './components/GameTuongTac';
import YogurtExperiment from './components/YogurtExperiment';
import KiemTraDaoVan from './components/KiemTraDaoVan';
import SangKienKinhNghiem from './components/SangKienKinhNghiem';
import NhanXetTT27 from './components/NhanXetTT27';
import BeeGame from './components/BeeGame';
import BeeGameEditable from './components/BeeGameEditable';
import BacteriaGameEditable from './components/BacteriaGameEditable';
import VongQuay from './components/VongQuay';
import LuckyWheel from './components/LuckyWheel';
import KingGame from './components/KingGame';
import KingGameLopHocCompact from './components/KingGameLopHocCompact';
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
import CheckDaoVan from './components/KiemTraDaoVan';
import AboutUs from './components/AboutUs';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import ContactUs from './components/ContactUs';

import NhayBaoBoApp from './nhay-bao-bo/NhayBaoBoApp';
import { AppVisibilityState, AppId, subscribeToAppVisibility } from './utils/firebaseAppVisibility';
import { logAppUsage } from './utils/firebaseAppUsage';
import SolarSystemSimulation from './components/SolarSystemSimulation';
import KeoCoTriTueApp from './keo-co-tri-tue/App';
import GameTuyChinh from './components/GameTuyChinh';
import DinhDocLap3D from './components/DinhDocLap3D';
import ThuMoiTuongTac from './components/ThuMoiTuongTac';
import KyYeuTuyChinh from './components/KyYeuTuyChinh';
import ThiepMoiOnline from './components/ThiepMoiOnline';
import SoanGiaoAnNangLucSo from './components/SoanGiaoAnNangLucSo';
import QrGenerator from './components/QrGenerator';
import { getQrLinkById, incrementQrScan } from './utils/firebaseQrLinks';

// Email admin được phép vào trang quản lý mã
const ADMIN_EMAILS = ['ducnguyen.giaovien@gmail.com', 'nguyenduc91ndc@gmail.com'];

const VIEW_APP_IDS: Partial<Record<ViewState, AppId>> = {
  CREATE_EDIT: 'interactiveVideo',
  PLAYER: 'interactiveVideo',
  GEOMETRY_3D: 'geometry3DTools',
  BEE_GAME: 'beeGame',
  BEE_GAME_EDITABLE: 'beeGameEditable',
  BACTERIA_GAME: 'bacteriaGame',
  VONG_QUAY: 'vongQuay',
  LUCKY_WHEEL: 'luckyWheel',
  KING_GAME: 'kingGame',
  KING_GAME_LOP_HOC_COMPACT: 'kingGameLopHocCompact',
  STAR_WHEEL: 'starWheel',
  VIDEO_STORE: 'videoStore',
  INTERACTIVE_VIDEO: 'interactiveVideo',
  AI_COURSE_STORE: 'aiCourseStore',
  QR_GENERATOR: 'qrGenerator',
  CANVA_BASICS: 'canvaBasics',
  COMMUNITY_RESOURCES: 'communityResources',
  DEN_HUNG_3D: 'denHung3D',
  HEART_SYSTEM_3D: 'heartSystem3D',
  VIETNAM_MAP: 'vietnamMap',
  CHUC_TET: 'chucTet',
  PUZZLE_GAME: 'puzzleGame',
  TREASURE_HUNT: 'treasureHunt',
  VIRTUAL_EXPERIMENT: 'virtualExperiment',
  CLOCK_EXPERIMENT: 'clockExperiment',
  BANG_CUU_CHUONG: 'bangCuuChuong',
  GAME_TUONG_TAC: 'gameTuongTac',
  YOGURT_EXPERIMENT: 'yogurtExperiment',
  KIEM_TRA_DAO_VAN: 'kiemTraDaoVan',
  SANG_KIEN_KN: 'sangKienKinhNghiem',
  EARTH_SEASONS: 'earthSeasons',
  THAT_LUONG_3D: 'thatLuong3D',
  NHAN_XET_TT27: 'nhanXetTT27',
  NHAY_BAO_BO: 'nhayBaoBo',
  SOLAR_SYSTEM: 'solarSystem',
  KEO_CO_TRI_TUE: 'keoCoTriTue',
  GAME_TUY_CHINH: 'gameTuyChinh',
  DINH_DOC_LAP_3D: 'dinhDocLap3D',
  THU_MOI_TUONG_TAC: 'thuMoiTuongTac',
  KY_YEU_CUOI_NAM: 'kyYeuCuoiNam',
  THIEP_MOI_ONLINE: 'thiepMoiOnline',
};

const getInitialSharedAppId = (appName: string): string | null => {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('app')?.toLowerCase() === appName ? params.get('id') : null;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('DASHBOARD'); // Default to Dashboard
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<VideoLesson | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false); // Login modal for guest
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null); // Action after login
  const [showNewYearWelcome, setShowNewYearWelcome] = useState(false); // New Year welcome modal
  const [appVisibility, setAppVisibility] = useState<AppVisibilityState>({ apps: {}, maintenanceMode: false, maintenanceMessage: '' });
  const [appVisibilityLoaded, setAppVisibilityLoaded] = useState(false);
  const [sharedThuMoiId, setSharedThuMoiId] = useState<string | null>(() => getInitialSharedAppId('thu_moi_tuong_tac'));
  const [sharedThiepMoiId, setSharedThiepMoiId] = useState<string | null>(() => getInitialSharedAppId('thiep_moi_online'));
  const lastAppUsageLogRef = useRef<{ key: string; time: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrId = params.get('qr');
    if (!qrId) return;

    getQrLinkById(qrId).then(async (qrLink) => {
      if (!qrLink?.targetUrl) return;
      await incrementQrScan(qrId, qrLink.scans || 0).catch(() => undefined);
      window.location.replace(qrLink.targetUrl);
    }).catch((error) => {
      console.error('QR redirect error:', error);
    });
  }, []);

  // Lấy storage key theo email user
  const getLessonsStorageKey = (email?: string): string => {
    const userEmail = email || localStorage.getItem('ntd_current_email') || 'guest';
    return `ntd_lessons_${userEmail.toLowerCase().trim()}`;
  };

  const isAdminUser = user ? ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') : false;
  const currentAppId = VIEW_APP_IDS[view];
  const isPublicSharedThuMoiView = view === 'THU_MOI_TUONG_TAC' && Boolean(sharedThuMoiId);
  const isFreeKyYeuView = view === 'KY_YEU_CUOI_NAM';
  const isCheckingAppVisibility = !appVisibilityLoaded && Boolean(currentAppId) && !isAdminUser && !isPublicSharedThuMoiView && !isFreeKyYeuView;
  const isCurrentAppDisabled =
    appVisibilityLoaded &&
    Boolean(currentAppId) &&
    appVisibility.apps[currentAppId as AppId] === false &&
    !isAdminUser &&
    !isPublicSharedThuMoiView &&
    !isFreeKyYeuView;

  // Subscribe to app visibility
  useEffect(() => {
    const unsubscribe = subscribeToAppVisibility((state) => {
      setAppVisibility(state);
      setAppVisibilityLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!appVisibilityLoaded || isAdminUser || !currentAppId || isPublicSharedThuMoiView || isFreeKyYeuView) return;
    if (appVisibility.apps[currentAppId] !== false) return;

    setCurrentLesson(null);
    setSharedThuMoiId(null);
    setSharedThiepMoiId(null);
    setView('DASHBOARD');
    if (window.location.pathname !== '/' || window.location.search) {
      window.history.replaceState({}, document.title, '/');
    }
  }, [appVisibility.apps, appVisibilityLoaded, currentAppId, isAdminUser, isPublicSharedThuMoiView, isFreeKyYeuView]);

  useEffect(() => {
    if (!currentAppId || view === 'DASHBOARD' || view === 'ADMIN') return;
    if (isCheckingAppVisibility || isCurrentAppDisabled) return;
    const logKey = `${currentAppId}:${user?.id || user?.email || 'guest'}`;
    const now = Date.now();
    if (lastAppUsageLogRef.current?.key === logKey && now - lastAppUsageLogRef.current.time < 5000) return;
    lastAppUsageLogRef.current = { key: logKey, time: now };
    logAppUsage(currentAppId, user);
  }, [currentAppId, view, user?.id, user?.email, isCheckingAppVisibility, isCurrentAppDisabled]);

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
      let defaultView: ViewState = 'DASHBOARD';

      // Parse pathname for sub-pages (about, privacy, terms, contact)
      const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '');
      if (pathname === '/about') defaultView = 'ABOUT' as ViewState;
      else if (pathname === '/privacy') defaultView = 'PRIVACY' as ViewState;
      else if (pathname === '/terms') defaultView = 'TERMS' as ViewState;
      else if (pathname === '/contact') defaultView = 'CONTACT' as ViewState;
      else if (pathname === '/dinh-doc-lap-3d') defaultView = 'DINH_DOC_LAP_3D' as ViewState;
      else if (pathname === '/ky-yeu-cuoi-nam') defaultView = 'KY_YEU_CUOI_NAM' as ViewState;
      else if (pathname === '/thiep-moi-online') {
        defaultView = 'THIEP_MOI_ONLINE' as ViewState;
        const idParam = urlParams.get('id');
        if (idParam) setSharedThiepMoiId(idParam);
      }

      // Parse ?app= from URL
      const appParam = urlParams.get('app');
      if (appParam) {
        switch (appParam.toLowerCase()) {
          case 'tham_van_ai':
            defaultView = 'KIEM_TRA_DAO_VAN';
            break;
          case 'bang_cuu_chuong':
            defaultView = 'BANG_CUU_CHUONG';
            break;
          case 'he_mat_troi':
            defaultView = 'SOLAR_SYSTEM';
            break;
          case 'sang_kien_kn':
            defaultView = 'SANG_KIEN_KN';
            break;
          case 'nhan_xet_tt27':
            defaultView = 'NHAN_XET_TT27';
            break;
          case 'game_tuy_chinh':
            defaultView = 'GAME_TUY_CHINH';
            break;
          case 'dinh_doc_lap':
            defaultView = 'DINH_DOC_LAP_3D';
            break;
          case 'thu_moi_tuong_tac':
            defaultView = 'THU_MOI_TUONG_TAC';
            break;
          case 'ky_yeu_cuoi_nam':
            defaultView = 'KY_YEU_CUOI_NAM';
            break;
          case 'thiep_moi_online':
            defaultView = 'THIEP_MOI_ONLINE';
            break;
          // Có thể thêm case cho các app khác ở đây sau
        }
        // Dọn sạch URL: chỉ giữ ?app=..., xóa fbclid, utm_*, aem_* v.v. Cần giữ lại tham số 'id' nếu có để hỗ trợ chức năng chia sẻ Cloud
        let cleanUrl = `${window.location.pathname}?app=${appParam}`;
        const idParam = urlParams.get('id');
        if (idParam) {
          cleanUrl += `&id=${idParam}`;
          if (appParam.toLowerCase() === 'thu_moi_tuong_tac') {
            setSharedThuMoiId(idParam);
          } else if (appParam.toLowerCase() === 'thiep_moi_online') {
            setSharedThiepMoiId(idParam);
          }
        }
        window.history.replaceState({}, document.title, cleanUrl);
      }

      // Bổ sung: Parse Path cho các link thân thiện kiểu mới (VD: /share/he-mat-troi)
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      if (pathSegments.length >= 2 && pathSegments[0] === 'share') {
        const appSection = pathSegments[1];
        if (appSection === 'he-mat-troi') {
          defaultView = 'SOLAR_SYSTEM';
        }
        // Dọn dẹp các query như fbclid nhưng giữ nguyên đường dẫn tĩnh gốc
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // Parse ?view= from URL (cũ)
        const viewParam = urlParams.get('view');
        if (viewParam) {
          switch (viewParam.toLowerCase()) {
            case 'earth-seasons':
              defaultView = 'EARTH_SEASONS';
              break;
            case 'that-luong-3d':
              defaultView = 'THAT_LUONG_3D';
              break;
            // Handle other views here if needed
          }
          const cleanUrl = `${window.location.pathname}?view=${viewParam}`;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } // Đóng thẻ else bên trên

      const hasSharedAppId = Boolean(urlParams.get('id'));
      const isDirectThiepCreator = defaultView === 'THIEP_MOI_ONLINE' && !hasSharedAppId;
      const shouldRequireDirectLogin =
        !savedUser &&
        (
          isDirectThiepCreator
        );

      if (shouldRequireDirectLogin) {
        if (isDirectThiepCreator) {
          setSharedThiepMoiId(null);
          window.history.replaceState({}, document.title, '/');
        } else {
          const protectedView = defaultView;
          setPendingAction(() => () => setView(protectedView));
        }
        setShowLoginModal(true);
        defaultView = 'DASHBOARD';
      }

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

      // Set the default view based on URL param or DASHBOARD
      setView(defaultView);

      // Migration: copy dữ liệu cũ từ visitorLogs sang loginHistory (chỉ chạy 1 lần)
      checkAndMigrateIfNeeded();

      // Auto-show New Year welcome on first visit (trong mùa Tết)
      const hasSeenNewYear = localStorage.getItem('ntd_seen_new_year_2026');
      const nowDate = new Date();
      // Hiển thị từ 15/12 đến hết 28/2 (mùa Tết) - ĐÃ TẮT THEO YÊU CẦU
      const isNewYearSeason = false;

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
    const actionToRun = pendingAction;
    if (actionToRun) {
      actionToRun();
      setPendingAction(null);
    } else {
      setView('DASHBOARD');
    }
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

  const renderAccessGate = (title: string, message: string, allowAdminLogin = false) => (
    <ThemeProvider>
      <div className="w-full min-h-screen font-sans text-white overflow-hidden relative selection:bg-purple-200">
        <SnowBackground />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-950/80 backdrop-blur-xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl">
              !
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">{title}</h1>
            <p className="text-white/75 leading-relaxed">{message}</p>
            {allowAdminLogin && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={user ? handleLogout : () => setShowLoginModal(true)}
                  className="px-5 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-white/90 transition-colors"
                >
                  {user ? 'Đăng xuất' : 'Đăng nhập admin'}
                </button>
              </div>
            )}
          </div>
        </div>

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
      </div>
    </ThemeProvider>
  );

  if (appVisibilityLoaded && appVisibility.maintenanceMode && !isAdminUser) {
    return renderAccessGate(
      'Website đang bảo trì',
      appVisibility.maintenanceMessage || 'Website đang bảo trì, vui lòng quay lại sau.',
      true
    );
  }

  if (isCheckingAppVisibility) {
    return renderAccessGate('Đang kiểm tra quyền truy cập', 'Vui lòng chờ trong giây lát.');
  }

  if (isCurrentAppDisabled) {
    return renderAccessGate('Ứng dụng đang tạm tắt', 'Admin đã tạm tắt ứng dụng này.');
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
                  onKingGameLopHocCompact={() => requireLogin(() => setView('KING_GAME_LOP_HOC_COMPACT'))}
                  onStarWheel={() => requireLogin(() => setView('STAR_WHEEL'))}
                  onVideoStore={() => requireLogin(() => setView('VIDEO_STORE'))}
                  onInteractiveVideo={() => requireLogin(() => setView('INTERACTIVE_VIDEO'))}
                  onAICourseStore={() => requireLogin(() => setView('AI_COURSE_STORE'))}
                  onSoanGiaoAnNangLucSo={() => setView('SOAN_GIAO_AN_NANG_LUC_SO')}
                  onCanvaBasics={() => requireLogin(() => setView('CANVA_BASICS'))}
                  onCommunityResources={() => requireLogin(() => setView('COMMUNITY_RESOURCES'))}
                  onNewYear={() => setShowNewYearWelcome(true)}
                  onDenHung3D={() => requireLogin(() => setView('DEN_HUNG_3D'))}
                  onHeartSystem3D={() => requireLogin(() => setView('HEART_SYSTEM_3D'))}
                  onVietnamMap={() => requireLogin(() => setView('VIETNAM_MAP'))}
                  onChucTet={() => requireLogin(() => setView('CHUC_TET'))}
                  onPuzzleGame={() => requireLogin(() => setView('PUZZLE_GAME'))}
                  onNgheNghiep={() => requireLogin(() => window.open('https://aistudio.google.com/apps/drive/19wuAJ5tA9JuALlQ-STS6sTuKwA1P07eZ', '_blank'))}
                  onTreasureHunt={() => requireLogin(() => setView('TREASURE_HUNT'))}
                  onVirtualExperiment={() => requireLogin(() => setView('VIRTUAL_EXPERIMENT'))}
                  onClockExperiment={() => requireLogin(() => setView('CLOCK_EXPERIMENT'))}
                  onBangCuuChuong={() => requireLogin(() => setView('BANG_CUU_CHUONG'))}
                  onGameTuongTac={() => requireLogin(() => setView('GAME_TUONG_TAC'))}
                  onYogurtExperiment={() => requireLogin(() => setView('YOGURT_EXPERIMENT'))}
                  onKiemTraDaoVan={() => requireLogin(() => setView('KIEM_TRA_DAO_VAN'))}
                  onSangKienKN={() => requireLogin(() => setView('SANG_KIEN_KN'))}
                  onNhanXetTT27={() => requireLogin(() => setView('NHAN_XET_TT27'))}
                  onEarthSeasons={() => requireLogin(() => setView('EARTH_SEASONS'))}
                  onThatLuong3D={() => requireLogin(() => setView('THAT_LUONG_3D'))}
                  onNhayBaoBo={() => requireLogin(() => setView('NHAY_BAO_BO'))}
                  onSolarSystem={() => requireLogin(() => setView('SOLAR_SYSTEM'))}
                  onKeoCoTriTue={() => requireLogin(() => setView('KEO_CO_TRI_TUE'))}
                  onGameTuyChinh={() => setView('GAME_TUY_CHINH')}
                  onDinhDocLap3D={() => requireLogin(() => setView('DINH_DOC_LAP_3D'))}
                  onThuMoiHopPH={() => setView('THU_MOI_TUONG_TAC')}
                  onThuMoiTuongTac={() => setView('THU_MOI_TUONG_TAC')}
                  onThiepMoiOnline={() => requireLogin(() => { setSharedThiepMoiId(null); setView('THIEP_MOI_ONLINE'); })}
                  onQrGenerator={() => requireLogin(() => setView('QR_GENERATOR'))}
                  onKyYeuCuoiNam={() => setView('KY_YEU_CUOI_NAM')}
                  isAdmin={user ? ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') : false}
                  isGuest={!user}
                  hiddenApps={Object.entries(appVisibility.apps).filter(([_, v]) => v === false).map(([k]) => k)}
                  maintenanceMode={appVisibility.maintenanceMode}
                  maintenanceMessage={appVisibility.maintenanceMessage}
                  showUpdateNotification={appVisibility.showUpdateNotification}
                />
              </div>
              <Footer onViewChange={(v) => { window.scrollTo(0, 0); setView(v as ViewState); }} />
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

          {view === 'KING_GAME_LOP_HOC_COMPACT' && (
            <KingGameLopHocCompact onBack={() => setView('DASHBOARD')} />
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
              isLoggedIn={!!user}
              onRequireLogin={() => setShowLoginModal(true)}
            />
          )}

          {view === 'SOAN_GIAO_AN_NANG_LUC_SO' && (
            <SoanGiaoAnNangLucSo onBack={() => setView('DASHBOARD')} />
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

          {view === 'DEN_HUNG_3D' && (
            <DenHung3D onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'THAT_LUONG_3D' && (
            <ThatLuong3D onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'HEART_SYSTEM_3D' && (
            <HeartSystem3D onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'VIETNAM_MAP' && (
            <VietnamMap onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'CHUC_TET' && (
            <ChucTet onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'PUZZLE_GAME' && (
            <PuzzleGame onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'TREASURE_HUNT' && (
            <TreasureHunt onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'VIRTUAL_EXPERIMENT' && (
            <VirtualExperiment onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'EARTH_SEASONS' && (
            <EarthSeasonsSimulation onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'CLOCK_EXPERIMENT' && (
            <ClockExperiment onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'BANG_CUU_CHUONG' && (
            <BangCuuChuong onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'GAME_TUONG_TAC' && (
            <GameTuongTac onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'YOGURT_EXPERIMENT' && (
            <YogurtExperiment onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'KIEM_TRA_DAO_VAN' && (
            <KiemTraDaoVan onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'SANG_KIEN_KN' && (
            <SangKienKinhNghiem
              onBack={() => setView('DASHBOARD')}
              isAdmin={user ? ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') : false}
              userEmail={user?.email || undefined}
              userName={(user as any)?.displayName || undefined}
            />
          )}

          {view === 'NHAN_XET_TT27' && (
            <NhanXetTT27 onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'NHAY_BAO_BO' && (
            <NhayBaoBoApp onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'ABOUT' && (
            <div className="flex-1 flex flex-col pt-16">
              <button
                onClick={() => { window.history.pushState({}, '', '/'); setView('DASHBOARD'); }}
                className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all font-medium text-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6" /></svg>
                Quay lại
              </button>
              <AboutUs />
              <Footer onViewChange={(v) => { window.scrollTo(0, 0); setView(v as ViewState); }} />
            </div>
          )}

          {view === 'SOLAR_SYSTEM' && (
            <SolarSystemSimulation onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'KEO_CO_TRI_TUE' && (
            <KeoCoTriTueApp onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'GAME_TUY_CHINH' && (
            <GameTuyChinh onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'DINH_DOC_LAP_3D' && (
            <DinhDocLap3D onBack={() => setView('DASHBOARD')} />
          )}

          {view === 'THU_MOI_TUONG_TAC' && (
            <ThuMoiTuongTac 
              user={user ? { email: user.email || '', name: user.name || '' } : null}
              onRequireLogin={() => setShowLoginModal(true)}
              onBack={() => setView('DASHBOARD')} 
              sharedId={sharedThuMoiId} 
            />
          )}

          {view === 'THIEP_MOI_ONLINE' && (
            <ThiepMoiOnline
              user={user ? { email: user.email || '', name: user.name || '', id: user.id || user.email || '' } : null}
              onRequireLogin={() => setShowLoginModal(true)}
              onBack={() => setView('DASHBOARD')}
              sharedId={sharedThiepMoiId}
            />
          )}

          {view === 'QR_GENERATOR' && user && (
            <QrGenerator
              user={user}
              onBack={() => setView('DASHBOARD')}
            />
          )}

          {view === 'KY_YEU_CUOI_NAM' && (
            <KyYeuTuyChinh
              onBack={() => setView('DASHBOARD')}
              userEmail={user?.email}
              userName={user?.name}
            />
          )}

          {view === 'PRIVACY' && (
            <div className="flex-1 flex flex-col pt-16">
              <button
                onClick={() => { window.history.pushState({}, '', '/'); setView('DASHBOARD'); }}
                className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all font-medium text-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6" /></svg>
                Quay lại
              </button>
              <PrivacyPolicy />
              <Footer onViewChange={(v) => { window.scrollTo(0, 0); setView(v as ViewState); }} />
            </div>
          )}

          {view === 'TERMS' && (
            <div className="flex-1 flex flex-col pt-16">
              <button
                onClick={() => { window.history.pushState({}, '', '/'); setView('DASHBOARD'); }}
                className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all font-medium text-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6" /></svg>
                Quay lại
              </button>
              <TermsOfService />
              <Footer onViewChange={(v) => { window.scrollTo(0, 0); setView(v as ViewState); }} />
            </div>
          )}

          {view === 'CONTACT' && (
            <div className="flex-1 flex flex-col pt-16">
              <button
                onClick={() => { window.history.pushState({}, '', '/'); setView('DASHBOARD'); }}
                className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/20 transition-all font-medium text-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6" /></svg>
                Quay lại
              </button>
              <ContactUs />
              <Footer onViewChange={(v) => { window.scrollTo(0, 0); setView(v as ViewState); }} />
            </div>
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
