
import { User as FirebaseUser } from 'firebase/auth';

export type { FirebaseUser };

export enum UserRole {
  GUEST = 'GUEST',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER'
}

export interface QuestionStyles {
  questionFontSize?: string;
  questionColor?: string;
  optionsFontSize?: string;
  optionsColor?: string;
}

export interface Question {
  id: string;
  content: string;
  options: string[];
  correctIndex: number;
  styles?: QuestionStyles;
}

export interface GameConfig {
  hiddenImage: string; // Base64 or URL
  questions: Question[];
}

export interface AppState {
  role: UserRole;
  studentName?: string;
  config: GameConfig;
}
