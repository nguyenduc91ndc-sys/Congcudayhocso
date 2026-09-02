import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../../lop-hoc-hanh-phuc/node_modules/playwright-core/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('http://127.0.0.1:4174/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('giaoviencn-happy-class-local');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB delete blocked'));
    });
    localStorage.setItem('ntd_user', JSON.stringify({
      id: 'happy-class-multiclass-test',
      name: 'Giáo viên kiểm thử',
      email: 'dev-preview@giaovien.local',
      avatar: '',
    }));
    localStorage.setItem('happy-class-local-data-notice-v1', 'acknowledged');
  });

  await page.goto('http://127.0.0.1:4174/lop-hanh-phuc', { waitUntil: 'domcontentloaded' });
  await page.locator('.class-storage-loading').waitFor({ state: 'hidden' });
  const privacyButton = page.locator('.local-data-understand');
  if (await privacyButton.count()) {
    await privacyButton.click({ force: true });
    await page.locator('.local-data-backdrop').waitFor({ state: 'hidden' });
  }
  await page.locator('.class-switcher').waitFor();
  assert.match(await page.locator('.class-switcher').getAttribute('aria-label') || '', /\d+ lớp đang hoạt động/);

  await page.locator('.class-switcher').click();
  await page.getByRole('button', { name: /Thêm lớp/ }).click();
  const form = page.locator('.class-create-form');
  const inputs = form.locator('input');
  await inputs.nth(0).fill('Lớp kiểm thử 6B');
  await inputs.nth(1).fill('6B');
  await inputs.nth(2).fill('Tin học');
  await inputs.nth(3).fill('2026–2027');
  await form.getByRole('button', { name: /Tạo và mở lớp/ }).click();
  await page.locator('.class-workspace-card').waitFor({ state: 'hidden' });
  assert.match(await page.locator('.class-switcher').innerText(), /6B/);

  await page.getByRole('button', { name: 'Học sinh', exact: true }).first().click();
  assert.equal(await page.locator('.student-card').count(), 0, 'Lớp mới phải có danh sách học sinh riêng và đang trống');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.class-switcher')?.getAttribute('aria-label')?.includes('hiện có 2 lớp')
    && document.querySelector('.class-switcher')?.textContent?.includes('6B'), undefined, { timeout: 10_000 });
  assert.match(await page.locator('.class-switcher').innerText(), /6B/, 'Lớp đang mở phải được ghi nhớ sau khi tải lại');

  await page.locator('.class-switcher').click();
  await page.locator('.class-workspace-item').filter({ hasText: '5/4' }).locator('.class-workspace-open').click();
  await page.getByRole('button', { name: 'Học sinh', exact: true }).first().click();
  assert.equal(await page.locator('.student-card').count(), 12, 'Lớp cũ phải giữ nguyên danh sách sau khi chuyển đổi dữ liệu');

  await page.locator('.class-switcher').click();
  await page.locator('.class-workspace-item').filter({ hasText: '6B' }).locator('.class-workspace-open').click();
  await page.getByRole('button', { name: 'Học sinh', exact: true }).first().click();
  assert.equal(await page.locator('.student-card').count(), 0, 'Dữ liệu học sinh không được lẫn giữa hai lớp');

  const portalIds = await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('giaoviencn-happy-class-local');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise((resolve, reject) => {
      const transaction = database.transaction('classes', 'readonly');
      const request = transaction.objectStore('classes').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return records.map((record) => record.data.parentPortal.publicId);
  });
  assert.equal(new Set(portalIds).size, 2, 'Mỗi lớp phải có một Cổng phụ huynh riêng');

  await page.locator('.class-switcher').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sao lưu tất cả', exact: true }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^sao-luu-tat-ca-2-lop-/);
  const downloadPath = await download.path();
  assert.ok(downloadPath);
  const backup = JSON.parse(await readFile(downloadPath, 'utf8'));
  assert.equal(backup.type, 'happy-class-workspace');
  assert.equal(backup.classes.length, 2);

  await page.getByRole('button', { name: 'Đóng danh sách lớp' }).click();
  await page.getByRole('button', { name: 'Quản lý lớp', exact: true }).first().click();
  await page.getByRole('heading', { name: 'Quản lý lớp học' }).waitFor();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.management-import-input').setInputFiles(downloadPath);
  await page.waitForFunction(() => document.querySelector('.class-switcher')?.getAttribute('aria-label')?.includes('hiện có 2 lớp'));
  assert.match(await page.locator('.toast').innerText(), /khôi phục 2 lớp/i);
  assert.deepEqual(pageErrors, []);

  console.log('Happy Class multi-class smoke test passed: migration, create, switch, persistence, portal isolation, backup, and restore from the management page.');
} finally {
  await browser.close();
}
