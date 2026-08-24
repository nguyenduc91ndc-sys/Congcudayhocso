require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mammoth = require("mammoth");
const { GoogleGenAI } = require("@google/genai");
const sharp = require("sharp");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";
const GROQ_VISION_MODEL = "qwen/qwen3.6-27b";

// --- Multer config: store uploads in memory ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// --- Data directory with reference documents ---
const DATA_DIR = path.join(__dirname, "data");

/**
 * Read all reference files from the data directory.
 * - PDF: sent as inline binary (Gemini supports PDF natively)
 * - DOCX: extracted to text via mammoth (Gemini does NOT support DOCX inline)
 */
async function loadReferenceFiles() {
  const parts = [];
  const files = fs.readdirSync(DATA_DIR);

  for (const filename of files) {
    const filePath = path.join(DATA_DIR, filename);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const ext = path.extname(filename).toLowerCase();

    if (ext === ".pdf") {
      // PDF: send as inline binary data
      const fileBuffer = fs.readFileSync(filePath);
      parts.push({ text: `\n--- Tài liệu tham khảo: "${filename}" ---\n` });
      if (fileBuffer.length > GEMINI_MAX_REFERENCE_BYTES) {
        parts.push({
          text: `[Tài liệu "${filename}" có dung lượng lớn nên không đính kèm; hãy áp dụng các yêu cầu tương ứng đã nêu trong chỉ dẫn.]\n`,
        });
        continue;
      }
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: fileBuffer.toString("base64"),
        },
        referenceAttachment: true,
      });
    } else if (ext === ".docx") {
      // DOCX: extract text content
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        const textContent = result.value;
        parts.push({
          text: `\n--- Tài liệu tham khảo: "${filename}" ---\n${textContent}\n--- Hết tài liệu "${filename}" ---\n`,
        });
      } catch (e) {
        console.warn(`⚠️ Không thể đọc file ${filename}:`, e.message);
      }
    }
  }

  return parts;
}

let referenceParts = [];

function normalizeProvider(value) {
  return String(value || "gemini").toLowerCase() === "groq" ? "groq" : "gemini";
}

function getProviderApiKey(req, provider) {
  const envKey = provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
  return (req.body.apiKey || envKey || "").trim();
}

function partsToGroqContent(parts) {
  const content = [];
  const textChunks = [];
  let skippedFiles = 0;

  const flushText = () => {
    const text = textChunks.join("");
    if (text.trim()) content.push({ type: "text", text });
    textChunks.length = 0;
  };

  for (const part of parts) {
    if (part.text) {
      textChunks.push(part.text);
      continue;
    }

    if (part.inlineData?.mimeType?.startsWith("image/")) {
      flushText();
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        },
      });
      continue;
    }

    if (part.inlineData) skippedFiles++;
  }

  if (skippedFiles > 0) {
    textChunks.push(
      `\n\nLưu ý hệ thống: ${skippedFiles} tài liệu PDF tham khảo không được gửi trực tiếp sang Groq. Hãy bám sát các yêu cầu, tên tài liệu tham khảo và nội dung ảnh/tài liệu người dùng cung cấp.\n`
    );
  }

  flushText();
  return content;
}

async function callGroq(apiKey, parts, hasImages = false) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: hasImages ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
      messages: [{ role: "user", content: partsToGroqContent(parts) }],
      temperature: 0.35,
      max_completion_tokens: 8192,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Groq API error ${response.status}`);
  }

  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(apiKey, parts) {
  const ai = new GoogleGenAI({ apiKey });
  const generate = async (requestParts) => {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: resolveGeminiParts(requestParts) }],
    });

    return response.text || response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";
  };

  try {
    return await generate(parts);
  } catch (error) {
    const hasReferenceAttachments = parts.some((part) => part.referenceAttachment);
    if (!hasReferenceAttachments || !isGeminiInvalidArgument(error)) throw error;

    console.warn("Gemini rejected reference PDFs; retrying without binary reference attachments.");
    return generate(parts.filter((part) => !part.referenceAttachment));
  }
}

function resolveGeminiParts(parts) {
  const resolved = [];
  for (const part of parts) {
    if (part.text) resolved.push({ text: part.text });
    else if (part.inlineData) resolved.push({ inlineData: part.inlineData });
  }
  return resolved;
}

function isGeminiInvalidArgument(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return error?.status === 400
    || error?.statusCode === 400
    || message.includes("invalid_argument")
    || message.includes("invalid argument");
}

// --- API: Test API Key ---
app.post("/api/test-key", express.json(), async (req, res) => {
  try {
    const provider = normalizeProvider(req.body.provider);
    const apiKey = (req.body.apiKey || "").trim();
    if (!apiKey) {
      return res.status(400).json({ ok: false, error: "Chưa nhập API Key." });
    }

    console.log(`🔑 Đang kiểm tra API Key ${provider}...`);
    let reply = "";

    if (provider === "groq") {
      reply = await callGroq(apiKey, [{ text: "Trả lời đúng 1 từ: Xin chào" }], false);
    } else {
      reply = await callGemini(apiKey, [{ text: "Reply with exactly one Vietnamese greeting word." }]);
    }

    console.log("✅ API Key hợp lệ! Phản hồi:", reply.trim());

    res.json({ ok: true, message: "API Key hợp lệ! Kết nối thành công.", reply: reply.trim() });
  } catch (err) {
    console.error("❌ Test key lỗi:", err.message);
    let msg = "API Key không hoạt động.";
    const errMsg = (err.message || "").toLowerCase();
    if (errMsg.includes("api key not valid") || errMsg.includes("api_key_invalid")) {
      msg = "API Key không hợp lệ. Hãy kiểm tra lại key đã copy đúng chưa.";
    } else if (errMsg.includes("permission_denied") || errMsg.includes("denied access")) {
      msg = "API Key bị từ chối. Hãy tạo key mới tại aistudio.google.com/apikey";
    } else {
      msg = "Lỗi: " + err.message;
    }
    res.status(400).json({ ok: false, error: msg });
  }
});

// --- API: Generate lesson plan ---
app.post(
  "/api/generate",
  upload.fields([
    { name: "lessonImage", maxCount: 5 },
    { name: "supportImage", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const provider = normalizeProvider(req.body.provider);
      const apiKey = getProviderApiKey(req, provider);
      if (!apiKey) {
        return res.status(400).json({
          error:
            provider === "groq"
              ? "Vui lòng nhập API Key của Groq trên giao diện hoặc cấu hình GROQ_API_KEY trong file .env"
              : "Vui lòng nhập API Key của Gemini trên giao diện hoặc cấu hình trong file .env",
        });
      }

      // Get optional fields
      const userNote = req.body.userNote || "";
      const subject = req.body.subject || "";
      const grade = req.body.grade || "";

      // Build the prompt parts
      const parts = [];

      // 1. System instruction / main prompt
      let contextInfo = "";
      if (subject) contextInfo += `\nMÔN HỌC: ${subject}`;
      if (grade) contextInfo += `\nLỚP: ${grade}`;
      if (subject || grade) contextInfo += "\n";

      parts.push({
        text: `Bạn là một chuyên gia giáo dục tiểu học tại Việt Nam, có nhiều năm kinh nghiệm soạn kế hoạch bài dạy theo Công văn 3439/BGDĐT-GDTH và Công văn 3456/BGDĐT-GDTH.
${contextInfo}
NHIỆM VỤ: Dựa vào ảnh bài học và ảnh thông tin bổ trợ mà người dùng cung cấp, hãy soạn một kế hoạch bài dạy hoàn chỉnh theo đúng mẫu "KHUNG KẾ HOẠCH BÀI DẠY" có trong tài liệu tham khảo.
${grade ? `LƯU Ý ĐẶC BIỆT: Đây là bài dạy cho HỌC SINH LỚP ${grade}. Hãy ưu tiên tham khảo file "KHUNG NĂNG LỰC AI DÀNH CHO HỌC SINH LỚP ${grade}.docx" để xác định các năng lực AI phù hợp.` : ""}
${subject ? `MÔN HỌC CỤ THỂ: ${subject}. Hãy đảm bảo các yêu cầu cần đạt, phương pháp dạy học, và hoạt động đều phù hợp với đặc thù của môn ${subject}.` : ""}

YÊU CẦU BẮT BUỘC:
1. Kế hoạch bài dạy PHẢI tuân thủ 100% cấu trúc của file "KHUNG KẾ HOẠCH BÀI DẠY.docx" trong tài liệu tham khảo.
2. Phải tham khảo file "hướng dẫn xây dựng kế hoạch bài dạy.docx" để hiểu cách viết từng phần.
3. Các năng lực và phẩm chất phải đúng theo "Bảng các thành phần năng lực và biểu hiện cụ thể dành cho học sinh tiểu học theo cv 3439.pdf".
4. Yêu cầu cần đạt phải phù hợp với chương trình theo file "Yêu cầu cần đạt.pdf".
5. Tham khảo "KHUNG NĂNG LỰC AI" phù hợp với lớp của bài học (nếu xác định được).
6. Các hoạt động dạy học phải chi tiết, có thời gian cụ thể, phương pháp rõ ràng.
7. Nội dung phải dựa chính xác vào hình ảnh bài học được cung cấp - KHÔNG bịa thêm nội dung không có trong ảnh.
8. Phải có đầy đủ: Mục tiêu, Đồ dùng dạy học, Các hoạt động dạy học (Khởi động, Hình thành kiến thức mới, Luyện tập/Thực hành, Vận dụng), Điều chỉnh sau bài dạy.

ĐỊNH DẠNG ĐẦU RA VÀ TRÌNH BÀY (RẤT QUAN TRỌNG):
- Sử dụng Markdown. KHÔNG dùng dấu chấm tròn (*) cho các danh sách. Thay vào đó, hãy phân cấp bằng dấu gạch ngang (-) cho cấp 1, và dấu cộng (+) cho cấp 2. TUYỆT ĐỐI KHÔNG SỬ DỤNG thẻ <br> trong bảng.
- Đối với Mục 1 (Năng lực đặc thù): Tuyệt đối KHÔNG hiển thị các mã chỉ báo, KHÔNG hiển thị các tên năng lực in nghiêng, và TUYỆT ĐỐI KHÔNG hiển thị dòng tiêu đề "PHÁT TRIỂN NĂNG LỰC:". Hãy liệt kê trực tiếp các biểu hiện nội dung chi tiết ngay dưới tiêu đề "1. Năng lực đặc thù" theo từng gạch đầu dòng. Chú ý nội dung không được trùng lặp.
  Ví dụ:
  1. Năng lực đặc thù
  - Hình thành được biểu tượng về phép nhân...
  - Vận dụng được phép nhân...
- Đối với Mục 2, 3 (Năng lực chung, Phẩm chất), tên của từng năng lực/phẩm chất BẮT BUỘC phải được IN NGHIÊNG giống hệt định dạng của năng lực số. Ví dụ:
  - *Năng lực tự chủ và tự học*: Tự giác, tích cực...
  - *Chăm chỉ*: Tích cực tham gia...
- Tiêu đề bài học phải trình bày chính xác như sau (bắt buộc dùng HTML để căn giữa):
<div align="center">
  <h1>KẾ HOẠCH BÀI DẠY</h1>
  <strong>Môn ${subject || "[Tên môn học]"}</strong><br>
  <strong>[TÊN BÀI HỌC VIẾT HOA]</strong><br>
  <strong>Tiết: [Số tiết nếu có]</strong>
</div>
- Tuyệt đối không ghi các từ "Tên môn:", "Tên bài học:" hay "Tên bài:".
- Ở phần "III. HOẠT ĐỘNG DẠY HỌC": BẮT BUỘC gộp TẤT CẢ các hoạt động vào 1 BẢNG MARKDOWN DUY NHẤT có 2 cột ("Hoạt động của giáo viên" và "Hoạt động của học sinh"). Để tạo các dòng tiêu đề hoặc mục tiêu chung vắt ngang qua 2 cột, hãy viết nội dung vào cột 1 và ĐỂ HOÀN TOÀN TRỐNG cột 2 (không ghi gì cả). 
Ví dụ CHUẨN:
| Hoạt động của giáo viên | Hoạt động của học sinh |
| --- | --- |
| **1. Khởi động:** | |
| - Mục tiêu: | |
| + Tạo không khí vui vẻ... | |
| - Cách tiến hành: | |
| - GV tổ chức trò chơi... | - HS tham gia trò chơi... |
| + Câu 1: Đường kính... | + Trả lời: Đường kính... |
- Ở mục 4 và 5 (Năng lực số và Năng lực AI), hãy tự rà soát từ các tài liệu tham khảo để chọn ra các mã năng lực phù hợp nhất. 
+ Đối với Năng lực số: BẮT BUỘC rà soát mã chỉ báo trong file "NLS được phát triển ở khối 1-2-3.pdf" hoặc "NLS được phát triển ở khối 4-5.pdf" (tương ứng với khối lớp của bài học). Mã chỉ báo có dạng số (vd: 1.1.CB1a).
+ Đối với Năng lực AI: Mã chỉ báo có dạng [Mã] - [Tên thành phần] (vd: NLa - Suy nghĩ kỹ và kiểm tra kết quả).
Tuy nhiên, BẮT BUỘC phải giữ nguyên CỐ ĐỊNH định dạng trình bày y hệt mẫu sau:
### 4. Tích hợp phát triển năng lực số:
- *[Mã chỉ báo số]*: [Nội dung diễn giải chi tiết]
- *[Mã chỉ báo số]*: [Nội dung diễn giải chi tiết]
### 5. Tích hợp phát triển năng lực AI:
- *[Mã AI - Tên thành phần]*: [Nội dung diễn giải chi tiết]
- *[Mã AI - Tên thành phần]*: [Nội dung diễn giải chi tiết]

LƯU Ý QUAN TRỌNG: Mục 4 và 5 CHỈ được hiển thị mã chỉ báo và nội dung chi tiết liên quan trực tiếp tới mã năng lực đó. TUYỆT ĐỐI KHÔNG tự ý thêm các phần như "Thiết bị/phần mềm cần dùng", "Các hoạt động cụ thể tích hợp vào bài học" hay bất kỳ nội dung nào khác ngoài mẫu trên.
`,
      });

      // 2. Add reference documents
      parts.push({
        text: "\n\n===== CÁC TÀI LIỆU THAM KHẢO (để soạn kế hoạch bài dạy) =====\n",
      });
      parts.push(...referenceParts);

      // 3. Add lesson images
      const lessonFiles = req.files["lessonImage"] || [];
      if (lessonFiles.length === 0) {
        return res
          .status(400)
          .json({ error: "Vui lòng tải lên ít nhất 1 ảnh bài học." });
      }

      parts.push({
        text: "\n\n===== ẢNH BÀI HỌC (nội dung chính cần soạn kế hoạch bài dạy) =====\n",
      });
      for (let i = 0; i < lessonFiles.length; i++) {
        parts.push({
          text: `\n--- Ảnh bài học ${i + 1}/${lessonFiles.length} ---\n`,
        });
        const compressedBuffer = await sharp(lessonFiles[i].buffer)
          .resize({ width: provider === "groq" ? 900 : 1200, height: provider === "groq" ? 900 : 1200, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: provider === "groq" ? 70 : 80 })
          .toBuffer();

        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: compressedBuffer.toString("base64"),
          },
        });
      }

      // 4. Add support images (optional)
      const supportFiles = req.files["supportImage"] || [];
      if (supportFiles.length > 0) {
        parts.push({
          text: "\n\n===== ẢNH THÔNG TIN BỔ TRỢ (tài liệu bổ sung) =====\n",
        });
        for (let i = 0; i < supportFiles.length; i++) {
          parts.push({
            text: `\n--- Ảnh bổ trợ ${i + 1}/${supportFiles.length} ---\n`,
          });
          const compressedSupportBuffer = await sharp(supportFiles[i].buffer)
            .resize({ width: provider === "groq" ? 900 : 1200, height: provider === "groq" ? 900 : 1200, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: provider === "groq" ? 70 : 80 })
            .toBuffer();

          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: compressedSupportBuffer.toString("base64"),
            },
          });
        }
      }

      // 5. User note
      if (userNote.trim()) {
        parts.push({
          text: `\n\n===== GHI CHÚ CỦA GIÁO VIÊN =====\n${userNote}\n`,
        });
      }

      // 6. Final instruction
      parts.push({
        text: `\n\nBây giờ hãy soạn kế hoạch bài dạy hoàn chỉnh theo mẫu KHUNG KẾ HOẠCH BÀI DẠY. Trả lời bằng tiếng Việt, xuất ra định dạng Markdown.`,
      });

      console.log(
        `🚀 Đang gửi yêu cầu tới ${provider === "groq" ? "Groq" : "Gemini"} (${lessonFiles.length} ảnh bài học, ${supportFiles.length} ảnh bổ trợ${subject ? `, Môn: ${subject}` : ""}${grade ? `, Lớp: ${grade}` : ""})...`
      );

      if (provider === "groq") {
        const resultText = await callGroq(apiKey, parts, true);
        console.log("✅ Đã nhận phản hồi từ Groq.");
        return res.json({ result: resultText || "Không nhận được phản hồi từ Groq." });
      }

      // Call Gemini
      const resultText = await callGemini(apiKey, parts);

      console.log("✅ Đã nhận phản hồi từ Gemini.");

      res.json({ result: resultText });
    } catch (err) {
      console.error("❌ Lỗi:", err);

      // Parse error for user-friendly messages
      let userMessage = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
      const errMsg = (err.message || "").toLowerCase();
      const errStatus = err.status || err.statusCode || 0;

      if (errMsg.includes("api key not valid") || errMsg.includes("api_key_invalid")) {
        userMessage = "API Key không hợp lệ. Vui lòng kiểm tra lại key của bạn. Hãy truy cập https://aistudio.google.com/apikey để tạo key mới.";
      } else if (errStatus === 403 || errMsg.includes("permission_denied") || errMsg.includes("denied access")) {
        userMessage = "API Key bị từ chối quyền truy cập. Hãy tạo key mới tại https://aistudio.google.com/apikey hoặc bật Generative Language API trong Google Cloud Console.";
      } else if (errStatus === 429 || errMsg.includes("rate limit") || errMsg.includes("quota")) {
        userMessage = "Đã vượt quá giới hạn sử dụng API. Vui lòng đợi vài phút rồi thử lại.";
      } else if (errMsg.includes("fetch") || errMsg.includes("network") || errMsg.includes("enotfound")) {
        userMessage = "Không thể kết nối tới Google Gemini. Vui lòng kiểm tra kết nối mạng.";
      } else if (errMsg.includes("too large") || errMsg.includes("payload")) {
        userMessage = "Dữ liệu gửi lên quá lớn. Hãy thử giảm số lượng hoặc kích thước ảnh.";
      } else if (errStatus === 400 || errMsg.includes("invalid_argument") || errMsg.includes("invalid argument")) {
        userMessage = "Gemini không đọc được một ảnh hoặc tài liệu trong yêu cầu. Hãy dùng ảnh JPG, PNG, WEBP, HEIC hoặc HEIF rồi thử lại.";
      } else {
        userMessage = `Lỗi: ${err.message || "Unknown error"}`;
      }

      res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
        error: userMessage,
      });
    }
  }
);

// --- API: Enhance lesson plan (Section 4 & 5) ---
app.post(
  "/api/enhance",
  upload.single("lessonDoc"),
  async (req, res) => {
    try {
      const provider = normalizeProvider(req.body.provider);
      const apiKey = getProviderApiKey(req, provider);
      if (!apiKey) {
        return res.status(400).json({
          error:
            provider === "groq"
              ? "Vui lòng nhập API Key của Groq trên giao diện hoặc cấu hình GROQ_API_KEY trong file .env"
              : "Vui lòng nhập API Key của Gemini trên giao diện hoặc cấu hình trong file .env",
        });
      }

      const userNote = req.body.userNote || "";
      const subject = req.body.subject || "";
      const grade = req.body.grade || "";
      const lessonDoc = req.file;

      if (!lessonDoc) {
        return res.status(400).json({ error: "Vui lòng tải lên 1 file kế hoạch bài dạy (.docx hoặc .pdf)." });
      }

      const parts = [];

      let contextInfo = "";
      if (subject) contextInfo += `\nMÔN HỌC: ${subject}`;
      if (grade) contextInfo += `\nLỚP: ${grade}`;
      if (subject || grade) contextInfo += "\n";

      parts.push({
        text: `Bạn là một chuyên gia giáo dục tiểu học tại Việt Nam, có nhiều năm kinh nghiệm soạn kế hoạch bài dạy theo Công văn 3439/BGDĐT-GDTH và Công văn 3456/BGDĐT-GDTH.
${contextInfo}
NHIỆM VỤ: Dưới đây là nội dung một kế hoạch bài dạy mà người dùng cung cấp. Kế hoạch bài dạy này đang thiếu 2 mục:
"4. Tích hợp phát triển năng lực số" và "5. Tích hợp hoạt động giáo dục AI".

Hãy đọc kỹ nội dung bài học trong kế hoạch bài dạy và đối chiếu với Khung năng lực số và Khung năng lực AI (có trong tài liệu tham khảo) để viết bổ sung 2 mục này.
${grade ? `LƯU Ý ĐẶC BIỆT: Đây là bài dạy cho HỌC SINH LỚP ${grade}. Hãy tham khảo file "KHUNG NĂNG LỰC AI DÀNH CHO HỌC SINH LỚP ${grade}.docx" để chọn năng lực AI phù hợp.` : ""}
${subject ? `MÔN HỌC CỤ THỂ: ${subject}. Các hoạt động tích hợp phải phù hợp với đặc thù của môn ${subject}.` : ""}

YÊU CẦU BẮT BUỘC:
1. CHỈ xuất ra nội dung của Mục 4 và Mục 5. Không xuất lại toàn bộ kế hoạch bài dạy để tránh làm hỏng định dạng file gốc của người dùng khi họ copy.
2. Mục 4 và Mục 5 chỉ hiển thị đúng mã và nội dung chi tiết liên quan tới mã năng lực thôi. Ngoài ra không tự ý thêm gì khác.
3. Nội dung tích hợp phải thật sát với nội dung bài học trong kế hoạch bài dạy được cung cấp.

ĐỊNH DẠNG ĐẦU RA VÀ TRÌNH BÀY (RẤT QUAN TRỌNG):
- Xuất ra định dạng Markdown. KHÔNG dùng dấu chấm tròn (*) cho các danh sách. Thay vào đó, hãy phân cấp bằng dấu gạch ngang (-) cho cấp 1, và dấu cộng (+) cho cấp 2.
- Hãy tự rà soát từ các tài liệu tham khảo để chọn ra các mã năng lực phù hợp nhất.
+ Đối với Năng lực số: BẮT BUỘC rà soát mã chỉ báo trong file "NLS được phát triển ở khối 1-2-3.pdf" hoặc "NLS được phát triển ở khối 4-5.pdf" (tương ứng với khối lớp của bài học). Mã chỉ báo có dạng số (vd: 1.1.CB1a).
+ Đối với Năng lực AI: Mã chỉ báo có dạng [Mã] - [Tên thành phần] (vd: NLa - Suy nghĩ kỹ và kiểm tra kết quả).
Tuy nhiên, BẮT BUỘC phải giữ nguyên CỐ ĐỊNH định dạng trình bày y hệt mẫu sau:
### 4. Tích hợp phát triển năng lực số:
- *[Mã chỉ báo số]*: [Nội dung diễn giải chi tiết]
- *[Mã chỉ báo số]*: [Nội dung diễn giải chi tiết]
### 5. Tích hợp phát triển năng lực AI:
- *[Mã AI - Tên thành phần]*: [Nội dung diễn giải chi tiết]
- *[Mã AI - Tên thành phần]*: [Nội dung diễn giải chi tiết]

LƯU Ý QUAN TRỌNG: Mục 4 và 5 CHỈ được hiển thị mã chỉ báo và nội dung chi tiết liên quan trực tiếp tới mã năng lực đó. TUYỆT ĐỐI KHÔNG tự ý thêm các phần như "Thiết bị/phần mềm cần dùng" hay "Các hoạt động cụ thể tích hợp vào bài học". Làm đúng theo mẫu, không thêm bất kỳ mục nào khác.
`,
      });

      // Reference docs
      parts.push({ text: "\n\n===== CÁC TÀI LIỆU THAM KHẢO =====\n" });
      parts.push(...referenceParts);

      // User lesson plan
      parts.push({ text: "\n\n===== KẾ HOẠCH BÀI DẠY CỦA NGƯỜI DÙNG (CẦN BỔ SUNG) =====\n" });

      const ext = path.extname(lessonDoc.originalname).toLowerCase();
      if (ext === ".pdf" || lessonDoc.mimetype === "application/pdf") {
        if (provider === "groq") {
          return res.status(400).json({
            error: "Groq chưa hỗ trợ đọc trực tiếp file PDF trong chế độ bổ sung. Vui lòng dùng Gemini hoặc tải file .docx.",
          });
        }
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: lessonDoc.buffer.toString("base64"),
          },
        });
      } else if (ext === ".docx" || lessonDoc.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        try {
          const result = await mammoth.extractRawText({ buffer: lessonDoc.buffer });
          parts.push({ text: `\nNội dung file Word:\n${result.value}\n` });
        } catch (e) {
          return res.status(400).json({ error: "Không thể đọc nội dung file .docx. Đảm bảo file không bị lỗi." });
        }
      } else {
        return res.status(400).json({ error: "Định dạng file không được hỗ trợ. Vui lòng dùng .docx hoặc .pdf" });
      }

      if (userNote.trim()) {
        parts.push({
          text: `\n\n===== GHI CHÚ CỦA GIÁO VIÊN =====\n${userNote}\n`,
        });
      }

      parts.push({
        text: `\n\nBây giờ hãy viết mục 4 và 5 dưới định dạng Markdown.`,
      });

      console.log(`🚀 Đang gửi yêu cầu Enhance tới ${provider === "groq" ? "Groq" : "Gemini"} (${lessonDoc.originalname})...`);

      if (provider === "groq") {
        const resultText = await callGroq(apiKey, parts, false);
        console.log("✅ Đã nhận phản hồi Enhance từ Groq.");
        return res.json({ result: resultText || "Không nhận được phản hồi từ Groq." });
      }

      const resultText = await callGemini(apiKey, parts);
      console.log("✅ Đã nhận phản hồi Enhance từ Gemini.");

      res.json({ result: resultText });
    } catch (err) {
      console.error("❌ Lỗi Enhance:", err);
      let userMessage = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
      const errMsg = (err.message || "").toLowerCase();
      const errStatus = err.status || err.statusCode || 0;

      if (errMsg.includes("api key not valid") || errMsg.includes("api_key_invalid")) {
        userMessage = "API Key không hợp lệ. Vui lòng kiểm tra lại key của bạn. Hãy truy cập https://aistudio.google.com/apikey để tạo key mới.";
      } else if (errStatus === 403 || errMsg.includes("permission_denied") || errMsg.includes("denied access")) {
        userMessage = "API Key bị từ chối quyền truy cập. Hãy tạo key mới tại https://aistudio.google.com/apikey hoặc bật Generative Language API trong Google Cloud Console.";
      } else if (errStatus === 429 || errMsg.includes("rate limit") || errMsg.includes("quota")) {
        userMessage = "Đã vượt quá giới hạn sử dụng API. Vui lòng đợi vài phút rồi thử lại.";
      } else if (errMsg.includes("fetch") || errMsg.includes("network") || errMsg.includes("enotfound")) {
        userMessage = "Không thể kết nối tới Google Gemini. Vui lòng kiểm tra kết nối mạng.";
      } else if (errMsg.includes("too large") || errMsg.includes("payload")) {
        userMessage = "Dữ liệu gửi lên quá lớn. Hãy thử giảm kích thước tài liệu.";
      } else if (errStatus === 400 || errMsg.includes("invalid_argument") || errMsg.includes("invalid argument")) {
        userMessage = "Gemini không đọc được một ảnh hoặc tài liệu trong yêu cầu. Hãy dùng ảnh JPG, PNG, WEBP, HEIC hoặc HEIF rồi thử lại.";
      } else {
        userMessage = `Lỗi: ${err.message || "Unknown error"}`;
      }

      res.status(errStatus >= 400 && errStatus < 600 ? errStatus : 500).json({
        error: userMessage,
      });
    }
  }
);

// --- Start server ---
async function startServer() {
  console.log("📚 Đang tải các tài liệu tham khảo từ thư mục data...");
  referenceParts = await loadReferenceFiles();
  console.log(`✅ Đã tải ${referenceParts.length} tài liệu tham khảo (bao gồm PDF và DOCX).`);

  app.listen(PORT, () => {
    console.log(`🌐 Server đang chạy tại http://localhost:${PORT}`);
  });
}

startServer();
