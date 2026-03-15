/**
 * content.js
 * - Chạy trên mọi domain, chỉ kích hoạt khi phát hiện đúng UI
 * - 2 chế độ: BANK (ngân hàng) hoặc AI
 * - Gộp: Môn học (có/không điểm) + NL/PC
 */

const TT27 = (() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // Helper thiếu ở một số bản trước => làm NL/PC không chạy.
  const normLower = (s)=> String(s||"").toLowerCase().trim();
  // Alias để tránh sai tên hàm (một số đoạn gọi setInputValue)
  const setInputValue = (el, value)=> setNativeValue(el, value);

  const SUBJECT_SEL = {
    khoi: 'input[id$="rcbKhoi_Input"]',
    lop: 'input[id$="rcbLop_Input"]',
    mon: 'input[id$="rcbMonHoc_Input"]',
    hocKy: 'input[id$="rcbHocKy_Input"]',
    thoiDiem: 'input[id$="rcbThoiDiemDanhGia_Input"]',

    // Điểm KTĐK / điểm giữa kỳ / cuối kỳ: nhiều hệ thống dùng id khác nhau
    // (txtDIEM_KTDK_*, txtDIEM_GK, txtDIEM_CK, hoặc chỉ txtDIEM)
    scoreAny: 'input[id*="txtDIEM_KTDK"], input[id*="txtDIEM_GK"], input[id*="txtDIEM_CK"], input[id*="txtDIEM"]',

    // Mức đạt được: có thể là *_GK, *_CK hoặc không có hậu tố
    levelAny: 'input[id*="txtMUC_DAT_DUOC"]',

    // Nội dung nhận xét: có thể là *_GK, *_CK hoặc không có hậu tố
    remarkAny: 'textarea[id*="txtNOI_DUNG_NHAN_XET"], input[id*="txtNOI_DUNG_NHAN_XET"]',
  };

  const FLAG = { autoLevel:"tt27AutoLevel", autoRemark:"tt27AutoRemark", bound:"tt27Bound" };
  // ===== Debounce & chống chạy lặp khi gõ =====
  const __debTimers = new Map();
  const __runToken = new Map();

  function ensureRowId(row){
    if (!row.dataset.tt27RowId){
      row.dataset.tt27RowId = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
    }
    return row.dataset.tt27RowId;
  }

  function scheduleRowTask(row, kind, type, delayMs, fn){
    const rid = ensureRowId(row);
    const key = `${type}|${kind}|${rid}`;
    const prevT = __debTimers.get(key);
    if (prevT) clearTimeout(prevT);

    const token = ( __runToken.get(key) || 0 ) + 1;
    __runToken.set(key, token);

    __debTimers.set(key, setTimeout(async ()=>{
      // Nếu trong lúc đợi có lần mới hơn, bỏ qua
      if ((__runToken.get(key)||0) !== token) return;
      try{ await fn(); }catch(e){}
    }, delayMs));
  }

  // Sticky chọn nhận xét trong khoảng ngắn để tránh "chạy 1-2 câu rồi mới dừng"
  const __stickyPick = new Map();


  function getHostname(){ try{return location.hostname||""}catch{return ""} }
  function getInputValue(sel){ return ($(sel)?.value||"").trim(); }
  function normalizeGrade(text){
    const s = String(text||"").replace(/^Khối\s*/i,"").trim();
    const n = Number(s); return Number.isFinite(n)?n:null;
  }
  function inferPeriodKey(hocKyText, thoiDiemText){
    // Chuẩn hoá để đọc đúng các kiểu "I/II", "1/2", và cả số La Mã unicode (Ⅰ/Ⅱ)
    let hk = String(hocKyText||"").toLowerCase().replace(/\u00a0/g, " ").trim();
    let td = String(thoiDiemText||"").toLowerCase().replace(/\u00a0/g, " ").trim();

    // Chuẩn hoá "kì" -> "kỳ" để khớp regex (nhiều nơi dùng "kì")
    hk = hk.replace(/kì/g, "kỳ");
    td = td.replace(/kì/g, "kỳ");

    // Chuẩn hoá vài dạng viết tắt HK
    hk = hk.replace(/h\s*k\s*/g, "hk ");
    td = td.replace(/h\s*k\s*/g, "hk ");

    // Map số La Mã unicode -> ascii
    td = td.replace(/\u2160/g, " i").replace(/\u2161/g, " ii"); // Ⅰ Ⅱ
    hk = hk.replace(/\u2160/g, " i").replace(/\u2161/g, " ii");

    const isGK = td.includes("giữa");

    // Nhận diện HK1 / HK2 từ cả học kỳ và thời điểm (hỗ trợ "kỳ/kì", "I/II", "1/2", "HK1/HK2")
    const tdIs1 = /(\b1\b|\bi\b|kỳ\s*i|học\s*kỳ\s*i|\bhk\s*1\b|\bhk\s*i\b|\bhki\b)/.test(td);
    const tdIs2 = /(\b2\b|\bii\b|kỳ\s*ii|học\s*kỳ\s*ii|\bhk\s*2\b|\bhk\s*ii\b|\bhkii\b)/.test(td);

    const hkIs1 = /(\b1\b|\bi\b|kỳ\s*i|học\s*kỳ\s*i|\bhk\s*1\b|\bhk\s*i\b|\bhki\b)/.test(hk);
    const hkIs2 = /(\b2\b|\bii\b|kỳ\s*ii|học\s*kỳ\s*ii|\bhk\s*2\b|\bhk\s*ii\b|\bhkii\b)/.test(hk);

    const isHK1 = tdIs1 || hkIs1 || /\bgiữa\s*học\s*kỳ\s*i\b/.test(td) || /\bcuối\s*học\s*kỳ\s*i\b/.test(td);
    const isHK2 = tdIs2 || hkIs2 ||
      /\bgiữa\s*học\s*kỳ\s*ii\b/.test(td) || /\bcuối\s*học\s*kỳ\s*ii\b/.test(td) ||
      td.includes("cuối năm"); // nhiều hệ thống ghi "Cuối năm học" thay cho "Cuối học kỳ II"
 // nhiều hệ thống ghi "Cuối năm học" thay cho "Cuối học kỳ II"

    // Ưu tiên theo thời điểm
    if (isGK && isHK1) return "GK1";
    if (!isGK && isHK1) return "CK1";
    if (isGK && isHK2) return "GK2";
    return "CK2";
  }
  function normTHC(v){
    const s=String(v||"").trim().toUpperCase();
    if (s==="T"||s==="H"||s==="C") return s;
    return "";
  }

  function periodKindFromKey(periodKey){
    const k = String(periodKey||"").toUpperCase();
    if (k.startsWith("GK")) return "GK";
    return "CK";
  }

  function pickPeriodicField(row, selector, periodKind){
    const els = Array.from(row.querySelectorAll(selector));
    if (!els.length) return null;
    if (els.length === 1) return els[0];

    const want = "_" + String(periodKind||"").toUpperCase();
    const byId = els.find(el => (el.id||"").toUpperCase().includes(want));
    if (byId) return byId;

    // fallback: nếu CK và có nhiều cột thì thường CK đứng sau
    if (String(periodKind||"").toUpperCase()==="CK") return els[els.length-1];
    return els[0];
  }

  function normTDC(v){
    const s=String(v||"").trim().toUpperCase();
    if (s==="T"||s==="C") return s;
    if (s==="Đ"||s==="D") return "Đ";
    return "";
  }
  function parseScore(v){
    const n=Number(String(v??"").replace(",",".").trim());
    return Number.isFinite(n)?n:NaN;
  }
  function setNativeValue(el, value){
    // Đánh dấu để handler biết đây là thao tác của addon (tránh lặp/nhảy nhiều lần)
    el.dataset.tt27Prog = "1";
    el.value = value;
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
    // Xoá cờ ở tick kế tiếp
    setTimeout(()=>{ try{ delete el.dataset.tt27Prog; }catch(e){} }, 0);
  }

    // Cache settings để phản hồi nhanh khi gõ và đổi chế độ AI/BANK tức thời
  let __settingsCache = null;
  let __settingsCacheAt = 0;

async function getSettings(){
    const now = Date.now();
    if (__settingsCache && (now-__settingsCacheAt) < 800) return __settingsCache;
    const res = await chrome.runtime.sendMessage({type:"GET_SETTINGS"});
    __settingsCache = res?.ok ? res.settings : { enabled:true, mode:"BANK", features:{subject:true,nlpc:true}, sitePolicy:{enabledByDefault:true,siteEnabled:{}}};
    __settingsCacheAt = now;
    return __settingsCache;
  }
  
  
let __tt27TickTimer=null;
async function tt27TickFromMsg(){
  try{
    const s = await getSettings();
    if (!s?.enabled || !isSiteEnabled(s)) return;
    if (s.features?.subject) bindSubject(s);
    if (s.features?.nlpc) bindNlpc(s);
  }catch(e){}
}
// Nhận settings mới ngay khi người dùng đổi chế độ ở popup/options (không cần F5)
  chrome.runtime.onMessage.addListener((msg)=>{
    if (msg?.type==="SETTINGS_UPDATED" && msg.settings){
      __settingsCache = msg.settings;
      __settingsCacheAt = Date.now();
    if (__tt27TickTimer) clearTimeout(__tt27TickTimer);
    __tt27TickTimer=setTimeout(tt27TickFromMsg, 50);
    }
  });

function isSiteEnabled(settings){
    const host=getHostname();
    const m=settings?.sitePolicy?.siteEnabled||{};
    if (Object.prototype.hasOwnProperty.call(m,host)) return !!m[host];
    return !!settings?.sitePolicy?.enabledByDefault;
  }

  function detectSubjectPage(){
    return !!$(SUBJECT_SEL.mon) && ($$(SUBJECT_SEL.levelAny).length + $$(SUBJECT_SEL.levelAny).length > 0);
  }
  function detectNlpcPage(){
    return $$("table").some(t=>{
      const thText=(t.querySelector("thead")?.innerText||"").toLowerCase();
      return thText.includes("nhận xét năng lực chung") && thText.includes("nhận xét phẩm chất");
    });
  }

  async function getBank(){
    const res = await chrome.runtime.sendMessage({type:"BANK_GET"});
    if (!res?.ok) throw new Error(res?.error||"BANK_GET failed");
    return { bankMap: res.bankMap||{}, prefixIndex: res.prefixIndex||{} };
  }

  async function pickRoundRobin(prefixIndex, prefix, groupKey, stickyScope){
    const pool = prefixIndex[prefix]||[];
    if (!pool.length) return null;
    const rrKey = `rr:${groupKey}|${prefix}`;
    const sk = `rrs:${groupKey}|${prefix}|${stickyScope||""}`;

    // Sticky trong 1.5s: nếu cùng prefix+groupKey thì trả lại item cũ, không tăng index
    const now = Date.now();
    const sticky = __stickyPick.get(sk);
    if (sticky && (now - sticky.ts) < 1500){
      return sticky.item;
    }

    const got = await chrome.storage.local.get({[rrKey]:0});
    const cur = got[rrKey]||0;
    const item = pool[cur % pool.length];
    await chrome.storage.local.set({[rrKey]:cur+1});
    __stickyPick.set(sk, {ts: now, item});
    return item;
  }

  async function aiGenerate(payload){
    const res = await chrome.runtime.sendMessage({type:"AI_GENERATE", payload});
    if (!res?.ok) throw new Error(res?.error||"AI_GENERATE failed");
    return res.text||"";
  }

  function canOverwrite(el){
    const cur=(el.value||"").trim();
    return cur.length===0 || el.dataset[FLAG.autoRemark]==="1";
  }
  function bindManualProtect(el, kind){
    if (!el) return;
    const k = `${FLAG.bound}_${kind}`;
    if (el.dataset[k]==="1") return;
    el.dataset[k]="1";
    el.addEventListener("input",(e)=>{
      if (e.isTrusted){
        if (kind==="remark") delete el.dataset[FLAG.autoRemark];
        if (kind==="level") delete el.dataset[FLAG.autoLevel];
      }
    });
  }

  function getScoringRule(settings, ctx){
    const def = settings?.scoring?.default || { tMin: 9, hMin: 5 };
    const ovs = Array.isArray(settings?.scoring?.overrides) ? settings.scoring.overrides : [];
    const matches = (o) => {
      if (o == null || typeof o !== "object") return false;
      if (o.subject && String(o.subject).trim() !== String(ctx.mon||"").trim()) return false;
      if (o.grade != null && Number(o.grade) !== Number(ctx.grade)) return false;
      if (o.periodKey != null && String(o.periodKey) !== String(ctx.periodKey||"")) return false;
      return true;
    };
    const weight = (o) => (o.subject?4:0) + (o.grade!=null?2:0) + (o.periodKey?1:0);
    const cand = ovs.filter(matches).sort((a,b)=>weight(b)-weight(a))[0];
    const tMin = Number(cand?.tMin ?? def.tMin ?? 9);
    const hMin = Number(cand?.hMin ?? def.hMin ?? 5);
    return { tMin, hMin };
  }
  function scoreToTHC(score, settings, ctx){
    const rule = getScoringRule(settings, ctx);
    if (score >= rule.tMin) return "T";
    if (score >= rule.hMin) return "H";
    return "C";
  }

  function getSubjectCtx(){
    const grade = normalizeGrade(getInputValue(SUBJECT_SEL.khoi));
    const lop = getInputValue(SUBJECT_SEL.lop);
    const mon = getInputValue(SUBJECT_SEL.mon);
    const hocKy = getInputValue(SUBJECT_SEL.hocKy);
    const thoiDiem = getInputValue(SUBJECT_SEL.thoiDiem);
    const periodKey = inferPeriodKey(hocKy, thoiDiem);
    return { grade, lop, mon, hocKy, thoiDiem, periodKey };
  }

  function getSelectorsByPeriod(periodKey){
    const isGK = (periodKey==="GK1"||periodKey==="GK2");
    return { scoreSel: isGK?SUBJECT_SEL.scoreAny:SUBJECT_SEL.scoreAny, levelSel: isGK?SUBJECT_SEL.levelAny:SUBJECT_SEL.levelAny, remarkSel: isGK?SUBJECT_SEL.remarkAny:SUBJECT_SEL.remarkAny };
  }


  function resolveSubjectCode(mon, subjectMap){
    const name = String(mon||"").trim();
    if (!name) return "";

    const map = subjectMap || {};

    // 1) Tra bảng trực tiếp
    let code = String(map[name] || "").trim();
    if (code) return code;

    // 2) Nếu có ngoặc, ưu tiên phần trong ngoặc: "Nghệ thuật (Âm nhạc)" -> "Âm nhạc"
    const m = name.match(/\(([^)]+)\)/);
    if (m && m[1]) {
      const inner = m[1].trim();
      code = String(map[inner] || "").trim();
      if (code) return code;
    }

    // 3) Bỏ tiền tố thường gặp
    const simplified = name
      .replace(/^Nghệ thuật\s*/i,"")
      .replace(/^Giáo dục\s*/i,"")
      .trim();
    code = String(map[simplified] || "").trim();
    if (code) return code;

    // 4) Một số tên đặc biệt
    if (/^Ngoại ngữ$/i.test(name) || name.toLowerCase().includes("ngoại ngữ")) return "TA";

    // 5) Heuristic theo từ khoá (đảm bảo GDTC không bị lệch)
    const n = name.toLowerCase();
    if (n.includes("giáo dục thể chất") || n.includes("thể dục") || n.includes("thể chất")) return "GDTC";
    if (n.includes("toán")) return "TOAN";
    if (n.includes("tin học")) return "TIN";
    if (n.includes("công nghệ")) return "CN";
    if (n.includes("hoạt động trải nghiệm")) return "HDTN";
    if (n.includes("tiếng việt")) return "TV";
    if (n.includes("đạo đức")) return "DD";
    if (n.includes("tự nhiên") && n.includes("xã hội")) return "TNXH";
    if (n.includes("khoa học")) return "KHOA";
    if (n.includes("lịch sử") && (n.includes("địa lí") || n.includes("địa lý"))) return "LSDL";
    if (n.includes("mĩ thuật") || n.includes("mỹ thuật")) return "MT";
    if (n.includes("âm nhạc")) return "AN";

    return "";
  }

  async function fillSubjectByBank(row, ctx, settings, levelNow){
    const { prefixIndex } = await getBank();
    const subjCode = resolveSubjectCode(ctx.mon, settings.subjectMap);
    if (!subjCode || !ctx.grade) return null;

    const prefixWithPeriod = `${subjCode}${ctx.grade}${ctx.periodKey}${levelNow}`;
    const prefixNoPeriod = `${subjCode}${ctx.grade}${levelNow}`;
    const groupKeyBase = `${getHostname()}|${ctx.lop}|SUBJECT`;

    let prefix = prefixWithPeriod;
    if (!(prefixIndex[prefix] && prefixIndex[prefix].length)) prefix = prefixNoPeriod;

    const item = await pickRoundRobin(prefixIndex, prefix, groupKeyBase, ensureRowId(row));
    return item ? { code:item.code, text:item.text } : null;
  }

  async function fillSubjectByAI(ctx, levelNow){
    const payload = {
      taskType:"SUBJECT_REMARK",
      context:{ page:"subject", grade:ctx.grade, className:ctx.lop, subject:ctx.mon, periodKey:ctx.periodKey, term:(ctx.thoiDiem||ctx.hocKy) },
      inputs:{ level:levelNow, score:null },
      constraints:{ noPronouns:true, noGreetings:true, objective:true, encourageMaintain:true }
    };
    return await aiGenerate(payload);
  }

  async function handleSubjectScoreChange(row, scoreEl, settings){
    const ctx = getSubjectCtx();
    const kind = periodKindFromKey(ctx.periodKey);
    const score = parseScore(scoreEl.value);

    const levelEl = pickPeriodicField(row, SUBJECT_SEL.levelAny, kind);
    const remarkEl = pickPeriodicField(row, SUBJECT_SEL.remarkAny, kind);
    if (!levelEl || !remarkEl) return;

    bindManualProtect(levelEl,"level");
    bindManualProtect(remarkEl,"remark");

    if (Number.isFinite(score)){
      const suggest = scoreToTHC(score, settings, ctx);
      if (!String(levelEl.value||"").trim() || levelEl.dataset[FLAG.autoLevel]==="1"){
        setNativeValue(levelEl, suggest);
        levelEl.dataset[FLAG.autoLevel]="1";
      }
    }

    const levelNow = normTHC(levelEl.value);
    if (!levelNow) return;

    // user đã sửa mức => cho phép ghi đè theo mức mới
    delete levelEl.dataset[FLAG.autoLevel];

    if (!canOverwrite(remarkEl)) return;

    let text="";
    if (settings.mode==="AI") text = await fillSubjectByAI(ctx, levelNow);
    else text = (await fillSubjectByBank(row, ctx, settings, levelNow))?.text || "";

    if (text){
      setNativeValue(remarkEl, text);
      remarkEl.dataset[FLAG.autoRemark]="1";
      chrome.runtime.sendMessage({ type:"BUMP_USAGE", delta: { totalFills: 1, totalAiCalls: settings.mode==="AI"?1:0, totalBankHits: settings.mode==="AI"?0:1 } }).catch(()=>{});
    }
  }

  async function handleSubjectLevelChange(row, levelEl, settings){
    const ctx = getSubjectCtx();
    const kind = periodKindFromKey(ctx.periodKey);

    const targetLevelEl = pickPeriodicField(row, SUBJECT_SEL.levelAny, kind);
    const remarkEl = pickPeriodicField(row, SUBJECT_SEL.remarkAny, kind);
    if (!targetLevelEl || !remarkEl) return;

    bindManualProtect(targetLevelEl,"level");
    bindManualProtect(remarkEl,"remark");

    const typed = normTHC(levelEl.value);
    if (!typed) return;

    // Nếu user gõ vào cột không đúng kỳ, copy sang cột đúng kỳ (chỉ khi cột đúng kỳ đang trống hoặc do addon tự điền)
    if (levelEl !== targetLevelEl){
      if (!String(targetLevelEl.value||"").trim() || targetLevelEl.dataset[FLAG.autoLevel]==="1"){
        setNativeValue(targetLevelEl, typed);
        targetLevelEl.dataset[FLAG.autoLevel]="1";
      }
    }

    const levelNow = normTHC(targetLevelEl.value) || typed;
    if (!levelNow) return;

    delete targetLevelEl.dataset[FLAG.autoLevel];

    if (!canOverwrite(remarkEl)) return;

    let text="";
    if (settings.mode==="AI") text = await fillSubjectByAI(ctx, levelNow);
    else text = (await fillSubjectByBank(row, ctx, settings, levelNow))?.text || "";

    if (text){
      setNativeValue(remarkEl, text);
      remarkEl.dataset[FLAG.autoRemark]="1";
      chrome.runtime.sendMessage({ type:"BUMP_USAGE", delta: { totalFills: 1, totalAiCalls: settings.mode==="AI"?1:0, totalBankHits: settings.mode==="AI"?0:1 } }).catch(()=>{});
    }
  }

  
  function bindSubject(settings){
    // Bind score inputs (GK + CK)
    const scoreSelAll = `${SUBJECT_SEL.scoreAny}, ${SUBJECT_SEL.scoreAny}`;
    $$(scoreSelAll).forEach(scoreEl=>{
      if (scoreEl.dataset.tt27BoundScore==="1") return;
      scoreEl.dataset.tt27BoundScore="1";
      const row = scoreEl.closest("tr");
      if (!row) return;

      const onInput = ()=>{
        if (scoreEl.dataset.tt27Prog==="1") return;
        scheduleRowTask(row, periodKindFromKey(getSubjectCtx().periodKey), "score", 280, async ()=>{ const s = await getSettings(); await handleSubjectScoreChange(row, scoreEl, s); });
      };
      const onChange = ()=>{
        if (scoreEl.dataset.tt27Prog==="1") return;
        scheduleRowTask(row, periodKindFromKey(getSubjectCtx().periodKey), "score", 0, async ()=>{ const s = await getSettings(); await handleSubjectScoreChange(row, scoreEl, s); });
      };
      scoreEl.addEventListener("input", onInput);
      scoreEl.addEventListener("change", onChange);

      // protect remark if exists
      const remarkEl = row.querySelector(SUBJECT_SEL.remarkAny);
      if (remarkEl) bindManualProtect(remarkEl,"remark");
    });

    // Bind level inputs (cho môn không nhập điểm hoặc user sửa mức)
    const levelSelAll = `${SUBJECT_SEL.levelAny}, ${SUBJECT_SEL.levelAny}`;
    $$(levelSelAll).forEach(levelEl=>{
      if (levelEl.dataset.tt27BoundLevel==="1") return;
      levelEl.dataset.tt27BoundLevel="1";
      const row = levelEl.closest("tr");
      if (!row) return;

      const onInput = ()=>{
        if (levelEl.dataset.tt27Prog==="1") return;
        scheduleRowTask(row, periodKindFromKey(getSubjectCtx().periodKey), "level", 220, async ()=>{ const s = await getSettings(); await handleSubjectLevelChange(row, levelEl, s); });
      };
      const onChange = ()=>{
        if (levelEl.dataset.tt27Prog==="1") return;
        scheduleRowTask(row, periodKindFromKey(getSubjectCtx().periodKey), "level", 0, async ()=>{ const s = await getSettings(); await handleSubjectLevelChange(row, levelEl, s); });
      };
      levelEl.addEventListener("input", onInput);
      levelEl.addEventListener("change", onChange);

      const remarkEl = row.querySelector(SUBJECT_SEL.remarkAny);
      if (remarkEl) bindManualProtect(remarkEl,"remark");
    });
  }


  // ===== NL/PC =====
  const HEADER_TO_CRITERIA = [
    { match:"Tự chủ", code:"NLC1", group:"NLC" },
    { match:"Giao tiếp", code:"NLC2", group:"NLC" },
    { match:"Giải quyết", code:"NLC3", group:"NLC" },

    { match:"Ngôn ngữ", code:"NLNN", group:"NLD" },
    { match:"Tính toán", code:"NLTT", group:"NLD" },
    { match:"Khoa học", code:"NLKH", group:"NLD" },
    { match:"Công nghệ", code:"NLCN", group:"NLD" },
    { match:"Tin học", code:"NLTH", group:"NLD" },
    { match:"Thẩm mĩ", code:"NLTM", group:"NLD" },
    { match:"Thể chất", code:"NLTC", group:"NLD" },

    { match:"Yêu nước", code:"PC1", group:"PC" },
    { match:"Nhân ái", code:"PC2", group:"PC" },
    { match:"Chăm chỉ", code:"PC3", group:"PC" },
    { match:"Trung thực", code:"PC4", group:"PC" },
    { match:"Trách nhiệm", code:"PC5", group:"PC" },
  ];

  // ===== NL/PC theo ID (RadGrid2) - ổn định hơn so với map theo header =====
  function getNlpcPeriodSuffix(){
    // Lấy từ dropdown "Thời điểm đánh giá" (dùng cùng selector với trang môn học)
    const s = normLower(getInputValue(SUBJECT_SEL.thoiDiem));

    // Thực tế trên hệ thống: giữa kỳ dùng hậu tố _GK, còn cuối kỳ/ cuối năm thường dùng _CK.
    if (s.includes("giữa")) return "GK";

    if (s.includes("cuối")) {
      // Nếu trang có trường _CN thật thì ưu tiên, còn không thì về _CK.
      const hasCN = !!document.querySelector('input[id*="RadGrid2"][id*="_CN"], textarea[id*="RadGrid2"][id*="_CN"]');
      return hasCN ? "CN" : "CK";
    }

    // Fallback: đoán theo các input id hiện có
    const any = document.querySelector('input[id*="RadGrid2"][id*="_NL_"], input[id*="RadGrid2"][id*="_PC_"]');
    const id = any?.id || "";
    const m = id.match(/_(GK|CK|CN)/i);
    return m ? m[1].toUpperCase() : "CK";
  }

  const NLC_FIELDS = [
    { seg:"NLC1", idPart:"NL_TU_CHU_TU_HOC" },
    { seg:"NLC2", idPart:"NL_GIAO_TIEP_HOP_TAC" },
    { seg:"NLC3", idPart:"NL_GQUYET_VDE_SANG_TAO" },
  ];
  const NLD_FIELDS_L12 = [
    { seg:"NLNN", idPart:"NL_NGON_NGU" },
    { seg:"NLTT", idPart:"NL_TINH_TOAN" },
    { seg:"NLKH", idPart:"NL_KHOA_HOC" },
    { seg:"NLTM", idPart:"NL_THAM_MI" },
    { seg:"NLTC", idPart:"NL_THE_CHAT" },
  ];
  const NLD_EXTRA_L345 = [
    { seg:"NLCN", idPart:"NL_CONG_NGHE" },
    { seg:"NLTH", idPart:"NL_TIN_HOC" },
  ];
  const PC_FIELDS = [
    { seg:"PC1", idPart:"PC_YEU_NUOC" },
    { seg:"PC2", idPart:"PC_NHAN_AI" },
    { seg:"PC3", idPart:"PC_CHAM_CHI" },
    { seg:"PC4", idPart:"PC_TRUNG_THUC" },
    { seg:"PC5", idPart:"PC_TRACH_NHIEM" },
  ];

  function pickCandidateByPriority(items){
    // items: [{seg, level}]
    const pri = (lv)=> lv==="C"?3 : (lv==="T"?2 : (lv==="Đ"?1:0));
    const max = Math.max(...items.map(x=>pri(x.level)));
    const best = items.filter(x=>pri(x.level)===max);
    return best.length ? best[Math.floor(Math.random()*best.length)] : null;
  }

  async function fillNlpcTextareaByPrefix(rowOrRoot, textarea, bank, prefix, ctxKey, rowKeyOverride){
    if (!textarea) return;
    const rowEl = (rowOrRoot && rowOrRoot.getAttribute) ? rowOrRoot : null;
    const rowKey = String(rowKeyOverride || (rowEl ? (rowEl.getAttribute("data-tt27-rowkey") || (rowEl.getAttribute("id")||`r${rowEl.rowIndex}`)) : "") || (textarea?.id||"")).trim() || "row";
    if (rowEl) rowEl.setAttribute("data-tt27-rowkey", rowKey);

    // Không ghi đè nếu người dùng đã sửa tay
    bindManualProtect(textarea, "remark");
    if (!canOverwrite(textarea)) return;

    const picked = await pickRoundRobin(bank.prefixIndex, prefix, ctxKey, rowKey);
    if (!picked?.text) return;

    setNativeValue(textarea, picked.text);
    textarea.dataset[FLAG.autoRemark] = "1";
    chrome.runtime.sendMessage({ type:"BUMP_USAGE", delta: { totalFills: 1, totalAiCalls: 0, totalBankHits: 1 } }).catch(()=>{});
  }

  function qFirst(root, selectors){
    for (const sel of selectors){
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function qInputByPart(row, idPart, suffix){
    return qFirst(row, [
      `input[id*="${idPart}_${suffix}"]`,
      `input[id*="${idPart}_CK"]`,
      `input[id*="${idPart}_GK"]`,
      `input[id*="${idPart}_CN"]`,
      `input[id*="${idPart}"]`,
    ]);
  }
  function qTextareaByPart(row, idPart, suffix){
    return qFirst(row, [
      `textarea[id*="${idPart}_${suffix}"]`,
      `textarea[id*="${idPart}_CK"]`,
      `textarea[id*="${idPart}_GK"]`,
      `textarea[id*="${idPart}_CN"]`,
      `textarea[id*="${idPart}"]`,
    ]);
  }

  async function updateNlpcRowByIds(row, settings){
    const ctx = getNlpcCtx();
    if (!ctx.grade || !ctx.lop) return;

    const suffix = getNlpcPeriodSuffix(); // GK/CK/CN
    const group = (ctx.grade===1||ctx.grade===2) ? "L12" : "L345";
    const bank = await getBank();

    // textarea đích (trong cùng row)
    const taNLC = qTextareaByPart(row, "txtNXNL", suffix);
    const taNLD = qTextareaByPart(row, "txtNXNL_DAC_THU", suffix);
    const taPC  = qTextareaByPart(row, "txtNXPC", suffix);

    // 1) NLC: đủ 3 ô
    const nlcVals = [];
    for (const f of NLC_FIELDS){
      const inp = qInputByPart(row, f.idPart, suffix);
      const lv = normTDC(inp?.value);
      if (lv) nlcVals.push({ seg:f.seg, level:lv });
    }
    if (nlcVals.length===NLC_FIELDS.length){
      const chosen = pickCandidateByPriority(nlcVals);
      if (chosen){
        const prefix = `${group}${chosen.seg}${chosen.level}`;
        const ctxKey = `${ctx.grade}|${ctx.lop}|${ctx.periodKey||suffix}|NLC|${prefix}`;
        if (settings.mode==="AI") { const text = await fillNlpcByAI(ctx,"NLC",chosen,nlcVals); setInputValue(taNLC, text); } else { await fillNlpcTextareaByPrefix(row, taNLC, bank, prefix, ctxKey); }
      }
    }

    // 2) NLD: đủ 5 (L12) hoặc 7 (L345)
    const nldFields = (ctx.grade===1||ctx.grade===2) ? NLD_FIELDS_L12 : [...NLD_FIELDS_L12, ...NLD_EXTRA_L345];
    const nldVals=[];
    for (const f of nldFields){
      const inp = qInputByPart(row, f.idPart, suffix);
      const lv = normTDC(inp?.value);
      if (lv) nldVals.push({ seg:f.seg, level:lv });
    }
    if (nldVals.length===nldFields.length){
      const chosen = pickCandidateByPriority(nldVals);
      if (chosen){
        const prefix = `${group}${chosen.seg}${chosen.level}`;
        const ctxKey = `${ctx.grade}|${ctx.lop}|${ctx.periodKey||suffix}|NLD|${prefix}`;
        if (settings.mode==="AI") { const text = await fillNlpcByAI(ctx,"NLD",chosen,nldVals); setInputValue(taNLD, text); } else { await fillNlpcTextareaByPrefix(row, taNLD, bank, prefix, ctxKey); }
      }
    }

    // 3) PC: đủ 5
    const pcVals=[];
    for (const f of PC_FIELDS){
      const inp = qInputByPart(row, f.idPart, suffix);
      const lv = normTDC(inp?.value);
      if (lv) pcVals.push({ seg:f.seg, level:lv });
    }
    if (pcVals.length===PC_FIELDS.length){
      const chosen = pickCandidateByPriority(pcVals);
      if (chosen){
        const prefix = `${group}${chosen.seg}${chosen.level}`;
        const ctxKey = `${ctx.grade}|${ctx.lop}|${ctx.periodKey||suffix}|PC|${prefix}`;
        if (settings.mode==="AI") { const text = await fillNlpcByAI(ctx,"PC",chosen,pcVals); setInputValue(taPC, text); } else { await fillNlpcTextareaByPrefix(row, taPC, bank, prefix, ctxKey); }
      }
    }
  }

  
  // ==== NL/PC (RadGrid2) theo token ctlXX để không phụ thuộc cấu trúc header/rowspan ====
  const __tt27NlpcTimers = new Map();
  function scheduleTokenTask(key, fn, delay){
    const k = String(key||"");
    const old = __tt27NlpcTimers.get(k);
    if (old) clearTimeout(old);
    const t = setTimeout(()=>{
      __tt27NlpcTimers.delete(k);
      try { fn(); } catch(e){}
    }, delay||180);
    __tt27NlpcTimers.set(k, t);
  }

  function getRadGrid2RowTokenFromId(id){
    const m = String(id||"").match(/RadGrid2_ctl00_(ctl\d{2})_/i);
    return m ? m[1] : "";
  }

  function qInputByToken(rowToken, idPart, suffix){
    const rt = String(rowToken||"");
    if (!rt) return null;
    const part = String(idPart||"");
    const sfx = String(suffix||"").toUpperCase();
    return qFirst(document, [
      `input[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_${sfx}"]`,
      `input[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_CK"]`,
      `input[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_GK"]`,
      `input[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_CN"]`,
      `input[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_"]`,
      `input[id*="RadGrid2_ctl00_${rt}_"][id*="${part}"]`,
    ]);
  }

  function qTextareaByToken(rowToken, idPart, suffix){
    const rt = String(rowToken||"");
    if (!rt) return null;
    const part = String(idPart||"");
    const sfx = String(suffix||"").toUpperCase();
    return qFirst(document, [
      `textarea[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_${sfx}"]`,
      `textarea[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_CK"]`,
      `textarea[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_GK"]`,
      `textarea[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_CN"]`,
      `textarea[id*="RadGrid2_ctl00_${rt}_"][id*="${part}_"]`,
      `textarea[id*="RadGrid2_ctl00_${rt}_"][id*="${part}"]`,
    ]);
  }

  async function updateNlpcByToken(rowToken, settings){
    const ctx = getNlpcCtx();
    if (!ctx.grade || !ctx.lop) return;

    const suffix = getNlpcPeriodSuffix(); // GK/CK/CN (chỉ để tìm ô; cuối năm có thể vẫn là _CK)
    const group = (ctx.grade===1||ctx.grade===2) ? "L12" : "L345";
    const bank = await getBank();

    const taNLC = qTextareaByToken(rowToken, "txtNXNL", suffix);
    const taNLD = qTextareaByToken(rowToken, "txtNXNL_DAC_THU", suffix);
    const taPC  = qTextareaByToken(rowToken, "txtNXPC", suffix);

    // 1) NLC đủ 3 ô
    const nlcVals = [];
    for (const f of NLC_FIELDS){
      const inp = qInputByToken(rowToken, f.idPart, suffix);
      const lv = normTDC(inp?.value);
      if (lv) nlcVals.push({ seg:f.seg, level:lv });
    }
    if (nlcVals.length === NLC_FIELDS.length){
      const chosen = pickCandidateByPriority(nlcVals);
      if (chosen && taNLC){
        if (settings.mode==="AI"){
          const text = await fillNlpcByAI(ctx, "NLC", chosen.seg, chosen.level);
          setInputValue(taNLC, text || "");
        } else {
          const prefix = `${group}${chosen.seg}${chosen.level}`; // L12NLC1C
          const ctxKey = `${ctx.grade}|${ctx.lop}|${ctx.periodKey||suffix}|NLC|${prefix}`;
          await fillNlpcTextareaByPrefix(document, taNLC, bank, prefix, ctxKey, rowToken);
        }
      }
    }

    // 2) NLD đủ 5 (L12) hoặc 7 (L345)
    const nldFields = (ctx.grade===1||ctx.grade===2) ? NLD_FIELDS_L12 : [...NLD_FIELDS_L12, ...NLD_EXTRA_L345];
    const nldVals = [];
    for (const f of nldFields){
      const inp = qInputByToken(rowToken, f.idPart, suffix);
      const lv = normTDC(inp?.value);
      if (lv) nldVals.push({ seg:f.seg, level:lv });
    }
    if (nldVals.length === nldFields.length){
      const chosen = pickCandidateByPriority(nldVals);
      if (chosen && taNLD){
        if (settings.mode==="AI"){
          const text = await fillNlpcByAI(ctx, "NLD", chosen.seg, chosen.level);
          setInputValue(taNLD, text || "");
        } else {
          const prefix = `${group}${chosen.seg}${chosen.level}`; // L12NLNNC
          const ctxKey = `${ctx.grade}|${ctx.lop}|${ctx.periodKey||suffix}|NLD|${prefix}`;
          await fillNlpcTextareaByPrefix(document, taNLD, bank, prefix, ctxKey, rowToken);
        }
      }
    }

    // 3) PC đủ 5 ô
    const pcVals = [];
    for (const f of PC_FIELDS){
      const inp = qInputByToken(rowToken, f.idPart, suffix);
      const lv = normTDC(inp?.value);
      if (lv) pcVals.push({ seg:f.seg, level:lv });
    }
    if (pcVals.length === PC_FIELDS.length){
      const chosen = pickCandidateByPriority(pcVals);
      if (chosen && taPC){
        if (settings.mode==="AI"){
          const text = await fillNlpcByAI(ctx, "PC", chosen.seg, chosen.level);
          setInputValue(taPC, text || "");
        } else {
          const prefix = `${group}${chosen.seg}${chosen.level}`; // L12PC1C
          const ctxKey = `${ctx.grade}|${ctx.lop}|${ctx.periodKey||suffix}|PC|${prefix}`;
          await fillNlpcTextareaByPrefix(document, taPC, bank, prefix, ctxKey, rowToken);
        }
      }
    }
  }

  function bindNlpcByIds(settings){
    const any = document.querySelector('input[id*="RadGrid2"][id*="_NL_"], input[id*="RadGrid2"][id*="_PC_"]');
    const table = any?.closest("table");
    if (!table) return false;
    if (table.dataset.tt27NlpcDelegated === "1") return true;
    table.dataset.tt27NlpcDelegated = "1";

    const handler = (ev)=>{
      const t = ev.target;
      if (!t || t.tagName !== "INPUT") return;
      const id = t.id || "";
      if (!id.includes("RadGrid2")) return;
      if (!(id.includes("_NL_") || id.includes("_PC_"))) return;

      const rowToken = getRadGrid2RowTokenFromId(id);
      if (!rowToken) return;

      scheduleTokenTask(`${rowToken}|nlpc`, async ()=>{
        const s = await getSettings(); // luôn lấy config mới nhất (BANK/AI)
        await updateNlpcByToken(rowToken, s);
      }, 180);
    };

    table.addEventListener("input", handler, true);
    table.addEventListener("change", handler, true);

    return true;
  }

  const NLPC_PRIORITY = ["C","T","Đ"];

  function findNlpcTable(){
    return $$("table").find(t=>{
      const thText=(t.querySelector("thead")?.innerText||"").toLowerCase();
      return thText.includes("nhận xét năng lực chung") && thText.includes("nhận xét phẩm chất");
    }) || null;
  }

  function buildNlpcColMap(table){
    // Tạo map cột theo header thật (tính colspan/rowspan) để khớp đúng với <td> (tránh lệch cột ở NL/PC)
    const headRows = $$("thead tr", table);
    if (!headRows.length) return { headers:[], critCol:{}, nameCol:-1, remarkCols:{} };

    const grid = [];
    const spanLeft = [];
    for (let r=0; r<headRows.length; r++){
      grid[r] = [];
      let c = 0;
      const cells = $$("th", headRows[r]);
      for (const cell of cells){
        while (spanLeft[c] > 0) c++;
        const cs = Number(cell.getAttribute("colspan")||1);
        const rs = Number(cell.getAttribute("rowspan")||1);
        const raw = (cell.innerText||"").replace(/\s+/g," ").trim();
        for (let k=0;k<cs;k++){
          grid[r][c+k] = raw;
          if (rs>1) spanLeft[c+k] = (spanLeft[c+k]||0) + (rs-1);
        }
        c += cs;
      }
      for (let i=0;i<spanLeft.length;i++){
        if (spanLeft[i]>0) spanLeft[i]--;
      }
    }

    const maxCols = Math.max(...grid.map(r=>r.length));
    const headers = [];
    const chainLower = [];
    for (let c=0;c<maxCols;c++){
      const parts=[];
      for (let r=0;r<grid.length;r++){
        const t = grid[r][c];
        if (t) parts.push(t);
      }
      const chain = parts.join(" | ");
      headers[c]=chain;
      chainLower[c]=chain.toLowerCase();
    }

    const critCol = {};
    for (const m of HEADER_TO_CRITERIA){
      const idx = chainLower.findIndex(h=>h.includes(m.match.toLowerCase()));
      if (idx>=0) critCol[m.code]=idx;
    }
    const nameCol = chainLower.findIndex(h=>h.includes("họ tên"));

    function findRemarkCol(groupIncl, leafIncl){
      return chainLower.findIndex(h=>h.includes(groupIncl) && h.includes(leafIncl));
    }
    const remarkCols = {
      nlc_code: findRemarkCol("nhận xét năng lực chung","mã nhận xét"),
      nlc_text: findRemarkCol("nhận xét năng lực chung","nội dung"),
      nld_code: findRemarkCol("nhận xét năng lực đặc thù","mã nhận xét"),
      nld_text: findRemarkCol("nhận xét năng lực đặc thù","nội dung"),
      pc_code:  findRemarkCol("nhận xét phẩm chất","mã nhận xét"),
      pc_text:  findRemarkCol("nhận xét phẩm chất","nội dung"),
    };
    return { headers, critCol, nameCol, remarkCols };
  }

  function readCellValue(td){
    const el = td?.querySelector("input,select,textarea");
    return el ? el.value : (td?.innerText||"").trim();
  }

  function hashStr(s){
    let h=2166136261;
    for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
    return (h>>>0);
  }
  function pickStable(arr, seed){
    if (!arr?.length) return null;
    return arr[hashStr(seed) % arr.length];
  }
  function chooseCriterion(cands, seed){
    for (const lv of NLPC_PRIORITY){
      const same = cands.filter(x=>x.level===lv);
      if (!same.length) continue;
      return pickStable(same, seed)?.critCode || same[0].critCode;
    }
    return null;
  }
  function getNlpcCtx(){
    const grade = normalizeGrade(getInputValue(SUBJECT_SEL.khoi));
    const lop = getInputValue(SUBJECT_SEL.lop);
    const hocKy = getInputValue(SUBJECT_SEL.hocKy);
    const thoiDiem = getInputValue(SUBJECT_SEL.thoiDiem);
    const periodKey = inferPeriodKey(hocKy, thoiDiem);
    const groupLabel = (grade===1||grade===2) ? "L12" : "L345";
    return { grade, lop, hocKy, thoiDiem, periodKey, groupLabel };
  }

  async function fillNlpcByBank(settings, ctx, prefixIndex, kind, crit, level, stickyScope){
    if (!crit || !level) return null;
    const preferred = settings.nlpcLevelSymbol || "Đ";
    const levelSym = (level==="Đ") ? preferred : level;

    const prefixPreferred = `${ctx.groupLabel}${crit}${levelSym}`;
    const prefixAlt = (level==="Đ") ? `${ctx.groupLabel}${crit}${(preferred==="Đ"?"D":"Đ")}` : null;

    const groupKey = `${getHostname()}|${ctx.lop}|NLPC|${kind}`;

    let item = await pickRoundRobin(prefixIndex, prefixPreferred, groupKey, stickyScope);
    if (!item && prefixAlt) item = await pickRoundRobin(prefixIndex, prefixAlt, groupKey, stickyScope);
    return item ? { code:item.code, text:item.text } : null;
  }

  async function fillNlpcByAI(ctx, kind, crit, level){
    const payload = {
      taskType:"NLPC_REMARK",
      context:{ page:"nlpc", grade:ctx.grade, className:ctx.lop, periodKey:ctx.periodKey, term:(ctx.thoiDiem||ctx.hocKy), group:kind },
      inputs:{ criterion:crit, level:level },
      constraints:{ noPronouns:true, noGreetings:true, objective:true, encourageMaintain:true }
    };
    return await aiGenerate(payload);
  }

  async function processNlpcRow(row, colMap, settings, bank){
    const tds = $$("td", row);
    if (!tds.length) return;

    const ctx = getNlpcCtx();
    if (!ctx.grade || !ctx.lop) return;

    const studentName = (colMap.nameCol>=0 && tds[colMap.nameCol]) ? (tds[colMap.nameCol].innerText||"").trim() : `row:${row.rowIndex}`;

    const nlcCand=[], nldCand=[], pcCand=[];
    for (const m of HEADER_TO_CRITERIA){
      const ci = colMap.critCol[m.code];
      if (ci==null) continue;
      const lv = normTDC(readCellValue(tds[ci]));
      if (!lv) continue;

      if ((ctx.grade===1||ctx.grade===2) && (m.code==="NLCN"||m.code==="NLTH")) continue;

      const obj = { critCode:m.code, level:lv };
      if (m.group==="NLC") nlcCand.push(obj);
      if (m.group==="NLD") nldCand.push(obj);
      if (m.group==="PC") pcCand.push(obj);
    }

    const seedBase = `${ctx.lop}|${ctx.grade}|${studentName}|${ctx.periodKey}`;
    const pickNLC = chooseCriterion(nlcCand, seedBase+"|NLC");
    const pickNLD = chooseCriterion(nldCand, seedBase+"|NLD");
    const pickPC  = chooseCriterion(pcCand,  seedBase+"|PC");

    const lvOf = (arr, crit) => arr.find(x=>x.critCode===crit)?.level || "";
    const rc = colMap.remarkCols;

    async function fillPair(codeCol, textCol, kind, crit, lv){
      const codeEl = tds[codeCol]?.querySelector("input,textarea");
      const textEl = tds[textCol]?.querySelector("textarea,input");
      if (!textEl) return;

      bindManualProtect(textEl,"remark");
      if (codeEl) bindManualProtect(codeEl,"remark");
      if (!canOverwrite(textEl)) return;

      let got=null;
      if (settings.mode==="AI"){
        const text = await fillNlpcByAI(ctx, kind, crit, lv);
        got = text ? { code:"", text } : null;
      } else {
        got = await fillNlpcByBank(settings, ctx, bank.prefixIndex, kind, crit, lv, ensureRowId(row));
      }

      if (got?.text){
        setNativeValue(textEl, got.text);
        textEl.dataset[FLAG.autoRemark]="1";
        chrome.runtime.sendMessage({ type:"BUMP_USAGE", delta: { totalFills: 1, totalAiCalls: settings.mode==="AI"?1:0, totalBankHits: settings.mode==="AI"?0:1 } }).catch(()=>{});
      }
      if (codeEl && got?.code && canOverwrite(codeEl)){
        setNativeValue(codeEl, got.code);
        codeEl.dataset[FLAG.autoRemark]="1";
      }
    }

    await fillPair(rc.nlc_code, rc.nlc_text, "NLC", pickNLC, lvOf(nlcCand, pickNLC));
    await fillPair(rc.nld_code, rc.nld_text, "NLD", pickNLD, lvOf(nldCand, pickNLD));
    await fillPair(rc.pc_code,  rc.pc_text,  "PC",  pickPC,  lvOf(pcCand,  pickPC));
  }

  function bindNlpc(settings){
    // Ưu tiên cơ chế theo ID (RadGrid2) vì ổn định hơn.
    try { if (bindNlpcByIds(settings)) return; } catch(e){}

    const table = findNlpcTable();
    if (!table) return;
    const colMap = buildNlpcColMap(table);
    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    $$("tr", tbody).forEach(row=>{
      if (row.dataset.tt27BoundNlpc==="1") return;
      row.dataset.tt27BoundNlpc="1";

      row.addEventListener("change", async (e)=>{
        const t=e.target;
        if (!t || !(t.matches("input,select,textarea"))) return;
        try{
          const s = await getSettings();
          const bank = (s.mode==="AI") ? { prefixIndex:{} } : await getBank();
          await processNlpcRow(row, colMap, s, bank);
        }catch{}
      }, true);
    });
  }

  async function run(){
    const first = await getSettings();
    if (!isSiteEnabled(first)) return;

    const mo = new MutationObserver(()=>{
      // Debounce rebinding vì trang này load bằng RadAjax thay đổi DOM liên tục
      scheduleTokenTask("rebinder", async ()=>{
        const s = await getSettings();
        if (!s?.enabled || !isSiteEnabled(s)) return;
        if (!isSiteEnabled(s)) return;

        // Tự kiểm tra element bên trong từng binder (an toàn khi chưa đúng trang)
        if (s.features?.subject) bindSubject(s);
        if (s.features?.nlpc) bindNlpc(s);
      }, 120);
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});

    if (first?.enabled && isSiteEnabled(first)){
      if (first.features?.subject) bindSubject(first);
      if (first.features?.nlpc) bindNlpc(first);
    }
  }

  return { run };
})();

TT27.run();
