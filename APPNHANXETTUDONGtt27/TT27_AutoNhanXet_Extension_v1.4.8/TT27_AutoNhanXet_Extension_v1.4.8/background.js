/**
 * background.js (MV3 service worker)
 * - Quản lý settings
 * - Fetch ngân hàng nhận xét từ Apps Script (cache)
 * - Gọi AI (OpenAI-compatible endpoint) khi bật chế độ AI
 *
 * NOTE: Prompt ở đây vẫn có thể bị đọc bởi người rành kỹ thuật.
 * Muốn "ẩn thật", hãy gọi AI qua server riêng của bạn.
 */

const DEFAULTS = {
  enabled: false,
  mode: "BANK", // BANK | AI
  features: { subject: true, nlpc: true },
  sitePolicy: { enabledByDefault: true, siteEnabled: {} },
  privacy: { rememberApiKey: false },

  bank: { apiUrl: "https://script.google.com/macros/s/AKfycbyHi4M7qcEBVf7Vy8joFbK4bdZFdTqwlUk6-meOoGCrW6Rp-90bBkBdpD9UZ0LQ3LpvvQ/exec", apiKey: "HL_TT27_BANK_2026_QVThuat_9f3c2a7d1b6e4f8a_61C7C0A2", cacheTtlHours: 12, expect: "AUTO" },

  ai: {
    provider: "OPENAI_COMPAT",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 120
  },

  subjectMap: {
    "Tiếng Việt": "TV",
    "Toán": "TOAN",
    "Tiếng Anh": "TA",
    "Tự nhiên và Xã hội": "TNXH",
    "Khoa học": "KHOA",
    "Lịch sử và Địa lý": "LSDL",
    "Lịch sử - Địa lý": "LSDL",
    // Chấp nhận cả cách viết cũ "Địa lí" để tránh lệch dữ liệu từ hệ thống
    "Lịch sử và Địa lí": "LSDL",
    "Lịch sử - Địa lí": "LSDL",
    "Đạo đức": "DD",
    "Tin học": "TIN",
    "Công nghệ": "CN",
    "Âm nhạc": "AN",
    "Mĩ thuật": "MT",
    "Thể dục": "GDTC",
    "Nghệ thuật": "NT",
    "Nghệ thuật (Mỹ thuật)": "MT",
    "Nghệ thuật (Mĩ thuật)": "MT",
    "Nghệ thuật (Âm nhạc)": "AN",
    "Giáo dục thể chất": "GDTC",
    "TH-CN (Tin hoc)": "TIN",
    "TH-CN (Cong nghe)": "CN",
    "TH-CN (Công nghệ)": "CN",
    "TH-CN (Tin học)": "TIN",
    "Ngoại ngữ": "TA",
    "Hoạt động trải nghiệm": "HDTN",
    "Hoạt động trải nghiệm, hướng nghiệp": "HĐTN"
  },

  nlpcLevelSymbol: "Đ", // D | Đ

  style: {
    maxChars: 250,
    forbidWords: ["em", "con", "bạn", "chào", "xin chào", "các em", "cô", "thầy"],
    tone: "khach_quan_khich_le"
  },

  // Quy tắc điểm -> T/H/C (môn học có điểm)
  scoring: {
    // Mặc định: >=9 => T, >=5 => H, còn lại => C
    default: { tMin: 9, hMin: 5 },
    // Override theo môn/khối/kỳ (periodKey: GK1/CK1/GK2/CK2 hoặc "" nếu không dùng)
    // Ví dụ: { subject: "Tiếng Việt", grade: 3, periodKey: "CK1", tMin: 8, hMin: 5 }
    overrides: []
  },

  // Riêng tư API: lưu key vào local (nhớ) hoặc session (chỉ phiên hiện tại)
  privacy: { rememberApiKey: true },

  // Thông tin ủng hộ (tự cấu hình)
  support: { title: "Ủng hộ tác giả", link: "", qrData: "https://zalo.me/0948849980" }
};

const CACHE_KEYS = {
  bankMap: "cache_bank_map_v1",
  bankMeta: "cache_bank_meta_v1",
  bankPrefixIndex: "cache_bank_prefix_index_v1"
};

async function getSettings() {
  const obj = await chrome.storage.local.get({ settings: DEFAULTS });
  const s = deepMerge(structuredClone(DEFAULTS), obj.settings || {});
  // migrate from old key (v1.2.x): rememberApiKey -> privacy.rememberApiKey
  if (typeof s.rememberApiKey === "boolean") {
    s.privacy = s.privacy || {};
    if (typeof s.privacy.rememberApiKey !== "boolean") s.privacy.rememberApiKey = s.rememberApiKey;
    delete s.rememberApiKey;
    // persist back silently
    await chrome.storage.local.set({ settings: s }).catch(()=>{});
  }
  return s;
}

async function setSettings(next) {
  await chrome.storage.local.set({ settings: next });
}


async function getSecrets(settings) {
  const store = settings?.privacy?.rememberApiKey ? chrome.storage.local : chrome.storage.session;
  const got = await store.get({ secrets: { aiKey: "", bankKey: "" } });
  return got.secrets || { aiKey: "", bankKey: "" };
}
async function setSecrets(settings, secrets) {
  const store = settings?.privacy?.rememberApiKey ? chrome.storage.local : chrome.storage.session;
  await store.set({ secrets });
  if (!settings?.privacy?.rememberApiKey) {
    await chrome.storage.local.remove("secrets").catch(()=>{});
  }
}

async function bumpUsage(delta) {
  const key = "usageStats_v1";
  const got = await chrome.storage.local.get({ [key]: { totalFills:0, totalAiCalls:0, totalBankHits:0, lastUsedAt:0 } });
  const cur = got[key] || { totalFills:0, totalAiCalls:0, totalBankHits:0, lastUsedAt:0 };
  cur.totalFills += delta.totalFills || 0;
  cur.totalAiCalls += delta.totalAiCalls || 0;
  cur.totalBankHits += delta.totalBankHits || 0;
  cur.lastUsedAt = Date.now();
  await chrome.storage.local.set({ [key]: cur });
  return cur;
}


// ---- Global STATS (Apps Script) ----
const ANALYTICS_KEYS = {
  clientId: "tt27_clientId_v1"
};

async function getClientId() {
  const got = await chrome.storage.local.get({ [ANALYTICS_KEYS.clientId]: "" });
  let id = got[ANALYTICS_KEYS.clientId];
  if (!id) {
    id = (globalThis.crypto?.randomUUID?.() || (`${Date.now()}_${Math.random().toString(16).slice(2)}`));
    await chrome.storage.local.set({ [ANALYTICS_KEYS.clientId]: id });
  }
  return id;
}

function buildAppsScriptUrl(baseUrl, action, key) {
  const url = new URL(baseUrl);
  url.searchParams.set("action", action);
  url.searchParams.set("key", key);
  return url.toString();
}

async function postUsageHitToAppsScript(settings, delta) {
  const secrets = await getSecrets(settings);
  const apiUrl = settings?.bank?.apiUrl || "";
  const apiKey = secrets?.bankKey || settings?.bank?.apiKey || "";
  if (!apiUrl || !apiKey) return null;

  const payload = {
    clientId: await getClientId(),
    version: chrome.runtime.getManifest().version,
    delta: {
      totalFills: Number(delta?.totalFills || 0),
      totalBankHits: Number(delta?.totalBankHits || 0),
      totalAiCalls: Number(delta?.totalAiCalls || 0)
    },
    ts: Date.now()
  };

  const res = await fetch(buildAppsScriptUrl(apiUrl, "hit", apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  // Nếu lỗi, bỏ qua để không ảnh hưởng trải nghiệm
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json;
}

async function fetchGlobalStatsFromAppsScript(settings) {
  const secrets = await getSecrets(settings);
  const apiUrl = settings?.bank?.apiUrl || "";
  const apiKey = secrets?.bankKey || settings?.bank?.apiKey || "";
  if (!apiUrl || !apiKey) throw new Error("Chưa cấu hình BANK apiUrl/apiKey");

  const res = await fetch(buildAppsScriptUrl(apiUrl, "stats", apiKey), { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch STATS thất bại: ${res.status}`);
  const json = await res.json();
  if (json?.ok && json?.stats) return json.stats;
  throw new Error("STATS response không hợp lệ");
}
async function getUsage() {
  const key = "usageStats_v1";
  const got = await chrome.storage.local.get({ [key]: { totalFills:0, totalAiCalls:0, totalBankHits:0, lastUsedAt:0 } });
  return got[key];
}

function deepMerge(target, src) {
  if (!src || typeof src !== "object") return target;
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) {
      target[k] = deepMerge(target[k] || {}, src[k]);
    } else {
      target[k] = src[k];
    }
  }
  return target;
}

async function isBankCacheFresh(ttlHours) {
  const meta = await chrome.storage.local.get({ [CACHE_KEYS.bankMeta]: { ts: 0 } });
  const ts = meta[CACHE_KEYS.bankMeta]?.ts || 0;
  return (Date.now() - ts) < ttlHours * 3600 * 1000;
}

function buildPrefixIndexFromMap(bankMap) {
  const idx = {};
  for (const [code, text] of Object.entries(bankMap || {})) {
    const m = String(code).match(/^(.+?)(\d+)$/);
    if (!m) continue;
    const prefix = m[1];
    const n = Number(m[2]);
    if (!Number.isFinite(n)) continue;
    if (!idx[prefix]) idx[prefix] = [];
    idx[prefix].push({ code, text, n });
  }
  for (const p of Object.keys(idx)) idx[p].sort((a,b)=>a.n-b.n);
  return idx;
}

async function cacheBank(bankMap) {
  const prefixIndex = buildPrefixIndexFromMap(bankMap);
  await chrome.storage.local.set({
    [CACHE_KEYS.bankMap]: bankMap,
    [CACHE_KEYS.bankPrefixIndex]: prefixIndex,
    [CACHE_KEYS.bankMeta]: { ts: Date.now() }
  });
}

async function loadBankCached() {
  const got = await chrome.storage.local.get({
    [CACHE_KEYS.bankMap]: {},
    [CACHE_KEYS.bankPrefixIndex]: {}
  });
  return { bankMap: got[CACHE_KEYS.bankMap] || {}, prefixIndex: got[CACHE_KEYS.bankPrefixIndex] || {} };
}

async function fetchBankFromAppsScript(apiUrl, apiKey) {
  if (!apiUrl) throw new Error("BANK apiUrl chưa cấu hình");
  const url = new URL(apiUrl);
  if (apiKey) url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch BANK thất bại: ${res.status}`);
  const json = await res.json();

  if (json && typeof json === "object") {
    if (json.data && typeof json.data === "object") return json.data;
    if (Array.isArray(json.rows)) {
      const out = {};
      for (const r of json.rows) {
        const code = String(r.ma_chuan ?? r.code ?? r.ma ?? "").trim();
        const remark = String(r.noi_dung ?? r.remark ?? r.noiDung ?? "").trim();
        if (code) out[code] = remark;
      }
      return out;
    }
    const keys = Object.keys(json);
    if (keys.length && typeof json[keys[0]] === "string") return json;
  }
  throw new Error("BANK format không hợp lệ");
}

async function ensureBankFresh(force=false) {
  const s = await getSettings();
  const ttl = Math.max(1, Number(s.bank.cacheTtlHours || 12));
  if (!force && await isBankCacheFresh(ttl)) return await loadBankCached();
  const secrets = await getSecrets(s);
  const bankMap = await fetchBankFromAppsScript(s.bank.apiUrl, secrets.bankKey || s.bank.apiKey || "");
  await cacheBank(bankMap);
  return await loadBankCached();
}

// ---- AI ----
function buildAiMessages(payload) {
  const styleRules = [
    "Viết ngắn gọn, rõ ý, khách quan.",
    "KHÔNG dùng hô ngữ, KHÔNG đại từ nhân xưng (em, con, bạn...).",
    "Giọng văn nhẹ nhàng, khích lệ duy trì kết quả; không phán xét nặng nề.",
    "Không nêu điểm số trực tiếp.",
    "Chỉ trả về đúng nội dung nhận xét, không thêm tiêu đề hay gạch đầu dòng."
  ].join(" ");
  const system = `Bạn là giáo viên tiểu học viết nhận xét theo Thông tư 27. ${styleRules}`;
  const user = `Dữ liệu đánh giá (JSON):\n${JSON.stringify(payload, null, 2)}\n\nYêu cầu: 1-2 câu, tối đa ${payload?.style?.maxChars || 250} ký tự.`;
  return [{ role:"system", content: system }, { role:"user", content: user }];
}

function postProcessText(text, maxChars, forbidWords) {
  let out = String(text || "").trim();
  out = out.replace(/^[\"“]+|[\"”]+$/g, "").trim();
  const forb = (forbidWords || []).map(w => w.trim()).filter(Boolean);
  if (forb.length) {
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b(${forb.map(esc).join("|")})\\b`, "gi");
    out = out.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
  }
  if (maxChars && out.length > maxChars) out = out.slice(0, maxChars).replace(/\s+\S*$/, "").trim();
  return out;
}

async function callOpenAICompat(settings, payload) {
  const endpoint = settings.ai.endpoint;
  if (!endpoint) throw new Error("AI endpoint chưa cấu hình");
  const secrets = await getSecrets(settings);
  const apiKey = secrets.aiKey || settings.ai.apiKey || "";
  if (!apiKey) throw new Error("AI apiKey chưa cấu hình");

  const body = {
    model: settings.ai.model,
    messages: buildAiMessages(payload),
    temperature: settings.ai.temperature ?? 0.2,
    max_tokens: settings.ai.maxTokens ?? 120
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(()=> "");
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

// ---- Router ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const settings = await getSettings();

    if (msg?.type === "GET_SETTINGS") return sendResponse({ ok: true, settings });

    if (msg?.type === "SET_SETTINGS") {
      const next = deepMerge(structuredClone(DEFAULTS), msg.settings || {});
      await setSettings(next);
      await notifySettingsUpdated(next);
      return sendResponse({ ok: true });
    }

    if (msg?.type === "GET_DEFAULT_SUBJECT_MAP") {
      return sendResponse({ ok:true, subjectMap: structuredClone(DEFAULTS.subjectMap) });
    }

    if (msg?.type === "BANK_REFRESH") {
      const { bankMap, prefixIndex } = await ensureBankFresh(true);
      return sendResponse({ ok:true, count:Object.keys(bankMap).length, prefixCount:Object.keys(prefixIndex).length });
    }

    if (msg?.type === "BANK_GET") {
      const { bankMap, prefixIndex } = await ensureBankFresh(false);
      return sendResponse({ ok:true, bankMap, prefixIndex });
    }


    if (msg?.type === "GET_USAGE") {
      const usage = await getUsage();
      return sendResponse({ ok:true, usage });
    }

    if (msg?.type === "GET_GLOBAL_STATS") {
      const stats = await fetchGlobalStatsFromAppsScript(settings);
      return sendResponse({ ok:true, stats });
    }

    if (msg?.type === "BUMP_USAGE") {
      const delta = msg.delta || {};
      const usage = await bumpUsage(delta);

      // Gửi thống kê global lên Apps Script (không chặn luồng)
      if (delta.totalFills || delta.totalBankHits || delta.totalAiCalls) {
        postUsageHitToAppsScript(settings, delta).catch(()=>{});
      }

      return sendResponse({ ok:true, usage });
    }

    if (msg?.type === "SET_SECRETS") {
      const current = await getSecrets(settings);
      const next = Object.assign({}, current, msg.secrets || {});
      await setSecrets(settings, next);
      return sendResponse({ ok:true });
    }

    if (msg?.type === "GET_SUPPORT") {
      return sendResponse({ ok:true, support: settings.support || {} });
    }

    if (msg?.type === "AI_GENERATE") {
      const payload = msg.payload || {};
      payload.style = settings.style;
      const raw = await callOpenAICompat(settings, payload);
      const text = postProcessText(raw, settings.style.maxChars, settings.style.forbidWords);
      await bumpUsage({ totalAiCalls: 1 });
      // Gửi thống kê global (AI call)
      postUsageHitToAppsScript(settings, { totalAiCalls: 1 }).catch(()=>{});
      return sendResponse({ ok:true, text });
    }

    return sendResponse({ ok:false, error:"unknown_message" });
  })().catch(err => sendResponse({ ok:false, error:String(err?.message || err) }));
  return true;
});
async function notifySettingsUpdated(settings){
  try{
    const tabs = await chrome.tabs.query({ active:true, currentWindow:true });
    for (const t of tabs){
      if (!t.id) continue;
      try { await chrome.tabs.sendMessage(t.id, { type:"SETTINGS_UPDATED", settings }); } catch {}
    }
  } catch {}
}


