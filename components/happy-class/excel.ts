import { read, utils, writeFileXLSX } from 'xlsx';
import type { Student } from './types';

export type ExcelImportResult = {
  students: Student[];
  sheetName: string;
  headerRow: number;
  detectedFields: string[];
  ignoredRows: number;
  warnings: string[];
};

type FieldName = 'name' | 'birthday' | 'gender' | 'studentCode' | 'team' | 'role' | 'score' | 'parentName' | 'parentPhone' | 'parentCode';

const requiredFields = ['name', 'birthday', 'parentName', 'parentPhone'] as const satisfies readonly FieldName[];

const fieldLabels: Record<FieldName, string> = {
  name: 'Họ và tên',
  birthday: 'Ngày sinh',
  gender: 'Giới tính',
  studentCode: 'Mã học sinh/định danh',
  team: 'Tổ/Nhóm',
  role: 'Vai trò',
  score: 'Điểm',
  parentName: 'Họ tên phụ huynh',
  parentPhone: 'SĐT phụ huynh',
  parentCode: 'Mã tra cứu',
};

const aliases: Record<FieldName, string[]> = {
  name: ['ho va ten', 'ho ten', 'ten hoc sinh', 'hoc sinh', 'fullname', 'name'],
  birthday: ['ngay thang nam sinh', 'ngay sinh', 'nam sinh', 'birthday', 'date of birth'],
  gender: ['gioi tinh', 'gender', 'phai'],
  studentCode: ['ma dinh danh 12 so', 'ma dinh danh', 'ma hoc sinh', 'ma hs', 'student id', 'id hoc sinh'],
  team: ['to nhom', 'to', 'nhom', 'nhom thi dua', 'team', 'group'],
  role: ['vai tro', 'chuc vu', 'role'],
  score: ['diem hien tai', 'tong diem', 'diem', 'score', 'points'],
  parentName: ['ten phu huynh', 'ho ten phu huynh', 'phu huynh', 'parent name'],
  parentPhone: ['sdt phu huynh', 'so dien thoai phu huynh', 'so dien thoai', 'sdt', 'dien thoai', 'phone'],
  parentCode: ['ma tra cuu phu huynh', 'ma tra cuu', 'ma phu huynh', 'parent code'],
};

const gradients = ['mint', 'sky', 'sun', 'lavender', 'coral', 'aqua', 'rose', 'grape', 'peach', 'lime', 'berry', 'ocean'];

function secureParentCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const token = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
  return `LHHP-${token.slice(0, 4)}-${token.slice(4)}`;
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalize(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  return `${words[words.length - 2]?.[0] || ''}${words[words.length - 1]?.[0] || ''}`.toLocaleUpperCase('vi-VN') || 'HS';
}

function numeric(value: unknown, fallback: number) {
  const parsed = Number(text(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findHeader(rows: unknown[][]) {
  let best: { rowIndex: number; columns: Partial<Record<FieldName, number>>; score: number; requiredCount: number } | null = null;
  const candidates = rows.slice(0, 30);
  for (let rowIndex = 0; rowIndex < candidates.length; rowIndex += 1) {
    const row = candidates[rowIndex];
    const columns: Partial<Record<FieldName, number>> = {};
    row.forEach((cell, columnIndex) => {
      const heading = normalize(cell);
      if (!heading) return;
      (Object.keys(aliases) as FieldName[]).forEach((field) => {
        if (columns[field] === undefined && aliases[field].includes(heading)) columns[field] = columnIndex;
      });
    });
    const score = Object.keys(columns).length;
    const requiredCount = requiredFields.filter((field) => columns[field] !== undefined).length;
    if (columns.name !== undefined && (!best || requiredCount > best.requiredCount || (requiredCount === best.requiredCount && score > best.score))) {
      best = { rowIndex, columns, score, requiredCount };
    }
  }
  return best;
}

export async function parseStudentWorkbook(file: File): Promise<ExcelImportResult> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Tệp Excel quá lớn. Vui lòng chọn tệp dưới 10 MB.');
  if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error('Vui lòng chọn đúng tệp Excel có đuôi .xlsx hoặc .xls.');

  const workbook = read(await file.arrayBuffer(), { cellDates: false });
  let chosen: { sheetName: string; rows: unknown[][]; header: NonNullable<ReturnType<typeof findHeader>> } | null = null;
  for (const sheetName of workbook.SheetNames) {
    const rows = utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
    const header = findHeader(rows);
    if (header && (!chosen || header.score > chosen.header.score)) chosen = { sheetName, rows, header };
  }
  if (!chosen) throw new Error('Không tìm thấy cột “Họ và tên” trong 30 dòng đầu của tệp Excel.');

  const { rows, header, sheetName } = chosen;
  const missingColumns = requiredFields.filter((field) => header.columns[field] === undefined).map((field) => fieldLabels[field]);
  if (missingColumns.length) {
    throw new Error(`Tệp còn thiếu cột bắt buộc: ${missingColumns.join(', ')}. Vui lòng dùng file mẫu mới và điền đủ 4 cột có dấu (*).`);
  }

  const students: Student[] = [];
  const warnings: string[] = [];
  const incompleteRows: string[] = [];
  let ignoredRows = 0;
  const cell = (row: unknown[], field: FieldName) => header.columns[field] === undefined ? '' : row[header.columns[field] as number];

  rows.slice(header.rowIndex + 1).forEach((row, offset) => {
    const hasStudentIdentity = text(cell(row, 'name')) || text(cell(row, 'parentName')) || text(cell(row, 'parentPhone'));
    if (!hasStudentIdentity) return;
    const missingValues = requiredFields.filter((field) => !text(cell(row, field))).map((field) => fieldLabels[field]);
    if (missingValues.length) {
      incompleteRows.push(`Dòng ${header.rowIndex + offset + 2} thiếu ${missingValues.join(', ')}`);
      ignoredRows += 1;
      return;
    }
    const name = text(cell(row, 'name'));
    if (name.length > 120) {
      warnings.push(`Dòng ${header.rowIndex + offset + 2}: tên quá dài nên đã bỏ qua.`);
      return;
    }
    const id = Date.now() + offset + 1;
    const studentInitials = initials(name);
    const rawTeam = Math.trunc(numeric(cell(row, 'team'), 1));
    const team = rawTeam >= 1 && rawTeam <= 99 ? rawTeam : 1;
    const rawScore = Math.trunc(numeric(cell(row, 'score'), 0));
    students.push({
      id,
      name,
      initials: studentInitials,
      birthday: text(cell(row, 'birthday')),
      gender: text(cell(row, 'gender')) || undefined,
      studentCode: text(cell(row, 'studentCode')) || undefined,
      team,
      role: text(cell(row, 'role')) || 'Thành viên',
      score: Math.max(0, rawScore),
      weeklyScore: 0,
      streak: 0,
      attendance: 'present',
      gradient: gradients[students.length % gradients.length],
      parentCode: text(cell(row, 'parentCode')).toLocaleUpperCase('vi-VN') || secureParentCode(),
      parentName: text(cell(row, 'parentName')),
      parentPhone: text(cell(row, 'parentPhone')),
      strengths: [],
    });
  });

  if (incompleteRows.length) {
    const details = incompleteRows.slice(0, 5).join('; ');
    const remaining = incompleteRows.length > 5 ? `; và ${incompleteRows.length - 5} dòng khác` : '';
    throw new Error(`Chưa thể nhập vì có dòng thiếu thông tin bắt buộc. ${details}${remaining}.`);
  }
  if (!students.length) throw new Error('Không tìm thấy học sinh hợp lệ bên dưới dòng tiêu đề.');
  if (students.length > 500) throw new Error('Danh sách vượt quá giới hạn 500 học sinh.');
  return {
    students,
    sheetName,
    headerRow: header.rowIndex + 1,
    detectedFields: (Object.keys(header.columns) as FieldName[]).map((field) => fieldLabels[field]),
    ignoredRows,
    warnings,
  };
}

export function downloadStudentTemplate() {
  const worksheet = utils.aoa_to_sheet([
    ['CÁC CỘT CÓ (*) LÀ BẮT BUỘC. Xóa dòng ví dụ trước khi nhập danh sách thật.'],
    ['Họ và tên (*)', 'Ngày sinh (*)', 'Giới tính', 'Tổ/Nhóm', 'Vai trò', 'Điểm', 'Mã học sinh/định danh', 'Họ tên phụ huynh (*)', 'SĐT phụ huynh (*)', 'Mã tra cứu phụ huynh'],
    ['Nguyễn Văn An', '15/03/2016', 'Nam', 1, 'Thành viên', 0, '', 'Nguyễn Văn Bình', '0900000000', ''],
  ]);
  worksheet['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 9 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 22 }];
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Danh sách học sinh');
  writeFileXLSX(workbook, 'mau-danh-sach-hoc-sinh.xlsx');
}


