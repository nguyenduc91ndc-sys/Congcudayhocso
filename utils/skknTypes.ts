// Types and constants for SKKN Writer

export type ReportType = 'skkn' | 'gv_gioi' | 'gvcn_gioi';

export interface TopicInfo {
    title: string;
    subject: string;
    level: string;
    grade: string;
    classSize: string;
    target: string;
    context: string;
    referenceText: string;
    referenceImages: string[];
    author: string;
    school: string;
    department: string;
    year: string;
    experimentClass?: string;
    controlClass?: string;
}

export interface Section {
    id: string;
    title: string;
    content: string;
    status: 'empty' | 'writing' | 'done';
    subsections?: Section[];
}

export interface SKKNDocument {
    id: string;
    reportType: ReportType;
    topicInfo: TopicInfo;
    sections: Section[];
    createdAt: number;
    updatedAt: number;
    customStructure?: boolean;
}

export interface AICheckResult {
    aiScore: number;
    humanScore: number;
    confidence: number;
    analysis: string;
    suggestions: string[];
    details: Array<{ paragraph: number; aiProbability: number; note: string }>;
}

export interface PlagiarismResult {
    originalityScore: number;
    suspiciousParts: Array<{ text: string; reason: string; severity: string }>;
    overallAssessment: string;
    suggestions: string[];
}

export const REPORT_TYPES: Record<ReportType, { label: string; icon: string; desc: string }> = {
    skkn: { label: 'Sáng kiến kinh nghiệm', icon: '📄', desc: 'Viết SKKN theo chuẩn cấp trường/huyện/tỉnh' },
    gv_gioi: { label: 'Biện pháp GV Giỏi', icon: '🏆', desc: 'Báo cáo thi Giáo viên giỏi các cấp' },
    gvcn_gioi: { label: 'GV Chủ nhiệm Giỏi', icon: '👩‍🏫', desc: 'Báo cáo thi GV chủ nhiệm giỏi' },
};

export const LEVELS = ['Mầm non', 'Tiểu học', 'THCS', 'THPT', 'Đại học/Cao đẳng'];

export const DEFAULT_SECTIONS: Record<ReportType, Section[]> = {
    skkn: [
        {
            id: 's1', title: 'PHẦN MỞ ĐẦU', content: '', status: 'empty', subsections: [
                { id: 's1a', title: '1. Lý do chọn đề tài', content: '', status: 'empty' },
                { id: 's1b', title: '2. Mục đích nghiên cứu', content: '', status: 'empty' },
                { id: 's1c', title: '3. Đối tượng và phạm vi nghiên cứu', content: '', status: 'empty' },
                { id: 's1d', title: '4. Phương pháp nghiên cứu', content: '', status: 'empty' },
            ]
        },
        {
            id: 's2', title: 'PHẦN NỘI DUNG', content: '', status: 'empty', subsections: [
                { id: 's2a', title: '1. Cơ sở lý luận', content: '', status: 'empty' },
                { id: 's2b', title: '2. Thực trạng vấn đề', content: '', status: 'empty' },
                { id: 's2c', title: '3. Biện pháp thứ nhất', content: '', status: 'empty' },
                { id: 's2c1', title: 'a. Mục tiêu thực hiện biện pháp thứ nhất', content: '', status: 'empty' },
                { id: 's2c2', title: 'b. Các bước thực hiện biện pháp thứ nhất', content: '', status: 'empty' },
                { id: 's2c3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                { id: 's2c4', title: 'd. Kết quả sau khi thực hiện biện pháp thứ nhất', content: '', status: 'empty' },
                { id: 's2d', title: '4. Biện pháp thứ hai', content: '', status: 'empty' },
                { id: 's2d1', title: 'a. Mục tiêu thực hiện biện pháp thứ hai', content: '', status: 'empty' },
                { id: 's2d2', title: 'b. Các bước thực hiện biện pháp thứ hai', content: '', status: 'empty' },
                { id: 's2d3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                { id: 's2d4', title: 'd. Kết quả sau khi thực hiện biện pháp thứ hai', content: '', status: 'empty' },
                { id: 's2e', title: '5. Biện pháp thứ ba', content: '', status: 'empty' },
                { id: 's2e1', title: 'a. Mục tiêu thực hiện biện pháp thứ ba', content: '', status: 'empty' },
                { id: 's2e2', title: 'b. Các bước thực hiện biện pháp thứ ba', content: '', status: 'empty' },
                { id: 's2e3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                { id: 's2e4', title: 'd. Kết quả sau khi thực hiện biện pháp thứ ba', content: '', status: 'empty' },
                { id: 's2f', title: '6. Kết quả chung đạt được', content: '', status: 'empty' },
            ]
        },
        {
            id: 's3', title: 'KẾT LUẬN VÀ KIẾN NGHỊ', content: '', status: 'empty', subsections: [
                { id: 's3a', title: '1. Kết luận', content: '', status: 'empty' },
                { id: 's3b', title: '2. Kiến nghị', content: '', status: 'empty' },
            ]
        },
        { id: 's4', title: 'TÀI LIỆU THAM KHẢO', content: '', status: 'empty' },
    ],
    gv_gioi: [
        {
            id: 'g1', title: 'I. ĐẶT VẤN ĐỀ', content: '', status: 'empty', subsections: [
                { id: 'g1a', title: '1. Lý do chọn biện pháp', content: '', status: 'empty' },
                { id: 'g1b', title: '2. Bối cảnh thực hiện', content: '', status: 'empty' },
                { id: 'g1c', title: '3. Phạm vi và đối tượng áp dụng', content: '', status: 'empty' },
                { id: 'g1d', title: '4. Mục đích của biện pháp', content: '', status: 'empty' },
            ]
        },
        {
            id: 'g2', title: 'II. THỰC TRẠNG', content: '', status: 'empty', subsections: [
                { id: 'g2a', title: '1. Thuận lợi', content: '', status: 'empty' },
                { id: 'g2b', title: '2. Khó khăn', content: '', status: 'empty' },
                { id: 'g2c', title: '3. Nguyên nhân của thực trạng', content: '', status: 'empty' },
            ]
        },
        {
            id: 'g3', title: 'III. NỘI DUNG VÀ CÁCH THỨC THỰC HIỆN BIỆN PHÁP', content: '', status: 'empty', subsections: [
                { id: 'g3a', title: 'Giải pháp thứ nhất', content: '', status: 'empty' },
                { id: 'g3a1', title: 'a. Mục tiêu thực hiện giải pháp thứ nhất', content: '', status: 'empty' },
                { id: 'g3a2', title: 'b. Các bước thực hiện giải pháp thứ nhất', content: '', status: 'empty' },
                { id: 'g3a3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                { id: 'g3a4', title: 'd. Kết quả sau khi thực hiện giải pháp thứ nhất', content: '', status: 'empty' },
                { id: 'g3b', title: 'Giải pháp thứ hai', content: '', status: 'empty' },
                { id: 'g3b1', title: 'a. Mục tiêu thực hiện giải pháp thứ hai', content: '', status: 'empty' },
                { id: 'g3b2', title: 'b. Các bước thực hiện giải pháp thứ hai', content: '', status: 'empty' },
                { id: 'g3b3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                { id: 'g3b4', title: 'd. Kết quả sau khi thực hiện giải pháp thứ hai', content: '', status: 'empty' },
                { id: 'g3c', title: 'Giải pháp thứ ba', content: '', status: 'empty' },
                { id: 'g3c1', title: 'a. Mục tiêu thực hiện giải pháp thứ ba', content: '', status: 'empty' },
                { id: 'g3c2', title: 'b. Các bước thực hiện giải pháp thứ ba', content: '', status: 'empty' },
                { id: 'g3c3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                { id: 'g3c4', title: 'd. Kết quả sau khi thực hiện giải pháp thứ ba', content: '', status: 'empty' },
            ]
        },
        {
            id: 'g4', title: 'IV. KẾT QUẢ ĐẠT ĐƯỢC', content: '', status: 'empty', subsections: [
                { id: 'g4a', title: '1. Kết quả định lượng (số liệu so sánh trước - sau)', content: '', status: 'empty' },
                { id: 'g4b', title: '2. Kết quả định tính', content: '', status: 'empty' },
            ]
        },
        {
            id: 'g5', title: 'V. KẾT LUẬN VÀ KIẾN NGHỊ', content: '', status: 'empty', subsections: [
                { id: 'g5a', title: '1. Kết luận', content: '', status: 'empty' },
                { id: 'g5b', title: '2. Kiến nghị', content: '', status: 'empty' },
            ]
        },
        { id: 'g6', title: 'TÀI LIỆU THAM KHẢO', content: '', status: 'empty' },
    ],
    gvcn_gioi: [
        {
            id: 'c1', title: 'I. ĐẶT VẤN ĐỀ', content: '', status: 'empty', subsections: [
                { id: 'c1a', title: '1. Lý do chọn biện pháp', content: '', status: 'empty' },
                { id: 'c1b', title: '2. Bối cảnh thực hiện', content: '', status: 'empty' },
                { id: 'c1c', title: '3. Phạm vi và đối tượng áp dụng', content: '', status: 'empty' },
                { id: 'c1d', title: '4. Mục đích của biện pháp', content: '', status: 'empty' },
            ]
        },
        {
            id: 'c2', title: 'II. THỰC TRẠNG CÔNG TÁC CHỦ NHIỆM', content: '', status: 'empty', subsections: [
                { id: 'c2a', title: '1. Thuận lợi', content: '', status: 'empty' },
                { id: 'c2b', title: '2. Khó khăn', content: '', status: 'empty' },
                { id: 'c2c', title: '3. Nguyên nhân của thực trạng', content: '', status: 'empty' },
            ]
        },
        {
            id: 'c3', title: 'III. NỘI DUNG VÀ CÁCH THỨC THỰC HIỆN BIỆN PHÁP', content: '', status: 'empty', subsections: [
                { id: 'c3a', title: 'Giải pháp thứ nhất', content: '', status: 'empty' },
                { id: 'c3a1', title: 'a. Mục tiêu thực hiện giải pháp thứ nhất', content: '', status: 'empty' },
                { id: 'c3a2', title: 'b. Các bước thực hiện giải pháp thứ nhất', content: '', status: 'empty' },
                { id: 'c3a3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                { id: 'c3a4', title: 'd. Kết quả sau khi thực hiện giải pháp thứ nhất', content: '', status: 'empty' },
                { id: 'c3b', title: 'Giải pháp thứ hai', content: '', status: 'empty' },
                { id: 'c3b1', title: 'a. Mục tiêu thực hiện giải pháp thứ hai', content: '', status: 'empty' },
                { id: 'c3b2', title: 'b. Các bước thực hiện giải pháp thứ hai', content: '', status: 'empty' },
                { id: 'c3b3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                { id: 'c3b4', title: 'd. Kết quả sau khi thực hiện giải pháp thứ hai', content: '', status: 'empty' },
                { id: 'c3c', title: 'Giải pháp thứ ba', content: '', status: 'empty' },
                { id: 'c3c1', title: 'a. Mục tiêu thực hiện giải pháp thứ ba', content: '', status: 'empty' },
                { id: 'c3c2', title: 'b. Các bước thực hiện giải pháp thứ ba', content: '', status: 'empty' },
                { id: 'c3c3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                { id: 'c3c4', title: 'd. Kết quả sau khi thực hiện giải pháp thứ ba', content: '', status: 'empty' },
            ]
        },
        {
            id: 'c4', title: 'IV. KẾT QUẢ ĐẠT ĐƯỢC', content: '', status: 'empty', subsections: [
                { id: 'c4a', title: '1. Kết quả định lượng (số liệu so sánh trước - sau)', content: '', status: 'empty' },
                { id: 'c4b', title: '2. Kết quả định tính', content: '', status: 'empty' },
            ]
        },
        {
            id: 'c5', title: 'V. KẾT LUẬN VÀ KIẾN NGHỊ', content: '', status: 'empty', subsections: [
                { id: 'c5a', title: '1. Kết luận', content: '', status: 'empty' },
                { id: 'c5b', title: '2. Kiến nghị', content: '', status: 'empty' },
            ]
        },
        { id: 'c6', title: 'TÀI LIỆU THAM KHẢO', content: '', status: 'empty' },
    ],
};

// Multiple SKKN structure templates for different provinces/styles
export interface SKKNTemplate {
    id: string;
    name: string;
    desc: string;
    icon: string;
    sections: Section[];
}

export const SKKN_TEMPLATES: SKKNTemplate[] = [
    {
        id: 'standard',
        name: 'Mẫu chuẩn 3 phần',
        desc: 'Cấu trúc phổ biến nhất: Mở đầu - Nội dung - Kết luận',
        icon: '📋',
        sections: [
            {
                id: 's1', title: 'PHẦN MỞ ĐẦU', content: '', status: 'empty', subsections: [
                    { id: 's1a', title: '1. Lý do chọn đề tài', content: '', status: 'empty' },
                    { id: 's1b', title: '2. Mục đích nghiên cứu', content: '', status: 'empty' },
                    { id: 's1c', title: '3. Đối tượng và phạm vi nghiên cứu', content: '', status: 'empty' },
                    { id: 's1d', title: '4. Phương pháp nghiên cứu', content: '', status: 'empty' },
                ]
            },
            {
                id: 's2', title: 'PHẦN NỘI DUNG', content: '', status: 'empty', subsections: [
                    { id: 's2a', title: '1. Cơ sở lý luận', content: '', status: 'empty' },
                    { id: 's2b', title: '2. Thực trạng vấn đề', content: '', status: 'empty' },
                    { id: 's2c', title: '3. Biện pháp thứ nhất', content: '', status: 'empty' },
                    { id: 's2c1', title: 'a. Mục tiêu thực hiện biện pháp thứ nhất', content: '', status: 'empty' },
                    { id: 's2c2', title: 'b. Các bước thực hiện biện pháp thứ nhất', content: '', status: 'empty' },
                    { id: 's2c3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                    { id: 's2c4', title: 'd. Kết quả sau khi thực hiện biện pháp thứ nhất', content: '', status: 'empty' },
                    { id: 's2d', title: '4. Biện pháp thứ hai', content: '', status: 'empty' },
                    { id: 's2d1', title: 'a. Mục tiêu thực hiện biện pháp thứ hai', content: '', status: 'empty' },
                    { id: 's2d2', title: 'b. Các bước thực hiện biện pháp thứ hai', content: '', status: 'empty' },
                    { id: 's2d3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                    { id: 's2d4', title: 'd. Kết quả sau khi thực hiện biện pháp thứ hai', content: '', status: 'empty' },
                    { id: 's2e', title: '5. Biện pháp thứ ba', content: '', status: 'empty' },
                    { id: 's2e1', title: 'a. Mục tiêu thực hiện biện pháp thứ ba', content: '', status: 'empty' },
                    { id: 's2e2', title: 'b. Các bước thực hiện biện pháp thứ ba', content: '', status: 'empty' },
                    { id: 's2e3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                    { id: 's2e4', title: 'd. Kết quả sau khi thực hiện biện pháp thứ ba', content: '', status: 'empty' },
                    { id: 's2f', title: '6. Kết quả chung đạt được', content: '', status: 'empty' },
                ]
            },
            {
                id: 's3', title: 'KẾT LUẬN VÀ KIẾN NGHỊ', content: '', status: 'empty', subsections: [
                    { id: 's3a', title: '1. Kết luận', content: '', status: 'empty' },
                    { id: 's3b', title: '2. Kiến nghị', content: '', status: 'empty' },
                ]
            },
            { id: 's4', title: 'TÀI LIỆU THAM KHẢO', content: '', status: 'empty' },
        ]
    },
    {
        id: 'extended_7',
        name: 'Mẫu mở rộng 7 phần',
        desc: 'Cấu trúc chi tiết theo yêu cầu nhiều Sở GD&ĐT',
        icon: '📑',
        sections: [
            {
                id: 'e1', title: 'I. MỞ ĐẦU', content: '', status: 'empty', subsections: [
                    { id: 'e1a', title: '1. Lý do chọn đề tài', content: '', status: 'empty' },
                    { id: 'e1b', title: '2. Mục tiêu, nhiệm vụ của đề tài', content: '', status: 'empty' },
                    { id: 'e1c', title: '3. Đối tượng nghiên cứu', content: '', status: 'empty' },
                    { id: 'e1d', title: '4. Giới hạn và phạm vi nghiên cứu', content: '', status: 'empty' },
                    { id: 'e1e', title: '5. Phương pháp nghiên cứu', content: '', status: 'empty' },
                ]
            },
            {
                id: 'e2', title: 'II. CƠ SỞ LÝ LUẬN VÀ THỰC TIỄN', content: '', status: 'empty', subsections: [
                    { id: 'e2a', title: '1. Cơ sở lý luận', content: '', status: 'empty' },
                    { id: 'e2b', title: '2. Cơ sở thực tiễn', content: '', status: 'empty' },
                ]
            },
            {
                id: 'e3', title: 'III. THỰC TRẠNG VẤN ĐỀ', content: '', status: 'empty', subsections: [
                    { id: 'e3a', title: '1. Khái quát về đơn vị', content: '', status: 'empty' },
                    { id: 'e3b', title: '2. Thực trạng trước khi áp dụng sáng kiến', content: '', status: 'empty' },
                    { id: 'e3c', title: '3. Nguyên nhân của thực trạng', content: '', status: 'empty' },
                ]
            },
            {
                id: 'e4', title: 'IV. CÁC GIẢI PHÁP THỰC HIỆN', content: '', status: 'empty', subsections: [
                    { id: 'e4a', title: '1. Biện pháp thứ nhất', content: '', status: 'empty' },
                    { id: 'e4a1', title: 'a. Mục tiêu thực hiện', content: '', status: 'empty' },
                    { id: 'e4a2', title: 'b. Các bước thực hiện', content: '', status: 'empty' },
                    { id: 'e4a3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                    { id: 'e4a4', title: 'd. Kết quả đạt được', content: '', status: 'empty' },
                    { id: 'e4b', title: '2. Biện pháp thứ hai', content: '', status: 'empty' },
                    { id: 'e4b1', title: 'a. Mục tiêu thực hiện', content: '', status: 'empty' },
                    { id: 'e4b2', title: 'b. Các bước thực hiện', content: '', status: 'empty' },
                    { id: 'e4b3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                    { id: 'e4b4', title: 'd. Kết quả đạt được', content: '', status: 'empty' },
                    { id: 'e4c', title: '3. Biện pháp thứ ba', content: '', status: 'empty' },
                    { id: 'e4c1', title: 'a. Mục tiêu thực hiện', content: '', status: 'empty' },
                    { id: 'e4c2', title: 'b. Các bước thực hiện', content: '', status: 'empty' },
                    { id: 'e4c3', title: 'c. Ví dụ minh hoạ', content: '', status: 'empty' },
                    { id: 'e4c4', title: 'd. Kết quả đạt được', content: '', status: 'empty' },
                ]
            },
            {
                id: 'e5', title: 'V. KẾT QUẢ ĐẠT ĐƯỢC', content: '', status: 'empty', subsections: [
                    { id: 'e5a', title: '1. Kết quả định lượng', content: '', status: 'empty' },
                    { id: 'e5b', title: '2. Kết quả định tính', content: '', status: 'empty' },
                    { id: 'e5c', title: '3. Bài học kinh nghiệm', content: '', status: 'empty' },
                ]
            },
            {
                id: 'e6', title: 'VI. KẾT LUẬN VÀ KIẾN NGHỊ', content: '', status: 'empty', subsections: [
                    { id: 'e6a', title: '1. Kết luận', content: '', status: 'empty' },
                    { id: 'e6b', title: '2. Kiến nghị', content: '', status: 'empty' },
                ]
            },
            { id: 'e7', title: 'VII. TÀI LIỆU THAM KHẢO', content: '', status: 'empty' },
            { id: 'e8', title: 'VIII. PHỤ LỤC', content: '', status: 'empty' },
        ]
    },
    {
        id: 'hanoi_style',
        name: 'Mẫu Sở Hà Nội',
        desc: 'Theo hướng dẫn viết SKKN của Sở GD&ĐT Hà Nội',
        icon: '🏛️',
        sections: [
            {
                id: 'h1', title: 'PHẦN I: ĐẶT VẤN ĐỀ', content: '', status: 'empty', subsections: [
                    { id: 'h1a', title: '1. Lý do chọn đề tài', content: '', status: 'empty' },
                    { id: 'h1b', title: '2. Mục đích nghiên cứu', content: '', status: 'empty' },
                    { id: 'h1c', title: '3. Đối tượng, phạm vi, thời gian nghiên cứu', content: '', status: 'empty' },
                    { id: 'h1d', title: '4. Phương pháp nghiên cứu', content: '', status: 'empty' },
                    { id: 'h1e', title: '5. Những điểm mới của sáng kiến', content: '', status: 'empty' },
                ]
            },
            {
                id: 'h2', title: 'PHẦN II: GIẢI QUYẾT VẤN ĐỀ', content: '', status: 'empty', subsections: [
                    { id: 'h2a', title: '1. Cơ sở lý luận', content: '', status: 'empty' },
                    { id: 'h2b', title: '2. Cơ sở thực tiễn', content: '', status: 'empty' },
                    { id: 'h2c', title: '3. Các biện pháp đã tiến hành', content: '', status: 'empty' },
                    { id: 'h2d', title: '4. Kết quả thực hiện', content: '', status: 'empty' },
                ]
            },
            {
                id: 'h3', title: 'PHẦN III: KẾT LUẬN VÀ KHUYẾN NGHỊ', content: '', status: 'empty', subsections: [
                    { id: 'h3a', title: '1. Kết luận', content: '', status: 'empty' },
                    { id: 'h3b', title: '2. Khuyến nghị', content: '', status: 'empty' },
                ]
            },
            { id: 'h4', title: 'TÀI LIỆU THAM KHẢO', content: '', status: 'empty' },
            { id: 'h5', title: 'PHỤ LỤC', content: '', status: 'empty' },
        ]
    },
    {
        id: 'simple',
        name: 'Mẫu đơn giản cấp trường',
        desc: 'Cấu trúc ngắn gọn phù hợp SKKN cấp trường/cụm',
        icon: '📝',
        sections: [
            { id: 'p1', title: '1. Tên sáng kiến', content: '', status: 'empty' },
            { id: 'p2', title: '2. Lĩnh vực áp dụng', content: '', status: 'empty' },
            { id: 'p3', title: '3. Mô tả bản chất sáng kiến', content: '', status: 'empty' },
            {
                id: 'p4', title: '4. Nội dung sáng kiến', content: '', status: 'empty', subsections: [
                    { id: 'p4a', title: '4.1. Thực trạng trước khi áp dụng', content: '', status: 'empty' },
                    { id: 'p4b', title: '4.2. Các giải pháp', content: '', status: 'empty' },
                    { id: 'p4c', title: '4.3. Hiệu quả sáng kiến', content: '', status: 'empty' },
                ]
            },
            { id: 'p5', title: '5. Điều kiện và khả năng áp dụng', content: '', status: 'empty' },
            { id: 'p6', title: 'TÀI LIỆU THAM KHẢO', content: '', status: 'empty' },
        ]
    },
];

// Helper to get all sections as writable (flat list)
export function getLeafSections(sections: Section[]): Section[] {
    const result: Section[] = [];
    for (const s of sections) {
        // ALWAYS add the current section so the user can write in it
        result.push(s);
        // And also add its subsections if any
        if (s.subsections && s.subsections.length > 0) {
            result.push(...getLeafSections(s.subsections));
        }
    }
    return result;
}

// Deep clone sections
export function cloneSections(sections: Section[]): Section[] {
    return JSON.parse(JSON.stringify(sections));
}
