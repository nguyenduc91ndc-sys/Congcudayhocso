/**
 * main.js - Logic giao diện App TT27 Auto Nhận Xét
 */
import './style.css';
import ExcelJS from 'exceljs';
import { processExcel, getCellText, detectHeaders } from './remark_engine.js';

// ===== STATE =====
let currentMode = 'bank';
let uploadedBuffer = null;
let uploadedFileName = '';
let resultBuffer = null;

// ===== DOM =====
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const previewSection = document.getElementById('previewSection');
const previewTitle = document.getElementById('previewTitle');
const sheetSelect = document.getElementById('sheetSelect');
const previewHead = document.getElementById('previewHead');
const previewBody = document.getElementById('previewBody');
const statsBadge = document.getElementById('statsBadge');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const previewActionsInitial = document.getElementById('previewActionsInitial');
const previewActionsDone = document.getElementById('previewActionsDone');
const revertBtn = document.getElementById('revertBtn');
const downloadBtn2 = document.getElementById('downloadBtn2');
const resultSection = document.getElementById('resultSection');
const resultMsg = document.getElementById('resultMsg');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn2 = document.getElementById('resetBtn2');
const infoGrid = document.getElementById('infoGrid');
const aiPanel = document.getElementById('aiPanel');
const modeSwitch = document.getElementById('modeSwitch');
const groqKey = document.getElementById('groqKey');
const groqModel = document.getElementById('groqModel');
const testAiBtn = document.getElementById('testAi');
const aiStatus = document.getElementById('aiStatus');
const guideModal = document.getElementById('guideModal');
const openGuideBtn = document.getElementById('openGuideBtn');
const closeGuideBtn = document.getElementById('closeGuideBtn');
const modeGuide = document.getElementById('modeGuide');

// ===== INIT =====
groqKey.value = localStorage.getItem('groqKey') || '';
groqModel.value = localStorage.getItem('groqModel') || 'llama-3.1-8b-instant';

// ===== GUIDE MODAL =====
openGuideBtn.addEventListener('click', () => guideModal.classList.add('active'));
closeGuideBtn.addEventListener('click', () => guideModal.classList.remove('active'));
guideModal.addEventListener('click', (e) => {
  if (e.target === guideModal) guideModal.classList.remove('active');
});

// ===== MODE SWITCH =====
modeSwitch.addEventListener('click', e => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  currentMode = btn.dataset.mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  aiPanel.classList.toggle('hidden', currentMode !== 'ai');
  
  // Ẩn bảng hướng dẫn so sánh khi ở chế độ AI
  if (modeGuide) {
    if (currentMode === 'ai') modeGuide.classList.add('hidden');
    else modeGuide.classList.remove('hidden');
  }
});

// ===== SAVE SETTINGS =====
groqKey.addEventListener('change', () => localStorage.setItem('groqKey', groqKey.value));
groqModel.addEventListener('change', () => localStorage.setItem('groqModel', groqModel.value));

// ===== TEST AI =====
testAiBtn.addEventListener('click', async () => {
  const key = groqKey.value.trim();
  if (!key) { showAiStatus('Vui lòng nhập API Key!', 'err'); return; }
  testAiBtn.textContent = 'Đang kiểm tra...';
  testAiBtn.disabled = true;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (r.ok) showAiStatus('✅ API Key hợp lệ!', 'ok');
    else showAiStatus('❌ API Key không hợp lệ!', 'err');
  } catch { showAiStatus('❌ Không thể kết nối Groq API', 'err'); }
  testAiBtn.textContent = 'Kiểm tra';
  testAiBtn.disabled = false;
});

function showAiStatus(msg, type) {
  aiStatus.textContent = msg;
  aiStatus.className = `status-msg ${type}`;
}

// ===== UPLOAD =====
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

async function handleFile(file) {
  if (!file || !file.name.match(/\.xlsx?$/i)) {
    alert('Vui lòng chọn file Excel (.xlsx)');
    return;
  }
  uploadedFileName = file.name;
  uploadedBuffer = await file.arrayBuffer();

  // Hiện preview NGAY trước khi đọc Excel
  showSection('preview');
  previewTitle.textContent = `📄 ${file.name}`;
  statsBadge.textContent = 'Đang đọc file...';
  previewHead.innerHTML = '';
  previewBody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2rem;color:#94a3b8;">⏳ Đang tải dữ liệu...</td></tr>`;

  try {
    previewActionsInitial.classList.remove('hidden');
    previewActionsDone.classList.add('hidden');
    await renderPreview(uploadedBuffer, file.name);
  } catch (err) {
    console.error('Preview error:', err);
    previewBody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:1rem;color:#f87171;">⚠️ Không đọc được nội dung file. Bạn vẫn có thể nhấn "Tự động điền nhận xét" để xử lý.</td></tr>`;
    statsBadge.textContent = 'Sẵn sàng xử lý';
  }
}

let currentWb = null;

async function renderPreview(buffer, name) {
  currentWb = new ExcelJS.Workbook();
  await currentWb.xlsx.load(buffer);
  
  sheetSelect.innerHTML = '';
  let validCount = 0;
  
  currentWb.eachSheet(ws => {
    if (ws.rowCount > 0 && detectHeaders(ws).length > 0) {
      const opt = document.createElement('option');
      opt.value = ws.name;
      opt.textContent = ws.name;
      sheetSelect.appendChild(opt);
      validCount++;
    }
  });
  
  if (validCount > 0) {
    if (validCount > 1) {
      sheetSelect.classList.remove('hidden');
    } else {
      sheetSelect.classList.add('hidden');
    }
    renderSheet(sheetSelect.value);
  } else {
    previewHead.innerHTML = '';
    previewBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1rem;color:#94a3b8;">File không có sheet nào hợp lệ</td></tr>`;
    sheetSelect.classList.add('hidden');
    statsBadge.textContent = 'Lỗi file / Không đúng cấu trúc';
  }
}

function renderSheet(sheetName) {
  const ws = currentWb.getWorksheet(sheetName);
  previewHead.innerHTML = '';
  previewBody.innerHTML = '';
  
  if (!ws || ws.rowCount === 0) return;

  const maxCol = Math.min(ws.columnCount || 8, 30);

  // Header row
  const hTr = document.createElement('tr');
  for (let c = 1; c <= maxCol; c++) {
    const th = document.createElement('th');
    const h1 = ws.getRow(1).getCell(c).text?.trim();
    th.textContent = h1 || `Cột ${c}`;
    hTr.appendChild(th);
  }
  previewHead.appendChild(hTr);

  // Data row
  const maxRow = Math.min(ws.rowCount, 40);
  let rowsAdded = 0;
  let totalLevelCells = 0;

  // Gọi detectHeaders để xem headerRow thật sự nằm ở dòng nào
  const headersList = detectHeaders(ws);
  let startRow = 2;
  if (headersList && headersList.length > 0) {
     startRow = headersList[0].headerRow + 1;
  }

  for (let r = startRow; r <= maxRow; r++) {
    const row = ws.getRow(r);
    const tr = document.createElement('tr');
    let hasContent = false;

    for (let c = 1; c <= maxCol; c++) {
      const cell = row.getCell(c);
      const val = getCellText(cell);
      const td = document.createElement('td');
      td.textContent = val.length > 70 ? val.substring(0, 70) + '…' : val;

      const up = val.toUpperCase();
      if (['T', 'A'].includes(up) || up === 'TỐT') td.className = 'level-T';
      else if (['H', 'B'].includes(up) || up === 'HOÀN THÀNH') td.className = 'level-H';
      else if (['C'].includes(up) || up === 'CHƯA HT' || up === 'CHT') td.className = 'level-C';
      else if (val && r > 1 && td.textContent) td.className = 'remark-filled';

      if (val) hasContent = true;
      tr.appendChild(td);

      if (['T', 'H', 'C', 'A', 'B'].includes(up) || /^(điểm\s*)?\d+$/i.test(up)) {
        totalLevelCells++;
      }
    }

    if (hasContent) { previewBody.appendChild(tr); rowsAdded++; }
  }

  if (rowsAdded === 0) {
    previewBody.innerHTML = `<tr><td colspan="${maxCol}" style="text-align:center;padding:1rem;color:#94a3b8;">Không có dữ liệu</td></tr>`;
  }

  statsBadge.textContent = totalLevelCells > 0
    ? `Sheet "${sheetName}" có ~${totalLevelCells} mức đánh giá`
    : `Sheet "${sheetName}" — nhấn nút để xử lý`;
}

sheetSelect.addEventListener('change', () => {
  if (currentWb) renderSheet(sheetSelect.value);
});


// ===== PROCESS =====
processBtn.addEventListener('click', async () => {
  if (!uploadedBuffer) return;

  if (currentMode === 'ai') {
    const key = groqKey.value.trim();
    if (!key) { alert('Vui lòng nhập Groq API Key!'); return; }
  }

  showSection('progress');
  progressFill.style.width = '5%';
  progressText.textContent = 'Đang đọc và phân tích file...';

  try {
    const result = await processExcel(uploadedBuffer, {
      mode: currentMode,
      apiKey: groqKey.value.trim(),
      model: groqModel.value,
      onProgress: (done, total) => {
        const pct = total > 0 ? Math.min(Math.round((done / total) * 100), 99) : 50;
        progressFill.style.width = `${pct}%`;
        progressText.textContent = `Đã xử lý ${done}/${total} học sinh (${pct}%)`;
      }
    });

    resultBuffer = result;
    progressFill.style.width = '100%';
    progressText.textContent = 'Đang tải bản xem trước...';

    // Xóa loader và render lại bảng xem trước với dữ liệu đã điền
    await renderPreview(resultBuffer, uploadedFileName);

    setTimeout(() => {
      showSection('preview');
      previewActionsInitial.classList.add('hidden');
      previewActionsDone.classList.remove('hidden');
    }, 400);

  } catch (err) {
    progressText.textContent = `❌ Lỗi: ${err.message}`;
    console.error(err);
  }
});

// ===== REVERT =====
revertBtn.addEventListener('click', async () => {
  resultBuffer = null;
  previewActionsInitial.classList.remove('hidden');
  previewActionsDone.classList.add('hidden');
  await renderPreview(uploadedBuffer, uploadedFileName);
});

// ===== DOWNLOAD =====
function triggerDownload() {
  if (!resultBuffer) return;
  const blob = new Blob([resultBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'NhanXet_' + uploadedFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

downloadBtn.addEventListener('click', triggerDownload);
downloadBtn2.addEventListener('click', triggerDownload);

// ===== RESET =====
function doReset() {
  uploadedBuffer = null;
  resultBuffer = null;
  uploadedFileName = '';
  fileInput.value = '';
  showSection('upload');
}
resetBtn.addEventListener('click', doReset);
resetBtn2.addEventListener('click', doReset);

// ===== SECTION MANAGER =====
function showSection(name) {
  uploadZone.classList.add('hidden');
  progressSection.classList.add('hidden');
  previewSection.classList.add('hidden');
  resultSection.classList.add('hidden');
  infoGrid.classList.toggle('hidden', name !== 'upload');

  if (name === 'upload') uploadZone.classList.remove('hidden');
  else if (name === 'progress') progressSection.classList.remove('hidden');
  else if (name === 'preview') previewSection.classList.remove('hidden');
  else if (name === 'result') resultSection.classList.remove('hidden');
}
