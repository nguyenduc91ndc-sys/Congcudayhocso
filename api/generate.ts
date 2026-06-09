import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
    baseLessonPrompt,
    callGemini,
    callGroq,
    errorMessage,
    fileToImagePart,
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

        const lessonFiles = files.lessonImage || [];
        const supportFiles = files.supportImage || [];
        if (lessonFiles.length === 0) {
            return res.status(400).json({ error: 'Vui lòng tải lên ít nhất 1 ảnh bài học.' });
        }

        const subject = fields.subject || '';
        const grade = fields.grade || '';
        const userNote = fields.userNote || '';
        const parts: AiPart[] = [
            { text: baseLessonPrompt(subject, grade, userNote) },
            { text: '\n\n===== CÁC TÀI LIỆU THAM KHẢO =====\n' },
            ...(await loadReferenceParts()),
            { text: '\n\n===== ẢNH BÀI HỌC =====\n' },
        ];

        for (let i = 0; i < lessonFiles.length; i++) {
            parts.push({ text: `\n--- Ảnh bài học ${i + 1}/${lessonFiles.length} ---\n` });
            parts.push(await fileToImagePart(lessonFiles[i], provider));
        }

        if (supportFiles.length > 0) {
            parts.push({ text: '\n\n===== ẢNH THÔNG TIN BỔ TRỢ =====\n' });
            for (let i = 0; i < supportFiles.length; i++) {
                parts.push({ text: `\n--- Ảnh bổ trợ ${i + 1}/${supportFiles.length} ---\n` });
                parts.push(await fileToImagePart(supportFiles[i], provider));
            }
        }

        parts.push({
            text: '\n\nBây giờ hãy soạn kế hoạch bài dạy hoàn chỉnh theo yêu cầu. Chỉ trả về nội dung Markdown.',
        });

        const result = provider === 'groq'
            ? await callGroq(apiKey, parts, true)
            : await callGemini(apiKey, parts);

        return res.json({ result: result || 'Không nhận được phản hồi từ AI.' });
    } catch (err) {
        return res.status(500).json({ error: errorMessage(err) });
    }
}
