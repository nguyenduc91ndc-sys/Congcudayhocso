export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: number;
  question: string;
  options: Option[];
  correctAnswerId: string;
  explanation?: string; // Currently not used in display but good for data completeness
}

export enum GameStage {
  INTRO = 'INTRO',
  INTRO_VIDEO = 'INTRO_VIDEO', // New: Playing Intro Video
  PLAYING = 'PLAYING',
  VICTORY_PENDING = 'VICTORY_PENDING', // New: Show congrats before video
  OUTRO_VIDEO = 'OUTRO_VIDEO', // New: Playing Outro Video
  VICTORY = 'VICTORY', // Final Victory screen with buttons
}

export interface GameState {
  stage: GameStage;
  currentQuestionIndex: number;
  beeProgress: number; // 0 to 100
  isQuestionOpen: boolean;
  score: number;
}