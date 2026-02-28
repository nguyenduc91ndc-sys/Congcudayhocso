import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Sparkles, FileDown, Search, Upload, Save, Trash2, Plus, Loader2, X, RefreshCw, CheckCircle, ChevronDown, BookOpen, Table2, Maximize2, Minimize2, Wand2, BarChart3, PieChart } from 'lucide-react';
import {
    ReportType, TopicInfo, Section, SKKNDocument,
    AICheckResult, PlagiarismResult,
    REPORT_TYPES, LEVELS, DEFAULT_SECTIONS,
    getLeafSections, cloneSections
} from '../utils/skknTypes';
import {
    getGroqApiKey, setGroqApiKey, groqStream,
    buildSectionPrompt, buildAIDetectionPrompt,
    buildPlagiarismPrompt, buildHumanizePrompt,
    buildExpandPrompt, buildShortenPrompt,
    buildTablePrompt, buildReferencePrompt,
    buildChartDataPrompt
} from '../utils/groqApi';
import { exportToWord } from '../utils/wordExport';
import { generateBarChart, generatePieChart, parseChartData } from '../utils/chartGenerator';
import { submitSKKNFeedback } from '../utils/firebaseSKKNFeedback';
import { isEmailSKKNPro, validateSKKNProKey, activateSKKNProForEmail } from '../utils/firebaseSKKNProKeys';
import './SangKienKinhNghiem.css';

interface Props {
    onBack: () => void;
    isAdmin?: boolean;
    userEmail?: string;
    userName?: string;
}

type AppView = 'landing' | 'form' | 'editor' | 'check' | 'feedback_admin';

const STORAGE_KEY = 'skkn_documents';

// Word count targets per section type (approximate)
const WORD_TARGETS: Record<string, { min: number; max: number }> = {
    'default': { min: 300, max: 800 },
    'Lý do chọn đề tài': { min: 500, max: 1000 },
    'Mục đích nghiên cứu': { min: 200, max: 500 },
    'Đối tượng nghiên cứu': { min: 150, max: 400 },
    'Phương pháp nghiên cứu': { min: 200, max: 500 },
    'Giới hạn phạm vi nghiên cứu': { min: 150, max: 400 },
    'Cơ sở lý luận': { min: 600, max: 1500 },
    'Cơ sở thực tiễn': { min: 600, max: 1500 },
    'Nội dung biện pháp': { min: 1000, max: 3000 },
    'Kết quả': { min: 400, max: 1000 },
    'Kết luận': { min: 300, max: 800 },
    'Kiến nghị': { min: 200, max: 500 },
};

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function getWordTarget(title: string) {
    for (const key of Object.keys(WORD_TARGETS)) {
        if (title.toLowerCase().includes(key.toLowerCase())) return WORD_TARGETS[key];
    }
    return WORD_TARGETS['default'];
}

function loadDocs(): SKKNDocument[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
}
function saveDocs(docs: SKKNDocument[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

const SangKienKinhNghiem: React.FC<Props> = ({ onBack, isAdmin, userEmail, userName }) => {
    const [appView, setAppView] = useState<AppView>('landing');
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackContent, setFeedbackContent] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [apiKey, setApiKeyState] = useState(getGroqApiKey());
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [reportType, setReportType] = useState<ReportType>('skkn');
    const [topicInfo, setTopicInfo] = useState<TopicInfo>({
        title: '', subject: '', level: 'Tiểu học', target: '', context: '',
        author: '', school: '', department: '', year: '2025-2026',
    });
    const [sections, setSections] = useState<Section[]>([]);
    const [activeSection, setActiveSection] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [savedDocs, setSavedDocs] = useState<SKKNDocument[]>(loadDocs());
    const [currentDocId, setCurrentDocId] = useState<string>('');
    const [showCheck, setShowCheck] = useState(false);
    const [aiResult, setAiResult] = useState<AICheckResult | null>(null);
    const [plagResult, setPlagResult] = useState<PlagiarismResult | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState('');
    const [showAIMenu, setShowAIMenu] = useState(false);
    const [chartImages, setChartImages] = useState<Record<string, string[]>>({});
    const [isSKKNPro, setIsSKKNPro] = useState(false);
    const [showProModal, setShowProModal] = useState(false);
    const [proKeyInput, setProKeyInput] = useState('');
    const [proActivating, setProActivating] = useState(false);
    const [proError, setProError] = useState('');
    const [proSuccess, setProSuccess] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Check Pro status on mount
    useEffect(() => {
        if (isAdmin) { setIsSKKNPro(true); return; }
        if (userEmail) {
            isEmailSKKNPro(userEmail).then(isPro => setIsSKKNPro(isPro));
        }
    }, [userEmail, isAdmin]);

    // Pro gate helper
    const requirePro = (): boolean => {
        if (isSKKNPro || isAdmin) return true;
        setShowProModal(true);
        return false;
    };

    // Activate Pro key
    const handleActivatePro = async () => {
        if (!proKeyInput.trim()) { setProError('Vui lòng nhập mã kích hoạt'); return; }
        setProActivating(true);
        setProError('');
        try {
            const result = await validateSKKNProKey(proKeyInput);
            if (!result.valid) { setProError('Mã không hợp lệ hoặc đã hết hạn'); setProActivating(false); return; }
            if (userEmail) {
                await activateSKKNProForEmail(userEmail, proKeyInput.toUpperCase().trim());
            }
            setIsSKKNPro(true);
            setProSuccess(true);
            setTimeout(() => { setShowProModal(false); setProSuccess(false); setProKeyInput(''); }, 1500);
        } catch { setProError('Lỗi kích hoạt, vui lòng thử lại'); }
        setProActivating(false);
    };

    // Save API key
    const handleSaveApiKey = () => {
        if (apiKeyInput.trim()) {
            setGroqApiKey(apiKeyInput.trim());
            setApiKeyState(apiKeyInput.trim());
            setApiKeyInput('');
        }
    };

    // Select report type and go to form
    const handleSelectType = (type: ReportType) => {
        setReportType(type);
        setSections(cloneSections(DEFAULT_SECTIONS[type]));
        setAppView('form');
    };

    // Start editing
    const handleStartWriting = () => {
        if (!topicInfo.title.trim()) {
            setError('Vui lòng nhập tên đề tài');
            return;
        }
        if (!apiKey) {
            setError('Vui lòng nhập Groq API Key');
            return;
        }
        setError('');
        const leaves = getLeafSections(sections);
        if (leaves.length > 0) setActiveSection(leaves[0].id);
        const docId = currentDocId || `skkn_${Date.now()}`;
        setCurrentDocId(docId);
        setAppView('editor');
    };

    // Load saved document
    const handleLoadDoc = (doc: SKKNDocument) => {
        setReportType(doc.reportType);
        setTopicInfo(doc.topicInfo);
        setSections(cloneSections(doc.sections));
        setCurrentDocId(doc.id);
        const leaves = getLeafSections(doc.sections);
        if (leaves.length > 0) setActiveSection(leaves[0].id);
        setAppView('editor');
    };

    // Submit Feedback
    const handleSubmitFeedback = async () => {
        if (!feedbackContent.trim()) {
            alert('Vui lòng nhập nội dung góp ý.');
            return;
        }
        setIsSubmittingFeedback(true);
        try {
            const success = await submitSKKNFeedback(feedbackContent, userEmail, userName);
            if (success) {
                alert('Cảm ơn bạn đã góp ý! Ý kiến của bạn sẽ giúp ứng dụng hoàn thiện hơn.');
                setFeedbackContent('');
                setShowFeedbackModal(false);
            } else {
                alert('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
            }
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    // Delete saved document
    const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Xóa bài viết này?')) {
            const updated = savedDocs.filter(d => d.id !== id);
            setSavedDocs(updated);
            saveDocs(updated);
        }
    };

    // Save current document
    const handleSaveDoc = useCallback(() => {
        const doc: SKKNDocument = {
            id: currentDocId || `skkn_${Date.now()}`,
            reportType,
            topicInfo,
            sections: cloneSections(sections),
            createdAt: savedDocs.find(d => d.id === currentDocId)?.createdAt || Date.now(),
            updatedAt: Date.now(),
        };
        const idx = savedDocs.findIndex(d => d.id === doc.id);
        const updated = idx >= 0 ? [...savedDocs.slice(0, idx), doc, ...savedDocs.slice(idx + 1)] : [...savedDocs, doc];
        setSavedDocs(updated);
        saveDocs(updated);
        setCurrentDocId(doc.id);
    }, [currentDocId, reportType, topicInfo, sections, savedDocs]);

    // Update section content
    const updateSectionContent = (sectionId: string, content: string) => {
        const update = (secs: Section[]): Section[] =>
            secs.map(s => {
                if (s.id === sectionId) return { ...s, content, status: content.trim() ? 'done' as const : 'empty' as const };
                if (s.subsections) return { ...s, subsections: update(s.subsections) };
                return s;
            });
        setSections(prev => update(prev));
    };

    // Get current section content
    const getActiveContent = (): string => {
        const find = (secs: Section[]): string => {
            for (const s of secs) {
                if (s.id === activeSection) return s.content;
                if (s.subsections) { const r = find(s.subsections); if (r !== '') return r; }
            }
            return '';
        };
        return find(sections);
    };

    // Get active section title
    const getActiveSectionTitle = (): string => {
        const find = (secs: Section[]): string => {
            for (const s of secs) {
                if (s.id === activeSection) return s.title;
                if (s.subsections) { const r = find(s.subsections); if (r) return r; }
            }
            return '';
        };
        return find(sections);
    };

    // Calculate progress
    const getProgress = (): number => {
        const leaves = getLeafSections(sections);
        if (leaves.length === 0) return 0;
        const done = leaves.filter(s => s.content && s.content.trim().length > 50).length;
        return Math.round((done / leaves.length) * 100);
    };

    // Generic AI action on content
    const runAIAction = async (messages: { role: 'system' | 'user' | 'assistant'; content: string }[], replace = true) => {
        if (!apiKey || isStreaming) return;
        setIsStreaming(true);
        setError('');
        setShowAIMenu(false);

        let result = replace ? '' : getActiveContent() + '\n\n';

        const markWriting = (secs: Section[]): Section[] =>
            secs.map(s => {
                if (s.id === activeSection) return { ...s, status: 'writing' as const };
                if (s.subsections) return { ...s, subsections: markWriting(s.subsections) };
                return s;
            });
        setSections(prev => markWriting(prev));

        const controller = await groqStream(
            messages,
            apiKey,
            (chunk: string) => {
                result += chunk;
                updateSectionContent(activeSection, result);
            },
            () => {
                setIsStreaming(false);
                updateSectionContent(activeSection, result);
            },
            (err: Error) => {
                setIsStreaming(false);
                setError(`Lỗi AI: ${err.message}`);
            }
        );
        abortRef.current = controller;
    };

    // AI Write section
    const handleAIWrite = async () => {
        const leaves = getLeafSections(sections);
        const activeIdx = leaves.findIndex(s => s.id === activeSection);
        const prevContent = leaves.slice(0, activeIdx).map(s => `## ${s.title}\n${s.content}`).join('\n\n');

        const messages = buildSectionPrompt(
            REPORT_TYPES[reportType].label,
            getActiveSectionTitle(),
            topicInfo,
            prevContent
        );

        // Append to existing content instead of replacing
        if (!apiKey || isStreaming) return;
        setIsStreaming(true);
        setError('');

        let accumulated = getActiveContent();
        if (accumulated.trim()) accumulated += '\n\n';

        const markWriting = (secs: Section[]): Section[] =>
            secs.map(s => {
                if (s.id === activeSection) return { ...s, status: 'writing' as const };
                if (s.subsections) return { ...s, subsections: markWriting(s.subsections) };
                return s;
            });
        setSections(prev => markWriting(prev));

        const controller = await groqStream(
            messages,
            apiKey,
            (chunk: string) => {
                accumulated += chunk;
                updateSectionContent(activeSection, accumulated);
            },
            () => {
                setIsStreaming(false);
                updateSectionContent(activeSection, accumulated);
            },
            (err: Error) => {
                setIsStreaming(false);
                setError(`Lỗi AI: ${err.message}`);
            }
        );
        abortRef.current = controller;
    };

    // Stop streaming
    const handleStopStreaming = () => {
        abortRef.current?.abort();
        setIsStreaming(false);
    };

    // AI Check (plagiarism + AI detection) - runs 2 times and averages for stability
    const handleCheck = async () => {
        const content = getActiveContent();
        if (!content.trim() || !apiKey) return;
        setShowCheck(true);
        setIsChecking(true);
        setAiResult(null);
        setPlagResult(null);
        setError('');

        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

        try {
            // AI Detection - run 2 times with delay, average scores
            const aiMessages = buildAIDetectionPrompt(content);
            const aiScores: { humanScore: number; aiScore: number }[] = [];
            let lastAiResult: AICheckResult | null = null;

            // Run 1: main model
            let aiText1 = '';
            await groqStream(aiMessages, apiKey, (c: string) => { aiText1 += c; }, () => {
                try {
                    const jsonMatch = aiText1.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        aiScores.push({ humanScore: parsed.humanScore || 0, aiScore: parsed.aiScore || 0 });
                        lastAiResult = parsed;
                    }
                } catch { /* ignore */ }
            }, () => { }, 'llama-3.3-70b-versatile', 0.1);

            // Wait to avoid rate limit
            await delay(3000);

            // Run 2: same model, slight variation for averaging
            let aiText2 = '';
            await groqStream(aiMessages, apiKey, (c: string) => { aiText2 += c; }, () => {
                try {
                    const jsonMatch = aiText2.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        aiScores.push({ humanScore: parsed.humanScore || 0, aiScore: parsed.aiScore || 0 });
                        if (!lastAiResult) lastAiResult = parsed;
                    }
                } catch { /* ignore */ }
            }, () => { }, 'llama-3.3-70b-versatile', 0.1);

            // Average the scores (works with 1 or 2 results)
            if (aiScores.length > 0 && lastAiResult) {
                const avgHuman = Math.round(aiScores.reduce((s, r) => s + r.humanScore, 0) / aiScores.length);
                const avgAI = Math.round(aiScores.reduce((s, r) => s + r.aiScore, 0) / aiScores.length);
                setAiResult({
                    ...(lastAiResult as AICheckResult),
                    humanScore: avgHuman,
                    aiScore: avgAI,
                });
            } else {
                setError('Không thể phân tích. Vui lòng thử lại sau vài giây.');
            }

            await delay(2000);

            // Plagiarism check
            const plagMessages = buildPlagiarismPrompt(content);
            let plagText = '';
            await groqStream(plagMessages, apiKey, (c: string) => { plagText += c; }, () => {
                try {
                    const jsonMatch = plagText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) setPlagResult(JSON.parse(jsonMatch[0]));
                } catch { setError('Không thể phân tích kết quả plagiarism'); }
            }, (e: Error) => setError(e.message), 'llama-3.3-70b-versatile', 0.1);
        } finally {
            setIsChecking(false);
        }
    };

    // AI fix content after check (humanize to reduce AI score)
    const handleAIFix = async () => {
        const content = getActiveContent();
        if (!content.trim() || !apiKey || isStreaming) return;
        setShowCheck(false);
        await runAIAction(buildHumanizePrompt(content), true);
    };

    // Expand content
    const handleExpand = async () => {
        const content = getActiveContent();
        if (!content.trim()) return;
        await runAIAction(buildExpandPrompt(content), true);
    };

    // Shorten content
    const handleShorten = async () => {
        const content = getActiveContent();
        if (!content.trim()) return;
        await runAIAction(buildShortenPrompt(content), true);
    };

    // Generate table
    const handleGenTable = async () => {
        await runAIAction(buildTablePrompt(topicInfo.title, getActiveSectionTitle()), false);
    };

    // Generate references
    const handleGenReferences = async () => {
        await runAIAction(buildReferencePrompt(topicInfo.title, topicInfo.subject), false);
    };

    // Humanize
    const handleHumanize = async () => {
        const content = getActiveContent();
        if (!content.trim()) return;
        await runAIAction(buildHumanizePrompt(content), true);
    };

    // Generate chart (bar or pie)
    const handleGenChart = async (chartType: 'bar' | 'pie') => {
        if (!apiKey || isStreaming) return;
        setIsStreaming(true);
        setShowAIMenu(false);
        setError('');

        const messages = buildChartDataPrompt(
            chartType,
            topicInfo.title,
            getActiveSectionTitle(),
            getActiveContent()
        );

        let result = '';
        await groqStream(
            messages,
            apiKey,
            (chunk: string) => { result += chunk; },
            () => {
                setIsStreaming(false);
                const chartData = parseChartData(result);
                if (chartData) {
                    const imgBase64 = chartType === 'bar'
                        ? generateBarChart(chartData)
                        : generatePieChart(chartData);

                    // Store chart image for this section
                    setChartImages(prev => ({
                        ...prev,
                        [activeSection]: [...(prev[activeSection] || []), imgBase64]
                    }));
                } else {
                    setError('Không thể tạo biểu đồ. Vui lòng thử lại.');
                }
            },
            (err: Error) => {
                setIsStreaming(false);
                setError(`Lỗi: ${err.message}`);
            },
            'llama-3.3-70b-versatile',
            0.5
        );
    };

    // Delete a chart
    const handleDeleteChart = (sectionId: string, index: number) => {
        setChartImages(prev => {
            const images = [...(prev[sectionId] || [])];
            images.splice(index, 1);
            return { ...prev, [sectionId]: images };
        });
    };

    // Export as Word file (with charts)
    const handleExport = () => {
        exportToWord(sections, topicInfo, reportType, chartImages);
    };

    // Upload structure from file
    const handleUploadStructure = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !apiKey) return;

        setIsStreaming(true);
        setError('');
        let text = '';

        try {
            if (file.name.endsWith('.txt') || file.name.endsWith('.text')) {
                text = await file.text();
            } else if (file.name.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                // @ts-ignore - mammoth is loaded via CDN
                const result = await window.mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            } else if (file.name.endsWith('.pdf')) {
                const arrayBuffer = await file.arrayBuffer();
                // @ts-ignore - pdfjsLib is loaded via CDN
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const pageText = content.items.map((item: any) => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                text = fullText;
            } else {
                throw new Error('Định dạng file không được hỗ trợ. Vui lòng thử lại với file .txt, .docx, hoặc .pdf.');
            }

            if (!text || !text.trim()) {
                throw new Error('Không có chữ nào được tìm thấy trong file.');
            }
        } catch (err: any) {
            setIsStreaming(false);
            setError(`Lỗi đọc file: ${err.message}`);
            e.target.value = '';
            return;
        }

        const messages = [
            {
                role: 'system' as const, content: `Phân tích cấu trúc mục lục từ file và trả về JSON mảng sections theo format:
[{"id":"s1","title":"TÊN PHẦN","content":"","status":"empty","subsections":[{"id":"s1a","title":"Tên mục con","content":"","status":"empty"}]}]
Chỉ trả về JSON, không giải thích.` },
            { role: 'user' as const, content: `Phân tích cấu trúc từ nội dung file sau:\n\n${text.slice(0, 4000)}` }
        ];

        let result = '';
        await groqStream(messages, apiKey,
            (c: string) => { result += c; },
            () => {
                setIsStreaming(false);
                try {
                    const jsonMatch = result.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        setSections(parsed);
                    }
                } catch { setError('Không thể phân tích cấu trúc file. Thử lại.'); }
            },
            (e: Error) => { setIsStreaming(false); setError(e.message); }
        );
        e.target.value = '';
    };

    // Auto-save every 30s
    useEffect(() => {
        if (appView !== 'editor' || !currentDocId) return;
        const timer = setInterval(handleSaveDoc, 30000);
        return () => clearInterval(timer);
    }, [appView, currentDocId, handleSaveDoc]);

    // Render word count badge
    const renderWordCount = () => {
        const content = getActiveContent();
        const words = countWords(content);
        const target = getWordTarget(getActiveSectionTitle());
        const pct = Math.min(100, Math.round((words / target.max) * 100));
        const cls = words < target.min ? 'skkn-wc-low' : words > target.max ? 'skkn-wc-over' : 'skkn-wc-ok';
        return (
            <div className={`skkn-word-count ${cls}`}>
                <span>{words} từ</span>
                <span className="skkn-wc-target">(mục tiêu: {target.min}-{target.max})</span>
                <div className="skkn-wc-bar">
                    <div className="skkn-wc-fill" style={{ width: `${pct}%` }} />
                </div>
            </div>
        );
    };

    // Render score circle
    const renderScore = (score: number, label: string) => {
        const cls = score >= 70 ? 'good' : score >= 40 ? 'warn' : 'bad';
        return (
            <div className="skkn-score">
                <div className={`skkn-score-circle skkn-score-${cls}`}>{score}%</div>
                <div className="skkn-score-label">{label}</div>
            </div>
        );
    };

    // Render progress bar
    const renderProgressBar = () => {
        const progress = getProgress();
        return (
            <div className="skkn-progress-container">
                <div className="skkn-progress-label">
                    <span>📊 Tiến độ</span>
                    <span>{progress}%</span>
                </div>
                <div className="skkn-progress-bar">
                    <div
                        className="skkn-progress-fill"
                        style={{
                            width: `${progress}%`,
                            background: progress === 100 ? '#22c55e' : progress > 50 ? '#818cf8' : '#f59e0b'
                        }}
                    />
                </div>
            </div>
        );
    };

    // Render section list in sidebar
    const renderSections = (secs: Section[], depth = 0) => {
        return secs.map(sec => (
            <React.Fragment key={sec.id}>
                {sec.subsections ? (
                    <>
                        <div className="skkn-section-item parent" style={{ paddingLeft: 12 + depth * 12 }}>
                            {sec.title}
                        </div>
                        {renderSections(sec.subsections, depth + 1)}
                    </>
                ) : (
                    <div
                        className={`skkn-section-item ${activeSection === sec.id ? 'active' : ''}`}
                        style={{ paddingLeft: 12 + depth * 12 }}
                        onClick={() => setActiveSection(sec.id)}
                    >
                        <span className={`skkn-section-status ${sec.status}`} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sec.title}
                        </span>
                        {sec.content && <span className="skkn-section-wc">{countWords(sec.content)}</span>}
                    </div>
                )}
            </React.Fragment>
        ));
    };

    return (
        <div className="skkn-app">
            {/* Header */}
            <div className="skkn-header">
                <button className="skkn-back-btn" onClick={
                    appView === 'editor'
                        ? () => { handleSaveDoc(); setAppView('landing'); }
                        : appView === 'form'
                            ? () => setAppView('landing')
                            : onBack
                }>
                    <ArrowLeft size={18} />
                </button>
                <div className="skkn-header-icon">✍️</div>
                <div className="skkn-header-text">
                    <h1>Viết SKKN & Báo Cáo Biện Pháp</h1>
                    <p>2 trong 1: Viết AI + Quét AI & Cá nhân hóa như người thật</p>
                </div>
                {appView === 'editor' && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button className="skkn-btn skkn-btn-secondary" onClick={handleSaveDoc} title="Lưu">
                            <Save size={16} /> Lưu
                        </button>
                        <button className="skkn-btn skkn-btn-secondary" onClick={() => { if (requirePro()) handleExport(); }} title="Xuất file Word">
                            <FileDown size={16} /> Xuất Word {!isSKKNPro && '🔒'}
                        </button>
                    </div>
                )}
                {appView !== 'editor' && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        {isAdmin && (
                            <button
                                className="skkn-btn skkn-btn-secondary"
                                style={{ padding: '6px 12px', fontSize: 13, borderColor: '#f59e0b', color: '#b45309' }}
                                onClick={() => setAppView('feedback_admin')}
                            >
                                <span className="skkn-header-icon" style={{ fontSize: 14, marginRight: 4, width: 'auto', height: 'auto', background: 'none' }}>👑</span>
                                Quản lý Góp ý
                            </button>
                        )}
                        <button
                            className="skkn-btn"
                            style={{
                                padding: '8px 16px', fontSize: 13, fontWeight: 700,
                                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                                color: 'white', border: 'none', borderRadius: 12,
                                boxShadow: '0 4px 15px rgba(245,158,11,0.4)',
                                animation: 'pulse-soft 2s infinite',
                                position: 'relative'
                            }}
                            onClick={() => setShowFeedbackModal(true)}
                        >
                            <span style={{
                                position: 'absolute', top: -6, right: -6,
                                background: '#ef4444', color: 'white',
                                fontSize: 9, fontWeight: 800, padding: '2px 6px',
                                borderRadius: 8, border: '2px solid #1e293b',
                                animation: 'bounce 1s infinite'
                            }}>Mới</span>
                            💡 Góp ý sản phẩm
                        </button>
                    </div>
                )}
            </div>

            {/* Error banner */}
            {error && (
                <div className="skkn-alert skkn-alert-error" style={{ margin: '12px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            {error.toLowerCase().includes('rate') || error.toLowerCase().includes('limit') || error.includes('429') || error.includes('giới hạn') ? (
                                <>
                                    <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠️ Đã đạt giới hạn API</div>
                                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                                        API Key hiện tại đã hết lượt sử dụng miễn phí. Bạn có thể:
                                    </div>
                                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button
                                            className="skkn-btn skkn-btn-primary"
                                            style={{ padding: '6px 14px', fontSize: 13 }}
                                            onClick={() => {
                                                setError('');
                                                setApiKeyState('');
                                                setGroqApiKey('');
                                                if (appView === 'editor') setAppView('landing');
                                            }}
                                        >
                                            🔑 Đổi API Key khác
                                        </button>
                                        <a
                                            href="https://console.groq.com/keys"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="skkn-btn skkn-btn-secondary"
                                            style={{ padding: '6px 14px', fontSize: 13, textDecoration: 'none' }}
                                        >
                                            ➕ Tạo key mới miễn phí
                                        </a>
                                        <button
                                            className="skkn-btn skkn-btn-secondary"
                                            style={{ padding: '6px 14px', fontSize: 13 }}
                                            onClick={() => setError('')}
                                        >
                                            ⏳ Đợi 1 phút rồi thử lại
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <span>{error}</span>
                            )}
                        </div>
                        <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', flexShrink: 0 }}><X size={16} /></button>
                    </div>
                </div>
            )}

            {/* === LANDING === */}
            {appView === 'landing' && (
                <>
                    <div className="skkn-landing">
                        <div className="skkn-landing-title">
                            <h2>✍️ Viết SKKN thông minh</h2>
                            <p style={{ fontSize: 18, maxWidth: 650, lineHeight: 1.6 }}>Công cụ <strong style={{ color: '#a5b4fc' }}>2 trong 1</strong> duy nhất: AI viết nội dung chuyên sâu <em>+</em> Quét & sửa tự động để <strong style={{ color: '#34d399' }}>vượt qua trình kiểm tra AI</strong>. Văn phong tự nhiên, cá nhân hóa như giáo viên thật viết.</p>
                            <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <span className="skkn-badge">🤖 Viết AI tốc độ cao</span>
                                <span className="skkn-badge">🔍 Quét đạo văn & AI</span>
                                <span className="skkn-badge">🧑‍🏫 Cá nhân hóa như người thật</span>
                                <span className="skkn-badge">📊 Biểu đồ & Bảng biểu</span>
                                <span className="skkn-badge">📄 Xuất Word chuẩn</span>
                            </div>
                        </div>

                        {/* API Key Setup */}
                        {!apiKey && (
                            <div className="skkn-api-setup">
                                <h3>🔑 Nhập Groq API Key</h3>
                                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px' }}>
                                    Lấy miễn phí tại <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>console.groq.com</a>
                                </p>
                                <div className="skkn-api-input-group">
                                    <input
                                        className="skkn-input"
                                        type="password"
                                        placeholder="gsk_..."
                                        value={apiKeyInput}
                                        onChange={e => setApiKeyInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
                                    />
                                    <button className="skkn-btn skkn-btn-primary" onClick={handleSaveApiKey}>Lưu</button>
                                </div>
                                <a
                                    href="https://youtu.be/aZR6pZip4M0"
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        marginTop: 12, padding: '8px 16px', borderRadius: 10,
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: '#fff', fontSize: 13, fontWeight: 600,
                                        textDecoration: 'none', boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                    }}
                                    onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.05)'; }}
                                    onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                                >
                                    ▶️ Video hướng dẫn lấy API Key
                                </a>
                            </div>
                        )}
                        {apiKey && (
                            <div className="skkn-alert skkn-alert-info" style={{ maxWidth: 500, textAlign: 'center' }}>
                                ✅ API Key đã cấu hình •{' '}
                                <button onClick={() => { setGroqApiKey(''); setApiKeyState(''); }} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', textDecoration: 'underline' }}>
                                    Xóa key
                                </button>
                            </div>
                        )}

                        {/* Report type cards */}
                        <div className="skkn-cards">
                            {(Object.entries(REPORT_TYPES) as [ReportType, typeof REPORT_TYPES[ReportType]][]).map(([key, val]) => (
                                <div key={key} className="skkn-card" onClick={() => handleSelectType(key)}>
                                    <div className="skkn-card-icon">{val.icon}</div>
                                    <h3>{val.label}</h3>
                                    <p>{val.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Saved documents */}
                        {savedDocs.length > 0 && (
                            <div className="skkn-docs-section">
                                <h3>📂 Bài viết đã lưu</h3>
                                {savedDocs.map(doc => (
                                    <div key={doc.id} className="skkn-doc-item" onClick={() => handleLoadDoc(doc)}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'white' }}>
                                                {REPORT_TYPES[doc.reportType].icon} {doc.topicInfo.title || 'Chưa đặt tên'}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                                {REPORT_TYPES[doc.reportType].label} • {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                        <button className="skkn-btn skkn-btn-danger" onClick={(e) => handleDeleteDoc(doc.id, e)} style={{ padding: '6px 10px' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{
                        textAlign: 'center', padding: '30px 0 20px', marginTop: 30,
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        color: '#64748b', fontSize: 13
                    }}>
                        <p style={{ margin: 0, fontWeight: 500, color: '#94a3b8' }}>
                            Bản quyền © 2026 <span style={{ color: '#818cf8' }}>@giaovienyeucongnghe</span>
                        </p>
                        <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.7 }}>
                            Phát triển giải pháp ứng dụng Trí tuệ Nhân tạo dành riêng cho Giáo viên
                        </p>
                    </div>
                </>
            )}

            {/* === FORM === */}
            {appView === 'form' && (
                <div className="skkn-form">
                    <h2>{REPORT_TYPES[reportType].icon} {REPORT_TYPES[reportType].label}</h2>

                    <div className="skkn-field">
                        <label>📌 Tên đề tài / biện pháp *</label>
                        <input className="skkn-input" placeholder={reportType === 'gvcn_gioi' ? "VD: Một số biện pháp xây dựng lớp học thân thiện, học sinh tích cực..." : "VD: Một số biện pháp nâng cao chất lượng dạy học môn Toán..."}
                            value={topicInfo.title} onChange={e => setTopicInfo({ ...topicInfo, title: e.target.value })} />
                    </div>

                    <div className="skkn-row">
                        {reportType !== 'gvcn_gioi' && (
                            <div className="skkn-field">
                                <label>📚 Môn / Lĩnh vực</label>
                                <input className="skkn-input" placeholder={reportType === 'skkn' ? "VD: Toán, Ngữ văn, Sinh học..." : "VD: Toán, Ngữ văn, Tin học..."}
                                    value={topicInfo.subject} onChange={e => setTopicInfo({ ...topicInfo, subject: e.target.value })} />
                            </div>
                        )}
                        <div className="skkn-field">
                            <label>🏫 Cấp học</label>
                            <select className="skkn-select" value={topicInfo.level} onChange={e => setTopicInfo({ ...topicInfo, level: e.target.value })}>
                                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="skkn-row">
                        <div className="skkn-field">
                            <label>👤 Tác giả</label>
                            <input className="skkn-input" placeholder="Họ và tên"
                                value={topicInfo.author} onChange={e => setTopicInfo({ ...topicInfo, author: e.target.value })} />
                        </div>
                        <div className="skkn-field">
                            <label>🏫 Trường</label>
                            <input className="skkn-input" placeholder="Tên trường"
                                value={topicInfo.school} onChange={e => setTopicInfo({ ...topicInfo, school: e.target.value })} />
                        </div>
                    </div>

                    <div className="skkn-row">
                        <div className="skkn-field">
                            <label>🏛️ UBND/Sở GD&ĐT</label>
                            <input className="skkn-input" placeholder="VD: UBND xã X, Sở GD&ĐT tỉnh Y"
                                value={topicInfo.department} onChange={e => setTopicInfo({ ...topicInfo, department: e.target.value })} />
                        </div>
                        <div className="skkn-field">
                            <label>📅 Năm học</label>
                            <input className="skkn-input" placeholder="2025-2026"
                                value={topicInfo.year} onChange={e => setTopicInfo({ ...topicInfo, year: e.target.value })} />
                        </div>
                    </div>

                    <div className="skkn-field">
                        <label>👥 Đối tượng áp dụng</label>
                        <input className="skkn-input" placeholder="VD: Học sinh lớp 4, lớp 5..."
                            value={topicInfo.target} onChange={e => setTopicInfo({ ...topicInfo, target: e.target.value })} />
                    </div>

                    <div className="skkn-field">
                        <label>📝 Bối cảnh / Mô tả thêm</label>
                        <textarea className="skkn-textarea" placeholder="Mô tả thêm về bối cảnh, khó khăn, thuận lợi..."
                            value={topicInfo.context} onChange={e => setTopicInfo({ ...topicInfo, context: e.target.value })} />
                    </div>

                    {/* Upload custom structure */}
                    <div className="skkn-field">
                        <label>📂 Tải cấu trúc địa phương (tùy chọn)</label>
                        <label className="skkn-upload-area">
                            <Upload size={32} style={{ color: '#818cf8', marginBottom: 8 }} />
                            <div style={{ color: '#94a3b8', fontSize: 14 }}>Kéo thả hoặc click để tải lên file cấu trúc (Word/PDF/TXT)</div>
                            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Hỗ trợ file .docx, .pdf, .txt có đánh mục lục rõ ràng</div>
                            <input type="file" accept=".txt,.text,.docx,.pdf" style={{ display: 'none' }} onChange={handleUploadStructure} />
                        </label>
                        {isStreaming && <div className="skkn-streaming"><div className="skkn-streaming-dot" /> Đang phân tích cấu trúc...</div>}
                    </div>

                    <div className="skkn-form-actions">
                        <button className="skkn-btn skkn-btn-secondary" onClick={() => setAppView('landing')}>← Quay lại</button>
                        <button className="skkn-btn skkn-btn-primary" onClick={handleStartWriting} disabled={isStreaming}>
                            <Sparkles size={16} /> Bắt đầu viết
                        </button>
                    </div>
                </div>
            )}

            {/* === EDITOR === */}
            {appView === 'editor' && (
                <div className="skkn-editor">
                    {/* Sidebar */}
                    <div className="skkn-sidebar">
                        <div className="skkn-sidebar-header">
                            <h3>📋 Cấu trúc</h3>
                        </div>
                        {renderProgressBar()}
                        <div className="skkn-section-list">
                            {renderSections(sections)}
                        </div>
                    </div>

                    {/* Main editor */}
                    <div className="skkn-main">
                        <div className="skkn-editor-toolbar">
                            <button className="skkn-btn skkn-btn-primary" onClick={() => { if (requirePro()) handleAIWrite(); }} disabled={isStreaming || !activeSection}>
                                {isStreaming ? <><div className="skkn-spinner" /> Đang viết...</> : <><Sparkles size={16} /> Viết với AI {!isSKKNPro && '🔒'}</>}
                            </button>
                            {isStreaming && (
                                <button className="skkn-btn skkn-btn-danger" onClick={handleStopStreaming}>
                                    <X size={16} /> Dừng
                                </button>
                            )}

                            {/* AI Actions dropdown */}
                            <div className="skkn-ai-menu-container">
                                <button
                                    className="skkn-btn skkn-btn-secondary"
                                    onClick={() => { if (requirePro()) setShowAIMenu(!showAIMenu); }}
                                    disabled={isStreaming || !activeSection}
                                >
                                    <Wand2 size={16} /> Công cụ AI {!isSKKNPro && '🔒'} <ChevronDown size={14} />
                                </button>
                                {showAIMenu && (
                                    <div className="skkn-ai-menu">
                                        <button onClick={handleHumanize}><RefreshCw size={14} /> Humanize (tự nhiên hơn)</button>
                                        <button onClick={handleExpand}><Maximize2 size={14} /> Mở rộng nội dung</button>
                                        <button onClick={handleShorten}><Minimize2 size={14} /> Rút gọn nội dung</button>
                                        <div className="skkn-ai-menu-divider" />
                                        <button onClick={handleGenTable}><Table2 size={14} /> Tạo bảng biểu</button>
                                        <button onClick={() => handleGenChart('bar')}><BarChart3 size={14} /> 📊 Biểu đồ cột</button>
                                        <button onClick={() => handleGenChart('pie')}><PieChart size={14} /> 🥧 Biểu đồ tròn</button>
                                        <div className="skkn-ai-menu-divider" />
                                        <button onClick={handleGenReferences}><BookOpen size={14} /> Gợi ý tài liệu TK</button>
                                    </div>
                                )}
                            </div>

                            <button className="skkn-btn skkn-btn-secondary" onClick={() => { if (requirePro()) handleCheck(); }} disabled={isStreaming || !getActiveContent().trim()}>
                                <Search size={16} /> Kiểm tra {!isSKKNPro && '🔒'}
                            </button>
                        </div>

                        <div className="skkn-editor-content">
                            {activeSection ? (
                                <>
                                    <div className="skkn-editor-section-header">
                                        <h3 style={{ color: '#a5b4fc', margin: 0, fontSize: 16 }}>{getActiveSectionTitle()}</h3>
                                        {renderWordCount()}
                                    </div>
                                    {isStreaming && (
                                        <div className="skkn-streaming">
                                            <div className="skkn-streaming-dot" />
                                            AI đang viết nội dung...
                                        </div>
                                    )}
                                    <textarea
                                        ref={textareaRef}
                                        className="skkn-editor-textarea"
                                        value={getActiveContent()}
                                        onChange={e => updateSectionContent(activeSection, e.target.value)}
                                        placeholder={`Viết nội dung phần "${getActiveSectionTitle()}" ở đây hoặc nhấn "Viết với AI" để AI hỗ trợ...`}
                                        disabled={isStreaming}
                                    />

                                    {/* Chart preview gallery */}
                                    {chartImages[activeSection] && chartImages[activeSection].length > 0 && (
                                        <div className="skkn-chart-gallery">
                                            <h4 style={{ color: '#a5b4fc', margin: '0 0 12px', fontSize: 14 }}>📊 Biểu đồ đã tạo</h4>
                                            <div className="skkn-chart-grid">
                                                {chartImages[activeSection].map((img, idx) => (
                                                    <div key={idx} className="skkn-chart-item">
                                                        <img src={img} alt={`Biểu đồ ${idx + 1}`} />
                                                        <button
                                                            className="skkn-chart-delete"
                                                            onClick={() => handleDeleteChart(activeSection, idx)}
                                                            title="Xóa biểu đồ"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8, fontStyle: 'italic' }}>
                                                💡 Biểu đồ sẽ được nhúng khi xuất Word
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                                    <p style={{ fontSize: 18 }}>← Chọn một phần để bắt đầu viết</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Check Panel */}
                    {showCheck && (
                        <div className="skkn-check-panel">
                            <div className="skkn-check-header">
                                <h3>🔍 Kết quả kiểm tra</h3>
                                <button className="skkn-back-btn" onClick={() => setShowCheck(false)}><X size={18} /></button>
                            </div>
                            <div className="skkn-check-body">
                                {isChecking && (
                                    <div style={{ textAlign: 'center', padding: 40 }}>
                                        <div className="skkn-spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
                                        <p>Đang phân tích...</p>
                                    </div>
                                )}

                                {aiResult && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h4 style={{ color: '#c7d2fe', margin: '0 0 12px' }}>🤖 Phát hiện AI</h4>
                                        {renderScore(aiResult.humanScore, 'Tính tự nhiên (Human Score)')}
                                        <div className="skkn-alert skkn-alert-info">{aiResult.analysis}</div>
                                        {aiResult.suggestions?.map((s: string, i: number) => (
                                            <div key={i} className="skkn-alert skkn-alert-warn" style={{ fontSize: 13 }}>💡 {s}</div>
                                        ))}
                                        {/* Fix button */}
                                        {aiResult.humanScore < 70 && (
                                            <button
                                                className="skkn-btn skkn-btn-primary skkn-fix-btn"
                                                onClick={handleAIFix}
                                                disabled={isStreaming}
                                            >
                                                <Wand2 size={16} /> Sửa tự động (Humanize)
                                            </button>
                                        )}
                                    </div>
                                )}

                                {plagResult && (
                                    <div>
                                        <h4 style={{ color: '#c7d2fe', margin: '0 0 12px' }}>📋 Kiểm tra đạo văn</h4>
                                        {renderScore(plagResult.originalityScore, 'Tính nguyên bản')}
                                        <div className="skkn-alert skkn-alert-info">{plagResult.overallAssessment}</div>
                                        {plagResult.suspiciousParts?.slice(0, 5).map((p: any, i: number) => (
                                            <div key={i} className={`skkn-alert ${p.severity === 'high' ? 'skkn-alert-error' : 'skkn-alert-warn'}`}>
                                                <strong>"{p.text?.slice(0, 80)}..."</strong><br />
                                                {p.reason}
                                            </div>
                                        ))}
                                        {/* Fix button for plagiarism */}
                                        {plagResult.originalityScore < 70 && (
                                            <button
                                                className="skkn-btn skkn-btn-primary skkn-fix-btn"
                                                onClick={handleAIFix}
                                                disabled={isStreaming}
                                            >
                                                <Wand2 size={16} /> Viết lại cho nguyên bản hơn
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="skkn-modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="skkn-modal" style={{ maxWidth: 500 }}>
                        <div className="skkn-modal-header" style={{ borderBottom: '1px solid var(--skkn-border)', paddingBottom: 16, marginBottom: 16 }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 24 }}>💡</span> Góp ý & Báo lỗi
                            </h3>
                            <button className="skkn-btn-icon" onClick={() => setShowFeedbackModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="skkn-modal-body">
                            <p style={{ fontSize: 14, color: 'var(--skkn-text-secondary)', marginBottom: 16 }}>
                                Cảm ơn thầy/cô đã sử dụng công cụ. Mọi ý kiến đóng góp sẽ giúp ứng dụng ngày càng hoàn thiện và hữu ích hơn cho cộng đồng giáo viên.
                            </p>
                            <textarea
                                className="skkn-input"
                                rows={6}
                                placeholder="Nhập nội dung góp ý, báo lỗi hoặc tính năng thầy/cô mong muốn được thêm vào..."
                                value={feedbackContent}
                                onChange={(e) => setFeedbackContent(e.target.value)}
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>
                        <div className="skkn-modal-footer" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--skkn-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                                className="skkn-btn skkn-btn-secondary"
                                onClick={() => setShowFeedbackModal(false)}
                                disabled={isSubmittingFeedback}
                            >
                                Hủy
                            </button>
                            <button
                                className="skkn-btn skkn-btn-primary"
                                onClick={handleSubmitFeedback}
                                disabled={isSubmittingFeedback || !feedbackContent.trim()}
                            >
                                {isSubmittingFeedback ? <Loader2 size={16} className="spin" /> : 'Gửi góp ý'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pro Purchase Modal */}
            {showProModal && (
                <div className="skkn-modal-overlay" style={{ zIndex: 10001 }} onClick={(e) => { if (e.target === e.currentTarget) { setShowProModal(false); setProError(''); setProKeyInput(''); } }}>
                    <div className="skkn-modal" style={{ maxWidth: 460, background: 'linear-gradient(180deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                        {proSuccess ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                                <h3 style={{ color: '#6ee7b7', fontSize: 22, margin: '0 0 8px' }}>Kích hoạt thành công!</h3>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Tất cả tính năng Pro đã được mở khóa</p>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div style={{ textAlign: 'center', padding: '28px 24px 20px', position: 'relative' }}>
                                    <button className="skkn-btn-icon" onClick={() => { setShowProModal(false); setProError(''); setProKeyInput(''); }} style={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,0.4)' }}>
                                        <X size={20} />
                                    </button>
                                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }}>🔒</div>
                                    <h3 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Nâng cấp Pro</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Mở khóa toàn bộ tính năng viết SKKN</p>
                                </div>

                                {/* Feature list */}
                                <div style={{ padding: '0 24px 16px' }}>
                                    {[
                                        { icon: '🤖', text: 'AI viết nội dung SKKN chuyên sâu' },
                                        { icon: '🔍', text: 'Quét & sửa tự động vượt kiểm tra AI' },
                                        { icon: '📊', text: 'Biểu đồ cột, tròn minh họa' },
                                        { icon: '📝', text: 'Xuất file Word chuẩn định dạng' },
                                        { icon: '🧰', text: 'Humanize, mở rộng, rút gọn, bảng biểu' },
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
                                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>{item.text}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div style={{ height: 1, margin: '0 24px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

                                {/* Price + QR */}
                                <div style={{ padding: '20px 24px', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                                        <span style={{ color: '#fbbf24', fontSize: 28, fontWeight: 800 }}>100.000đ</span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>/ vĩnh viễn</span>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: 16, padding: 12, width: 180, margin: '0 auto 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                                        <img src="/qr-skkn.png.jpg" alt="QR chuyển khoản BIDV" style={{ width: '100%', borderRadius: 8 }} />
                                    </div>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 4px' }}>NGUYEN THE DUC - BIDV - 6701386512</p>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Nội dung CK: <strong style={{ color: '#fbbf24' }}>SKKN {userEmail || ''}</strong></p>
                                </div>

                                {/* Zalo */}
                                <div style={{ padding: '0 24px 16px', textAlign: 'center' }}>
                                    <a href="https://zalo.me/0975509490" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                                        📱 Zalo: 0975 509 490 để nhận mã
                                    </a>
                                </div>

                                {/* Divider */}
                                <div style={{ height: 1, margin: '0 24px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

                                {/* Activation input */}
                                <div style={{ padding: '20px 24px 24px' }}>
                                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block' }}>Nhập mã kích hoạt:</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="text"
                                            value={proKeyInput}
                                            onChange={(e) => setProKeyInput(e.target.value.toUpperCase())}
                                            placeholder="SKKN-XXXXXXXX"
                                            style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 14, fontWeight: 600, letterSpacing: 1, outline: 'none' }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleActivatePro(); }}
                                        />
                                        <button
                                            onClick={handleActivatePro}
                                            disabled={proActivating}
                                            style={{ padding: '12px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #0d9488)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: proActivating ? 0.6 : 1 }}
                                        >
                                            {proActivating ? '...' : '✓ Kích hoạt'}
                                        </button>
                                    </div>
                                    {proError && <p style={{ color: '#f87171', fontSize: 12, marginTop: 8, margin: '8px 0 0' }}>{proError}</p>}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Admin Feedback View */}
            {appView === 'feedback_admin' && isAdmin && (
                <AdminFeedbackView onBack={() => setAppView('landing')} />
            )}
        </div>
    );
};

// --- Component: AdminFeedbackView ---
import { SKKNFeedback, getSKKNFeedbacks, updateFeedbackStatus, deleteSKKNFeedback } from '../utils/firebaseSKKNFeedback';

const AdminFeedbackView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [feedbacks, setFeedbacks] = useState<SKKNFeedback[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            const data = await getSKKNFeedbacks();
            setFeedbacks(data);
            setLoading(false);
        };
        fetchFeedbacks();
    }, []);

    const handleUpdateStatus = async (id: string, newStatus: SKKNFeedback['status']) => {
        const success = await updateFeedbackStatus(id, newStatus);
        if (success) {
            setFeedbacks(prev => prev.map(fb => fb.id === id ? { ...fb, status: newStatus } : fb));
        }
    };

    const handleDeleteFeedback = async (id: string) => {
        if (!window.confirm('Xóa góp ý này?')) return;
        const success = await deleteSKKNFeedback(id);
        if (success) {
            setFeedbacks(prev => prev.filter(fb => fb.id !== id));
        }
    };

    return (
        <div style={{ padding: '0 24px 24px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <button className="skkn-btn-icon" onClick={onBack}>
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ margin: 0, color: 'var(--skkn-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>👑</span> Quản lý Góp ý & Báo lỗi
                </h2>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader2 size={32} className="spin" style={{ color: 'var(--skkn-primary)' }} />
                </div>
            ) : feedbacks.length === 0 ? (
                <div className="skkn-empty-state">
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                    <h3>Chưa có góp ý nào</h3>
                    <p>Ứng dụng đang hoạt động tốt!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                    {feedbacks.map(fb => (
                        <div key={fb.id} style={{
                            background: 'var(--skkn-bg-card)',
                            border: '1px solid var(--skkn-border)',
                            borderRadius: 16,
                            padding: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--skkn-text)', fontSize: 16, marginBottom: 4 }}>
                                        {fb.userName} <span style={{ fontWeight: 400, color: 'var(--skkn-text-secondary)', fontSize: 14 }}>({fb.userEmail})</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--skkn-text-tertiary)' }}>
                                        {new Date(fb.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                </div>
                                <select
                                    className="skkn-select"
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: 20,
                                        fontSize: 13,
                                        width: 'auto',
                                        backgroundColor: fb.status === 'new' ? '#fee2e2' : fb.status === 'resolved' ? '#dcfce7' : '#f3f4f6',
                                        color: fb.status === 'new' ? '#991b1b' : fb.status === 'resolved' ? '#166534' : '#374151',
                                        borderColor: 'transparent',
                                        fontWeight: 600
                                    }}
                                    value={fb.status}
                                    onChange={(e) => handleUpdateStatus(fb.id, e.target.value as any)}
                                >
                                    <option value="new">🔴 Mới</option>
                                    <option value="read">👀 Đang xử lý</option>
                                    <option value="resolved">✅ Đã xử lý</option>
                                </select>
                                <button
                                    onClick={() => handleDeleteFeedback(fb.id)}
                                    style={{
                                        padding: '4px 10px', borderRadius: 8,
                                        background: '#fee2e2', color: '#dc2626',
                                        border: 'none', cursor: 'pointer', fontSize: 13,
                                        fontWeight: 600, marginLeft: 6
                                    }}
                                    title="Xóa góp ý"
                                >
                                    🗑️ Xóa
                                </button>
                            </div>
                            <div style={{
                                background: 'rgba(0,0,0,0.02)',
                                padding: 16,
                                borderRadius: 12,
                                color: 'var(--skkn-text)',
                                fontSize: 15,
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap'
                            }}>
                                {fb.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SangKienKinhNghiem;
