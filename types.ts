export interface Question {
  id: string;
  time: number; // in seconds
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
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

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CREATE_EDIT' | 'PLAYER' | 'ADMIN' | 'GEOMETRY_3D' | 'BEE_GAME' | 'BEE_GAME_EDITABLE' | 'VONG_QUAY' | 'LUCKY_WHEEL' | 'KING_GAME' | 'STAR_WHEEL' | 'VIDEO_STORE' | 'INTERACTIVE_VIDEO' | 'AI_COURSE_STORE' | 'AI_COURSE_ADMIN' | 'CANVA_BASICS' | 'NEW_YEAR';

export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;
}