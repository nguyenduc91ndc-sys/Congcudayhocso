import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGemini, callGroq, errorMessage, normalizeProvider } from './_giao-an.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    try {
        const provider = normalizeProvider(req.body?.provider);
        const apiKey = String(req.body?.apiKey || '').trim();
        if (!apiKey) {
            return res.status(400).json({ ok: false, error: 'Chưa nhập API Key.' });
        }

        const parts = [{ text: 'Trả lời đúng 1 từ: Xin chào' }];
        const reply = provider === 'groq'
            ? await callGroq(apiKey, parts, false)
            : await callGemini(apiKey, parts);

        return res.json({
            ok: true,
            message: 'API Key hợp lệ! Kết nối thành công.',
            reply: reply.trim(),
        });
    } catch (err) {
        return res.status(400).json({ ok: false, error: errorMessage(err, 'API Key không hoạt động.') });
    }
}
