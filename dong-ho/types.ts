export type Screen = 'intro' | 'learn' | 'practice' | 'quiz';

export type Level = 'exact' | 'half' | 'quarter' | 'fiveMin' | 'any';

export interface TimeValue {
    hour: number;   // 1–12
    minute: number;  // 0–59
}

export interface Question {
    time: TimeValue;
    options?: string[];
    correctAnswer: string;
}

export interface GameState {
    score: number;
    streak: number;
    stars: number;
    totalQuestions: number;
    correctAnswers: number;
    currentQuestion: number;
}

export interface LevelConfig {
    id: Level;
    name: string;
    description: string;
    icon: string;
    grade: string;
    minuteOptions: number[];
}
