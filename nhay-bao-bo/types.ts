export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface TeamState {
  score: number; // Phần trăm tiến độ (0 - 100)
  currentQuestionIndex: number; // Chỉ số câu hỏi hiện tại
  isPenalty: boolean; // Có đang bị đóng băng không
  penaltyTimeLeft: number; // Số giây đóng băng còn lại
  isFinished: boolean; // Đã về đích chưa
}

export type TeamId = 'team1' | 'team2';

export interface GameState {
  status: 'settings' | 'playing' | 'finished';
  questions: Question[];
  team1: TeamState;
  team2: TeamState;
  winner: TeamId | null;
}

export const INITIAL_TEAM_STATE: TeamState = {
  score: 0,
  currentQuestionIndex: 0,
  isPenalty: false,
  penaltyTimeLeft: 0,
  isFinished: false,
};
