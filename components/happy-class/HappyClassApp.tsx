import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { User as PlatformUser } from '../../types';
import {
  Award,
  Archive,
  BarChart3,
  Bell,
  BookHeart,
  Camera,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Clock3,
  Coins,
  Copy,
  Dices,
  Download,
  ExternalLink,
  Facebook,
  Flag,
  Gift,
  GraduationCap,
  HeartHandshake,
  History,
  Home,
  LayoutGrid,
  LogOut,
  Mail,
  Maximize2,
  Menu,
  MessageCircle,
  Minus,
  Minimize2,
  MoreHorizontal,
  PartyPopper,
  Pencil,
  Play,
  Plus,
  Search,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Trophy,
  Trash2,
  RotateCcw,
  Upload,
  UserRoundCheck,
  UserPlus,
  UsersRound,
  Video,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { initialActivities, initialStudents, pointReasons as initialPointReasons, rewards as initialRewards } from './data';
import type { Activity, AttendanceRecord, AttendanceStatus, PointReason, Reward, Student, WeekArchive, WeekPeriod, WeekState } from './types';
import { downloadStudentTemplate, parseStudentWorkbook } from './excel';
import type { ExcelImportResult } from './excel';
import ClassroomToolsPage from './ClassroomToolsPage';
import ClassroomSeatingPage, {
  getClassroomLayoutStudentIds,
  isClassroomLayout,
  type ClassroomLayout,
} from './ClassroomSeatingPage';
import ClassReportExport from './ClassReportExport';
import WeeklyTrackingSheetExport from './WeeklyTrackingSheetExport';
import parentFeedbackAppsScriptCode from './google-apps-script-parent-feedback.gs?raw';
import happyClassStyles from './styles.css?raw';
import {
  canUseFirebaseOnline,
  fetchPublicPortal,
  fetchPublicStudent,
  getFirebaseTeacher,
  publishParentPortal as publishParentPortalToFirebase,
  setPublicPortalEnabled,
  signInFirebaseTeacher,
  signOutFirebaseTeacher,
  type PublicPortalRecord,
} from './firebase';

const spinWheelSound = '/sounds/Am_thanh_vong_quay_chiec_non_ky_dieu-www_tiengdong_com.mp3';
const victorySound = '/sounds/Am_thanh_chuc_mung_chien_thang-www_tiengdong_com.mp3';
const teacherFacebookUrl = 'https://www.facebook.com/duc.the3?locale=vi_VN';
const tabHoverSelector = '.sidebar-nav button, .mobile-nav button, .filter-tabs button, .mode-switch button';

type HappyClassAppProps = {
  platformUser?: PlatformUser | null;
  onBack?: () => void;
};

type PageId =
  | 'dashboard'
  | 'students'
  | 'seating'
  | 'points'
  | 'teams'
  | 'rewards'
  | 'random'
  | 'tools'
  | 'attendance'
  | 'honors'
  | 'parents'
  | 'management';

type NavItem = { id: PageId; label: string; icon: LucideIcon; badge?: string };
type TeamScoringMode = 'total' | 'average';
type ClassProfile = { name: string; code: string; schoolYear: string; teamCount: number; teamScoringMode?: TeamScoringMode };
type ParentPortalSettings = {
  enabled: boolean;
  publicId: string;
  requireAccessCode?: boolean;
  lastPublishedAt?: string;
  teacherEmail?: string;
  feedbackEndpoint?: string;
};
type WeeklyScoringSettings = {
  startingPoints: number;
  positiveTarget: number;
  honorTarget: number;
  highScoreWarning: number;
};
type ParentFeedbackCategory = 'learning' | 'attendance' | 'support' | 'thanks';
type TeacherAccount = { id?: string; email?: string; name: string; source?: 'platform' | 'local' | 'firebase' };
type TeacherCredential = { name: string; salt: string; pinHash: string };
type PointUndoAction = {
  message: string;
  activityIds: number[];
  students: Array<Pick<Student, 'id' | 'score' | 'weeklyScore' | 'streak'>>;
};
type WeekUndoAction = {
  message: string;
  week: WeekArchive;
  historyIndex: number;
  activities: Activity[];
};
type TeamUndoAction = {
  message: string;
  teamCount: number;
  assignments: Array<Pick<Student, 'id' | 'team'>>;
};
type ClassBackup = {
  version: 1;
  exportedAt?: string;
  teacher: { name: string; photo?: string };
  classProfile: ClassProfile;
  students: Student[];
  activities: Activity[];
  pointReasons?: PointReason[];
  rewards?: Reward[];
  parentPortal?: ParentPortalSettings;
  weekState?: WeekState;
  weeklyScoring?: WeeklyScoringSettings;
  attendanceHistory?: AttendanceRecord[];
  classroomLayout?: ClassroomLayout;
};

const DEFAULT_TEAM_COUNT = 4;
const MAX_TEAM_COUNT = 30;
const normalizeTeamCount = (value: unknown) => {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= MAX_TEAM_COUNT ? count : DEFAULT_TEAM_COUNT;
};
const isValidTeamCount = (value: unknown) => {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= MAX_TEAM_COUNT;
};
const getTeamNumbers = (teamCount: number) => Array.from({ length: normalizeTeamCount(teamCount) }, (_, index) => index + 1);

function secureRandomIndex(limit: number) {
  if (limit <= 1) return 0;
  if (!globalThis.crypto?.getRandomValues) return Math.floor(Math.random() * limit);
  const ceiling = 0x100000000 - (0x100000000 % limit);
  const value = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(value); while (value[0] >= ceiling);
  return value[0] % limit;
}

function shuffleStudentsSecurely(students: Student[]) {
  const shuffled = [...students];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = secureRandomIndex(index + 1);
    [shuffled[index], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[index]];
  }
  return shuffled;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isPhoto = (value: unknown) => value === undefined || (typeof value === 'string' && /^data:image\/(?:jpeg|png|webp);base64,/i.test(value));
const pointReasonTones: PointReason['tone'][] = ['green', 'blue', 'purple', 'orange', 'yellow', 'red'];
const rewardColors = ['mint', 'sun', 'sky', 'coral', 'lavender', 'rose'] as const;

function randomToken(length: number) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

function createParentCode() {
  return `LHHP-${randomToken(4)}-${randomToken(4)}`;
}

function createParentPortalSettings(): ParentPortalSettings {
  return { enabled: true, publicId: `lop-${randomToken(10).toLowerCase()}`, requireAccessCode: true };
}

function createWeeklyScoringSettings(): WeeklyScoringSettings {
  return { startingPoints: 50, positiveTarget: 60, honorTarget: 70, highScoreWarning: 100 };
}

function isWeeklyScoringSettings(value: unknown): value is WeeklyScoringSettings {
  if (!isRecord(value)) return false;
  const starting = value.startingPoints;
  const positive = value.positiveTarget;
  const honor = value.honorTarget;
  const warning = value.highScoreWarning;
  return isNumber(starting) && Number.isInteger(starting) && starting >= 0 && starting <= 999
    && isNumber(positive) && Number.isInteger(positive) && positive >= starting && positive <= 999
    && isNumber(honor) && Number.isInteger(honor) && honor >= positive && honor <= 999
    && isNumber(warning) && Number.isInteger(warning) && warning >= honor && warning <= 999;
}
function toLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(value: string, amount: number) {
  const date = dateFromInput(value);
  date.setDate(date.getDate() + amount);
  return toLocalDateInput(date);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(dateFromInput(value));
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateFromInput(value));
}

function formatMonthKey(value: string) {
  const [year, month] = value.split('-');
  return `Tháng ${Number(month)}/${year}`;
}

function currentMonday() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return toLocalDateInput(date);
}

function createWeekPeriod(number = 1, startDate = currentMonday(), studyDays: 5 | 6 = 5): WeekPeriod {
  return {
    id: `week-${startDate}-${randomToken(5).toLowerCase()}`,
    number,
    startDate,
    endDate: addDays(startDate, studyDays - 1),
    studyDays,
    startedAt: new Date().toISOString(),
  };
}

function createWeekState(): WeekState {
  return { current: createWeekPeriod(), history: [] };
}

function isWeekPeriod(value: unknown): value is WeekPeriod {
  return isRecord(value)
    && isText(value.id) && Boolean(value.id.trim())
    && isNumber(value.number) && Number.isInteger(value.number) && value.number > 0
    && isText(value.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(value.startDate)
    && isText(value.endDate) && /^\d{4}-\d{2}-\d{2}$/.test(value.endDate)
    && (value.studyDays === undefined || value.studyDays === 5 || value.studyDays === 6)
    && isText(value.startedAt);
}

function normalizeWeekState(value: WeekState): WeekState {
  const studyDays = value.current.studyDays === 6 ? 6 : 5;
  return {
    ...value,
    current: {
      ...value.current,
      studyDays,
      endDate: addDays(value.current.startDate, studyDays - 1),
    },
  };
}

function isWeekArchive(value: unknown): value is WeekArchive {
  if (!isWeekPeriod(value)) return false;
  const archive = value as unknown as Record<string, unknown>;
  return isText(archive.closedAt)
    && isNumber(archive.activityCount) && archive.activityCount >= 0
    && Array.isArray(archive.studentScores) && archive.studentScores.length <= 500
    && archive.studentScores.every((score: unknown) => isRecord(score)
      && isNumber(score.studentId) && isText(score.name) && isNumber(score.team) && isNumber(score.points));
}

function isWeekState(value: unknown): value is WeekState {
  if (!isRecord(value) || !isWeekPeriod(value.current) || !Array.isArray(value.history) || value.history.length > 520) return false;
  return value.history.every(isWeekArchive);
}

const isPointReason = (value: unknown): value is PointReason => isRecord(value)
  && isText(value.id) && Boolean(value.id.trim())
  && isText(value.label) && Boolean(value.label.trim())
  && isNumber(value.points) && Number.isInteger(value.points) && value.points !== 0 && Math.abs(value.points) <= 100
  && isText(value.icon) && Boolean(value.icon.trim()) && value.icon.length <= 12
  && isText(value.tone) && pointReasonTones.includes(value.tone as PointReason['tone']);

const isReward = (value: unknown): value is Reward => isRecord(value)
  && isNumber(value.id) && Number.isInteger(value.id)
  && isText(value.name) && Boolean(value.name.trim()) && value.name.length <= 80
  && isText(value.description) && value.description.length <= 160
  && isNumber(value.cost) && Number.isInteger(value.cost) && value.cost >= 1 && value.cost <= 9999
  && isText(value.icon) && Boolean(value.icon.trim()) && value.icon.length <= 12
  && isText(value.color) && rewardColors.includes(value.color as typeof rewardColors[number])
  && (value.stock === null || (isNumber(value.stock) && Number.isInteger(value.stock) && value.stock >= 0 && value.stock <= 999));

function parseClassBackup(content: string): ClassBackup {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error('Tệp không phải là bản sao JSON hợp lệ.');
  }

  // Các bản sao được tạo trước khi có cơ chế điểm khởi đầu theo tuần chưa có
  // `weeklyScore`. Bổ sung giá trị mặc định để giáo viên vẫn khôi phục được
  // dữ liệu cũ thay vì bị từ chối toàn bộ tệp.
  if (isRecord(value) && Array.isArray(value.students)) {
    const startingPoints = isRecord(value.weeklyScoring) && isNumber(value.weeklyScoring.startingPoints)
      ? value.weeklyScoring.startingPoints
      : createWeeklyScoringSettings().startingPoints;
    const teacher = isRecord(value.teacher) && (value.teacher.photo === '' || value.teacher.photo === null)
      ? Object.fromEntries(Object.entries(value.teacher).filter(([key]) => key !== 'photo'))
      : value.teacher;
    value = {
      ...value,
      teacher,
      students: value.students.map((item) => {
        if (!isRecord(item)) return item;
        const normalized = { ...item };
        if (!isNumber(normalized.weeklyScore)) normalized.weeklyScore = startingPoints;
        if (normalized.photo === '' || normalized.photo === null) delete normalized.photo;
        return normalized;
      }),
    };
  }

  if (!isRecord(value) || value.version !== 1 || !isRecord(value.teacher) || !isRecord(value.classProfile)) {
    throw new Error('Tệp không đúng định dạng bản sao của Lớp học Hạnh phúc.');
  }

  const teacher = value.teacher;
  const profile = value.classProfile;
  if (!isText(teacher.name) || !teacher.name.trim() || !isPhoto(teacher.photo)
    || !isText(profile.name) || !profile.name.trim()
    || !isText(profile.code) || !profile.code.trim()
    || !isText(profile.schoolYear) || !profile.schoolYear.trim()
    || (profile.teamCount !== undefined && (!isNumber(profile.teamCount) || !isValidTeamCount(profile.teamCount)))) {
    throw new Error('Thông tin giáo viên hoặc lớp học trong bản sao không hợp lệ.');
  }

  if (!Array.isArray(value.students) || value.students.length > 500
    || !Array.isArray(value.activities) || value.activities.length > 10000) {
    throw new Error('Danh sách học sinh hoặc hoạt động trong bản sao không hợp lệ.');
  }

  const studentsValid = value.students.every((item) => isRecord(item)
    && isNumber(item.id) && isText(item.name) && Boolean(item.name.trim())
    && isText(item.initials) && isText(item.birthday)
    && (item.gender === undefined || isText(item.gender))
    && (item.studentCode === undefined || isText(item.studentCode))
    && isNumber(item.team) && isText(item.role)
    && isNumber(item.score) && isNumber(item.weeklyScore) && isNumber(item.streak)
    && isText(item.attendance) && attendanceValues.includes(item.attendance as AttendanceStatus)
    && isText(item.gradient) && isPhoto(item.photo)
    && isText(item.parentCode) && isText(item.parentName) && isText(item.parentPhone)
    && Array.isArray(item.strengths) && item.strengths.every(isText));
  const studentIds = new Set(value.students.map((item) => isRecord(item) ? item.id : undefined));
  if (!studentsValid || studentIds.size !== value.students.length) {
    throw new Error('Có hồ sơ học sinh bị thiếu dữ liệu hoặc trùng mã trong bản sao.');
  }

  const activitiesValid = value.activities.every((item) => isRecord(item)
    && isNumber(item.id) && isNumber(item.studentId) && studentIds.has(item.studentId)
    && isText(item.title) && isText(item.detail) && isNumber(item.points) && isText(item.time)
    && (item.createdAt === undefined || isText(item.createdAt))
    && (item.weekId === undefined || isText(item.weekId))
    && (item.tone === 'positive' || item.tone === 'negative' || item.tone === 'neutral'));
  if (!activitiesValid) {
    throw new Error('Lịch sử hoạt động trong bản sao không hợp lệ.');
  }

  if (value.pointReasons !== undefined) {
    if (!Array.isArray(value.pointReasons) || value.pointReasons.length > 100 || !value.pointReasons.every(isPointReason)
      || new Set(value.pointReasons.map((item) => item.id)).size !== value.pointReasons.length) {
      throw new Error('Danh mục điểm cộng, điểm trừ trong bản sao không hợp lệ.');
    }
  }

  if (value.rewards !== undefined) {
    if (!Array.isArray(value.rewards) || value.rewards.length > 50 || !value.rewards.every(isReward)
      || new Set(value.rewards.map((item) => item.id)).size !== value.rewards.length) {
      throw new Error('Danh mục phần thưởng trong bản sao không hợp lệ.');
    }
  }

  if (value.parentPortal !== undefined) {
    const portal = value.parentPortal;
    if (!isRecord(portal) || typeof portal.enabled !== 'boolean' || !isText(portal.publicId) || !portal.publicId.trim()
      || (portal.requireAccessCode !== undefined && typeof portal.requireAccessCode !== 'boolean')
      || (portal.lastPublishedAt !== undefined && !isText(portal.lastPublishedAt))
      || (portal.teacherEmail !== undefined && (!isText(portal.teacherEmail) || portal.teacherEmail.length > 160))
      || (portal.feedbackEndpoint !== undefined && (!isText(portal.feedbackEndpoint) || portal.feedbackEndpoint.length > 500))) {
      throw new Error('Cấu hình cổng phụ huynh trong bản sao không hợp lệ.');
    }
  }

  if (value.weekState !== undefined && !isWeekState(value.weekState)) {
    throw new Error('Dữ liệu tuần học trong bản sao không hợp lệ.');
  }

  if (value.weeklyScoring !== undefined && !isWeeklyScoringSettings(value.weeklyScoring)) {
    throw new Error('Cấu hình mốc điểm tuần trong bản sao không hợp lệ.');
  }

  if (value.attendanceHistory !== undefined) {
    if (!Array.isArray(value.attendanceHistory) || value.attendanceHistory.length > 400) {
      throw new Error('Lịch sử điểm danh trong bản sao không hợp lệ.');
    }
    const attendanceValid = value.attendanceHistory.every((item: unknown) => isRecord(item)
      && isText(item.date) && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      && isText(item.weekId)
      && isRecord(item.records)
      && Object.values(item.records).every((status) => attendanceValues.includes(status as AttendanceStatus))
      && (item.completedAt === undefined || isText(item.completedAt)));
    if (!attendanceValid) {
      throw new Error('Lịch sử điểm danh trong bản sao không hợp lệ.');
    }
  }

  if (value.classroomLayout !== undefined) {
    if (!isClassroomLayout(value.classroomLayout)
      || getClassroomLayoutStudentIds(value.classroomLayout).some((studentId) => !studentIds.has(studentId))) {
      throw new Error('Dữ liệu sơ đồ lớp trong bản sao không hợp lệ.');
    }
  }

  return value as ClassBackup;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: Home },
  { id: 'students', label: 'Học sinh', icon: UsersRound },
  { id: 'seating', label: 'Sơ đồ lớp', icon: LayoutGrid, badge: 'Mới' },
  { id: 'points', label: 'Vườn điểm tốt', icon: Sparkles },
  { id: 'teams', label: 'Thi đua tổ', icon: BarChart3 },
  { id: 'rewards', label: 'Đổi thưởng', icon: Store },
  { id: 'random', label: 'Gọi tên vui', icon: Wand2 },
  { id: 'tools', label: 'Công cụ lớp học', icon: Clock3 },
  { id: 'attendance', label: 'Chuyên cần', icon: CalendarCheck2 },
  { id: 'honors', label: 'Vinh danh', icon: Trophy },
  { id: 'parents', label: 'Cổng phụ huynh', icon: HeartHandshake },
];

const pageIds = new Set<PageId>([...navItems.map((item) => item.id), 'management']);

function readPageFromHash(): PageId {
  const candidate = window.location.hash.replace('#', '') as PageId;
  return pageIds.has(candidate) ? candidate : 'dashboard';
}

function isParentPortalEntry(): boolean {
  return new URLSearchParams(window.location.search).has('parent');
}

function readTeacherAccount(): TeacherAccount | null {
  try {
    const stored = localStorage.getItem('ntd_user');
    if (stored) {
      const account: unknown = JSON.parse(stored);
      if (isRecord(account) && isText(account.name) && account.name.trim() && (isText(account.id) || isText(account.email))) {
        return { ...(account as TeacherAccount), source: 'platform' };
      }
    }
    if (sessionStorage.getItem('happy-class-teacher-session') !== 'active') return null;
    const credential = readTeacherCredential();
    return credential ? { id: 'local-teacher', name: credential.name, source: 'local' } : null;
  } catch {
    return null;
  }
}

function readTeacherCredential(): TeacherCredential | null {
  try {
    const stored = localStorage.getItem('happy-class-teacher-credential');
    if (!stored) return null;
    const credential: unknown = JSON.parse(stored);
    return isRecord(credential) && isText(credential.name) && Boolean(credential.name.trim())
      && isText(credential.salt) && Boolean(credential.salt)
      && isText(credential.pinHash) && Boolean(credential.pinHash)
      ? credential as TeacherCredential
      : null;
  } catch {
    return null;
  }
}

async function hashTeacherPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: 'Có mặt',
  late: 'Đi muộn',
  excused: 'Nghỉ có phép',
  absent: 'Nghỉ không phép',
};

const today = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date());

function useVietnamTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function getVietnamGreeting(date: Date) {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  const hour = Number(valueOf('hour'));
  const weekday = valueOf('weekday');
  const time = `${valueOf('hour')}:${valueOf('minute')}`;
  if (hour < 11) return { period: 'buổi sáng', icon: '☀️', pill: `${weekday} đầy năng lượng`, time };
  if (hour < 14) return { period: 'buổi trưa', icon: '🌤️', pill: `${weekday} thật thư thái`, time };
  if (hour < 18) return { period: 'buổi chiều', icon: '🌈', pill: `${weekday} thật hứng khởi`, time };
  return { period: 'buổi tối', icon: '🌙', pill: `${weekday} thật ấm áp`, time };
}

function readStoredStudents() {
  try {
    const stored = localStorage.getItem('happy-class-students');
    return stored ? (JSON.parse(stored) as Student[]) : initialStudents;
  } catch {
    return initialStudents;
  }
}

function readStoredClassroomLayout(): ClassroomLayout | null {
  try {
    const stored = localStorage.getItem('happy-class-seating-layout');
    if (!stored) return null;
    const value: unknown = JSON.parse(stored);
    return isClassroomLayout(value) ? value : null;
  } catch {
    return null;
  }
}

function readStoredWeekState() {
  try {
    const stored = localStorage.getItem('happy-class-week-state');
    if (!stored) return createWeekState();
    const value: unknown = JSON.parse(stored);
    return isWeekState(value) ? normalizeWeekState(value) : createWeekState();
  } catch {
    return createWeekState();
  }
}

function readStoredActivities(currentWeekId: string) {
  try {
    const stored = localStorage.getItem('happy-class-activities');
    const activities = stored ? (JSON.parse(stored) as Activity[]) : initialActivities;
    return activities.map((activity) => ({
      ...activity,
      createdAt: activity.createdAt ?? new Date().toISOString(),
      weekId: activity.weekId ?? currentWeekId,
    }));
  } catch {
    return initialActivities.map((activity) => ({ ...activity, createdAt: new Date().toISOString(), weekId: currentWeekId }));
  }
}

function readStoredPointReasons() {
  try {
    const stored = localStorage.getItem('happy-class-point-reasons');
    if (!stored) return initialPointReasons;
    const reasons: unknown = JSON.parse(stored);
    return Array.isArray(reasons) && reasons.length <= 100 && reasons.every(isPointReason)
      && new Set(reasons.map((reason) => reason.id)).size === reasons.length
      ? reasons
      : initialPointReasons;
  } catch {
    return initialPointReasons;
  }
}

function readStoredRewards() {
  try {
    const stored = localStorage.getItem('happy-class-rewards');
    if (!stored) return initialRewards;
    const rewardItems: unknown = JSON.parse(stored);
    return Array.isArray(rewardItems) && rewardItems.length <= 50 && rewardItems.every(isReward)
      && new Set(rewardItems.map((reward) => reward.id)).size === rewardItems.length
      ? rewardItems
      : initialRewards;
  } catch {
    return initialRewards;
  }
}

function readTeacherName() {
  return localStorage.getItem('happy-class-teacher-name')?.trim() || 'Thầy Đức';
}

function readTeacherPhoto() {
  return localStorage.getItem('happy-class-teacher-photo') || undefined;
}

function readClassProfile(): ClassProfile {
  try {
    const stored = localStorage.getItem('happy-class-profile');
    if (!stored) return { name: 'Lớp Hạnh Phúc', code: '5/4', schoolYear: '2026–2027', teamCount: DEFAULT_TEAM_COUNT, teamScoringMode: 'average' };
    const profile = JSON.parse(stored) as Partial<ClassProfile>;
    return { name: profile.name || 'Lớp Hạnh Phúc', code: profile.code || '5/4', schoolYear: profile.schoolYear || '2026–2027', teamCount: normalizeTeamCount(profile.teamCount), teamScoringMode: profile.teamScoringMode === 'total' ? 'total' : 'average' };
  } catch {
    return { name: 'Lớp Hạnh Phúc', code: '5/4', schoolYear: '2026–2027', teamCount: DEFAULT_TEAM_COUNT, teamScoringMode: 'average' };
  }
}

function readParentPortalSettings(): ParentPortalSettings {
  try {
    const stored = localStorage.getItem('happy-class-parent-portal');
    if (!stored) return createParentPortalSettings();
    const portal: unknown = JSON.parse(stored);
    return isRecord(portal) && typeof portal.enabled === 'boolean' && isText(portal.publicId) && portal.publicId.trim()
      && (portal.requireAccessCode === undefined || typeof portal.requireAccessCode === 'boolean')
      && (portal.lastPublishedAt === undefined || isText(portal.lastPublishedAt))
      && (portal.teacherEmail === undefined || isText(portal.teacherEmail))
      && (portal.feedbackEndpoint === undefined || isText(portal.feedbackEndpoint))
      ? portal as ParentPortalSettings
      : createParentPortalSettings();
  } catch {
    return createParentPortalSettings();
  }
}

function readWeeklyScoringSettings(): WeeklyScoringSettings {
  try {
    const stored = localStorage.getItem('happy-class-weekly-scoring');
    if (!stored) return createWeeklyScoringSettings();
    const value: unknown = JSON.parse(stored);
    return isWeeklyScoringSettings(value) ? value : createWeeklyScoringSettings();
  } catch {
    return createWeeklyScoringSettings();
  }
}

const attendanceValues: AttendanceStatus[] = ['present', 'late', 'excused', 'absent'];

function isAttendanceRecord(value: unknown): value is AttendanceRecord {
  if (!isRecord(value)) return false;
  return isText(value.date) && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && isText(value.weekId)
    && isRecord(value.records)
    && Object.values(value.records).every((s) => attendanceValues.includes(s as AttendanceStatus))
    && (value.completedAt === undefined || isText(value.completedAt));
}

function readStoredAttendanceHistory(): AttendanceRecord[] {
  try {
    const stored = localStorage.getItem('happy-class-attendance-history');
    if (!stored) return [];
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value) || value.length > 400) return [];
    const valid = value.filter(isAttendanceRecord);
    return valid.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function getTeacherInitials(name: string) {
  const words = name.replace(/^(cô|thầy)\s+/i, '').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[words.length - 2][0]}${words[words.length - 1][0]}` : words[0]?.slice(0, 2) || 'GV').toUpperCase();
}

function getTeacherGreeting(name: string) {
  const role = name.match(/^(cô|thầy)\b/i)?.[0] || 'Cô';
  const words = name.replace(/^(cô|thầy)\s+/i, '').trim().split(/\s+/).filter(Boolean);
  return `${role.toLocaleLowerCase('vi-VN')} ${words[words.length - 1] || 'giáo viên'}`;
}

function prepareStudentPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Vui lòng chọn đúng tệp ảnh.'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 12 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Ảnh không hợp lệ.'));
      image.onload = () => {
        const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = (image.naturalWidth - sourceSize) / 2;
        const sourceY = (image.naturalHeight - sourceSize) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = 420;
        canvas.height = 420;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh.'));
          return;
        }
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function HappyClassApp({ platformUser, onBack }: HappyClassAppProps) {
  const [parentPortalEntry] = useState(isParentPortalEntry);
  const [teacherAccount, setTeacherAccount] = useState<TeacherAccount | null>(() => parentPortalEntry
    ? null
    : platformUser
      ? { ...platformUser, source: 'platform' }
      : readTeacherAccount());
  const isTeacher = Boolean(teacherAccount);
  const [page, setPage] = useState<PageId>(() => {
    if (isParentPortalEntry()) return 'parents';
    const requestedPage = readPageFromHash();
    return requestedPage === 'management' && !readTeacherAccount() ? 'students' : requestedPage;
  });
  const [students, setStudents] = useState<Student[]>(readStoredStudents);
  const [classroomLayout, setClassroomLayout] = useState<ClassroomLayout | null>(readStoredClassroomLayout);
  const [weekState, setWeekState] = useState<WeekState>(readStoredWeekState);
  const [activities, setActivities] = useState<Activity[]>(() => readStoredActivities(weekState.current.id));
  const [pointReasons, setPointReasons] = useState<PointReason[]>(readStoredPointReasons);
  const [rewardCatalog, setRewardCatalog] = useState<Reward[]>(readStoredRewards);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [pointUndoAction, setPointUndoAction] = useState<PointUndoAction | null>(null);
  const [weekUndoAction, setWeekUndoAction] = useState<WeekUndoAction | null>(null);
  const [teamUndoAction, setTeamUndoAction] = useState<TeamUndoAction | null>(null);
  const [teacherName, setTeacherName] = useState(readTeacherName);
  const [teacherPhoto, setTeacherPhoto] = useState<string | undefined>(readTeacherPhoto);
  const [classProfile, setClassProfile] = useState<ClassProfile>(readClassProfile);
  const [parentPortal, setParentPortal] = useState<ParentPortalSettings>(readParentPortalSettings);
  const [weeklyScoring, setWeeklyScoring] = useState<WeeklyScoringSettings>(readWeeklyScoringSettings);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(readStoredAttendanceHistory);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [classSettingsOpen, setClassSettingsOpen] = useState(false);
  const [teacherAccessOpen, setTeacherAccessOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [cloudPublishing, setCloudPublishing] = useState(false);
  const tabHoverAudioContextRef = useRef<AudioContext | null>(null);
  const lastTabHoverSoundAtRef = useRef(0);

  const getTabHoverAudioContext = () => {
    if (tabHoverAudioContextRef.current) return tabHoverAudioContextRef.current;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    tabHoverAudioContextRef.current = new AudioContextClass();
    return tabHoverAudioContextRef.current;
  };

  const unlockTabHoverAudio = () => {
    const context = getTabHoverAudioContext();
    if (context?.state === 'suspended') void context.resume().catch(() => undefined);
  };

  const playTabHoverSound = () => {
    const now = performance.now();
    if (now - lastTabHoverSoundAtRef.current < 45) return;
    lastTabHoverSoundAtRef.current = now;
    const context = getTabHoverAudioContext();
    if (!context) return;

    const play = () => {
      if (context.state !== 'running') return;
      const startAt = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(720, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(940, startAt + .055);
      gain.gain.setValueAtTime(.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(.075, startAt + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, startAt + .075);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + .08);
    };

    if (context.state === 'suspended') void context.resume().then(play).catch(() => undefined);
    else play();
  };

  const handleTabPointerOver = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>(tabHoverSelector) : null;
    if (!target || target.disabled) return;
    const previousTarget = event.relatedTarget;
    if (previousTarget instanceof Node && target.contains(previousTarget)) return;
    playTabHoverSound();
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.dataset.happyClassStyles = 'true';
    style.textContent = `${happyClassStyles}\nhtml, body { overflow-y: auto !important; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => () => {
    const context = tabHoverAudioContextRef.current;
    tabHoverAudioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!parentPortalEntry && platformUser) setTeacherAccount({ ...platformUser, source: 'platform' });
  }, [parentPortalEntry, platformUser]);

  useEffect(() => {
    localStorage.setItem('happy-class-students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    if (classroomLayout) localStorage.setItem('happy-class-seating-layout', JSON.stringify(classroomLayout));
    else localStorage.removeItem('happy-class-seating-layout');
  }, [classroomLayout]);

  useEffect(() => {
    localStorage.setItem('happy-class-activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('happy-class-week-state', JSON.stringify(weekState));
  }, [weekState]);

  useEffect(() => {
    localStorage.setItem('happy-class-point-reasons', JSON.stringify(pointReasons));
  }, [pointReasons]);

  useEffect(() => {
    localStorage.setItem('happy-class-rewards', JSON.stringify(rewardCatalog));
  }, [rewardCatalog]);

  useEffect(() => {
    localStorage.setItem('happy-class-parent-portal', JSON.stringify(parentPortal));
  }, [parentPortal]);

  useEffect(() => {
    localStorage.setItem('happy-class-weekly-scoring', JSON.stringify(weeklyScoring));
  }, [weeklyScoring]);

  useEffect(() => {
    localStorage.setItem('happy-class-attendance-history', JSON.stringify(attendanceHistory));
  }, [attendanceHistory]);

  // Sync student.attendance from today's attendance record on mount
  useEffect(() => {
    const todayKey = toLocalDateInput(new Date());
    const todayRecord = attendanceHistory.find((r) => r.date === todayKey);
    if (!todayRecord) return;
    setStudents((current) => current.map((student) => {
      const recorded = todayRecord.records[student.id];
      return recorded && recorded !== student.attendance ? { ...student, attendance: recorded } : student;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!weekUndoAction) return;
    const timer = window.setTimeout(() => setWeekUndoAction(null), 8000);
    return () => window.clearTimeout(timer);
  }, [weekUndoAction]);

  useEffect(() => {
    if (page !== 'points') setPointUndoAction(null);
  }, [page]);

  useEffect(() => {
    if (page !== 'teams') setTeamUndoAction(null);
  }, [page]);

  useEffect(() => {
    const handleHashChange = () => {
      const requestedPage = readPageFromHash();
      if (parentPortalEntry) {
        setPage('parents');
        if (requestedPage !== 'parents') window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#parents`);
        return;
      }
      if (requestedPage === 'management' && !isTeacher) {
        setPage('students');
        window.history.replaceState(null, '', '#students');
        setToast('Vui lòng đăng nhập tài khoản giáo viên để quản lý lớp.');
        return;
      }
      setPage(requestedPage);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isTeacher, parentPortalEntry]);

  useEffect(() => {
    if (parentPortalEntry) return;
    const syncTeacherAccount = (event: StorageEvent) => {
      if (event.key === 'ntd_user' || event.key === null) setTeacherAccount(readTeacherAccount());
    };
    window.addEventListener('storage', syncTeacherAccount);
    return () => window.removeEventListener('storage', syncTeacherAccount);
  }, [parentPortalEntry]);

  useEffect(() => {
    if (isTeacher || readPageFromHash() !== 'management') return;
    setPage('students');
    window.history.replaceState(null, '', '#students');
    setSettingsOpen(false);
    setClassSettingsOpen(false);
    setToast('Vui lòng đăng nhập tài khoản giáo viên để quản lý lớp.');
  }, [isTeacher]);

  const navigate = (next: PageId) => {
    if (parentPortalEntry) {
      setPage('parents');
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#parents`);
      return;
    }
    if (next === 'management' && !isTeacher) {
      setTeacherAccessOpen(true);
      setToast('Vui lòng đăng nhập tài khoản giáo viên để quản lý lớp.');
      setSidebarOpen(false);
      return;
    }
    setPage(next);
    window.history.replaceState(null, '', `#${next}`);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finishTeacherLogin = (account: TeacherAccount) => {
    setTeacherAccount(account);
    setTeacherAccessOpen(false);
    setToast(`Đã đăng nhập tài khoản giáo viên ${account.name}`);
  };

  const loginFirebaseTeacher = async () => {
    try {
      const user = await signInFirebaseTeacher();
      const account: TeacherAccount = {
        id: user.uid,
        email: user.email || undefined,
        name: user.displayName || teacherName,
        source: 'firebase',
      };
      finishTeacherLogin(account);
      return account;
    } catch (error) {
      if (error instanceof Error && error.message === 'FIREBASE_REQUIRES_WEB') {
        throw new Error('Đăng nhập Google chỉ hoạt động trên bản web. Bản mở trực tiếp vẫn có thể dùng mã PIN và lưu dữ liệu trên máy.');
      }
      throw new Error('Chưa thể đăng nhập Google. Hãy kiểm tra Internet, cho phép cửa sổ bật lên rồi thử lại.');
    }
  };

  const logoutTeacher = async () => {
    if (teacherAccount?.source === 'platform' && onBack) {
      onBack();
      return;
    }
    if (teacherAccount?.source === 'firebase') await signOutFirebaseTeacher().catch(() => undefined);
    localStorage.removeItem('ntd_user');
    sessionStorage.removeItem('happy-class-teacher-session');
    setTeacherAccount(null);
    setSettingsOpen(false);
    setClassSettingsOpen(false);
    setToast('Đã đăng xuất tài khoản giáo viên');
  };

  const saveTeacherProfile = (name: string, photo?: string) => {
    const nextName = name.trim();
    if (!nextName) return;
    setTeacherName(nextName);
    setTeacherPhoto(photo);
    localStorage.setItem('happy-class-teacher-name', nextName);
    if (photo) localStorage.setItem('happy-class-teacher-photo', photo);
    else localStorage.removeItem('happy-class-teacher-photo');
    setSettingsOpen(false);
    setToast('Đã cập nhật hồ sơ giáo viên');
  };

  const saveClassProfile = (profile: ClassProfile) => {
    const nextProfile = { ...profile, teamCount: normalizeTeamCount(profile.teamCount) };
    const affectedStudents = students.filter((student) => student.team > nextProfile.teamCount);
    if (affectedStudents.length && !window.confirm(`Có ${affectedStudents.length} học sinh đang thuộc tổ lớn hơn ${nextProfile.teamCount}. Khi tiếp tục, các em này sẽ được chuyển về Tổ ${nextProfile.teamCount}.`)) return;
    if (affectedStudents.length) setStudents((current) => current.map((student) => student.team > nextProfile.teamCount ? { ...student, team: nextProfile.teamCount } : student));
    setClassProfile(nextProfile);
    localStorage.setItem('happy-class-profile', JSON.stringify(nextProfile));
    setClassSettingsOpen(false);
    setToast(affectedStudents.length ? `Đã cập nhật lớp và chuyển ${affectedStudents.length} học sinh về Tổ ${nextProfile.teamCount}` : `Đã cập nhật lớp với ${nextProfile.teamCount} tổ`);
  };

  const toggleTeamScoringMode = () => {
    const nextMode: TeamScoringMode = classProfile.teamScoringMode === 'total' ? 'average' : 'total';
    const nextProfile: ClassProfile = { ...classProfile, teamScoringMode: nextMode };
    setClassProfile(nextProfile);
    localStorage.setItem('happy-class-profile', JSON.stringify(nextProfile));
    setToast(nextMode === 'average' ? 'Đã chuyển sang tính Điểm trung bình / HS' : 'Đã chuyển sang tính Tổng điểm dồn của tổ');
  };

  const applyRandomTeams = (assignments: Array<Pick<Student, 'id' | 'team'>>, nextTeamCount: number) => {
    if (!assignments.length) return;
    const normalizedTeamCount = normalizeTeamCount(nextTeamCount);
    const previousAssignments = students.map(({ id, team }) => ({ id, team }));
    const assignmentMap = new Map(assignments.map((student) => [student.id, Math.min(Math.max(1, student.team), normalizedTeamCount)]));
    setStudents((current) => current.map((student) => ({ ...student, team: assignmentMap.get(student.id) ?? Math.min(student.team, normalizedTeamCount) })));
    const nextProfile = { ...classProfile, teamCount: normalizedTeamCount };
    setClassProfile(nextProfile);
    localStorage.setItem('happy-class-profile', JSON.stringify(nextProfile));
    setTeamUndoAction({
      message: `Đã áp dụng cách chia ngẫu nhiên thành ${normalizedTeamCount} tổ`,
      teamCount: classProfile.teamCount,
      assignments: previousAssignments,
    });
    setToast(`Đã áp dụng chia tổ ngẫu nhiên: ${normalizedTeamCount} tổ`);
  };

  const undoRandomTeams = () => {
    if (!teamUndoAction) return;
    const action = teamUndoAction;
    const assignmentMap = new Map(action.assignments.map((student) => [student.id, student.team]));
    setStudents((current) => current.map((student) => ({ ...student, team: assignmentMap.get(student.id) ?? student.team })));
    const previousProfile = { ...classProfile, teamCount: action.teamCount };
    setClassProfile(previousProfile);
    localStorage.setItem('happy-class-profile', JSON.stringify(previousProfile));
    setTeamUndoAction(null);
    setToast('Đã khôi phục cách chia tổ trước đó');
  };

  const saveStudentProfile = (student: Student) => {
    const exists = students.some((item) => item.id === student.id);
    setStudents((current) => exists ? current.map((item) => item.id === student.id ? student : item) : [...current, student]);
    setToast(exists ? 'Đã cập nhật hồ sơ học sinh' : 'Đã thêm học sinh mới');
  };

  const importStudentList = (incoming: Student[], mode: 'append' | 'replace') => {
    if (!isTeacher) {
      setToast('Chỉ tài khoản giáo viên mới được nhập danh sách học sinh.');
      return { imported: 0, skipped: incoming.length };
    }
    const keyOf = (student: Student) => `${student.name.trim().toLocaleLowerCase('vi-VN')}|${student.birthday.trim()}`;
    const existingKeys = new Set(students.map(keyOf));
    const uniqueKeys = new Set<string>();
    let candidates = incoming.filter((student) => {
      const key = keyOf(student);
      if (uniqueKeys.has(key) || (mode === 'append' && existingKeys.has(key))) return false;
      uniqueKeys.add(key);
      return true;
    });
    const available = mode === 'replace' ? 500 : Math.max(0, 500 - students.length);
    candidates = candidates.slice(0, available);
    const startId = Math.max(0, ...students.map((student) => student.id)) + 1;
    const normalized = candidates.map((student, index) => ({ ...student, id: startId + index, team: Math.min(Math.max(1, student.team), classProfile.teamCount), weeklyScore: weeklyScoring.startingPoints }));
    if (mode === 'replace') {
      setStudents(normalized);
      setActivities([]);
      setWeekState((current) => ({ ...current, history: [] }));
    } else {
      setStudents((current) => [...current, ...normalized]);
    }
    const skipped = incoming.length - normalized.length;
    setToast(`Đã nhập ${normalized.length} học sinh${skipped ? `, bỏ qua ${skipped} dòng trùng hoặc vượt giới hạn` : ''}`);
    return { imported: normalized.length, skipped };
  };

  const deleteStudent = (studentId: number) => {
    setStudents((current) => current.filter((student) => student.id !== studentId));
    setActivities((current) => current.filter((activity) => activity.studentId !== studentId));
    setToast('Đã xóa học sinh khỏi lớp');
  };

  const clearStudentList = () => {
    setStudents([]);
    setActivities([]);
    setWeekState((current) => ({ ...current, history: [] }));
    setAttendanceHistory([]);
    setClassroomLayout(null);
    setProfileId(null);
    setToast('Đã xóa danh sách hiện tại. Bây giờ có thể nhập danh sách lớp thật từ Excel.');
  };

  const restoreSampleData = () => {
    const sampleWeekState = createWeekState();
    setStudents(initialStudents.map((student) => ({
      ...student,
      team: Math.min(Math.max(1, student.team), classProfile.teamCount),
    })));
    setWeekState(sampleWeekState);
    setActivities(initialActivities.map((activity) => ({ ...activity, createdAt: new Date().toISOString(), weekId: sampleWeekState.current.id })));
    setPointReasons(initialPointReasons);
    setRewardCatalog(initialRewards);
    setWeeklyScoring(createWeeklyScoringSettings());
    setAttendanceHistory([]);
    setClassroomLayout(null);
    setToast('Đã khôi phục dữ liệu mẫu');
  };

  const savePointReasons = (reasons: PointReason[]) => {
    if (!isTeacher) {
      setToast('Chỉ tài khoản giáo viên mới được cấu hình nội dung điểm.');
      return;
    }
    setPointReasons(reasons);
    setToast('Đã lưu danh mục điểm cộng, điểm trừ');
  };

  const saveRewards = (rewardItems: Reward[]) => {
    if (!isTeacher) {
      setToast('Chỉ tài khoản giáo viên mới được cấu hình phần thưởng.');
      return;
    }
    setRewardCatalog(rewardItems);
    setToast('Đã lưu danh mục phần thưởng');
  };

  const importBackup = async (file: File) => {
    try {
      setToast(`Đang kiểm tra bản sao ${file.name}...`);
      if (file.size > 25 * 1024 * 1024) throw new Error('Bản sao quá lớn. Vui lòng chọn tệp dưới 25 MB.');
      const backup = parseClassBackup(await file.text());
      if (!window.confirm(`Nhập bản sao của lớp ${backup.classProfile.code}? Dữ liệu hiện tại sẽ được thay thế.`)) {
        setToast('Đã hủy nhập bản sao. Dữ liệu hiện tại được giữ nguyên.');
        return;
      }
      const normalizedProfile = {
        name: backup.classProfile.name.trim(),
        code: backup.classProfile.code.trim(),
        schoolYear: backup.classProfile.schoolYear.trim(),
        teamCount: normalizeTeamCount(backup.classProfile.teamCount),
      };
      const restoredWeekState = normalizeWeekState(backup.weekState ?? createWeekState());

      setStudents(backup.students.map((student) => ({ ...student, team: Math.min(Math.max(1, student.team), normalizedProfile.teamCount) })));
      setWeekState(restoredWeekState);
      setActivities(backup.activities.map((activity) => ({
        ...activity,
        createdAt: activity.createdAt ?? new Date().toISOString(),
        weekId: activity.weekId ?? restoredWeekState.current.id,
      })));
      setPointReasons(backup.pointReasons ?? initialPointReasons);
      setRewardCatalog(backup.rewards ?? initialRewards);
      setParentPortal(backup.parentPortal ?? createParentPortalSettings());
      setWeeklyScoring(backup.weeklyScoring ?? createWeeklyScoringSettings());
      setAttendanceHistory(backup.attendanceHistory ?? []);
      setClassroomLayout(backup.classroomLayout ?? null);
      setTeacherName(backup.teacher.name.trim());
      setTeacherPhoto(backup.teacher.photo);
      setClassProfile(normalizedProfile);
      setProfileId(null);
      setSettingsOpen(false);
      setClassSettingsOpen(false);
      localStorage.setItem('happy-class-teacher-name', backup.teacher.name.trim());
      if (backup.teacher.photo) localStorage.setItem('happy-class-teacher-photo', backup.teacher.photo);
      else localStorage.removeItem('happy-class-teacher-photo');
      localStorage.setItem('happy-class-profile', JSON.stringify(normalizedProfile));
      setToast(`Đã khôi phục bản sao với ${backup.students.length} học sinh`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể nhập bản sao dữ liệu.';
      setToast(message);
      window.alert(`Không thể nhập “${file.name}”.\n\n${message}`);
    }
  };

  const addPoints = (studentIds: number[], points: number, reason: string) => {
    if (!studentIds.length) return;
    setToast('');
    setWeekUndoAction(null);
    const studentSnapshots = students
      .filter((student) => studentIds.includes(student.id))
      .map(({ id, score, weeklyScore, streak }) => ({ id, score, weeklyScore, streak }));
    if (!studentSnapshots.length) return;
    setStudents((current) =>
      current.map((student) =>
        studentIds.includes(student.id)
          ? {
              ...student,
              score: Math.max(0, student.score + points),
              weeklyScore: Math.max(0, student.weeklyScore + points),
              streak: points > 0 ? student.streak + 1 : student.streak,
            }
          : student,
      ),
    );
    const activityIdBase = Date.now();
    const newEntries = studentSnapshots.map((student, index) => ({
      id: activityIdBase + index,
      studentId: student.id,
      title: reason,
      detail: 'Ghi nhận nhanh từ giáo viên',
      points,
      time: 'Vừa xong',
      tone: points >= 0 ? ('positive' as const) : ('negative' as const),
      createdAt: new Date().toISOString(),
      weekId: weekState.current.id,
    }));
    setActivities((current) => [...newEntries, ...current].slice(0, 10000));
    setPointUndoAction({
      message: `${points > 0 ? 'Đã cộng' : 'Đã trừ'} ${Math.abs(points)} điểm cho ${studentSnapshots.length} học sinh`,
      activityIds: newEntries.map((entry) => entry.id),
      students: studentSnapshots,
    });
    setToast(`${points > 0 ? 'Đã cộng' : 'Đã trừ'} ${Math.abs(points)} điểm cho ${studentSnapshots.length} học sinh`);
  };

  const undoLastPointAction = () => {
    if (!pointUndoAction) return;
    const snapshots = new Map(pointUndoAction.students.map((student) => [student.id, student]));
    const activityIds = new Set(pointUndoAction.activityIds);
    setStudents((current) => current.map((student) => {
      const snapshot = snapshots.get(student.id);
      return snapshot ? { ...student, score: snapshot.score, weeklyScore: snapshot.weeklyScore, streak: snapshot.streak } : student;
    }));
    setActivities((current) => current.filter((activity) => !activityIds.has(activity.id)));
    setPointUndoAction(null);
    setToast('Đã hoàn tác lượt cộng/trừ điểm vừa rồi');
  };

  const updateAttendance = (studentId: number, status: AttendanceStatus, date?: string) => {
    const targetDate = date ?? toLocalDateInput(new Date());
    const isToday = targetDate === toLocalDateInput(new Date());

    if (isToday) {
      setStudents((current) =>
        current.map((student) => (student.id === studentId ? { ...student, attendance: status } : student)),
      );
    }

    setAttendanceHistory((current) => {
      const existing = current.find((r) => r.date === targetDate);
      if (existing) {
        return current.map((r) => r.date === targetDate
          ? { ...r, records: { ...r.records, [studentId]: status } }
          : r,
        );
      }
      const newRecord: AttendanceRecord = {
        date: targetDate,
        weekId: weekState.current.id,
        records: Object.fromEntries(
          students.map((s) => [s.id, s.id === studentId ? status : 'present']),
        ),
      };
      return [newRecord, ...current].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 300);
    });
  };

  const updateAttendanceBulk = (statuses: Record<number, AttendanceStatus>, date: string) => {
    const isToday = date === toLocalDateInput(new Date());
    if (isToday) {
      setStudents((current) =>
        current.map((student) => {
          const recorded = statuses[student.id];
          return recorded ? { ...student, attendance: recorded } : student;
        }),
      );
    }
    setAttendanceHistory((current) => {
      const existing = current.find((r) => r.date === date);
      if (existing) {
        return current.map((r) => r.date === date
          ? { ...r, records: { ...r.records, ...statuses } }
          : r,
        );
      }
      const newRecord: AttendanceRecord = {
        date,
        weekId: weekState.current.id,
        records: { ...Object.fromEntries(students.map((s) => [s.id, 'present' as AttendanceStatus])), ...statuses },
      };
      return [newRecord, ...current].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 300);
    });
  };

  const markAttendanceComplete = (date: string) => {
    setAttendanceHistory((current) =>
      current.map((r) => r.date === date ? { ...r, completedAt: new Date().toISOString() } : r),
    );
  };

  const updateStudentPhoto = async (studentId: number, file: File) => {
    try {
      const photo = await prepareStudentPhoto(file);
      setStudents((current) =>
        current.map((student) => (student.id === studentId ? { ...student, photo } : student)),
      );
      setToast('Đã cập nhật ảnh học sinh');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Không thể cập nhật ảnh');
    }
  };

  const removeStudentPhoto = (studentId: number) => {
    setStudents((current) =>
      current.map((student) => (student.id === studentId ? { ...student, photo: undefined } : student)),
    );
    setToast('Đã xóa ảnh học sinh');
  };

  const redeemNamedReward = (studentId: number, rewardName: string, rewardCost: number) => {
    const student = students.find((item) => item.id === studentId);
    if (!student) return false;
    if (student.score < rewardCost) {
      setToast(`${student.name} chưa đủ điểm để đổi phần thưởng này`);
      return false;
    }
    setStudents((current) =>
      current.map((item) => (item.id === studentId ? { ...item, score: item.score - rewardCost } : item)),
    );
    setActivities((current) => [
      {
        id: Date.now(),
        studentId,
        title: `Đổi thưởng: ${rewardName}`,
        detail: `Đã sử dụng ${rewardCost} điểm`,
        points: -rewardCost,
        time: 'Vừa xong',
        tone: 'neutral',
        createdAt: new Date().toISOString(),
        weekId: weekState.current.id,
      },
      ...current,
    ]);
    setToast(`${student.name} đã đổi “${rewardName}” thành công`);
    return true;
  };

  const redeemReward = (studentId: number, rewardId: number) => {
    const reward = rewardCatalog.find((item) => item.id === rewardId);
    if (!reward) return;
    if (reward.stock === 0) {
      setToast(`Phần thưởng “${reward.name}” đã hết`);
      return;
    }
    const redeemed = redeemNamedReward(studentId, reward.name, reward.cost);
    if (redeemed && reward.stock !== null) {
      setRewardCatalog((current) => current.map((item) => item.id === rewardId
        ? { ...item, stock: Math.max(0, (item.stock ?? 0) - 1) }
        : item));
    }
  };

  const regenerateParentCode = (studentId: number) => {
    let nextCode = createParentCode();
    const existingCodes = new Set(students.filter((student) => student.id !== studentId).map((student) => student.parentCode));
    while (existingCodes.has(nextCode)) nextCode = createParentCode();
    setStudents((current) => current.map((student) => student.id === studentId
      ? { ...student, parentCode: nextCode, parentAccessEnabled: true }
      : student));
    setToast('Đã tạo mã mới. Bấm “Cập nhật chia sẻ” để thu hồi mã cũ trên Firebase.');
  };

  const toggleParentAccess = (studentId: number) => {
    setStudents((current) => current.map((student) => student.id === studentId
      ? { ...student, parentAccessEnabled: student.parentAccessEnabled === false }
      : student));
    setToast('Đã đổi trạng thái mã. Bấm “Cập nhật chia sẻ” để áp dụng cho phụ huynh.');
  };

  const publishParentPortal = async () => {
    if (!canUseFirebaseOnline()) {
      setToast('Cần mở bản web để cập nhật liên kết phụ huynh lên Firebase. Dữ liệu local vẫn được giữ nguyên.');
      return;
    }
    setCloudPublishing(true);
    try {
      if (!getFirebaseTeacher()) {
        setToast('Đang mở Google để kết nối kho dữ liệu phụ huynh lần đầu…');
        await signInFirebaseTeacher();
      }
      const result = await publishParentPortalToFirebase({
        portal: parentPortal,
        classProfile,
        teacherName,
        students,
        activities,
        week: weekState.current,
        scoring: weeklyScoring,
      });
      setParentPortal((current) => ({ ...current, lastPublishedAt: result.publishedAt }));
      setToast(result.changed || result.removed
        ? `Đã cập nhật ${result.changed} hồ sơ, thu hồi ${result.removed} liên kết cũ trên Firebase`
        : `Dữ liệu phụ huynh đã mới nhất; không ghi lại ${result.total} hồ sơ không đổi`);
    } catch {
      setToast('Chưa thể cập nhật Firebase. Hãy kiểm tra quy tắc Firestore và kết nối Internet.');
    } finally {
      setCloudPublishing(false);
    }
  };

  const toggleParentPortal = async () => {
    const enabled = !parentPortal.enabled;
    setParentPortal((current) => ({ ...current, enabled }));
    if (!canUseFirebaseOnline() || !getFirebaseTeacher() || !parentPortal.lastPublishedAt) {
      setToast(enabled ? 'Đã mở cổng trên thiết bị; bấm Cập nhật chia sẻ để đưa lên Firebase.' : 'Đã tạm dừng trên thiết bị; bấm Cập nhật chia sẻ để áp dụng lên Firebase.');
      return;
    }
    try {
      await setPublicPortalEnabled(parentPortal.publicId, enabled);
      setToast(enabled ? 'Đã mở lại cổng phụ huynh trên Firebase' : 'Đã tạm dừng cổng phụ huynh trên Firebase');
    } catch {
      setToast('Đã đổi trên thiết bị nhưng chưa cập nhật được Firebase.');
    }
  };

  const toggleParentAccessMode = () => {
    setParentPortal((current) => ({ ...current, requireAccessCode: current.requireAccessCode === false }));
    setToast('Đã đổi cách mở liên kết. Bấm “Cập nhật chia sẻ” trước khi gửi link mới cho phụ huynh.');
  };

  const saveParentFeedbackConfig = (teacherEmail: string, feedbackEndpoint: string) => {
    setParentPortal((current) => ({
      ...current,
      teacherEmail: teacherEmail.trim(),
      feedbackEndpoint: feedbackEndpoint.trim(),
    }));
    setToast('Đã lưu cấu hình Gmail trên máy. Bấm “Cập nhật chia sẻ” để phụ huynh nhận cấu hình mới.');
  };

  const saveWeeklyScoring = (settings: WeeklyScoringSettings) => {
    if (!isWeeklyScoringSettings(settings)) {
      setToast('Các mốc cần theo thứ tự: Điểm đầu tuần ≤ Tuần tích cực ≤ Vinh danh ≤ Cảnh báo.');
      return;
    }
    const startingDelta = settings.startingPoints - weeklyScoring.startingPoints;
    if (startingDelta !== 0) {
      setStudents((current) => current.map((student) => ({ ...student, weeklyScore: Math.max(0, student.weeklyScore + startingDelta) })));
    }
    setWeeklyScoring(settings);
    setToast('Đã lưu mốc đánh giá điểm tuần');
  };

  const resetCurrentWeekPoints = () => {
    setStudents((current) => current.map((student) => ({ ...student, weeklyScore: weeklyScoring.startingPoints })));
    setActivities((current) => current.filter((activity) => activity.weekId !== weekState.current.id));
    setToast(`Đã đưa cả lớp về ${weeklyScoring.startingPoints} điểm đầu tuần`);
  };

  const updateCurrentWeek = (number: number, startDate: string, studyDays: 5 | 6) => {
    const normalizedNumber = Math.max(1, Math.floor(number));
    setWeekState((current) => ({
      ...current,
      current: {
        ...current.current,
        number: normalizedNumber,
        startDate,
        endDate: addDays(startDate, studyDays - 1),
        studyDays,
      },
    }));
    setToast(`Đã cập nhật thời gian Tuần ${normalizedNumber}`);
  };

  const closeCurrentWeek = () => {
    const current = weekState.current;
    const archive: WeekArchive = {
      ...current,
      closedAt: new Date().toISOString(),
      activityCount: activities.filter((activity) => activity.weekId === current.id).length,
      studentScores: students
        .map((student) => ({ studentId: student.id, name: student.name, team: student.team, points: student.weeklyScore }))
        .sort((a, b) => b.points - a.points),
    };
    const nextStartDate = addDays(current.startDate, 7);
    const studyDays = current.studyDays === 6 ? 6 : 5;
    setWeekState((state) => ({
      current: createWeekPeriod(current.number + 1, nextStartDate, studyDays),
      history: [archive, ...state.history].slice(0, 520),
    }));
    setStudents((currentStudents) => currentStudents.map((student) => ({ ...student, weeklyScore: weeklyScoring.startingPoints })));
    setToast(`Đã chốt Tuần ${current.number} và mở Tuần ${current.number + 1}`);
  };

  const deleteClosedWeek = (weekId: string) => {
    const historyIndex = weekState.history.findIndex((week) => week.id === weekId);
    if (historyIndex < 0) return;
    const week = weekState.history[historyIndex];
    const deletedActivities = activities.filter((activity) => activity.weekId === weekId);
    setWeekState((current) => ({ ...current, history: current.history.filter((item) => item.id !== weekId) }));
    setActivities((current) => current.filter((activity) => activity.weekId !== weekId));
    setToast('');
    setPointUndoAction(null);
    setWeekUndoAction({
      message: `Đã xóa Tuần ${week.number} khỏi lịch sử và báo cáo tháng`,
      week,
      historyIndex,
      activities: deletedActivities,
    });
  };

  const undoDeletedWeek = () => {
    if (!weekUndoAction) return;
    const action = weekUndoAction;
    setWeekState((current) => {
      if (current.history.some((week) => week.id === action.week.id)) return current;
      const history = [...current.history];
      history.splice(Math.min(action.historyIndex, history.length), 0, action.week);
      return { ...current, history: history.slice(0, 520) };
    });
    setActivities((current) => {
      const existingIds = new Set(current.map((activity) => activity.id));
      return [...current, ...action.activities.filter((activity) => !existingIds.has(activity.id))]
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        .slice(0, 10000);
    });
    setWeekUndoAction(null);
    setToast(`Đã khôi phục Tuần ${action.week.number}`);
  };

  const selectedProfile = students.find((student) => student.id === profileId) ?? null;
  const pageTitle = page === 'management' ? 'Quản lý lớp' : navItems.find((item) => item.id === page)?.label ?? 'Tổng quan';

  if (parentPortalEntry) {
    return (
      <div className="app-shell parent-portal-shell page-parents">
        <main className="parent-portal-main">
          <ParentsPage
            students={students}
            activities={activities}
            classCode={classProfile.code}
            week={weekState.current}
            scoring={weeklyScoring}
            isTeacher={false}
            portal={parentPortal}
            publishing={false}
            onPublish={() => undefined}
            onTogglePortal={() => undefined}
            onToggleRequireAccessCode={() => undefined}
            onRegenerateCode={() => undefined}
            onToggleAccess={() => undefined}
            onSaveFeedbackConfig={() => undefined}
            onToast={setToast}
          />
        </main>
        {toast && (
          <div className="toast" role="status">
            <span className="toast-check"><Check size={16} strokeWidth={3} /></span>
            {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`app-shell page-${page}`} onPointerDownCapture={unlockTabHoverAudio} onPointerOver={handleTabPointerOver}>
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}
      <Sidebar page={page} open={sidebarOpen} teacherAccount={teacherAccount} teacherName={teacherName} teacherPhoto={teacherPhoto} classProfile={classProfile} onTeacherLogin={() => setTeacherAccessOpen(true)} onTeacherLogout={logoutTeacher} onHelp={() => { setHelpOpen(true); setSidebarOpen(false); }} onNavigate={navigate} />
      <main className="main-shell">
        <Topbar pageTitle={pageTitle} teacherName={teacherName} teacherPhoto={teacherPhoto} classProfile={classProfile} onOpenMenu={() => setSidebarOpen(true)} onBack={onBack} />

        <div className="page-content">
          {page === 'dashboard' && (
            <Dashboard
              students={students}
              activities={activities}
              teacherName={teacherName}
              classCode={classProfile.code}
              teamCount={classProfile.teamCount}
              teamScoringMode={classProfile.teamScoringMode ?? 'average'}
              week={weekState.current}
              onNavigate={navigate}
              onOpenStudent={setProfileId}
            />
          )}
          {page === 'students' && <StudentsPage students={students} teamCount={classProfile.teamCount} canManageStudents={isTeacher} onOpenStudent={setProfileId} onAddStudent={() => navigate('management')} />}
          {page === 'seating' && <ClassroomSeatingPage students={students} classCode={classProfile.code} className={classProfile.name} schoolYear={classProfile.schoolYear} teacherName={teacherName} canManage={isTeacher} value={classroomLayout} onChange={setClassroomLayout} onToast={setToast} />}
          {page === 'points' && <PointsPage students={students} reasons={pointReasons} canConfigure={isTeacher} lastPointAction={pointUndoAction?.message ?? ''} onSaveReasons={savePointReasons} onAddPoints={addPoints} onUndoPoints={undoLastPointAction} />}
          {page === 'teams' && <TeamsPage students={students} teamCount={classProfile.teamCount} week={weekState.current} teamScoringMode={classProfile.teamScoringMode ?? 'average'} canManage={isTeacher} lastTeamAction={teamUndoAction?.message ?? ''} onToggleScoringMode={toggleTeamScoringMode} onApplyRandomTeams={applyRandomTeams} onUndoRandomTeams={undoRandomTeams} />}
          {page === 'rewards' && <RewardsPage students={students} rewards={rewardCatalog} canConfigure={isTeacher} onRedeem={redeemReward} onSaveRewards={saveRewards} />}
          {page === 'random' && <RandomPage students={students} teamCount={classProfile.teamCount} onApplyTeams={applyRandomTeams} />}
          {page === 'tools' && <ClassroomToolsPage />}
          {page === 'attendance' && (
            <AttendancePage students={students} classCode={classProfile.code} attendanceHistory={attendanceHistory} weekState={weekState} weeklyScoring={weeklyScoring} onUpdate={updateAttendance} onUpdateBulk={updateAttendanceBulk} onComplete={markAttendanceComplete} onToast={setToast} />
          )}
          {page === 'honors' && <HonorsPage students={students} week={weekState.current} scoring={weeklyScoring} />}
          {page === 'parents' && <ParentsPage students={students} activities={activities} classCode={classProfile.code} week={weekState.current} scoring={weeklyScoring} isTeacher={isTeacher} portal={parentPortal} publishing={cloudPublishing} onPublish={publishParentPortal} onTogglePortal={() => void toggleParentPortal()} onToggleRequireAccessCode={toggleParentAccessMode} onRegenerateCode={regenerateParentCode} onToggleAccess={toggleParentAccess} onSaveFeedbackConfig={saveParentFeedbackConfig} onToast={setToast} />}
          {page === 'management' && isTeacher && <ManagementPage students={students} activities={activities} pointReasons={pointReasons} rewards={rewardCatalog} parentPortal={parentPortal} weekState={weekState} weeklyScoring={weeklyScoring} attendanceHistory={attendanceHistory} classroomLayout={classroomLayout} teacherName={teacherName} teacherPhoto={teacherPhoto} classProfile={classProfile} onEditTeacher={() => setSettingsOpen(true)} onEditClass={() => setClassSettingsOpen(true)} onUpdateWeek={updateCurrentWeek} onCloseWeek={closeCurrentWeek} onDeleteClosedWeek={deleteClosedWeek} onSaveWeeklyScoring={saveWeeklyScoring} onResetWeekPoints={resetCurrentWeekPoints} onSaveStudent={saveStudentProfile} onImportStudents={importStudentList} onDeleteStudent={deleteStudent} onClearStudents={clearStudentList} onImport={importBackup} onRestore={restoreSampleData} />}
        </div>
      </main>

      <MobileNav page={page} onNavigate={navigate} />
      {settingsOpen && <TeacherSettings teacherName={teacherName} teacherPhoto={teacherPhoto} classCode={classProfile.code} onSave={saveTeacherProfile} onClose={() => setSettingsOpen(false)} />}
      {classSettingsOpen && <ClassSettings classProfile={classProfile} onSave={saveClassProfile} onClose={() => setClassSettingsOpen(false)} />}
      {teacherAccessOpen && <TeacherAccess teacherName={teacherName} googleAvailable={canUseFirebaseOnline()} onGoogleLogin={loginFirebaseTeacher} onSuccess={finishTeacherLogin} onClose={() => setTeacherAccessOpen(false)} />}
      {helpOpen && <HelpCenter isTeacher={isTeacher} onNavigate={navigate} onTeacherLogin={() => { setHelpOpen(false); setTeacherAccessOpen(true); }} onClose={() => setHelpOpen(false)} />}
      {selectedProfile && (
        <StudentProfile
          student={selectedProfile}
          activities={activities.filter((activity) => activity.studentId === selectedProfile.id)}
          onPhoto={(file) => updateStudentPhoto(selectedProfile.id, file)}
          onRemovePhoto={() => removeStudentPhoto(selectedProfile.id)}
          onClose={() => setProfileId(null)}
        />
      )}
      {toast && !weekUndoAction && (
        <div className="toast" role="status">
          <span className="toast-check"><Check size={16} strokeWidth={3} /></span>
          {toast}
        </div>
      )}
      {weekUndoAction && (
        <div className="toast toast-with-action toast-danger-action" role="status" aria-live="polite">
          <span className="toast-check"><Trash2 size={16} /></span>
          <span className="toast-message">{weekUndoAction.message}</span>
          <button type="button" className="toast-undo-button" onClick={undoDeletedWeek}>
            <RotateCcw size={15} /> Hoàn tác
          </button>
        </div>
      )}
    </div>
  );
}

function Sidebar({ page, open, teacherAccount, teacherName, teacherPhoto, classProfile, onTeacherLogin, onTeacherLogout, onHelp, onNavigate }: { page: PageId; open: boolean; teacherAccount: TeacherAccount | null; teacherName: string; teacherPhoto?: string; classProfile: ClassProfile; onTeacherLogin: () => void; onTeacherLogout: () => void; onHelp: () => void; onNavigate: (page: PageId) => void }) {
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><BookHeart size={24} /></div>
        <div><strong>{classProfile.name}</strong><span>Trợ lý chủ nhiệm</span></div>
      </div>

      <div className="class-switcher">
        <div className="class-icon">{classProfile.code}</div>
        <div><strong>{classProfile.name}</strong><span>Năm học {classProfile.schoolYear}</span></div>
        <ChevronDown size={16} />
      </div>

      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        <span className="nav-eyebrow">QUẢN LÝ LỚP</span>
        {navItems.slice(0, 10).map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}>
              <Icon size={19} />
              <span>{item.label}</span>
              {item.badge && <em>{item.badge}</em>}
            </button>
          );
        })}
        <span className="nav-eyebrow nav-eyebrow-spaced">KẾT NỐI</span>
        {navItems.slice(10).map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}>
              <Icon size={19} /><span>{item.label}</span>
            </button>
          );
        })}
        <button onClick={onHelp} aria-haspopup="dialog"><HelpCircle size={19} /><span>Trợ giúp</span></button>
        <a className="facebook-follow-card" href={teacherFacebookUrl} target="_blank" rel="noopener noreferrer">
          <span><Facebook size={18} fill="currentColor" /></span>
          <span><strong>Facebook Thầy Đức</strong><small>Theo dõi để xem chia sẻ CNTT</small></span>
        </a>
      </nav>

      <div className="sidebar-footer">
        {teacherAccount && (
          <button className={`teacher-management-button ${page === 'management' ? 'active' : ''}`} onClick={() => onNavigate('management')}>
            <span><Settings size={17} /></span><strong>Quản lý lớp</strong><ChevronRight size={17} />
          </button>
        )}
        {teacherAccount ? (
          <div className="teacher-mini teacher-account">
            <Avatar initials={getTeacherInitials(teacherName)} gradient="teacher" photo={teacherPhoto} size="small" />
            <div><strong>{teacherName}</strong><span>Tài khoản giáo viên</span></div>
            <div className="teacher-account-actions">
              <button aria-label="Đăng xuất tài khoản giáo viên" title="Đăng xuất" onClick={onTeacherLogout}><LogOut size={15} /></button>
            </div>
          </div>
        ) : (
          <button className="teacher-login-card" aria-label="Đăng nhập giáo viên" onClick={onTeacherLogin}>
            <span className="teacher-login-icon"><UserRoundCheck size={20} /></span>
            <span className="teacher-login-copy"><strong>Tài khoản giáo viên</strong><small>Đăng nhập để quản lý lớp</small></span>
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}

function HelpCenter({ isTeacher, onNavigate, onTeacherLogin, onClose }: { isTeacher: boolean; onNavigate: (page: PageId) => void; onTeacherLogin: () => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const topics: { icon: string; title: string; description: string; keywords: string; page: PageId; teacherOnly?: boolean }[] = [
    { icon: '👩‍🎓', title: 'Học sinh và nhập Excel', description: 'Thêm, sửa hồ sơ hoặc nhập cả danh sách học sinh từ tệp Excel.', keywords: 'học sinh excel danh sách thêm sửa xóa mã định danh', page: 'management', teacherOnly: true },
    { icon: '🪑', title: 'Tạo và xếp sơ đồ lớp', description: 'Chọn bàn 1–4 chỗ, kéo thả học sinh, khóa ghế hoặc bốc vị trí ngẫu nhiên.', keywords: 'sơ đồ lớp bàn ghế chỗ ngồi kéo thả ngẫu nhiên xuất png pdf', page: 'seating' },
    { icon: '🗓️', title: 'Quản lý tuần học', description: 'Đặt thời gian, chốt điểm tuần, mở tuần mới và xem lại lịch sử.', keywords: 'tuần chốt tuần điểm tuần lịch sử thi đua vinh danh', page: 'management', teacherOnly: true },
    { icon: '✨', title: 'Cộng và trừ điểm', description: 'Chọn học sinh, ghi nhận điểm tốt hoặc nhắc nhở; có thể hoàn tác lượt chấm gần nhất bằng nút Hoàn tác.', keywords: 'điểm cộng trừ nhắc nhở hoàn tác undo cấu hình vườn điểm tốt', page: 'points' },
    { icon: '🎲', title: 'Chia tổ ngẫu nhiên', description: 'Chọn số tổ, xáo trộn cả lớp hoặc học sinh có mặt, xem trước rồi xác nhận phân tổ.', keywords: 'chia tổ ngẫu nhiên xáo trộn chia nhóm phân tổ hoàn tác', page: 'teams', teacherOnly: true },
    { icon: '📅', title: 'Điểm danh', description: 'Đánh dấu có mặt, đi muộn, nghỉ có phép hoặc nghỉ không phép.', keywords: 'điểm danh chuyên cần có mặt vắng nghỉ', page: 'attendance' },
    { icon: '🎡', title: 'Gọi tên ngẫu nhiên', description: 'Quay theo cả lớp hoặc từng tổ; chỉ học sinh đang có mặt được tham gia.', keywords: 'gọi tên vòng quay ngẫu nhiên tổ', page: 'random' },
    { icon: '⏱️', title: 'Đồng hồ và quản lý tiếng ồn', description: 'Đếm ngược, bấm giờ và hiển thị mức ồn trực quan ngay trên thiết bị.', keywords: 'đồng hồ bấm giờ đếm ngược micro tiếng ồn trình chiếu', page: 'tools' },
    { icon: '💞', title: 'Cổng phụ huynh', description: 'Tra cứu hành trình học sinh bằng mã phụ huynh trong hồ sơ.', keywords: 'phụ huynh tra cứu mã hành trình', page: 'parents' },
    { icon: '📘', title: 'Xuất sổ và phiếu theo dõi tuần', description: 'Tạo báo cáo kết quả hoặc phiếu giấy để ban cán sự ghi tạm, giáo viên duyệt sau.', keywords: 'xuất sổ báo cáo in pdf excel đóng sổ kết quả phiếu theo dõi tuần ban cán sự', page: 'management', teacherOnly: true },
    { icon: '🛡️', title: 'Sao lưu và khôi phục', description: 'Xuất bản sao JSON để giữ an toàn dữ liệu hoặc chuyển sang máy khác.', keywords: 'sao lưu json khôi phục xuất nhập dữ liệu', page: 'management', teacherOnly: true },
  ];
  const search = query.trim().toLocaleLowerCase('vi-VN');
  const visibleTopics = topics.filter((topic) => !search || `${topic.title} ${topic.description} ${topic.keywords}`.toLocaleLowerCase('vi-VN').includes(search));
  const openTopic = (topic: (typeof topics)[number]) => {
    if (topic.teacherOnly && !isTeacher) {
      onTeacherLogin();
      return;
    }
    onClose();
    onNavigate(topic.page);
  };

  return (
    <div className="settings-backdrop help-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="help-card" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="help-head">
          <div className="help-head-icon"><HelpCircle size={29} /></div>
          <div><span>HƯỚNG DẪN SỬ DỤNG</span><h2 id="help-title">Trung tâm trợ giúp</h2><p>Tìm nhanh cách sử dụng các chức năng của Lớp học Hạnh phúc.</p></div>
          <button aria-label="Đóng trợ giúp" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="help-body">
          <div className={`help-access-note ${isTeacher ? 'teacher' : 'guest'}`}>
            <ShieldCheck size={20} />
            <div><strong>{isTeacher ? 'Bạn đang dùng quyền giáo viên' : 'Bạn đang xem ở chế độ khách'}</strong><span>{isTeacher ? 'Có thể quản lý học sinh, nhập Excel và sao lưu dữ liệu.' : 'Đăng nhập giáo viên để mở các chức năng quản lý lớp.'}</span></div>
            {!isTeacher && <button onClick={onTeacherLogin}>Đăng nhập giáo viên</button>}
          </div>

          <a className="help-facebook-card" href={teacherFacebookUrl} target="_blank" rel="noopener noreferrer">
            <span><Facebook size={20} fill="currentColor" /></span>
            <span><strong>Theo dõi Facebook Thầy Đức</strong><small>Nhấn theo dõi để xem nhiều chia sẻ hơn về CNTT</small></span>
            <ChevronRight size={18} />
          </a>

          <label className="help-search"><Search size={19} /><input aria-label="Tìm hướng dẫn" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm: nhập Excel, điểm danh, phụ huynh…" />{query && <button aria-label="Xóa nội dung tìm kiếm" onClick={() => setQuery('')}><X size={16} /></button>}</label>

          <div className="help-layout">
            <div className="help-guide">
              <div className="help-section-title"><div><span>BẮT ĐẦU NHANH</span><h3>Chọn nội dung cần hướng dẫn</h3></div><small>{visibleTopics.length} nội dung</small></div>
              <div className="help-topic-grid">
                {visibleTopics.map((topic) => (
                  <button className="help-topic" key={topic.title} onClick={() => openTopic(topic)}>
                    <span className="help-topic-icon">{topic.icon}</span>
                    <span><strong>{topic.title}</strong><small>{topic.description}</small>{topic.teacherOnly && <em>Chỉ giáo viên</em>}</span>
                    <ChevronRight size={18} />
                  </button>
                ))}
                {!visibleTopics.length && <div className="help-empty"><HelpCircle size={28} /><strong>Chưa tìm thấy hướng dẫn phù hợp</strong><span>Thử từ khóa ngắn hơn như “Excel”, “điểm” hoặc “phụ huynh”.</span></div>}
              </div>
            </div>

            <aside className="help-faq">
              <div className="help-section-title"><div><span>CÂU HỎI THƯỜNG GẶP</span><h3>Cần biết trước khi dùng</h3></div></div>
              <details open><summary>Dữ liệu được lưu ở đâu?</summary><p>Danh sách đầy đủ, vòng quay và lịch sử quản lý lưu trong trình duyệt trên máy. Chỉ hồ sơ tối giản đã bấm “Cập nhật chia sẻ” mới được đưa lên Firebase cho phụ huynh; hãy xuất bản sao JSON định kỳ.</p></details>
              <details><summary>Điểm tuần và điểm tích lũy khác nhau thế nào?</summary><p>Điểm tuần dùng cho thi đua và vinh danh trong tuần hiện tại. Khi chốt tuần, điểm tuần về 0 nhưng điểm tích lũy vẫn được giữ nguyên.</p></details>
              <details><summary>Vì sao không thấy nút thêm học sinh?</summary><p>Thêm, sửa, xóa và nhập Excel chỉ xuất hiện sau khi đăng nhập tài khoản giáo viên.</p></details>
              <details><summary>Excel cần có những cột nào?</summary><p>Bắt buộc điền đủ “Họ và tên”, “Ngày sinh”, “Họ tên phụ huynh” và “SĐT phụ huynh”. Các cột giới tính, mã định danh, tổ, vai trò, điểm và mã tra cứu có thể để trống.</p></details>
              <details><summary>Khi gặp lỗi nên làm gì?</summary><p>Không xóa dữ liệu ngay. Hãy chụp lại màn hình, ghi thao tác vừa thực hiện và xuất bản sao JSON nếu vẫn mở được trang quản lý.</p></details>
            </aside>
          </div>
        </div>

        <footer className="help-footer"><span>💡 Mẹo: xuất bản sao sau mỗi lần cập nhật danh sách lớn.</span><button onClick={onClose}><Check size={17} /> Đã hiểu</button></footer>
      </section>
    </div>
  );
}

function Topbar({ pageTitle, teacherName, teacherPhoto, classProfile, onOpenMenu, onBack }: { pageTitle: string; teacherName: string; teacherPhoto?: string; classProfile: ClassProfile; onOpenMenu: () => void; onBack?: () => void }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-menu" onClick={onOpenMenu} aria-label="Mở menu"><Menu size={22} /></button>
        {onBack && (
          <button className="happy-class-home" onClick={onBack} aria-label="Về trang chủ GIAOVIENCN" title="Về trang chủ GIAOVIENCN">
            <Home size={19} strokeWidth={2.7} />
            <span>Trang chủ</span>
          </button>
        )}
        <div><span className="topbar-breadcrumb">{classProfile.name} /</span><strong>{pageTitle}</strong></div>
      </div>
      <div className="topbar-actions">
        <label className="global-search"><Search size={18} /><input placeholder="Tìm học sinh, hoạt động..." /></label>
        <button className="icon-button notification-button" aria-label="Thông báo"><Bell size={20} /><i /></button>
        <div className="teacher-top"><Avatar initials={getTeacherInitials(teacherName)} gradient="teacher" photo={teacherPhoto} size="small" /><div><strong>{teacherName}</strong><span>GVCN lớp {classProfile.code}</span></div></div>
      </div>
    </header>
  );
}

function ManagementPage({ students, activities, pointReasons, rewards, parentPortal, weekState, weeklyScoring, attendanceHistory, classroomLayout, teacherName, teacherPhoto, classProfile, onEditTeacher, onEditClass, onUpdateWeek, onCloseWeek, onDeleteClosedWeek, onSaveWeeklyScoring, onResetWeekPoints, onSaveStudent, onImportStudents, onDeleteStudent, onClearStudents, onImport, onRestore }: { students: Student[]; activities: Activity[]; pointReasons: PointReason[]; rewards: Reward[]; parentPortal: ParentPortalSettings; weekState: WeekState; weeklyScoring: WeeklyScoringSettings; attendanceHistory: AttendanceRecord[]; classroomLayout: ClassroomLayout | null; teacherName: string; teacherPhoto?: string; classProfile: ClassProfile; onEditTeacher: () => void; onEditClass: () => void; onUpdateWeek: (number: number, startDate: string, studyDays: 5 | 6) => void; onCloseWeek: () => void; onDeleteClosedWeek: (weekId: string) => void; onSaveWeeklyScoring: (settings: WeeklyScoringSettings) => void; onResetWeekPoints: () => void; onSaveStudent: (student: Student) => void; onImportStudents: (students: Student[], mode: 'append' | 'replace') => { imported: number; skipped: number }; onDeleteStudent: (studentId: number) => void; onClearStudents: () => void; onImport: (file: File) => Promise<void>; onRestore: () => void }) {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [reportExportOpen, setReportExportOpen] = useState(false);
  const [trackingSheetOpen, setTrackingSheetOpen] = useState(false);
  const [backupImporting, setBackupImporting] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const newStudent = () => setEditingStudent({
    id: Date.now(), name: '', initials: 'HS', birthday: '', team: 1, role: 'Thành viên', score: 0,
    weeklyScore: weeklyScoring.startingPoints, streak: 0, attendance: 'present', gradient: 'mint', parentCode: '',
    parentName: '', parentPhone: '', strengths: [],
  });
  const exportData = () => {
    const content = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), teacher: { name: teacherName, photo: teacherPhoto }, classProfile, students, activities, pointReasons, rewards, parentPortal, weekState, weeklyScoring, attendanceHistory, classroomLayout }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `lop-hanh-phuc-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeading eyebrow="TRUNG TÂM GIÁO VIÊN" title="Quản lý lớp học" description="Chỉnh sửa hồ sơ, dữ liệu học sinh và sao lưu thông tin của lớp tại một nơi." icon="⚙️" />
      <section className="management-summary">
        <article className="management-teacher panel">
          <div className="management-card-icon"><Avatar initials={getTeacherInitials(teacherName)} gradient="teacher" photo={teacherPhoto} size="large" /></div>
          <div><span>GIÁO VIÊN CHỦ NHIỆM</span><h2>{teacherName}</h2><p>Quản lý lớp {classProfile.code} · Năm học {classProfile.schoolYear}</p></div>
          <button className="button button-primary" onClick={onEditTeacher}><Pencil size={17} /> Sửa hồ sơ giáo viên</button>
        </article>
        <article className="management-class panel">
          <div className="management-class-icon">{classProfile.code}</div>
          <div><span>THÔNG TIN LỚP</span><h2>{classProfile.name}</h2><p>Năm học {classProfile.schoolYear}</p></div>
          <button className="management-class-edit" onClick={onEditClass}><Pencil size={16} /> Sửa lớp</button>
        </article>
        <article className="management-data panel">
          <div><strong>{students.length}</strong><span>học sinh</span></div>
          <div><strong>{activities.length}</strong><span>hoạt động</span></div>
          <button className="button button-soft" onClick={exportData}><Download size={17} /> Xuất bản sao JSON</button>
          <button className="button management-import" type="button" disabled={backupImporting} onClick={() => backupInputRef.current?.click()}>
            <Upload size={17} /> {backupImporting ? 'Đang nhập bản sao...' : 'Nhập bản sao JSON'}
          </button>
          <input ref={backupInputRef} className="management-import-input" type="file" accept=".json,application/json" onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            setBackupImporting(true);
            try {
              await onImport(file);
            } finally {
              input.value = '';
              setBackupImporting(false);
            }
          }} />
        </article>
      </section>

      <section className="management-report-launch panel">
        <div className="management-report-art" aria-hidden="true"><span>📘</span><i>PDF</i><b>XL</b></div>
        <div><span>SỔ THEO DÕI LỚP HỌC</span><h2>Xuất kết quả để in và đóng sổ</h2><p>Tạo báo cáo theo tuần, tháng hoặc năm học; có bảng tổng hợp, chi tiết từng học sinh, chuyên cần và phần ký xác nhận.</p><div className="management-report-tags"><small>A4 dọc/ngang</small><small>In hoặc lưu PDF</small><small>Xuất Excel</small><small>Không chứa dữ liệu phụ huynh</small></div></div>
        <button type="button" className="button button-primary" disabled={!students.length} onClick={() => setReportExportOpen(true)}><Download size={18} /> Mở trình xuất sổ</button>
      </section>

      <WeekManagement students={students} teamCount={classProfile.teamCount} activities={activities} weekState={weekState} scoring={weeklyScoring} onUpdate={onUpdateWeek} onClose={onCloseWeek} onDeleteClosedWeek={onDeleteClosedWeek} onSaveScoring={onSaveWeeklyScoring} onResetWeekPoints={onResetWeekPoints} onOpenTrackingSheet={() => setTrackingSheetOpen(true)} />

      <section className="management-students panel">
        <div className="management-header">
          <div><span>DANH SÁCH LỚP</span><h2>Quản lý học sinh</h2><p>Thêm mới hoặc cập nhật thông tin đang sử dụng trong toàn ứng dụng.</p></div>
          <div className="management-header-actions">
            <button className="button management-clear-button" disabled={!students.length} onClick={() => setClearConfirmOpen(true)}><Trash2 size={18} /> Xóa danh sách hiện tại</button>
            <button className="button management-excel-button" onClick={() => setExcelImportOpen(true)}><Upload size={18} /> Nhập từ Excel</button>
            <button className="button button-primary" onClick={newStudent}><UserPlus size={18} /> Thêm học sinh</button>
          </div>
        </div>
        <div className="management-student-list">
          {!students.length && <div className="management-student-empty"><span><UsersRound size={25} /></span><div><strong>Danh sách lớp đang trống</strong><p>Nhấn “Nhập từ Excel” để đưa danh sách lớp thật lên, hoặc thêm từng học sinh.</p></div><button className="button management-excel-button" onClick={() => setExcelImportOpen(true)}><Upload size={17} /> Nhập danh sách thật</button></div>}
          {students.map((student, index) => (
            <div className="management-student-row" key={student.id}>
              <span className="management-number">{String(index + 1).padStart(2, '0')}</span>
              <Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="small" />
              <div className="management-student-name"><strong>{student.name}</strong><span>Tổ {student.team} · {student.role}</span></div>
              <div className="management-student-meta"><span>Điểm</span><strong>{student.score}</strong></div>
              <div className="management-student-meta"><span>Phụ huynh</span><strong>{student.parentName || 'Chưa cập nhật'}</strong></div>
              <button className="management-edit" onClick={() => setEditingStudent(student)}><Pencil size={16} /> Sửa</button>
              <button className="management-delete" aria-label={`Xóa ${student.name}`} onClick={() => { if (window.confirm(`Xóa ${student.name} khỏi lớp? Các hoạt động liên quan cũng sẽ bị xóa.`)) onDeleteStudent(student.id); }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="management-danger panel">
        <div><span>KHÔI PHỤC DỮ LIỆU</span><h3>Đưa danh sách về dữ liệu mẫu ban đầu</h3><p>Thao tác này thay thế danh sách học sinh và lịch sử hoạt động hiện tại.</p></div>
        <button onClick={() => { if (window.confirm('Khôi phục dữ liệu mẫu? Dữ liệu học sinh hiện tại sẽ bị thay thế.')) onRestore(); }}><RotateCcw size={17} /> Khôi phục dữ liệu mẫu</button>
      </section>
      {clearConfirmOpen && (
        <div className="settings-backdrop" role="presentation" onMouseDown={() => setClearConfirmOpen(false)}>
          <section className="class-settings-card management-clear-confirm" role="dialog" aria-modal="true" aria-labelledby="management-clear-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="settings-close" type="button" aria-label="Đóng xác nhận xóa danh sách" onClick={() => setClearConfirmOpen(false)}><X size={21} /></button>
            <div className="management-clear-confirm-icon"><Trash2 size={38} /></div>
            <span className="settings-eyebrow">DỌN DANH SÁCH LỚP</span>
            <h2 id="management-clear-title">Xóa danh sách lớp?</h2>
            <p>Thao tác này sẽ xóa học sinh, hoạt động và lịch sử điểm tuần trên thiết bị. Thông tin giáo viên, tên lớp và cấu hình vẫn được giữ lại.</p>
            <div className="management-clear-summary"><strong>{students.length}</strong><span>học sinh sẽ bị xóa</span></div>
            <div className="settings-actions">
              <button type="button" className="settings-cancel" onClick={() => setClearConfirmOpen(false)}>Giữ lại danh sách</button>
              <button type="button" className="settings-save management-clear-confirm-button" onClick={() => { onClearStudents(); setClearConfirmOpen(false); }}><Trash2 size={18} /> Xóa toàn bộ danh sách</button>
            </div>
          </section>
        </div>
      )}
      {excelImportOpen && <ExcelStudentImport currentStudents={students} onImport={onImportStudents} onClose={() => setExcelImportOpen(false)} />}
      {reportExportOpen && <ClassReportExport students={students} activities={activities} attendanceHistory={attendanceHistory} weekState={weekState} teacherName={teacherName} classInfo={classProfile} onClose={() => setReportExportOpen(false)} />}
      {trackingSheetOpen && <WeeklyTrackingSheetExport students={students} pointReasons={pointReasons} week={weekState.current} teacherName={teacherName} classInfo={classProfile} onClose={() => setTrackingSheetOpen(false)} />}
      {editingStudent && <StudentEditor key={editingStudent.id} student={editingStudent} teamCount={classProfile.teamCount} isNew={!students.some((item) => item.id === editingStudent.id)} onSave={(student) => { onSaveStudent(student); setEditingStudent(null); }} onClose={() => setEditingStudent(null)} />}
    </>
  );
}

function WeekManagement({ students, teamCount, activities, weekState, scoring, onUpdate, onClose, onDeleteClosedWeek, onSaveScoring, onResetWeekPoints, onOpenTrackingSheet }: { students: Student[]; teamCount: number; activities: Activity[]; weekState: WeekState; scoring: WeeklyScoringSettings; onUpdate: (number: number, startDate: string, studyDays: 5 | 6) => void; onClose: () => void; onDeleteClosedWeek: (weekId: string) => void; onSaveScoring: (settings: WeeklyScoringSettings) => void; onResetWeekPoints: () => void; onOpenTrackingSheet: () => void }) {
  const [number, setNumber] = useState(weekState.current.number);
  const [startDate, setStartDate] = useState(weekState.current.startDate);
  const [studyDays, setStudyDays] = useState<5 | 6>(weekState.current.studyDays === 6 ? 6 : 5);
  const [scoringDraft, setScoringDraft] = useState<WeeklyScoringSettings>({ ...scoring });
  const current = weekState.current;
  const currentActivities = activities.filter((activity) => activity.weekId === current.id);
  const weeklyTotal = students.reduce((sum, student) => sum + student.weeklyScore, 0);
  const leaders = [...students].sort((a, b) => b.weeklyScore - a.weeklyScore).slice(0, 3);
  const teams = getTeamStats(students, teamCount);
  const highScoreStudents = students.filter((student) => student.weeklyScore > scoring.highScoreWarning);
  const scoringValid = isWeeklyScoringSettings(scoringDraft);
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? addDays(startDate, studyDays - 1) : current.endDate;
  const monthKeys = useMemo(() => Array.from(new Set([
    current.endDate.slice(0, 7),
    ...weekState.history.map((week) => week.endDate.slice(0, 7)),
  ])).sort().reverse(), [current.endDate, weekState.history]);
  const [selectedMonth, setSelectedMonth] = useState(monthKeys[0] ?? current.endDate.slice(0, 7));
  const monthlySummary = useMemo(() => {
    const closedWeeks = weekState.history.filter((week) => week.endDate.startsWith(selectedMonth));
    const includesCurrent = current.endDate.startsWith(selectedMonth);
    const periods = closedWeeks.map((week) => week.studentScores);
    if (includesCurrent) periods.push(students.map((student) => ({ studentId: student.id, name: student.name, team: student.team, points: student.weeklyScore })));
    const byStudent = new Map<number, { studentId: number; name: string; team: number; points: number; weeks: number }>();
    periods.forEach((scores) => scores.forEach((score) => {
      const saved = byStudent.get(score.studentId);
      if (saved) {
        saved.points += score.points;
        saved.weeks += 1;
        saved.name = score.name;
        saved.team = score.team;
      } else {
        byStudent.set(score.studentId, { ...score, weeks: 1 });
      }
    }));
    const studentResults = Array.from(byStudent.values()).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'vi'));
    return {
      closedWeekCount: closedWeeks.length,
      includesCurrent,
      periodCount: closedWeeks.length + (includesCurrent ? 1 : 0),
      total: studentResults.reduce((sum, student) => sum + student.points, 0),
      studentResults,
    };
  }, [current.endDate, selectedMonth, students, weekState.history]);

  useEffect(() => {
    setNumber(weekState.current.number);
    setStartDate(weekState.current.startDate);
    setStudyDays(weekState.current.studyDays === 6 ? 6 : 5);
  }, [weekState.current.id, weekState.current.number, weekState.current.startDate, weekState.current.studyDays]);

  useEffect(() => setScoringDraft({ ...scoring }), [scoring]);

  useEffect(() => {
    if (!monthKeys.includes(selectedMonth)) setSelectedMonth(monthKeys[0] ?? current.endDate.slice(0, 7));
  }, [current.endDate, monthKeys, selectedMonth]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!startDate || number < 1) return;
    onUpdate(number, startDate, studyDays);
  };

  const close = () => {
    if (window.confirm(`Chốt Tuần ${current.number}? Điểm tuần sẽ về 0, điểm tích lũy được giữ nguyên và kết quả tuần này được lưu vào lịch sử.`)) onClose();
  };

  return (
    <section className="week-management panel">
      <div className="week-management-head">
        <div className="week-management-title"><span><CalendarCheck2 size={18} /> VẬN HÀNH THEO TUẦN</span><h2>Quản lý tuần học</h2><p>Điểm thi đua, vinh danh và thông tin gửi phụ huynh đang dùng dữ liệu của tuần hiện tại.</p></div>
        <div className="week-management-head-actions"><button type="button" className="week-tracking-sheet-button" onClick={onOpenTrackingSheet}><Download size={18} /><span><strong>In phiếu theo dõi tuần</strong><small>Giao ban cán sự ghi tạm</small></span></button><div className="week-live-badge"><i /><span>ĐANG HOẠT ĐỘNG</span><strong>Tuần {current.number}</strong><small>{formatFullDate(current.startDate)} – {formatFullDate(current.endDate)} · {current.studyDays === 6 ? 'Thứ 2–Thứ 7' : 'Thứ 2–Thứ 6'}</small></div></div>
      </div>

      <div className="week-management-body">
        <form className="week-settings" onSubmit={save}>
          <div className="week-section-label"><Settings size={17} /><span>THIẾT LẬP TUẦN HIỆN TẠI</span></div>
          <div className="week-setting-fields">
            <label><span>Số tuần</span><input aria-label="Số tuần" type="number" min="1" max="60" value={number} onChange={(event) => setNumber(Number(event.target.value))} /></label>
            <label><span>Ngày bắt đầu</span><input aria-label="Ngày bắt đầu" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label className="week-schedule-field"><span>Lịch học trong tuần</span><select aria-label="Lịch học trong tuần" value={studyDays} onChange={(event) => setStudyDays(Number(event.target.value) === 6 ? 6 : 5)}><option value="5">Thứ 2 – Thứ 6 (5 ngày)</option><option value="6">Thứ 2 – Thứ 7 (6 ngày)</option></select></label>
            <div className="week-end-preview"><span>Ngày kết thúc</span><strong>{formatFullDate(endDate)}</strong><small>Tự tính theo lịch {studyDays === 6 ? 'Thứ 2–Thứ 7' : 'Thứ 2–Thứ 6'}</small></div>
          </div>
          <button className="button button-soft week-save" type="submit"><Save size={17} /> Lưu thời gian tuần</button>
          <p className="week-setting-note"><ShieldCheck size={16} /> Đổi ngày hoặc số tuần không làm mất điểm đang có.</p>
          <div className="week-scoring-settings">
            <div className="week-scoring-head"><span><Star size={17} /> ĐIỂM NỀN & MỐC ĐÁNH GIÁ / TUẦN</span><small>Mỗi em bắt đầu tuần từ điểm nền rồi được cộng hoặc trừ.</small></div>
            <div className="week-scoring-fields">
              <label><span>Điểm đầu tuần</span><input aria-label="Điểm đầu tuần" type="number" min="0" max="999" value={scoringDraft.startingPoints} onChange={(event) => setScoringDraft((current) => ({ ...current, startingPoints: Number(event.target.value) }))} /><small>Mặc định 50 · áp dụng cho mỗi em</small></label>
              <label><span>Tuần tích cực</span><input aria-label="Mốc tuần tích cực" type="number" min="1" max="999" value={scoringDraft.positiveTarget} onChange={(event) => setScoringDraft((current) => ({ ...current, positiveTarget: Number(event.target.value) }))} /><small>Mặc định 60</small></label>
              <label><span>Vinh danh</span><input aria-label="Mốc vinh danh" type="number" min="1" max="999" value={scoringDraft.honorTarget} onChange={(event) => setScoringDraft((current) => ({ ...current, honorTarget: Number(event.target.value) }))} /><small>Mặc định 70</small></label>
              <label><span>Cảnh báo điểm cao</span><input aria-label="Mốc cảnh báo điểm cao" type="number" min="1" max="999" value={scoringDraft.highScoreWarning} onChange={(event) => setScoringDraft((current) => ({ ...current, highScoreWarning: Number(event.target.value) }))} /><small>Mặc định 100</small></label>
            </div>
            {!scoringValid && <p className="week-scoring-error">Các mốc phải tăng dần: Điểm đầu tuần ≤ Tuần tích cực ≤ Vinh danh ≤ Cảnh báo.</p>}
            <div className="week-scoring-actions"><button type="button" onClick={() => { const defaults = createWeeklyScoringSettings(); setScoringDraft(defaults); onSaveScoring(defaults); }}><RotateCcw size={15} /> Dùng mặc định 50–60–70–100</button><button type="button" disabled={!scoringValid} onClick={() => onSaveScoring(scoringDraft)}><Save size={15} /> Lưu cách tính điểm</button></div>
            <button className="week-reset-current-points" type="button" disabled={!students.length} onClick={() => { if (window.confirm(`Đưa toàn bộ học sinh về ${scoring.startingPoints} điểm đầu tuần? Các lượt cộng/trừ của Tuần ${current.number} sẽ bị xóa; điểm tích lũy và lịch sử tuần đã chốt vẫn được giữ.`)) onResetWeekPoints(); }}><RotateCcw size={16} /><span><strong>Đưa cả lớp về {scoring.startingPoints} điểm đầu tuần</strong><small>Xóa các lượt cộng/trừ của riêng tuần đang chạy</small></span></button>
          </div>
        </form>

        <div className="week-snapshot">
          <div className="week-section-label"><Flag size={17} /><span>KẾT QUẢ TẠM TÍNH</span></div>
          <div className="week-kpis">
            <div><strong>{weeklyTotal > 0 ? '+' : ''}{weeklyTotal}</strong><span>điểm tuần</span></div>
            <div><strong>{currentActivities.length}</strong><span>ghi nhận</span></div>
            <div><strong>Tổ {teams[0]?.team ?? '—'}</strong><span>đang dẫn đầu · {teams[0]?.weekly ?? 0} điểm</span></div>
          </div>
          <div className="week-leaders">
            {leaders.map((student, index) => <div key={student.id}><span className={`week-rank rank-${index + 1}`}>{index + 1}</span><Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="tiny" /><strong>{student.name}</strong><b>{student.weeklyScore > 0 ? '+' : ''}{student.weeklyScore}</b></div>)}
          </div>
          {highScoreStudents.length > 0 && <div className="week-score-warning"><ShieldCheck size={17} /><span><strong>{highScoreStudents.length} học sinh vượt {scoring.highScoreWarning} điểm tuần</strong><small>Đây chỉ là lời nhắc kiểm tra để tránh cộng điểm quá dày; app không khóa điểm.</small></span></div>}
          <button className="week-close-button" onClick={close}><Archive size={18} /><span><strong>Chốt Tuần {current.number} & mở Tuần {current.number + 1}</strong><small>Lưu kết quả, đưa điểm tuần về 0; điểm tích lũy không đổi</small></span><ChevronRight size={19} /></button>
        </div>
      </div>

      <div className="week-history">
        <div className="week-history-head"><div><History size={18} /><span>LỊCH SỬ ĐÃ CHỐT</span></div><small>{weekState.history.length} tuần đã lưu</small></div>
        {weekState.history.length ? (
          <div className="week-history-list">{weekState.history.slice(0, 6).map((week) => {
            const top = week.studentScores[0];
            const total = week.studentScores.reduce((sum, student) => sum + student.points, 0);
            return (
              <details className="week-history-entry" key={week.id}>
                <summary><span className="week-history-icon"><Check size={17} /></span><div><strong>Tuần {week.number}</strong><small>{formatFullDate(week.startDate)} – {formatFullDate(week.endDate)}</small></div><div><span>Tổng điểm</span><b>{total > 0 ? '+' : ''}{total}</b></div><div><span>Nổi bật</span><b>{top ? `${top.name} · ${top.points > 0 ? '+' : ''}${top.points}` : '—'}</b></div><div><span>Ghi nhận</span><b>{week.activityCount}</b></div><span className="week-history-open"><span>Xem từng em</span><ChevronDown size={17} /></span></summary>
                <div className="week-student-results"><div className="week-student-result-head"><span>Hạng</span><span>Học sinh</span><span>Tổ</span><span>Điểm tuần</span></div>{week.studentScores.map((score, index) => <div className="week-student-result-row" key={score.studentId}><span className={`week-student-rank rank-${index + 1}`}>{index + 1}</span><strong>{score.name}</strong><span>Tổ {score.team}</span><b>{score.points > 0 ? '+' : ''}{score.points}</b></div>)}</div>
                <div className="week-danger-zone">
                  <div><span>VÙNG NGUY HIỂM</span><strong>Xóa Tuần {week.number} khỏi lịch sử</strong><small>Tuần này và các ghi nhận liên quan sẽ bị loại khỏi báo cáo tháng. Điểm tích lũy hiện tại của học sinh không thay đổi.</small></div>
                  <button type="button" onClick={() => {
                    const accepted = window.confirm(`VÙNG NGUY HIỂM\n\nXóa Tuần ${week.number} (${formatFullDate(week.startDate)} – ${formatFullDate(week.endDate)})?\n\n• Tuần này sẽ bị loại khỏi báo cáo tháng.\n• Các ghi nhận thuộc tuần này sẽ bị xóa.\n• Điểm tích lũy hiện tại không thay đổi.\n\nHãy cân nhắc kỹ trước khi tiếp tục.`);
                    if (accepted) onDeleteClosedWeek(week.id);
                  }}><Trash2 size={16} /> Xóa tuần đã lưu</button>
                </div>
              </details>
            );
          })}</div>
        ) : <div className="week-history-empty"><History size={24} /><div><strong>Chưa có tuần nào được chốt</strong><span>Khi kết thúc tuần, kết quả sẽ xuất hiện tại đây để giáo viên xem lại.</span></div></div>}

        <section className="month-summary">
          <div className="month-summary-head"><div><CalendarCheck2 size={19} /><span>TỔNG HỢP THEO THÁNG</span><strong>Điểm của từng học sinh</strong></div><label><span>Chọn tháng</span><select aria-label="Chọn tháng tổng hợp" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{monthKeys.map((month) => <option key={month} value={month}>{formatMonthKey(month)}</option>)}</select></label></div>
          <div className="month-summary-kpis"><div><strong>{monthlySummary.periodCount}</strong><span>tuần được tính{monthlySummary.includesCurrent ? ' · có tuần đang chạy' : ''}</span></div><div><strong>{monthlySummary.total > 0 ? '+' : ''}{monthlySummary.total}</strong><span>tổng điểm trong tháng</span></div><div><strong>{monthlySummary.studentResults.length}</strong><span>học sinh có dữ liệu</span></div></div>
          <p className="month-summary-note"><ShieldCheck size={15} /> Mỗi tuần được tính vào tháng chứa ngày kết thúc tuần. Tuần hiện tại được cộng tạm tính và tự cập nhật theo điểm mới.</p>
          <details className="month-student-details">
            <summary><span className="month-toggle-closed">Xem danh sách từng em</span><span className="month-toggle-open">Thu gọn danh sách</span><small>{monthlySummary.studentResults.length} học sinh</small><ChevronDown size={18} /></summary>
            <div className="month-student-results"><div className="month-student-result-head"><span>Hạng</span><span>Học sinh</span><span>Tổ</span><span>Số tuần</span><span>Tổng tháng</span></div>{monthlySummary.studentResults.map((student, index) => <div className="month-student-result-row" key={student.studentId}><span className={`week-student-rank rank-${index + 1}`}>{index + 1}</span><strong>{student.name}</strong><span>Tổ {student.team}</span><span>{student.weeks}</span><b>{student.points > 0 ? '+' : ''}{student.points}</b></div>)}{!monthlySummary.studentResults.length && <p className="empty-state">Chưa có dữ liệu trong tháng này.</p>}</div>
          </details>
        </section>
      </div>
    </section>
  );
}

function ExcelStudentImport({ currentStudents, onImport, onClose }: { currentStudents: Student[]; onImport: (students: Student[], mode: 'append' | 'replace') => { imported: number; skipped: number }; onClose: () => void }) {
  const [result, setResult] = useState<ExcelImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const keyOf = (student: Student) => `${student.name.trim().toLocaleLowerCase('vi-VN')}|${student.birthday.trim()}`;
  const currentKeys = new Set(currentStudents.map(keyOf));
  const duplicateCount = result?.students.filter((student) => currentKeys.has(keyOf(student))).length ?? 0;

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      setResult(await parseStudentWorkbook(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đọc tệp Excel.');
    } finally {
      setLoading(false);
    }
  };

  const commit = () => {
    if (!result) return;
    if (mode === 'replace' && !window.confirm(`Thay thế toàn bộ ${currentStudents.length} học sinh hiện tại bằng danh sách trong Excel? Lịch sử hoạt động cũ sẽ bị xóa.`)) return;
    const summary = onImport(result.students, mode);
    if (summary.imported > 0) onClose();
    else setError('Không có học sinh mới để nhập. Các dòng có thể đã trùng với danh sách hiện tại.');
  };

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="excel-import-card" role="dialog" aria-modal="true" aria-labelledby="excel-import-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="excel-import-head">
          <div><span>NHẬP DANH SÁCH HÀNG LOẠT</span><h2 id="excel-import-title">Nhập học sinh từ Excel</h2><p>Tự nhận diện dòng tiêu đề và các cột thông tin phổ biến.</p></div>
          <button aria-label="Đóng nhập Excel" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="excel-import-body">
          <div className="excel-upload-row">
            <label className="excel-file-picker">
              <Upload size={23} />
              <span><strong>{loading ? 'Đang đọc tệp…' : fileName || 'Chọn tệp Excel'}</strong><small>Hỗ trợ .xlsx, .xls · tối đa 10 MB</small></span>
              <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => { const input = event.currentTarget; void chooseFile(input.files?.[0]); input.value = ''; }} />
            </label>
            <button className="excel-template-button" onClick={downloadStudentTemplate}><Download size={18} /> Tải file mẫu</button>
          </div>
          <p className="excel-required-note"><strong>Bắt buộc:</strong> Họ và tên · Ngày sinh · Họ tên phụ huynh · SĐT phụ huynh</p>

          {error && <div className="excel-error" role="alert">{error}</div>}
          {result && (
            <>
              <div className="excel-summary">
                <div><strong>{result.students.length}</strong><span>học sinh hợp lệ</span></div>
                <div><strong>{result.headerRow}</strong><span>dòng tiêu đề</span></div>
                <div><strong>{result.detectedFields.length}</strong><span>cột đã nhận diện</span></div>
                <div><strong>{duplicateCount}</strong><span>có thể trùng</span></div>
              </div>
              <div className="excel-detected"><strong>Đã nhận diện:</strong>{result.detectedFields.map((field) => <span key={field}>{field}</span>)}</div>
              <div className="excel-preview-wrap">
                <div className="excel-preview-title"><strong>Xem trước · trang “{result.sheetName}”</strong><span>Hiển thị {Math.min(8, result.students.length)}/{result.students.length} học sinh</span></div>
                <div className="excel-preview-table">
                  <div className="excel-preview-header"><span>STT</span><span>Họ và tên</span><span>Ngày sinh</span><span>Giới tính</span><span>Tổ</span><span>Điểm</span></div>
                  {result.students.slice(0, 8).map((student, index) => (
                    <div className="excel-preview-row" key={`${student.name}-${index}`}><span>{index + 1}</span><strong>{student.name}</strong><span>{student.birthday || '—'}</span><span>{student.gender || '—'}</span><span>{student.team}</span><span>{student.score}</span></div>
                  ))}
                </div>
              </div>
              {(result.ignoredRows > 0 || result.warnings.length > 0) && <p className="excel-note">Đã bỏ qua {result.ignoredRows} dòng không có họ tên. {result.warnings[0] || ''}</p>}
              <div className="excel-import-mode">
                <label className={mode === 'append' ? 'active' : ''}><input type="radio" name="excel-mode" checked={mode === 'append'} onChange={() => setMode('append')} /><span><strong>Thêm vào danh sách</strong><small>Giữ học sinh hiện tại, tự bỏ qua dòng trùng tên và ngày sinh.</small></span></label>
                <label className={mode === 'replace' ? 'active danger' : ''}><input type="radio" name="excel-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /><span><strong>Thay thế danh sách</strong><small>Xóa danh sách và lịch sử hoạt động hiện tại trước khi nhập.</small></span></label>
              </div>
            </>
          )}
        </div>
        <footer className="excel-import-actions"><button onClick={onClose}>Hủy</button><button disabled={!result || loading} onClick={commit}><Check size={18} /> {mode === 'append' ? 'Thêm vào danh sách' : 'Thay thế và nhập'}</button></footer>
      </section>
    </div>
  );
}

function StudentEditor({ student, teamCount, isNew, onSave, onClose }: { student: Student; teamCount: number; isNew: boolean; onSave: (student: Student) => void; onClose: () => void }) {
  const [draft, setDraft] = useState({ ...student });
  const [strengths, setStrengths] = useState(student.strengths.join(', '));
  const [photoError, setPhotoError] = useState('');
  const update = <K extends keyof Student>(key: K, value: Student[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const choosePhoto = async (file?: File) => {
    if (!file) return;
    try { update('photo', await prepareStudentPhoto(file)); setPhotoError(''); }
    catch (error) { setPhotoError(error instanceof Error ? error.message : 'Không thể tải ảnh.'); }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const initials = getTeacherInitials(name);
    const parentCode = draft.parentCode.trim() || createParentCode();
    onSave({ ...draft, name, initials, parentCode, strengths: strengths.split(',').map((item) => item.trim()).filter(Boolean) });
  };
  return (
    <div className="student-editor-backdrop" onMouseDown={onClose}>
      <form className="student-editor-card" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="student-editor-head"><div><span>{isNew ? 'THÊM HỌC SINH' : 'CHỈNH SỬA HỒ SƠ'}</span><h2>{isNew ? 'Học sinh mới' : draft.name}</h2></div><button type="button" onClick={onClose}><X size={21} /></button></div>
        <div className="student-editor-photo">
          <Avatar initials={getTeacherInitials(draft.name || 'HS')} gradient={draft.gradient} photo={draft.photo} size="xlarge" />
          <div><label><Camera size={17} /> {draft.photo ? 'Đổi ảnh' : 'Tải ảnh'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void choosePhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>{draft.photo && <button type="button" onClick={() => update('photo', undefined)}><Trash2 size={16} /> Xóa ảnh</button>}</div>
          {photoError && <p>{photoError}</p>}
        </div>
        <div className="student-editor-grid">
          <label className="field-wide"><span>Họ và tên *</span><input autoFocus value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Nhập họ tên học sinh" /></label>
          <label><span>Ngày sinh</span><input value={draft.birthday} onChange={(event) => update('birthday', event.target.value)} placeholder="dd/mm/yyyy" /></label>
          <label><span>Giới tính</span><select value={draft.gender || ''} onChange={(event) => update('gender', event.target.value)}><option value="">Chưa xác định</option><option>Nam</option><option>Nữ</option><option>Khác</option></select></label>
          <label><span>Mã học sinh / định danh</span><input value={draft.studentCode || ''} onChange={(event) => update('studentCode', event.target.value)} placeholder="Nhập mã nếu có" /></label>
          <label><span>Tổ</span><select value={Math.min(draft.team, teamCount)} onChange={(event) => update('team', Number(event.target.value))}>{getTeamNumbers(teamCount).map((team) => <option key={team} value={team}>Tổ {team}</option>)}</select></label>
          <label><span>Vai trò</span><select value={draft.role} onChange={(event) => update('role', event.target.value)}><option>Thành viên</option><option>Tổ trưởng</option><option>Lớp phó</option><option>Lớp trưởng</option></select></label>
          <label><span>Điểm hiện tại</span><input type="number" min="0" value={draft.score} onChange={(event) => update('score', Math.max(0, Number(event.target.value)))} /></label>
          <label><span>Trạng thái</span><select value={draft.attendance} onChange={(event) => update('attendance', event.target.value as AttendanceStatus)}><option value="present">Có mặt</option><option value="late">Đi muộn</option><option value="excused">Nghỉ có phép</option><option value="absent">Nghỉ không phép</option></select></label>
          <label><span>Màu đại diện</span><select value={draft.gradient} onChange={(event) => update('gradient', event.target.value)}>{['mint','sky','sun','lavender','coral','aqua','rose','grape','peach','lime','berry','ocean'].map((color) => <option key={color}>{color}</option>)}</select></label>
          <label className="field-wide"><span>Điểm mạnh</span><input value={strengths} onChange={(event) => setStrengths(event.target.value)} placeholder="Ví dụ: Toán học, Trách nhiệm" /><small>Ngăn cách mỗi nội dung bằng dấu phẩy.</small></label>
          <label><span>Tên phụ huynh</span><input value={draft.parentName} onChange={(event) => update('parentName', event.target.value)} /></label>
          <label><span>Số điện thoại</span><input value={draft.parentPhone} onChange={(event) => update('parentPhone', event.target.value)} /></label>
          <label className="field-wide"><span>Mã tra cứu phụ huynh</span><input value={draft.parentCode} onChange={(event) => update('parentCode', event.target.value.toUpperCase())} placeholder="Để trống để tự tạo" /></label>
        </div>
        <div className="student-editor-actions"><button type="button" onClick={onClose}>Hủy</button><button type="submit" disabled={!draft.name.trim()}><Check size={18} /> {isNew ? 'Thêm vào lớp' : 'Lưu thay đổi'}</button></div>
      </form>
    </div>
  );
}

function TeacherAccess({ teacherName, googleAvailable, onGoogleLogin, onSuccess, onClose }: { teacherName: string; googleAvailable: boolean; onGoogleLogin: () => Promise<TeacherAccount>; onSuccess: (account: TeacherAccount) => void; onClose: () => void }) {
  const [credential, setCredential] = useState<TeacherCredential | null>(readTeacherCredential);
  const [name, setName] = useState(credential?.name || teacherName);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const isSetup = !credential;

  const loginWithGoogle = async () => {
    setError('');
    setGoogleSubmitting(true);
    try {
      await onGoogleLogin();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Chưa thể đăng nhập Google.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!/^\d{4,8}$/.test(pin)) return setError('Mã PIN phải gồm từ 4 đến 8 chữ số.');
    setSubmitting(true);
    try {
      if (isSetup) {
        const accountName = name.trim();
        if (!accountName) return setError('Vui lòng nhập tên giáo viên.');
        if (pin !== confirmPin) return setError('Hai lần nhập mã PIN chưa trùng nhau.');
        const saltBytes = crypto.getRandomValues(new Uint8Array(16));
        const salt = Array.from(saltBytes, (value) => value.toString(16).padStart(2, '0')).join('');
        const nextCredential = { name: accountName, salt, pinHash: await hashTeacherPin(pin, salt) };
        localStorage.setItem('happy-class-teacher-credential', JSON.stringify(nextCredential));
        sessionStorage.setItem('happy-class-teacher-session', 'active');
        setCredential(nextCredential);
        onSuccess({ id: 'local-teacher', name: accountName, source: 'local' });
      } else {
        const pinHash = await hashTeacherPin(pin, credential.salt);
        if (pinHash !== credential.pinHash) return setError('Mã PIN chưa đúng. Vui lòng thử lại.');
        sessionStorage.setItem('happy-class-teacher-session', 'active');
        onSuccess({ id: 'local-teacher', name: credential.name, source: 'local' });
      }
    } catch {
      setError('Trình duyệt không thể tạo phiên giáo viên. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="teacher-access-card" role="dialog" aria-modal="true" aria-labelledby="teacher-access-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="teacher-access-close" aria-label="Đóng đăng nhập giáo viên" onClick={onClose}><X size={20} /></button>
        <div className="teacher-access-icon"><ShieldCheck size={32} /></div>
        <span className="settings-eyebrow">KHU VỰC GIÁO VIÊN</span>
        <h2 id="teacher-access-title">{isSetup ? 'Thiết lập tài khoản giáo viên' : 'Đăng nhập giáo viên'}</h2>
        <p>Đăng nhập Google để cập nhật dữ liệu phụ huynh lên Firebase; hoặc dùng PIN khi chỉ làm việc trên thiết bị này.</p>
        <button className="teacher-google-login" type="button" disabled={!googleAvailable || googleSubmitting} onClick={() => void loginWithGoogle()}>
          <span>G</span>{googleSubmitting ? 'Đang mở Google…' : googleAvailable ? 'Đăng nhập bằng Google' : 'Mở bản web để đăng nhập Google'}
        </button>
        <small className="teacher-google-note"><ShieldCheck size={14} /> Google chỉ xác nhận tài khoản giáo viên; danh sách lớp đầy đủ vẫn lưu trên máy.</small>
        <div className="teacher-access-divider"><span>HOẶC DÙNG PIN TRÊN MÁY</span></div>
        <p>{isSetup ? 'Tạo mã PIN dùng trên thiết bị này để bảo vệ các chức năng quản lý lớp.' : `Nhập mã PIN của ${credential.name} để mở các chức năng quản lý.`}</p>
        {isSetup && <label className="teacher-access-field"><span>Tên giáo viên</span><input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} autoFocus /></label>}
        <label className="teacher-access-field"><span>Mã PIN {isSetup ? 'mới' : ''}</span><input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} autoFocus={!isSetup} autoComplete={isSetup ? 'new-password' : 'current-password'} placeholder="4–8 chữ số" /></label>
        {isSetup && <label className="teacher-access-field"><span>Nhập lại mã PIN</span><input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} autoComplete="new-password" placeholder="Nhập lại mã PIN" /></label>}
        {error && <p className="teacher-access-error" role="alert">{error}</p>}
        <button className="teacher-access-submit" type="submit" disabled={submitting}><ShieldCheck size={18} /> {submitting ? 'Đang xác nhận…' : isSetup ? 'Tạo tài khoản và đăng nhập' : 'Đăng nhập'}</button>
        <small>Mã PIN chỉ được lưu bảo mật trên thiết bị này và không nằm trong bản sao dữ liệu lớp.</small>
      </form>
    </div>
  );
}

function TeacherSettings({ teacherName, teacherPhoto, classCode, onSave, onClose }: { teacherName: string; teacherPhoto?: string; classCode: string; onSave: (name: string, photo?: string) => void; onClose: () => void }) {
  const [draftName, setDraftName] = useState(teacherName);
  const [draftPhoto, setDraftPhoto] = useState(teacherPhoto);
  const [photoError, setPhotoError] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(draftName, draftPhoto);
  };
  const choosePhoto = async (file?: File) => {
    if (!file) return;
    try {
      setDraftPhoto(await prepareStudentPhoto(file));
      setPhotoError('');
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Không thể tải ảnh.');
    }
  };
  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="teacher-settings-card" role="dialog" aria-modal="true" aria-labelledby="teacher-settings-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <button className="settings-close" type="button" aria-label="Đóng" onClick={onClose}><X size={21} /></button>
        <div className="settings-trophy">🏆</div>
        <span className="settings-eyebrow">HỒ SƠ GIÁO VIÊN</span>
        <h2 id="teacher-settings-title">Tùy chỉnh tên giáo viên</h2>
        <p>Tên này sẽ xuất hiện trên thanh menu, góc tài khoản và lời chào ở trang Tổng quan.</p>
        <div className="teacher-name-preview">
          <Avatar initials={getTeacherInitials(draftName)} gradient="teacher" photo={draftPhoto} size="large" />
          <div><strong>{draftName.trim() || 'Tên giáo viên'}</strong><span>Giáo viên chủ nhiệm lớp {classCode}</span></div>
        </div>
        <div className="teacher-photo-controls">
          <label className="teacher-photo-upload"><Camera size={17} /> {draftPhoto ? 'Đổi ảnh giáo viên' : 'Tải ảnh giáo viên'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void choosePhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
          {draftPhoto && <button className="teacher-photo-remove" type="button" onClick={() => { setDraftPhoto(undefined); setPhotoError(''); }}><Trash2 size={16} /> Xóa ảnh</button>}
        </div>
        {photoError && <p className="teacher-photo-error">{photoError}</p>}
        <label className="teacher-name-field">
          <span>Tên hiển thị</span>
          <input autoFocus maxLength={60} value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Ví dụ: Cô Nguyễn Thị Lan" />
          <small>Có thể nhập “Cô” hoặc “Thầy” ở đầu tên.</small>
        </label>
        <div className="settings-actions">
          <button type="button" className="settings-cancel" onClick={onClose}>Hủy</button>
          <button type="submit" className="settings-save" disabled={!draftName.trim()}><Check size={18} /> Lưu tên giáo viên</button>
        </div>
      </form>
    </div>
  );
}

function ClassSettings({ classProfile, onSave, onClose }: { classProfile: ClassProfile; onSave: (profile: ClassProfile) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(classProfile);
  const teamCountValid = isValidTeamCount(draft.teamCount);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teamCountValid) return;
    const profile: ClassProfile = {
      name: draft.name.trim(),
      code: draft.code.trim(),
      schoolYear: draft.schoolYear.trim(),
      teamCount: normalizeTeamCount(draft.teamCount),
      teamScoringMode: draft.teamScoringMode === 'total' ? 'total' : 'average',
    };
    if (profile.name && profile.code && profile.schoolYear) onSave(profile);
  };
  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="class-settings-card" role="dialog" aria-modal="true" aria-labelledby="class-settings-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <button className="settings-close" type="button" aria-label="Đóng" onClick={onClose}><X size={21} /></button>
        <div className="class-settings-badge">{draft.code || 'Lớp'}</div>
        <span className="settings-eyebrow">THÔNG TIN LỚP HỌC</span>
        <h2 id="class-settings-title">Tùy chỉnh lớp đang quản lý</h2>
        <p>Nội dung sẽ được cập nhật đồng bộ trên toàn bộ ứng dụng.</p>
        <div className="class-settings-preview"><div className="class-icon">{draft.code || '—'}</div><div><strong>{draft.name || 'Tên lớp'}</strong><span>Năm học {draft.schoolYear || '—'} · {teamCountValid ? draft.teamCount : '—'} tổ</span></div></div>
        <div className="class-settings-fields">
          <label><span>Tên lớp</span><input autoFocus maxLength={60} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ví dụ: Lớp Hạnh Phúc" /></label>
          <label><span>Mã lớp</span><input maxLength={20} value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} placeholder="Ví dụ: 3/1 hoặc 4A" /></label>
          <label><span>Năm học</span><input maxLength={30} value={draft.schoolYear} onChange={(event) => setDraft((current) => ({ ...current, schoolYear: event.target.value }))} placeholder="Ví dụ: 2026–2027" /></label>
          <label><span>Số lượng tổ/nhóm</span><input type="number" inputMode="numeric" min={1} max={MAX_TEAM_COUNT} step={1} value={draft.teamCount || ''} onChange={(event) => setDraft((current) => ({ ...current, teamCount: event.target.value === '' ? 0 : Number(event.target.value) }))} placeholder="Ví dụ: 9" /><small>Tự nhập số lượng thực tế, từ 1 đến {MAX_TEAM_COUNT} tổ/nhóm.</small></label>
          <label>
            <span>Cách tính điểm thi đua tổ</span>
            <select value={draft.teamScoringMode || 'average'} onChange={(event) => setDraft((current) => ({ ...current, teamScoringMode: event.target.value as TeamScoringMode }))}>
              <option value="average">Điểm trung bình / HS (Công bằng khi sĩ số tổ không đều: 12 &amp; 11 em)</option>
              <option value="total">Tổng điểm cả tổ</option>
            </select>
            <small>Điểm trung bình giúp các tổ ít học sinh hơn không bị thiệt thòi khi so sánh.</small>
          </label>
        </div>
        <div className="settings-actions"><button type="button" className="settings-cancel" onClick={onClose}>Hủy</button><button type="submit" className="settings-save" disabled={!draft.name.trim() || !draft.code.trim() || !draft.schoolYear.trim() || !teamCountValid}><Check size={18} /> Lưu thông tin lớp</button></div>
      </form>
    </div>
  );
}

function MobileNav({ page, onNavigate }: { page: PageId; onNavigate: (page: PageId) => void }) {
  const items = navItems.filter((item) => ['dashboard', 'students', 'seating', 'points', 'attendance'].includes(item.id));
  return (
    <nav className="mobile-nav">
      {items.map((item) => {
        const Icon = item.icon;
        return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)}><Icon size={20} /><span>{item.label.replace('Vườn ', '')}</span></button>;
      })}
    </nav>
  );
}

function Dashboard({
  students,
  activities,
  teacherName,
  classCode,
  teamCount,
  teamScoringMode = 'average',
  week,
  onNavigate,
  onOpenStudent,
}: {
  students: Student[];
  activities: Activity[];
  teacherName: string;
  classCode: string;
  teamCount: number;
  teamScoringMode?: TeamScoringMode;
  week: WeekPeriod;
  onNavigate: (page: PageId) => void;
  onOpenStudent: (id: number) => void;
}) {
  const currentTime = useVietnamTime();
  const greeting = getVietnamGreeting(currentTime);
  const present = students.filter((student) => student.attendance === 'present').length;
  const totalScore = students.reduce((sum, student) => sum + student.score, 0);
  const weeklyTotal = students.reduce((sum, student) => sum + student.weeklyScore, 0);
  const teams = getTeamStats(students, teamCount, teamScoringMode);
  const leaders = [...students].sort((a, b) => b.score - a.score).slice(0, 4);
  const isAvg = teamScoringMode === 'average';

  return (
    <>
      <section className="welcome-hero">
        <div className="welcome-copy">
          <span className="sun-pill" title={`Giờ Việt Nam: ${greeting.time}`}>{greeting.icon} {greeting.pill} · {greeting.time}</span>
          <h1>Chào {greeting.period}, {getTeacherGreeting(teacherName)}!</h1>
          <p>Tuần {week.number} · {formatShortDate(week.startDate)}–{formatShortDate(week.endDate)}. Hãy cùng tạo thêm những khoảnh khắc đáng nhớ nhé.</p>
          <div className="hero-actions">
            <button className="button button-light" onClick={() => onNavigate('attendance')}><CalendarCheck2 size={18} /> Điểm danh ngay</button>
            <button className="button button-ghost-light" onClick={() => onNavigate('points')}><Sparkles size={18} /> Ghi nhận điểm tốt</button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="hero-card hero-card-one"><Star size={17} fill="currentColor" /><strong>{weeklyTotal > 0 ? '+' : ''}{weeklyTotal}</strong><span>điểm tuần này</span></div>
          <div className="hero-card hero-card-two"><PartyPopper size={19} /><strong>12</strong><span>chuỗi ngày tốt</span></div>
          <div className="hero-mascot">🌱<span>{classCode}</span></div>
        </div>
      </section>

      <div className="quick-row">
        <QuickAction icon={UserRoundCheck} label="Điểm danh" description="Cả lớp trong 30 giây" color="green" onClick={() => onNavigate('attendance')} />
        <QuickAction icon={Sparkles} label="Cộng điểm" description="Ghi nhận việc tốt" color="orange" onClick={() => onNavigate('points')} />
        <QuickAction icon={Wand2} label="Gọi ngẫu nhiên" description="Vui và công bằng" color="purple" onClick={() => onNavigate('random')} />
        <QuickAction icon={Gift} label="Đổi thưởng" description="Khích lệ cố gắng" color="blue" onClick={() => onNavigate('rewards')} />
      </div>

      <section className="stats-grid">
        <StatCard label="Sĩ số lớp" value={students.length.toString()} suffix="học sinh" icon={UsersRound} tone="green" trend={`${teamCount} tổ đang hoạt động`} />
        <StatCard label="Có mặt hôm nay" value={present.toString()} suffix={`/ ${students.length} bạn`} icon={CalendarCheck2} tone="blue" trend={`${students.length - present} cần lưu ý`} />
        <StatCard label="Tổng điểm tích lũy" value={totalScore.toLocaleString('vi-VN')} suffix="điểm" icon={Coins} tone="orange" trend={`${weeklyTotal > 0 ? '+' : ''}${weeklyTotal} trong Tuần ${week.number}`} />
        <StatCard label="Chuỗi tích cực" value="12" suffix="ngày" icon={Zap} tone="purple" trend="Kỷ lục của lớp" />
      </section>

      <div className="dashboard-grid">
        <section className="panel team-progress-panel">
          <PanelHeader eyebrow="THI ĐUA TUẦN NÀY" title={`Đường đua ${teamCount} tổ (${isAvg ? 'ĐTB/HS' : 'Tổng điểm'})`} action="Xem chi tiết" onAction={() => onNavigate('teams')} />
          <div className="team-bars">
            {teams.map((team, index) => {
              const displayVal = isAvg ? `${team.weeklyAvg} đ/HS` : `${team.weekly} điểm tuần`;
              const displaySub = isAvg ? `Tổng ${team.weekly}đ · ${team.members} HS` : `${team.members} thành viên`;
              const leadingVal = Math.max(1, isAvg ? (teams[0]?.weeklyAvg ?? 1) : (teams[0]?.weekly ?? 1));
              const currentVal = isAvg ? team.weeklyAvg : team.weekly;
              const widthPct = Math.max(0, Math.min(100, (currentVal / leadingVal) * 100));
              return (
                <div className="team-bar-row" key={team.team}>
                  <div className={`team-badge team-${team.team}`}>{index === 0 ? '👑' : team.team}</div>
                  <div className="team-bar-info">
                    <div><strong>Tổ {team.team}</strong><span>{displaySub}</span><b>{displayVal}</b></div>
                    <div className="progress-track"><i style={{ width: `${widthPct}%` }} /></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="encouragement">
            <span>🎯</span>
            <p>
              <strong>Tổ {teams[1]?.team ?? teams[0].team} đang bám rất sát!</strong>{' '}
              {isAvg
                ? `Chỉ kém vị trí dẫn đầu ${(teams[0].weeklyAvg - (teams[1]?.weeklyAvg ?? 0)).toFixed(1)} điểm trung bình/HS.`
                : `Chỉ còn cách vị trí đầu tiên ${Math.max(0, teams[0].weekly - (teams[1]?.weekly ?? 0))} điểm tuần.`}
            </p>
          </div>
        </section>

        <section className="panel activity-panel">
          <PanelHeader eyebrow="NHỊP LỚP HỌC" title="Hoạt động gần đây" action="Xem tất cả" />
          <div className="activity-list">
            {activities.slice(0, 5).map((activity) => {
              const student = students.find((item) => item.id === activity.studentId);
              if (!student) return null;
              return (
                <button className="activity-item" key={activity.id} onClick={() => onOpenStudent(student.id)}>
                  <Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="small" />
                  <div><strong>{student.name}</strong><span>{activity.title}</span></div>
                  <div className={`point-chip ${activity.points > 0 ? 'plus' : activity.points < 0 ? 'minus' : 'neutral'}`}>{activity.points > 0 ? '+' : ''}{activity.points}</div>
                  <time>{activity.time}</time>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel leaderboard-panel">
          <PanelHeader eyebrow="NHỮNG BÔNG HOA NỔI BẬT" title="Top điểm tích lũy" action="Bảng vinh danh" onAction={() => onNavigate('honors')} />
          <div className="mini-leaders">
            {leaders.map((student, index) => (
              <button key={student.id} className="mini-leader" onClick={() => onOpenStudent(student.id)}>
                <span className={`rank rank-${index + 1}`}>{index + 1}</span>
                <Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} />
                <strong>{student.name}</strong><span>Tổ {student.team}</span><b><Star size={14} fill="currentColor" />{student.score}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="panel birthday-panel">
          <div className="birthday-art">🎂<i>✨</i></div>
          <span className="birthday-label">SINH NHẬT SẮP TỚI</span>
          <h3>Chúc mừng Khánh Vy!</h3>
          <p>Còn 4 ngày nữa đến sinh nhật bạn. Cùng chuẩn bị một điều bất ngờ nhé!</p>
          <button className="text-button">Tạo thiệp chúc mừng <ChevronRight size={16} /></button>
        </section>
      </div>
    </>
  );
}

function StudentsPage({ students, teamCount, canManageStudents, onOpenStudent, onAddStudent }: { students: Student[]; teamCount: number; canManageStudents: boolean; onOpenStudent: (id: number) => void; onAddStudent: () => void }) {
  const [query, setQuery] = useState('');
  const [team, setTeam] = useState(0);
  const filtered = students.filter((student) =>
    student.name.toLowerCase().includes(query.toLowerCase()) && (!team || student.team === team),
  );
  return (
    <>
      <PageHeading eyebrow="HỒ SƠ HỌC SINH" title="Mỗi học sinh, một hành trình riêng" description="Theo dõi tiến bộ, thế mạnh và những dấu mốc đáng nhớ của từng học sinh." icon="🌿" />
      <div className="toolbar panel">
        <label className="page-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên học sinh..." /></label>
        <div className="filter-tabs"><button className={team === 0 ? 'active' : ''} onClick={() => setTeam(0)}>Tất cả <span>{students.length}</span></button>{getTeamNumbers(teamCount).map((item) => <button className={team === item ? 'active' : ''} onClick={() => setTeam(item)} key={item}>Tổ {item}</button>)}</div>
        {canManageStudents
          ? <button className="button button-primary" onClick={onAddStudent}><Plus size={18} /> Thêm học sinh</button>
          : <span className="teacher-only-note"><ShieldCheck size={17} /> Chức năng thêm học sinh chỉ dành cho tài khoản giáo viên.</span>}
      </div>
      <div className="student-grid">
        {filtered.map((student) => (
          <button className="student-card" key={student.id} onClick={() => onOpenStudent(student.id)}>
            <div className="student-card-top"><span className={`status-dot ${student.attendance}`} /> <span>{attendanceLabels[student.attendance]}</span><MoreHorizontal size={18} /></div>
            <Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="large" />
            <h3>{student.name}</h3><p>{student.role} · Tổ {student.team}</p>
            <div className="student-metrics"><div><Star size={15} fill="currentColor" /><strong>{student.score}</strong><span>điểm</span></div><div><Zap size={15} /><strong>{student.streak}</strong><span>chuỗi tốt</span></div></div>
            <div className="strength-tags">{student.strengths.map((item) => <span key={item}>{item}</span>)}</div>
            <div className="card-link">Xem hành trình <ChevronRight size={16} /></div>
          </button>
        ))}
      </div>
    </>
  );
}

function PointsPage({ students, reasons, canConfigure, lastPointAction, onSaveReasons, onAddPoints, onUndoPoints }: { students: Student[]; reasons: PointReason[]; canConfigure: boolean; lastPointAction: string; onSaveReasons: (reasons: PointReason[]) => void; onAddPoints: (ids: number[], points: number, reason: string) => void; onUndoPoints: () => void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [mode, setMode] = useState<'positive' | 'negative'>('positive');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const visibleReasons = reasons.filter((item) => (mode === 'positive' ? item.points > 0 : item.points < 0));
  const teamOptions = Array.from(new Set(students.map((student) => student.team))).sort((a, b) => a - b);
  const selectedSet = new Set(selected);
  const unavailableSelected = students.filter((student) => selectedSet.has(student.id) && student.attendance !== 'present');
  const fullySelectedTeams = teamOptions.filter((team) => {
    const members = students.filter((student) => student.team === team);
    return members.length > 0 && members.every((student) => selectedSet.has(student.id));
  });
  const fullySelectedMemberIds = new Set(students.filter((student) => fullySelectedTeams.includes(student.team)).map((student) => student.id));
  const extraSelectedCount = selected.filter((id) => !fullySelectedMemberIds.has(id)).length;
  const selectionSummaryLabel = selected.length === students.length && students.length
    ? 'Đã chọn cả lớp'
    : fullySelectedTeams.length
      ? `Đã chọn ${fullySelectedTeams.map((team) => `Tổ ${team}`).join(', ')}${extraSelectedCount ? ` và ${extraSelectedCount} em khác` : ''}`
      : `Đã chọn ${selected.length} học sinh`;
  const toggleStudent = (id: number) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleStudents = (ids: number[]) => setSelected((current) => {
    const currentSet = new Set(current);
    const allSelected = ids.length > 0 && ids.every((id) => currentSet.has(id));
    if (allSelected) return current.filter((id) => !ids.includes(id));
    ids.forEach((id) => currentSet.add(id));
    return students.map((student) => student.id).filter((id) => currentSet.has(id));
  });

  return (
    <>
      <PageHeading eyebrow="VƯỜN HOA ĐIỂM TỐT" title="Gieo lời khen, nuôi dưỡng tiến bộ" description="Chọn học sinh và ghi nhận ngay những nỗ lực đáng quý trong ngày." icon="✨" />
      <div className={`points-undo-bar panel ${lastPointAction ? 'is-ready' : ''}`}>
        <span className="points-undo-icon"><RotateCcw size={20} /></span>
        <div><strong>Hoàn tác chấm điểm</strong><small>{lastPointAction || 'Sau khi cộng hoặc trừ điểm, lượt gần nhất có thể được hoàn tác tại đây.'}</small></div>
        <button type="button" disabled={!lastPointAction} onClick={onUndoPoints}><RotateCcw size={16} /> Hoàn tác lượt gần nhất</button>
      </div>
      <div className="points-layout">
        <section className="panel selection-panel">
          <div className="selection-header"><div><span>BƯỚC 1</span><h3>Chọn học sinh</h3></div><button className="text-button" onClick={() => setSelected(selected.length === students.length ? [] : students.map((item) => item.id))}>{selected.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn cả lớp'}</button></div>
          <div className="points-team-picker">
            <div className="points-team-picker-head"><span><UsersRound size={17} /></span><div><strong>Chọn nhanh theo tổ</strong><small>Nhấn một lần để chọn tất cả thành viên</small></div></div>
            <div className="points-team-chips">
              {teamOptions.map((team) => {
                const memberIds = students.filter((student) => student.team === team).map((student) => student.id);
                const selectedCount = memberIds.filter((id) => selectedSet.has(id)).length;
                const selectionState = selectedCount === memberIds.length ? 'selected' : selectedCount > 0 ? 'partial' : '';
                return <button type="button" key={team} className={selectionState} aria-pressed={selectionState === 'selected'} onClick={() => toggleStudents(memberIds)}><span className={`team-${((team - 1) % 8) + 1}`}>{team}</span><strong>Tổ {team}</strong><small>{selectedCount > 0 && selectedCount < memberIds.length ? `${selectedCount}/${memberIds.length}` : `${memberIds.length} HS`}</small>{selectionState === 'selected' && <Check size={14} strokeWidth={3} />}</button>;
              })}
              <button type="button" className={`points-all-chip ${selected.length === students.length && students.length ? 'selected' : selected.length ? 'partial' : ''}`} aria-pressed={selected.length === students.length && students.length > 0} onClick={() => toggleStudents(students.map((student) => student.id))}><UsersRound size={17} /><strong>Cả lớp</strong><small>{selected.length > 0 && selected.length < students.length ? `${selected.length}/${students.length}` : `${students.length} HS`}</small>{selected.length === students.length && students.length > 0 && <Check size={14} strokeWidth={3} />}</button>
            </div>
          </div>
          <div className="student-pick-grid">
            {students.map((student) => (
              <button key={student.id} className={`student-pick ${selected.includes(student.id) ? 'selected' : ''}`} aria-pressed={selected.includes(student.id)} onClick={() => toggleStudent(student.id)}>
                <span className="check-circle">{selected.includes(student.id) && <Check size={14} strokeWidth={3} />}</span>
                <Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="small" />
                <div><strong>{student.name}</strong><span>Tổ {student.team} · {student.score} điểm{student.attendance !== 'present' && <em className={`points-attendance-tag ${student.attendance}`}>{attendanceLabels[student.attendance]}</em>}</span></div>
              </button>
            ))}
          </div>
        </section>
        <section className="panel reason-panel">
          <div className="selection-header"><div><span>BƯỚC 2</span><h3>Chọn điều muốn ghi nhận</h3></div><div className="reason-header-actions"><div className="mode-switch"><button className={mode === 'positive' ? 'positive active' : ''} onClick={() => setMode('positive')}><Plus size={15} />Điểm tốt</button><button className={mode === 'negative' ? 'negative active' : ''} onClick={() => setMode('negative')}><Minus size={15} />Nhắc nhở</button></div>{canConfigure && <button className="reason-settings-button" onClick={() => setSettingsVisible(true)}><Settings size={15} /> Cấu hình</button>}</div></div>
          {selected.length > 0 && <div className="points-selection-summary"><span><UsersRound size={19} /></span><div><strong>{selectionSummaryLabel}</strong><small>{unavailableSelected.length ? `Có ${unavailableSelected.length} em không ở trạng thái Có mặt — có thể bỏ chọn riêng bên trái.` : 'Mỗi em sẽ nhận số điểm của nội dung được chọn bên dưới.'}</small></div><b>{selected.length} HS</b></div>}
          <div className="reason-grid">
            {visibleReasons.map((reason) => (
              <button key={reason.id} className={`reason-card ${reason.tone}`} disabled={!selected.length} onClick={() => { onAddPoints(selected, reason.points, reason.label); setSelected([]); }}>
                <span>{reason.icon}</span><div><strong>{reason.label}</strong><small>{reason.points > 0 ? '+' : ''}{reason.points} điểm{selected.length ? ` × ${selected.length} HS` : ''}</small></div><ChevronRight size={17} />
              </button>
            ))}
          </div>
          {!visibleReasons.length && <div className="reason-empty">Chưa có nội dung {mode === 'positive' ? 'điểm cộng' : 'điểm trừ'}. Giáo viên có thể thêm trong phần Cấu hình.</div>}
          {!selected.length && <div className="selection-hint"><UsersRound size={18} /> Hãy chọn ít nhất một học sinh ở bước 1</div>}
          <div className="motivation-scene">
            <div className="motivation-copy">
              <span>GÓC ĐỘNG VIÊN</span>
              <strong>Mỗi lời khen là một hạt mầm</strong>
              <small>Hôm nay lớp mình đã gieo thêm 18 điều tích cực.</small>
            </div>
            <div className="mini-garden" aria-hidden="true">
              <i className="garden-sun">✦</i>
              <i className="garden-leaf leaf-one">🌱</i>
              <i className="garden-leaf leaf-two">🌼</i>
              <i className="garden-leaf leaf-three">🌿</i>
              <span>18</span>
            </div>
          </div>
        </section>
      </div>
      {settingsVisible && <PointReasonSettings reasons={reasons} onSave={onSaveReasons} onClose={() => setSettingsVisible(false)} />}
    </>
  );
}

function PointReasonSettings({ reasons, onSave, onClose }: { reasons: PointReason[]; onSave: (reasons: PointReason[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<PointReason[]>(reasons.map((reason) => ({ ...reason })));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<'positive' | 'negative'>('positive');
  const [points, setPoints] = useState('5');
  const [icon, setIcon] = useState('⭐');
  const [error, setError] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setLabel('');
    setKind('positive');
    setPoints('5');
    setIcon('⭐');
    setError('');
  };

  const editReason = (reason: PointReason) => {
    setEditingId(reason.id);
    setLabel(reason.label);
    setKind(reason.points > 0 ? 'positive' : 'negative');
    setPoints(String(Math.abs(reason.points)));
    setIcon(reason.icon);
    setError('');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLabel = label.trim();
    const nextIcon = icon.trim();
    const pointValue = Number(points);
    if (!nextLabel) return setError('Vui lòng nhập nội dung ghi nhận.');
    if (!Number.isInteger(pointValue) || pointValue < 1 || pointValue > 100) return setError('Số điểm phải là số nguyên từ 1 đến 100.');
    if (!nextIcon || nextIcon.length > 12) return setError('Biểu tượng không hợp lệ.');
    if (draft.some((reason) => reason.id !== editingId && reason.label.toLocaleLowerCase('vi-VN') === nextLabel.toLocaleLowerCase('vi-VN'))) {
      return setError('Nội dung này đã có trong danh mục.');
    }

    const oldReason = draft.find((reason) => reason.id === editingId);
    const signedPoints = kind === 'positive' ? pointValue : -pointValue;
    const nextReason: PointReason = {
      id: editingId ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: nextLabel,
      points: signedPoints,
      icon: nextIcon,
      tone: kind === 'negative' ? 'red' : oldReason?.points && oldReason.points > 0 ? oldReason.tone : 'green',
    };
    setDraft((current) => editingId
      ? current.map((reason) => reason.id === editingId ? nextReason : reason)
      : [...current, nextReason]);
    resetForm();
  };

  const removeReason = (reason: PointReason) => {
    if (!window.confirm(`Xóa nội dung “${reason.label}” khỏi danh mục?`)) return;
    setDraft((current) => current.filter((item) => item.id !== reason.id));
    if (editingId === reason.id) resetForm();
  };

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="point-settings-card" role="dialog" aria-modal="true" aria-labelledby="point-settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="point-settings-head">
          <div><span>DÀNH CHO GIÁO VIÊN</span><h2 id="point-settings-title">Cấu hình nội dung điểm</h2><p>Thêm, sửa hoặc xóa lý do cộng và trừ điểm dùng cho lớp.</p></div>
          <button aria-label="Đóng cấu hình điểm" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="point-settings-layout">
          <div className="point-reason-list">
            <div className="point-reason-list-head"><strong>Danh mục hiện tại</strong><span>{draft.length}/100 nội dung</span></div>
            {draft.map((reason) => (
              <div className="point-reason-row" key={reason.id}>
                <span className={`point-reason-icon ${reason.points < 0 ? 'negative' : ''}`}>{reason.icon}</span>
                <div><strong>{reason.label}</strong><small className={reason.points < 0 ? 'negative' : ''}>{reason.points > 0 ? '+' : ''}{reason.points} điểm</small></div>
                <button aria-label={`Sửa ${reason.label}`} onClick={() => editReason(reason)}><Pencil size={15} /></button>
                <button aria-label={`Xóa ${reason.label}`} onClick={() => removeReason(reason)}><Trash2 size={15} /></button>
              </div>
            ))}
            {!draft.length && <p className="point-reason-list-empty">Danh mục đang trống.</p>}
          </div>

          <form className="point-reason-form" onSubmit={submit}>
            <span>{editingId ? 'CHỈNH SỬA NỘI DUNG' : 'THÊM NỘI DUNG MỚI'}</span>
            <label><span>Nội dung ghi nhận *</span><input value={label} maxLength={80} onChange={(event) => setLabel(event.target.value)} placeholder="Ví dụ: Hợp tác nhóm tốt" /></label>
            <div className="point-reason-form-grid">
              <label><span>Loại điểm</span><select value={kind} onChange={(event) => setKind(event.target.value as 'positive' | 'negative')}><option value="positive">Điểm cộng</option><option value="negative">Điểm trừ</option></select></label>
              <label><span>Số điểm</span><input type="number" min="1" max="100" step="1" value={points} onChange={(event) => setPoints(event.target.value)} /></label>
              <label><span>Biểu tượng tự chọn</span><input value={icon} maxLength={12} onChange={(event) => setIcon(event.target.value)} placeholder="Dán hoặc gõ icon" aria-label="Biểu tượng" /></label>
            </div>
            <div className="point-reason-icon-picker">
              {['⭐', '🤝', '🚀', '🌱', '🌟', '🏆', '🎨', '📖', '💡', '🧹', '🥇', '🏅', '🎒', '📝', '🔔', '⏰', '💬', '⚠️', '🚫', '❌'].map((emoji) => (
                <button type="button" key={emoji} className={icon === emoji ? 'active' : ''} onClick={() => setIcon(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
            <div className={`point-reason-preview ${kind}`}><span>{icon.trim() || '⭐'}</span><div><strong>{label.trim() || 'Nội dung mới'}</strong><small>{kind === 'positive' ? '+' : '−'}{points || '0'} điểm</small></div></div>
            {error && <p className="point-reason-error">{error}</p>}
            <div className="point-reason-form-actions">
              {editingId && <button type="button" onClick={resetForm}>Hủy sửa</button>}
              <button type="submit"><Plus size={16} /> {editingId ? 'Cập nhật' : 'Thêm vào danh mục'}</button>
            </div>
          </form>
        </div>

        <footer className="point-settings-actions">
          <button onClick={() => { setDraft(initialPointReasons.map((reason) => ({ ...reason }))); resetForm(); }}><RotateCcw size={16} /> Khôi phục mặc định</button>
          <button onClick={() => { onSave(draft); onClose(); }}><Check size={17} /> Lưu danh mục</button>
        </footer>
      </section>
    </div>
  );
}

function TeamsPage({
  students,
  teamCount,
  week,
  teamScoringMode = 'average',
  canManage,
  lastTeamAction,
  onToggleScoringMode,
  onApplyRandomTeams,
  onUndoRandomTeams,
}: {
  students: Student[];
  teamCount: number;
  week: WeekPeriod;
  teamScoringMode?: TeamScoringMode;
  canManage: boolean;
  lastTeamAction: string;
  onToggleScoringMode?: () => void;
  onApplyRandomTeams: (assignments: Array<Pick<Student, 'id' | 'team'>>, teamCount: number) => void;
  onUndoRandomTeams: () => void;
}) {
  const [randomizerOpen, setRandomizerOpen] = useState(false);
  const [randomTeamCount, setRandomTeamCount] = useState(teamCount);
  const [randomScope, setRandomScope] = useState<'all' | 'present'>('all');
  const [randomPreview, setRandomPreview] = useState<Array<Pick<Student, 'id' | 'team'>>>([]);
  const teams = getTeamStats(students, teamCount, teamScoringMode);
  const daysRemaining = Math.max(0, Math.ceil((dateFromInput(week.endDate).getTime() - Date.now()) / 86_400_000) + 1);
  const isAvg = teamScoringMode === 'average';
  const leadingScore = Math.max(1, isAvg ? (teams[0]?.weeklyAvg ?? 0) : (teams[0]?.weekly ?? 0));
  const previewTeamMap = new Map(randomPreview.map((student) => [student.id, student.team]));
  const previewGroups = getTeamNumbers(randomTeamCount).map((team) => ({
    team,
    students: students.filter((student) => previewTeamMap.get(student.id) === team),
  }));
  const randomCandidateCount = randomScope === 'present' ? students.filter((student) => student.attendance === 'present').length : students.length;

  const createRandomPreview = (count = randomTeamCount, scope = randomScope) => {
    if (!isValidTeamCount(count)) return;
    const candidates = students.filter((student) => scope === 'all' || student.attendance === 'present');
    const shuffled = [...candidates];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    const assignments = new Map(students.map((student) => [student.id, Math.min(Math.max(1, student.team), count)]));
    shuffled.forEach((student, index) => assignments.set(student.id, (index % count) + 1));
    setRandomPreview(students.map((student) => ({ id: student.id, team: assignments.get(student.id) ?? 1 })));
  };

  const openRandomizer = () => {
    setRandomTeamCount(teamCount);
    setRandomScope('all');
    setRandomizerOpen(true);
    createRandomPreview(teamCount, 'all');
  };

  const applyPreview = () => {
    if (!randomPreview.length) return;
    const accepted = window.confirm(`Áp dụng cách chia ngẫu nhiên thành ${randomTeamCount} tổ?\n\nChỉ số tổ của học sinh được thay đổi; điểm, hồ sơ và lịch sử vẫn giữ nguyên.`);
    if (!accepted) return;
    onApplyRandomTeams(randomPreview, randomTeamCount);
    setRandomizerOpen(false);
    setRandomPreview([]);
  };
  return (
    <>
      <PageHeading eyebrow={`THI ĐUA ${teamCount} TỔ`} title="Cùng tiến về phía trước" description="Một cuộc đua tích cực, nơi mỗi đóng góp nhỏ đều làm nên thành công của tập thể." icon="🏁" />
      {canManage && (
        <section className={`team-randomizer panel ${randomizerOpen ? 'is-open' : ''}`}>
          <header className="team-randomizer-head">
            <span className="team-randomizer-icon"><Wand2 size={22} /></span>
            <div><strong>Chia tổ ngẫu nhiên</strong><small>Xáo trộn và chia đều học sinh; không thay đổi điểm hoặc lịch sử.</small></div>
            {!randomizerOpen
              ? <button type="button" onClick={openRandomizer}><Wand2 size={17} /> Bắt đầu chia tổ</button>
              : <button type="button" className="team-randomizer-close" onClick={() => { setRandomizerOpen(false); setRandomPreview([]); }}><X size={17} /> Đóng</button>}
          </header>
          {lastTeamAction && !randomizerOpen && (
            <div className="team-randomizer-undo"><div><RotateCcw size={18} /><span><strong>Có thể hoàn tác</strong><small>{lastTeamAction}</small></span></div><button type="button" onClick={onUndoRandomTeams}><RotateCcw size={16} /> Hoàn tác phân tổ</button></div>
          )}
          {randomizerOpen && (
            <div className="team-randomizer-body">
              <div className="team-randomizer-controls">
                <label><span>Số lượng tổ/nhóm</span><input type="number" inputMode="numeric" min={1} max={MAX_TEAM_COUNT} step={1} value={randomTeamCount || ''} onChange={(event) => { setRandomTeamCount(event.target.value === '' ? 0 : Number(event.target.value)); setRandomPreview([]); }} placeholder="Ví dụ: 9" /></label>
                <label><span>Phạm vi chia</span><select value={randomScope} onChange={(event) => { setRandomScope(event.target.value as 'all' | 'present'); setRandomPreview([]); }}><option value="all">Cả lớp ({students.length} học sinh)</option><option value="present">Chỉ học sinh có mặt ({students.filter((student) => student.attendance === 'present').length})</option></select></label>
                <button type="button" disabled={!randomCandidateCount || !isValidTeamCount(randomTeamCount)} onClick={() => createRandomPreview()}><Wand2 size={17} /> {randomPreview.length ? 'Chia lại' : 'Tạo danh sách'}</button>
              </div>
              {randomScope === 'present' && <p className="team-randomizer-note"><ShieldCheck size={16} /> Học sinh vắng mặt được giữ ở tổ hiện tại; chỉ các em có mặt được xáo trộn.</p>}
              {randomPreview.length > 0 && (
                <div className="team-random-preview">
                  {previewGroups.map((group) => <article key={group.team}><header><span>{group.team}</span><strong>Tổ {group.team}</strong><small>{group.students.length} học sinh</small></header><div>{group.students.map((student) => <span key={student.id}><Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="tiny" /><b>{student.name}</b></span>)}</div></article>)}
                </div>
              )}
              <footer className="team-randomizer-actions"><span><ShieldCheck size={16} /> Hãy xem trước danh sách trước khi xác nhận.</span><button type="button" disabled={!randomPreview.length} onClick={applyPreview}><Check size={17} /> Xác nhận phân tổ</button></footer>
            </div>
          )}
        </section>
      )}
      {onToggleScoringMode && (
        <div className="scoring-mode-bar panel">
          <span>CHẾ ĐỘ TÍNH ĐIỂM:</span>
          <button className={`scoring-mode-btn ${isAvg ? 'active' : ''}`} onClick={() => isAvg || onToggleScoringMode()}>
            📊 Điểm trung bình / HS <small>(Công bằng khi sĩ số tổ khác nhau)</small>
          </button>
          <button className={`scoring-mode-btn ${!isAvg ? 'active' : ''}`} onClick={() => !isAvg || onToggleScoringMode()}>
            🧮 Tổng điểm dồn
          </button>
        </div>
      )}
      <section className="race-hero panel">
        <div className="race-copy">
          <span>CHẶNG ĐUA TUẦN {week.number} ({isAvg ? 'XẾP HẠNG THEO ĐTB / HS' : 'XẾP HẠNG THEO TỔNG ĐIỂM'})</span>
          <h2>Tổ {teams[0].team} đang dẫn đầu</h2>
          <p>{formatShortDate(week.startDate)}–{formatShortDate(week.endDate)} · {daysRemaining > 0 ? `Còn ${daysRemaining} ngày để cùng nhau bứt phá!` : 'Tuần đã đến ngày chốt kết quả.'}</p>
        </div>
        <div className="race-podium">
          {teams.slice(0, 3).map((team, index) => (
            <div key={team.team} className={`podium-mini place-${index + 1}`}>
              <span>{index === 0 ? '👑' : `#${index + 1}`}</span>
              <strong>Tổ {team.team}</strong>
              <b>{isAvg ? `${team.weeklyAvg}đ` : team.weekly}</b>
              <small>{isAvg ? 'đ/HS' : 'điểm tuần'}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="team-card-grid">
        {teams.map((team, index) => {
          const scoreVal = isAvg ? team.weeklyAvg : team.weekly;
          const pct = Math.round((scoreVal / leadingScore) * 100);
          return (
            <section className={`panel team-detail team-detail-${team.team}`} key={team.team}>
              <div className="team-detail-head">
                <div className={`team-big-icon team-${team.team}`}>{index === 0 ? '👑' : team.team}</div>
                <div><span>HẠNG {index + 1} ({team.members} HS)</span><h3>Tổ {team.team}</h3></div>
                <div className="team-total">
                  <strong>{isAvg ? `${team.weeklyAvg} đ/HS` : team.weekly}</strong>
                  <span>{isAvg ? `Tổng ${team.weekly}đ · ${team.members} HS` : 'điểm tuần'}</span>
                </div>
              </div>
              <div className="team-progress">
                <div><span>Tiến độ chặng</span><b>{pct}%</b></div>
                <div className="progress-track"><i style={{ width: `${Math.max(0, pct)}%` }} /></div>
              </div>
              <div className="team-members">
                {students.filter((student) => student.team === team.team).map((student) => (
                  <div key={student.id}>
                    <Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="tiny" />
                    <span>{student.name.split(' ').slice(-2).join(' ')}</span>
                    <b>{student.weeklyScore > 0 ? '+' : ''}{student.weeklyScore}</b>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function RewardsPage({ students, rewards, canConfigure, onRedeem, onSaveRewards }: { students: Student[]; rewards: Reward[]; canConfigure: boolean; onRedeem: (studentId: number, rewardId: number) => void; onSaveRewards: (rewards: Reward[]) => void }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? 0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const selected = students.find((student) => student.id === studentId) ?? students[0];
  if (!selected) return <><PageHeading eyebrow="CỬA HÀNG NIỀM VUI" title="Điểm tốt hóa thành món quà nhỏ" description="Mỗi phần thưởng là một lời cảm ơn cho sự cố gắng và tiến bộ mỗi ngày." icon="🎁" /><div className="panel page-empty-state"><Gift size={31} /><strong>Chưa có học sinh trong lớp</strong><span>Giáo viên hãy nhập danh sách lớp thật trước khi sử dụng đổi thưởng.</span></div></>;
  return (
    <>
      <PageHeading eyebrow="CỬA HÀNG NIỀM VUI" title="Điểm tốt hóa thành món quà nhỏ" description="Mỗi phần thưởng là một lời cảm ơn cho sự cố gắng và tiến bộ mỗi ngày." icon="🎁" />
      <section className="reward-student panel">
        <div className="reward-student-info"><Avatar initials={selected.initials} gradient={selected.gradient} photo={selected.photo} /><div><span>ĐANG ĐỔI THƯỞNG CHO</span><select value={studentId} onChange={(event) => setStudentId(Number(event.target.value))}>{students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}</select></div></div>
        <div className="reward-student-actions">
          {canConfigure && <button className="reward-settings-button" onClick={() => setSettingsVisible(true)}><Settings size={17} /> Tùy chỉnh quà</button>}
          <div className="wallet"><Coins size={21} /><div><strong>{selected.score}</strong><span>điểm hiện có</span></div></div>
        </div>
      </section>
      <div className="reward-grid">
        {rewards.map((reward) => {
          const inStock = reward.stock === null || reward.stock > 0;
          const affordable = selected.score >= reward.cost && inStock;
          return (
            <article className="reward-card" key={reward.id}>
              <div className={`reward-icon ${reward.color}`}>{reward.icon}</div>
              <div className="reward-stock">{reward.stock === null ? 'Không giới hạn' : `Còn ${reward.stock}`}</div>
              <h3>{reward.name}</h3><p>{reward.description}</p>
              <div className="reward-footer"><strong><Star size={16} fill="currentColor" />{reward.cost}</strong><button disabled={!affordable} onClick={() => onRedeem(studentId, reward.id)}>{!inStock ? 'Đã hết quà' : affordable ? 'Đổi ngay' : 'Chưa đủ điểm'}</button></div>
            </article>
          );
        })}
      </div>
      {!rewards.length && <div className="panel reward-empty"><Gift size={27} /><strong>Chưa có phần thưởng</strong><span>Giáo viên hãy mở “Tùy chỉnh quà” để thêm món quà đầu tiên.</span></div>}
      {settingsVisible && <RewardSettings rewards={rewards} onSave={onSaveRewards} onClose={() => setSettingsVisible(false)} />}
    </>
  );
}

function RewardSettings({ rewards, onSave, onClose }: { rewards: Reward[]; onSave: (rewards: Reward[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Reward[]>(rewards.map((reward) => ({ ...reward })));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('30');
  const [icon, setIcon] = useState('🎁');
  const [stock, setStock] = useState('');
  const [color, setColor] = useState<typeof rewardColors[number]>('mint');
  const [error, setError] = useState('');
  const iconChoices = ['🎁', '⭐', '🏅', '🪑', '🎫', '📚', '✏️', '🎮', '👑', '🍭', '🏆', '💎'];
  const colorLabels: Record<typeof rewardColors[number], string> = {
    mint: 'Xanh bạc hà', sun: 'Vàng nắng', sky: 'Xanh trời', coral: 'Cam san hô', lavender: 'Tím nhạt', rose: 'Hồng',
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setCost('30');
    setIcon('🎁');
    setStock('');
    setColor('mint');
    setError('');
  };

  const editReward = (reward: Reward) => {
    setEditingId(reward.id);
    setName(reward.name);
    setDescription(reward.description);
    setCost(String(reward.cost));
    setIcon(reward.icon);
    setStock(reward.stock === null ? '' : String(reward.stock));
    setColor(rewardColors.includes(reward.color as typeof rewardColors[number]) ? reward.color as typeof rewardColors[number] : 'mint');
    setError('');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    const nextDescription = description.trim();
    const nextIcon = icon.trim();
    const pointValue = Number(cost);
    const stockValue = stock.trim() === '' ? null : Number(stock);
    if (!nextName) return setError('Vui lòng nhập tên phần thưởng.');
    if (!Number.isInteger(pointValue) || pointValue < 1 || pointValue > 9999) return setError('Số điểm phải là số nguyên từ 1 đến 9.999.');
    if (!nextIcon || nextIcon.length > 12) return setError('Biểu tượng không hợp lệ.');
    if (stockValue !== null && (!Number.isInteger(stockValue) || stockValue < 0 || stockValue > 999)) return setError('Số lượng phải từ 0 đến 999 hoặc để trống nếu không giới hạn.');
    if (editingId === null && draft.length >= 50) return setError('Danh mục chỉ lưu tối đa 50 phần thưởng.');
    if (draft.some((reward) => reward.id !== editingId && reward.name.toLocaleLowerCase('vi-VN') === nextName.toLocaleLowerCase('vi-VN'))) {
      return setError('Tên phần thưởng này đã có trong danh mục.');
    }
    const nextReward: Reward = {
      id: editingId ?? Math.max(Date.now(), ...draft.map((reward) => reward.id + 1)),
      name: nextName,
      description: nextDescription,
      cost: pointValue,
      icon: nextIcon,
      color,
      stock: stockValue,
    };
    setDraft((current) => editingId === null
      ? [...current, nextReward]
      : current.map((reward) => reward.id === editingId ? nextReward : reward));
    resetForm();
  };

  const removeReward = (reward: Reward) => {
    if (!window.confirm(`Xóa phần thưởng “${reward.name}” khỏi danh mục?`)) return;
    setDraft((current) => current.filter((item) => item.id !== reward.id));
    if (editingId === reward.id) resetForm();
  };

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="reward-settings-card" role="dialog" aria-modal="true" aria-labelledby="reward-settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="reward-settings-head">
          <div><span>DÀNH CHO GIÁO VIÊN</span><h2 id="reward-settings-title">Tùy chỉnh danh mục quà</h2><p>Thay đổi tên, biểu tượng, số điểm và số lượng; hoặc thêm phần thưởng mới cho lớp.</p></div>
          <button aria-label="Đóng tùy chỉnh phần thưởng" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="reward-settings-layout">
          <div className="reward-settings-list">
            <div className="reward-settings-list-head"><strong>Danh mục hiện tại</strong><span>{draft.length}/50 món quà</span></div>
            {draft.map((reward) => (
              <div className="reward-settings-row" key={reward.id}>
                <span className={`reward-settings-icon ${reward.color}`}>{reward.icon}</span>
                <div><strong>{reward.name}</strong><small><Star size={12} fill="currentColor" /> {reward.cost} điểm · {reward.stock === null ? 'Không giới hạn' : `Còn ${reward.stock}`}</small></div>
                <button aria-label={`Sửa ${reward.name}`} onClick={() => editReward(reward)}><Pencil size={15} /></button>
                <button aria-label={`Xóa ${reward.name}`} onClick={() => removeReward(reward)}><Trash2 size={15} /></button>
              </div>
            ))}
            {!draft.length && <p className="reward-settings-empty">Danh mục đang trống. Hãy thêm món quà mới.</p>}
          </div>
          <form className="reward-settings-form" onSubmit={submit}>
            <span>{editingId === null ? 'THÊM PHẦN THƯỞNG MỚI' : 'CHỈNH SỬA PHẦN THƯỞNG'}</span>
            <label><span>Tên phần thưởng *</span><input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Được chọn bài hát" /></label>
            <label><span>Mô tả ngắn</span><input value={description} maxLength={160} onChange={(event) => setDescription(event.target.value)} placeholder="Quyền lợi học sinh sẽ nhận được" /></label>
            <div className="reward-settings-form-grid">
              <label><span>Số điểm *</span><input type="number" min="1" max="9999" step="1" value={cost} onChange={(event) => setCost(event.target.value)} /></label>
              <label><span>Số lượng</span><input type="number" min="0" max="999" step="1" value={stock} onChange={(event) => setStock(event.target.value)} placeholder="Không giới hạn" /></label>
              <label><span>Màu thẻ</span><select value={color} onChange={(event) => setColor(event.target.value as typeof rewardColors[number])}>{rewardColors.map((item) => <option value={item} key={item}>{colorLabels[item]}</option>)}</select></label>
            </div>
            <label><span>Biểu tượng / emoji *</span><input value={icon} maxLength={12} onChange={(event) => setIcon(event.target.value)} aria-label="Biểu tượng phần thưởng" /></label>
            <div className="reward-icon-picker" aria-label="Gợi ý biểu tượng">{iconChoices.map((item) => <button type="button" className={icon === item ? 'active' : ''} key={item} onClick={() => setIcon(item)}>{item}</button>)}</div>
            <div className="reward-settings-preview"><span className={`reward-icon ${color}`}>{icon.trim() || '🎁'}</span><div><strong>{name.trim() || 'Phần thưởng mới'}</strong><small>{cost || '0'} điểm · {stock.trim() === '' ? 'Không giới hạn' : `Còn ${stock}`}</small></div></div>
            {error && <p className="reward-settings-error">{error}</p>}
            <div className="reward-settings-form-actions">
              {editingId !== null && <button type="button" onClick={resetForm}>Hủy sửa</button>}
              <button type="submit"><Plus size={16} /> {editingId === null ? 'Thêm vào danh mục' : 'Cập nhật món quà'}</button>
            </div>
          </form>
        </div>
        <footer className="reward-settings-actions">
          <button onClick={() => { setDraft(initialRewards.map((reward) => ({ ...reward }))); resetForm(); }}><RotateCcw size={16} /> Khôi phục mặc định</button>
          <button onClick={() => { onSave(draft); onClose(); }}><Check size={17} /> Lưu danh mục</button>
        </footer>
      </section>
    </div>
  );
}

type RandomMode = 'wheel' | 'groups';
type SecretGroupPhase = 'idle' | 'countdown' | 'shuffling' | 'revealing' | 'complete';

function RandomPage({ students, teamCount, onApplyTeams }: { students: Student[]; teamCount: number; onApplyTeams: (assignments: Array<Pick<Student, 'id' | 'team'>>, teamCount: number) => void }) {
  const [mode, setMode] = useState<RandomMode>('wheel');
  return (
    <>
      <PageHeading eyebrow="SÂN KHẤU NGẪU NHIÊN" title={mode === 'wheel' ? 'Vòng quay vinh quang' : 'Chia tổ bí mật'} description={mode === 'wheel' ? 'Mỗi lượt quay là một khoảnh khắc bất ngờ và đầy hứng khởi của lớp học.' : 'Xúc xắc đã gieo — đồng đội của em là ai?'} icon={mode === 'wheel' ? '🏆' : '🎲'} />
      <div className="random-mode-switch" role="tablist" aria-label="Chọn trò chơi ngẫu nhiên">
        <button type="button" role="tab" aria-selected={mode === 'wheel'} className={mode === 'wheel' ? 'active' : ''} onClick={() => setMode('wheel')}><Sparkles size={18} /><span>Vòng quay cá nhân</span></button>
        <button type="button" role="tab" aria-selected={mode === 'groups'} className={mode === 'groups' ? 'active' : ''} onClick={() => setMode('groups')}><Dices size={19} /><span>Chia tổ bí mật</span><i>MỚI</i></button>
      </div>
      {mode === 'wheel'
        ? <div className="random-legacy-shell"><LegacyRandomPage students={students} teamCount={teamCount} /></div>
        : <SecretGroupsPage students={students} initialTeamCount={teamCount} onApplyTeams={onApplyTeams} />}
    </>
  );
}

function SecretGroupsPage({ students, initialTeamCount, onApplyTeams }: { students: Student[]; initialTeamCount: number; onApplyTeams: (assignments: Array<Pick<Student, 'id' | 'team'>>, teamCount: number) => void }) {
  const [groupCount, setGroupCount] = useState(Math.min(8, Math.max(2, initialTeamCount)));
  const [groupScope, setGroupScope] = useState<'present' | 'all'>('present');
  const [secretGroups, setSecretGroups] = useState<Student[][]>([]);
  const [secretPhase, setSecretPhase] = useState<SecretGroupPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [revealedRows, setRevealedRows] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [resultSaved, setResultSaved] = useState(false);
  const [isPresentation, setIsPresentation] = useState(false);
  const stageRef = useRef<HTMLElement | null>(null);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);
  const groupTimersRef = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const groupPool = useMemo(() => students.filter((student) => groupScope === 'all' || student.attendance === 'present'), [students, groupScope]);
  const groupBusy = secretPhase === 'countdown' || secretPhase === 'shuffling' || secretPhase === 'revealing';
  const maxGroupRows = Math.max(0, ...secretGroups.map((group) => group.length));
  const groupColors = ['#f05f76', '#8b62df', '#31aa91', '#f2a72f', '#438bd8', '#dc6fb0', '#45a7bd', '#7caf48'];

  const stopSpinAudio = () => {
    if (!spinAudioRef.current) return;
    spinAudioRef.current.pause();
    spinAudioRef.current.currentTime = 0;
  };
  const clearGroupTimers = () => {
    groupTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    groupTimersRef.current = [];
  };
  const scheduleGroupStep = (callback: () => void, delay: number) => {
    groupTimersRef.current.push(window.setTimeout(callback, delay));
  };
  const prepareAudioContext = () => {
    if (!soundEnabled) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    void audioContextRef.current.resume().catch(() => undefined);
    return audioContextRef.current;
  };
  const playRevealTick = (emphasis = false) => {
    if (!soundEnabled) return;
    const context = prepareAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = emphasis ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(emphasis ? 880 : 620, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(emphasis ? 1320 : 780, context.currentTime + .11);
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(emphasis ? .16 : .075, context.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .14);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .15);
  };
  const resetSecretStage = () => {
    clearGroupTimers();
    stopSpinAudio();
    setSecretGroups([]);
    setSecretPhase('idle');
    setCountdown(3);
    setRevealedRows(0);
    setResultSaved(false);
  };

  useEffect(() => () => {
    clearGroupTimers();
    stopSpinAudio();
    if (victoryAudioRef.current) {
      victoryAudioRef.current.pause();
      victoryAudioRef.current.currentTime = 0;
    }
    if (audioContextRef.current) void audioContextRef.current.close().catch(() => undefined);
  }, []);
  useEffect(() => {
    const syncFullscreen = () => setIsPresentation(document.fullscreenElement === stageRef.current);
    const closeFallbackWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) setIsPresentation(false);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('keydown', closeFallbackWithEscape);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('keydown', closeFallbackWithEscape);
    };
  }, []);

  const startSecretGroups = () => {
    if (groupBusy || groupPool.length < 2) return;
    clearGroupTimers();
    stopSpinAudio();
    if (victoryAudioRef.current) {
      victoryAudioRef.current.pause();
      victoryAudioRef.current.currentTime = 0;
    }
    const shuffled = shuffleStudentsSecurely(groupPool);
    const nextGroups = Array.from({ length: groupCount }, () => [] as Student[]);
    shuffled.forEach((student, index) => nextGroups[index % groupCount].push(student));
    const rowCount = Math.max(0, ...nextGroups.map((group) => group.length));
    setSecretGroups(nextGroups);
    setSecretPhase('countdown');
    setCountdown(3);
    setRevealedRows(0);
    setResultSaved(false);
    prepareAudioContext();
    scheduleGroupStep(() => setCountdown(2), 700);
    scheduleGroupStep(() => setCountdown(1), 1400);
    scheduleGroupStep(() => {
      setSecretPhase('shuffling');
      const audio = spinAudioRef.current;
      if (audio && soundEnabled) {
        audio.currentTime = 0;
        audio.volume = .45;
        void audio.play().catch(() => undefined);
      }
    }, 2050);
    const revealStart = 4050;
    scheduleGroupStep(() => {
      stopSpinAudio();
      setSecretPhase('revealing');
    }, revealStart);
    for (let row = 1; row <= rowCount; row += 1) {
      const isLast = row === rowCount;
      scheduleGroupStep(() => {
        setRevealedRows(row);
        playRevealTick(isLast);
      }, revealStart + (row - 1) * 560);
    }
    scheduleGroupStep(() => {
      setSecretPhase('complete');
      const audio = victoryAudioRef.current;
      if (audio && soundEnabled) {
        audio.currentTime = 0;
        audio.volume = .78;
        void audio.play().catch(() => undefined);
      }
    }, revealStart + Math.max(1, rowCount) * 560 + 500);
  };
  const saveSecretGroups = () => {
    if (secretPhase !== 'complete' || !secretGroups.length) return;
    const assignments = secretGroups.flatMap((group, groupIndex) => group.map((student) => ({ id: student.id, team: groupIndex + 1 })));
    const scopeNote = assignments.length < students.length ? `\n\n${students.length - assignments.length} học sinh không tham gia lượt chia sẽ giữ nguyên tổ hiện tại.` : '';
    if (!window.confirm(`Lưu kết quả này làm ${groupCount} tổ chính thức?${scopeNote}`)) return;
    onApplyTeams(assignments, groupCount);
    setResultSaved(true);
  };
  const togglePresentation = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (isPresentation) {
      setIsPresentation(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      return;
    }
    setIsPresentation(true);
    if (stage.requestFullscreen) await stage.requestFullscreen().catch(() => undefined);
  };
  const phaseMessage = secretPhase === 'countdown'
    ? 'Chuẩn bị gieo xúc xắc…'
    : secretPhase === 'shuffling'
      ? 'Đang xáo trộn những người đồng đội…'
      : secretPhase === 'revealing'
        ? `Đang mở bí mật ${Math.min(revealedRows, maxGroupRows)}/${maxGroupRows}`
        : secretPhase === 'complete'
          ? `${groupPool.length} học sinh đã tìm thấy đồng đội!`
          : 'Kết quả chỉ được lưu khi giáo viên xác nhận.';

  return (
    <section ref={stageRef} className={`random-stage secret-group-stage panel ${isPresentation ? 'is-presentation' : ''}`}>
      <audio ref={spinAudioRef} src={spinWheelSound} preload="auto" aria-hidden="true" />
      <audio ref={victoryAudioRef} src={victorySound} preload="auto" aria-hidden="true" />
      <div className="random-settings secret-group-settings">
        <label><span>Số lượng tổ</span><select aria-label="Số lượng tổ ngẫu nhiên" value={groupCount} disabled={groupBusy} onChange={(event) => { resetSecretStage(); setGroupCount(Number(event.target.value)); }}>{Array.from({ length: 7 }, (_, index) => index + 2).map((count) => <option key={count} value={count}>{count} tổ</option>)}</select></label>
        <div className="secret-scope"><span>Phạm vi chia</span><div className="filter-tabs"><button type="button" className={groupScope === 'present' ? 'active' : ''} disabled={groupBusy} onClick={() => { resetSecretStage(); setGroupScope('present'); }}>Học sinh có mặt</button><button type="button" className={groupScope === 'all' ? 'active' : ''} disabled={groupBusy} onClick={() => { resetSecretStage(); setGroupScope('all'); }}>Cả lớp</button></div></div>
        <p><UserRoundCheck size={17} /><strong>{groupPool.length}</strong> học sinh · chênh lệch tối đa 1 em</p>
        <button className="random-sound-button" type="button" onClick={() => setSoundEnabled((current) => !current)} aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}>{soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
        <button className="random-presentation-button" type="button" onClick={() => void togglePresentation()} aria-label={isPresentation ? 'Thoát trình chiếu toàn màn hình' : 'Trình chiếu toàn màn hình'}>{isPresentation ? <Minimize2 size={18} /> : <Maximize2 size={18} />}<span>{isPresentation ? 'Thu nhỏ' : 'Phóng to'}</span></button>
      </div>
      <div className={`secret-groups-arena phase-${secretPhase}`} aria-live="polite">
        <div className="secret-stage-lights" aria-hidden="true"><i /><i /><i /><i /></div>
        {secretPhase === 'idle' ? (
          <div className="secret-group-intro">
            <div className="secret-dice-orbit"><span>?</span><Dices size={56} /><i>✦</i><i>★</i></div>
            <span className="secret-kicker">SÂN KHẤU ĐÃ SẴN SÀNG</span>
            <h2>Xúc xắc đã gieo,<br />đồng đội của em là ai?</h2>
            <p>Ảnh và tên sẽ được mở bí mật từng lượt để cả lớp cùng hồi hộp chờ đợi.</p>
            <div className="secret-fairness"><Check size={17} /><span>Không trùng học sinh</span><Check size={17} /><span>Chia đều số lượng</span><Check size={17} /><span>Chưa đổi tổ chính thức</span></div>
          </div>
        ) : (
          <>
            <div className={`secret-status phase-${secretPhase}`}><span>{secretPhase === 'complete' ? '🎉' : '🎲'}</span><strong>{phaseMessage}</strong></div>
            <div className="secret-groups-board" style={{ '--secret-group-count': groupCount } as CSSProperties}>
              {secretGroups.map((group, groupIndex) => (
                <article className="secret-group-column" key={groupIndex} style={{ '--secret-color': groupColors[groupIndex % groupColors.length], '--secret-delay': `${groupIndex * 70}ms` } as CSSProperties}>
                  <header><span>{groupIndex + 1}</span><div><small>ĐỘI NGŨ BÍ MẬT</small><strong>Tổ {groupIndex + 1}</strong></div><b>{group.length} HS</b></header>
                  <div className="secret-member-list">
                    {group.map((student, rowIndex) => {
                      const revealed = rowIndex < revealedRows;
                      return <div className={`secret-member-card ${revealed ? 'is-revealed' : 'is-hidden'} ${secretPhase === 'shuffling' ? 'is-shuffling' : ''}`} key={student.id} style={{ '--member-delay': `${groupIndex * 55}ms` } as CSSProperties}>{revealed ? <><Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="small" /><div><small>THÀNH VIÊN {rowIndex + 1}</small><strong>{student.name}</strong></div><span className="secret-reveal-star">✦</span></> : <><span className="secret-mystery-dice"><Dices size={22} /></span><div><small>THÀNH VIÊN {rowIndex + 1}</small><strong>?????</strong></div><span className="secret-question">?</span></>}</div>;
                    })}
                  </div>
                </article>
              ))}
            </div>
            {secretPhase === 'countdown' && <div className="secret-countdown"><span>CHUẨN BỊ</span><strong key={countdown}>{countdown}</strong><small>Ai sẽ là đồng đội của em?</small></div>}
            {secretPhase === 'shuffling' && <div className="secret-shuffle-banner"><div><Dices size={38} /><Dices size={28} /></div><strong>ĐANG XÁO TRỘN…</strong><span>Giữ bí mật nhé!</span></div>}
            {secretPhase === 'complete' && <><div className="secret-complete-burst" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ '--burst-index': index } as CSSProperties} />)}</div><div className="secret-complete-ribbon"><PartyPopper size={22} /><strong>ĐÃ TÌM THẤY ĐỒNG ĐỘI!</strong><PartyPopper size={22} /></div></>}
          </>
        )}
      </div>
      <div className="secret-group-actions">
        <button className="secret-start-button" type="button" onClick={startSecretGroups} disabled={groupBusy || groupPool.length < 2}><Dices size={22} />{groupBusy ? phaseMessage : secretPhase === 'complete' ? 'CHIA LẠI MỘT LƯỢT' : 'BẮT ĐẦU CHIA TỔ'}</button>
        {secretPhase === 'complete' && <button className={`secret-save-button ${resultSaved ? 'is-saved' : ''}`} type="button" onClick={saveSecretGroups} disabled={resultSaved}><Save size={20} />{resultSaved ? 'Đã lưu tổ chính thức' : 'Lưu làm tổ chính thức'}</button>}
      </div>
      <p className="secret-group-note">{groupPool.length < 2 ? 'Cần ít nhất 2 học sinh trong phạm vi đã chọn.' : resultSaved ? 'Kết quả đã được cập nhật vào hồ sơ lớp. Có thể hoàn tác tại trang Thi đua tổ.' : '🔒 Kết quả hiện chỉ là bản xem trước, chưa làm thay đổi tổ hiện tại.'}</p>
    </section>
  );
}

function LegacyRandomPage({ students, teamCount }: { students: Student[]; teamCount: number }) {
  const [team, setTeam] = useState(0);
  const [winner, setWinner] = useState<Student | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isPresentation, setIsPresentation] = useState(false);
  const stageRef = useRef<HTMLElement | null>(null);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);
  const spinTimerRef = useRef<number | undefined>(undefined);
  const pool = students.filter((student) => student.attendance === 'present' && (!team || student.team === team));
  const wheelColors = ['#ff6b6b', '#ff9f43', '#ffd93d', '#5ed6a8', '#39bde5', '#5f7bea', '#8b65e8', '#e76bb2', '#ff7f6e', '#70c95b', '#42c7c7', '#f2a83b'];
  const slice = pool.length ? 360 / pool.length : 360;
  const wheelDensity = pool.length <= 12 ? 'roomy' : pool.length <= 22 ? 'compact' : pool.length <= 48 ? 'dense' : 'crowded';
  const wheelMarkerSize = Math.max(15, Math.min(22, Math.floor(880 / Math.max(pool.length, 1))));
  const wheelBackground = pool.length
    ? `conic-gradient(from -90deg, ${pool.map((_, index) => `${wheelColors[index % wheelColors.length]} ${index * slice}deg ${(index + 1) * slice}deg`).join(', ')})`
    : '#e9e4f8';
  useEffect(() => () => {
    if (spinTimerRef.current !== undefined) window.clearTimeout(spinTimerRef.current);
    if (spinAudioRef.current) {
      spinAudioRef.current.pause();
      spinAudioRef.current.currentTime = 0;
    }
    if (victoryAudioRef.current) {
      victoryAudioRef.current.pause();
      victoryAudioRef.current.currentTime = 0;
    }
  }, []);
  useEffect(() => {
    const syncFullscreen = () => {
      if (document.fullscreenElement) setIsPresentation(document.fullscreenElement === stageRef.current);
      else setIsPresentation(false);
    };
    const closeFallbackWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) setIsPresentation(false);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('keydown', closeFallbackWithEscape);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('keydown', closeFallbackWithEscape);
    };
  }, []);
  const spin = () => {
    if (spinning || !pool.length) return;
    const winnerIndex = Math.floor(Math.random() * pool.length);
    const targetCenter = winnerIndex * slice + slice / 2;
    setSpinning(true);
    setWinner(null);
    setRotation((current) => current + 1800 + ((360 - targetCenter - (current % 360) + 360) % 360));
    const audio = spinAudioRef.current;
    const victoryAudio = victoryAudioRef.current;
    if (victoryAudio) {
      victoryAudio.pause();
      victoryAudio.currentTime = 0;
    }
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.72;
      void audio.play().catch(() => undefined);
    }
    spinTimerRef.current = window.setTimeout(() => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setWinner(pool[winnerIndex]);
      setSpinning(false);
      if (victoryAudio) {
        victoryAudio.currentTime = 0;
        victoryAudio.volume = 0.82;
        void victoryAudio.play().catch(() => undefined);
      }
      spinTimerRef.current = undefined;
    }, 4300);
  };
  const changeTeam = (item: number) => {
    if (spinning) return;
    setTeam(item);
    setWinner(null);
    setRotation(0);
  };
  const togglePresentation = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (isPresentation) {
      setIsPresentation(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      return;
    }
    setIsPresentation(true);
    if (stage.requestFullscreen) await stage.requestFullscreen().catch(() => undefined);
  };
  return (
    <>
      <PageHeading eyebrow="GỌI TÊN NGẪU NHIÊN" title="Vòng quay vinh quang" description="Mỗi lượt quay là một khoảnh khắc bất ngờ và đầy hứng khởi của lớp học." icon="🏆" />
      <section ref={stageRef} className={`random-stage panel ${isPresentation ? 'is-presentation' : ''}`}>
        <audio className="spin-wheel-audio" ref={spinAudioRef} src={spinWheelSound} preload="auto" aria-hidden="true" />
        <audio className="victory-audio" ref={victoryAudioRef} src={victorySound} preload="auto" aria-hidden="true" />
        <div className="random-settings"><span>Phạm vi lựa chọn</span><div className="filter-tabs">{[0, ...getTeamNumbers(teamCount)].map((item) => <button key={item} disabled={spinning} className={team === item ? 'active' : ''} onClick={() => changeTeam(item)}>{item === 0 ? 'Cả lớp' : `Tổ ${item}`}</button>)}</div><p><UserRoundCheck size={17} /> {pool.length} học sinh đang có mặt sẽ tham gia</p><button className="random-presentation-button" onClick={() => void togglePresentation()} aria-label={isPresentation ? 'Thoát trình chiếu toàn màn hình' : 'Trình chiếu toàn màn hình'}>{isPresentation ? <Minimize2 size={18} /> : <Maximize2 size={18} />}<span>{isPresentation ? 'Thu nhỏ' : 'Phóng to'}</span></button></div>
        <div className={`wheel-showcase ${winner ? 'has-winner' : ''}`}>
          <div className="wheel-sparkles" aria-hidden="true"><i>✦</i><i>★</i><i>✦</i><i>●</i></div>
          <div className="wheel-pointer"><span>▼</span></div>
          <div className="wheel-stand">
            <div
              className={`student-wheel wheel-density-${wheelDensity} ${spinning ? 'is-spinning' : ''}`}
              style={{ '--wheel-rotation': `${rotation}deg`, '--wheel-slice': `${slice}deg`, '--wheel-marker-size': `${wheelMarkerSize}px`, background: wheelBackground } as CSSProperties}
            >
              <div className="wheel-rim" />
              {wheelDensity !== 'crowded' && pool.map((student, index) => {
                const personAngle = index * slice + slice / 2;
                return (
                  <div
                    className="wheel-person-shell"
                    key={student.id}
                    style={{ '--person-angle': `${personAngle}deg`, '--wheel-rotation': `${rotation}deg` } as CSSProperties}
                  >
                    <div className="wheel-person-card" title={`${index + 1}. ${student.name}`}>
                      {wheelDensity === 'dense'
                        ? <span className="wheel-person-number">{index + 1}</span>
                        : <><Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="tiny" /><span>{student.name.split(' ').slice(wheelDensity === 'compact' ? -1 : -2).join(' ')}</span></>}
                    </div>
                  </div>
                );
              })}
              <div className={`wheel-center-core ${spinning ? 'is-spinning' : ''}`}>
                {spinning ? <><Sparkles size={28} /><strong>ĐANG QUAY</strong><small>Ai sẽ được gọi?</small></> : winner ? <><Sparkles size={25} /><span>XIN MỜI</span><strong>{winner.name.split(' ').slice(-2).join(' ')}</strong></> : <><Wand2 size={29} /><strong>SẴN SÀNG!</strong><small>{pool.length} học sinh tham gia</small></>}
              </div>
            </div>
            <div className="wheel-pedestal"><i /><span>VÒNG QUAY MAY MẮN</span></div>
          </div>
          {winner && !spinning && <div className="winner-banner"><div className="winner-portrait"><Avatar initials={winner.initials} gradient={winner.gradient} photo={winner.photo} size="xlarge" /></div><div className="winner-copy"><span>Chúc mừng, xin mời</span><strong>{winner.name}</strong><small>Tổ {winner.team} · {winner.score} điểm</small></div><PartyPopper className="winner-party" size={26} /></div>}
          {winner && !spinning && <div className="wheel-fireworks" aria-hidden="true">{[0, 1, 2].map((burst) => <span className={`wheel-firework burst-${burst + 1}`} key={burst}>{Array.from({ length: 12 }, (_, ray) => <i key={ray} style={{ '--firework-ray': ray, '--firework-color': (ray + burst * 3) % 12 } as CSSProperties} />)}</span>)}</div>}
          {winner && !spinning && <div className="wheel-confetti" aria-hidden="true">{Array.from({ length: 20 }, (_, index) => <i key={index} style={{ '--confetti-index': index, '--confetti-drift': `${(index - 10) * 8}px`, left: `${(index * 47) % 100}%`, animationDelay: `${(index % 6) * .06}s` } as CSSProperties} />)}</div>}
        </div>
        <button className="spin-button" onClick={spin} disabled={spinning || !pool.length}><Sparkles size={21} />{spinning ? 'Vòng quay đang chạy...' : winner ? 'Quay thêm một lượt' : 'QUAY NGAY!'}</button>
        <p className="wheel-tip">🎉 Mỗi học sinh có cơ hội được chọn như nhau</p>
      </section>
    </>
  );
}

function AttendancePage({ students, classCode, attendanceHistory, weekState, weeklyScoring, onUpdate, onUpdateBulk, onComplete, onToast }: { students: Student[]; classCode: string; attendanceHistory: AttendanceRecord[]; weekState: WeekState; weeklyScoring: WeeklyScoringSettings; onUpdate: (id: number, status: AttendanceStatus, date?: string) => void; onUpdateBulk: (statuses: Record<number, AttendanceStatus>, date: string) => void; onComplete: (date: string) => void; onToast: (message: string) => void }) {
  const todayKey = toLocalDateInput(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [viewWeekStart, setViewWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return toLocalDateInput(d);
  });
  const [statsTab, setStatsTab] = useState<'week' | 'month'>('week');
  const isToday = selectedDate === todayKey;

  const studyDays = weekState.current.studyDays === 6 ? 6 : 5;
  const weekDates = Array.from({ length: studyDays }, (_, i) => addDays(viewWeekStart, i));
  const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const todayRecord = attendanceHistory.find((r) => r.date === selectedDate);
  const getStudentStatus = (studentId: number): AttendanceStatus => {
    if (todayRecord) return todayRecord.records[studentId] ?? 'present';
    if (isToday) return students.find((s) => s.id === studentId)?.attendance ?? 'present';
    return 'present';
  };

  const countStatus = (status: AttendanceStatus) => students.filter((s) => getStudentStatus(s.id) === status).length;

  const selectedDateDisplay = (() => {
    const d = dateFromInput(selectedDate);
    return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  })();

  const handleSetAllPresent = () => {
    const statuses = Object.fromEntries(students.map((s) => [s.id, 'present' as AttendanceStatus]));
    onUpdateBulk(statuses, selectedDate);
    onToast(`Đã đánh dấu cả lớp có mặt ngày ${formatShortDate(selectedDate)}`);
  };

  const handleStartDay = () => {
    const statuses = Object.fromEntries(students.map((s) => [s.id, 'present' as AttendanceStatus]));
    onUpdateBulk(statuses, selectedDate);
    onToast(`Đã bắt đầu điểm danh ngày ${formatShortDate(selectedDate)}`);
  };

  const handleComplete = () => {
    onComplete(selectedDate);
    onToast(isToday ? 'Đã hoàn tất điểm danh hôm nay' : `Đã hoàn tất điểm danh ngày ${formatShortDate(selectedDate)}`);
  };

  // Stats calculations
  const currentMonth = selectedDate.slice(0, 7);
  const monthRecords = attendanceHistory.filter((r) => r.date.startsWith(currentMonth));

  const getStudentMonthStats = (studentId: number) => {
    let present = 0, late = 0, excused = 0, absent = 0;
    for (const record of monthRecords) {
      const status = record.records[studentId];
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else if (status === 'excused') excused++;
      else if (status === 'absent') absent++;
    }
    return { present, late, excused, absent, total: present + late + excused + absent };
  };

  const classMonthRate = (() => {
    if (!monthRecords.length || !students.length) return 0;
    let total = 0, presentCount = 0;
    for (const record of monthRecords) {
      for (const student of students) {
        total++;
        const status = record.records[student.id];
        if (status === 'present' || status === 'late') presentCount++;
      }
    }
    return total > 0 ? Math.round((presentCount / total) * 100) : 0;
  })();

  const topPresent = [...students]
    .map((s) => ({ ...s, stats: getStudentMonthStats(s.id) }))
    .sort((a, b) => (b.stats.present + b.stats.late) - (a.stats.present + a.stats.late))
    .slice(0, 3);

  const topAbsent = [...students]
    .map((s) => ({ ...s, stats: getStudentMonthStats(s.id) }))
    .filter((s) => s.stats.absent + s.stats.excused > 0)
    .sort((a, b) => (b.stats.absent + b.stats.excused) - (a.stats.absent + a.stats.excused))
    .slice(0, 3);

  return (
    <>
      <PageHeading eyebrow="CHUYÊN CẦN" title="Điểm danh nhanh, quan tâm kịp lúc" description={selectedDateDisplay.charAt(0).toUpperCase() + selectedDateDisplay.slice(1)} icon="📅" />

      {/* Date Picker Bar */}
      <section className="attendance-date-bar">
        <button className="attendance-date-nav" onClick={() => setViewWeekStart(addDays(viewWeekStart, -7))} aria-label="Tuần trước"><ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} /></button>
        <div className="attendance-date-list">
          {weekDates.map((date) => {
            const dayOfWeek = dateFromInput(date).getDay();
            const label = weekDayLabels[dayOfWeek];
            const record = attendanceHistory.find((r) => r.date === date);
            const isSelected = date === selectedDate;
            const isTodayDate = date === todayKey;
            const isFuture = date > todayKey;
            return (
              <button
                key={date}
                className={`attendance-date-item${isSelected ? ' selected' : ''}${isTodayDate ? ' today' : ''}${isFuture ? ' future' : ''}`}
                onClick={() => !isFuture && setSelectedDate(date)}
                disabled={isFuture}
              >
                <span className="attendance-date-weekday">{label}</span>
                <span className="attendance-date-day">{formatShortDate(date)}</span>
                {record && <span className={`attendance-date-dot${record.completedAt ? ' completed' : ''}`}>{record.completedAt ? '✓' : '•'}</span>}
                {isTodayDate && <span className="attendance-date-today-badge">Hôm nay</span>}
              </button>
            );
          })}
        </div>
        <button className="attendance-date-nav" onClick={() => setViewWeekStart(addDays(viewWeekStart, 7))} aria-label="Tuần sau"><ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} /></button>
      </section>

      {/* Viewing banner */}
      {!isToday && (
        <div className="attendance-viewing-banner">
          <CalendarCheck2 size={17} />
          <span>Đang xem điểm danh ngày <strong>{selectedDateDisplay}</strong></span>
          <button onClick={() => setSelectedDate(todayKey)}>Về hôm nay</button>
        </div>
      )}

      {/* Summary for selected date */}
      <section className="attendance-summary">
        {(['present', 'late', 'excused', 'absent'] as AttendanceStatus[]).map((status) => <div className={`attendance-stat ${status}`} key={status}><span>{status === 'present' ? '✓' : status === 'late' ? '⏱' : status === 'excused' ? '✉' : '!'}</span><div><strong>{countStatus(status)}</strong><small>{attendanceLabels[status]}</small></div></div>)}
      </section>

      {/* Attendance list or empty state */}
      {!todayRecord && !isToday ? (
        <section className="panel attendance-empty-day">
          <CalendarCheck2 size={36} />
          <strong>Chưa có dữ liệu điểm danh</strong>
          <p>Ngày {selectedDateDisplay} chưa được điểm danh.</p>
          <button className="button button-primary" onClick={handleStartDay}><Plus size={17} /> Bắt đầu điểm danh ngày này</button>
        </section>
      ) : (
        <section className="panel attendance-panel">
          <div className="attendance-toolbar"><div><h3>Danh sách lớp {classCode}</h3><p>Chạm vào trạng thái để thay đổi</p></div><button className="button button-soft" onClick={handleSetAllPresent}><Check size={17} /> Cả lớp có mặt</button></div>
          <div className="attendance-list">
            {students.map((student, index) => {
              const currentStatus = getStudentStatus(student.id);
              return (
                <div className="attendance-row" key={student.id}>
                  <span className="student-number">{String(index + 1).padStart(2, '0')}</span><Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="small" /><div className="attendance-name"><strong>{student.name}</strong><span>Tổ {student.team} · {student.role}</span></div>
                  <div className="attendance-options">{(['present', 'late', 'excused', 'absent'] as AttendanceStatus[]).map((status) => <button key={status} className={currentStatus === status ? `active ${status}` : ''} onClick={() => onUpdate(student.id, status, selectedDate)}><i />{attendanceLabels[status]}</button>)}</div>
                </div>
              );
            })}
          </div>
          <div className="attendance-save"><span><ShieldCheck size={18} /> Dữ liệu được tự động lưu trên thiết bị</span><button className="button button-primary" onClick={handleComplete}>Hoàn tất điểm danh <Check size={17} /></button></div>
        </section>
      )}

      {/* Statistics section */}
      {attendanceHistory.length > 0 && (
        <section className="panel attendance-stats-section">
          <div className="attendance-stats-header">
            <div><span>THỐNG KÊ CHUYÊN CẦN</span><h3>Báo cáo theo {statsTab === 'week' ? 'tuần' : 'tháng'}</h3></div>
            <div className="attendance-stats-tabs">
              <button className={statsTab === 'week' ? 'active' : ''} onClick={() => setStatsTab('week')}>Tuần</button>
              <button className={statsTab === 'month' ? 'active' : ''} onClick={() => setStatsTab('month')}>Tháng</button>
            </div>
          </div>

          {statsTab === 'week' ? (
            <div className="attendance-weekly-grid">
              <div className="attendance-weekly-header">
                <div className="attendance-weekly-cell name-cell">Học sinh</div>
                {weekDates.filter((d) => d <= todayKey).map((date) => {
                  const dayOfWeek = dateFromInput(date).getDay();
                  return <div className="attendance-weekly-cell day-cell" key={date}>{weekDayLabels[dayOfWeek]}<small>{formatShortDate(date)}</small></div>;
                })}
                <div className="attendance-weekly-cell total-cell">Có mặt</div>
              </div>
              {students.map((student) => {
                const daysInView = weekDates.filter((d) => d <= todayKey);
                let presentDays = 0;
                return (
                  <div className="attendance-weekly-row" key={student.id}>
                    <div className="attendance-weekly-cell name-cell"><strong>{student.name}</strong></div>
                    {daysInView.map((date) => {
                      const record = attendanceHistory.find((r) => r.date === date);
                      const status = record?.records[student.id] ?? (date === todayKey ? student.attendance : undefined);
                      if (status === 'present' || status === 'late') presentDays++;
                      const icon = status === 'present' ? '✓' : status === 'late' ? '⏱' : status === 'excused' ? '✉' : status === 'absent' ? '✗' : '—';
                      return <div className={`attendance-weekly-cell day-cell ${status ?? 'none'}`} key={date}>{icon}</div>;
                    })}
                    <div className="attendance-weekly-cell total-cell"><strong>{presentDays}/{daysInView.length}</strong></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="attendance-monthly-summary">
              <div className="attendance-monthly-rate">
                <div className="attendance-monthly-rate-circle">
                  <strong>{classMonthRate}%</strong>
                  <small>chuyên cần</small>
                </div>
                <div>
                  <h4>Tỷ lệ chuyên cần cả lớp</h4>
                  <p>{formatMonthKey(currentMonth)} · {monthRecords.length} ngày đã điểm danh</p>
                  <div className="attendance-bar"><div className="attendance-bar-fill" style={{ width: `${classMonthRate}%` }} /></div>
                </div>
              </div>

              {topPresent.length > 0 && (
                <div className="attendance-monthly-top">
                  <h4>🌟 Chuyên cần tốt nhất</h4>
                  {topPresent.map((s, i) => (
                    <div className="attendance-monthly-row" key={s.id}>
                      <span className="attendance-monthly-rank">{i + 1}</span>
                      <Avatar initials={s.initials} gradient={s.gradient} photo={s.photo} size="small" />
                      <div><strong>{s.name}</strong><small>Có mặt {s.stats.present + s.stats.late}/{s.stats.total} ngày</small></div>
                    </div>
                  ))}
                </div>
              )}

              {topAbsent.length > 0 && (
                <div className="attendance-monthly-top attention">
                  <h4>⚠️ Cần quan tâm</h4>
                  {topAbsent.map((s, i) => (
                    <div className="attendance-monthly-row" key={s.id}>
                      <span className="attendance-monthly-rank">{i + 1}</span>
                      <Avatar initials={s.initials} gradient={s.gradient} photo={s.photo} size="small" />
                      <div><strong>{s.name}</strong><small>Nghỉ {s.stats.absent + s.stats.excused}/{s.stats.total} ngày</small></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function HonorsPage({ students, week, scoring }: { students: Student[]; week: WeekPeriod; scoring: WeeklyScoringSettings }) {
  const ranked = [...students].sort((a, b) => b.weeklyScore - a.weeklyScore);
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  return (
    <>
      <PageHeading eyebrow="BẢNG VÀNG DANH DỰ" title="Tỏa sáng theo cách của riêng mình" description="Tôn vinh nỗ lực, sự tiến bộ và những giá trị tốt đẹp của mỗi học sinh." icon="🏆" />
      <section className="honor-stage">
        <div className="honor-rays" />
        <span className="honor-month">NHỮNG NGÔI SAO TUẦN {week.number} · MỐC VINH DANH {scoring.honorTarget} ĐIỂM</span>
        <div className="podium">
          {podium.map((student, index) => {
            const place = index === 0 ? 2 : index === 1 ? 1 : 3;
            return <div className={`podium-person podium-${place}`} key={student.id}><span className="medal">{place === 1 ? '👑' : `#${place}`}</span><Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size={place === 1 ? 'xlarge' : 'large'} /><strong>{student.name}</strong><small>Tổ {student.team}</small><div><Star size={15} fill="currentColor" />{student.weeklyScore}</div><i>{place}</i></div>;
          })}
        </div>
      </section>
      <div className="honor-categories">
        {ranked.slice(0, 3).map((student, index) => <article className="panel honor-category" key={student.id}><span className={`category-icon ${['green', 'orange', 'purple'][index]}`}>{['🚀', '🌻', '🤝'][index]}</span><div><span>{['TIẾN BỘ NỔI BẬT', 'BÔNG HOA CHĂM CHỈ', 'NGƯỜI BẠN TÍCH CỰC'][index]}</span><h3>{student.name}</h3><p>{index === 0 ? 'Đang dẫn đầu bảng điểm của tuần.' : `Đóng góp tích cực cho Tổ ${student.team} trong tuần này.`}</p></div><b>{student.weeklyScore > 0 ? '+' : ''}{student.weeklyScore}<small>điểm tuần</small></b></article>)}
      </div>
    </>
  );
}

const parentFeedbackCategories: { id: ParentFeedbackCategory; icon: string; label: string; hint: string }[] = [
  { id: 'learning', icon: '📚', label: 'Trao đổi học tập', hint: 'Kết quả, bài tập hoặc tiến bộ của con' },
  { id: 'attendance', icon: '📅', label: 'Chuyên cần', hint: 'Xin phép nghỉ, đi muộn hoặc lịch học' },
  { id: 'support', icon: '🤝', label: 'Con cần hỗ trợ', hint: 'Điều gia đình mong giáo viên lưu ý' },
  { id: 'thanks', icon: '💛', label: 'Gửi lời cảm ơn', hint: 'Một lời nhắn tích cực đến giáo viên' },
];

function parentTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function studentFriendlyName(name: string) {
  const words = name.trim().split(/\s+/);
  return words[words.length - 1] || name;
}

function ParentsPage({ students, activities, classCode, week, scoring, isTeacher, portal, publishing, onPublish, onTogglePortal, onToggleRequireAccessCode, onRegenerateCode, onToggleAccess, onSaveFeedbackConfig, onToast }: { students: Student[]; activities: Activity[]; classCode: string; week: WeekPeriod; scoring: WeeklyScoringSettings; isTeacher: boolean; portal: ParentPortalSettings; publishing: boolean; onPublish: () => void | Promise<void>; onTogglePortal: () => void; onToggleRequireAccessCode: () => void; onRegenerateCode: (studentId: number) => void; onToggleAccess: (studentId: number) => void; onSaveFeedbackConfig: (teacherEmail: string, feedbackEndpoint: string) => void; onToast: (message: string) => void }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [remotePortal, setRemotePortal] = useState<PublicPortalRecord | null>(null);
  const [remoteActivities, setRemoteActivities] = useState<Activity[] | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudPortalLoading, setCloudPortalLoading] = useState(false);
  const [cloudPortalError, setCloudPortalError] = useState('');
  const [configEmail, setConfigEmail] = useState(portal.teacherEmail ?? '');
  const [configEndpoint, setConfigEndpoint] = useState(portal.feedbackEndpoint ?? '');
  const [configError, setConfigError] = useState('');
  const [configTesting, setConfigTesting] = useState(false);
  const [configTestStatus, setConfigTestStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState<ParentFeedbackCategory>('learning');
  const [feedbackSender, setFeedbackSender] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [website, setWebsite] = useState('');
  const [showFeedbackGuide, setShowFeedbackGuide] = useState(false);
  const [feedbackGuideCopyStatus, setFeedbackGuideCopyStatus] = useState('');
  const queryPortalId = new URLSearchParams(window.location.search).get('parent')?.trim() || portal.publicId;
  const cloudParentMode = !isTeacher && canUseFirebaseOnline();
  const viewPortal: ParentPortalSettings = remotePortal
    ? {
        enabled: remotePortal.enabled,
        publicId: remotePortal.publicId,
        requireAccessCode: remotePortal.requireAccessCode,
        lastPublishedAt: remotePortal.publishedAt,
        teacherEmail: remotePortal.teacherEmail,
        feedbackEndpoint: remotePortal.feedbackEndpoint,
      }
    : cloudParentMode
      ? { enabled: false, publicId: queryPortalId, requireAccessCode: true }
      : portal;
  const viewClassCode = remotePortal?.classCode || classCode;
  const viewWeek = remotePortal?.week || week;
  const viewScoring = remotePortal?.scoring || scoring;

  useEffect(() => {
    if (!cloudParentMode) return;
    let cancelled = false;
    setCloudPortalLoading(true);
    setCloudPortalError('');
    void fetchPublicPortal(queryPortalId)
      .then((value) => {
        if (cancelled) return;
        if (!value) setCloudPortalError('Liên kết phụ huynh chưa được xuất bản hoặc không tồn tại.');
        else setRemotePortal(value);
      })
      .catch(() => {
        if (!cancelled) setCloudPortalError('Chưa thể tải thông tin. Vui lòng kiểm tra Internet và thử lại.');
      })
      .finally(() => {
        if (!cancelled) setCloudPortalLoading(false);
      });
    return () => { cancelled = true; };
  }, [cloudParentMode, queryPortalId]);

  useEffect(() => {
    setConfigEmail(portal.teacherEmail ?? '');
    setConfigEndpoint(portal.feedbackEndpoint ?? '');
  }, [portal.teacherEmail, portal.feedbackEndpoint]);
  const parentUrl = isTeacher
    ? new URL('/lop-hanh-phuc', window.location.origin)
    : new URL(window.location.href);
  parentUrl.searchParams.set('parent', portal.publicId);
  parentUrl.searchParams.delete('student');
  parentUrl.hash = 'parents';
  const parentLink = parentUrl.toString();
  const feedbackScriptEmail = configEmail.trim();
  const feedbackScriptReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(feedbackScriptEmail);
  const personalizedFeedbackAppsScriptCode = parentFeedbackAppsScriptCode
    .replace(
      'const teacherEmail = Session.getEffectiveUser().getEmail();',
      feedbackScriptReady
        ? `const teacherEmail = ${JSON.stringify(feedbackScriptEmail)};`
        : 'const teacherEmail = Session.getEffectiveUser().getEmail();',
    )
    .replace("const portalId = ''; // App tự chèn mã cổng khi dùng nút “Sao chép mã đã điền”.", `const portalId = ${JSON.stringify(portal.publicId.trim())};`);
  const requireAccessCode = viewPortal.requireAccessCode !== false;
  const activeStudents = students.filter((student) => student.parentAccessEnabled !== false && student.parentCode.trim());
  const openStudent = (student: Student, publishedActivities: Activity[] | null = null) => {
    setResult(student);
    setRemoteActivities(publishedActivities);
    setError('');
    setFeedbackSender(student.parentName);
    setFeedbackCategory('learning');
    setFeedbackMessage('');
    setFeedbackStatus(null);
  };
  useEffect(() => {
    if (isTeacher || cloudParentMode || requireAccessCode || !viewPortal.enabled) return;
    const linkedCode = new URLSearchParams(window.location.search).get('student')?.trim() || '';
    const student = activeStudents.find((item) => item.parentCode.toLowerCase() === linkedCode.toLowerCase());
    if (student) {
      setCode(student.parentCode);
      openStudent(student);
    } else {
      setError('Liên kết chưa gắn với học sinh hoặc đã hết hiệu lực. Vui lòng xin giáo viên gửi lại link mới.');
    }
  }, [isTeacher, cloudParentMode, viewPortal.enabled, viewPortal.requireAccessCode, viewPortal.publicId, students]);
  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onToast(message);
    } catch {
      window.prompt('Sao chép nội dung bên dưới:', value);
    }
  };
  const copyFeedbackAppsScript = async () => {
    try {
      await navigator.clipboard.writeText(personalizedFeedbackAppsScriptCode);
      setFeedbackGuideCopyStatus(feedbackScriptReady
        ? `Đã sao chép mã có sẵn Gmail ${feedbackScriptEmail} và mã cổng ${portal.publicId}.`
        : `Đã sao chép mã cổng ${portal.publicId}; Apps Script sẽ tự lấy Gmail của tài khoản triển khai.`);
    } catch {
      window.prompt('Sao chép toàn bộ mã bên dưới:', personalizedFeedbackAppsScriptCode);
      setFeedbackGuideCopyStatus('Hãy sao chép mã trong cửa sổ vừa mở.');
    }
  };
  const lookupCloudStudent = async (lookupCode: string) => {
    if (!remotePortal?.enabled) return;
    setCloudLoading(true);
    setError('');
    try {
      const published = await fetchPublicStudent(remotePortal.publicId, lookupCode);
      if (!published) {
        setResult(null);
        setRemoteActivities(null);
        setError('Mã chưa đúng hoặc liên kết đã bị giáo viên khóa. Vui lòng kiểm tra lại.');
        return;
      }
      const student: Student = {
        ...published.student,
        birthday: '',
        parentCode: lookupCode.toLocaleUpperCase('vi-VN'),
        parentAccessEnabled: true,
        strengths: [],
      };
      openStudent(student, published.activities.map((activity) => ({
        ...activity,
        studentId: student.id,
        weekId: remotePortal.week.id,
      })));
    } catch {
      setError('Chưa thể tra cứu. Vui lòng kiểm tra Internet rồi thử lại.');
    } finally {
      setCloudLoading(false);
    }
  };

  useEffect(() => {
    if (!cloudParentMode || !remotePortal?.enabled || remotePortal.requireAccessCode) return;
    const linkedCode = new URLSearchParams(window.location.search).get('student')?.trim() || '';
    if (linkedCode) {
      setCode(linkedCode.toLocaleUpperCase('vi-VN'));
      void lookupCloudStudent(linkedCode);
    } else {
      setError('Liên kết chưa gắn với học sinh hoặc đã hết hiệu lực. Vui lòng xin giáo viên gửi lại link mới.');
    }
  }, [cloudParentMode, remotePortal?.publicId, remotePortal?.enabled, remotePortal?.requireAccessCode]);

  const search = async () => {
    if (cloudParentMode) {
      await lookupCloudStudent(code);
      return;
    }
    const student = activeStudents.find((item) => item.parentCode.toLowerCase() === code.trim().toLowerCase());
    if (student) openStudent(student);
    else { setResult(null); setError('Mã chưa đúng. Vui lòng kiểm tra lại.'); }
  };

  const saveFeedbackConfig = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = configEmail.trim();
    const endpoint = configEndpoint.trim();
    if (!email && !endpoint) {
      setConfigError('');
      onSaveFeedbackConfig('', '');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setConfigError('Vui lòng nhập đúng địa chỉ Gmail nhận phản hồi.');
    try {
      const url = new URL(endpoint);
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !url.pathname.endsWith('/exec')) throw new Error();
    } catch {
      return setConfigError('URL phải là đường dẫn Web app Google Apps Script kết thúc bằng /exec.');
    }
    setConfigError('');
    onSaveFeedbackConfig(email, endpoint);
  };

  const testFeedbackConnection = async () => {
    const email = configEmail.trim();
    const endpoint = configEndpoint.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setConfigTestStatus({ tone: 'error', message: 'Hãy nhập đúng Gmail cần kiểm tra.' });
      return;
    }
    try {
      const url = new URL(endpoint);
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !url.pathname.endsWith('/exec')) throw new Error();
    } catch {
      setConfigTestStatus({ tone: 'error', message: 'Hãy nhập đúng URL Web app kết thúc bằng /exec.' });
      return;
    }
    setConfigTesting(true);
    setConfigTestStatus(null);
    try {
      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          event: 'parent_feedback',
          portalId: portal.publicId,
          classCode,
          studentId: 'connection-test',
          studentName: 'Kiểm tra kết nối',
          parentName: 'Giáo viên chủ nhiệm',
          parentPhone: '',
          category: 'thanks',
          categoryLabel: 'Email kiểm tra kết nối',
          message: 'Đây là email thử từ ứng dụng Lớp Hạnh Phúc. Nếu nhận được thư này, kênh phản hồi phụ huynh đã hoạt động.',
          sentAt: new Date().toISOString(),
        }),
      });
      setConfigTestStatus({ tone: 'success', message: `Đã chuyển email thử. Hãy kiểm tra Hộp thư đến và Spam của ${email}; nhận được thư nghĩa là kết nối đã hoạt động.` });
    } catch {
      setConfigTestStatus({ tone: 'error', message: 'Chưa thể gửi email thử. Hãy kiểm tra Internet và URL /exec rồi thử lại.' });
    } finally {
      setConfigTesting(false);
    }
  };

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!result || feedbackSending) return;
    const message = feedbackMessage.trim();
    const sender = feedbackSender.trim() || result.parentName.trim() || 'Phụ huynh học sinh';
    if (website) {
      setFeedbackStatus({ tone: 'success', message: 'Cảm ơn phụ huynh đã gửi lời nhắn.' });
      return;
    }
    if (message.length < 5) return setFeedbackStatus({ tone: 'error', message: 'Vui lòng nhập lời nhắn từ 5 ký tự.' });
    if (message.length > 1200) return setFeedbackStatus({ tone: 'error', message: 'Lời nhắn tối đa 1.200 ký tự.' });
    if (!viewPortal.feedbackEndpoint || !viewPortal.teacherEmail) return setFeedbackStatus({ tone: 'error', message: 'Giáo viên chưa bật nhận phản hồi qua Gmail. Vui lòng liên hệ trực tiếp với giáo viên.' });
    const rateKey = `happy-class-feedback-${viewPortal.publicId}-${result.id}`;
    const lastSent = Number(localStorage.getItem(rateKey) || 0);
    if (Date.now() - lastSent < 30_000) return setFeedbackStatus({ tone: 'error', message: 'Phụ huynh vui lòng đợi 30 giây trước khi gửi lời nhắn tiếp theo.' });
    setFeedbackSending(true);
    setFeedbackStatus(null);
    try {
      await fetch(viewPortal.feedbackEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          event: 'parent_feedback',
          portalId: viewPortal.publicId,
          classCode: viewClassCode,
          studentId: result.id,
          studentName: result.name,
          parentName: sender,
          parentPhone: result.parentPhone,
          category: feedbackCategory,
          categoryLabel: parentFeedbackCategories.find((item) => item.id === feedbackCategory)?.label,
          weekNumber: viewWeek.number,
          weekStartDate: viewWeek.startDate,
          weekEndDate: viewWeek.endDate,
          message,
          sentAt: new Date().toISOString(),
        }),
      });
      localStorage.setItem(rateKey, String(Date.now()));
      setFeedbackMessage('');
      setFeedbackStatus({ tone: 'success', message: `Đã gửi lời nhắn đến ${viewPortal.teacherEmail}. Giáo viên sẽ phản hồi khi thuận tiện.` });
    } catch {
      setFeedbackStatus({ tone: 'error', message: 'Chưa thể gửi phản hồi. Vui lòng kiểm tra kết nối mạng và thử lại.' });
    } finally {
      setFeedbackSending(false);
    }
  };
  const friendlyName = result ? studentFriendlyName(result.name) : '';
  const currentStudentActivities = result ? remoteActivities ?? activities.filter((item) => item.studentId === result.id && item.weekId === viewWeek.id) : [];
  const progressMessage = result
    ? result.weeklyScore >= viewScoring.honorTarget
      ? `${friendlyName} đã đạt mốc vinh danh của lớp với ${result.weeklyScore} điểm tuần. Thật đáng tự hào!`
      : result.weeklyScore >= viewScoring.positiveTarget
        ? `${friendlyName} đang có một tuần thật rực rỡ với ${result.weeklyScore} điểm tiến bộ.`
      : result.streak >= 5
        ? `${friendlyName} đã duy trì ${result.streak} ngày tích cực liên tiếp. Gia đình hãy cùng động viên con nhé!`
        : `Mỗi cố gắng nhỏ của ${friendlyName} hôm nay đều đang tạo nên một hành trình lớn.`
    : '';
  return (
    <div className={`parent-page ${result ? 'has-result' : ''}`}>
      {isTeacher && (
        <section className="parent-sharing panel">
          <div className="parent-sharing-header">
            <div><span>CHIA SẺ VỚI PHỤ HUYNH</span><h2>Quản lý cổng tra cứu của lớp</h2><p>{requireAccessCode ? 'Phụ huynh mở link chung và nhập mã riêng của con.' : 'Phụ huynh bấm link riêng của con để xem ngay, không cần nhập mã.'}</p></div>
            <div className="parent-sharing-switches">
              <label className={`portal-switch ${portal.enabled ? 'active' : ''}`}><input type="checkbox" checked={portal.enabled} onChange={onTogglePortal} /><i />{portal.enabled ? 'Đang cho phép tra cứu' : 'Đang tạm dừng'}</label>
              <label className={`portal-switch access-code-switch ${requireAccessCode ? 'active' : ''}`}><input type="checkbox" checked={requireAccessCode} onChange={onToggleRequireAccessCode} /><i />{requireAccessCode ? 'Bắt buộc nhập mã' : 'Mở thẳng bằng link riêng'}</label>
            </div>
          </div>
          <div className="parent-share-link">
            <div><span>{requireAccessCode ? 'LIÊN KẾT CHUNG CỦA LỚP' : 'CHẾ ĐỘ LINK RIÊNG TỪNG HỌC SINH'}</span><strong>{requireAccessCode ? parentLink : 'Sao chép link riêng tại danh sách học sinh bên dưới'}</strong><small>{requireAccessCode ? 'Gửi link này kèm mã riêng của từng học sinh.' : 'Link riêng tự nhận diện học sinh. Người có link có thể xem hồ sơ nên không đăng link công khai.'}</small></div>
            <div>{requireAccessCode && <button className="button button-soft" onClick={() => copy(parentLink, 'Đã sao chép liên kết chung của lớp')}><Copy size={16} /> Sao chép link chung</button>}<button className="button button-primary" disabled={publishing} onClick={() => void onPublish()}><Upload size={16} /> {publishing ? 'Đang cập nhật…' : 'Cập nhật chia sẻ'}</button></div>
          </div>
          <div className="parent-share-stats"><div><strong>{activeStudents.length}</strong><span>{requireAccessCode ? 'Mã đang hoạt động' : 'Link riêng đang hoạt động'}</span></div><div><strong>{students.length - activeStudents.length}</strong><span>{requireAccessCode ? 'Mã đang khóa' : 'Link riêng đang khóa'}</span></div><div><strong>{portal.lastPublishedAt ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(portal.lastPublishedAt)) : 'Chưa có'}</strong><span>Lần cập nhật gần nhất</span></div></div>
          <div className="parent-data-scope">
            <div><ShieldCheck size={22} /><p><strong>Chỉ chia sẻ với phụ huynh</strong><span>Ảnh của con, họ tên, lớp/tổ, chuyên cần, điểm tuần – tích lũy, chuỗi tốt và tối đa 4 ghi nhận gần đây.</span></p></div>
            <div><LayoutGrid size={22} /><p><strong>Chỉ lưu trên thiết bị giáo viên</strong><span>Vòng quay, âm thanh, kết quả gọi tên, cấu hình trò chơi, danh sách toàn lớp và lịch sử nội bộ chưa xuất bản.</span></p></div>
          </div>
          <form className="parent-feedback-config" onSubmit={saveFeedbackConfig}>
            <div className="parent-feedback-config-copy"><span><Mail size={17} /> PHẢN HỒI VỀ GMAIL</span><strong>{portal.feedbackEndpoint ? 'Đã lưu kết nối – hãy gửi email thử' : 'Kết nối hộp thư giáo viên'}</strong><small>Không nhập mật khẩu Gmail vào ứng dụng. Hệ thống chỉ gọi Web app Google Apps Script do giáo viên sở hữu.</small><button type="button" className="parent-feedback-guide-button highlight-video" onClick={() => { setFeedbackGuideCopyStatus(''); setShowFeedbackGuide(true); }}><Play size={15} fill="currentColor" /> 🎬 Xem Video & Hướng dẫn lấy link</button></div>
            <label><span>Gmail giáo viên nhận thư</span><input type="email" value={configEmail} onChange={(event) => setConfigEmail(event.target.value)} placeholder="giaovien@gmail.com" /></label>
            <label className="feedback-endpoint-field"><span>URL Web app Google Apps Script</span><input type="url" value={configEndpoint} onChange={(event) => setConfigEndpoint(event.target.value)} placeholder="https://script.google.com/macros/s/.../exec" /></label>
            <div className="parent-feedback-config-actions"><button className="button button-soft" type="button" disabled={configTesting} onClick={() => void testFeedbackConnection()}><Send size={17} /> {configTesting ? 'Đang gửi…' : 'Gửi email thử'}</button><button className="button button-primary" type="submit"><Check size={17} /> Lưu kết nối</button></div>
            {configError && <p className="parent-feedback-config-error" role="alert">{configError}</p>}
            {configTestStatus && <p className={`parent-feedback-config-status ${configTestStatus.tone === 'error' ? 'error' : ''}`} role="status">{configTestStatus.message}</p>}
          </form>
          <div className="parent-code-list">
            {students.map((student) => {
              const active = student.parentAccessEnabled !== false;
              const studentUrl = new URL(parentLink);
              studentUrl.searchParams.set('student', student.parentCode);
              studentUrl.hash = 'parents';
              const shareValue = requireAccessCode ? student.parentCode : studentUrl.toString();
              return <article className={`parent-code-row ${active ? '' : 'is-disabled'}`} key={student.id}>
                <Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="small" />
                <div className="parent-code-student"><strong>{student.name}</strong><span>{student.parentName || 'Chưa có tên phụ huynh'}</span></div>
                <code>{student.parentCode || 'Chưa tạo mã'}</code>
                <span className={`parent-access-status ${active ? 'active' : ''}`}>{active ? 'Đang mở' : 'Đã khóa'}</span>
                <button className="parent-code-action" onClick={() => copy(shareValue, `Đã sao chép ${requireAccessCode ? 'mã' : 'link riêng'} của ${student.name}`)} disabled={!student.parentCode}><Copy size={15} /> {requireAccessCode ? 'Sao chép mã' : 'Sao chép link'}</button>
                <button className="parent-code-action" onClick={() => onRegenerateCode(student.id)}><RotateCcw size={15} /> Tạo mã mới</button>
                <button className={`parent-code-action ${active ? 'danger' : 'success'}`} onClick={() => onToggleAccess(student.id)}>{active ? <><X size={15} /> Khóa mã</> : <><Check size={15} /> Mở mã</>}</button>
              </article>;
            })}
          </div>
        </section>
      )}
      {showFeedbackGuide && (
        <div className="feedback-guide-backdrop" role="presentation" onMouseDown={() => setShowFeedbackGuide(false)}>
          <section className="feedback-guide-card" role="dialog" aria-modal="true" aria-labelledby="feedback-guide-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="feedback-guide-head">
              <div><span>PHẢN HỒI PHỤ HUYNH VỀ GMAIL</span><h2 id="feedback-guide-title">Cách lấy link Google Apps Script</h2><p>Mỗi giáo viên tự triển khai bằng Gmail của mình; phụ huynh không cần đăng nhập.</p></div>
              <button type="button" aria-label="Đóng hướng dẫn Apps Script" onClick={() => setShowFeedbackGuide(false)}><X size={20} /></button>
            </header>
            <div className="feedback-guide-body">
              <div className="feedback-guide-video-card">
                <div className="feedback-guide-video-header">
                  <div className="video-tag">
                    <Play size={13} fill="currentColor" />
                    <span>VIDEO HƯỚNG DẪN CHI TIẾT</span>
                  </div>
                  <h3>Cách tạo & lấy link Google Apps Script về Gmail (Xem 1 phút làm được ngay)</h3>
                </div>
                <div className="feedback-guide-video-wrapper">
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/toZt4bLllJ4?rel=0"
                    title="Video hướng dẫn kết nối Google Apps Script với Gmail"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <div className="feedback-guide-video-footer">
                  <a
                    href="https://youtu.be/toZt4bLllJ4"
                    target="_blank"
                    rel="noreferrer"
                    className="video-direct-link"
                  >
                    <ExternalLink size={14} /> Mở xem trực tiếp trên YouTube (youtu.be/toZt4bLllJ4)
                  </a>
                </div>
              </div>
              <div className="feedback-guide-free-note"><ShieldCheck size={22} /><p><strong>Không cần Firebase Functions</strong><span>Phụ huynh chỉ cần có Internet. Lời nhắn đi thẳng đến Web app Apps Script do giáo viên sở hữu và được chuyển về Gmail đã cấu hình.</span></p></div>
              <div className="feedback-guide-code">
                <div><p><strong>Mã tự điền Gmail và mã cổng</strong><span>{feedbackScriptReady ? `Đã chuẩn bị riêng cho ${feedbackScriptEmail}.` : 'Chưa nhập Gmail: Script sẽ tự dùng Gmail của tài khoản triển khai.'}</span></p><button type="button" onClick={() => void copyFeedbackAppsScript()}><Copy size={17} /> Sao chép mã đã điền</button></div>
                {feedbackGuideCopyStatus && <p className="feedback-guide-copy-status" role="status">{feedbackGuideCopyStatus}</p>}
                <textarea readOnly value={personalizedFeedbackAppsScriptCode} aria-label="Mã Google Apps Script phản hồi phụ huynh" onFocus={(event) => event.currentTarget.select()} />
              </div>
              <ol className="feedback-guide-steps">
                <li><b>1</b><p><strong>Mở Google Apps Script</strong><span>Vào <a href="https://script.google.com" target="_blank" rel="noreferrer">script.google.com</a>, đăng nhập Gmail giáo viên và tạo dự án mới.</span></p></li>
                <li><b>2</b><p><strong>Dán mã gửi phản hồi</strong><span>Xóa mã mặc định trong Code.gs, sau đó bấm “Sao chép mã” ở trên và dán vào.</span></p></li>
                <li><b>3</b><p><strong>Gmail và mã cổng được chuẩn bị tự động</strong><span>Nếu đã nhập Gmail, app sẽ điền sẵn. Nếu chưa nhập, Script tự dùng Gmail của tài khoản chạy setupParentFeedback; không cần sửa Code.gs.</span></p></li>
                <li><b>4</b><p><strong>Chạy setupParentFeedback một lần</strong><span>Chọn hàm setupParentFeedback → Run, sau đó chấp nhận quyền gửi email mà Google yêu cầu.</span></p></li>
                <li><b>5</b><p><strong>Triển khai Web app</strong><span>Chọn Deploy → New deployment → Web app; Execute as: Me và Who has access: Anyone.</span></p></li>
                <li><b>6</b><p><strong>Sao chép đường dẫn /exec</strong><span>Dán Web app URL kết thúc bằng /exec cùng Gmail vào khung “Phản hồi về Gmail”, rồi bấm Lưu kết nối.</span></p></li>
                <li><b>7</b><p><strong>Gửi thử từ link phụ huynh</strong><span>Gửi một lời nhắn thử, kiểm tra Hộp thư đến và mục Spam. Khi sửa mã Script, hãy tạo phiên bản triển khai mới.</span></p></li>
              </ol>
            </div>
            <footer className="feedback-guide-actions"><a href="https://script.google.com" target="_blank" rel="noreferrer">Mở Google Apps Script</a><button type="button" onClick={() => setShowFeedbackGuide(false)}>Đã hiểu</button></footer>
          </section>
        </div>
      )}
      {!result && <section className="parent-lookup">
        <div className="parent-brand"><div className="brand-mark"><HeartHandshake size={25} /></div><div><strong>Nhịp cầu gia đình</strong><span>Kết nối yêu thương mỗi ngày</span></div></div>
        <div className="parent-copy"><span>CỔNG THÔNG TIN PHỤ HUYNH</span><h1>Cùng lắng nghe hành trình<br />khôn lớn của con</h1><p>Nhập mã riêng được giáo viên cung cấp để xem những khoảnh khắc tích cực và tình hình chuyên cần của con.</p></div>
        <div className="lookup-box"><label>Mã kết nối của con</label><div><ShieldCheck size={21} /><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter') void search(); }} placeholder="Ví dụ: BA-31879" /><button onClick={() => void search()} disabled={!viewPortal.enabled || cloudLoading || cloudPortalLoading}>{cloudLoading ? 'Đang tìm…' : 'Tra cứu'} <ChevronRight size={18} /></button></div>{cloudPortalLoading && <p className="lookup-info">Đang kết nối dữ liệu lớp học…</p>}{cloudPortalError && <p className="lookup-error">{cloudPortalError}</p>}{!cloudPortalLoading && !cloudPortalError && !viewPortal.enabled && <p className="lookup-error">Cổng tra cứu đang được giáo viên tạm dừng.</p>}{error && viewPortal.enabled && <p className="lookup-error">{error}</p>}</div>
        <div className="privacy-note"><ShieldCheck size={19} /><p><strong>Thông tin được bảo vệ</strong><span>Mỗi mã chỉ truy cập được hồ sơ của một học sinh.</span></p></div>
      </section>}
      {result && (
        <section className="parent-result parent-result-vibrant panel">
          <div className="parent-celebration" aria-hidden="true"><i>✦</i><i>♥</i><i>✦</i><i>●</i><i>✦</i></div>
          <div className="parent-welcome-head">
            <div className="parent-welcome-icon"><PartyPopper size={27} /></div>
            <div><span>LỜI CHÀO TỪ LỚP HỌC · TUẦN {viewWeek.number}</span><h2>{parentTimeGreeting()}, {result.parentName.trim() || 'Quý phụ huynh'}!</h2><p>Cảm ơn gia đình đã luôn đồng hành. Đây là những điều đáng nhớ của {friendlyName} từ {formatShortDate(viewWeek.startDate)} đến {formatShortDate(viewWeek.endDate)}.</p></div>
            <button className="icon-button" aria-label="Đóng thông tin học sinh" onClick={() => { setResult(null); setRemoteActivities(null); }}><X size={20} /></button>
          </div>
          <div className="parent-student-head parent-student-highlight"><Avatar initials={result.initials} gradient={result.gradient} photo={result.photo} size="large" /><div><span>HỌC SINH LỚP {viewClassCode}</span><h2>{result.name}</h2><p>{result.role} · Tổ {result.team}</p></div><div className="parent-today-badge"><Sparkles size={17} /><span>Hôm nay</span><strong>{attendanceLabels[result.attendance]}</strong></div></div>
          <div className="parent-progress-message"><span>🌻</span><p><strong>Một lời nhắn nhỏ dành cho gia đình</strong>{progressMessage}</p></div>
          <div className="parent-stats"><div><Star size={21} /><strong>{result.weeklyScore > 0 ? '+' : ''}{result.weeklyScore}</strong><span>Điểm Tuần {viewWeek.number}</span></div><div><Coins size={21} /><strong>{result.score}</strong><span>Điểm tích lũy</span></div><div><Zap size={21} /><strong>{result.streak}</strong><span>Chuỗi ngày tốt</span></div><div><CalendarCheck2 size={21} /><strong>{attendanceLabels[result.attendance]}</strong><span>Hôm nay</span></div></div>
          <h3>Ghi nhận trong Tuần {viewWeek.number}</h3>
          <div className="parent-activity">{currentStudentActivities.slice(0, 4).map((activity) => <div key={activity.id}><span className={activity.points > 0 ? 'positive' : 'negative'}>{activity.points > 0 ? '✨' : '💬'}</span><div><strong>{activity.title}</strong><small>{activity.detail} · {activity.time}</small></div><b>{activity.points > 0 ? '+' : ''}{activity.points}</b></div>)}{!currentStudentActivities.length && <p className="empty-state">Chưa có ghi nhận mới trong tuần này.</p>}</div>
          <form className="parent-feedback" onSubmit={submitFeedback}>
            <div className="parent-feedback-head"><span><MessageCircle size={22} /></span><div><small>NHỊP CẦU GIA ĐÌNH</small><h3>Gửi lời nhắn cho giáo viên</h3><p>Gia đình có thể trao đổi ngắn gọn; lời nhắn sẽ được chuyển đến Gmail giáo viên.</p></div></div>
            <div className="parent-feedback-categories" role="group" aria-label="Nội dung phản hồi">
              {parentFeedbackCategories.map((item) => <button type="button" className={feedbackCategory === item.id ? 'active' : ''} aria-pressed={feedbackCategory === item.id} onClick={() => setFeedbackCategory(item.id)} key={item.id}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.hint}</small></button>)}
            </div>
            <div className="parent-feedback-fields">
              <label><span>Người gửi</span><input value={feedbackSender} onChange={(event) => setFeedbackSender(event.target.value)} maxLength={100} placeholder="Tên phụ huynh" /></label>
              <label className="parent-feedback-message"><span>Lời nhắn *</span><textarea value={feedbackMessage} onChange={(event) => { setFeedbackMessage(event.target.value); setFeedbackStatus(null); }} maxLength={1200} rows={5} placeholder={`Ví dụ: Gia đình muốn trao đổi thêm về tình hình học tập của ${friendlyName}…`} /></label>
              <label className="parent-feedback-honeypot" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
            </div>
            <div className="parent-feedback-actions"><div><ShieldCheck size={18} /><span>{viewPortal.teacherEmail ? `Gửi riêng đến ${viewPortal.teacherEmail}` : 'Kênh Gmail chưa được giáo viên kích hoạt'}</span></div><button type="submit" disabled={feedbackSending || !feedbackMessage.trim()}>{feedbackSending ? 'Đang gửi…' : <><Send size={18} /> Gửi lời nhắn</>}</button></div>
            {feedbackStatus && <p className={`parent-feedback-status ${feedbackStatus.tone}`} role={feedbackStatus.tone === 'error' ? 'alert' : 'status'}>{feedbackStatus.message}</p>}
          </form>
        </section>
      )}
    </div>
  );
}

function StudentProfile({
  student,
  activities,
  onPhoto,
  onRemovePhoto,
  onClose,
}: {
  student: Student;
  activities: Activity[];
  onPhoto: (file: File) => void;
  onRemovePhoto: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <aside className="profile-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}><X size={21} /></button>
        <div className={`profile-cover cover-${student.gradient}`}><span>Hành trình của em</span></div>
        <div className="profile-main">
          <Avatar initials={student.initials} gradient={student.gradient} photo={student.photo} size="xlarge" />
          <h2>{student.name}</h2><p>{student.role} · Tổ {student.team}</p>
          <div className="profile-photo-actions">
            <label className="photo-upload-button">
              <Camera size={16} /> {student.photo ? 'Đổi ảnh' : 'Tải ảnh học sinh'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onPhoto(file);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            {student.photo && <button className="photo-remove-button" onClick={onRemovePhoto}><Trash2 size={15} /> Xóa ảnh</button>}
          </div>
          <div className="strength-tags centered">{student.strengths.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <div className="profile-stats"><div><strong>{student.score}</strong><span>Điểm tích lũy</span></div><div><strong>{student.weeklyScore > 0 ? '+' : ''}{student.weeklyScore}</strong><span>Điểm tuần</span></div><div><strong>{student.streak}</strong><span>Chuỗi tốt</span></div></div>
        <div className="profile-info"><h3>Thông tin nhanh</h3><div><span>Ngày sinh</span><strong>{student.birthday}</strong></div>{student.gender && <div><span>Giới tính</span><strong>{student.gender}</strong></div>}{student.studentCode && <div><span>Mã học sinh</span><strong>{student.studentCode}</strong></div>}<div><span>Trạng thái hôm nay</span><strong className={`attendance-text ${student.attendance}`}>{attendanceLabels[student.attendance]}</strong></div><div><span>Mã phụ huynh</span><strong>{student.parentCode}</strong></div></div>
        <div className="profile-history"><h3>Ghi nhận gần đây</h3>{activities.length ? activities.slice(0, 5).map((activity) => <div key={activity.id}><span className={activity.points > 0 ? 'positive' : 'negative'}>{activity.points > 0 ? <Plus size={14} /> : <Minus size={14} />}</span><p><strong>{activity.title}</strong><small>{activity.detail} · {activity.time}</small></p><b>{activity.points > 0 ? '+' : ''}{activity.points}</b></div>) : <p className="empty-state">Chưa có hoạt động gần đây.</p>}</div>
      </aside>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, icon }: { eyebrow: string; title: string; description: string; icon: string }) {
  return <div className="page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><div className="page-heading-icon">{icon}</div></div>;
}

function Avatar({ initials, gradient, photo, size = 'normal' }: { initials: string; gradient: string; photo?: string; size?: 'tiny' | 'small' | 'normal' | 'large' | 'xlarge' }) {
  return <span className={`avatar avatar-${gradient} avatar-${size} ${photo ? 'has-photo' : ''}`} aria-hidden="true">{photo ? <img src={photo} alt="" /> : <span>{initials}</span>}</span>;
}

function QuickAction({ icon: Icon, label, description, color, onClick }: { icon: LucideIcon; label: string; description: string; color: string; onClick: () => void }) {
  return <button className={`quick-action quick-${color}`} onClick={onClick}><span><Icon size={21} /></span><div><strong>{label}</strong><small>{description}</small></div><ChevronRight size={18} /></button>;
}

function StatCard({ label, value, suffix, icon: Icon, tone, trend }: { label: string; value: string; suffix: string; icon: LucideIcon; tone: string; trend: string }) {
  return <article className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon size={21} /></div><span>{label}</span><div><strong>{value}</strong><small>{suffix}</small></div><p><i />{trend}</p></article>;
}

function PanelHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action: string; onAction?: () => void }) {
  return <div className="panel-header"><div><span>{eyebrow}</span><h2>{title}</h2></div><button onClick={onAction}>{action}<ChevronRight size={16} /></button></div>;
}

function getTeamStats(students: Student[], teamCount = DEFAULT_TEAM_COUNT, scoringMode: TeamScoringMode = 'average') {
  return getTeamNumbers(teamCount)
    .map((team) => {
      const membersList = students.filter((student) => student.team === team);
      const membersCount = membersList.length;
      const score = membersList.reduce((sum, student) => sum + student.score, 0);
      const weekly = membersList.reduce((sum, student) => sum + student.weeklyScore, 0);
      const scoreAvg = membersCount > 0 ? Number((score / membersCount).toFixed(1)) : 0;
      const weeklyAvg = membersCount > 0 ? Number((weekly / membersCount).toFixed(1)) : 0;
      return {
        team,
        score,
        weekly,
        scoreAvg,
        weeklyAvg,
        members: membersCount,
      };
    })
    .sort((a, b) => {
      if (scoringMode === 'average') {
        return b.weeklyAvg - a.weeklyAvg || b.weekly - a.weekly || b.scoreAvg - a.scoreAvg;
      }
      return b.weekly - a.weekly || b.score - a.score;
    });
}
