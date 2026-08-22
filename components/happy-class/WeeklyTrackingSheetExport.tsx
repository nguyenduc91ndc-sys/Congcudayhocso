import { useMemo, useState } from 'react';
import { ClipboardList, FileSpreadsheet, Printer, ShieldCheck, X } from 'lucide-react';
import { utils, writeFileXLSX } from 'xlsx';
import type { PointReason, Student, WeekPeriod } from './types';

type WeeklyTrackingSheetExportProps = {
  students: Student[];
  pointReasons: PointReason[];
  week: WeekPeriod;
  teacherName: string;
  classInfo: { name: string; code: string; schoolYear: string };
  onClose: () => void;
};

type CodedReason = PointReason & { code: string };

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function codeReasons(reasons: PointReason[]): CodedReason[] {
  let positive = 0;
  let negative = 0;
  let neutral = 0;

  return reasons.map((reason) => ({
    ...reason,
    code: reason.points > 0
      ? `C${++positive}`
      : reason.points < 0
        ? `T${++negative}`
        : `G${++neutral}`,
  }));
}

export default function WeeklyTrackingSheetExport({
  students,
  pointReasons,
  week,
  teacherName,
  classInfo,
  onClose,
}: WeeklyTrackingSheetExportProps) {
  const [rowCount, setRowCount] = useState<30 | 40 | 50>(40);
  const [includeRoster, setIncludeRoster] = useState(true);
  const [includeInstructions, setIncludeInstructions] = useState(true);

  const codedReasons = useMemo(() => codeReasons(pointReasons), [pointReasons]);
  const positiveReasons = codedReasons.filter((reason) => reason.points > 0);
  const negativeReasons = codedReasons.filter((reason) => reason.points < 0);
  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.team - b.team || a.name.localeCompare(b.name, 'vi')),
    [students],
  );
  const fileBase = `phieu-theo-doi-tuan-${week.number}-${safeFileName(classInfo.code || classInfo.name)}`;

  const buildPrintHtml = () => {
    const reasonCards = codedReasons.map((reason) => `
      <div class="reason ${reason.points < 0 ? 'negative' : 'positive'}">
        <b>${escapeHtml(reason.code)}</b>
        <span>${escapeHtml(reason.label)}</span>
        <strong>${reason.points > 0 ? '+' : ''}${reason.points}</strong>
      </div>
    `).join('');

    const blankRows = Array.from({ length: rowCount }, (_, index) => `
      <tr>
        <td>${index + 1}</td><td></td><td></td><td></td><td></td>
        <td></td><td></td><td></td><td class="approve">□</td>
      </tr>
    `).join('');

    const rosterRows = sortedStudents.map((student, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(student.studentCode || '')}</td>
        <td>${student.team}</td><td></td><td></td>
      </tr>
    `).join('');

    return `<!doctype html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>Phiếu theo dõi Tuần ${week.number}</title>
          <style>
            @page { size: A4 landscape; margin: 9mm 9mm 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #17121a; font: 10.5px Arial, "Segoe UI", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            header { display: grid; grid-template-columns: 1fr 1.6fr 1fr; align-items: start; padding-bottom: 7px; border-bottom: 2px solid #5e217e; }
            header .school { font-size: 9px; font-weight: 700; line-height: 1.7; }
            header .title { text-align: center; }
            header h1 { margin: 2px 0; color: #48155f; font-size: 17px; text-transform: uppercase; }
            header p { margin: 2px 0; color: #534858; font-weight: 600; }
            header .week { justify-self: end; padding: 7px 10px; border: 1.5px solid #b99bc9; border-radius: 7px; text-align: center; }
            .week b { display: block; color: #5f247f; font-size: 14px; }
            .week span { font-size: 9px; }
            .meta { display: grid; grid-template-columns: .55fr 1.3fr 1fr 1fr; gap: 6px; margin: 7px 0; }
            .meta div { padding: 5px 7px; border: 1px solid #c7bdca; border-radius: 5px; }
            .meta span { display: block; color: #635869; font-size: 7px; text-transform: uppercase; }
            .meta b { display: block; margin-top: 2px; font-size: 9px; }
            .reason-title { display: flex; align-items: center; justify-content: space-between; margin: 6px 0 4px; }
            .reason-title b { color: #512067; font-size: 10px; }
            .reason-title span { color: #665b6b; font-size: 8px; }
            .reasons { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 7px; }
            .reason { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 4px; min-height: 26px; padding: 4px 5px; border: 1px solid #bcaec2; border-radius: 5px; background: #faf8fb; }
            .reason b { min-width: 24px; padding: 3px; color: #fff; border-radius: 4px; background: #6f3292; text-align: center; font-size: 8px; }
            .reason.negative b { background: #c64567; }
            .reason span { overflow: hidden; font-size: 8px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
            .reason strong { color: #5a246f; font-size: 8px; }
            .reason.negative strong { color: #a62f4d; }
            .instructions { margin: 5px 0 7px; padding: 5px 7px; color: #2d6253; border: 1px solid #b8ddcf; border-radius: 5px; background: #effbf6; font-size: 8px; font-weight: 650; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            th, td { height: 23px; padding: 3px 4px; border: 1px solid #827786; }
            th { height: 26px; color: #fff; background: #5d217c; font-size: 8px; text-transform: uppercase; }
            td { text-align: center; font-size: 9px; }
            th:nth-child(1), td:nth-child(1) { width: 32px; }
            th:nth-child(2), td:nth-child(2) { width: 68px; }
            th:nth-child(3), td:nth-child(3) { width: 155px; text-align: left; }
            th:nth-child(4), td:nth-child(4) { width: 38px; }
            th:nth-child(5), td:nth-child(5) { width: 45px; }
            th:nth-child(6), td:nth-child(6) { width: 48px; }
            th:nth-child(8), td:nth-child(8) { width: 90px; }
            th:nth-child(9), td:nth-child(9) { width: 54px; }
            .approve { font-size: 14px; }
            .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 8px; text-align: center; page-break-inside: avoid; }
            .signatures b { display: block; font-size: 8px; }
            .signatures span { display: block; margin-top: 20px; color: #605565; font-size: 7px; font-style: italic; }
            .roster { page-break-before: always; }
            .roster h2 { margin: 0 0 3px; color: #4d1765; text-align: center; }
            .roster > p { margin: 0 0 9px; text-align: center; }
            .roster table th:nth-child(n), .roster table td:nth-child(n) { width: auto; text-align: center; }
            .roster table th:nth-child(2), .roster table td:nth-child(2) { text-align: left; }
            .roster table td { height: 25px; }
            .roster-note { height: 65px; margin-top: 9px; padding: 8px; border: 1px dashed #8e828f; }
            .footer { position: fixed; right: 0; bottom: -8mm; left: 0; color: #6d626f; font-size: 7px; text-align: center; }
            .footer::after { content: " · Trang " counter(page); }
          </style>
        </head>
        <body>
          <header>
            <div class="school">TRƯỜNG: ................................................<br>TỔ/KHỐI: ..................................................</div>
            <div class="title">
              <p>${escapeHtml(classInfo.name)}</p>
              <h1>Phiếu ghi nhận học sinh theo tuần</h1>
              <p>Dùng để ghi tạm trên giấy · Giáo viên duyệt trước khi cập nhật vào ứng dụng</p>
            </div>
            <div class="week"><b>TUẦN ${week.number}</b><span>${formatDate(week.startDate)} – ${formatDate(week.endDate)}</span></div>
          </header>
          <div class="meta">
            <div><span>Lớp</span><b>${escapeHtml(classInfo.code)}</b></div>
            <div><span>Giáo viên chủ nhiệm</span><b>${escapeHtml(teacherName)}</b></div>
            <div><span>Người phụ trách theo dõi</span><b>........................................</b></div>
            <div><span>Năm học</span><b>${escapeHtml(classInfo.schoolYear)}</b></div>
          </div>
          <div class="reason-title">
            <b>DANH MỤC MÃ GHI NHẬN</b>
            <span>C = cộng điểm · T = trừ điểm · G = ghi nhận trung tính</span>
          </div>
          <div class="reasons">${reasonCards || '<div class="reason"><span>Giáo viên chưa thiết lập danh mục điểm.</span></div>'}</div>
          ${includeInstructions ? '<div class="instructions">Cách ghi: điền ngày/tiết, đúng họ tên học sinh và mã nội dung. Không tự ý tẩy xóa hoặc cộng dồn điểm. Giáo viên chỉ cập nhật những dòng đã kiểm tra và đánh dấu “GV duyệt”.</div>' : ''}
          <table>
            <thead><tr><th>STT</th><th>Ngày / Tiết</th><th>Họ và tên học sinh</th><th>Tổ</th><th>Mã</th><th>Điểm</th><th>Nội dung / Ghi chú</th><th>Người ghi</th><th>GV duyệt</th></tr></thead>
            <tbody>${blankRows}</tbody>
          </table>
          <div class="signatures">
            <div><b>NGƯỜI THEO DÕI</b><span>(Ký, ghi rõ họ tên)</span></div>
            <div><b>LỚP TRƯỞNG</b><span>(Ký, ghi rõ họ tên)</span></div>
            <div><b>GIÁO VIÊN CHỦ NHIỆM</b><span>(Kiểm tra, ký xác nhận)</span></div>
            <div><b>NGÀY CẬP NHẬT VÀO APP</b><span>....... / ....... / ............</span></div>
          </div>
          ${includeRoster ? `
            <section class="roster">
              <h2>DANH SÁCH HỌC SINH ĐỐI CHIẾU · TUẦN ${week.number}</h2>
              <p>Lớp ${escapeHtml(classInfo.code)} · Năm học ${escapeHtml(classInfo.schoolYear)}</p>
              <table>
                <thead><tr><th>STT</th><th>Họ và tên</th><th>Mã học sinh</th><th>Tổ</th><th>Vai trò theo dõi</th><th>Ký xác nhận</th></tr></thead>
                <tbody>${rosterRows}</tbody>
              </table>
              <div class="roster-note"><b>Ghi chú bàn giao của giáo viên:</b></div>
            </section>
          ` : ''}
          <div class="footer">Phiếu giấy chỉ dùng để ghi tạm · Mọi điểm số phải được giáo viên kiểm tra trước khi nhập vào Lớp Hạnh Phúc</div>
        </body>
      </html>`;
  };

  const printSheet = () => {
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
    const logRows = Array.from({ length: rowCount }, (_, index) => ({
      STT: index + 1,
      'Ngày / Tiết': '',
      'Họ và tên học sinh': '',
      Tổ: '',
      'Mã nội dung': '',
      Điểm: '',
      'Nội dung / Ghi chú': '',
      'Người ghi': '',
      'GV đã duyệt': '',
    }));
    const logSheet = utils.json_to_sheet(logRows);
    logSheet['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 7 }, { wch: 13 }, { wch: 9 }, { wch: 36 }, { wch: 18 }, { wch: 14 }];
    utils.book_append_sheet(workbook, logSheet, `Theo dõi Tuần ${week.number}`);

    const reasonSheet = utils.json_to_sheet(codedReasons.map((reason) => ({
      Mã: reason.code,
      'Nội dung': reason.label,
      Điểm: reason.points,
      Loại: reason.points > 0 ? 'Cộng điểm' : reason.points < 0 ? 'Trừ điểm' : 'Trung tính',
    })));
    reasonSheet['!cols'] = [{ wch: 9 }, { wch: 34 }, { wch: 10 }, { wch: 14 }];
    utils.book_append_sheet(workbook, reasonSheet, 'Danh mục mã');

    const rosterSheet = utils.json_to_sheet(sortedStudents.map((student, index) => ({
      STT: index + 1,
      'Họ và tên': student.name,
      'Mã học sinh': student.studentCode ?? '',
      Tổ: student.team,
      'Vai trò': student.role,
    })));
    rosterSheet['!cols'] = [{ wch: 7 }, { wch: 30 }, { wch: 16 }, { wch: 7 }, { wch: 18 }];
    utils.book_append_sheet(workbook, rosterSheet, 'Danh sách lớp');
    writeFileXLSX(workbook, `${fileBase}.xlsx`);
  };

  return (
    <div className="tracking-sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="tracking-sheet-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracking-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="tracking-sheet-header">
          <span><ClipboardList size={28} /></span>
          <div>
            <small>PHIẾU GHI TẠM TRÊN GIẤY</small>
            <h2 id="tracking-sheet-title">Phiếu theo dõi học sinh · Tuần {week.number}</h2>
            <p>Ban cán sự ghi nhận, giáo viên kiểm tra rồi mới cập nhật điểm vào ứng dụng.</p>
          </div>
          <button type="button" aria-label="Đóng phiếu theo dõi" onClick={onClose}><X size={21} /></button>
        </header>

        <div className="tracking-sheet-body">
          <aside className="tracking-sheet-settings">
            <div className="tracking-setting">
              <span>1. SỐ DÒNG GHI NHẬN</span>
              <div className="tracking-row-options">
                {([30, 40, 50] as const).map((count) => (
                  <button type="button" key={count} className={rowCount === count ? 'active' : ''} onClick={() => setRowCount(count)}>
                    <strong>{count}</strong><small>dòng trống</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="tracking-setting">
              <span>2. NỘI DUNG KÈM THEO</span>
              <label className="tracking-check">
                <input type="checkbox" checked={includeInstructions} onChange={(event) => setIncludeInstructions(event.target.checked)} />
                <i>✓</i>
                <div><strong>Hướng dẫn cách ghi</strong><small>Nhắc học sinh không tự cộng dồn hoặc tẩy xóa</small></div>
              </label>
              <label className="tracking-check">
                <input type="checkbox" checked={includeRoster} onChange={(event) => setIncludeRoster(event.target.checked)} />
                <i>✓</i>
                <div><strong>Danh sách đối chiếu</strong><small>In thêm họ tên, mã học sinh và tổ ở trang sau</small></div>
              </label>
            </div>

            <div className="tracking-summary">
              <div><strong>{codedReasons.length}</strong><span>mã nội dung</span></div>
              <div><strong>{positiveReasons.length}</strong><span>điểm cộng</span></div>
              <div><strong>{negativeReasons.length}</strong><span>điểm trừ</span></div>
            </div>

            <div className="tracking-safety">
              <ShieldCheck size={20} />
              <div>
                <strong>Giáo viên vẫn là người duyệt cuối</strong>
                <p>Phiếu không tự thay đổi điểm trong app. Chỉ nhập các dòng hợp lệ sau khi giáo viên kiểm tra.</p>
              </div>
            </div>
          </aside>

          <div className="tracking-preview-wrap">
            <div className="tracking-preview-label">
              <span>XEM TRƯỚC A4 NGANG</span>
              <strong>{rowCount} dòng · {includeRoster ? 'có' : 'không'} danh sách đối chiếu</strong>
            </div>
            <div className="tracking-paper">
              <div className="tracking-paper-head">
                <span>TRƯỜNG: .................................<br />TỔ/KHỐI: ...................................</span>
                <div>
                  <small>{classInfo.name}</small>
                  <h3>PHIẾU GHI NHẬN HỌC SINH THEO TUẦN</h3>
                  <p>Ghi tạm trên giấy · Giáo viên duyệt trước khi cập nhật</p>
                </div>
                <b>TUẦN {week.number}<small>{formatDate(week.startDate)} – {formatDate(week.endDate)}</small></b>
              </div>
              <div className="tracking-paper-meta">
                <span>Lớp <b>{classInfo.code}</b></span>
                <span>GVCN <b>{teacherName}</b></span>
                <span>Người theo dõi <b>...........................</b></span>
              </div>
              <div className="tracking-paper-reasons">
                {codedReasons.slice(0, 10).map((reason) => (
                  <span className={reason.points < 0 ? 'negative' : ''} key={reason.id}>
                    <b>{reason.code}</b>{reason.label}<strong>{reason.points > 0 ? '+' : ''}{reason.points}</strong>
                  </span>
                ))}
                {codedReasons.length > 10 && <em>+{codedReasons.length - 10} mã khác</em>}
              </div>
              {includeInstructions && (
                <p className="tracking-paper-instruction">Điền đúng ngày/tiết, học sinh và mã nội dung · Không tự ý tẩy xóa · GV đánh dấu sau khi duyệt.</p>
              )}
              <div className="tracking-paper-table">
                <div><b>STT</b><b>Ngày/Tiết</b><b>Học sinh</b><b>Tổ</b><b>Mã</b><b>Điểm</b><b>Ghi chú</b><b>Người ghi</b><b>GV duyệt</b></div>
                {Array.from({ length: 12 }, (_, index) => (
                  <div key={index}><span>{index + 1}</span><span /><span /><span /><span /><span /><span /><span /><span>□</span></div>
                ))}
              </div>
              <div className="tracking-paper-sign">
                <span>NGƯỜI THEO DÕI</span><span>LỚP TRƯỞNG</span><span>GIÁO VIÊN CHỦ NHIỆM</span><span>NGÀY NHẬP APP</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="tracking-sheet-footer">
          <span>💡 Có thể in nhiều bản để giao cho từng tổ theo dõi riêng.</span>
          <div>
            <button type="button" onClick={exportExcel}><FileSpreadsheet size={18} /> Xuất Excel</button>
            <button type="button" onClick={printSheet}><Printer size={18} /> In / Lưu PDF</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
