// Gemini AI Service with API Key Rotation & Retry Logic

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// API Keys Pool - Tự động xoay vòng khi một key bị rate limit
const API_KEYS = [
    'AIzaSyD6tCQ_VM-w4M0RHNBEAke-IG5i7f1GwaU',
    'AIzaSyCcNrrXpdoV6dRsLku7vKmTRKvKiAcRYLQ',
    'AIzaSyD35xksTdhie1R3tvnZqI8PwCCQwyoDh_g',
    'AIzaSyDDPHSwtVXFk5O8CCH6_udueYf3afeRh_4',
    'AIzaSyBdvshMMPkoPoDCDHkQKhczHlCmL_r1d0k',
    'AIzaSyAwEmQaBc5k41JCT5eUQJZeJZv4fjSLPCQ',
    'AIzaSyALrYtTkNbTN28-Av3pRTTmquoK9__FDLE',
    'AIzaSyDXiP3aBcsXw48zKpTi_Qln1xpHJI9Ti1M',
    // Thêm các key khác vào đây
];

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Track current key index and failed keys
let currentKeyIndex = 0;
const failedKeys = new Set<string>();
const keyLastFailTime = new Map<string, number>();

// Reset failed keys after 1 minute (they might recover)
const KEY_RECOVERY_TIME = 60 * 1000; // 1 minute

const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của ứng dụng "Giáo viên yêu công nghệ". 
Bạn giúp giáo viên và học sinh với các câu hỏi về:
- Giáo dục và phương pháp giảng dạy
- Công nghệ trong dạy học
- Các môn học và bài tập
- Sử dụng các công cụ trong ứng dụng

Hãy trả lời ngắn gọn, thân thiện và dễ hiểu. Sử dụng emoji khi phù hợp.`;

// Delay helper function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get next available API key
function getNextApiKey(): string | null {
    const now = Date.now();

    // First, check if any failed keys can be recovered
    for (const key of failedKeys) {
        const failTime = keyLastFailTime.get(key);
        if (failTime && now - failTime > KEY_RECOVERY_TIME) {
            failedKeys.delete(key);
            keyLastFailTime.delete(key);
            console.log('🔄 Recovered API key:', key.substring(0, 10) + '...');
        }
    }

    // Try to find a working key
    const startIndex = currentKeyIndex;
    do {
        const key = API_KEYS[currentKeyIndex];
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;

        if (!failedKeys.has(key)) {
            return key;
        }
    } while (currentKeyIndex !== startIndex);

    // All keys failed, try the first one anyway (might have recovered)
    return API_KEYS[0];
}

// Mark a key as failed
function markKeyAsFailed(key: string): void {
    failedKeys.add(key);
    keyLastFailTime.set(key, Date.now());
    console.log('❌ API key marked as failed:', key.substring(0, 10) + '...');
    console.log(`📊 Active keys: ${API_KEYS.length - failedKeys.size}/${API_KEYS.length}`);
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 2000; // 2 seconds

async function fetchWithKeyRotation(
    message: string,
    contents: object[],
    retries: number = MAX_RETRIES
): Promise<Response> {
    const apiKey = getNextApiKey();

    if (!apiKey) {
        throw new Error('Tất cả API keys đã hết quota. Vui lòng thử lại sau.');
    }

    console.log('🔑 Using API key:', apiKey.substring(0, 10) + '...');

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
                maxOutputTokens: 1024,
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
        console.log(`⏳ Rate limited. Trying next key... (${retries} retries left)`);
        await delay(INITIAL_DELAY);
        return fetchWithKeyRotation(message, contents, retries - 1);
    }

    // Handle other errors that suggest key is bad
    if ((response.status === 403 || response.status === 401) && retries > 0) {
        markKeyAsFailed(apiKey);
        console.log(`🚫 Key rejected. Trying next key... (${retries} retries left)`);
        return fetchWithKeyRotation(message, contents, retries - 1);
    }

    return response;
}

export async function sendMessageToGemini(
    message: string,
    history: ChatMessage[] = []
): Promise<string> {
    if (API_KEYS.length === 0) {
        throw new Error('Chưa có API key nào được cấu hình');
    }

    // Build conversation history
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

    try {
        const response = await fetchWithKeyRotation(message, contents);

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error?.message || '';

            // Handle specific error cases
            if (response.status === 429) {
                throw new Error('Tất cả API keys đã hết quota. Vui lòng thử lại sau 1-2 phút.');
            } else if (response.status === 400 && errorMessage.includes('API key')) {
                throw new Error('API key không hợp lệ. Vui lòng kiểm tra lại cấu hình.');
            } else if (response.status === 403) {
                throw new Error('API key bị từ chối. Vui lòng kiểm tra quyền truy cập.');
            } else {
                throw new Error(errorMessage || 'Lỗi kết nối với Gemini API');
            }
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('Không nhận được phản hồi từ AI');
        }

        return textResponse;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}

// Utility function to get API status
export function getApiStatus(): { total: number; active: number; failed: number } {
    return {
        total: API_KEYS.length,
        active: API_KEYS.length - failedKeys.size,
        failed: failedKeys.size
    };
}
