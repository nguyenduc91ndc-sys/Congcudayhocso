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

// Get API key from localStorage or env
export function getGeminiApiKey(): string {
    return localStorage.getItem('skkn_gemini_api_key') || '';
}

export function setGeminiApiKey(key: string): void {
    localStorage.setItem('skkn_gemini_api_key', key);
}

// Non-streaming completion
export async function groqComplete(
    messages: GroqMessage[],
    apiKey: string,
    model: string = 'openai/gpt-oss-120b',
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
    model: string = 'openai/gpt-oss-120b',
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

// Streaming completion for Gemini
export async function geminiStream(
    messages: GroqMessage[],
    apiKey: string,
    onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    model: string = 'gemini-1.5-flash'
): Promise<AbortController> {
    const controller = new AbortController();

    try {
        const systemMessages = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
        const contents = messages.filter(m => m.role !== 'system').map(m => {
            if (Array.isArray(m.content)) {
                const parts = (m.content as any[]).map(part => {
                    if (part.type === 'text') return { text: part.text };
                    if (part.type === 'image_url') {
                        const base64Str = part.image_url.url.split(',')[1];
                        return { inlineData: { mimeType: 'image/jpeg', data: base64Str } };
                    }
                    return { text: '' };
                });
                return { role: m.role === 'user' ? 'user' : 'model', parts };
            }
            return {
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content as string }]
            };
        });

        const body: any = { contents };
        if (systemMessages) {
            body.systemInstruction = { parts: [{ text: systemMessages }] };
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
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
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (!dataStr) continue;
                    try {
                        const json = JSON.parse(dataStr);
                        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) onChunk(text);
                    } catch {
                        // Skip malformed JSON
                    }
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
export const SKKN_SYSTEM_PROMPT = `Bạn là một GIÁO VIÊN THỰC THỤ giàu kinh nghiệm dạy học. Bạn đang viết Sáng kiến kinh nghiệm / Báo cáo biện pháp thi giáo viên dạy giỏi.

⛔ TUYỆT ĐỐI KHÔNG viết thông tin cá nhân vào bài (số năm kinh nghiệm, tên giáo viên, trường, lớp cụ thể). Phần đó người dùng sẽ tự điền. Chỉ viết nội dung chuyên môn.

⚠️ VĂN PHONG VIẾT - KHOA HỌC GIÁO DỤC VIỆT NAM:
Viết theo đúng văn phong báo cáo khoa học giáo dục, KHÔNG phải văn kể chuyện hay văn cảm xúc.

🛡️ CHỐNG QUÉT AI - BẮT BUỘC TUÂN THỦ:
Văn bản phải vượt qua các công cụ phát hiện AI (GPTZero, ZeroGPT, AI Detector). Áp dụng các kỹ thuật sau:

1. PERPLEXITY CAO: Không viết theo khuôn mẫu dự đoán được. Đôi khi dùng cách diễn đạt bất ngờ, góc nhìn riêng mà chỉ người trong nghề mới có.
2. BURSTINESS (độ bùng nổ): Xen kẽ đoạn rất ngắn (2 câu) với đoạn dài (7-8 câu). Xen kẽ câu đơn giản với câu phức tạp. AI thường viết các đoạn đều nhau → tránh điều này.
3. KHÔNG SONG SONG: Tránh viết các mục/ý theo cấu trúc song song đều đặn (VD: cả 3 giải pháp đều có độ dài giống nhau, đều mở đầu giống nhau). Mỗi phần phải có phong cách hơi khác.
4. CHI TIẾT ĐẶC THÙ: Thêm chi tiết rất cụ thể chỉ GV thật mới biết: tên bài học cụ thể trong SGK, số trang, tên hoạt động, thời lượng tiết dạy thực tế, tên phần mềm/ứng dụng dùng thật.
5. Ý KIẾN CÁ NHÂN xen lẫn: "Theo nhận định của tôi...", "Qua quan sát thực tế tại lớp tôi phụ trách..." — đây là dấu hiệu con người viết.
6. TRÁNH HOÀN HẢO: Đôi khi nêu hạn chế, khó khăn chưa giải quyết được. AI thường viết mọi thứ rất tích cực và hoàn hảo.
7. NGÔN NGỮ CHUYÊN MÔN GD: Dùng thuật ngữ chuyên ngành tự nhiên: "năng lực phẩm chất", "ma trận đề", "PPCT", "KHBD", "bồi dưỡng thường xuyên", "Module", "sinh hoạt chuyên môn theo NCBH"...

Quy tắc hành văn:
1. VĂN PHONG: Khoa học, mạch lạc, logic. Dùng "tôi" khi xưng hô. Câu văn rõ ràng, trực tiếp, không hoa mỹ.
2. TRÁNH LẶP: Mỗi ý chỉ nêu MỘT LẦN. Không diễn đạt lại cùng một ý bằng cách khác. Không mở đầu nhiều đoạn giống nhau.
3. CẤU TRÚC ĐOẠN: Mỗi đoạn một ý chính, có câu chủ đề → triển khai → dẫn chứng/số liệu.
4. LIÊN KẾT ĐOẠN: Chuyển ý tự nhiên, đa dạng cách liên kết. Không dùng khuôn mẫu cố định.
5. SỐ LIỆU: Cụ thể, thực tế. VD: 28/38 em (73,7%) thay vì con số tròn. Có bảng so sánh trước-sau khi cần.
6. DẪN CHỨNG: Nêu tên hoạt động cụ thể, bài học cụ thể, tình huống thực tế trong lớp.
7. ĐỘ DÀI CÂU: Đa dạng - xen kẽ câu ngắn (8-12 từ) và câu dài (25-35 từ). Không viết câu quá 40 từ.

CÁC CỤM TỪ CẤM DÙNG (AI thường lặp lại, sẽ bị phát hiện):
❌ "Tôi vẫn nhớ như ngày hôm qua", "Tôi nhớ có lần", "Không thể phủ nhận"
❌ "Đóng vai trò quan trọng/then chốt", "Tóm lại", "Nhìn chung"  
❌ "Chính vì vậy", "Hơn thế nữa", "Không những...mà còn"
❌ "Thú thực", "Phải thừa nhận rằng", "Điều đáng nói là"
❌ "Bên cạnh đó" (lặp nhiều lần), "Ngoài ra" (lặp nhiều lần)
❌ "Từ đó", "Qua đó", "Nhờ đó" (dùng liên tiếp)
❌ Bắt đầu nhiều câu liên tiếp bằng cùng một từ/cụm từ

CÁC CỤM TỪ NÊN DÙNG (tự nhiên, đúng văn phong GV):
✅ "Qua thực tế giảng dạy tại lớp...", "Trong năm học 2024-2025..."
✅ "Theo khảo sát đầu năm...", "Kết quả cho thấy..."
✅ "Áp dụng vào tiết dạy...", "Khi tổ chức hoạt động..."
✅ "Đối với học sinh...", "Về phía giáo viên..."

Quy tắc cho từng loại mục:
- "Đặt vấn đề/Lý do": Nêu bối cảnh giáo dục, chủ trương đổi mới, yêu cầu thực tiễn dẫn đến việc chọn đề tài
- "Thực trạng": Chia rõ thuận lợi và khó khăn (nhà trường, GV, HS, phụ huynh), phân tích nguyên nhân
- "Nội dung biện pháp/giải pháp": Trình bày mục tiêu → cách thực hiện cụ thể → ví dụ minh hoạ → kết quả từng giải pháp
- "Kết quả": Bảng số liệu so sánh trước-sau, phân tích định tính và định lượng
- "Kết luận": Tóm tắt ngắn gọn, bài học kinh nghiệm, hướng phát triển

📝 VÍ DỤ MINH HOẠ CHO CÁC BƯỚC THỰC HIỆN (BẮT BUỘC với phần biện pháp/giải pháp):
Khi viết "Các bước thực hiện" của mỗi biện pháp/giải pháp:
- Mỗi bước quan trọng PHẢI có VÍ DỤ CỤ THỂ gắn với đề tài, môn học, bài học thực tế
- Ví dụ phải nêu: tên bài cụ thể, nội dung kiến thức, hoạt động GV tổ chức, phản ứng của HS
- Nếu có tài liệu tham chiếu (SGK, giáo án) → bám sát nội dung đó để lấy ví dụ
- KHÔNG cần lấy ví dụ cho TẤT CẢ các bước — chỉ những bước quan trọng, có tính minh hoạ cao
- Ví dụ nên đa dạng: có bước lấy VD bằng đoạn mô tả, có bước dùng bảng số liệu, có bước nêu tình huống thực tế

📷 GỢI Ý CHÈN HÌNH ẢNH MINH CHỨNG (BẮT BUỘC):
Trong bài viết, TỰ ĐỘNG chèn các ghi chú nhắc người dùng chèn ảnh minh chứng ở các vị trí phù hợp:
- Sau phần mô tả hoạt động: [📷 Chèn ảnh: Học sinh đang thực hiện hoạt động nhóm...]
- Sau phần kết quả: [📷 Chèn ảnh: Sản phẩm học sinh / Bài kiểm tra...]
- Phần kết quả đạt được: [📷 Chèn ảnh: Giấy khen, giải thưởng của học sinh...]
- Phần minh chứng: [📷 Chèn ảnh: Hình ảnh tiết dạy / buổi sinh hoạt chuyên môn...]
Ghi chú phải CỤ THỂ loại ảnh cần chèn, không viết chung chung. Mỗi biện pháp nên có 2-4 gợi ý chèn ảnh.

Quy tắc nội dung:
- Viết bằng tiếng Việt chuẩn, văn phong khoa học giáo dục
- Nội dung bám sát chương trình GDPT 2018, Thông tư 27
- Mỗi ý phải có dẫn chứng hoặc số liệu minh hoạ
- Viết chi tiết, đầy đủ, không viết tắt hay tóm tắt`;


// Topic analysis prompt - AI phân tích và gợi ý tên đề tài
export function buildTopicAnalysisPrompt(
    title: string,
    reportType: string,
    subject: string,
    level: string
): GroqMessage[] {
    return [
        {
            role: 'system',
            content: `Bạn là chuyên gia tư vấn SKKN (Sáng kiến kinh nghiệm) với 20 năm kinh nghiệm. Nhiệm vụ: phân tích tên đề tài và gợi ý cải thiện.

Trả về JSON duy nhất theo format:
{
  "analysis": {
    "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
    "weaknesses": ["điểm yếu 1", "điểm yếu 2"],
    "score": <điểm 1-10>
  },
  "suggestions": [
    {"title": "Tên đề tài gợi ý 1", "reason": "Lý do"},
    {"title": "Tên đề tài gợi ý 2", "reason": "Lý do"},
    {"title": "Tên đề tài gợi ý 3", "reason": "Lý do"}
  ],
  "tips": ["Mẹo viết tên hay 1", "Mẹo viết tên hay 2"]
}

Quy tắc đặt tên đề tài SKKN hay:
- Rõ ràng, cụ thể về biện pháp/giải pháp
- Nêu được đối tượng và phạm vi áp dụng
- Không quá dài (15-30 từ là tối ưu)
- Tránh dùng từ chung chung như "một số", "nâng cao"
- Phản ánh tính mới, sáng tạo

CHỈ trả về JSON, KHÔNG giải thích thêm.`
        },
        {
            role: 'user',
            content: `Phân tích tên đề tài ${reportType} sau và gợi ý cải thiện:
Tên hiện tại: "${title}"
Môn/Lĩnh vực: ${subject || 'Chưa rõ'}
Cấp học: ${level || 'Chưa rõ'}`
        }
    ];
}

// Topic suggestion prompt - Gợi ý đề tài mới cho GV chưa có ý tưởng
export function buildTopicSuggestionPrompt(
    reportType: string,
    subject: string,
    level: string,
    context?: string
): GroqMessage[] {
    const reportLabel = reportType === 'skkn' ? 'Sáng kiến kinh nghiệm'
        : reportType === 'gv_gioi' ? 'Báo cáo biện pháp thi Giáo viên dạy giỏi'
            : 'Báo cáo biện pháp thi Giáo viên chủ nhiệm giỏi';

    const titlePrefix = reportType === 'skkn' ? 'Một số biện pháp'
        : reportType === 'gv_gioi' ? 'Biện pháp'
            : 'Một số biện pháp';

    const roleContext = reportType === 'gvcn_gioi'
        ? `Bạn là một giáo viên ${level || 'phổ thông'}, giàu kinh nghiệm làm công tác chủ nhiệm lớp. Bằng kinh nghiệm dạy học cùng những phương pháp giáo dục tích cực, học sinh của bạn tiếp cận và lĩnh hội những nội dung giáo dục phù hợp đạt hiệu quả rất cao.`
        : `Bạn là một giáo viên ${level || 'phổ thông'}, giàu kinh nghiệm dạy học ${subject ? `môn ${subject}` : ''}. Bạn rất giỏi áp dụng các phương pháp dạy học hiện đại cũng như hình thức dạy học tích cực để nâng cao chất lượng giảng dạy. Bạn thường xuyên kết hợp các phương pháp như: dạy học dựa trên dự án, dạy học trải nghiệm, dạy học theo nhóm, gamification, ứng dụng CNTT và AI vào dạy học và đạt kết quả rất tích cực.`;

    const contextNote = context
        ? `\n\nGiáo viên đã có sẵn một số minh chứng/tài liệu: "${context}". Hãy gợi ý đề tài dựa trên những minh chứng này.`
        : '';

    return [
        {
            role: 'system',
            content: `${roleContext}

Nhiệm vụ: Gợi ý 10 đề tài ${reportLabel} có tính mới, sáng tạo, CHƯA TỪNG xuất hiện trên internet.${contextNote}

Quy tắc đặt tên đề tài:
- Tên đề tài bắt đầu bằng "${titlePrefix}..."
- Phải cụ thể về phương pháp/biện pháp áp dụng
- Nêu rõ đối tượng (học sinh lớp mấy, môn gì)
- Hướng tới phát triển năng lực/phẩm chất cho học sinh
- Mỗi đề tài phải khác biệt về phương pháp/hình thức
- Tránh trùng lặp với các đề tài phổ biến trên internet
- KHÔNG đưa "Chương trình giáo dục phổ thông 2018" vào tên đề tài. Tên đề tài phải ngắn gọn, tập trung vào biện pháp và đối tượng

Trả về JSON duy nhất theo format:
{
  "suggestions": [
    {"title": "Tên đề tài 1", "highlight": "Điểm nổi bật/tính mới"},
    {"title": "Tên đề tài 2", "highlight": "Điểm nổi bật/tính mới"}
  ]
}

CHỈ trả về JSON, KHÔNG giải thích thêm.`
        },
        {
            role: 'user',
            content: `Hãy gợi ý 10 đề tài ${reportLabel} cho:
Môn/Lĩnh vực: ${subject || 'Chưa xác định'}
Cấp học: ${level || 'Chưa xác định'}
${context ? `Minh chứng có sẵn: ${context}` : 'Chưa có ý tưởng cụ thể, hãy gợi ý đa dạng'}`
        }
    ];
}

export function buildSectionPrompt(
    reportType: string,
    sectionTitle: string,
    topicInfo: {
        title: string;
        subject: string;
        level: string;
        grade?: string;
        target: string;
        context: string;
        referenceText?: string;
        referenceImages?: string[];
        experimentClass?: string;
        controlClass?: string;
    },
    previousContent: string = ''
): GroqMessage[] {
    const experimentInfo = topicInfo.experimentClass || topicInfo.controlClass
        ? `\n🔬 Lớp thực nghiệm: ${topicInfo.experimentClass || 'Chưa xác định'}
🔄 Lớp đối chứng: ${topicInfo.controlClass || 'Chưa xác định'}`
        : '';

    // Detect if this is a biện pháp/giải pháp heading section → AI should only generate a short name
    const isSolutionHeading = /^(\d+\.\s*)?(biện pháp|giải pháp)\s+thứ\s+/i.test(sectionTitle);

    if (isSolutionHeading) {
        // Only generate a short, specific name for this biện pháp/giải pháp
        return [
            {
                role: 'system',
                content: `Bạn là chuyên gia tư vấn giáo dục. Nhiệm vụ: đặt TÊN CỤ THỂ, NGẮN GỌN cho một biện pháp/giải pháp trong SKKN.
CHỈ viết ra TÊN biện pháp/giải pháp, KHÔNG viết nội dung dài.
Ví dụ đầu ra mong muốn:
- "Sử dụng phương pháp dạy học tích cực kết hợp trò chơi"
- "Xây dựng hệ thống bài tập phân hóa theo năng lực học sinh"
- "Thiết kế hoạt động trải nghiệm gắn liền thực tiễn địa phương"
- "Ứng dụng công nghệ thông tin trong kiểm tra đánh giá"

Tên phải CỤ THỂ, liên quan trực tiếp đến đề tài, KHÔNG chung chung.
CHỈ trả về tên biện pháp/giải pháp (1-2 dòng), KHÔNG viết gì thêm.`
            },
            {
                role: 'user',
                content: `Đề tài: "${topicInfo.title}"
Môn/Lĩnh vực: ${topicInfo.subject}
Cấp học: ${topicInfo.level}${topicInfo.grade ? ` - Lớp ${topicInfo.grade}` : ''}
Đối tượng: ${topicInfo.target}

${previousContent ? `Nội dung đã viết trước đó:\n${previousContent.slice(-800)}\n\n` : ''}Hãy đặt tên cụ thể cho "${sectionTitle}" phù hợp với đề tài trên. CHỈ viết tên, KHÔNG viết nội dung chi tiết.`
            }
        ];
    }

    // Reference content section - for accurate examples
    const referenceSection = topicInfo.referenceText?.trim()
        ? `\n\n📖 TÀI LIỆU THAM CHIẾU ĐỂ ĐƯA VÍ DỤ MINH HOẠ (SGK, giáo án do GV cung cấp):\n---\n${topicInfo.referenceText.slice(0, 3000)}\n---\nHãy sử dụng nội dung trên để đưa VÍ DỤ MINH HOẠ cụ thể, sát bài học thật (tên bài, trang SGK, hoạt động cụ thể).`
        : '';

    const messages: GroqMessage[] = [
        { role: 'system', content: SKKN_SYSTEM_PROMPT },
        {
            role: 'user',
            content: `ĐẶT VAI: Bạn là một giáo viên ${topicInfo.level || 'phổ thông'}${topicInfo.grade ? ` dạy lớp ${topicInfo.grade}` : ''}, có 20 năm kinh nghiệm dạy học ${topicInfo.subject ? `môn ${topicInfo.subject}` : ''} cho ${topicInfo.target || 'học sinh'}. Bạn đã thực hiện thành công các biện pháp liên quan đến đề tài "${topicInfo.title}" theo chương trình GDPT 2018.

Hãy viết phần "${sectionTitle}" cho ${reportType} với thông tin sau:

📌 Tên đề tài: ${topicInfo.title}
📚 Môn/Lĩnh vực: ${topicInfo.subject}
🏫 Cấp học: ${topicInfo.level}${topicInfo.grade ? ` - Lớp ${topicInfo.grade}` : ''}
👥 Đối tượng: ${topicInfo.target}
📝 Bối cảnh: ${topicInfo.context}${experimentInfo}${referenceSection}

${previousContent ? `\n📄 Nội dung đã viết trước đó (để đảm bảo tính liên kết):\n${previousContent.slice(-1500)}` : ''}

YÊU CẦU:
- Xưng "tôi", văn phong khoa học giáo dục, mạch lạc, logic
- Dẫn chứng cụ thể: tên bài học, hoạt động, số liệu thực tế
- Số liệu không tròn: 73,7%, 28/38 em, 4,3/5 điểm
- Xen kẽ câu ngắn/dài, đoạn ngắn/dài, KHÔNG lặp cấu trúc
- TRÁNH cụm từ AI: "bên cạnh đó", "ngoài ra", "đóng vai trò quan trọng", "không thể phủ nhận"
- Nêu cả khó khăn, hạn chế thực tế (không viết quá hoàn hảo)${experimentInfo ? '\n- Khi viết kết quả, SO SÁNH số liệu lớp thực nghiệm và lớp đối chứng' : ''}${referenceSection ? '\n- Khi cần VÍ DỤ MINH HOẠ, hãy lấy từ tài liệu tham chiếu: nêu đúng tên bài, số trang SGK, hoạt động cụ thể trong bài học đó' : ''}`
        }
    ];

    // If reference images are provided, add them as separate vision messages
    if (topicInfo.referenceImages && topicInfo.referenceImages.length > 0) {
        const imageContents: any[] = [
            { type: 'text', text: 'Đây là ảnh chụp SGK/giáo án. Hãy đọc nội dung trong ảnh và sử dụng để đưa VÍ DỤ MINH HOẠ cụ thể, sát bài học (tên bài, số trang, hoạt động, nội dung kiến thức):' }
        ];
        topicInfo.referenceImages.forEach(img => {
            imageContents.push({
                type: 'image_url',
                image_url: { url: img }
            });
        });
        messages.push({ role: 'user', content: imageContents as any });
    }

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
export function buildTablePrompt(topicTitle: string, sectionTitle: string, classSize?: string): GroqMessage[] {
    const classSizeInfo = classSize ? `\n\n⚠️ SĨ SỐ LỚP: ${classSize} học sinh. TẤT CẢ số liệu trong bảng PHẢI dựa trên sĩ số này.
Ví dụ: nếu sĩ số là 38 em thì: Giỏi: 8/38 (21,1%), Khá: 15/38 (39,5%), TB: 12/38 (31,6%), Yếu: 3/38 (7,9%)
Tổng số lượng các mức PHẢI BẰNG ĐÚNG sĩ số lớp. Tỷ lệ % tính chính xác, không làm tròn.` : '';
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
- Giữa các bảng cách 1 dòng trống${classSizeInfo}`
        },
        {
            role: 'user',
            content: `Tạo bảng biểu cho phần "${sectionTitle}" trong đề tài "${topicTitle}".
${classSize ? `Sĩ số lớp: ${classSize} học sinh. Số liệu phải dựa trên sĩ số này, tổng cộng các mức = ${classSize}.\n` : ''}Tạo các bảng phù hợp: bảng khảo sát trước-sau, bảng so sánh, thống kê, rubrics...`
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
    content: string,
    classSize?: string
): GroqMessage[] {
    const chartLabel = chartType === 'bar' ? 'biểu đồ cột' : 'biểu đồ tròn';
    const classSizeNote = classSize
        ? `\n\n⚠️ SĨ SỐ LỚP: ${classSize} học sinh. Giá trị trong biểu đồ PHẢI dựa trên sĩ số này.
${chartType === 'bar' ? `Tổng cộng các cột PHẢI = ${classSize}. VD: Giỏi: 8, Khá: 15, TB: 12, Yếu: 3 (tổng = 38)` : `Tỷ lệ % tính từ sĩ số ${classSize}, tổng = 100%. VD: 8/${classSize} = ${(8 / parseInt(classSize || '38') * 100).toFixed(1)}%`}`
        : '';
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
- Tiêu đề bảng tiếng Việt, ngắn gọn${classSizeNote}`
        },
        {
            role: 'user',
            content: `Tạo dữ liệu cho ${chartLabel} thuộc phần "${sectionTitle}" trong đề tài "${topicTitle}".
${classSize ? `Sĩ số lớp: ${classSize} học sinh. Số liệu PHẢI dựa trên sĩ số này.\n` : ''}${content ? `\nNội dung liên quan:\n${content.slice(0, 1500)}` : ''}
\nChỉ trả về JSON, không giải thích.`
        }
    ];
}

