import type { Activity, PointReason, Reward, Student } from './types';

export const initialStudents: Student[] = [
  { id: 1, name: 'Nguyễn Bảo An', initials: 'BA', birthday: '12/09/2017', team: 1, role: 'Lớp trưởng', score: 348, weeklyScore: 50, streak: 6, attendance: 'present', gradient: 'mint', parentCode: 'BA-31879', parentName: 'Nguyễn Minh Anh', parentPhone: '09•• ••• 126', strengths: ['Trách nhiệm', 'Toán học'] },
  { id: 2, name: 'Trần Minh Khang', initials: 'MK', birthday: '23/11/2017', team: 1, role: 'Tổ trưởng', score: 280, weeklyScore: 50, streak: 4, attendance: 'present', gradient: 'sky', parentCode: 'MK-24680', parentName: 'Trần Thùy Dương', parentPhone: '09•• ••• 458', strengths: ['Sáng tạo', 'Mỹ thuật'] },
  { id: 3, name: 'Lê Hoàng Yến Nhi', initials: 'YN', birthday: '04/03/2017', team: 2, role: 'Lớp phó', score: 310, weeklyScore: 50, streak: 8, attendance: 'present', gradient: 'sun', parentCode: 'YN-15327', parentName: 'Lê Hoàng Nam', parentPhone: '09•• ••• 807', strengths: ['Chăm chỉ', 'Tiếng Việt'] },
  { id: 4, name: 'Phạm Đức Anh Khôi', initials: 'AK', birthday: '18/06/2017', team: 2, role: 'Thành viên', score: 195, weeklyScore: 50, streak: 2, attendance: 'late', gradient: 'lavender', parentCode: 'AK-56342', parentName: 'Phạm Thanh Hà', parentPhone: '09•• ••• 352', strengths: ['Thể thao', 'Vui vẻ'] },
  { id: 5, name: 'Đặng Tuệ Mẫn', initials: 'TM', birthday: '30/08/2017', team: 3, role: 'Tổ trưởng', score: 520, weeklyScore: 50, streak: 12, attendance: 'present', gradient: 'coral', parentCode: 'TM-98521', parentName: 'Đặng Quốc Huy', parentPhone: '09•• ••• 091', strengths: ['Tự tin', 'Ngoại ngữ'] },
  { id: 6, name: 'Vũ Quốc Huy', initials: 'QH', birthday: '15/01/2017', team: 3, role: 'Thành viên', score: 265, weeklyScore: 50, streak: 3, attendance: 'present', gradient: 'aqua', parentCode: 'QH-73146', parentName: 'Vũ Thanh Loan', parentPhone: '09•• ••• 611', strengths: ['Khoa học', 'Lắp ráp'] },
  { id: 7, name: 'Hoàng Mai Thảo Linh', initials: 'TL', birthday: '07/10/2017', team: 4, role: 'Tổ trưởng', score: 230, weeklyScore: 50, streak: 5, attendance: 'excused', gradient: 'rose', parentCode: 'TL-42918', parentName: 'Hoàng Anh Tuấn', parentPhone: '09•• ••• 442', strengths: ['Âm nhạc', 'Đoàn kết'] },
  { id: 8, name: 'Bùi Gia Hưng', initials: 'GH', birthday: '21/04/2017', team: 4, role: 'Thành viên', score: 175, weeklyScore: 50, streak: 1, attendance: 'present', gradient: 'grape', parentCode: 'GH-84510', parentName: 'Bùi Ngọc Hà', parentPhone: '09•• ••• 764', strengths: ['Nhanh nhẹn', 'Bóng đá'] },
  { id: 9, name: 'Đỗ Khánh Vy', initials: 'KV', birthday: '09/12/2017', team: 1, role: 'Thành viên', score: 295, weeklyScore: 50, streak: 7, attendance: 'present', gradient: 'peach', parentCode: 'KV-17063', parentName: 'Đỗ Đức Trung', parentPhone: '09•• ••• 320', strengths: ['Khéo léo', 'Kể chuyện'] },
  { id: 10, name: 'Ngô Nhật Minh', initials: 'NM', birthday: '16/05/2017', team: 2, role: 'Thành viên', score: 215, weeklyScore: 50, streak: 3, attendance: 'present', gradient: 'lime', parentCode: 'NM-60245', parentName: 'Ngô Thu Hương', parentPhone: '09•• ••• 573', strengths: ['Tin học', 'Hòa đồng'] },
  { id: 11, name: 'Dương Hà My', initials: 'HM', birthday: '28/02/2017', team: 3, role: 'Lớp phó', score: 385, weeklyScore: 50, streak: 9, attendance: 'present', gradient: 'berry', parentCode: 'HM-39714', parentName: 'Dương Hồng Nhung', parentPhone: '09•• ••• 935', strengths: ['Nề nếp', 'Văn nghệ'] },
  { id: 12, name: 'Mai Đức Thành', initials: 'ĐT', birthday: '02/07/2017', team: 4, role: 'Thành viên', score: 205, weeklyScore: 50, streak: 4, attendance: 'absent', gradient: 'ocean', parentCode: 'DT-91836', parentName: 'Mai Đức Long', parentPhone: '09•• ••• 284', strengths: ['Kiên trì', 'Cờ vua'] },
];

export const initialActivities: Activity[] = [];

export const rewards: Reward[] = [
  { id: 1, name: 'Vé đổi chỗ yêu thích', description: 'Chọn một vị trí ngồi trong 1 ngày', cost: 30, icon: '🪑', color: 'mint', stock: null },
  { id: 2, name: 'Quà tặng bí mật', description: 'Một món quà nhỏ từ cô giáo', cost: 50, icon: '🎁', color: 'sun', stock: 8 },
  { id: 3, name: 'Phiếu miễn bài tập', description: 'Miễn một bài tập tự chọn', cost: 80, icon: '🎫', color: 'sky', stock: 5 },
  { id: 4, name: 'Trợ giảng danh dự', description: 'Đồng hành cùng cô trong một tiết học', cost: 100, icon: '🏅', color: 'coral', stock: 3 },
  { id: 5, name: 'Chọn trò chơi cuối giờ', description: 'Được chọn trò chơi cho cả lớp', cost: 120, icon: '🎮', color: 'lavender', stock: null },
  { id: 6, name: 'Ngôi sao tuần', description: 'Huy hiệu đặc biệt trên bảng lớp', cost: 150, icon: '🌟', color: 'rose', stock: 2 },
];

export const pointReasons: PointReason[] = [
  { id: 'speak-well', label: 'Phát biểu hay', points: 5, icon: '💡', tone: 'green' },
  { id: 'homework-complete', label: 'Bài tập đầy đủ', points: 5, icon: '📚', tone: 'blue' },
  { id: 'help-friend', label: 'Giúp đỡ bạn', points: 3, icon: '🤝', tone: 'purple' },
  { id: 'clear-progress', label: 'Tiến bộ rõ rệt', points: 8, icon: '🚀', tone: 'orange' },
  { id: 'keep-clean', label: 'Giữ gìn vệ sinh', points: 3, icon: '🌱', tone: 'green' },
  { id: 'good-example', label: 'Việc tốt & gương sáng', points: 10, icon: '✨', tone: 'yellow' },
  { id: 'forgot-supplies', label: 'Quên đồ dùng', points: -2, icon: '🎒', tone: 'red' },
  { id: 'unfinished-work', label: 'Chưa hoàn thành bài', points: -3, icon: '📝', tone: 'red' },
  { id: 'disruptive', label: 'Mất trật tự', points: -2, icon: '🔔', tone: 'red' },
  { id: 'late-school', label: 'Đi học muộn', points: -2, icon: '⏰', tone: 'red' },
];


