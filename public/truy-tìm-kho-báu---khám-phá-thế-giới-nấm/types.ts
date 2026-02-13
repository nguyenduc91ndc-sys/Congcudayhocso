
export enum GameState {
  INTRO = 'INTRO',
  VIDEO_IN = 'VIDEO_IN',
  PLAYING = 'PLAYING',
  CONGRATS = 'CONGRATS',
  VIDEO_OUT = 'VIDEO_OUT',
  END = 'END'
}

export interface Question {
  id: number;
  type: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  stageName: string;
  stageIcon: string;
  stageImage: string;
}

export interface AppState {
  currentStage: number;
  score: number;
  gameState: GameState;
  completedStages: number[];
}
