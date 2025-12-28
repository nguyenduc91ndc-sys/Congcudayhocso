// Gemini AI Service - Gọi qua Vercel API Route (AN TOÀN - không lộ API key)

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// API endpoint - gọi đến server của bạn, KHÔNG gọi trực tiếp Gemini
const API_ENDPOINT = '/api/chat';

export async function sendMessageToGemini(
    message: string,
    history: ChatMessage[] = []
): Promise<string> {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                history
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Lỗi kết nối với AI');
        }

        const data = await response.json();
        return data.response;

    } catch (error) {
        console.error('Chat API Error:', error);
        throw error;
    }
}

// Utility function to get API status (not available in secure mode)
export function getApiStatus(): { total: number; active: number; failed: number } {
    return {
        total: 1,
        active: 1,
        failed: 0
    };
}
