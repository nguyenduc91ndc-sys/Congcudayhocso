import type { VercelRequest, VercelResponse } from '@vercel/node';
import mammoth from 'mammoth';
import path from 'node:path';
import {
    callGemini,
    callGroq,
    enhancePrompt,
    errorMessage,
    getProviderApiKey,
    loadReferenceParts,
    normalizeProvider,
    parseMultipart,
    type AiPart,
} from './_giao-an';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fields, files } = await parseMultipart(req);
        const provider = normalizeProvider(fields.provider);
        const apiKey = getProviderApiKey(fields, provider);
        if (!apiKey) {
            return res.status(400).json({
                error: provider === 'groq'
                    ? 'Vui lòng nhập API Key của Groq trên giao diện hoặc cấu hình GROQ_API_KEY.'
                    : 'Vui lòng nhập API Key của Gemini trên giao diện hoặc cấu hình GEMINI_API_KEY.',
            });
        }

        const lessonDoc = (files.lessonDoc || [])[0];
        if (!lessonDoc) {
            return res.status(400).json({ error: 'Vui lòng tải lên 1 file kế hoạch bài dạy (.docx hoặc .pdf).' });
        }

        const subject = fields.subject || '';
        const grade = fields.grade || '';
        const userNote = fields.userNote || '';
        const parts: AiPart[] = [
            { text: enhancePrompt(subject, grade, userNote) },
            { text: '\n\n===== CÁC TÀI LIỆU THAM KHẢO =====\n' },
            ...(await loadReferenceParts()),
            { text: '\n\n===== KẾ HOẠCH BÀI DẠY CỦA NGƯỜI DÙNG =====\n' },
        ];

        const ext = path.extname(lessonDoc.originalname).toLowerCase();
        if (ext === '.pdf' || lessonDoc.mimetype === 'application/pdf') {
            if (provider === 'groq') {
                return res.status(400).json({
                    error: 'Groq chưa hỗ trợ đọc trực tiếp file PDF ở chế độ bổ sung. Vui lòng dùng Gemini hoặc tải file .docx.',
                });
            }

            parts.push({
                inlineData: {
                    mimeType: 'application/pdf',
                    data: lessonDoc.buffer.toString('base64'),
                },
            });
        } else if (ext === '.docx' || lessonDoc.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: lessonDoc.buffer });
            parts.push({ text: `\nNội dung file Word:\n${result.value}\n` });
        } else {
            return res.status(400).json({ error: 'Định dạng file không được hỗ trợ. Vui lòng dùng .docx hoặc .pdf.' });
        }

        parts.push({ text: '\n\nBây giờ hãy viết mục 4 và mục 5 dưới định dạng Markdown.' });

        const result = provider === 'groq'
            ? await callGroq(apiKey, parts, false)
            : await callGemini(apiKey, parts);

        return res.json({ result: result || 'Không nhận được phản hồi từ AI.' });
    } catch (err) {
        return res.status(500).json({ error: errorMessage(err) });
    }
}
