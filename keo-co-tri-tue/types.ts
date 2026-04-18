export interface Team {
    id: string;
    name: string;
    color: string;
    score: number;
}

export interface MatchSettings {
    team1Name: string;
    team2Name: string;
    questionsPerRound: number;
    timePerQuestion: number; // in seconds
    answerDisplayType: 'letter' | 'number'; // A, B, C, D or 1, 2, 3, 4
}

export interface Question {
    id: string;
    text: string;
    imageUrl?: string;
    audioUrl?: string;
    options: string[];
    correctOptionIndex: number;
}

export type ViewState = 'SETUP' | 'GAME' | 'RESULT' | 'ADMIN';
