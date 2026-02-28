// Types and constants for SKKN Writer

export type ReportType = 'skkn' | 'gv_gioi' | 'gvcn_gioi';

export interface TopicInfo {
    title: string;
    subject: string;
    level: string;
    target: string;
    context: string;
    author: string;
    school: string;
    department: string;
    year: string;
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
                { id: 's2c', title: '3. Các giải pháp/biện pháp đã thực hiện', content: '', status: 'empty' },
                { id: 's2d', title: '4. Kết quả đạt được', content: '', status: 'empty' },
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
            id: 'g1', title: 'PHẦN MỞ ĐẦU', content: '', status: 'empty', subsections: [
                { id: 'g1a', title: '1. Lý do chọn biện pháp', content: '', status: 'empty' },
                { id: 'g1b', title: '2. Mục đích', content: '', status: 'empty' },
                { id: 'g1c', title: '3. Đối tượng áp dụng', content: '', status: 'empty' },
            ]
        },
        {
            id: 'g2', title: 'PHẦN NỘI DUNG', content: '', status: 'empty', subsections: [
                { id: 'g2a', title: '1. Cơ sở lý luận và thực tiễn', content: '', status: 'empty' },
                { id: 'g2b', title: '2. Nội dung biện pháp', content: '', status: 'empty' },
                { id: 'g2c', title: '3. Kết quả thực hiện', content: '', status: 'empty' },
            ]
        },
        {
            id: 'g3', title: 'KẾT LUẬN VÀ KIẾN NGHỊ', content: '', status: 'empty', subsections: [
                { id: 'g3a', title: '1. Kết luận', content: '', status: 'empty' },
                { id: 'g3b', title: '2. Kiến nghị', content: '', status: 'empty' },
            ]
        },
        { id: 'g4', title: 'TÀI LIỆU THAM KHẢO', content: '', status: 'empty' },
    ],
    gvcn_gioi: [
        {
            id: 'c1', title: 'PHẦN MỞ ĐẦU', content: '', status: 'empty', subsections: [
                { id: 'c1a', title: '1. Lý do chọn biện pháp', content: '', status: 'empty' },
                { id: 'c1b', title: '2. Mục đích', content: '', status: 'empty' },
                { id: 'c1c', title: '3. Đối tượng và phạm vi', content: '', status: 'empty' },
            ]
        },
        {
            id: 'c2', title: 'PHẦN NỘI DUNG', content: '', status: 'empty', subsections: [
                { id: 'c2a', title: '1. Thực trạng công tác chủ nhiệm', content: '', status: 'empty' },
                { id: 'c2b', title: '2. Biện pháp thực hiện', content: '', status: 'empty' },
                { id: 'c2c', title: '3. Kết quả đạt được', content: '', status: 'empty' },
            ]
        },
        {
            id: 'c3', title: 'KẾT LUẬN VÀ KIẾN NGHỊ', content: '', status: 'empty', subsections: [
                { id: 'c3a', title: '1. Kết luận', content: '', status: 'empty' },
                { id: 'c3b', title: '2. Kiến nghị', content: '', status: 'empty' },
            ]
        },
        { id: 'c4', title: 'TÀI LIỆU THAM KHẢO', content: '', status: 'empty' },
    ],
};

// Helper to get all leaf sections (for writing)
export function getLeafSections(sections: Section[]): Section[] {
    const result: Section[] = [];
    for (const s of sections) {
        if (s.subsections && s.subsections.length > 0) {
            result.push(...getLeafSections(s.subsections));
        } else {
            result.push(s);
        }
    }
    return result;
}

// Deep clone sections
export function cloneSections(sections: Section[]): Section[] {
    return JSON.parse(JSON.stringify(sections));
}
