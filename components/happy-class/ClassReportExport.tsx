import { useMemo, useState } from 'react';
import { Check, Download, FileSpreadsheet, FileText, Printer, ShieldCheck, X } from 'lucide-react';
import { utils, writeFileXLSX } from 'xlsx';
import type { Activity, AttendanceRecord, AttendanceStatus, Student, WeekState } from './types';

type ReportScope = 'week' | 'month' | 'year';
type ReportDetail = 'summary' | 'full';
type ReportOrientation = 'portrait' | 'landscape';

type ClassReportExportProps = {
  students: Student[];
  activities: Activity[];
  attendanceHistory: AttendanceRecord[];
  weekState: WeekState;
  teacherName: string;
  classInfo: { name: string; code: string; schoolYear: string };
  onClose: () => void;
};

type ReportRow = {
  id: number;
  name: string;
  studentCode: string;
  team: number;
  points: number;
  cumulativeScore: number;
  weekCount: number;
  rank: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  activities: Activity[];
};

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: 'Có mặt',
  late: 'Đi muộn',
  excused: 'Nghỉ phép',
  absent: 'Vắng',
};

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  const [year, month] = value.split('-');
  return `Tháng ${Number(month)}/${year}`;
}

function safeFileName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function signedPoints(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export default function ClassReportExport({ students, activities, attendanceHistory, weekState, teacherName, classInfo, onClose }: ClassReportExportProps) {
  const monthKeys = useMemo(() => Array.from(new Set([
    weekState.current.endDate.slice(0, 7),
    ...weekState.history.map((week) => week.endDate.slice(0, 7)),
  ])).filter(Boolean).sort().reverse(), [weekState]);
  const weekOptions = useMemo(() => [weekState.current, ...weekState.history].sort((a, b) => b.endDate.localeCompare(a.endDate)), [weekState]);
  const [scope, setScope] = useState<ReportScope>('month');
  const [selectedWeekId, setSelectedWeekId] = useState(weekState.current.id);
  const [selectedMonth, setSelectedMonth] = useState(monthKeys[0] ?? weekState.current.endDate.slice(0, 7));
  const [detail, setDetail] = useState<ReportDetail>('summary');
  const [selectedStudentId, setSelectedStudentId] = useState<'all' | number>('all');
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeActivities, setIncludeActivities] = useState(true);
  const [orientation, setOrientation] = useState<ReportOrientation>('landscape');

  const report = useMemo(() => {
    const allWeeks = [
      {
        id: weekState.current.id,
        number: weekState.current.number,
        startDate: weekState.current.startDate,
        endDate: weekState.current.endDate,
        scores: students.map((student) => ({ studentId: student.id, name: student.name, team: student.team, points: student.weeklyScore })),
      },
      ...weekState.history.map((week) => ({ ...week, scores: week.studentScores })),
    ];
    const includedWeeks = allWeeks.filter((week) => {
      if (scope === 'week') return week.id === selectedWeekId;
      if (scope === 'month') return week.endDate.startsWith(selectedMonth);
      return true;
    });
    const includedWeekIds = new Set(includedWeeks.map((week) => week.id));
    const relevantAttendance = attendanceHistory.filter((record) => includedWeekIds.has(record.weekId));
    const relevantActivities = activities.filter((activity) => includedWeekIds.has(activity.weekId ?? weekState.current.id));
    const rows = new Map<number, Omit<ReportRow, 'rank'>>();

    students.forEach((student) => rows.set(student.id, {
      id: student.id,
      name: student.name,
      studentCode: student.studentCode ?? '',
      team: student.team,
      points: 0,
      cumulativeScore: student.score,
      weekCount: 0,
      present: 0,
      late: 0,
      excused: 0,
      absent: 0,
      activities: [],
    }));

    includedWeeks.forEach((week) => week.scores.forEach((score) => {
      const student = students.find((item) => item.id === score.studentId);
      const existing = rows.get(score.studentId) ?? {
        id: score.studentId,
        name: score.name,
        studentCode: '',
        team: score.team,
        points: 0,
        cumulativeScore: student?.score ?? 0,
        weekCount: 0,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        activities: [],
      };
      existing.name = score.name;
      existing.team = score.team;
      existing.points += score.points;
      existing.weekCount += 1;
      rows.set(score.studentId, existing);
    }));

    relevantAttendance.forEach((record) => Object.entries(record.records).forEach(([studentId, status]) => {
      const row = rows.get(Number(studentId));
      if (row) row[status] += 1;
    }));
    relevantActivities.forEach((activity) => {
      const row = rows.get(activity.studentId);
      if (row) row.activities.push(activity);
    });

    const ranked = Array.from(rows.values())
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'vi'))
      .map((row, index) => ({ ...row, rank: index + 1, activities: [...row.activities].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) }));
    const visibleRows = selectedStudentId === 'all' ? ranked : ranked.filter((row) => row.id === selectedStudentId);
    const firstWeek = [...includedWeeks].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    const lastWeek = [...includedWeeks].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
    const periodLabel = scope === 'week'
      ? (includedWeeks[0] ? `Tuần ${includedWeeks[0].number} · ${formatDate(includedWeeks[0].startDate)} – ${formatDate(includedWeeks[0].endDate)}` : 'Tuần chưa có dữ liệu')
      : scope === 'month'
        ? formatMonth(selectedMonth)
        : `Năm học ${classInfo.schoolYear}`;

    return {
      rows: visibleRows,
      allRows: ranked,
      attendanceRecords: relevantAttendance,
      weekCount: includedWeeks.length,
      periodLabel,
      dateRange: firstWeek && lastWeek ? `${formatDate(firstWeek.startDate)} – ${formatDate(lastWeek.endDate)}` : '—',
      totalPoints: visibleRows.reduce((sum, row) => sum + row.points, 0),
      activityCount: visibleRows.reduce((sum, row) => sum + row.activities.length, 0),
    };
  }, [activities, attendanceHistory, classInfo.schoolYear, scope, selectedMonth, selectedStudentId, selectedWeekId, students, weekState]);

  const reportTitle = detail === 'full' ? 'Sổ theo dõi chi tiết học sinh' : 'Sổ tổng hợp kết quả lớp học';
  const fileBase = `so-lop-${safeFileName(classInfo.code || classInfo.name)}-${scope === 'month' ? selectedMonth : scope}`;

  const buildPrintHtml = () => {
    const summaryRows = report.rows.map((row) => `
      <tr>
        <td class="center">${row.rank}</td><td>${escapeHtml(row.name)}</td><td class="center">${escapeHtml(row.studentCode || '—')}</td>
        <td class="center">${row.team}</td><td class="number">${signedPoints(row.points)}</td><td class="number">${row.cumulativeScore}</td>
        ${includeAttendance ? `<td class="center">${row.present}</td><td class="center">${row.late}</td><td class="center">${row.excused}</td><td class="center">${row.absent}</td>` : ''}
        <td></td>
      </tr>`).join('');
    const detailPages = detail === 'full' && includeActivities ? report.rows.map((row) => `
      <section class="student-detail">
        <div class="student-title"><div><small>HỒ SƠ THEO DÕI</small><h2>${escapeHtml(row.name)}</h2></div><div class="student-score"><span>Điểm kỳ báo cáo</span><strong>${signedPoints(row.points)}</strong></div></div>
        <div class="student-meta"><span>Mã học sinh: <b>${escapeHtml(row.studentCode || '—')}</b></span><span>Tổ: <b>${row.team}</b></span><span>Xếp hạng: <b>${row.rank}/${report.allRows.length}</b></span><span>Điểm tích lũy: <b>${row.cumulativeScore}</b></span></div>
        <h3>Lịch sử ghi nhận</h3>
        <table><thead><tr><th>STT</th><th>Thời gian</th><th>Nội dung</th><th>Chi tiết</th><th>Điểm</th></tr></thead><tbody>
          ${row.activities.length ? row.activities.map((activity, index) => `<tr><td class="center">${index + 1}</td><td class="center">${escapeHtml(activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('vi-VN') : activity.time)}</td><td>${escapeHtml(activity.title)}</td><td>${escapeHtml(activity.detail)}</td><td class="number">${signedPoints(activity.points)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Không có lượt ghi nhận trong kỳ báo cáo.</td></tr>'}
        </tbody></table>
        ${includeAttendance ? `<p class="attendance-line"><b>Chuyên cần:</b> Có mặt ${row.present} · Đi muộn ${row.late} · Nghỉ phép ${row.excused} · Vắng ${row.absent}</p>` : ''}
        <div class="note-box"><b>Nhận xét của giáo viên:</b></div>
      </section>`).join('') : '';
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(reportTitle)}</title><style>
      @page { size: A4 ${orientation}; margin: 12mm 10mm 14mm; }
      *{box-sizing:border-box} body{margin:0;color:#1f2937;font:11px Arial,'Segoe UI',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      header{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;border-bottom:2px solid #6d28a8;padding-bottom:9px;margin-bottom:12px} header .left{text-align:center;font-size:10px;font-weight:700} header .center{text-align:center} header h1{margin:3px 0;color:#4c176e;font-size:18px;text-transform:uppercase} header p{margin:3px 0;color:#6b7280} .badge{justify-self:end;padding:6px 9px;border:1px solid #d7bce8;border-radius:8px;color:#6d28a8;font-weight:700}
      .info{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:10px}.info div{padding:7px 9px;border:1px solid #ddd3e4;border-radius:7px;background:#faf7fc}.info span{display:block;color:#7c6c83;font-size:8px;text-transform:uppercase}.info b{display:block;margin-top:2px;color:#3f1657;font-size:10px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:11px}.kpis div{padding:7px;text-align:center;border-radius:7px;background:#f1e9f8}.kpis strong{display:block;color:#64288c;font-size:16px}.kpis span{font-size:8px;color:#6f6275}
      table{width:100%;border-collapse:collapse;page-break-inside:auto} tr{page-break-inside:avoid} th,td{padding:6px 5px;border:1.2px solid #92869a} th{color:#fff;background:#5d217f;font-size:10px;font-weight:800;text-transform:uppercase} td{color:#17121b;font-size:11px;font-weight:500}.center{text-align:center}.number{text-align:right;font-weight:800;color:#4f176f}.empty{text-align:center;color:#4b4150;padding:18px}
      .signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:30px;margin-top:17px;text-align:center;page-break-inside:avoid}.signatures p{margin:0 0 3px}.signatures small{font-style:italic}.signatures b{display:block;margin-top:48px}
      .student-detail{page-break-before:always}.student-title{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid #6d2895;padding-bottom:8px;margin-bottom:8px}.student-title small{color:#9b72ad;font-weight:700}.student-title h2{margin:2px 0 0;color:#46145f;font-size:19px}.student-score{text-align:right}.student-score span{display:block;color:#76667c;font-size:8px}.student-score strong{font-size:19px;color:#9b2f84}.student-meta{display:flex;gap:16px;padding:7px 9px;margin-bottom:10px;background:#f6f0f9;border-radius:7px}.student-detail h3{color:#53206f;font-size:11px}.attendance-line{padding:7px 9px;background:#eefaf5;border:1px solid #cde9dd;border-radius:7px}.note-box{height:75px;margin-top:10px;padding:8px;border:1px dashed #a99caf;border-radius:7px}.footer{position:fixed;bottom:-9mm;left:0;right:0;text-align:center;color:#8b7d91;font-size:7px}.footer::after{content:' · Trang ' counter(page)}
    </style></head><body>
      <header><div class="left">TRƯỜNG: ........................................<br>TỔ/ KHỐI: .......................................</div><div class="center"><p>${escapeHtml(classInfo.name)}</p><h1>${escapeHtml(reportTitle)}</h1><p>${escapeHtml(report.periodLabel)}</p></div><div class="badge">Năm học ${escapeHtml(classInfo.schoolYear)}</div></header>
      <div class="info"><div><span>Lớp</span><b>${escapeHtml(classInfo.code)}</b></div><div><span>Giáo viên chủ nhiệm</span><b>${escapeHtml(teacherName)}</b></div><div><span>Thời gian</span><b>${escapeHtml(report.dateRange)}</b></div><div><span>Ngày xuất sổ</span><b>${new Date().toLocaleDateString('vi-VN')}</b></div></div>
      <div class="kpis"><div><strong>${report.rows.length}</strong><span>học sinh trong báo cáo</span></div><div><strong>${report.weekCount}</strong><span>tuần được tính</span></div><div><strong>${signedPoints(report.totalPoints)}</strong><span>tổng điểm</span></div><div><strong>${report.activityCount}</strong><span>lượt ghi nhận</span></div></div>
      <table><thead><tr><th>Hạng</th><th>Họ và tên</th><th>Mã HS</th><th>Tổ</th><th>Điểm kỳ</th><th>Tích lũy</th>${includeAttendance ? '<th>Có mặt</th><th>Muộn</th><th>Phép</th><th>Vắng</th>' : ''}<th>Nhận xét</th></tr></thead><tbody>${summaryRows || '<tr><td class="empty" colspan="11">Chưa có dữ liệu phù hợp.</td></tr>'}</tbody></table>
      <div class="signatures"><div><p>NGƯỜI LẬP BẢNG</p><small>(Ký, ghi rõ họ tên)</small><b>${escapeHtml(teacherName)}</b></div><div><p>GIÁO VIÊN CHỦ NHIỆM</p><small>(Ký, ghi rõ họ tên)</small><b></b></div><div><p>XÁC NHẬN CỦA NHÀ TRƯỜNG</p><small>(Ký tên, đóng dấu)</small><b></b></div></div>
      ${detailPages}<div class="footer">Sổ được xuất từ ứng dụng Lớp Hạnh Phúc · Không bao gồm số điện thoại hoặc mã truy cập phụ huynh</div>
    </body></html>`;
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank', 'width=1180,height=820');
    if (!printWindow) {
      window.alert('Trình duyệt đang chặn cửa sổ in. Hãy cho phép cửa sổ bật lên rồi thử lại.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 300);
  };

  const exportExcel = () => {
    const workbook = utils.book_new();
    const summaryData = report.rows.map((row) => ({
      'Xếp hạng': row.rank,
      'Họ và tên': row.name,
      'Mã học sinh': row.studentCode,
      'Tổ': row.team,
      'Số tuần': row.weekCount,
      'Điểm kỳ báo cáo': row.points,
      'Điểm tích lũy': row.cumulativeScore,
      'Có mặt': row.present,
      'Đi muộn': row.late,
      'Nghỉ phép': row.excused,
      'Vắng': row.absent,
    }));
    const summarySheet = utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 9 }, { wch: 28 }, { wch: 15 }, { wch: 7 }, { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 8 }];
    utils.book_append_sheet(workbook, summarySheet, 'Tổng hợp');

    if (includeActivities) {
      const activityData = report.rows.flatMap((row) => row.activities.map((activity) => ({
        'Họ và tên': row.name,
        'Mã học sinh': row.studentCode,
        'Tổ': row.team,
        'Thời gian': activity.createdAt ? new Date(activity.createdAt).toLocaleString('vi-VN') : activity.time,
        'Nội dung': activity.title,
        'Chi tiết': activity.detail,
        'Điểm': activity.points,
      })));
      const activitySheet = utils.json_to_sheet(activityData);
      activitySheet['!cols'] = [{ wch: 28 }, { wch: 15 }, { wch: 7 }, { wch: 20 }, { wch: 24 }, { wch: 38 }, { wch: 9 }];
      utils.book_append_sheet(workbook, activitySheet, 'Lịch sử điểm');
    }

    if (includeAttendance) {
      const visibleIds = new Set(report.rows.map((row) => row.id));
      const attendanceData = report.attendanceRecords.flatMap((record) => Object.entries(record.records)
        .filter(([studentId]) => visibleIds.has(Number(studentId)))
        .map(([studentId, status]) => {
          const student = report.rows.find((row) => row.id === Number(studentId));
          return { 'Ngày': formatDate(record.date), 'Họ và tên': student?.name ?? studentId, 'Mã học sinh': student?.studentCode ?? '', 'Tổ': student?.team ?? '', 'Trạng thái': attendanceLabels[status] };
        }));
      const attendanceSheet = utils.json_to_sheet(attendanceData);
      attendanceSheet['!cols'] = [{ wch: 13 }, { wch: 28 }, { wch: 15 }, { wch: 7 }, { wch: 15 }];
      utils.book_append_sheet(workbook, attendanceSheet, 'Chuyên cần');
    }
    writeFileXLSX(workbook, `${fileBase}.xlsx`);
  };

  return (
    <div className="class-report-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="class-report-dialog" role="dialog" aria-modal="true" aria-labelledby="class-report-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="class-report-header">
          <div className="class-report-header-icon"><FileText size={27} /></div>
          <div><span>XUẤT HỒ SƠ LỚP HỌC</span><h2 id="class-report-title">Tạo sổ theo dõi để in và lưu</h2><p>Chọn kỳ báo cáo, xem trước rồi in trực tiếp hoặc lưu thành PDF.</p></div>
          <button type="button" aria-label="Đóng cửa sổ xuất sổ" onClick={onClose}><X size={21} /></button>
        </header>

        <div className="class-report-body">
          <aside className="class-report-settings">
            <div className="report-setting-section"><span className="report-setting-label">1. KỲ BÁO CÁO</span><div className="report-scope-tabs">{(['week', 'month', 'year'] as ReportScope[]).map((item) => <button type="button" key={item} className={scope === item ? 'active' : ''} onClick={() => setScope(item)}>{item === 'week' ? 'Tuần' : item === 'month' ? 'Tháng' : 'Năm học'}</button>)}</div>
              {scope === 'week' && <label className="report-select-field"><span>Chọn tuần</span><select value={selectedWeekId} onChange={(event) => setSelectedWeekId(event.target.value)}>{weekOptions.map((week) => <option key={week.id} value={week.id}>Tuần {week.number} · {formatDate(week.startDate)} – {formatDate(week.endDate)}{week.id === weekState.current.id ? ' (đang chạy)' : ''}</option>)}</select></label>}
              {scope === 'month' && <label className="report-select-field"><span>Chọn tháng</span><select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{monthKeys.map((month) => <option key={month} value={month}>{formatMonth(month)}</option>)}</select></label>}
            </div>
            <div className="report-setting-section"><span className="report-setting-label">2. PHẠM VI</span><label className="report-select-field"><span>Học sinh</span><select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value="all">Toàn bộ lớp ({students.length} học sinh)</option>{[...students].sort((a, b) => a.name.localeCompare(b.name, 'vi')).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
              <div className="report-detail-options"><button type="button" className={detail === 'summary' ? 'active' : ''} onClick={() => setDetail('summary')}><FileText size={18} /><span><strong>Bảng tổng hợp</strong><small>Gọn để đóng sổ</small></span></button><button type="button" className={detail === 'full' ? 'active' : ''} onClick={() => setDetail('full')}><FileSpreadsheet size={18} /><span><strong>Chi tiết từng em</strong><small>Kèm lịch sử điểm</small></span></button></div>
            </div>
            <div className="report-setting-section"><span className="report-setting-label">3. NỘI DUNG & KHỔ GIẤY</span><label className="report-check"><input type="checkbox" checked={includeAttendance} onChange={(event) => setIncludeAttendance(event.target.checked)} /><span><Check size={13} /></span><div><strong>Kèm chuyên cần</strong><small>Có mặt, đi muộn, nghỉ phép, vắng</small></div></label><label className="report-check"><input type="checkbox" checked={includeActivities} onChange={(event) => setIncludeActivities(event.target.checked)} /><span><Check size={13} /></span><div><strong>Kèm lịch sử điểm</strong><small>Được đưa vào Excel và bản chi tiết</small></div></label>
              <div className="report-orientation"><button type="button" className={orientation === 'landscape' ? 'active' : ''} onClick={() => setOrientation('landscape')}>A4 ngang</button><button type="button" className={orientation === 'portrait' ? 'active' : ''} onClick={() => setOrientation('portrait')}>A4 dọc</button></div>
            </div>
            <div className="report-privacy"><ShieldCheck size={19} /><span><strong>An toàn thông tin</strong><small>Báo cáo không chứa số điện thoại, mã phụ huynh hoặc mã truy cập.</small></span></div>
          </aside>

          <div className="class-report-preview-wrap">
            <div className="report-preview-toolbar"><div><span>XEM TRƯỚC</span><strong>{report.periodLabel}</strong></div><small>{report.rows.length} học sinh · {report.weekCount} tuần</small></div>
            <div className={`class-report-paper ${orientation}`}>
              <div className="report-paper-head"><div><span>TRƯỜNG: ................................</span><span>TỔ/KHỐI: .................................</span></div><div><small>{classInfo.name}</small><h3>{reportTitle}</h3><p>{report.periodLabel}</p></div><b>Năm học {classInfo.schoolYear}</b></div>
              <div className="report-paper-info"><span><small>LỚP</small><strong>{classInfo.code}</strong></span><span><small>GIÁO VIÊN</small><strong>{teacherName}</strong></span><span><small>THỜI GIAN</small><strong>{report.dateRange}</strong></span></div>
              <div className="report-paper-kpis"><span><strong>{report.rows.length}</strong><small>học sinh</small></span><span><strong>{report.weekCount}</strong><small>tuần</small></span><span><strong>{signedPoints(report.totalPoints)}</strong><small>tổng điểm</small></span><span><strong>{report.activityCount}</strong><small>ghi nhận</small></span></div>
              <div className="report-paper-table"><div className={`report-paper-table-head ${includeAttendance ? 'has-attendance' : ''}`}><span>HẠNG</span><span>HỌ VÀ TÊN</span><span>TỔ</span><span>ĐIỂM KỲ</span><span>TÍCH LŨY</span>{includeAttendance && <span>CHUYÊN CẦN</span>}</div>{report.rows.slice(0, 12).map((row) => <div className={`report-paper-row ${includeAttendance ? 'has-attendance' : ''}`} key={row.id}><span>{row.rank}</span><strong>{row.name}</strong><span>{row.team}</span><b>{signedPoints(row.points)}</b><span>{row.cumulativeScore}</span>{includeAttendance && <small>{row.present} mặt · {row.absent} vắng</small>}</div>)}{!report.rows.length && <p className="report-paper-empty">Chưa có dữ liệu trong kỳ báo cáo này.</p>}{report.rows.length > 12 && <p className="report-paper-more">… và {report.rows.length - 12} học sinh ở các trang tiếp theo</p>}</div>
              <div className="report-paper-signatures"><span>NGƯỜI LẬP BẢNG<small>(Ký, ghi rõ họ tên)</small></span><span>GIÁO VIÊN CHỦ NHIỆM<small>(Ký, ghi rõ họ tên)</small></span><span>XÁC NHẬN NHÀ TRƯỜNG<small>(Ký tên, đóng dấu)</small></span></div>
            </div>
          </div>
        </div>

        <footer className="class-report-footer"><span>💡 Trong cửa sổ in, chọn “Save as PDF” để lưu tệp PDF.</span><div><button type="button" className="report-excel-button" onClick={exportExcel} disabled={!report.rows.length}><FileSpreadsheet size={18} /> Xuất Excel</button><button type="button" className="report-print-button" onClick={printReport} disabled={!report.rows.length}><Printer size={18} /> In / Lưu PDF</button></div></footer>
      </section>
    </div>
  );
}
