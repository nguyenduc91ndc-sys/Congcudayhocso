// Vercel Serverless Function - Bảo vệ API Keys
// API keys được lưu trong Vercel Environment Variables, KHÔNG lộ ra frontend

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface RequestBody {
    message: string;
    history?: ChatMessage[];
}

// Lấy API keys từ Environment Variables (AN TOÀN - không lộ ra frontend)
function getApiKeys(): string[] {
    const keysString = process.env.GEMINI_API_KEYS || '';
    return keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
}

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của ứng dụng "Giáo viên yêu công nghệ". 
Bạn giúp giáo viên và học sinh với các câu hỏi về:
- Giáo dục và phương pháp giảng dạy
- Công nghệ trong dạy học
- Các môn học và bài tập
- Sử dụng các công cụ trong ứng dụng

Hãy trả lời ngắn gọn, thân thiện và dễ hiểu. Sử dụng emoji khi phù hợp.`;

// Track failed keys
let currentKeyIndex = 0;
const failedKeys = new Set<string>();
const keyLastFailTime = new Map<string, number>();
const KEY_RECOVERY_TIME = 60 * 1000; // 1 minute

function getNextApiKey(apiKeys: string[]): string | null {
    const now = Date.now();

    // Recover failed keys after timeout
    for (const key of failedKeys) {
        const failTime = keyLastFailTime.get(key);
        if (failTime && now - failTime > KEY_RECOVERY_TIME) {
            failedKeys.delete(key);
            keyLastFailTime.delete(key);
        }
    }

    // Find a working key
    const startIndex = currentKeyIndex;
    do {
        const key = apiKeys[currentKeyIndex % apiKeys.length];
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;

        if (!failedKeys.has(key)) {
            return key;
        }
    } while (currentKeyIndex !== startIndex);

    // All keys failed, try the first one
    return apiKeys[0] || null;
}

function markKeyAsFailed(key: string): void {
    failedKeys.add(key);
    keyLastFailTime.set(key, Date.now());
}

async function callGeminiAPI(
    apiKeys: string[],
    contents: object[],
    retries: number = 3
): Promise<Response> {
    const apiKey = getNextApiKey(apiKeys);

    if (!apiKey) {
        throw new Error('Không có API key nào được cấu hình');
    }

    const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ]
        }),
    });

    // Handle rate limit - try next key
    if (response.status === 429 && retries > 0) {
        markKeyAsFailed(apiKey);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return callGeminiAPI(apiKeys, contents, retries - 1);
    }

    // Handle auth errors
    if ((response.status === 403 || response.status === 401) && retries > 0) {
        markKeyAsFailed(apiKey);
        return callGeminiAPI(apiKeys, contents, retries - 1);
    }

    return response;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
        return res.status(500).json({ error: 'API keys chưa được cấu hình trên server' });
    }

    try {
        const { message, history = [] } = req.body as RequestBody;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Tin nhắn không hợp lệ' });
        }

        // Build conversation
        const contents = [
            {
                role: 'user',
                parts: [{ text: SYSTEM_PROMPT }]
            },
            {
                role: 'model',
                parts: [{ text: 'Xin chào! Tôi là trợ lý AI của "Giáo viên yêu công nghệ". Tôi sẵn sàng hỗ trợ bạn! 😊' }]
            },
            ...history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })),
            {
                role: 'user',
                parts: [{ text: message }]
            }
        ];

        const response = await callGeminiAPI(apiKeys, contents);

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error?.message || 'Lỗi kết nối với Gemini API';

            if (response.status === 429) {
                return res.status(429).json({ error: 'Hệ thống đang bận. Vui lòng thử lại sau.' });
            }

            return res.status(response.status).json({ error: errorMessage });
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            return res.status(500).json({ error: 'Không nhận được phản hồi từ AI' });
        }

        return res.status(200).json({ response: textResponse });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Lỗi không xác định'
        });
    }
}
