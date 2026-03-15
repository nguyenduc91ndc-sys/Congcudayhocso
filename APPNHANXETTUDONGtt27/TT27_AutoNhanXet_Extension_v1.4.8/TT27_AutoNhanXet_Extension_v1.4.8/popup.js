// popup.js
async function getSettings() {
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  return res?.ok ? res.settings : null;
}
async function setSettings(settings) {
  await chrome.runtime.sendMessage({ type: "SET_SETTINGS", settings });
}
async function getUsage() {
  const res = await chrome.runtime.sendMessage({ type: "GET_USAGE" });
  return res?.ok ? res.usage : { totalFills:0,totalAiCalls:0,totalBankHits:0,lastUsedAt:0 };
}

async function getGlobalStats() {
  const res = await chrome.runtime.sendMessage({ type: "GET_GLOBAL_STATS" });
  return res?.ok ? res.stats : null;
}

function setSegActive(mode) {
  document.querySelectorAll(".segbtn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
}
function show(el, msg, ok=true) {
  el.textContent = msg;
  el.style.borderColor = ok ? "rgba(85,242,165,.30)" : "rgba(255,106,138,.30)";
}

function renderQrBox(boxEl, payload) {
  const data = (payload || "").trim();
  boxEl.innerHTML = "";
  if (!data) {
    boxEl.textContent = "Chưa cấu hình";
    boxEl.style.color = "rgba(0,0,0,.55)";
    boxEl.style.fontSize = "12px";
    boxEl.style.padding = "10px";
    boxEl.style.textAlign = "center";
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 96; canvas.height = 96;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const qr = qrcodegen.QrCode.encodeText(data, qrcodegen.QrCode.Ecc.MEDIUM);
  const border = 2;
  const size = qr.size + border*2;
  const scale = Math.floor(canvas.width / size);
  const offset = Math.floor((canvas.width - size*scale)/2);

  for (let y=0; y<size; y++){
    for (let x=0; x<size; x++){
      const dark = (x>=border && x<border+qr.size && y>=border && y<border+qr.size) ? qr.getModule(x-border,y-border) : false;
      ctx.fillStyle = dark ? "#000000" : "#FFFFFF";
      ctx.fillRect(offset + x*scale, offset + y*scale, scale, scale);
    }
  }
  boxEl.appendChild(canvas);
}

document.addEventListener("DOMContentLoaded", async () => {
  const enabledEl = document.getElementById("enabled");
  const siteEnabledEl = document.getElementById("siteEnabled");
  const modeBANK = document.getElementById("modeBANK");
  const modeAI = document.getElementById("modeAI");
  const openOptions = document.getElementById("openOptions");
  const hostEl = document.getElementById("host");
  const status = document.getElementById("status");
  const usageLine = document.getElementById("usageLine");

  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
  const url = tab?.url ? new URL(tab.url) : null;
  hostEl.textContent = url ? url.hostname : "";

  const settings = await getSettings();
  if (!settings) return show(status, "Không đọc được cài đặt.", false);

  enabledEl.checked = !!settings.enabled;
  setSegActive(settings.mode || "BANK");

  settings.sitePolicy = settings.sitePolicy || { enabledByDefault: true, siteEnabled: {} };
  const m = settings.sitePolicy.siteEnabled || {};
  const host = url ? url.hostname : "";
  const has = host ? Object.prototype.hasOwnProperty.call(m, host) : false;
  const siteVal = host ? (has ? !!m[host] : !!settings.sitePolicy.enabledByDefault) : !!settings.sitePolicy.enabledByDefault;
  siteEnabledEl.checked = siteVal;

  enabledEl.addEventListener("change", async () => {
    settings.enabled = enabledEl.checked;
    await setSettings(settings);
    show(status, "Đã lưu.", true);
  });

  siteEnabledEl.addEventListener("change", async () => {
    settings.sitePolicy.siteEnabled = settings.sitePolicy.siteEnabled || {};
    if (host) settings.sitePolicy.siteEnabled[host] = siteEnabledEl.checked;
    await setSettings(settings);
    show(status, "Đã lưu.", true);
  });

  modeBANK.addEventListener("click", async () => {
    settings.mode = "BANK";
    setSegActive("BANK");
    await setSettings(settings);
    show(status, "Đã chuyển: Ngân hàng.", true);
  });

  modeAI.addEventListener("click", async () => {
    settings.mode = "AI";
    setSegActive("AI");
    await setSettings(settings);
    show(status, "Đã chuyển: AI.", true);
  });

  openOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());

  // QR ủng hộ (offline)

  // Tổng lượt dùng (ưu tiên thống kê toàn hệ thống từ Apps Script)
  try {
    const stats = await getGlobalStats();
    if (stats && typeof stats.totalFills !== "undefined") {
      // Tách 2 dòng để không bị tràn khi số lượt dùng lớn
      const totalFills = stats.totalFills || 0;
      const totalUsers = stats.totalUsers || 0;
      usageLine.innerHTML = `
        <div>Tổng lượt dùng (toàn hệ thống): <b>${totalFills}</b></div>
        <div>Người dùng: <b>${totalUsers}</b></div>
      `.trim();
    } else {
      const usage = await getUsage();
      usageLine.textContent = `Tổng số lượt dùng: ${usage.totalFills || 0}`;
    }
  } catch {
    try {
      const usage = await getUsage();
      usageLine.textContent = `Tổng số lượt dùng: ${usage.totalFills || 0}`;
    } catch {
      usageLine.textContent = "Tổng số lượt dùng: 0";
    }
  }
});
