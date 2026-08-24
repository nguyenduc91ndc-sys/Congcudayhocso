import type { VercelRequest } from '@vercel/node';
import fs from 'node:fs';
import path from 'node:path';
import Busboy from 'busboy';
import mammoth from 'mammoth';
import { GoogleGenAI, type Part } from '@google/genai';

export type Provider = 'gemini' | 'groq';

export interface AiPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
    referenceAttachment?: boolean;
}

export interface UploadedFile {
    fieldname: string;
    originalname: string;
    mimetype: string;
    buffer: Buffer;
}

export interface MultipartPayload {
    fields: Record<string, string>;
    files: Record<string, UploadedFile[]>;
}

const DATA_DIR = path.join(process.cwd(), 'public', 'xdkhbdcv3439', 'xdkhbdcv3439', 'data');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TEXT_MODEL = 'openai/gpt-oss-120b';
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';

let referencePartsPromise: Promise<AiPart[]> | null = null;

export function normalizeProvider(value: unknown): Provider {
    return String(value || 'gemini').toLowerCase() === 'groq' ? 'groq' : 'gemini';
}

export function getProviderApiKey(fields: Record<string, string>, provider: Provider): string {
    const envKey = provider === 'groq' ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
    return String(fields.apiKey || envKey || '').trim();
}

export function errorMessage(err: unknown, fallback = 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.'): string {
    const message = err instanceof Error ? err.message : String(err || '');
    const lower = message.toLowerCase();

    if (lower.includes('api key not valid') || lower.includes('api_key_invalid') || lower.includes('invalid api key')) {
        return 'API Key không hợp lệ. Vui lòng kiểm tra lại key đã copy đúng chưa.';
    }

    if (lower.includes('permission_denied') || lower.includes('denied access') || lower.includes('unauthorized')) {
        return 'API Key bị từ chối quyền truy cập. Hãy tạo key mới hoặc bật API trong trang quản lý.';
    }

    if (lower.includes('rate limit') || lower.includes('quota')) {
        return 'Đã vượt quá giới hạn sử dụng API. Vui lòng đợi vài phút rồi thử lại.';
    }

    if (lower.includes('fetch') || lower.includes('network') || lower.includes('enotfound')) {
        return 'Không thể kết nối tới máy chủ AI. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.';
    }

    if (lower.includes('too large') || lower.includes('payload')) {
        return 'Dữ liệu gửi lên quá lớn. Hãy giảm số lượng hoặc kích thước ảnh/tài liệu.';
    }

    if (lower.includes('invalid_argument') || lower.includes('invalid argument')) {
        return 'Gemini không đọc được một ảnh hoặc tài liệu trong yêu cầu. Hãy dùng ảnh JPG, PNG, WEBP, HEIC hoặc HEIF rồi thử lại.';
    }

    return message ? `Lỗi: ${message}` : fallback;
}

export async function loadReferenceParts(): Promise<AiPart[]> {
    if (!referencePartsPromise) {
        referencePartsPromise = readReferenceParts();
    }

    return referencePartsPromise;
}

async function readReferenceParts(): Promise<AiPart[]> {
    const parts: AiPart[] = [];

    if (!fs.existsSync(DATA_DIR)) {
        return parts;
    }

    const files = fs.readdirSync(DATA_DIR);
    for (const filename of files) {
        const filePath = path.join(DATA_DIR, filename);
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;

        const ext = path.extname(filename).toLowerCase();
        if (ext === '.pdf') {
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
                    mimeType: 'application/pdf',
                    data: fileBuffer.toString('base64'),
                },
                referenceAttachment: true,
            });
        } else if (ext === '.docx') {
            try {
                const result = await mammoth.extractRawText({ path: filePath });
                parts.push({
                    text: `\n--- Tài liệu tham khảo: "${filename}" ---\n${result.value}\n--- Hết tài liệu "${filename}" ---\n`,
                });
            } catch {
                // Ignore unreadable reference files so one bad document does not break the whole API.
            }
        }
    }

    return parts;
}

export function parseMultipart(req: VercelRequest): Promise<MultipartPayload> {
    return new Promise((resolve, reject) => {
        const fields: Record<string, string> = {};
        const files: Record<string, UploadedFile[]> = {};
        const busboy = Busboy({
            headers: req.headers,
            limits: {
                fileSize: 20 * 1024 * 1024,
                files: 12,
            },
        });

        busboy.on('field', (name, value) => {
            fields[name] = value;
        });

        busboy.on('file', (fieldname, file, info) => {
            const chunks: Buffer[] = [];
            file.on('data', (chunk: Buffer) => chunks.push(chunk));
            file.on('limit', () => reject(new Error('File tải lên vượt quá giới hạn 20MB.')));
            file.on('end', () => {
                const uploaded: UploadedFile = {
                    fieldname,
                    originalname: info.filename,
                    mimetype: info.mimeType,
                    buffer: Buffer.concat(chunks),
                };
                if (!files[fieldname]) files[fieldname] = [];
                files[fieldname].push(uploaded);
            });
        });

        busboy.on('error', reject);
        busboy.on('finish', () => resolve({ fields, files }));
        req.pipe(busboy);
    });
}

export async function fileToImagePart(file: UploadedFile, provider: Provider): Promise<AiPart> {
    const mimeType = normalizeImageMimeType(file);
    return {
        inlineData: {
            mimeType,
            data: file.buffer.toString('base64'),
        },
    };
}

function normalizeImageMimeType(file: UploadedFile): string {
    const aliases: Record<string, string> = {
        'image/jpg': 'image/jpeg',
        'image/pjpeg': 'image/jpeg',
        'image/x-png': 'image/png',
    };
    const supplied = aliases[file.mimetype?.toLowerCase()] || file.mimetype?.toLowerCase() || '';
    const supported = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    if (supported.has(supplied)) return supplied;

    const ext = path.extname(file.originalname).toLowerCase();
    const fromExtension: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.heic': 'image/heic',
        '.heif': 'image/heif',
    };
    if (fromExtension[ext]) return fromExtension[ext];

    throw new Error(`Định dạng ảnh "${file.originalname}" không được hỗ trợ. Hãy dùng JPG, PNG, WEBP, HEIC hoặc HEIF.`);
}

function partsToGroqContent(parts: AiPart[]) {
    const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
    const textChunks: string[] = [];
    let skippedFiles = 0;

    const flushText = () => {
        const text = textChunks.join('');
        if (text.trim()) content.push({ type: 'text', text });
        textChunks.length = 0;
    };

    for (const part of parts) {
        if (part.text) {
            textChunks.push(part.text);
            continue;
        }

        if (part.inlineData?.mimeType?.startsWith('image/')) {
            flushText();
            content.push({
                type: 'image_url',
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
            `\n\nLưu ý hệ thống: ${skippedFiles} tài liệu PDF tham khảo không được gửi trực tiếp sang Groq. Hãy bám sát yêu cầu, tên tài liệu tham khảo và nội dung ảnh/tài liệu người dùng cung cấp.\n`
        );
    }

    flushText();
    return content;
}

export async function callGroq(apiKey: string, parts: AiPart[], hasImages = false): Promise<string> {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: hasImages ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
            messages: [{ role: 'user', content: partsToGroqContent(parts) }],
            temperature: 0.35,
            max_completion_tokens: 8192,
        }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error?.message || `Groq API error ${response.status}`);
    }

    return data.choices?.[0]?.message?.content || '';
}

export async function callGemini(apiKey: string, parts: AiPart[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    const generate = async (requestParts: AiPart[]) => {
        const resolvedParts = resolveGeminiParts(requestParts);
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: resolvedParts }],
        });

        return response.text || response.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || '')
            .join('')
            .trim() || '';
    };

    try {
        return await generate(parts);
    } catch (error) {
        const hasReferenceAttachments = parts.some((part) => part.referenceAttachment);
        if (!hasReferenceAttachments || !isGeminiInvalidArgument(error)) throw error;

        console.warn('Gemini rejected reference PDFs; retrying without binary reference attachments.');
        return generate(parts.filter((part) => !part.referenceAttachment));
    }
}

function resolveGeminiParts(parts: AiPart[]): Part[] {
    const resolved: Part[] = [];

    for (const part of parts) {
        if (part.text) {
            resolved.push({ text: part.text });
        } else if (part.inlineData) {
            resolved.push({ inlineData: part.inlineData });
        }
    }

    return resolved;
}

function isGeminiInvalidArgument(error: unknown): boolean {
    const details = error && typeof error === 'object'
        ? error as { status?: number; statusCode?: number; message?: string }
        : {};
    const message = String(details.message || error || '').toLowerCase();
    return details.status === 400
        || details.statusCode === 400
        || message.includes('invalid_argument')
        || message.includes('invalid argument');
}

export function baseLessonPrompt(subject: string, grade: string, userNote = ''): string {
    const context = [
        subject ? `Môn học: ${subject}` : '',
        grade ? `Lớp: ${grade}` : '',
        userNote ? `Ghi chú của giáo viên: ${userNote}` : '',
    ].filter(Boolean).join('\n');

    return `Bạn là chuyên gia giáo dục tiểu học tại Việt Nam, có kinh nghiệm soạn kế hoạch bài dạy theo Công văn 3439/BGDĐT-GDTH và Công văn 3456/BGDĐT-GDTH.
${context ? `\n${context}\n` : ''}
Nhiệm vụ: dựa vào ảnh bài học, tài liệu tham khảo và thông tin giáo viên cung cấp để soạn một kế hoạch bài dạy hoàn chỉnh.

Yêu cầu bắt buộc:
- Tuân thủ cấu trúc khung kế hoạch bài dạy trong tài liệu tham khảo.
- Nội dung phải sát ảnh bài học, không bịa thêm chi tiết không có căn cứ.
- Có đủ mục tiêu, đồ dùng dạy học, hoạt động dạy học, điều chỉnh sau bài dạy.
- Tích hợp năng lực số và năng lực AI phù hợp với lớp học.
- Trả lời bằng tiếng Việt, định dạng Markdown.
- Không dùng dấu chấm tròn cho danh sách; dùng "-" cho cấp 1 và "+" cho cấp 2.
- Mục "III. HOẠT ĐỘNG DẠY HỌC" trình bày trong một bảng Markdown 2 cột: "Hoạt động của giáo viên" và "Hoạt động của học sinh".
- Mục 4 và 5 chỉ hiển thị mã chỉ báo và nội dung chi tiết liên quan trực tiếp tới mã năng lực.

Phần đầu bài trình bày như sau:
<div align="center">
  <h1>KẾ HOẠCH BÀI DẠY</h1>
  <strong>Môn ${subject || '[Tên môn học]'}</strong><br>
  <strong>[TÊN BÀI HỌC VIẾT HOA]</strong><br>
  <strong>Tiết: [Số tiết nếu có]</strong>
</div>`;
}

export function enhancePrompt(subject: string, grade: string, userNote = ''): string {
    const context = [
        subject ? `Môn học: ${subject}` : '',
        grade ? `Lớp: ${grade}` : '',
        userNote ? `Ghi chú của giáo viên: ${userNote}` : '',
    ].filter(Boolean).join('\n');

    return `Bạn là chuyên gia giáo dục tiểu học tại Việt Nam.
${context ? `\n${context}\n` : ''}
Nhiệm vụ: đọc kế hoạch bài dạy người dùng cung cấp và bổ sung đúng 2 mục:
### 4. Tích hợp phát triển năng lực số:
### 5. Tích hợp phát triển năng lực AI:

Yêu cầu:
- Chỉ xuất ra nội dung mục 4 và mục 5, không viết lại toàn bộ kế hoạch bài dạy.
- Chọn mã năng lực số và năng lực AI phù hợp từ tài liệu tham khảo.
- Nội dung phải sát bài học trong file người dùng gửi.
- Trả lời bằng Markdown, dùng "-" cho cấp 1 và "+" cho cấp 2.
- Không thêm các mục ngoài mẫu trên.`;
}
