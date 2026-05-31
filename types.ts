export interface Question {
  id: string;
  time: number; // in seconds
  text: string;
  options: string[]; // Mảng đáp án linh hoạt (2-4 đáp án)
  correctOption: number; // Index của đáp án đúng (0, 1, 2, 3)
}

export type VideoSourceType = 'youtube' | 'local';
export type VideoPlayerLayout = 'full' | 'cinema' | 'sidebar';
export type VideoQuestionStyle = 'glass' | 'card' | 'playful' | 'gradient';

export interface VideoPlayerTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  logoText: string;
  logoImage?: string;
  publishTitle: string;
  publishSubtitle: string;
  authorName: string;
  authorInfo: string;
  footerLeftText: string;
  footerRightText: string;
  guideText: string;
  showAuthorPanel: boolean;
  autoAdvance: boolean;
  showScoreReport: boolean;
  radius: number;
  fontFamily: string;
  layout: VideoPlayerLayout;
  questionStyle: VideoQuestionStyle;
}

export const DEFAULT_VIDEO_PLAYER_THEME: VideoPlayerTheme = {
  primaryColor: '#7c3aed',
  secondaryColor: '#ec4899',
  accentColor: '#f59e0b',
  backgroundColor: '#111827',
  surfaceColor: '#ffffff',
  textColor: '#1f2937',
  logoText: 'GV',
  logoImage: '',
  publishTitle: 'Bài giảng tương tác',
  publishSubtitle: 'Thiết kế bởi Giáo viên CN',
  authorName: '',
  authorInfo: '',
  footerLeftText: '',
  footerRightText: '',
  guideText: '',
  showAuthorPanel: true,
  autoAdvance: true,
  showScoreReport: true,
  radius: 24,
  fontFamily: 'Nunito',
  layout: 'cinema',
  questionStyle: 'glass',
};

export function normalizeVideoPlayerTheme(theme?: Partial<VideoPlayerTheme>): VideoPlayerTheme {
  return {
    ...DEFAULT_VIDEO_PLAYER_THEME,
    ...(theme || {}),
  };
}

// Hàm migration: chuyển đổi Question format cũ sang format mới
export function migrateQuestion(q: any): Question {
  // Nếu đã là format mới (options là mảng), giữ nguyên
  if (Array.isArray(q.options)) {
    return q as Question;
  }
  // Chuyển đổi từ format cũ (object {A, B, C, D})
  const optionKeys = ['A', 'B', 'C', 'D'] as const;
  return {
    ...q,
    options: optionKeys.map(key => q.options[key] || '').filter((opt: string) => opt.trim() !== ''),
    correctOption: optionKeys.indexOf(q.correctOption as 'A' | 'B' | 'C' | 'D')
  };
}

// Hàm migration cho toàn bộ VideoLesson
export function migrateVideoLesson(lesson: any): VideoLesson {
  return {
    ...lesson,
    questions: lesson.questions.map(migrateQuestion)
  };
}

export interface VideoLesson {
  id: string;
  title: string;
  youtubeUrl: string;
  videoSource?: VideoSourceType;
  localVideoName?: string;
  localVideoObjectUrl?: string;
  playerTheme?: VideoPlayerTheme;
  startTime: number; // in seconds
  allowSeeking: boolean;
  questions: Question[];
  createdAt: number;
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CREATE_EDIT' | 'PLAYER' | 'ADMIN' | 'GEOMETRY_3D' | 'BEE_GAME' | 'BEE_GAME_EDITABLE' | 'BACTERIA_GAME' | 'VONG_QUAY' | 'LUCKY_WHEEL' | 'KING_GAME' | 'KING_GAME_LOP_HOC_COMPACT' | 'STAR_WHEEL' | 'VIDEO_STORE' | 'INTERACTIVE_VIDEO' | 'AI_COURSE_STORE' | 'AI_COURSE_ADMIN' | 'SOAN_GIAO_AN_NANG_LUC_SO' | 'QR_GENERATOR' | 'CANVA_BASICS' | 'NEW_YEAR' | 'COMMUNITY_RESOURCES' | 'DEN_HUNG_3D' | 'HEART_SYSTEM_3D' | 'VIETNAM_MAP' | 'CHUC_TET' | 'PUZZLE_GAME' | 'TREASURE_HUNT' | 'VIRTUAL_EXPERIMENT' | 'CLOCK_EXPERIMENT' | 'BANG_CUU_CHUONG' | 'GAME_TUONG_TAC' | 'YOGURT_EXPERIMENT' | 'KIEM_TRA_DAO_VAN' | 'ABOUT' | 'PRIVACY' | 'TERMS' | 'CONTACT' | 'PHONG_TRANH_3D' | 'SANG_KIEN_KN' | 'EARTH_SEASONS' | 'THAT_LUONG_3D' | 'NHAN_XET_TT27' | 'NHAY_BAO_BO' | 'SOLAR_SYSTEM' | 'KEO_CO_TRI_TUE' | 'GAME_TUY_CHINH' | 'DINH_DOC_LAP_3D' | 'THU_MOI_TUONG_TAC' | 'KY_YEU_CUOI_NAM' | 'THIEP_MOI_ONLINE';

export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;
}
