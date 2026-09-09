import type { AttendanceRecord, AttendanceStatus } from './types';

export function attendanceAbsences(records: AttendanceRecord[], studentId: number) {
  const dates = new Map<string, AttendanceRecord[]>();
  for (const record of records) dates.set(record.date, [...(dates.get(record.date) ?? []), record]);
  const isAbsent = (status?: AttendanceStatus) => status === 'absent' || status === 'excused';
  let days = 0;
  let sessions = 0;
  for (const daily of dates.values()) {
    const legacy = daily.find((record) => (record.session ?? 'day') === 'day');
    if (legacy) {
      if (isAbsent(legacy.records[studentId])) days++;
      continue;
    }
    const morning = daily.find((record) => record.session === 'morning');
    const afternoon = daily.find((record) => record.session === 'afternoon');
    const morningAbsent = isAbsent(morning?.records[studentId]);
    const afternoonAbsent = isAbsent(afternoon?.records[studentId]);
    sessions += Number(morningAbsent) + Number(afternoonAbsent);
    if (morningAbsent && afternoonAbsent) days++;
  }
  return { days, sessions };
}

export function attendanceSessionLabel(record: AttendanceRecord) {
  return record.session === 'morning' ? 'Sáng' : record.session === 'afternoon' ? 'Chiều' : '1 buổi/ngày';
}
