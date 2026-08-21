export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export type Student = {
  id: number;
  name: string;
  initials: string;
  birthday: string;
  gender?: string;
  studentCode?: string;
  team: number;
  role: string;
  score: number;
  weeklyScore: number;
  streak: number;
  attendance: AttendanceStatus;
  gradient: string;
  photo?: string;
  parentCode: string;
  parentAccessEnabled?: boolean;
  parentName: string;
  parentPhone: string;
  strengths: string[];
};

export type Activity = {
  id: number;
  studentId: number;
  title: string;
  detail: string;
  points: number;
  time: string;
  tone: 'positive' | 'negative' | 'neutral';
  createdAt?: string;
  weekId?: string;
};

export type WeekPeriod = {
  id: string;
  number: number;
  startDate: string;
  endDate: string;
  studyDays?: 5 | 6;
  startedAt: string;
};

export type WeekStudentSnapshot = {
  studentId: number;
  name: string;
  team: number;
  points: number;
};

export type WeekArchive = WeekPeriod & {
  closedAt: string;
  activityCount: number;
  studentScores: WeekStudentSnapshot[];
};

export type WeekState = {
  current: WeekPeriod;
  history: WeekArchive[];
};

export type PointReason = {
  id: string;
  label: string;
  points: number;
  icon: string;
  tone: 'green' | 'blue' | 'purple' | 'orange' | 'yellow' | 'red';
};

export type Reward = {
  id: number;
  name: string;
  description: string;
  cost: number;
  icon: string;
  color: string;
  stock: number | null;
};

export type AttendanceRecord = {
  date: string;
  weekId: string;
  records: Record<number, AttendanceStatus>;
  completedAt?: string;
};

export type AttendanceHistory = AttendanceRecord[];
