/**
 * Thẩm Văn AI — Công cụ kiểm tra đạo văn & phát hiện AI
 * Supports Google Gemini and Groq APIs
 */

// ========================
// STATE
// ========================
const state = {
    provider: localStorage.getItem('api_provider') || 'gemini',
    keys: {
        gemini: localStorage.getItem('gemini_api_key') || '',
        groq: localStorage.getItem('groq_api_key') || '',
    },
    isScanning: false,
    lastResults: null,
    history: JSON.parse(localStorage.getItem('scan_history') || '[]'),
};

// Helper to get current API key
function getCurrentKey() {
    return state.keys[state.provider];
}

// ========================
// DOM ELEMENTS
// ========================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
    settingsBtn: $('#settingsBtn'),
    settingsPanel: $('#settingsPanel'),
    closeSettings: $('#closeSettings'),
    apiKeyInput: $('#apiKeyInput'),
    toggleKeyVisibility: $('#toggleKeyVisibility'),
    saveKeyBtn: $('#saveKeyBtn'),
    apiKeyStatus: $('#apiKeyStatus'),
    settingsDesc: $('#settingsDesc'),
    apiLink: $('#apiLink'),
    eyeIcon: $('#eyeIcon'),
    eyeOffIcon: $('#eyeOffIcon'),
    inputText: $('#inputText'),
    wordCount: $('#wordCount'),
    charCount: $('#charCount'),
    scanBtn: $('#scanBtn'),
    loadingSection: $('#loadingSection'),
    loadingStatus: $('#loadingStatus'),
    progressBar: $('#progressBar'),
    resultsSection: $('#resultsSection'),
    heroSection: $('#heroSection'),
    inputSection: $('#inputSection'),
    historyBtn: $('#historyBtn'),
    historySection: $('#historySection'),
    historyList: $('#historyList'),
    clearHistoryBtn: $('#clearHistoryBtn'),
    exportBtn: $('#exportBtn'),
    newScanBtn: $('#newScanBtn'),
    uploadZone: $('#uploadZone'),
    fileInput: $('#fileInput'),
    // Gauges
    plagiarismGauge: $('#plagiarismGauge'),
    plagiarismPercent: $('#plagiarismPercent'),
    plagiarismLabel: $('#plagiarismLabel'),
    aiGauge: $('#aiGauge'),
    aiPercent: $('#aiPercent'),
    aiLabel: $('#aiLabel'),
    originalGauge: $('#originalGauge'),
    originalPercent: $('#originalPercent'),
    originalLabel: $('#originalLabel'),
    // Result contents
    highlightedText: $('#highlightedText'),
    detailsList: $('#detailsList'),
    summaryText: $('#summaryText'),
    toastContainer: $('#toastContainer'),
};

// ========================
// INITIALIZATION
// ========================
function init() {
    // Restore provider selection
    const providerRadio = $(`input[name="apiProvider"][value="${state.provider}"]`);
    if (providerRadio) providerRadio.checked = true;
    updateProviderUI();

    // Restore API key for current provider
    const currentKey = getCurrentKey();
    if (currentKey) {
        els.apiKeyInput.value = currentKey;
        showApiKeyStatus('✓ API Key đã được lưu', 'success');
    }

    // API Key Banner — setup button opens settings
    const setupKeyBtn = $('#setupKeyBtn');
    if (setupKeyBtn) {
        setupKeyBtn.addEventListener('click', () => {
            if (!els.settingsPanel.classList.contains('open')) {
                toggleSettings();
            }
            els.settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    updateApiKeyBanner();

    // Event listeners
    els.settingsBtn.addEventListener('click', toggleSettings);
    els.closeSettings.addEventListener('click', toggleSettings);
    els.toggleKeyVisibility.addEventListener('click', toggleKeyVisibility);
    els.saveKeyBtn.addEventListener('click', saveApiKey);
    els.inputText.addEventListener('input', onTextInput);
    els.scanBtn.addEventListener('click', startScan);
    els.historyBtn.addEventListener('click', toggleHistory);
    els.clearHistoryBtn.addEventListener('click', clearHistory);
    els.exportBtn.addEventListener('click', exportReport);
    els.newScanBtn.addEventListener('click', newScan);

    // Provider switching
    $$('input[name="apiProvider"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.provider = e.target.value;
            localStorage.setItem('api_provider', state.provider);
            updateProviderUI();
            // Load saved key for this provider
            els.apiKeyInput.value = getCurrentKey();
            if (getCurrentKey()) {
                showApiKeyStatus('✓ API Key đã được lưu', 'success');
            } else {
                showApiKeyStatus('', '');
            }
            updateScanButton();
            updateApiKeyBanner();
        });
    });

    // Tab switching
    $$('.tab-btn').forEach(btn => btn.addEventListener('click', handleTabSwitch));
    $$('.result-tab').forEach(btn => btn.addEventListener('click', handleResultTabSwitch));

    // Upload
    els.uploadZone.addEventListener('click', () => els.fileInput.click());
    els.uploadZone.addEventListener('dragover', handleDragOver);
    els.uploadZone.addEventListener('dragleave', handleDragLeave);
    els.uploadZone.addEventListener('drop', handleDrop);
    els.fileInput.addEventListener('change', handleFileSelect);

    // Check scan button state
    updateScanButton();
    renderHistory();

    // Help popup
    const helpBtn = $('#helpBtn');
    const helpOverlay = $('#helpOverlay');
    const closeHelp = $('#closeHelp');
    const helpVideoIframe = $('#helpVideoIframe');
    const TUTORIAL_VIDEO_URL = 'https://www.youtube.com/embed/St_MPuZ3AGc';

    if (helpBtn && helpOverlay) {
        helpBtn.addEventListener('click', () => {
            helpOverlay.classList.add('open');
            // Lazy-load: only set src when opened
            if (helpVideoIframe && !helpVideoIframe.src.includes('youtube')) {
                helpVideoIframe.src = TUTORIAL_VIDEO_URL;
            }
        });

        closeHelp.addEventListener('click', () => {
            helpOverlay.classList.remove('open');
            // Stop video playback
            if (helpVideoIframe) helpVideoIframe.src = '';
        });

        helpOverlay.addEventListener('click', (e) => {
            if (e.target === helpOverlay) {
                helpOverlay.classList.remove('open');
                if (helpVideoIframe) helpVideoIframe.src = '';
            }
        });
    }
}

// ========================
// PROVIDER UI
// ========================
function updateProviderUI() {
    const videoTutorial = document.querySelector('.video-tutorial');
    if (state.provider === 'groq') {
        els.settingsDesc.innerHTML = 'Nhập Groq API Key của bạn. Lấy miễn phí tại <a href="https://console.groq.com/keys" target="_blank" rel="noopener" id="apiLink">Groq Console</a>. Key được lưu trên trình duyệt, không gửi đến bất kỳ server nào khác.';
        els.apiKeyInput.placeholder = 'Dán Groq API Key (gsk_...)';
        if (videoTutorial) videoTutorial.style.display = '';
    } else {
        els.settingsDesc.innerHTML = 'Nhập Google Gemini API Key của bạn. Lấy miễn phí tại <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" id="apiLink">Google AI Studio</a>. Key được lưu trên trình duyệt, không gửi đến bất kỳ server nào khác.';
        els.apiKeyInput.placeholder = 'Dán Gemini API Key (AIza...)';
        if (videoTutorial) {
            videoTutorial.style.display = 'none';
            videoTutorial.classList.remove('open'); // collapse if open
        }
    }
}

// ========================
// SETTINGS
// ========================
function toggleSettings() {
    els.settingsPanel.classList.toggle('open');
}

// Video tutorial toggle (lazy-load iframe)
function toggleVideoTutorial() {
    const container = document.querySelector('.video-tutorial');
    const iframe = document.getElementById('tutorialVideo');
    container.classList.toggle('open');

    // Lazy load: set src only when opened for the first time
    // Use getAttribute to check the raw HTML attribute (not the resolved .src property)
    const rawSrc = iframe.getAttribute('src');
    if (container.classList.contains('open') && (!rawSrc || rawSrc === '')) {
        iframe.src = iframe.dataset.src;
    }
}

function toggleKeyVisibility() {
    const input = els.apiKeyInput;
    if (input.type === 'password') {
        input.type = 'text';
        els.eyeIcon.style.display = 'none';
        els.eyeOffIcon.style.display = 'block';
    } else {
        input.type = 'password';
        els.eyeIcon.style.display = 'block';
        els.eyeOffIcon.style.display = 'none';
    }
}

function saveApiKey() {
    const key = els.apiKeyInput.value.trim();
    if (!key) {
        showApiKeyStatus('⚠ Vui lòng nhập API Key', 'error');
        return;
    }

    // Validate key format per provider
    if (state.provider === 'gemini' && !key.startsWith('AIza')) {
        showApiKeyStatus('⚠ Gemini Key không hợp lệ. Key phải bắt đầu bằng "AIza..."', 'error');
        return;
    }
    if (state.provider === 'groq' && !key.startsWith('gsk_')) {
        showApiKeyStatus('⚠ Groq Key không hợp lệ. Key phải bắt đầu bằng "gsk_..."', 'error');
        return;
    }

    state.keys[state.provider] = key;
    localStorage.setItem(state.provider === 'gemini' ? 'gemini_api_key' : 'groq_api_key', key);
    showApiKeyStatus('✓ API Key đã được lưu thành công!', 'success');
    showToast(`${state.provider === 'gemini' ? 'Gemini' : 'Groq'} API Key đã được lưu!`, 'success');
    updateScanButton();
    updateApiKeyBanner();
}

function showApiKeyStatus(msg, type) {
    els.apiKeyStatus.textContent = msg;
    els.apiKeyStatus.className = 'api-key-status ' + type;
}

// Show/hide the API Key banner based on whether any key is saved
function updateApiKeyBanner() {
    const banner = $('#apiKeyBanner');
    if (!banner) return;
    if (getCurrentKey()) {
        banner.classList.add('hidden');
    } else {
        banner.classList.remove('hidden');
    }
}

// ========================
// TEXT INPUT
// ========================
function onTextInput() {
    const text = els.inputText.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    els.wordCount.textContent = words + ' từ';
    els.charCount.textContent = chars + ' ký tự';
    updateScanButton();
}

function updateScanButton() {
    const hasText = els.inputText.value.trim().length > 10;
    const hasKey = !!getCurrentKey();
    els.scanBtn.disabled = !hasText || !hasKey || state.isScanning;

    if (!hasKey) {
        els.scanBtn.title = 'Vui lòng cài đặt API Key trước';
    } else if (!hasText) {
        els.scanBtn.title = 'Nhập ít nhất 10 ký tự';
    } else {
        els.scanBtn.title = '';
    }
}

// ========================
// TAB SWITCHING
// ========================
function handleTabSwitch(e) {
    const tab = e.currentTarget.dataset.tab;
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');

    $$('.tab-content').forEach(c => c.classList.remove('active'));
    $(`#${tab}Tab`).classList.add('active');
}

function handleResultTabSwitch(e) {
    const result = e.currentTarget.dataset.result;
    $$('.result-tab').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');

    $$('.result-content').forEach(c => c.classList.remove('active'));
    $(`#${result}Content`).classList.add('active');
}

// ========================
// FILE UPLOAD
// ========================
function handleDragOver(e) {
    e.preventDefault();
    els.uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    els.uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    els.uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
}

function processFile(file) {
    if (file.size > 20 * 1024 * 1024) {
        showToast('⚠️ File quá lớn! Tối đa 20MB.', 'error');
        // Hiện cảnh báo cố định trong vùng tải file
        let warning = document.getElementById('fileSizeWarning');
        if (!warning) {
            warning = document.createElement('div');
            warning.id = 'fileSizeWarning';
            warning.style.cssText = 'margin-top:12px;padding:14px 16px;background:linear-gradient(135deg,#fef2f2,#fff1f2);border:2px solid #fca5a5;border-radius:12px;color:#dc2626;font-size:14px;line-height:1.6;font-weight:500;';
            warning.innerHTML = '⚠️ <strong>File vượt quá 20MB!</strong><br>💡 <strong>Hướng dẫn:</strong> Nếu bài của bạn có nhiều hình ảnh, hãy xóa bớt hình ảnh hoặc giảm kích thước hình ảnh rồi tải lại file.';
            els.uploadZone.parentElement.appendChild(warning);
        }
        return;
    }

    if (file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            els.inputText.value = e.target.result;
            onTextInput();
            // Switch to paste tab
            $$('.tab-btn')[0].click();
            showToast(`Đã tải: ${file.name}`, 'success');
        };
        reader.readAsText(file, 'UTF-8');
    } else if (file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
        // File .doc (Word 97-2003) — mammoth chỉ hỗ trợ .docx
        showToast('⚠️ File .doc (Word 97-2003) không được hỗ trợ. Vui lòng lưu lại dưới dạng .docx rồi tải lên.', 'error');
        // Hiện hướng dẫn chi tiết trong vùng upload
        let docWarning = document.getElementById('docFormatWarning');
        if (!docWarning) {
            docWarning = document.createElement('div');
            docWarning.id = 'docFormatWarning';
            docWarning.style.cssText = 'margin-top:12px;padding:14px 16px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px solid #fbbf24;border-radius:12px;color:#92400e;font-size:14px;line-height:1.8;font-weight:500;';
            docWarning.innerHTML = `
                ⚠️ <strong>File "${file.name}" có định dạng .doc (Word 97-2003)</strong><br>
                💡 <strong>Cách khắc phục:</strong><br>
                1️⃣ Mở file bằng Microsoft Word<br>
                2️⃣ Chọn <strong>File → Save As (Lưu thành)</strong><br>
                3️⃣ Chọn định dạng <strong>Word Document (.docx)</strong><br>
                4️⃣ Nhấn <strong>Save</strong> rồi tải file .docx mới lên đây<br>
                <span style="font-size:12px;color:#b45309;">Hoặc bạn có thể copy-paste nội dung trực tiếp vào tab "Dán văn bản"</span>
            `;
            els.uploadZone.parentElement.appendChild(docWarning);
        }
    } else if (file.name.endsWith('.docx')) {
        showToast('Đang đọc file Word...', 'info');
        // Xóa cảnh báo .doc nếu có
        const oldWarning = document.getElementById('docFormatWarning');
        if (oldWarning) oldWarning.remove();
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
                const content = result.value.trim();
                if (!content) {
                    showToast('File Word không chứa nội dung văn bản.', 'error');
                    return;
                }
                els.inputText.value = content;
                onTextInput();
                $$('.tab-btn')[0].click();
                showToast(`Đã tải thành công: ${file.name}`, 'success');
            } catch (err) {
                console.error('DOCX read error:', err);
                showToast('Không thể đọc file .docx. Hãy thử lưu lại dưới dạng .docx mới hoặc copy-paste nội dung.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.pdf')) {
        showToast('Đang đọc file PDF...', 'info');
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const typedArray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }

                const content = fullText.trim();
                if (!content) {
                    showToast('File PDF không chứa nội dung văn bản (có thể là PDF dạng ảnh/scan).', 'error');
                    return;
                }
                els.inputText.value = content;
                onTextInput();
                $$('.tab-btn')[0].click();
                showToast(`Đã tải thành công: ${file.name} (${pdf.numPages} trang)`, 'success');
            } catch (err) {
                console.error('PDF read error:', err);
                showToast('Không thể đọc file PDF. Vui lòng thử copy-paste nội dung.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        showToast('Định dạng file không được hỗ trợ. Vui lòng dùng .txt, .docx hoặc copy-paste.', 'error');
    }
}

// ========================
// SCANNING — GEMINI API
// ========================
async function startScan() {
    if (state.isScanning) return;

    const text = els.inputText.value.trim();
    if (!text || text.length < 10) {
        showToast('Vui lòng nhập ít nhất 10 ký tự.', 'error');
        return;
    }
    if (!getCurrentKey()) {
        showToast('Vui lòng cài đặt API Key trước!', 'error');
        toggleSettings();
        return;
    }

    const checkPlagiarism = $('#checkPlagiarism').checked;
    const checkAI = $('#checkAI').checked;
    const checkStyle = $('#checkStyle').checked;

    state.isScanning = true;
    els.scanBtn.classList.add('scanning');
    els.scanBtn.disabled = true;

    // Show loading
    els.loadingSection.style.display = 'block';
    els.resultsSection.style.display = 'none';
    els.historySection.style.display = 'none';

    // Scroll to loading
    els.loadingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Animate progress
    animateProgress(0);

    const providerName = state.provider === 'gemini' ? 'Gemini AI' : 'Groq AI';

    try {
        els.loadingStatus.textContent = `Đang gửi văn bản đến ${providerName} để phân tích...`;
        animateProgress(20);

        const result = await callAIWithRetry(text, checkPlagiarism, checkAI, checkStyle);

        els.loadingStatus.textContent = 'Đang xử lý kết quả...';
        animateProgress(80);

        await delay(500);
        animateProgress(100);
        await delay(300);

        // Display results
        displayResults(result, text);

        // Save to history
        saveToHistory(text, result);

    } catch (error) {
        console.error('Scan error:', error);
        let errorMsg = 'Có lỗi xảy ra khi phân tích. ';

        if (error.message.includes('API key') || error.message.includes('api_key') || error.message.includes('401')) {
            errorMsg += 'API Key không hợp lệ. Vui lòng kiểm tra lại.';
        } else if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate')) {
            errorMsg += 'Đã hết giới hạn API. Vui lòng thử lại sau vài phút.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMsg += 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.';
        } else {
            errorMsg += error.message;
        }

        showToast(errorMsg, 'error');
        els.loadingSection.style.display = 'none';

    } finally {
        state.isScanning = false;
        els.scanBtn.classList.remove('scanning');
        updateScanButton();
    }
}


// Auto-retry with exponential backoff
async function callAIWithRetry(text, checkPlagiarism, checkAI, checkStyle, maxRetries = 2) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const waitSec = Math.pow(2, attempt) * 5; // 10s, 20s
                els.loadingStatus.textContent = `Rate limit — tự động thử lại sau ${waitSec}s (lần ${attempt + 1})...`;
                await delay(waitSec * 1000);
                els.loadingStatus.textContent = `Đang thử lại...`;
                animateProgress(20 + attempt * 10);
            }

            if (state.provider === 'groq') {
                return await callGroqAPI(text, checkPlagiarism, checkAI, checkStyle);
            } else {
                return await callGeminiAPI(text, checkPlagiarism, checkAI, checkStyle);
            }
        } catch (error) {
            lastError = error;
            const isRateLimit = error.message.includes('429') || error.message.includes('rate') || error.message.includes('quota');
            if (!isRateLimit || attempt >= maxRetries) {
                throw error;
            }
        }
    }
    throw lastError;
}

async function callGeminiAPI(text, checkPlagiarism, checkAI, checkStyle) {
    const analysisTypes = [];
    if (checkPlagiarism) analysisTypes.push('plagiarism detection (đạo văn)');
    if (checkAI) analysisTypes.push('AI-generated content detection');
    if (checkStyle) analysisTypes.push('writing style analysis');

    const prompt = buildAnalysisPrompt(text, analysisTypes, checkPlagiarism, checkAI, checkStyle);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${getCurrentKey()}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0,
                topP: 1,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
        throw new Error('Không nhận được kết quả từ Gemini API');
    }

    return parseAIResponse(resultText);
}

async function callGroqAPI(text, checkPlagiarism, checkAI, checkStyle) {
    const analysisTypes = [];
    if (checkPlagiarism) analysisTypes.push('plagiarism detection (đạo văn)');
    if (checkAI) analysisTypes.push('AI-generated content detection');
    if (checkStyle) analysisTypes.push('writing style analysis');

    const prompt = buildAnalysisPrompt(text, analysisTypes, checkPlagiarism, checkAI, checkStyle);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getCurrentKey()}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: 'Bạn là chuyên gia phân tích văn bản. Luôn trả về kết quả dạng JSON hợp lệ, không có text thừa trước/sau JSON.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            max_tokens: 8192,
            seed: 42,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;

    if (!resultText) {
        throw new Error('Không nhận được kết quả từ Groq API');
    }

    return parseAIResponse(resultText);
}

function parseAIResponse(resultText) {
    try {
        return JSON.parse(resultText);
    } catch {
        // Try to extract JSON from the response
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Không thể phân tích kết quả từ AI');
    }
}

function buildAnalysisPrompt(text, analysisTypes, checkPlagiarism, checkAI, checkStyle) {
    return `Bạn là chuyên gia phân tích văn bản, chuyên phát hiện đạo văn (plagiarism) và nội dung do AI tạo ra. 

Hãy phân tích văn bản sau và trả về kết quả dạng JSON.

**VĂN BẢN CẦN PHÂN TÍCH:**
"""
${text}
"""

**YÊU CẦU PHÂN TÍCH:** ${analysisTypes.join(', ')}

**HƯỚNG DẪN PHÂN TÍCH CHI TIẾT:**

1. **Phát hiện đạo văn:** Tìm các dấu hiệu:
   - Thay đổi đột ngột về phong cách viết, giọng văn, mức độ chuyên môn
   - Sử dụng thuật ngữ chuyên ngành không nhất quán
   - Câu trúc câu phức tạp xen lẫn câu đơn giản bất thường
   - Đoạn văn có vẻ được copy-paste (quá hoàn chỉnh, khác biệt với phần còn lại)
   - Trích dẫn không ghi nguồn

2. **Phát hiện AI:** Tìm các dấu hiệu:
   - Văn phong quá mượt mà, đều đặn, thiếu "vấp" tự nhiên
   - Sử dụng pattern lặp lại (ví dụ: liệt kê 3 điểm liên tục)
   - Câu trúc khuôn mẫu, thiếu cá tính
   - Thiếu kinh nghiệm cá nhân, ví dụ cụ thể thực tế
   - Độ "burstiness" thấp (độ dài câu quá đồng đều)
   - Sử dụng từ nối quá nhiều và quá đều

3. **Phong cách viết** (nếu được yêu cầu):
   - Đánh giá tính nhất quán trong giọng văn
   - Mức độ học thuật vs thông thường
   - Sáng tạo vs khuôn mẫu

**QUAN TRỌNG:** 
- Tách văn bản thành từng đoạn (mỗi đoạn 1-3 câu)
- Đánh giá TỪNG đoạn riêng biệt
- Phải giữ nguyên nội dung text gốc

**TRẢ VỀ JSON với cấu trúc chính xác sau:**
{
  "overall": {
    "plagiarism_percent": <số từ 0-100>,
    "ai_percent": <số từ 0-100>,
    "original_percent": <số từ 0-100>,
    "plagiarism_label": "<nhãn: Rất thấp / Thấp / Trung bình / Cao / Rất cao>",
    "ai_label": "<nhãn tương tự>",
    "original_label": "<nhãn tương tự>"
  },
  "segments": [
    {
      "text": "<nội dung đoạn văn gốc - giữ nguyên>",
      "level": "<high | medium | low | ai-detected | clean>",
      "type": "<plagiarism | ai | style | clean>",
      "reason": "<giải thích chi tiết bằng tiếng Việt tại sao đoạn này bị đánh dấu>"
    }
  ],
  "summary": {
    "overview": "<tổng quan phân tích, 2-3 câu>",
    "plagiarism_findings": "<mô tả các phát hiện đạo văn>",
    "ai_findings": "<mô tả các phát hiện nội dung AI>",
    "recommendations": ["<đề xuất 1>", "<đề xuất 2>", "..."]
  }
}

Lưu ý: Tất cả nội dung phải bằng tiếng Việt. Phần "text" trong segments phải giữ nguyên văn bản gốc, không sửa đổi.`;
}

// ========================
// DISPLAY RESULTS
// ========================
function displayResults(result, originalText) {
    state.lastResults = result;

    // Show loading, show results
    els.loadingSection.style.display = 'none';
    els.resultsSection.style.display = 'block';

    // Scroll to results
    els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Animate gauges
    const { overall, segments, summary } = result;

    animateGauge(els.plagiarismGauge, els.plagiarismPercent, overall.plagiarism_percent || 0, getColorForPercent(overall.plagiarism_percent, 'danger'));
    animateGauge(els.aiGauge, els.aiPercent, overall.ai_percent || 0, getColorForPercent(overall.ai_percent, 'danger'));
    animateGauge(els.originalGauge, els.originalPercent, overall.original_percent || 0, getColorForPercent(overall.original_percent, 'good'));

    els.plagiarismLabel.textContent = overall.plagiarism_label || '';
    els.aiLabel.textContent = overall.ai_label || '';
    els.originalLabel.textContent = overall.original_label || '';

    // Set gauge card accent colors
    setScoreCardColor($('#plagiarismScoreCard'), overall.plagiarism_percent, 'danger');
    setScoreCardColor($('#aiScoreCard'), overall.ai_percent, 'danger');
    setScoreCardColor($('#originalScoreCard'), overall.original_percent, 'good');

    // Render highlighted text
    renderHighlightedText(segments);

    // Render detail cards
    renderDetailCards(segments);

    // Render summary
    renderSummary(summary);

    showToast('Phân tích hoàn tất!', 'success');

    // Add disclaimer note
    let disclaimer = $('#resultDisclaimer');
    if (!disclaimer) {
        disclaimer = document.createElement('div');
        disclaimer.id = 'resultDisclaimer';
        disclaimer.style.cssText = 'margin:16px 0 0 0;padding:12px 16px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1px solid #bfdbfe;border-radius:10px;font-size:13px;color:#1e40af;line-height:1.6;text-align:center;';
        disclaimer.innerHTML = '⚠️ <strong>Lưu ý:</strong> Kết quả phân tích dựa trên AI và mang tính tham khảo. Có thể có sai số nhỏ (±3-5%) giữa các lần kiểm tra do bản chất xử lý ngôn ngữ của AI.';
        els.resultsSection.appendChild(disclaimer);
    }
}

function getColorForPercent(percent, mode) {
    if (mode === 'good') {
        if (percent >= 80) return 'var(--clean)';
        if (percent >= 50) return 'var(--medium)';
        return 'var(--high)';
    } else {
        if (percent <= 15) return 'var(--clean)';
        if (percent <= 40) return 'var(--medium)';
        return 'var(--high)';
    }
}

function setScoreCardColor(card, percent, mode) {
    // Just visual feedback
    const color = getColorForPercent(percent, mode);
    card.style.borderColor = color.replace('var(', '').replace(')', '');
}

function animateGauge(gaugeEl, numberEl, targetPercent, color) {
    const circumference = 2 * Math.PI * 52; // r=52
    const offset = circumference - (targetPercent / 100) * circumference;

    gaugeEl.style.stroke = color;

    // Animate number
    let current = 0;
    const duration = 1500;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        current = Math.round(eased * targetPercent);
        numberEl.textContent = current;

        // Animate circle
        const currentOffset = circumference - (eased * targetPercent / 100) * circumference;
        gaugeEl.style.strokeDashoffset = currentOffset;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function renderHighlightedText(segments) {
    if (!segments || !segments.length) {
        els.highlightedText.innerHTML = '<p class="empty-state">Không có dữ liệu phân tích.</p>';
        return;
    }

    let html = '';
    segments.forEach((seg, i) => {
        const levelClass = seg.level || 'clean';
        const escapedText = escapeHtml(seg.text);
        const escapedReason = escapeHtml(seg.reason || '');
        const typeLabel = getTypeLabel(seg.level, seg.type);

        html += `<span class="segment ${levelClass}" 
                    data-index="${i}" 
                    data-reason="${escapedReason}"
                    data-type="${typeLabel}"
                    data-level="${seg.level}"
                    onmouseenter="showTooltip(event)" 
                    onmouseleave="hideTooltip()">${escapedText}</span> `;
    });

    els.highlightedText.innerHTML = html;
}

function getTypeLabel(level, type) {
    const labels = {
        'high': 'Nghi ngờ đạo văn cao',
        'medium': 'Nghi ngờ trung bình',
        'low': 'Nghi ngờ thấp',
        'ai-detected': 'Nội dung AI',
        'clean': 'Nội dung gốc',
    };
    return labels[level] || labels[type] || 'Không xác định';
}

function renderDetailCards(segments) {
    if (!segments || !segments.length) {
        els.detailsList.innerHTML = '<p class="empty-state">Không có dữ liệu chi tiết.</p>';
        return;
    }

    let html = '';
    segments.forEach((seg, i) => {
        const level = seg.level || 'clean';
        const typeLabel = getTypeLabel(level, seg.type);
        const isFlagged = level !== 'clean';

        // Google search button for flagged segments
        let searchBtn = '';
        if (isFlagged) {
            const searchText = seg.text.substring(0, 150);
            const searchUrl = `https://www.google.com/search?q=%22${encodeURIComponent(searchText)}%22`;
            searchBtn = `<a class="btn-search-source" href="${searchUrl}" target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Tìm nguồn trên Google
            </a>`;
        }

        html += `
        <div class="detail-card ${level}">
            <div class="detail-card-header">
                <span class="detail-badge ${level}">${typeLabel}</span>
                <span class="detail-index">Đoạn ${i + 1}</span>
            </div>
            <div class="detail-text">${escapeHtml(seg.text)}</div>
            <div class="detail-reason"><strong>Lý do:</strong> ${escapeHtml(seg.reason || 'Không có ghi chú')}</div>
            ${searchBtn}
        </div>`;
    });

    els.detailsList.innerHTML = html;
}

function renderSummary(summary) {
    if (!summary) {
        els.summaryText.innerHTML = '<p class="empty-state">Không có tóm tắt.</p>';
        return;
    }

    let html = '';

    if (summary.overview) {
        html += `<h4>📋 Tổng quan</h4><p>${escapeHtml(summary.overview)}</p>`;
    }

    if (summary.plagiarism_findings) {
        html += `<h4>🔍 Phát hiện đạo văn</h4><p>${escapeHtml(summary.plagiarism_findings)}</p>`;
    }

    if (summary.ai_findings) {
        html += `<h4>🤖 Phát hiện nội dung AI</h4><p>${escapeHtml(summary.ai_findings)}</p>`;
    }

    if (summary.recommendations && summary.recommendations.length) {
        html += `<h4>💡 Đề xuất cải thiện</h4><ul>`;
        summary.recommendations.forEach(rec => {
            html += `<li>${escapeHtml(rec)}</li>`;
        });
        html += '</ul>';
    }

    els.summaryText.innerHTML = html;
}

// ========================
// TOOLTIP
// ========================
let activeTooltip = null;

window.showTooltip = function (e) {
    hideTooltip();

    const el = e.currentTarget;
    const reason = el.dataset.reason;
    const type = el.dataset.type;
    const level = el.dataset.level;

    if (!reason || level === 'clean') return;

    const tooltip = document.createElement('div');
    tooltip.className = 'segment-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-type ${level}">${type}</div>
        <div class="tooltip-reason">${reason}</div>
    `;

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    // Position
    const rect = el.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 8;

    // Keep in viewport
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left + tooltipRect.width > window.innerWidth - 16) {
        left = window.innerWidth - tooltipRect.width - 16;
    }
    if (top + tooltipRect.height > window.innerHeight - 16) {
        top = rect.top - tooltipRect.height - 8;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
};

window.hideTooltip = function () {
    if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
    }
};

// ========================
// HISTORY
// ========================
function toggleHistory() {
    const section = els.historySection;
    if (section.style.display === 'none') {
        section.style.display = 'block';
        renderHistory();
        section.scrollIntoView({ behavior: 'smooth' });
    } else {
        section.style.display = 'none';
    }
}

function saveToHistory(text, result) {
    const entry = {
        id: Date.now(),
        date: new Date().toLocaleString('vi-VN'),
        textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        plagiarismPercent: result.overall.plagiarism_percent,
        aiPercent: result.overall.ai_percent,
        originalPercent: result.overall.original_percent,
    };

    state.history.unshift(entry);
    if (state.history.length > 20) state.history = state.history.slice(0, 20);
    localStorage.setItem('scan_history', JSON.stringify(state.history));
}

function renderHistory() {
    if (!state.history.length) {
        els.historyList.innerHTML = '<p class="empty-state">Chưa có lịch sử kiểm tra nào.</p>';
        return;
    }

    let html = '';
    state.history.forEach(entry => {
        const color = entry.plagiarismPercent <= 15 ? 'var(--clean)' :
            entry.plagiarismPercent <= 40 ? 'var(--medium)' : 'var(--high)';

        html += `
        <div class="history-item">
            <div class="history-item-info">
                <div class="history-item-text">${escapeHtml(entry.textPreview)}</div>
                <div class="history-item-date">${entry.date}</div>
            </div>
            <span class="history-item-score" style="color:${color}; background: ${color}15; border: 1px solid ${color}30">
                ${entry.plagiarismPercent}%
            </span>
        </div>`;
    });

    els.historyList.innerHTML = html;
}

function clearHistory() {
    if (confirm('Bạn có chắc muốn xóa tất cả lịch sử?')) {
        state.history = [];
        localStorage.removeItem('scan_history');
        renderHistory();
        showToast('Đã xóa lịch sử!', 'info');
    }
}

// ========================
// EXPORT (Word .doc)
// ========================
function exportReport() {
    if (!state.lastResults) {
        showToast('Chưa có kết quả để xuất.', 'error');
        return;
    }

    const r = state.lastResults;
    const now = new Date().toLocaleString('vi-VN');

    function getLevelColor(level) {
        switch (level) {
            case 'high': return '#DC2626';
            case 'medium': return '#D97706';
            case 'low': return '#2563EB';
            case 'ai-detected': return '#9333EA';
            case 'clean': return '#059669';
            default: return '#6B7280';
        }
    }

    function getLevelBg(level) {
        switch (level) {
            case 'high': return '#FEE2E2';
            case 'medium': return '#FEF3C7';
            case 'low': return '#DBEAFE';
            case 'ai-detected': return '#F3E8FF';
            case 'clean': return '#D1FAE5';
            default: return '#F3F4F6';
        }
    }

    function getScoreColor(percent, mode) {
        if (mode === 'good') {
            return percent >= 80 ? '#059669' : percent >= 50 ? '#D97706' : '#DC2626';
        }
        return percent <= 15 ? '#059669' : percent <= 40 ? '#D97706' : '#DC2626';
    }

    const plagColor = getScoreColor(r.overall.plagiarism_percent, 'danger');
    const aiColor = getScoreColor(r.overall.ai_percent, 'danger');
    const origColor = getScoreColor(r.overall.original_percent, 'good');

    // Build segments HTML
    let segmentsHtml = '';
    if (r.segments?.length) {
        r.segments.forEach((seg, i) => {
            const typeLabel = getTypeLabel(seg.level, seg.type);
            const color = getLevelColor(seg.level);
            const bg = getLevelBg(seg.level);
            segmentsHtml += `
            <div style="margin-bottom:14px; padding:12px 16px; border-left:4px solid ${color}; background:${bg}; border-radius:0 4px 4px 0;">
                <p style="margin:0 0 6px 0; font-size:13px;">
                    <b style="color:#1F2937;">Đoạn ${i + 1}</b>
                    <span style="color:${color}; font-weight:700; margin-left:8px;">${typeLabel}</span>
                </p>
                <p style="margin:0 0 6px 0; font-style:italic; color:#374151; font-size:12px; line-height:1.6;">"${seg.text}"</p>
                ${seg.reason ? `<p style="margin:0; font-size:11px; color:#6B7280;">→ ${seg.reason}</p>` : ''}
            </div>`;
        });
    }

    // Build recommendations HTML
    let recsHtml = '';
    if (r.summary?.recommendations?.length) {
        recsHtml = `
        <h2 style="color:#1E40AF; font-size:16px; margin:24px 0 12px 0; border-bottom:2px solid #E5E7EB; padding-bottom:6px;">💡 ĐỀ XUẤT CẢI THIỆN</h2>
        <ol style="margin:0; padding-left:24px; color:#374151; font-size:12px; line-height:1.8;">
            ${r.summary.recommendations.map(rec => `<li style="margin-bottom:4px;">${rec}</li>`).join('')}
        </ol>`;
    }

    const htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="utf-8">
        <title>Báo cáo kiểm tra đạo văn - Thẩm Văn AI</title>
        <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
        <style>
            @page { size: A4; margin: 2cm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #1F2937; line-height: 1.6; }
            table { border-collapse: collapse; }
        </style>
    </head>
    <body>
        <div style="text-align:center; padding:20px 0 16px 0; border-bottom:3px solid #6366F1;">
            <h1 style="margin:0; font-size:22px; color:#1E40AF; letter-spacing:1px;">BÁO CÁO KIỂM TRA ĐẠO VĂN</h1>
            <p style="margin:6px 0 0 0; font-size:14px;">
                <b style="color:#6366F1;">Thẩm Văn AI</b>
                <span style="color:#9CA3AF;"> — ${state.provider === 'groq' ? 'Groq' : 'Gemini'} AI</span>
            </p>
            <p style="margin:6px 0 0 0; font-size:11px; color:#9CA3AF; font-style:italic;">Ngày kiểm tra: ${now}</p>
        </div>

        <h2 style="color:#1E40AF; font-size:16px; margin:24px 0 12px 0; border-bottom:2px solid #E5E7EB; padding-bottom:6px;">📊 TỔNG QUAN KẾT QUẢ</h2>
        <table style="width:100%; border:1px solid #E5E7EB;" cellpadding="0" cellspacing="0">
            <tr style="background:#F9FAFB;">
                <td style="width:33%; text-align:center; padding:10px; border-right:1px solid #E5E7EB; border-bottom:1px solid #E5E7EB;">
                    <b style="font-size:12px; color:#374151;">Mức Đạo Văn</b>
                </td>
                <td style="width:33%; text-align:center; padding:10px; border-right:1px solid #E5E7EB; border-bottom:1px solid #E5E7EB;">
                    <b style="font-size:12px; color:#374151;">Nội Dung AI</b>
                </td>
                <td style="width:34%; text-align:center; padding:10px; border-bottom:1px solid #E5E7EB;">
                    <b style="font-size:12px; color:#374151;">Nội Dung Gốc</b>
                </td>
            </tr>
            <tr>
                <td style="text-align:center; padding:16px 10px; border-right:1px solid #E5E7EB;">
                    <span style="font-size:32px; font-weight:800; color:${plagColor};">${r.overall.plagiarism_percent}%</span>
                    <br><span style="font-size:11px; color:#6B7280;">${r.overall.plagiarism_label || ''}</span>
                </td>
                <td style="text-align:center; padding:16px 10px; border-right:1px solid #E5E7EB;">
                    <span style="font-size:32px; font-weight:800; color:${aiColor};">${r.overall.ai_percent}%</span>
                    <br><span style="font-size:11px; color:#6B7280;">${r.overall.ai_label || ''}</span>
                </td>
                <td style="text-align:center; padding:16px 10px;">
                    <span style="font-size:32px; font-weight:800; color:${origColor};">${r.overall.original_percent}%</span>
                    <br><span style="font-size:11px; color:#6B7280;">${r.overall.original_label || ''}</span>
                </td>
            </tr>
        </table>

        ${r.summary ? `
        <h2 style="color:#1E40AF; font-size:16px; margin:24px 0 12px 0; border-bottom:2px solid #E5E7EB; padding-bottom:6px;">📝 TÓM TẮT</h2>
        ${r.summary.overview ? `<p style="font-size:13px; color:#374151; line-height:1.7;">${r.summary.overview}</p>` : ''}
        ${r.summary.plagiarism_findings ? `<p style="font-size:12px; margin:8px 0;"><b style="color:#92400E;">🔍 Phát hiện đạo văn:</b> <span style="color:#374151;">${r.summary.plagiarism_findings}</span></p>` : ''}
        ${r.summary.ai_findings ? `<p style="font-size:12px; margin:8px 0;"><b style="color:#5B21B6;">🤖 Phát hiện AI:</b> <span style="color:#374151;">${r.summary.ai_findings}</span></p>` : ''}
        ` : ''}

        ${r.segments?.length ? `
        <h2 style="color:#1E40AF; font-size:16px; margin:24px 0 12px 0; border-bottom:2px solid #E5E7EB; padding-bottom:6px;">📋 CHI TIẾT TỪNG ĐOẠN</h2>
        ${segmentsHtml}
        ` : ''}

        ${recsHtml}

        <div style="margin-top:32px; padding-top:12px; border-top:2px solid #E5E7EB; text-align:center;">
            <p style="font-size:10px; color:#9CA3AF; font-style:italic;">
                Xuất bởi <b style="color:#6366F1;">Thẩm Văn AI</b> — Powered by ${state.provider === 'groq' ? 'Groq' : 'Gemini'}
            </p>
        </div>
    </body>
    </html>`;

    // Create Word-compatible blob and download
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-dao-van-${Date.now()}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Đã tải báo cáo Word!', 'success');
}

// ========================
// NEW SCAN
// ========================
function newScan() {
    els.resultsSection.style.display = 'none';
    els.inputText.value = '';
    onTextInput();
    els.inputSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    state.lastResults = null;
}

// ========================
// UTILITIES
// ========================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function animateProgress(percent) {
    els.progressBar.style.width = percent + '%';
}

function showToast(message, type = 'info') {
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || ''}</span>
        <span class="toast-message">${message}</span>
    `;

    els.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ========================
// START APP
// ========================
document.addEventListener('DOMContentLoaded', init);
