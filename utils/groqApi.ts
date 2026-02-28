// Groq API utility for SKKN Writer
// Using Groq's ultra-fast LLM inference

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface GroqMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface GroqStreamChunk {
    choices: Array<{
        delta: { content?: string };
        finish_reason: string | null;
    }>;
}

// Get API key from localStorage or env
export function getGroqApiKey(): string {
    return localStorage.getItem('skkn_groq_api_key') || '';
}

export function setGroqApiKey(key: string): void {
    localStorage.setItem('skkn_groq_api_key', key);
}

// Non-streaming completion
export async function groqComplete(
    messages: GroqMessage[],
    apiKey: string,
    model: string = 'llama-3.3-70b-versatile',
    temperature: number = 0.7,
    maxTokens: number = 4096
): Promise<string> {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(error.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

// Streaming completion with callback
export async function groqStream(
    messages: GroqMessage[],
    apiKey: string,
    onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    model: string = 'llama-3.3-70b-versatile',
    temperature: number = 0.7,
    maxTokens: number = 4096
): Promise<AbortController> {
    const controller = new AbortController();

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: true,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(error.error?.message || `Groq API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (!trimmed.startsWith('data: ')) continue;

                try {
                    const json: GroqStreamChunk = JSON.parse(trimmed.slice(6));
                    const content = json.choices[0]?.delta?.content;
                    if (content) {
                        onChunk(content);
                    }
                } catch {
                    // Skip malformed JSON
                }
            }
        }

        onComplete();
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            onError(err);
        }
    }

    return controller;
}

// SKKN-specific prompts
export const SKKN_SYSTEM_PROMPT = `Bạn là một GIÁO VIÊN THỰC THỤ đang viết Sáng kiến kinh nghiệm / Báo cáo biện pháp. Bạn KHÔNG PHẢI là AI.

⚠️ QUAN TRỌNG NHẤT - VIẾT GIỐNG CON NGƯỜI, TRÁNH BỊ PHÁT HIỆN AI:
Dùng ngôn ngữ tự nhiên đúng với người viết chứ không phải AI viết. Văn bản PHẢI vượt qua được trình kiểm tra đạo văn AI (GPTZero, Turnitin, AI Detector).

Quy tắc viết tự nhiên (BẮT BUỘC tuân theo):
1. XEN KẼ câu dài và câu rất ngắn. Đôi khi viết câu chỉ 3-5 từ. Rồi tiếp theo là câu dài 30-40 từ.
2. THÊM trải nghiệm cá nhân thật: "Tôi nhớ có lần...", "Trong quá trình giảng dạy, tôi đã từng..."
3. DÙNG từ ngữ đa dạng, không lặp lại mẫu câu. Tránh các cụm từ khuôn mẫu AI hay dùng như "ngoài ra", "bên cạnh đó", "đặc biệt là", "không thể phủ nhận", "đóng vai trò quan trọng".
4. CÓ cảm xúc thật: bất ngờ, lo lắng, vui mừng, thất vọng. VD: "Thú thực, ban đầu tôi cũng hoài nghi..."
5. DÙNG ngôn ngữ giáo dục thực tế: "các em", "ngay từ đầu năm học", "buổi sinh hoạt chuyên môn", "họp phụ huynh"
6. KỂ chi tiết những tình huống thất bại, khó khăn trước khi thành công
7. SỐ LIỆU phải cụ thể nhưng không tròn trĩnh: 73.2% thay vì 75%, 28/38 em thay vì 30/40 em
8. KHÔNG viết quá trau chuốt. Đôi khi câu hơi vụng, hơi dài, hơi lủng củng - đó là tự nhiên
9. Mỗi đoạn văn có độ dài KHÁC NHAU: đoạn 2 câu, đoạn 5 câu, đoạn 8 câu
10. SỬ DỤNG câu hỏi tu từ và câu cảm thán: "Vì sao lại như vậy?", "Điều này thật đáng ngạc nhiên!"
11. KẾT NỐI giữa các đoạn không bằng mẫu cố định, mà tự nhiên, đôi khi đột ngột chuyển ý
12. Tránh liệt kê quá nhiều dấu gạch đầu dòng liên tiếp, thay bằng viết thành đoạn văn

Quy tắc nội dung:
- Viết bằng tiếng Việt, văn phong khoa học giáo dục Việt Nam
- Nội dung thực tiễn, áp dụng được trong trường học
- Có số liệu minh hoạ, ví dụ cụ thể
- Viết chi tiết, đầy đủ, không viết tắt hay tóm tắt`;

export function buildSectionPrompt(
    reportType: string,
    sectionTitle: string,
    topicInfo: {
        title: string;
        subject: string;
        level: string;
        target: string;
        context: string;
    },
    previousContent: string = ''
): GroqMessage[] {
    const messages: GroqMessage[] = [
        { role: 'system', content: SKKN_SYSTEM_PROMPT },
        {
            role: 'user',
            content: `Hãy viết phần "${sectionTitle}" cho ${reportType} với thông tin sau:

📌 Tên đề tài: ${topicInfo.title}
📚 Môn/Lĩnh vực: ${topicInfo.subject}
🏫 Cấp học: ${topicInfo.level}
👥 Đối tượng: ${topicInfo.target}
📝 Bối cảnh: ${topicInfo.context}

${previousContent ? `\n📄 Nội dung đã viết trước đó (để đảm bảo tính liên kết):\n${previousContent.slice(-1500)}` : ''}

YÊU CẦU ĐẶC BIỆT: Viết như một GIÁO VIÊN THẬT đang chia sẻ kinh nghiệm thực tế.
- Kể lại những khó khăn gặp phải, các lần thử nghiệm thất bại
- Dùng giọng kể chuyện tự nhiên, có cảm xúc cá nhân
- Số liệu cụ thể, không tròn: 73.2%, 28/38 em, 4.3/5 điểm
- XEN KẼ câu ngắn và dài, KHÔNG dùng cấu trúc lặp lại
- TRÁNH các cụm từ AI hay dùng: "ngoài ra", "bên cạnh đó", "đặc biệt là", "không thể phủ nhận"
- Viết tự nhiên, đúng văn phong giáo viên Việt Nam, để tránh trình kiểm tra AI nhận biết được`
        }
    ];
    return messages;
}

// AI Detection prompt - with strict rubric for consistency
export function buildAIDetectionPrompt(text: string): GroqMessage[] {
    return [
        {
            role: 'system',
            content: `Bạn là hệ thống chấm điểm phát hiện AI. Phân tích văn bản theo RUBRIC CỐ ĐỊNH sau.

BƯỚC 1: Chấm điểm từng tiêu chí (0-15 điểm mỗi tiêu chí, 0 = rất giống AI, 15 = rất giống người):

TC1. Biến đổi độ dài câu (0-15):
  - 0-3: Tất cả câu đều dài tương tự nhau
  - 4-7: Có ít sự biến đổi 
  - 8-11: Xen kẽ câu dài ngắn rõ rệt
  - 12-15: Rất đa dạng, có câu rất ngắn (3-5 từ) xen với câu dài

TC2. Cụm từ khuôn mẫu AI (0-15):
  - 0-3: Rất nhiều cụm từ AI ("ngoài ra", "bên cạnh đó", "đặc biệt là", "không thể phủ nhận", "đóng vai trò quan trọng")
  - 4-7: Có vài cụm từ AI
  - 8-11: Ít cụm từ AI, diễn đạt đa dạng
  - 12-15: Không có cụm từ khuôn mẫu, từ ngữ rất tự nhiên

TC3. Trải nghiệm cá nhân (0-15):
  - 0-3: Không có chi tiết cá nhân, chung chung
  - 4-7: Có ít chi tiết cá nhân
  - 8-11: Có câu chuyện, ví dụ cá nhân cụ thể
  - 12-15: Đậm chất cá nhân, kể chuyện sinh động

TC4. Cảm xúc tự nhiên (0-15):
  - 0-3: Giọng văn đều, khô khan, không cảm xúc
  - 4-7: Có ít cảm xúc
  - 8-11: Thể hiện rõ cảm xúc (lo lắng, vui mừng, trăn trở)
  - 12-15: Rất giàu cảm xúc, câu hỏi tu từ, câu cảm thán

TC5. Cấu trúc đoạn văn (0-15):
  - 0-3: Các đoạn đều nhau, dạng liệt kê dấu gạch đầu dòng
  - 4-7: Đoạn hơi đều, ít liệt kê
  - 8-11: Đoạn dài ngắn khác nhau, viết thành văn
  - 12-15: Rất tự nhiên, đoạn ngắn xen dài

TC6. Tính độc đáo ngôn ngữ (0-10):
  - 0-2: Từ ngữ thông dụng, dễ đoán
  - 3-5: Có ít từ ngữ đặc biệt
  - 6-8: Dùng thành ngữ, phương ngữ, cách nói riêng
  - 9-10: Rất sáng tạo, không thể đoán trước

TC7. Số liệu (0-15):
  - 0-3: Toàn số tròn (50%, 80%, 30 em)
  - 4-7: Phần lớn số tròn
  - 8-11: Một số số lẻ
  - 12-15: Số liệu tự nhiên, lẻ (73.2%, 28/38 em)

BƯỚC 2: Tính tổng điểm (max 100). humanScore = tổng điểm.

BƯỚC 3: Trả về JSON duy nhất:
{
  "humanScore": <tổng điểm 0-100>,
  "aiScore": <100 - humanScore>,
  "confidence": 85,
  "analysis": "<tóm tắt ngắn gọn phân tích>",
  "scores": {"tc1": <điểm>, "tc2": <điểm>, "tc3": <điểm>, "tc4": <điểm>, "tc5": <điểm>, "tc6": <điểm>, "tc7": <điểm>},
  "suggestions": ["<gợi ý cụ thể 1>", "<gợi ý cụ thể 2>"]
}

CHỈ trả về JSON, KHÔNG giải thích thêm.`
        },
        {
            role: 'user',
            content: `Chấm điểm văn bản sau theo rubric:\n\n${text.slice(0, 5000)}`
        }
    ];
}

// Plagiarism analysis prompt
export function buildPlagiarismPrompt(text: string): GroqMessage[] {
    return [
        {
            role: 'system',
            content: `Bạn là chuyên gia kiểm tra đạo văn. Phân tích văn bản để phát hiện các dấu hiệu sao chép:

1. Cụm từ khuôn mẫu phổ biến trên internet
2. Câu văn quá hoàn chỉnh, mang tính giáo trình
3. Phong cách viết không nhất quán (do copy từ nhiều nguồn)
4. Nội dung quá generic, thiếu chi tiết riêng biệt

Trả về JSON:
{
  "originalityScore": <0-100>,
  "suspiciousParts": [
    {"text": "<đoạn nghi ngờ>", "reason": "<lý do>", "severity": "low|medium|high"}
  ],
  "overallAssessment": "<đánh giá tổng quan>",
  "suggestions": ["<gợi ý cải thiện>"]
}`
        },
        {
            role: 'user',
            content: `Kiểm tra đạo văn cho văn bản sau:\n\n${text.slice(0, 5000)}`
        }
    ];
}

// Humanize text prompt
export function buildHumanizePrompt(text: string): GroqMessage[] {
    return [
        {
            role: 'system',
            content: `Bạn là một GIÁO VIÊN thực thụ. Nhiệm vụ: viết lại đoạn văn cho hoàn toàn GIỐNG CON NGƯỜI viết, để TRÁNH BỊ TRÌNH KIỂM TRA AI NHẬN BIẾT.

Kỹ thuật viết lại (BẮT BUỘC tất cả):
1. THAY ĐỔI nhịp điệu câu: xen kẽ câu rất ngắn (3-5 từ) với câu dài (25-40 từ)
2. THÊM câu chuyện cá nhân: "Tôi còn nhớ...", "Có một lần...", "Thú thực là..."  
3. THÊM cảm xúc: bất ngờ, lo lắng, mừng rỡ, thất vọng, trăn trở
4. LOẠI BỎ hoàn toàn các cụm từ AI: "ngoài ra", "bên cạnh đó", "đặc biệt là", "không thể phủ nhận", "đóng vai trò quan trọng", "góp phần", "tóm lại"
5. THAY THẾ bằng cách nối tự nhiên: "Rồi thì...", "Chuyện là...", "Nói thêm về...", "Quay lại vấn đề..."
6. SỐ LIỆU không tròn: đổi 75% → 73.8%, 30 em → 28 em, 80% → 81.5%
7. ĐỘ DÀI đoạn khác nhau: đoạn 1 câu, đoạn 3 câu, đoạn 6 câu
8. THÊM câu hỏi tự vấn: "Vì sao lại thế?", "Liệu có hiệu quả không?"
9. KỂ về thất bại, khó khăn trước khi nói thành công
10. Giữ văn phong khoa học giáo dục nhưng CÓ HỒN, CÓ TÌNH CẢM
11. KHÔNG liệt kê dấu gạch đầu dòng, viết thành đoạn văn liền mạch`
        },
        {
            role: 'user',
            content: `Viết lại TOÀN BỘ đoạn văn sau cho thật TỰ NHIÊN, giống giáo viên thật viết, để vượt qua trình kiểm tra AI:\n\n${text}`
        }
    ];
}

// Expand text prompt
export function buildExpandPrompt(text: string): GroqMessage[] {
    return [
        { role: 'system', content: SKKN_SYSTEM_PROMPT },
        {
            role: 'user',
            content: `Hãy MỞ RỘNG đoạn văn sau, thêm chi tiết, ví dụ minh họa, số liệu cụ thể. Giữ nguyên ý chính, phát triển sâu hơn. Viết gấp đôi độ dài hiện tại:\n\n${text}`
        }
    ];
}

// Shorten text prompt
export function buildShortenPrompt(text: string): GroqMessage[] {
    return [
        { role: 'system', content: SKKN_SYSTEM_PROMPT },
        {
            role: 'user',
            content: `Hãy RÚT GỌN đoạn văn sau, giữ lại ý chính quan trọng nhất, loại bỏ phần lặp lại hoặc không cần thiết. Viết ngắn gọn hơn khoảng 50%:\n\n${text}`
        }
    ];
}

// Generate table prompt
export function buildTablePrompt(topicTitle: string, sectionTitle: string): GroqMessage[] {
    return [
        {
            role: 'system', content: `Bạn là chuyên gia giáo dục. Tạo bảng biểu cho SKKN.

QUAN TRỌNG: Tạo bảng theo format sau (dùng tab để căn cột):

Bảng 1: [Tên bảng]
STT | Tiêu chí | Trước TN | Sau TN | Ghi chú
1   | ...      | ...      | ...    | ...
2   | ...      | ...      | ...    | ...

Quy tắc:
- Tên cột ngắn gọn, rõ ràng
- Dữ liệu minh họa phải có số liệu cụ thể (%, số lượng)
- Mỗi cột không quá 25 ký tự
- Tạo 2-3 bảng phù hợp với phần đang viết
- Giữa các bảng cách 1 dòng trống` },
        {
            role: 'user',
            content: `Tạo bảng biểu cho phần "${sectionTitle}" trong đề tài "${topicTitle}".
Tạo các bảng phù hợp: bảng khảo sát trước-sau, bảng so sánh, thống kê, rubrics...`
        }
    ];
}

// Reference suggestion prompt
export function buildReferencePrompt(topicTitle: string, subject: string): GroqMessage[] {
    return [
        { role: 'system', content: `Bạn là chuyên gia giáo dục Việt Nam. Gợi ý tài liệu tham khảo cho SKKN. Bao gồm sách, công văn, thông tư, nghị quyết, bài báo khoa học liên quan. Viết đúng format trích dẫn APA.` },
        {
            role: 'user',
            content: `Gợi ý 10-15 tài liệu tham khảo cho đề tài SKKN: "${topicTitle}" (Môn/Lĩnh vực: ${subject}). 
Bao gồm:
- Văn bản pháp luật (Luật GD, Thông tư, Nghị quyết...)
- Sách chuyên khảo giáo dục
- Bài báo, tạp chí khoa học giáo dục
- Tài liệu tập huấn của Bộ/Sở GD&ĐT
Viết đúng format trích dẫn, đánh số thứ tự.`
        }
    ];
}

// Chart data generation prompt
export function buildChartDataPrompt(
    chartType: 'bar' | 'pie',
    topicTitle: string,
    sectionTitle: string,
    content: string
): GroqMessage[] {
    const chartLabel = chartType === 'bar' ? 'biểu đồ cột' : 'biểu đồ tròn';
    return [
        {
            role: 'system',
            content: `Bạn là chuyên gia phân tích dữ liệu giáo dục. Tạo dữ liệu số liệu phù hợp cho ${chartLabel} trong SKKN.

QUAN TRỌNG: Chỉ trả về JSON thuần tuý, KHÔNG markdown, KHÔNG giải thích.

Format JSON:
{
  "title": "Tên biểu đồ ngắn gọn",
  "labels": ["Nhãn 1", "Nhãn 2", ...],
  "values": [số1, số2, ...]
}

Quy tắc:
- Nhãn ngắn gọn (tối đa 12 ký tự)
- ${chartType === 'bar' ? 'Tối đa 8 cột, giá trị là số nguyên' : 'Tối đa 6 phần, giá trị là phần trăm (tổng = 100)'}
- Dữ liệu phải hợp lý, thực tế trong bối cảnh giáo dục VN
- Tiêu đề bảng tiếng Việt, ngắn gọn`
        },
        {
            role: 'user',
            content: `Tạo dữ liệu cho ${chartLabel} thuộc phần "${sectionTitle}" trong đề tài "${topicTitle}".
${content ? `\nNội dung liên quan:\n${content.slice(0, 1500)}` : ''}
\nChỉ trả về JSON, không giải thích.`
        }
    ];
}

