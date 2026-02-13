export interface Question {
  id: string;
  time: number; // in seconds
  text: string;
  options: string[]; // Mảng đáp án linh hoạt (2-4 đáp án)
  correctOption: number; // Index của đáp án đúng (0, 1, 2, 3)
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
  startTime: number; // in seconds
  allowSeeking: boolean;
  questions: Question[];
  createdAt: number;
}

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CREATE_EDIT' | 'PLAYER' | 'ADMIN' | 'GEOMETRY_3D' | 'BEE_GAME' | 'BEE_GAME_EDITABLE' | 'BACTERIA_GAME' | 'VONG_QUAY' | 'LUCKY_WHEEL' | 'KING_GAME' | 'STAR_WHEEL' | 'VIDEO_STORE' | 'INTERACTIVE_VIDEO' | 'AI_COURSE_STORE' | 'AI_COURSE_ADMIN' | 'CANVA_BASICS' | 'NEW_YEAR' | 'COMMUNITY_RESOURCES' | 'DEN_HUNG_3D' | 'HEART_SYSTEM_3D' | 'VIETNAM_MAP' | 'CHUC_TET' | 'PUZZLE_GAME' | 'TREASURE_HUNT' | 'VIRTUAL_EXPERIMENT';

export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;
}