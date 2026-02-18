import { LevelConfig } from './types';

export const LEVELS: LevelConfig[] = [
    {
        id: 'exact',
        name: 'Giờ đúng',
        description: 'Học cách xem giờ chẵn (1:00, 2:00...)',
        icon: '🕐',
        grade: 'Lớp 1',
        minuteOptions: [0],
    },
    {
        id: 'half',
        name: 'Giờ rưỡi',
        description: 'Nhận biết giờ rưỡi (1:30, 2:30...)',
        icon: '🕜',
        grade: 'Lớp 1–2',
        minuteOptions: [0, 30],
    },
    {
        id: 'quarter',
        name: 'Giờ hơn / kém 15 phút',
        description: 'Giờ 15, giờ 45 (giờ kém 15)',
        icon: '🕞',
        grade: 'Lớp 2–3',
        minuteOptions: [0, 15, 30, 45],
    },
    {
        id: 'fiveMin',
        name: 'Giờ hơn / kém (5 phút)',
        description: 'Đọc giờ chính xác đến 5 phút',
        icon: '🕠',
        grade: 'Lớp 3',
        minuteOptions: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
    },
    {
        id: 'any',
        name: 'Tất cả các giờ',
        description: 'Đọc giờ chính xác đến từng phút',
        icon: '⏰',
        grade: 'Lớp 3+',
        minuteOptions: Array.from({ length: 60 }, (_, i) => i),
    },
];

export const TOTAL_QUESTIONS_PER_ROUND = 10;

export const STAR_THRESHOLDS = {
    bronze: 5,
    silver: 7,
    gold: 9,
};

export const LEARN_STEPS = [
    {
        id: 'intro',
        title: 'Làm quen với đồng hồ',
        description: 'Đồng hồ có 2 kim chính: Kim ngắn chỉ GIỜ, kim dài chỉ PHÚT.',
        time: { hour: 12, minute: 0 },
        highlightHour: true,
        highlightMinute: true,
    },
    {
        id: 'exact1',
        title: 'Giờ đúng',
        description: 'Khi kim dài (kim phút) chỉ số 12, ta đọc là "... giờ đúng". Kim ngắn chỉ số mấy thì đó là mấy giờ.',
        time: { hour: 3, minute: 0 },
        highlightHour: true,
        highlightMinute: false,
    },
    {
        id: 'exact2',
        title: 'Giờ đúng (tiếp)',
        description: 'Hãy nhìn: Kim ngắn chỉ số 7, kim dài chỉ số 12. Vậy bây giờ là 7 giờ đúng!',
        time: { hour: 7, minute: 0 },
        highlightHour: true,
        highlightMinute: false,
    },
    {
        id: 'half',
        title: 'Giờ rưỡi',
        description: 'Khi kim dài chỉ số 6, tức là 30 phút. Ta đọc là "... giờ 30 phút" hay "... giờ rưỡi".',
        time: { hour: 9, minute: 30 },
        highlightHour: false,
        highlightMinute: true,
    },
    {
        id: 'past',
        title: 'Giờ hơn',
        description: 'Khi kim dài đi qua số 12 (theo chiều kim đồng hồ), ta đọc "... giờ ... phút". Ví dụ: kim ngắn chỉ 4, kim dài chỉ số 3 (tức 15 phút) → "4 giờ 15 phút".',
        time: { hour: 4, minute: 15 },
        highlightHour: false,
        highlightMinute: true,
    },
    {
        id: 'to',
        title: 'Giờ kém',
        description: 'Khi kim dài ở nửa sau (từ số 6 đến 12), ta có thể đọc theo cách "giờ kém". Ví dụ: 2:45 = "3 giờ kém 15 phút" (còn 15 phút nữa là 3 giờ).',
        time: { hour: 2, minute: 45 },
        highlightHour: false,
        highlightMinute: true,
    },
    {
        id: 'summary',
        title: '🎉 Tổng kết',
        description: 'Bạn đã biết cách đọc giờ đúng, giờ hơn, giờ kém rồi! Hãy thử Thực hành và Luyện tập để giỏi hơn nhé!',
        time: { hour: 10, minute: 10 },
        highlightHour: false,
        highlightMinute: false,
    },
];
