// options.js
async function getSettings() {
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  return res?.ok ? res.settings : null;
}
async function setSettings(settings) {
  await chrome.runtime.sendMessage({ type: "SET_SETTINGS", settings });
}
async function setSecrets(secrets) {
  await chrome.runtime.sendMessage({ type: "SET_SECRETS", secrets });
}
async function getUsage() {
  const res = await chrome.runtime.sendMessage({ type: "GET_USAGE" });
  return res?.ok ? res.usage : { totalFills:0,totalAiCalls:0,totalBankHits:0,lastUsedAt:0 };
}

function setSegActive(mode) {
  document.querySelectorAll(".segbtn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
}

function bindSegButtons(saveHint){
  document.querySelectorAll(".segbtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const mode = btn.dataset.mode || "BANK";
      setSegActive(mode);
      if (saveHint) {
        show(saveHint, "Chưa lưu (bấm Lưu).", false);
      }
    });
  });
}

function safeJsonParse(text, fallback) { try { return JSON.parse(text); } catch { return fallback; } }
function prettyJson(obj) { return JSON.stringify(obj, null, 2); }
function show(el, msg, ok=true) {
  el.textContent = msg;
  el.style.borderColor = ok ? "rgba(85,242,165,.30)" : "rgba(255,106,138,.30)";
}

document.addEventListener("DOMContentLoaded", async () => {
  const btnSave = document.getElementById("btnSave");
  const enabled = document.getElementById("enabled");
  const modeBANK = document.getElementById("modeBANK");
  const modeAI = document.getElementById("modeAI");
  const featSubject = document.getElementById("featSubject");
  const featNlpc = document.getElementById("featNlpc");
  const enabledByDefault = document.getElementById("enabledByDefault");
  const nlpcLevelSymbol = document.getElementById("nlpcLevelSymbol");
  const usageBox = document.getElementById("usageBox");
  const saveHint = document.getElementById("saveHint");

  bindSegButtons(saveHint);


  // AI
  const aiEndpoint = document.getElementById("aiEndpoint");
  const aiKey = document.getElementById("aiKey");
  const aiModel = document.getElementById("aiModel");
  const aiTemp = document.getElementById("aiTemp");
  const aiMaxTokens = document.getElementById("aiMaxTokens");
  const maxChars = document.getElementById("maxChars");
  const aiStatus = document.getElementById("aiStatus");
  const btnTestAI = document.getElementById("btnTestAI");

  // subject mapping
  const subjectMap = document.getElementById("subjectMap");
  const btnResetMap = document.getElementById("btnResetMap");
  const mapStatus = document.getElementById("mapStatus");

  // scoring
  const tMin = document.getElementById("tMin");
  const hMin = document.getElementById("hMin");
  const scoringOverrides = document.getElementById("scoringOverrides");
  const scoringStatus = document.getElementById("scoringStatus");

  // privacy
  const rememberApiKey = document.getElementById("rememberApiKey");

  let settings = await getSettings();
  if (!settings) return;

  // fill UI from settings
  enabled.checked = !!settings.enabled;
  setSegActive(settings.mode || "BANK");
  featSubject.checked = settings.features?.subject !== false;
  featNlpc.checked = settings.features?.nlpc !== false;
  enabledByDefault.checked = settings.sitePolicy?.enabledByDefault !== false;

  nlpcLevelSymbol.value = (settings.nlpcLevelSymbol === "D") ? "D" : "Đ";

  aiEndpoint.value = settings.ai?.endpoint || "";
  aiModel.value = settings.ai?.model || "";
  aiTemp.value = String(settings.ai?.temperature ?? 0.2);
  aiMaxTokens.value = String(settings.ai?.maxTokens ?? 120);
  maxChars.value = String(settings.style?.maxChars ?? 250);

  // API key is stored as secret; we show empty by default
  aiKey.value = "";
  rememberApiKey.checked = !!(settings.privacy?.rememberApiKey ?? settings.rememberApiKey);

  subjectMap.value = prettyJson(settings.subjectMap || {});
  tMin.value = String(settings.scoring?.tMin ?? 9);
  hMin.value = String(settings.scoring?.hMin ?? 5);
  scoringOverrides.value = prettyJson(settings.scoring?.overrides || []);
  scoringOverrides.spellcheck = false;

  // usage
  try {
    const usage = await getUsage();
    usageBox.textContent = String(usage.totalFills || 0);
  } catch {
    usageBox.textContent = "0";
  }

  function collectNextSettings() {
    const next = structuredClone(settings);

    next.enabled = !!enabled.checked;
    next.mode = document.querySelector(".segbtn.active")?.dataset.mode || (next.mode || "BANK");

    next.features = next.features || {};
    next.features.subject = !!featSubject.checked;
    next.features.nlpc = !!featNlpc.checked;

    next.sitePolicy = next.sitePolicy || {};
    next.sitePolicy.enabledByDefault = !!enabledByDefault.checked;

    next.nlpcLevelSymbol = (nlpcLevelSymbol.value === "D") ? "D" : "Đ";

    // AI
    next.ai = next.ai || {};
    next.ai.endpoint = aiEndpoint.value.trim();
    next.ai.model = aiModel.value.trim();
    next.ai.temperature = Number(aiTemp.value || 0.2);
    next.ai.maxTokens = Number(aiMaxTokens.value || 120);

    next.style = next.style || {};
    next.style.maxChars = Number(maxChars.value || 250);

    // subject map
    next.subjectMap = safeJsonParse(subjectMap.value, next.subjectMap || {});

    // scoring
    next.scoring = next.scoring || {};
    next.scoring.tMin = Number(tMin.value || 9);
    next.scoring.hMin = Number(hMin.value || 5);
    next.scoring.overrides = safeJsonParse(scoringOverrides.value, next.scoring.overrides || []);

    next.privacy = next.privacy || {};
    next.privacy.rememberApiKey = !!rememberApiKey.checked;
    // tương thích bản cũ
    delete next.rememberApiKey;

    return next;
  }

  async function saveAll() {
    const next = collectNextSettings();
    await setSettings(next);

    // save secret AI key (optional)
    const key = aiKey.value.trim();
    if (key) {
      await setSecrets({ aiKey: key });
      aiKey.value = "";
      show(saveHint, "Đã lưu cấu hình (API key đã lưu theo phiên).", true);
    }

    settings = next;
    if (saveHint.textContent.includes("API key")) {
      // đã hiển thị ở trên
    } else {
      show(saveHint, "Đã lưu cấu hình.", true);
    }

    // refresh usage display
    try {
      const usage = await getUsage();
      usageBox.textContent = String(usage.totalFills || 0);
    } catch {}
  }

  btnSave.addEventListener("click", saveAll);

  // quick save on toggles
  [enabled, featSubject, featNlpc, enabledByDefault, nlpcLevelSymbol, rememberApiKey].forEach(el=>{
    el.addEventListener("change", () => {
      show(saveHint, "Chưa lưu (bấm Lưu).", false);
    });
  });

  // map reset
  btnResetMap.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_SUBJECT_MAP" });
    if (res?.ok && res.subjectMap) {
      subjectMap.value = prettyJson(res.subjectMap);
      show(mapStatus, "Đã khôi phục map mặc định (chưa lưu).", true);
    } else {
      show(mapStatus, "Không khôi phục được.", false);
    }
  });

  // test AI
  btnTestAI.addEventListener("click", async () => {
    show(aiStatus, "Đang gọi AI...", true);

    // Apply settings first (so background uses updated endpoint/model)
    const next = collectNextSettings();
    await setSettings(next);

    const key = aiKey.value.trim();
    if (key) await setSecrets({ aiKey: key });

    try {
      const payload = {
        taskType: "TEST",
        context: { page: "options-test", grade: 3, className: "3A" },
        request: {
          kind: "TEST",
          level: "T",
          remarkStyle: { short: true }
        },
        constraints: { noPronouns:true, noGreetings:true, objective:true, encourageMaintain:true }
      };
      const res = await chrome.runtime.sendMessage({ type: "AI_GENERATE", payload });
      if (res?.ok && res.text) show(aiStatus, `OK: ${res.text}`, true);
      else show(aiStatus, `Lỗi: ${res?.error || "không rõ"}`, false);
    } catch (e) {
      show(aiStatus, `Lỗi: ${e?.message || e}`, false);
    }
  });
});
