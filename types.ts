export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer' | 'fill-blank' | 'image-choice';
export type VideoQuestionDisplayMode = 'by-time' | 'after-video';

export interface QuestionImageOption {
  text: string;
  imageUrl: string;
}

export interface Question {
  id: string;
  type?: QuestionType;
  time: number; // in seconds
  text: string;
  options: string[]; // Mảng đáp án linh hoạt (2-4 đáp án)
  correctOption: number; // Index của đáp án đúng (0, 1, 2, 3)
  imageOptions?: QuestionImageOption[];
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  points?: number;
}

export type VideoSourceType = 'youtube' | 'local';
export type VideoPlayerLayout = 'full' | 'cinema' | 'sidebar';
export type VideoQuestionStyle = 'glass' | 'card' | 'playful' | 'gradient';
export type VideoSidebarCardStyle = 'soft' | 'glow' | 'neon' | 'solid';

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
  reportEmail?: string;
  reportApiUrl?: string;
  authorAvatarImage?: string;
  authorInfo: string;
  footerLeftText: string;
  footerRightText: string;
  guideText: string;
  startTitle: string;
  startSubtitle: string;
  startButtonText: string;
  startBackgroundImage?: string;
  requireLearnerClass: boolean;
  certificateTitle: string;
  certificateSubtitle: string;
  certificateMessage: string;
  certificateLogoImage?: string;
  certificateSealImage?: string;
  certificateSignatureImage?: string;
  showAuthorPanel: boolean;
  autoAdvance: boolean;
  showScoreReport: boolean;
  showFooterBar: boolean;
  showControlBar: boolean;
  showBackButton: boolean;
  showPlayButton: boolean;
  showNextButton: boolean;
  showRestartButton: boolean;
  showPageIndicator: boolean;
  showProgressBar: boolean;
  showTimeDisplay: boolean;
  showFullscreenButton: boolean;
  radius: number;
  fontFamily: string;
  fontScale: number;
  layout: VideoPlayerLayout;
  questionStyle: VideoQuestionStyle;
  sidebarCardStyle: VideoSidebarCardStyle;
  sidebarCardPulse: boolean;
  sidebarIcon: string;
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
  reportEmail: '',
  reportApiUrl: '',
  authorAvatarImage: '',
  authorInfo: '',
  footerLeftText: '',
  footerRightText: '',
  guideText: '',
  startTitle: 'Vào bài học',
  startSubtitle: 'Nhập họ tên, lớp và chọn nhân vật đại diện của em.',
  startButtonText: 'Bắt đầu học',
  startBackgroundImage: '',
  requireLearnerClass: true,
  certificateTitle: 'Thư khen',
  certificateSubtitle: 'Hoàn thành bài học tương tác',
  certificateMessage: 'Đã hoàn thành bài học với tinh thần học tập tích cực.',
  certificateLogoImage: '',
  certificateSealImage: '',
  certificateSignatureImage: '',
  showAuthorPanel: true,
  autoAdvance: true,
  showScoreReport: true,
  showFooterBar: true,
  showControlBar: true,
  showBackButton: true,
  showPlayButton: true,
  showNextButton: true,
  showRestartButton: true,
  showPageIndicator: true,
  showProgressBar: true,
  showTimeDisplay: true,
  showFullscreenButton: true,
  radius: 24,
  fontFamily: 'Nunito',
  fontScale: 100,
  layout: 'cinema',
  questionStyle: 'glass',
  sidebarCardStyle: 'glow',
  sidebarCardPulse: true,
  sidebarIcon: '👩‍🏫',
};

export function normalizeVideoPlayerTheme(theme?: Partial<VideoPlayerTheme>): VideoPlayerTheme {
  return {
    ...DEFAULT_VIDEO_PLAYER_THEME,
    ...(theme || {}),
  };
}

export function normalizeVideoQuestionDisplayMode(mode?: string): VideoQuestionDisplayMode {
  return mode === 'after-video' ? 'after-video' : 'by-time';
}

// Hàm migration: chuyển đổi Question format cũ sang format mới
export function migrateQuestion(q: any): Question {
  const type = (q.type || 'multiple-choice') as QuestionType;
  const normalizeAnswers = (answers: any) => Array.isArray(answers)
    ? answers.map(answer => String(answer || '')).filter(answer => answer.trim() !== '')
    : [];

  // Nếu đã là format mới (options là mảng), giữ nguyên
  if (Array.isArray(q.options)) {
    const migrated: Question = {
      ...q,
      type,
      options: q.options,
      correctOption: typeof q.correctOption === 'number' ? q.correctOption : 0,
      points: typeof q.points === 'number' ? q.points : 10,
    };

    if (type === 'true-false' && migrated.options.length < 2) {
      migrated.options = ['Dung', 'Sai'];
    }

    if ((type === 'short-answer' || type === 'fill-blank') && !migrated.acceptedAnswers?.length) {
      migrated.acceptedAnswers = normalizeAnswers([q.answer, q.correctAnswer, q.options?.[0]]);
    }

    if (type === 'image-choice') {
      migrated.imageOptions = Array.isArray(q.imageOptions)
        ? q.imageOptions.map((option: any) => ({
          text: String(option?.text || ''),
          imageUrl: String(option?.imageUrl || option?.image || ''),
        }))
        : migrated.options.map(text => ({ text, imageUrl: '' }));
    }

    return migrated;
  }
  // Chuyển đổi từ format cũ (object {A, B, C, D})
  const optionKeys = ['A', 'B', 'C', 'D'] as const;
  return {
    ...q,
    type: 'multiple-choice',
    options: optionKeys.map(key => q.options[key] || '').filter((opt: string) => opt.trim() !== ''),
    correctOption: optionKeys.indexOf(q.correctOption as 'A' | 'B' | 'C' | 'D'),
    points: typeof q.points === 'number' ? q.points : 10,
  };
}

// Hàm migration cho toàn bộ VideoLesson
export function migrateVideoLesson(lesson: any): VideoLesson {
  return {
    ...lesson,
    questionDisplayMode: normalizeVideoQuestionDisplayMode(lesson.questionDisplayMode),
    questions: (lesson.questions || []).map(migrateQuestion)
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
  questionDisplayMode?: VideoQuestionDisplayMode;
  questions: Question[];
  createdAt: number;
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CREATE_EDIT' | 'PLAYER' | 'ADMIN' | 'GEOMETRY_3D' | 'BEE_GAME' | 'BEE_GAME_EDITABLE' | 'BACTERIA_GAME' | 'VONG_QUAY' | 'LUCKY_WHEEL' | 'STAR_WHEEL' | 'VIDEO_STORE' | 'INTERACTIVE_VIDEO' | 'AI_COURSE_STORE' | 'AI_COURSE_ADMIN' | 'SOAN_GIAO_AN_NANG_LUC_SO' | 'QR_GENERATOR' | 'CANVA_BASICS' | 'NEW_YEAR' | 'COMMUNITY_RESOURCES' | 'DEN_HUNG_3D' | 'HEART_SYSTEM_3D' | 'VIETNAM_MAP' | 'CHUC_TET' | 'PUZZLE_GAME' | 'TREASURE_HUNT' | 'VIRTUAL_EXPERIMENT' | 'SENSES_EXPLORER' | 'CLOCK_EXPERIMENT' | 'BANG_CUU_CHUONG' | 'SO_SANH_SO' | 'GAME_TUONG_TAC' | 'YOGURT_EXPERIMENT' | 'KIEM_TRA_DAO_VAN' | 'ABOUT' | 'PRIVACY' | 'TERMS' | 'CONTACT' | 'PHONG_TRANH_3D' | 'SANG_KIEN_KN' | 'EARTH_SEASONS' | 'THAT_LUONG_3D' | 'NHAN_XET_TT27' | 'NHAY_BAO_BO' | 'SOLAR_SYSTEM' | 'KEO_CO_TRI_TUE' | 'GAME_TUY_CHINH' | 'DINH_DOC_LAP_3D' | 'THU_MOI_TUONG_TAC' | 'THU_MOI_DAU_NAM' | 'KY_YEU_CUOI_NAM' | 'THIEP_MOI_ONLINE';

export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;
}
