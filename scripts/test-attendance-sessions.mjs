import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('../../../lop-hoc-hanh-phuc/node_modules/playwright-core');
const source = fs.readFileSync(new URL('../components/happy-class/attendance.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function('exports', compiled)(module.exports);
const { attendanceAbsences } = module.exports;
const record = (date, session, status) => ({ date, session, weekId: 'w', records: status ? { 1: status } : {} });
assert.deepEqual(attendanceAbsences([record('a', 'morning', 'present'), record('a', 'afternoon', 'excused')], 1), { days: 0, sessions: 1 });
assert.deepEqual(attendanceAbsences([record('a', 'morning', 'absent'), record('a', 'afternoon', 'excused')], 1), { days: 1, sessions: 2 });
assert.deepEqual(attendanceAbsences([record('a', undefined, 'absent'), record('b', 'morning', 'absent')], 1), { days: 1, sessions: 1 });
assert.deepEqual(attendanceAbsences([record('a', 'morning')], 1), { days: 0, sessions: 0 });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
try {
  for (const sessions of [1, 2]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((sessions) => {
      if (localStorage.getItem('attendance-test-seeded')) return;
      localStorage.setItem('attendance-test-seeded', '1');
      localStorage.setItem('ntd_user', JSON.stringify({ id: 'attendance-test', name: 'Test', email: 'dev-preview@giaovien.local', avatar: '' }));
      localStorage.setItem('happy-class-profile', JSON.stringify({ name: 'Test', code: '5/4', schoolYear: '2026–2027', subject: 'Chủ nhiệm', teamCount: 4, attendanceSessions: sessions }));
    }, sessions);
    await page.goto(process.env.ATTENDANCE_TEST_URL || 'http://127.0.0.1:4174/lop-hanh-phuc', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Tôi đã hiểu', exact: true }).click();
    await page.getByRole('button', { name: 'Nhắc lại sau', exact: true }).click();
    await page.getByRole('button', { name: 'Điểm danh ngay', exact: true }).click();
    await page.locator('.attendance-row').first().waitFor();
    if (sessions === 1) {
      assert.equal(await page.locator('.attendance-session-bar').count(), 0);
      await page.locator('.attendance-row').first().getByRole('button', { name: 'Nghỉ có phép', exact: true }).click();
      await page.getByRole('button', { name: 'Hoàn tất điểm danh', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Buổi sáng', exact: true }).click();
      assert.equal(await page.locator('.attendance-options button.active').count(), 0);
      await page.getByRole('button', { name: 'Hoàn tất điểm danh', exact: true }).click();
      await page.getByText('Vui lòng điểm danh đủ học sinh trong buổi đang chọn.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Cả lớp có mặt', exact: true }).click();
      await page.getByRole('button', { name: 'Hoàn tất điểm danh', exact: true }).click();
      await page.getByRole('button', { name: 'Buổi chiều', exact: true }).click();
      assert.equal(await page.locator('.attendance-options button.active').count(), 0);
      await page.locator('.attendance-row').first().getByRole('button', { name: 'Nghỉ có phép', exact: true }).click();
      assert.equal(await page.locator('.attendance-options button.active').count(), 1);
      await page.getByRole('button', { name: 'Buổi sáng', exact: true }).click();
      assert.equal(await page.locator('.attendance-options button.active.present').count(), 12);
      assert.match(await page.locator('.attendance-session-bar').innerText(), /Đã hoàn tất/);
      await page.getByRole('button', { name: 'Buổi chiều', exact: true }).click();
      await page.getByRole('button', { name: 'Tháng', exact: true }).click();
      assert.match(await page.locator('.attendance-monthly-summary').innerText(), /Nghỉ trọn 0 ngày · 1 buổi nghỉ/);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    }
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.attendance-row').first().waitFor();
    if (sessions === 2) await page.getByRole('button', { name: 'Buổi chiều', exact: true }).click();
    await page.locator('.attendance-row').first().locator('button.active.excused').waitFor();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'Quản lý lớp', exact: true }).click();
    await page.getByRole('button', { name: 'Sửa lớp này', exact: true }).click();
    await page.getByLabel('Số buổi học mỗi ngày', { exact: true }).selectOption(sessions === 1 ? '2' : '1');
    await page.getByRole('button', { name: 'Lưu thông tin lớp', exact: true }).click();
    await page.getByRole('button', { name: 'Chuyên cần', exact: true }).first().click();
    if (sessions === 1) {
      await page.getByText('Ngày này đã lưu theo chế độ 1 buổi.', { exact: false }).waitFor();
      assert.equal(await page.locator('.attendance-session-bar').count(), 0);
    } else {
      await page.getByRole('button', { name: 'Buổi chiều', exact: true }).click();
    }
    await page.locator('.attendance-row').first().locator('button.active.excused').waitFor();
    console.log(`PASS: ${sessions} session(s), independent records, completion and reload`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: absence reporting and no browser runtime errors');
} finally {
  await browser.close();
}
