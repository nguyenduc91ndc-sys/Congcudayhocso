import { TimeValue, Question, Level } from '../types';
import { LEVELS } from '../constants';

/** Convert hour (1–12) and minute (0–59) to hour hand angle in degrees */
export function hourToAngle(hour: number, minute: number): number {
    const h = hour % 12;
    return (h * 30) + (minute * 0.5); // 360/12 = 30 per hour, 0.5 per minute
}

/** Convert minute (0–59) to minute hand angle in degrees */
export function minuteToAngle(minute: number): number {
    return minute * 6; // 360/60 = 6 per minute
}

/** Convert angle (from 12 o'clock, clockwise) to nearest minute */
export function angleToMinute(angle: number): number {
    let a = ((angle % 360) + 360) % 360;
    return Math.round(a / 6) % 60;
}

/** Convert angle to nearest hour (1–12) */
export function angleToHour(angle: number): number {
    let a = ((angle % 360) + 360) % 360;
    let h = Math.round(a / 30);
    if (h === 0) h = 12;
    return h;
}

/** Format time as Vietnamese text */
export function formatTimeText(hour: number, minute: number): string {
    const h = hour % 12 || 12;

    if (minute === 0) {
        return `${h} giờ đúng`;
    }

    if (minute === 30) {
        return `${h} giờ 30 phút (${h} giờ rưỡi)`;
    }

    // "Giờ kém" only when minute > 30
    if (minute > 30) {
        const nextH = (h % 12) + 1;
        const remaining = 60 - minute;
        return `${h} giờ ${minute} phút (${nextH} giờ kém ${remaining} phút)`;
    }

    return `${h} giờ ${minute} phút`;
}

/** Format time as short text for quiz options */
export function formatTimeShort(hour: number, minute: number): string {
    const h = hour % 12 || 12;
    if (minute === 0) return `${h} giờ đúng`;
    if (minute === 30) return `${h} giờ rưỡi`;
    return `${h} giờ ${minute} phút`;
}

/** Format time as "giờ kém" style */
export function formatTimeKem(hour: number, minute: number): string {
    if (minute <= 30 || minute === 0) return formatTimeShort(hour, minute);
    const h = hour % 12 || 12;
    const nextH = (h % 12) + 1;
    const remaining = 60 - minute;
    return `${nextH} giờ kém ${remaining} phút`;
}

/** Format time for digital display (HH:MM) */
export function formatDigital(hour: number, minute: number): string {
    const h = hour % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/** Generate a random time for a given level */
export function generateRandomTime(level: Level): TimeValue {
    const config = LEVELS.find(l => l.id === level) || LEVELS[0];
    const hour = Math.floor(Math.random() * 12) + 1;
    const minuteIdx = Math.floor(Math.random() * config.minuteOptions.length);
    const minute = config.minuteOptions[minuteIdx];
    return { hour, minute };
}

/** Generate wrong options for quiz — plausible but incorrect */
export function generateQuizOptions(correct: TimeValue, level: Level): string[] {
    const correctText = formatTimeShort(correct.hour, correct.minute);
    const options = new Set<string>();
    options.add(correctText);

    // Generate wrong answers
    let attempts = 0;
    while (options.size < 4 && attempts < 50) {
        attempts++;
        const wrong = generateRandomTime(level);
        // Make sure it's not the same time
        if (wrong.hour === correct.hour && wrong.minute === correct.minute) continue;

        // Sometimes use "giờ kém" format for variety
        const useKem = wrong.minute > 30 && Math.random() > 0.5;
        const text = useKem ? formatTimeKem(wrong.hour, wrong.minute) : formatTimeShort(wrong.hour, wrong.minute);

        if (text !== correctText) {
            options.add(text);
        }
    }

    // Fallback if not enough options
    while (options.size < 4) {
        const h = Math.floor(Math.random() * 12) + 1;
        const m = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
        const text = formatTimeShort(h, m);
        if (text !== correctText) options.add(text);
    }

    // Shuffle
    const arr = Array.from(options);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** Generate a full question for quiz mode */
export function generateQuestion(level: Level): Question {
    const time = generateRandomTime(level);
    const correctAnswer = formatTimeShort(time.hour, time.minute);
    const options = generateQuizOptions(time, level);
    return { time, options, correctAnswer };
}

/** Check if two times match (with optional tolerance in minutes) */
export function checkTimeMatch(expected: TimeValue, actual: TimeValue, toleranceMin: number = 0): boolean {
    if (toleranceMin === 0) {
        return expected.hour === actual.hour && expected.minute === actual.minute;
    }
    const expectedTotal = (expected.hour % 12) * 60 + expected.minute;
    const actualTotal = (actual.hour % 12) * 60 + actual.minute;
    return Math.abs(expectedTotal - actualTotal) <= toleranceMin;
}

/** Calculate pointer angle from SVG center given mouse position */
export function calculateAngleFromCenter(
    cx: number,
    cy: number,
    mouseX: number,
    mouseY: number
): number {
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    // atan2 gives angle from positive x-axis, we need from positive y-axis (12 o'clock)
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
}
