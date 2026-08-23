import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import {
  Check,
  Download,
  GripVertical,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Shuffle,
  Sparkles,
  Unlock,
  UsersRound,
  Wand2,
  X,
} from 'lucide-react';
import type { Student } from './types';

export type ClassroomSeat = {
  id: string;
  studentId?: number;
  locked?: boolean;
};

export type ClassroomDesk = {
  id: string;
  row: number;
  column: number;
  seats: ClassroomSeat[];
};

export type ClassroomLayout = {
  version: 1;
  name: string;
  rows: number;
  columns: number;
  defaultSeatsPerDesk: 1 | 2 | 3 | 4;
  desks: ClassroomDesk[];
  previousPairings?: string[];
  shuffleRound?: number;
  updatedAt: string;
};

type ClassroomSeatingPageProps = {
  students: Student[];
  classCode: string;
  className: string;
  schoolYear: string;
  teacherName: string;
  canManage: boolean;
  value: ClassroomLayout | null;
  onChange: (layout: ClassroomLayout) => void;
  onToast: (message: string) => void;
};

type ShufflePhase = 'idle' | 'countdown' | 'revealing';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

function makeSeatId(row: number, column: number, index: number) {
  return `seat-${row}-${column}-${index}`;
}

function makeDesk(row: number, column: number, seatCount: number): ClassroomDesk {
  return {
    id: `desk-${row}-${column}`,
    row,
    column,
    seats: Array.from({ length: seatCount }, (_, index) => ({ id: makeSeatId(row, column, index) })),
  };
}

function buildDesks(rows: number, columns: number, seatCount: number) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => makeDesk(row, column, seatCount)),
  ).flat();
}

export function createClassroomLayout(students: Student[] = []): ClassroomLayout {
  const columns = 4;
  const defaultSeatsPerDesk = 2;
  const rows = clamp(Math.ceil(Math.max(students.length, 1) / (columns * defaultSeatsPerDesk)), 3, 10);
  const desks = buildDesks(rows, columns, defaultSeatsPerDesk);
  students.forEach((student, index) => {
    const seat = desks.flatMap((desk) => desk.seats)[index];
    if (seat) seat.studentId = student.id;
  });
  return {
    version: 1,
    name: 'Sơ đồ chính',
    rows,
    columns,
    defaultSeatsPerDesk,
    desks,
    previousPairings: [],
    shuffleRound: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function isClassroomLayout(value: unknown): value is ClassroomLayout {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const layout = value as Partial<ClassroomLayout>;
  if (layout.version !== 1 || typeof layout.name !== 'string' || layout.name.length > 100
    || !Number.isInteger(layout.rows) || (layout.rows ?? 0) < 1 || (layout.rows ?? 0) > 10
    || !Number.isInteger(layout.columns) || (layout.columns ?? 0) < 1 || (layout.columns ?? 0) > 6
    || ![1, 2, 3, 4].includes(layout.defaultSeatsPerDesk ?? 0)
    || !Array.isArray(layout.desks) || layout.desks.length !== (layout.rows ?? 0) * (layout.columns ?? 0)
    || typeof layout.updatedAt !== 'string') return false;
  const deskIds = new Set<string>();
  const seatIds = new Set<string>();
  const studentIds = new Set<number>();
  for (const desk of layout.desks) {
    if (!desk || typeof desk !== 'object' || typeof desk.id !== 'string' || deskIds.has(desk.id)
      || !Number.isInteger(desk.row) || desk.row < 0 || desk.row >= (layout.rows ?? 0)
      || !Number.isInteger(desk.column) || desk.column < 0 || desk.column >= (layout.columns ?? 0)
      || !Array.isArray(desk.seats) || desk.seats.length < 1 || desk.seats.length > 4) return false;
    deskIds.add(desk.id);
    for (const seat of desk.seats) {
      if (!seat || typeof seat !== 'object' || typeof seat.id !== 'string' || seatIds.has(seat.id)
        || (seat.studentId !== undefined && (!Number.isFinite(seat.studentId) || studentIds.has(seat.studentId)))
        || (seat.locked !== undefined && typeof seat.locked !== 'boolean')) return false;
      seatIds.add(seat.id);
      if (seat.studentId !== undefined) studentIds.add(seat.studentId);
    }
  }
  return (layout.previousPairings === undefined || (Array.isArray(layout.previousPairings) && layout.previousPairings.length <= 1000 && layout.previousPairings.every((item) => typeof item === 'string')))
    && (layout.shuffleRound === undefined || (Number.isInteger(layout.shuffleRound) && layout.shuffleRound >= 0));
}

export function getClassroomLayoutStudentIds(layout: ClassroomLayout) {
  return layout.desks.flatMap((desk) => desk.seats).flatMap((seat) => seat.studentId === undefined ? [] : [seat.studentId]);
}

function copyLayout(layout: ClassroomLayout): ClassroomLayout {
  return {
    ...layout,
    desks: layout.desks.map((desk) => ({ ...desk, seats: desk.seats.map((seat) => ({ ...seat })) })),
    previousPairings: [...(layout.previousPairings ?? [])],
  };
}

function rebuildLayout(layout: ClassroomLayout, rows: number, columns: number, seatsPerDesk: number): ClassroomLayout {
  const normalizedRows = clamp(rows, 1, 10);
  const normalizedColumns = clamp(columns, 1, 6);
  const normalizedSeats = clamp(seatsPerDesk, 1, 4) as 1 | 2 | 3 | 4;
  const oldSeats = layout.desks.flatMap((desk) => desk.seats);
  const oldById = new Map(oldSeats.map((seat) => [seat.id, seat]));
  const usedStudents = new Set<number>();
  const desks = buildDesks(normalizedRows, normalizedColumns, normalizedSeats);

  desks.forEach((desk) => desk.seats.forEach((seat) => {
    const previous = oldById.get(seat.id);
    if (previous?.studentId !== undefined && !usedStudents.has(previous.studentId)) {
      seat.studentId = previous.studentId;
      seat.locked = previous.locked;
      usedStudents.add(previous.studentId);
    }
  }));

  const displaced = oldSeats.filter((seat) => seat.studentId !== undefined && !usedStudents.has(seat.studentId));
  const emptySeats = desks.flatMap((desk) => desk.seats).filter((seat) => seat.studentId === undefined);
  displaced.forEach((seat, index) => {
    if (!emptySeats[index] || seat.studentId === undefined) return;
    emptySeats[index].studentId = seat.studentId;
    emptySeats[index].locked = seat.locked;
  });

  return {
    ...layout,
    rows: normalizedRows,
    columns: normalizedColumns,
    defaultSeatsPerDesk: normalizedSeats,
    desks,
    updatedAt: new Date().toISOString(),
  };
}

function secureShuffle<T>(items: T[]) {
  const result = [...items];
  const random = new Uint32Array(Math.max(1, result.length));
  crypto.getRandomValues(random);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = random[index] % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function pairingKeys(layout: ClassroomLayout) {
  const pairs: string[] = [];
  layout.desks.forEach((desk) => {
    const ids = desk.seats.flatMap((seat) => seat.studentId === undefined ? [] : [seat.studentId]).sort((a, b) => a - b);
    for (let left = 0; left < ids.length; left += 1) {
      for (let right = left + 1; right < ids.length; right += 1) pairs.push(`${ids[left]}-${ids[right]}`);
    }
  });
  return pairs;
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return `${words.at(-2)?.[0] ?? ''}${words.at(-1)?.[0] ?? ''}`.toLocaleUpperCase('vi-VN') || 'HS';
}

function shortName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 2 ? words.slice(-2).join(' ') : name;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function StudentCard({ student, selected, disabled, onSelect }: { student: Student; selected: boolean; disabled: boolean; onSelect: (studentId: number) => void }) {
  const draggable = useDraggable({ id: `student-${student.id}`, data: { studentId: student.id }, disabled });
  const style = { transform: DndCSS.Translate.toString(draggable.transform), zIndex: draggable.isDragging ? 20 : undefined } as CSSProperties;
  return (
    <button
      ref={draggable.setNodeRef}
      type="button"
      className={`seating-student-card ${selected ? 'is-selected' : ''} ${draggable.isDragging ? 'is-dragging' : ''}`}
      style={style}
      onClick={() => onSelect(student.id)}
      {...draggable.listeners}
      {...draggable.attributes}
    >
      <span className={`seating-avatar gradient-${student.gradient}`}>{student.photo ? <img src={student.photo} alt="" /> : student.initials || initials(student.name)}</span>
      <span><strong>{shortName(student.name)}</strong><small>Tổ {student.team}</small></span>
      <GripVertical size={14} />
    </button>
  );
}

function SeatCard({
  seat,
  student,
  selected,
  canManage,
  hidden,
  onSelect,
  onToggleLock,
}: {
  seat: ClassroomSeat;
  student?: Student;
  selected: boolean;
  canManage: boolean;
  hidden: boolean;
  onSelect: () => void;
  onToggleLock: (event: ReactMouseEvent) => void;
}) {
  const droppable = useDroppable({ id: `drop-${seat.id}`, data: { seatId: seat.id }, disabled: !canManage || seat.locked });
  return (
    <div ref={droppable.setNodeRef} className={`seating-seat ${student ? 'is-filled' : 'is-empty'} ${seat.locked ? 'is-locked' : ''} ${selected ? 'is-selected' : ''} ${droppable.isOver ? 'is-over' : ''} ${hidden ? 'is-hidden-reveal' : ''}`}>
      {hidden ? (
        <div className="seating-mystery"><Sparkles size={18} /><strong>?</strong></div>
      ) : student ? (
        <StudentCard student={student} selected={selected} disabled={!canManage || Boolean(seat.locked)} onSelect={onSelect} />
      ) : (
        <button className="seating-empty-seat" type="button" onClick={onSelect} disabled={!canManage || Boolean(seat.locked)}><Plus size={15} /><span>Ghế trống</span></button>
      )}
      {canManage && !hidden && (
        <button className="seating-seat-lock" type="button" onClick={onToggleLock} aria-label={seat.locked ? 'Mở khóa ghế' : 'Khóa ghế'} title={seat.locked ? 'Mở khóa ghế' : 'Giữ nguyên vị trí này'}>
          {seat.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
      )}
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="seating-stepper">
      <span>{label}</span>
      <div><button type="button" disabled={value <= min} onClick={() => onChange(value - 1)}><Minus size={15} /></button><strong>{value}</strong><button type="button" disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={15} /></button></div>
    </div>
  );
}

export default function ClassroomSeatingPage({ students, classCode, className, schoolYear, teacherName, canManage, value, onChange, onToast }: ClassroomSeatingPageProps) {
  const layout = useMemo(() => value ?? createClassroomLayout(students), [students, value]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [undoLayout, setUndoLayout] = useState<ClassroomLayout | null>(null);
  const [excludeAbsent, setExcludeAbsent] = useState(true);
  const [keepLocked, setKeepLocked] = useState(true);
  const [avoidPrevious, setAvoidPrevious] = useState(true);
  const [shufflePhase, setShufflePhase] = useState<ShufflePhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [revealedDeskIds, setRevealedDeskIds] = useState<Set<string>>(new Set());
  const [isPresentation, setIsPresentation] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const allSeats = layout.desks.flatMap((desk) => desk.seats);
  const assignedIds = new Set(allSeats.flatMap((seat) => seat.studentId === undefined || !studentMap.has(seat.studentId) ? [] : [seat.studentId]));
  const unassigned = students.filter((student) => !assignedIds.has(student.id));
  const capacity = allSeats.length;
  const isBusy = shufflePhase !== 'idle';

  useEffect(() => {
    if (!value) onChange(layout);
  }, [layout, onChange, value]);

  useEffect(() => {
    if (!value) return;
    let changed = false;
    const seen = new Set<number>();
    const next = copyLayout(value);
    next.desks.forEach((desk) => desk.seats.forEach((seat) => {
      if (seat.studentId !== undefined && (!studentMap.has(seat.studentId) || seen.has(seat.studentId))) {
        delete seat.studentId;
        seat.locked = false;
        changed = true;
      } else if (seat.studentId !== undefined) seen.add(seat.studentId);
    }));
    if (changed) onChange({ ...next, updatedAt: new Date().toISOString() });
  }, [onChange, studentMap, value]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') void audioContextRef.current.close().catch(() => undefined);
  }, []);

  useEffect(() => {
    const sync = () => setIsPresentation(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const commit = (next: ClassroomLayout, remember = true) => {
    if (remember) setUndoLayout(copyLayout(layout));
    onChange({ ...next, updatedAt: new Date().toISOString() });
  };

  const seatById = (seatId: string, source = layout) => source.desks.flatMap((desk) => desk.seats).find((seat) => seat.id === seatId);

  const moveStudent = (studentId: number, targetSeatId?: string) => {
    if (!canManage || isBusy) return;
    const next = copyLayout(layout);
    const seats = next.desks.flatMap((desk) => desk.seats);
    const source = seats.find((seat) => seat.studentId === studentId);
    if (source?.locked) {
      onToast('Ghế này đang được khóa. Mở khóa trước khi đổi chỗ.');
      return;
    }
    if (!targetSeatId) {
      if (source) delete source.studentId;
      commit(next);
      setSelectedStudentId(null);
      return;
    }
    const target = seats.find((seat) => seat.id === targetSeatId);
    if (!target || target.locked || target === source) return;
    const displaced = target.studentId;
    target.studentId = studentId;
    if (source) {
      if (displaced === undefined) delete source.studentId;
      else source.studentId = displaced;
    }
    commit(next);
    setSelectedStudentId(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const studentId = active.data.current?.studentId;
    if (typeof studentId !== 'number' || !over) return;
    if (over.id === 'drop-unassigned') moveStudent(studentId);
    else if (typeof over.data.current?.seatId === 'string') moveStudent(studentId, over.data.current.seatId);
  };

  const selectSeat = (seat: ClassroomSeat) => {
    if (!canManage || isBusy || seat.locked) return;
    if (selectedStudentId !== null) moveStudent(selectedStudentId, seat.id);
    else if (seat.studentId !== undefined) setSelectedStudentId(seat.studentId);
  };

  const toggleSeatLock = (seatId: string) => {
    if (!canManage || isBusy) return;
    const next = copyLayout(layout);
    const seat = seatById(seatId, next);
    if (!seat) return;
    seat.locked = !seat.locked;
    commit(next);
  };

  const changeStructure = (rows: number, columns: number, seats: number) => {
    if (!canManage || isBusy) return;
    const next = rebuildLayout(layout, rows, columns, seats);
    const overflow = Math.max(0, assignedIds.size - next.desks.flatMap((desk) => desk.seats).length);
    commit(next);
    if (overflow) onToast(`${overflow} học sinh đã được đưa về danh sách chưa xếp vì thiếu ghế.`);
  };

  const changeDeskSeats = (deskId: string, amount: number) => {
    if (!canManage || isBusy) return;
    const next = copyLayout(layout);
    const desk = next.desks.find((item) => item.id === deskId);
    if (!desk) return;
    const nextCount = clamp(desk.seats.length + amount, 1, 4);
    if (nextCount === desk.seats.length) return;
    if (nextCount > desk.seats.length) {
      desk.seats.push({ id: makeSeatId(desk.row, desk.column, desk.seats.length) });
    } else {
      desk.seats.pop();
    }
    commit(next);
  };

  const fillInOrder = () => {
    if (!canManage || isBusy) return;
    const next = copyLayout(layout);
    const seats = next.desks.flatMap((desk) => desk.seats);
    const lockedIds = new Set(seats.filter((seat) => seat.locked && seat.studentId !== undefined).map((seat) => seat.studentId as number));
    seats.forEach((seat) => { if (!seat.locked) delete seat.studentId; });
    const targets = seats.filter((seat) => !seat.locked);
    students.filter((student) => !lockedIds.has(student.id)).slice(0, targets.length).forEach((student, index) => { targets[index].studentId = student.id; });
    commit(next);
    onToast('Đã xếp học sinh theo thứ tự danh sách.');
  };

  const clearAssignments = () => {
    if (!canManage || isBusy || !window.confirm('Đưa toàn bộ học sinh ở các ghế chưa khóa về danh sách chưa xếp?')) return;
    const next = copyLayout(layout);
    next.desks.forEach((desk) => desk.seats.forEach((seat) => { if (!seat.locked) delete seat.studentId; }));
    commit(next);
    setSelectedStudentId(null);
  };

  const playTone = (completion = false) => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      const startAt = context.currentTime;
      const notes = completion ? [523, 659, 784] : [620];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = completion ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, startAt + index * .08);
        gain.gain.exponentialRampToValueAtTime(completion ? .075 : .035, startAt + index * .08 + .01);
        gain.gain.exponentialRampToValueAtTime(.0001, startAt + index * .08 + .18);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt + index * .08);
        oscillator.stop(startAt + index * .08 + .2);
      });
    } catch {
      // Âm thanh chỉ là hiệu ứng bổ trợ; sơ đồ vẫn hoạt động nếu trình duyệt chặn Web Audio.
    }
  };

  const buildRandomLayout = () => {
    const base = copyLayout(layout);
    const seats = base.desks.flatMap((desk) => desk.seats);
    const fixedIds = new Set<number>();
    if (keepLocked) seats.forEach((seat) => { if (seat.locked && seat.studentId !== undefined && studentMap.has(seat.studentId)) fixedIds.add(seat.studentId); });
    const eligible = students.filter((student) => (!excludeAbsent || student.attendance !== 'absent') && !fixedIds.has(student.id));
    const targetSeats = seats.filter((seat) => !(keepLocked && seat.locked));
    if (eligible.length > targetSeats.length) {
      onToast(`Sơ đồ còn thiếu ${eligible.length - targetSeats.length} ghế cho danh sách tham gia.`);
      return null;
    }
    targetSeats.forEach((seat) => { delete seat.studentId; });
    const previous = new Set(layout.previousPairings ?? []);
    let best: ClassroomLayout | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    const attempts = avoidPrevious && previous.size ? 45 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const candidate = copyLayout(base);
      const candidateTargets = candidate.desks.flatMap((desk) => desk.seats).filter((seat) => !(keepLocked && seat.locked));
      const shuffled = secureShuffle(eligible.map((student) => student.id));
      candidateTargets.forEach((seat, index) => { if (shuffled[index] !== undefined) seat.studentId = shuffled[index]; });
      const score = pairingKeys(candidate).filter((pair) => previous.has(pair)).length;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
        if (score === 0) break;
      }
    }
    if (!best) return null;
    best.previousPairings = pairingKeys(best);
    best.shuffleRound = (layout.shuffleRound ?? 0) + 1;
    return best;
  };

  const startRandom = () => {
    if (!canManage || isBusy || !students.length) return;
    const next = buildRandomLayout();
    if (!next) return;
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setUndoLayout(copyLayout(layout));
    setSelectedStudentId(null);
    setShufflePhase('countdown');
    setCountdown(3);
    setRevealedDeskIds(new Set());
    playTone();
    [2, 1].forEach((number, index) => timersRef.current.push(window.setTimeout(() => {
      setCountdown(number);
      playTone();
    }, (index + 1) * 720)));
    timersRef.current.push(window.setTimeout(() => {
      onChange({ ...next, updatedAt: new Date().toISOString() });
      setShufflePhase('revealing');
      next.desks.forEach((desk, index) => timersRef.current.push(window.setTimeout(() => {
        setRevealedDeskIds((current) => new Set([...current, desk.id]));
        if (index % 2 === 0) playTone();
        if (index === next.desks.length - 1) {
          setShufflePhase('idle');
          playTone(true);
          onToast(`Đã hoàn thành lượt xếp ngẫu nhiên thứ ${next.shuffleRound}.`);
        }
      }, 180 + index * 145)));
    }, 2250));
  };

  const undo = () => {
    if (!undoLayout || isBusy) return;
    const current = copyLayout(layout);
    onChange({ ...copyLayout(undoLayout), updatedAt: new Date().toISOString() });
    setUndoLayout(current);
    setSelectedStudentId(null);
    onToast('Đã khôi phục sơ đồ trước đó.');
  };

  const togglePresentation = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      setIsPresentation(false);
    } else {
      setIsPresentation(true);
      await stage.requestFullscreen?.().catch(() => undefined);
    }
  };

  const buildPrintHtml = () => {
    const desksHtml = layout.desks.map((desk, index) => `<article class="desk"><header><span>BÀN ${index + 1}</span><small>${desk.seats.length} chỗ</small></header><div class="seats seats-${desk.seats.length}">${desk.seats.map((seat) => {
      const student = seat.studentId === undefined ? undefined : studentMap.get(seat.studentId);
      return `<div class="seat ${student ? 'filled' : ''}"><b>${student ? escapeHtml(initials(student.name)) : '—'}</b><span>${student ? escapeHtml(student.name) : 'Ghế trống'}</span>${student ? `<small>Tổ ${student.team}</small>` : ''}</div>`;
    }).join('')}</div></article>`).join('');
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Sơ đồ lớp ${escapeHtml(classCode)}</title><style>
      @page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{margin:0;color:#33233b;font-family:Arial,'Segoe UI',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{min-height:185mm;padding:7mm;border:2px solid #ead9f4;border-radius:20px;background:linear-gradient(145deg,#fff 0%,#fff9fd 58%,#f7f0ff 100%)}.top{text-align:center}.top h1{margin:0;color:#762e95;font-size:24px}.top p{margin:4px 0 10px;color:#775d7f;font-size:11px}.board{width:58%;margin:0 auto 6px;padding:7px;color:#fff;border:5px solid #c98c4e;border-radius:9px;background:linear-gradient(#337565,#1f5a50);box-shadow:0 4px 0 #87522d;font-size:15px;font-weight:800;letter-spacing:2px}.teacher{width:38%;margin:0 auto 8mm;padding:6px;text-align:center;color:#fff;border:3px solid #a16734;border-radius:8px;background:linear-gradient(145deg,#b97841,#794329);font-size:10px;font-weight:800}.grid{display:grid;grid-template-columns:repeat(${layout.columns},minmax(0,1fr));gap:6mm 7mm;align-items:start}.desk{padding:4px;border:2px solid #b77a3c;border-radius:10px;background:linear-gradient(145deg,#efc989,#dba863);box-shadow:0 3px 0 #8c572c}.desk header{display:flex;justify-content:space-between;margin-bottom:3px;color:#6d3e1e;font-size:8px;font-weight:900}.seats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px}.seats-1{grid-template-columns:1fr}.seat{min-height:36px;display:grid;grid-template-columns:26px 1fr;grid-template-rows:1fr 1fr;align-items:center;padding:3px;border:1px dashed #d5b58a;border-radius:6px;background:rgba(255,255,255,.62);font-size:8.5px}.seat b{grid-row:1/3;width:23px;height:23px;display:grid;place-items:center;border-radius:50%;color:#fff;background:linear-gradient(145deg,#9c5be3,#e75daf)}.seat span{font-weight:800;line-height:1.1}.seat small{color:#725b77;font-size:7px;font-weight:700}.footer{display:flex;justify-content:space-between;margin-top:4mm;color:#79677d;font-size:8px}@media print{.sheet{break-inside:avoid}}
    </style></head><body><main class="sheet"><div class="top"><h1>SƠ ĐỒ LỚP ${escapeHtml(classCode)}</h1><p>${escapeHtml(className)} · Năm học ${escapeHtml(schoolYear)} · GVCN: ${escapeHtml(teacherName)}</p></div><div class="board">BẢNG LỚP</div><div class="teacher">BÀN GIÁO VIÊN · ${escapeHtml(teacherName)}</div><section class="grid">${desksHtml}</section><footer class="footer"><span>${assignedIds.size}/${capacity} vị trí đã xếp</span><span>Cập nhật: ${new Intl.DateTimeFormat('vi-VN').format(new Date(layout.updatedAt))}</span></footer></main></body></html>`;
  };

  const printLayout = () => {
    const printWindow = window.open('', '_blank', 'width=1280,height=860');
    if (!printWindow) {
      onToast('Trình duyệt đang chặn cửa sổ in. Hãy cho phép cửa sổ bật lên.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 350);
  };

  const exportPng = () => {
    const width = 1800;
    const margin = 95;
    const gapX = 42;
    const gapY = 42;
    const deskHeight = 170;
    const headerHeight = 340;
    const footerHeight = 80;
    const height = headerHeight + layout.rows * (deskHeight + gapY) + footerHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#fffdfb');
    gradient.addColorStop(.58, '#fff6fd');
    gradient.addColorStop(1, '#f2eaff');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.textAlign = 'center';
    context.fillStyle = '#762e95';
    context.font = '900 52px Arial';
    context.fillText(`SƠ ĐỒ LỚP ${classCode}`, width / 2, 68);
    context.fillStyle = '#765f7f';
    context.font = '600 23px Arial';
    context.fillText(`${className} · Năm học ${schoolYear} · GVCN: ${teacherName}`, width / 2, 108);
    roundedRect(context, width * .22, 138, width * .56, 76, 14);
    context.fillStyle = '#28685b';
    context.fill();
    context.lineWidth = 9;
    context.strokeStyle = '#bd8248';
    context.stroke();
    context.fillStyle = '#ffffff';
    context.font = '800 27px Arial';
    context.fillText('BẢNG LỚP', width / 2, 185);
    const deskWidth = (width - margin * 2 - gapX * (layout.columns - 1)) / layout.columns;
    layout.desks.forEach((desk, deskIndex) => {
      const x = margin + desk.column * (deskWidth + gapX);
      const y = headerHeight + desk.row * (deskHeight + gapY);
      roundedRect(context, x, y, deskWidth, deskHeight, 18);
      const wood = context.createLinearGradient(x, y, x + deskWidth, y + deskHeight);
      wood.addColorStop(0, '#efca8d');
      wood.addColorStop(1, '#d99f59');
      context.fillStyle = wood;
      context.fill();
      context.lineWidth = 4;
      context.strokeStyle = '#a86b35';
      context.stroke();
      context.textAlign = 'left';
      context.fillStyle = '#72431f';
      context.font = '900 18px Arial';
      context.fillText(`BÀN ${deskIndex + 1}`, x + 13, y + 24);
      const seatColumns = desk.seats.length === 1 ? 1 : 2;
      const seatRows = Math.ceil(desk.seats.length / seatColumns);
      const seatGap = 7;
      const seatWidth = (deskWidth - 22 - seatGap * (seatColumns - 1)) / seatColumns;
      const seatHeight = (deskHeight - 43 - seatGap * (seatRows - 1)) / seatRows;
      desk.seats.forEach((seat, seatIndex) => {
        const student = seat.studentId === undefined ? undefined : studentMap.get(seat.studentId);
        const seatX = x + 11 + (seatIndex % seatColumns) * (seatWidth + seatGap);
        const seatY = y + 33 + Math.floor(seatIndex / seatColumns) * (seatHeight + seatGap);
        roundedRect(context, seatX, seatY, seatWidth, seatHeight, 10);
        context.fillStyle = student ? '#ffffff' : 'rgba(255,255,255,.58)';
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = student ? '#dfc9e8' : '#d2ad7d';
        context.stroke();
        if (student) {
          context.beginPath();
          context.arc(seatX + 28, seatY + seatHeight / 2, 19, 0, Math.PI * 2);
          context.fillStyle = ['#9a59df', '#e15aa9', '#2bbfa5', '#f09b3c'][student.id % 4];
          context.fill();
          context.textAlign = 'center';
          context.fillStyle = '#fff';
          context.font = '800 13px Arial';
          context.fillText(student.initials || initials(student.name), seatX + 28, seatY + seatHeight / 2 + 5);
          context.textAlign = 'left';
          context.fillStyle = '#39263f';
          context.font = '800 19px Arial';
          const label = shortName(student.name);
          context.fillText(label.length > 20 ? `${label.slice(0, 19)}…` : label, seatX + 54, seatY + seatHeight / 2 + 1, Math.max(30, seatWidth - 62));
          context.fillStyle = '#92799a';
          context.font = '700 14px Arial';
          context.fillText(`Tổ ${student.team}`, seatX + 54, seatY + seatHeight / 2 + 19);
        } else {
          context.textAlign = 'center';
          context.fillStyle = '#a9835d';
          context.font = '600 13px Arial';
          context.fillText('Ghế trống', seatX + seatWidth / 2, seatY + seatHeight / 2 + 4);
        }
      });
    });
    const teacherY = 232;
    roundedRect(context, width * .32, teacherY, width * .36, 64, 15);
    context.fillStyle = '#79452d';
    context.fill();
    context.textAlign = 'center';
    context.fillStyle = '#fff';
    context.font = '800 25px Arial';
    context.fillText(`BÀN GIÁO VIÊN · ${teacherName}`, width / 2, teacherY + 39);
    context.fillStyle = '#8f7994';
    context.font = '600 15px Arial';
    context.fillText(`${assignedIds.size}/${capacity} vị trí đã xếp · Tạo bởi Lớp học Hạnh phúc`, width / 2, height - 28);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `so-do-lop-${classCode.replace(/[^a-zA-Z0-9]+/g, '-') || 'lop'}.png`;
      link.click();
      URL.revokeObjectURL(url);
      onToast('Đã xuất ảnh PNG chất lượng cao.');
    }, 'image/png');
  };

  const unassignedDrop = useDroppable({ id: 'drop-unassigned', disabled: !canManage });

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="seating-page">
        <section className="seating-hero">
          <div className="seating-hero-copy"><span><Sparkles size={15} /> KHÔNG GIAN LỚP HỌC</span><h1>Sơ đồ lớp thông minh</h1><p>Tự tay sắp xếp hoặc để cả lớp hồi hộp khám phá vị trí mới qua từng bàn.</p></div>
          <div className="seating-hero-art" aria-hidden="true"><i>✦</i><div><span>HS</span><span>HS</span><span>HS</span><span>HS</span></div></div>
          <div className="seating-hero-stats"><div><strong>{assignedIds.size}</strong><span>Đã xếp</span></div><div><strong>{unassigned.length}</strong><span>Chưa xếp</span></div><div><strong>{capacity}</strong><span>Tổng ghế</span></div></div>
        </section>

        <section className="seating-toolbar panel">
          <div className="seating-toolbar-main">
            <button className="seating-random-button" type="button" disabled={!canManage || isBusy || !students.length} onClick={startRandom}><Wand2 size={19} /><span><strong>{isBusy ? 'Đang xếp chỗ…' : 'Bốc chỗ ngẫu nhiên'}</strong><small>Mở tên lần lượt theo từng bàn</small></span></button>
            <button type="button" disabled={!canManage || isBusy || !undoLayout} onClick={undo}><RotateCcw size={17} /><span>Hoàn tác</span></button>
            <button type="button" disabled={!canManage || isBusy || !students.length} onClick={fillInOrder}><UsersRound size={17} /><span>Xếp theo danh sách</span></button>
            <button type="button" onClick={printLayout}><Printer size={17} /><span>In / Lưu PDF</span></button>
            <button type="button" onClick={exportPng}><ImageIcon size={17} /><span>Xuất PNG</span></button>
            <button type="button" onClick={() => void togglePresentation()}>{isPresentation ? <Minimize2 size={17} /> : <Maximize2 size={17} />}<span>{isPresentation ? 'Thu nhỏ' : 'Trình chiếu'}</span></button>
          </div>
          {!canManage && <p className="seating-view-notice"><Lock size={14} /> Đăng nhập giáo viên để sắp xếp và tạo ngẫu nhiên. Sơ đồ hiện tại vẫn có thể xem và in.</p>}
        </section>

        <div className="seating-workspace">
          <section ref={stageRef} className={`seating-stage panel ${isPresentation ? 'is-presentation' : ''}`}>
            <div className="seating-stage-top"><div><span>SƠ ĐỒ · {classCode}</span><strong>{layout.name}</strong></div><div><small>{layout.columns} dãy · {layout.rows} hàng</small><b>{assignedIds.size}/{capacity} vị trí</b></div></div>
            <div className="seating-board"><span>BẢNG LỚP</span><small>{className} · {schoolYear}</small></div>
            <div className="seating-teacher-desk"><span>👩‍🏫</span><div><small>BÀN GIÁO VIÊN</small><strong>{teacherName}</strong></div></div>
            <div className="seating-room-scroll">
              <div className="seating-desk-grid" style={{ '--seating-columns': layout.columns } as CSSProperties}>
                {layout.desks.map((desk, deskIndex) => (
                  <article className={`seating-desk seats-${desk.seats.length} ${shufflePhase === 'revealing' && revealedDeskIds.has(desk.id) ? 'is-revealed' : ''}`} key={desk.id}>
                    <div className="seating-chair-row" aria-hidden="true">{desk.seats.map((seat) => <i key={seat.id} />)}</div>
                    <header><span>Bàn {deskIndex + 1}</span>{canManage && !isBusy && <div><button type="button" disabled={desk.seats.length <= 1} onClick={() => changeDeskSeats(desk.id, -1)} title="Bớt một ghế"><Minus size={12} /></button><small>{desk.seats.length} chỗ</small><button type="button" disabled={desk.seats.length >= 4} onClick={() => changeDeskSeats(desk.id, 1)} title="Thêm một ghế"><Plus size={12} /></button></div>}</header>
                    <div className="seating-desk-surface">
                      {desk.seats.map((seat) => <SeatCard key={seat.id} seat={seat} student={seat.studentId === undefined ? undefined : studentMap.get(seat.studentId)} selected={selectedStudentId === seat.studentId} canManage={canManage && !isBusy} hidden={shufflePhase === 'revealing' && !revealedDeskIds.has(desk.id)} onSelect={() => selectSeat(seat)} onToggleLock={(event) => { event.stopPropagation(); toggleSeatLock(seat.id); }} />)}
                    </div>
                  </article>
                ))}
              </div>
            </div>
            {shufflePhase === 'countdown' && <div className="seating-countdown"><div><Sparkles size={34} /><span>CHUẨN BỊ</span><strong key={countdown}>{countdown}</strong><small>Vị trí mới sắp được hé lộ!</small></div></div>}
            {shufflePhase === 'revealing' && <div className="seating-reveal-badge"><Shuffle size={15} /> Đang mở từng bàn…</div>}
            {isPresentation && <button className="seating-close-presentation" type="button" onClick={() => void togglePresentation()}><X size={18} /> Thoát trình chiếu</button>}
          </section>

          <aside className="seating-settings panel">
            <div className="seating-settings-heading"><span>THIẾT KẾ LỚP</span><h2>Tùy chỉnh bàn ghế</h2><p>Có thể đổi toàn lớp, sau đó tăng hoặc giảm ghế riêng ở từng bàn.</p></div>
            <div className="seating-setting-group">
              <Stepper label="Số dãy bàn" value={layout.columns} min={1} max={6} onChange={(columns) => changeStructure(layout.rows, columns, layout.defaultSeatsPerDesk)} />
              <Stepper label="Số hàng bàn" value={layout.rows} min={1} max={10} onChange={(rows) => changeStructure(rows, layout.columns, layout.defaultSeatsPerDesk)} />
            </div>
            <div className="seating-setting-block"><span>SỐ CHỖ MẶC ĐỊNH MỖI BÀN</span><div className="seating-seat-presets">{[1, 2, 3, 4].map((count) => <button type="button" key={count} className={layout.defaultSeatsPerDesk === count ? 'active' : ''} disabled={!canManage || isBusy} onClick={() => changeStructure(layout.rows, layout.columns, count)}><b>{count}</b><small>{count === 1 ? 'bàn đơn' : `${count} học sinh`}</small></button>)}</div></div>
            <div className="seating-setting-block"><span>TÙY CHỌN XẾP NGẪU NHIÊN</span><label><input type="checkbox" checked={excludeAbsent} onChange={(event) => setExcludeAbsent(event.target.checked)} /><i><Check size={12} /></i><div><strong>Không xếp học sinh vắng</strong><small>Dựa theo chuyên cần hôm nay</small></div></label><label><input type="checkbox" checked={keepLocked} onChange={(event) => setKeepLocked(event.target.checked)} /><i><Check size={12} /></i><div><strong>Giữ nguyên ghế đã khóa</strong><small>Các vị trí đặc biệt không đổi</small></div></label><label><input type="checkbox" checked={avoidPrevious} onChange={(event) => setAvoidPrevious(event.target.checked)} /><i><Check size={12} /></i><div><strong>Hạn chế ngồi lại cùng bàn</strong><small>Ưu tiên bạn ngồi mới ở lượt sau</small></div></label></div>
            <div className={`seating-capacity-card ${capacity < students.length ? 'warning' : ''}`}><div><strong>{capacity - students.length >= 0 ? `Dư ${capacity - students.length} ghế` : `Thiếu ${students.length - capacity} ghế`}</strong><span>Sĩ số {students.length} · Sức chứa {capacity}</span></div><Sparkles size={22} /></div>
            {canManage && <button type="button" className="seating-clear-button" disabled={isBusy || assignedIds.size === 0} onClick={clearAssignments}>Đưa học sinh về danh sách chưa xếp</button>}
          </aside>
        </div>

        <section ref={unassignedDrop.setNodeRef} className={`seating-roster panel ${unassignedDrop.isOver ? 'is-over' : ''}`}>
          <div className="seating-roster-heading"><div><span>DANH SÁCH CHỜ</span><h2>Học sinh chưa xếp chỗ</h2></div><p>{selectedStudentId ? 'Đã chọn một học sinh — chạm vào ghế để xếp.' : 'Kéo thẻ vào ghế hoặc chạm tên rồi chạm vào vị trí mong muốn.'}</p></div>
          {unassigned.length ? <div className="seating-roster-grid">{unassigned.map((student) => <StudentCard key={student.id} student={student} selected={selectedStudentId === student.id} disabled={!canManage || isBusy} onSelect={(studentId) => setSelectedStudentId((current) => current === studentId ? null : studentId)} />)}</div> : <div className="seating-roster-empty"><Check size={18} /><span>Tất cả học sinh đã có vị trí trong lớp.</span></div>}
        </section>
      </div>
    </DndContext>
  );
}
