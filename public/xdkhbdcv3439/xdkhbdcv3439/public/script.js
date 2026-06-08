/**
 * Soạn Kế Hoạch Bài Dạy AI — Client-side logic (Compact 2-Column Layout)
 */

(function () {
  "use strict";

  // --- DOM ---
  const apiKeyInput = document.getElementById("apiKeyInput");
  const backMainBtn = document.getElementById("backMainBtn");
  const providerSelect = document.getElementById("providerSelect");
  const guideApiBtn = document.getElementById("guideApiBtn");
  const apiGuideModal = document.getElementById("apiGuideModal");
  const togglePwBtn = document.getElementById("togglePwBtn");
  const saveApiBtn = document.getElementById("saveApiBtn");
  const testApiBtn = document.getElementById("testApiBtn");
  const apiStatus = document.getElementById("apiStatus");
  const apiStatusText = document.getElementById("apiStatusText");
  const subjectSelect = document.getElementById("subjectSelect");
  const gradeSelect = document.getElementById("gradeSelect");
  const lessonDropzone = document.getElementById("lessonDropzone");
  const supportDropzone = document.getElementById("supportDropzone");
  const lessonInput = document.getElementById("lessonInput");
  const supportInput = document.getElementById("supportInput");
  const lessonPreview = document.getElementById("lessonPreview");
  const supportPreview = document.getElementById("supportPreview");
  const userNote = document.getElementById("userNote");
  const generateBtn = document.getElementById("generateBtn");
  const resultPlaceholder = document.getElementById("resultPlaceholder");
  const resultSection = document.getElementById("resultSection");
  const resultContent = document.getElementById("resultContent");
  const errorSection = document.getElementById("errorSection");
  const errorMessage = document.getElementById("errorMessage");
  const copyBtn = document.getElementById("copyBtn");
  
  const modeCreateBtn = document.getElementById("modeCreateBtn");
  const modeEnhanceBtn = document.getElementById("modeEnhanceBtn");
  const createModeSections = document.getElementById("createModeSections");
  const enhanceModeSection = document.getElementById("enhanceModeSection");
  const docDropzone = document.getElementById("docDropzone");
  const docInput = document.getElementById("docInput");
  const docPreview = document.getElementById("docPreview");
  const btnActionText = document.getElementById("btnActionText");

  // --- LocalStorage Keys ---
  const LS_PROVIDER = "giaoan_api_provider";
  const LS_API_GEMINI = "giaoan_gemini_api_key";
  const LS_API_GROQ = "giaoan_groq_api_key";
  const LS_SUBJ = "giaoan_subject";
  const LS_GRADE = "giaoan_grade";

  // --- State ---
  let lessonFiles = [];
  let supportFiles = [];
  let docFile = null;
  let rawMarkdown = "";
  let currentMode = "create";

  // --- Init: load saved data ---
  (function init() {
    const savedProvider = localStorage.getItem(LS_PROVIDER) || "gemini";
    providerSelect.value = savedProvider;
    loadProviderKey();
    const s = localStorage.getItem(LS_SUBJ);
    const g = localStorage.getItem(LS_GRADE);
    if (s) subjectSelect.value = s;
    if (g) gradeSelect.value = g;
  })();

  function getProvider() {
    return providerSelect.value === "groq" ? "groq" : "gemini";
  }

  function getProviderKeyStorage() {
    return getProvider() === "groq" ? LS_API_GROQ : LS_API_GEMINI;
  }

  function updateProviderUi() {
    const provider = getProvider();
    apiKeyInput.placeholder = provider === "groq" ? "Dán Groq API Key (gsk_...)" : "Dán Gemini API Key (AIza...)";
    guideApiBtn.title = provider === "groq" ? "Mở hướng dẫn lấy Groq API Key" : "Mở hướng dẫn lấy Gemini API Key";
    apiGuideModal.dataset.provider = provider;
  }

  function loadProviderKey() {
    updateProviderUi();
    const savedKey = localStorage.getItem(getProviderKeyStorage()) || (getProvider() === "gemini" ? localStorage.getItem("giaoan_api_key") : "");
    apiKeyInput.value = savedKey || "";
    if (savedKey) {
      showStatus(`Đã tải ${getProvider() === "groq" ? "Groq" : "Gemini"} API Key đã lưu`, "loaded");
    } else {
      apiStatus.hidden = true;
    }
  }

  providerSelect.addEventListener("change", () => {
    localStorage.setItem(LS_PROVIDER, getProvider());
    loadProviderKey();
  });

  backMainBtn.addEventListener("click", () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "GIAOVIENCN_BACK" }, window.location.origin);
      return;
    }
    window.history.back();
  });

  guideApiBtn.addEventListener("click", () => {
    apiGuideModal.hidden = false;
    document.body.classList.add("modal-open");
  });

  apiGuideModal.querySelectorAll("[data-guide-close]").forEach((el) => {
    el.addEventListener("click", () => closeApiGuide());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !apiGuideModal.hidden) closeApiGuide();
  });

  function closeApiGuide() {
    apiGuideModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  // --- API Key: save ---
  saveApiBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) { showStatus("Nhập key trước khi lưu", "error"); return; }
    localStorage.setItem(getProviderKeyStorage(), key);
    saveApiBtn.classList.add("saved");
    const sp = saveApiBtn.querySelector("span");
    sp.textContent = "Đã lưu ✓";
    showStatus(`${getProvider() === "groq" ? "Groq" : "Gemini"} API Key đã lưu thành công!`, "saved");
    setTimeout(() => { saveApiBtn.classList.remove("saved"); sp.textContent = "Lưu"; }, 2000);
  });

  // --- API Key: test ---
  testApiBtn.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    if (!key) { showStatus("Nhập key trước khi test", "error"); return; }

    testApiBtn.disabled = true;
    testApiBtn.className = "btn-test-key testing";
    testApiBtn.querySelector("span").textContent = "Đang test...";
    showStatus("Đang kiểm tra kết nối...", "loaded");

    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key, provider: getProvider() }),
      });
      const data = await readApiJson(res);

      if (data.ok) {
        testApiBtn.className = "btn-test-key test-ok";
        testApiBtn.querySelector("span").textContent = "OK ✓";
        showStatus("✅ " + data.message, "saved");
      } else {
        testApiBtn.className = "btn-test-key test-fail";
        testApiBtn.querySelector("span").textContent = "Lỗi ✕";
        showStatus("❌ " + data.error, "error-persist");
      }
    } catch (err) {
      testApiBtn.className = "btn-test-key test-fail";
      testApiBtn.querySelector("span").textContent = "Lỗi ✕";
      showStatus("❌ Không thể kết nối server", "error-persist");
    } finally {
      testApiBtn.disabled = false;
      setTimeout(() => {
        testApiBtn.className = "btn-test-key";
        testApiBtn.querySelector("span").textContent = "Test";
      }, 4000);
    }
  });

  function showStatus(msg, type) {
    apiStatus.hidden = false;
    apiStatusText.textContent = msg;
    apiStatus.className = "api-status";
    apiStatus.style.color = "";
    if (type === "loaded") apiStatus.classList.add("status-loaded");
    if (type === "error") {
      apiStatus.style.color = "var(--red)";
      setTimeout(() => { apiStatus.hidden = true; apiStatus.style.color = ""; }, 3000);
    }
    if (type === "error-persist") {
      apiStatus.style.color = "var(--red)";
    }
  }

  async function readApiJson(res) {
    const text = await res.text();
    if (!text.trim()) {
      throw new Error("Server API khong phan hoi. Kiem tra backend /api/generate da duoc chay hoac deploy chua.");
    }

    try {
      return JSON.parse(text);
    } catch (_) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html") || text.trim().startsWith("<")) {
        throw new Error("Server dang tra ve trang HTML thay vi JSON. Thuong la route API chua duoc cau hinh.");
      }
      throw new Error("Server tra ve du lieu khong dung dinh dang JSON.");
    }
  }

  // --- Save subject/grade ---
  subjectSelect.addEventListener("change", () => {
    subjectSelect.value ? localStorage.setItem(LS_SUBJ, subjectSelect.value) : localStorage.removeItem(LS_SUBJ);
  });
  gradeSelect.addEventListener("change", () => {
    gradeSelect.value ? localStorage.setItem(LS_GRADE, gradeSelect.value) : localStorage.removeItem(LS_GRADE);
  });

  // --- Toggle password ---
  togglePwBtn.addEventListener("click", () => {
    const isPw = apiKeyInput.type === "password";
    apiKeyInput.type = isPw ? "text" : "password";
  });

  // --- Mode Switcher ---
  modeCreateBtn.addEventListener("click", () => {
    currentMode = "create";
    modeCreateBtn.classList.add("active");
    modeEnhanceBtn.classList.remove("active");
    createModeSections.hidden = false;
    enhanceModeSection.hidden = true;
    btnActionText.textContent = "Tạo Kế Hoạch Bài Dạy";
  });

  modeEnhanceBtn.addEventListener("click", () => {
    currentMode = "enhance";
    modeEnhanceBtn.classList.add("active");
    modeCreateBtn.classList.remove("active");
    createModeSections.hidden = true;
    enhanceModeSection.hidden = false;
    btnActionText.textContent = "Bổ sung Năng lực";
  });

  // --- Dropzone ---
  function setupDrop(zone, input, list, preview) {
    zone.addEventListener("click", () => input.click());
    zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", e => {
      e.preventDefault(); zone.classList.remove("drag-over");
      addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")), list, preview);
    });
    input.addEventListener("change", () => {
      addFiles(Array.from(input.files), list, preview);
      input.value = "";
    });
  }

  function addFiles(files, list, preview) {
    for (const f of files) { if (list.length >= 5) break; list.push(f); }
    renderPrev(list, preview);
  }

  function renderPrev(list, container) {
    container.innerHTML = "";
    list.forEach((f, i) => {
      const d = document.createElement("div"); d.className = "preview-item";
      const img = document.createElement("img"); img.src = URL.createObjectURL(f); img.alt = f.name;
      const btn = document.createElement("button"); btn.className = "preview-remove"; btn.innerHTML = "✕";
      btn.addEventListener("click", e => { e.stopPropagation(); list.splice(i, 1); renderPrev(list, container); });
      d.appendChild(img); d.appendChild(btn); container.appendChild(d);
    });
  }

  setupDrop(lessonDropzone, lessonInput, lessonFiles, lessonPreview);
  setupDrop(supportDropzone, supportInput, supportFiles, supportPreview);

  // Document Dropzone (Single File)
  docDropzone.addEventListener("click", () => docInput.click());
  docDropzone.addEventListener("dragover", e => { e.preventDefault(); docDropzone.classList.add("drag-over"); });
  docDropzone.addEventListener("dragleave", () => docDropzone.classList.remove("drag-over"));
  docDropzone.addEventListener("drop", e => {
    e.preventDefault(); docDropzone.classList.remove("drag-over");
    const file = Array.from(e.dataTransfer.files).find(f => f.name.endsWith(".docx") || f.type === "application/pdf");
    if (file) setDocFile(file);
  });
  docInput.addEventListener("change", () => {
    const file = docInput.files[0];
    if (file) setDocFile(file);
    docInput.value = "";
  });

  function setDocFile(file) {
    docFile = file;
    docPreview.innerHTML = "";
    const d = document.createElement("div"); d.className = "preview-item";
    d.style.width = "auto"; d.style.padding = "0 10px"; d.style.display = "flex"; d.style.alignItems = "center"; d.style.gap = "8px";
    
    d.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    <span style="font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${file.name}</span>
    <button class="preview-remove" style="position: static; opacity: 1; margin-left: 6px; width: 20px; height: 20px; background: rgba(248,113,113,0.2); color: var(--red);">✕</button>`;
    
    d.querySelector(".preview-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      docFile = null;
      docPreview.innerHTML = "";
    });
    docPreview.appendChild(d);
  }

  // --- Generate ---
  generateBtn.addEventListener("click", async () => {
    if (currentMode === "create" && !lessonFiles.length) { showError("Vui lòng tải lên ít nhất 1 ảnh bài học."); return; }
    if (currentMode === "enhance" && !docFile) { showError("Vui lòng tải lên 1 file kế hoạch bài dạy (.docx hoặc .pdf)."); return; }

    const fd = new FormData();
    const key = apiKeyInput.value.trim();
    if (key) fd.append("apiKey", key);
    fd.append("provider", getProvider());
    if (subjectSelect.value) fd.append("subject", subjectSelect.value);
    if (gradeSelect.value) fd.append("grade", gradeSelect.value);
    if (userNote.value.trim()) fd.append("userNote", userNote.value.trim());

    let apiUrl = "/api/generate";
    if (currentMode === "create") {
      lessonFiles.forEach(f => fd.append("lessonImage", f));
      supportFiles.forEach(f => fd.append("supportImage", f));
    } else {
      apiUrl = "/api/enhance";
      fd.append("lessonDoc", docFile);
    }

    setLoading(true); hideError(); hideResult();

    try {
      const res = await fetch(apiUrl, { method: "POST", body: fd });
      const data = await readApiJson(res);
      if (!res.ok) { showError(data.error || "Lỗi không xác định."); return; }
      rawMarkdown = data.result;
      showResult(rawMarkdown);
    } catch (err) {
      showError("Lỗi kết nối: " + err.message);
    } finally {
      setLoading(false);
    }
  });

  // --- Copy ---
  copyBtn.addEventListener("click", () => {
    if (!rawMarkdown) return;
    navigator.clipboard.writeText(rawMarkdown).then(() => {
      copyBtn.classList.add("copied");
      copyBtn.querySelector("span").textContent = "Đã chép!";
      setTimeout(() => { copyBtn.classList.remove("copied"); copyBtn.querySelector("span").textContent = "Sao chép"; }, 2000);
    }).catch(() => {
      const ta = document.createElement("textarea"); ta.value = rawMarkdown;
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    });
  });

  // --- Helpers ---
  function setLoading(on) {
    generateBtn.disabled = on;
    generateBtn.querySelector(".btn-text").hidden = on;
    generateBtn.querySelector(".btn-loading").hidden = !on;
  }

  function showResult(md) {
    resultPlaceholder.hidden = true;
    resultSection.hidden = false;
    resultContent.innerHTML = marked.parse(md);

    // Post-process table to merge empty cells for Activity Headers and Subheaders
    const rows = resultContent.querySelectorAll("tbody tr");
    rows.forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length === 2) {
        // Remove <br> and check if the second cell is completely empty
        const cell2Content = cells[1].innerHTML.replace(/<br\s*\/?>/gi, "").trim();
        if (cell2Content === "") {
          cells[0].colSpan = 2;
          // We DO NOT center or add purple background anymore to match the Word document exactly
          cells[1].remove();
        }
      }
    });
  }

  function hideResult() {
    resultSection.hidden = true;
    resultPlaceholder.hidden = false;
    resultContent.innerHTML = "";
    rawMarkdown = "";
  }

  function showError(msg) { errorSection.hidden = false; errorMessage.textContent = msg; }
  function hideError() { errorSection.hidden = true; errorMessage.textContent = ""; }
})();
