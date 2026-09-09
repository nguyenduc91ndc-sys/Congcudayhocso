import { useEffect, useState } from 'react';

type BirthdayStudent = { id: number; name: string; birthday: string };

export function upcomingBirthdays(students: BirthdayStudent[], now: Date) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const entries = students.flatMap((student) => {
    const value = student.birthday.trim();
    const local = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{4}))?$/.exec(value);
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!local && !iso) return [];
    const day = Number(iso ? iso[3] : local![1]);
    const month = Number(iso ? iso[2] : local![2]);
    const year = Number(iso ? iso[1] : local![3] || 2000);
    const birth = new Date(Date.UTC(year, month - 1, day));
    if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day || birth.getTime() > today) return [];
    // February 29 is shown on its next actual occurrence in a leap year.
    for (let nextYear = now.getFullYear(); nextYear <= now.getFullYear() + 8; nextYear++) {
      const next = new Date(Date.UTC(nextYear, month - 1, day));
      if (next.getUTCMonth() !== month - 1 || next.getUTCDate() !== day || next.getTime() < today) continue;
      return [{ student, days: Math.round((next.getTime() - today) / 86400000), date: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}` }];
    }
    return [];
  }).sort((a, b) => a.days - b.days || a.student.name.localeCompare(b.student.name, 'vi'));
  return entries.filter((entry) => entry.days === entries[0]?.days);
}

export default function BirthdayPanel({ students }: { students: BirthdayStudent[] }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const upcoming = upcomingBirthdays(students, now);
  const first = upcoming[0];
  return <section className="panel birthday-panel">
    <div className="birthday-art">🎂<i>✨</i></div>
    <span className="birthday-label">{first?.days === 0 ? 'SINH NHẬT HÔM NAY' : 'SINH NHẬT SẮP TỚI'}</span>
    {first ? <><h3>{first.days === 0 ? 'Chúc mừng sinh nhật!' : `Còn ${first.days} ngày nữa`}</h3>{upcoming.map(({ student, date }) => <p key={student.id}><strong>{student.name}</strong> · {date}</p>)}<p>{first.days === 0 ? 'Cả lớp cùng gửi những lời chúc tốt đẹp nhé!' : 'Cùng chuẩn bị lời chúc cho các bạn nhé!'}</p></> : <><h3>{students.length ? 'Chưa có ngày sinh hợp lệ' : 'Lớp chưa có học sinh'}</h3><p>Thêm ngày sinh trong hồ sơ học sinh hoặc nhập danh sách Excel để hiển thị sinh nhật của lớp.</p></>}
  </section>;
}
