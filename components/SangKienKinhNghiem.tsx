import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Sparkles, FileDown, Search, Upload, Save, Trash2, Plus, Loader2, X, RefreshCw, CheckCircle, ChevronDown, BookOpen, Table2, Maximize2, Minimize2, Wand2, BarChart3, PieChart, Lightbulb, Star, AlertCircle, ChevronRight } from 'lucide-react';
import {
    ReportType, TopicInfo, Section, SKKNDocument,
    AICheckResult, PlagiarismResult,
    REPORT_TYPES, LEVELS, DEFAULT_SECTIONS, SKKN_TEMPLATES, SKKNTemplate,
    getLeafSections, cloneSections
} from '../utils/skknTypes';
import {
    getGroqApiKey, setGroqApiKey, groqStream,
    buildSectionPrompt, buildAIDetectionPrompt,
    buildPlagiarismPrompt, buildHumanizePrompt,
    buildExpandPrompt, buildShortenPrompt,
    buildTablePrompt, buildReferencePrompt,
    buildChartDataPrompt, buildTopicAnalysisPrompt,
    buildTopicSuggestionPrompt
} from '../utils/groqApi';
import { exportToWord } from '../utils/wordExport';
import { generateBarChart, generatePieChart, parseChartData, validateChartData } from '../utils/chartGenerator';
import { submitSKKNFeedback } from '../utils/firebaseSKKNFeedback';
import { isEmailSKKNPro, validateSKKNProKey, activateSKKNProForEmail, TRIAL_DAYS } from '../utils/firebaseSKKNProKeys';
import './SangKienKinhNghiem.css';

interface Props {
    onBack: () => void;
    isAdmin?: boolean;
    userEmail?: string;
    userName?: string;
}

type AppView = 'landing' | 'form' | 'structure' | 'editor' | 'check' | 'feedback_admin';

const STORAGE_KEY = 'skkn_documents';

// Track selected template
const DEFAULT_TEMPLATE_ID = 'standard';

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
        title: '', subject: '', level: 'Tiểu học', grade: '', classSize: '', target: '', context: '',
        referenceText: '', referenceImages: [],
        author: '', school: '', department: '', year: '2025-2026',
        experimentClass: '', controlClass: '',
    });
    const [topicAnalysis, setTopicAnalysis] = useState<any>(null);
    const [isAnalyzingTopic, setIsAnalyzingTopic] = useState(false);
    const [topicSuggestions, setTopicSuggestions] = useState<any[]>([]);
    const [isSuggestingTopic, setIsSuggestingTopic] = useState(false);
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
    const [showChartModal, setShowChartModal] = useState(false);
    const [chartModalType, setChartModalType] = useState<'bar' | 'pie'>('bar');
    const [chartModalTitle, setChartModalTitle] = useState('');
    const [chartModalLabels, setChartModalLabels] = useState<string[]>(['Giỏi', 'Khá', 'Trung bình', 'Yếu']);
    const [chartModalValues, setChartModalValues] = useState<number[]>([0, 0, 0, 0]);
    const [chartModalSuggesting, setChartModalSuggesting] = useState(false);
    const [isSKKNPro, setIsSKKNPro] = useState(false);
    const [showProModal, setShowProModal] = useState(false);
    const [proKeyInput, setProKeyInput] = useState('');
    const [proActivating, setProActivating] = useState(false);
    const [proError, setProError] = useState('');
    const [proSuccess, setProSuccess] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATE_ID);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editingSectionTitle, setEditingSectionTitle] = useState('');
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
                await activateSKKNProForEmail(userEmail, proKeyInput.toUpperCase().trim(), !!result.trial);
            }
            setIsSKKNPro(true);
            setProSuccess(true);
            if (result.trial) {
                setTimeout(() => { setShowProModal(false); setProSuccess(false); setProKeyInput(''); }, 2500);
            } else {
                setTimeout(() => { setShowProModal(false); setProSuccess(false); setProKeyInput(''); }, 1500);
            }
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

    // AI Topic Analysis
    const handleAnalyzeTopic = async () => {
        if (!topicInfo.title.trim()) { setError('Vui lòng nhập tên đề tài trước'); return; }
        if (!apiKey) { setError('Vui lòng nhập Groq API Key trước'); return; }
        setIsAnalyzingTopic(true);
        setTopicAnalysis(null);
        setError('');

        const messages = buildTopicAnalysisPrompt(
            topicInfo.title,
            REPORT_TYPES[reportType].label,
            topicInfo.subject,
            topicInfo.level
        );

        let result = '';
        await groqStream(
            messages,
            apiKey,
            (chunk: string) => { result += chunk; },
            () => {
                setIsAnalyzingTopic(false);
                try {
                    const jsonMatch = result.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        setTopicAnalysis(JSON.parse(jsonMatch[0]));
                    } else {
                        setError('Không thể phân tích. Vui lòng thử lại.');
                    }
                } catch { setError('Không thể phân tích kết quả. Vui lòng thử lại.'); }
            },
            (err: Error) => {
                setIsAnalyzingTopic(false);
                setError(`Lỗi: ${err.message}`);
            },
            'llama-3.3-70b-versatile',
            0.7
        );
    };

    // AI Topic Suggestion - Gợi ý đề tài mới
    const handleSuggestTopics = async () => {
        if (!apiKey) { setError('Vui lòng nhập Groq API Key trước'); return; }
        if (!topicInfo.subject.trim() || !topicInfo.grade.trim()) { setError('Vui lòng nhập Môn/Lĩnh vực và Lớp trước để AI gợi ý đề tài phù hợp'); return; }
        setIsSuggestingTopic(true);
        setTopicSuggestions([]);
        setError('');

        const messages = buildTopicSuggestionPrompt(
            reportType,
            topicInfo.subject + (topicInfo.grade ? ` lớp ${topicInfo.grade}` : ''),
            topicInfo.level,
            topicInfo.context || undefined
        );

        let result = '';
        await groqStream(
            messages,
            apiKey,
            (chunk: string) => { result += chunk; },
            () => {
                setIsSuggestingTopic(false);
                try {
                    const jsonMatch = result.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        setTopicSuggestions(parsed.suggestions || []);
                    } else {
                        setError('Không thể tạo gợi ý. Vui lòng thử lại.');
                    }
                } catch { setError('Lỗi phân tích kết quả gợi ý. Thử lại.'); }
            },
            (err: Error) => {
                setIsSuggestingTopic(false);
                setError(`Lỗi: ${err.message}`);
            },
            'llama-3.3-70b-versatile',
            0.9
        );
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
        // Strip referenceImages (large base64) to avoid localStorage overflow
        const { referenceImages, ...topicInfoToSave } = topicInfo;
        const doc: SKKNDocument = {
            id: currentDocId || `skkn_${Date.now()}`,
            reportType,
            topicInfo: { ...topicInfoToSave, referenceImages: [] },
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

        // Use vision model when reference images are uploaded
        const useVision = topicInfo.referenceImages && topicInfo.referenceImages.length > 0;
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
            },
            useVision ? 'llama-3.2-90b-vision-preview' : undefined
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
        await runAIAction(buildTablePrompt(topicInfo.title, getActiveSectionTitle(), topicInfo.classSize || undefined), false);
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
            getActiveContent(),
            topicInfo.classSize || undefined
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

    // Open chart data modal
    const openChartModal = (type: 'bar' | 'pie') => {
        setChartModalType(type);
        setChartModalTitle('');
        setChartModalLabels(['Giỏi', 'Khá', 'Trung bình', 'Yếu']);
        setChartModalValues([0, 0, 0, 0]);
        setShowChartModal(true);
        setShowAIMenu(false);
    };

    // Generate chart from manual data
    const handleGenChartWithData = () => {
        const data = { labels: chartModalLabels, values: chartModalValues, title: chartModalTitle };
        const validation = validateChartData(data, topicInfo.classSize, chartModalType);
        if (!validation.valid) {
            setError(validation.message);
            return;
        }
        const imgBase64 = chartModalType === 'bar'
            ? generateBarChart(data)
            : generatePieChart(data);
        setChartImages(prev => ({
            ...prev,
            [activeSection]: [...(prev[activeSection] || []), imgBase64]
        }));
        setShowChartModal(false);
    };

    // AI suggest chart data for modal
    const handleAISuggestChartData = async () => {
        if (!apiKey || chartModalSuggesting) return;
        setChartModalSuggesting(true);
        setError('');

        const messages = buildChartDataPrompt(
            chartModalType,
            topicInfo.title,
            getActiveSectionTitle(),
            getActiveContent(),
            topicInfo.classSize || undefined
        );

        let result = '';
        await groqStream(
            messages,
            apiKey,
            (chunk: string) => { result += chunk; },
            () => {
                setChartModalSuggesting(false);
                const chartData = parseChartData(result);
                if (chartData) {
                    setChartModalTitle(chartData.title || '');
                    setChartModalLabels(chartData.labels);
                    setChartModalValues(chartData.values);
                } else {
                    setError('AI không thể gợi ý dữ liệu. Vui lòng thử lại.');
                }
            },
            (err: Error) => {
                setChartModalSuggesting(false);
                setError(`Lỗi: ${err.message}`);
            },
            'llama-3.3-70b-versatile',
            0.5
        );
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
                {/* ALWAYS render the section as clickable whether it has subsections or not */}
                <div
                    className={`skkn-section-item ${sec.subsections ? 'parent' : ''} ${activeSection === sec.id ? 'active' : ''}`}
                    style={{ paddingLeft: 12 + depth * 12 }}
                    onClick={() => setActiveSection(sec.id)}
                >
                    {!sec.subsections && <span className={`skkn-section-status ${sec.status}`} />}
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sec.title}
                    </span>
                    {sec.content && <span className="skkn-section-wc">{sec.content.split(/\s+/).filter(w => w.length > 0).length}</span>}
                </div>
                {/* Render children if any */}
                {sec.subsections && renderSections(sec.subsections, depth + 1)}
            </React.Fragment>
        ));
    };

    return (
        <div className="skkn-app">
            {/* Header */}
            <div className="skkn-header">
                <button className="skkn-back-btn" onClick={
                    appView === 'editor'
                        ? () => { handleSaveDoc(); setAppView('structure'); }
                        : appView === 'structure'
                            ? () => setAppView('form')
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
                        <div style={{ fontSize: 12, color: '#8b5cf6', marginBottom: 6, fontStyle: 'italic' }}>
                            💡 Chưa có đề tài? Hãy nhập <strong>Môn</strong> và <strong>Lớp</strong> bên dưới rồi bấm <strong>✨ Gợi ý đề tài</strong> để AI gợi ý cho bạn!
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input className="skkn-input" style={{ flex: 1 }} placeholder={reportType === 'gvcn_gioi' ? "VD: Một số biện pháp xây dựng lớp học thân thiện, học sinh tích cực..." : "VD: Một số biện pháp nâng cao chất lượng dạy học môn Toán..."}
                                value={topicInfo.title} onChange={e => { setTopicInfo({ ...topicInfo, title: e.target.value }); setTopicAnalysis(null); }} />
                            <button
                                className="skkn-btn skkn-btn-primary"
                                onClick={handleAnalyzeTopic}
                                disabled={isAnalyzingTopic || !topicInfo.title.trim()}
                                style={{ whiteSpace: 'nowrap', padding: '8px 16px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: 'none' }}
                                title="AI phân tích và gợi ý tên đề tài hấp dẫn hơn"
                            >
                                {isAnalyzingTopic ? <><div className="skkn-spinner" /> Đang phân tích...</> : <><Lightbulb size={16} /> Phân tích đề tài</>}
                            </button>
                            <button
                                className="skkn-btn"
                                onClick={handleSuggestTopics}
                                disabled={isSuggestingTopic || !topicInfo.subject.trim() || !topicInfo.grade.trim()}
                                style={{ whiteSpace: 'nowrap', padding: '8px 16px', background: (!topicInfo.subject.trim() || !topicInfo.grade.trim()) ? '#374151' : 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', color: 'white', borderRadius: 10, cursor: (!topicInfo.subject.trim() || !topicInfo.grade.trim()) ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: (!topicInfo.subject.trim() || !topicInfo.grade.trim()) ? 0.5 : 1 }}
                                title={(!topicInfo.subject.trim() || !topicInfo.grade.trim()) ? 'Vui lòng nhập Môn và Lớp bên dưới trước' : 'AI gợi ý đề tài mới dựa trên môn học và lớp'}
                            >
                                {isSuggestingTopic ? <><div className="skkn-spinner" /> Đang gợi ý...</> : <>✨ Gợi ý đề tài</>}
                            </button>
                        </div>

                        {/* Topic Suggestions */}
                        {topicSuggestions.length > 0 && (
                            <div className="skkn-topic-analysis" style={{ borderColor: 'rgba(139,92,246,0.3)' }}>
                                <div className="skkn-topic-analysis-header">
                                    <span style={{ fontWeight: 700, color: '#a78bfa' }}>✨ Gợi ý đề tài ({topicSuggestions.length})</span>
                                    <button onClick={() => setTopicSuggestions([])} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                                    {topicSuggestions.map((s: any, i: number) => (
                                        <div key={i}
                                            className="skkn-topic-suggestion"
                                            style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                                            onClick={() => { setTopicInfo({ ...topicInfo, title: s.title }); setTopicSuggestions([]); setTopicAnalysis(null); }}
                                            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(139,92,246,0.12)'; (e.target as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)'; }}
                                            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(139,92,246,0.06)'; (e.target as HTMLElement).style.borderColor = 'rgba(139,92,246,0.15)'; }}
                                        >
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e7ff' }}>{i + 1}. {s.title}</div>
                                            {s.highlight && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>💡 {s.highlight}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Topic Analysis Results */}
                        {topicAnalysis && (
                            <div className="skkn-topic-analysis">
                                <div className="skkn-topic-analysis-header">
                                    <Lightbulb size={18} style={{ color: '#f59e0b' }} />
                                    <span style={{ fontWeight: 700, color: '#f59e0b' }}>Kết quả phân tích đề tài</span>
                                    <div className="skkn-topic-score">
                                        <Star size={14} style={{ color: '#f59e0b' }} />
                                        <span>{topicAnalysis.analysis?.score || '?'}/10</span>
                                    </div>
                                    <button onClick={() => setTopicAnalysis(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                                </div>

                                {/* Strengths & Weaknesses */}
                                <div className="skkn-topic-analysis-grid">
                                    {topicAnalysis.analysis?.strengths?.length > 0 && (
                                        <div className="skkn-topic-block skkn-topic-strengths">
                                            <div className="skkn-topic-block-title"><CheckCircle size={14} /> Điểm mạnh</div>
                                            {topicAnalysis.analysis.strengths.map((s: string, i: number) => (
                                                <div key={i} className="skkn-topic-item">✅ {s}</div>
                                            ))}
                                        </div>
                                    )}
                                    {topicAnalysis.analysis?.weaknesses?.length > 0 && (
                                        <div className="skkn-topic-block skkn-topic-weaknesses">
                                            <div className="skkn-topic-block-title"><AlertCircle size={14} /> Cần cải thiện</div>
                                            {topicAnalysis.analysis.weaknesses.map((w: string, i: number) => (
                                                <div key={i} className="skkn-topic-item">⚠️ {w}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Suggestions */}
                                {topicAnalysis.suggestions?.length > 0 && (
                                    <div className="skkn-topic-suggestions">
                                        <div className="skkn-topic-block-title" style={{ marginBottom: 8 }}><Sparkles size={14} style={{ color: '#818cf8' }} /> Gợi ý tên đề tài</div>
                                        {topicAnalysis.suggestions.map((s: any, i: number) => (
                                            <div
                                                key={i}
                                                className="skkn-topic-suggestion"
                                                onClick={() => { setTopicInfo({ ...topicInfo, title: s.title }); setTopicAnalysis(null); }}
                                                title="Click để sử dụng tên này"
                                            >
                                                <div className="skkn-topic-suggestion-title">
                                                    <ChevronRight size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
                                                    <strong>{s.title}</strong>
                                                </div>
                                                <div className="skkn-topic-suggestion-reason">{s.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Tips */}
                                {topicAnalysis.tips?.length > 0 && (
                                    <div className="skkn-topic-tips">
                                        {topicAnalysis.tips.map((t: string, i: number) => (
                                            <span key={i} className="skkn-topic-tip">💡 {t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="skkn-row">
                        {reportType !== 'gvcn_gioi' && (
                            <div className="skkn-field">
                                <label>📚 Môn / Lĩnh vực *</label>
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
                        <div className="skkn-field">
                            <label>🎓 Lớp *</label>
                            <input className="skkn-input" placeholder="VD: 5, 3, Lá lớn, 9..."
                                value={topicInfo.grade} onChange={e => setTopicInfo({ ...topicInfo, grade: e.target.value })} />
                        </div>
                        <div className="skkn-field">
                            <label>👥 Sĩ số lớp</label>
                            <input className="skkn-input" type="number" placeholder="VD: 38"
                                value={topicInfo.classSize} onChange={e => setTopicInfo({ ...topicInfo, classSize: e.target.value })} />
                        </div>
                    </div>

                    {/* Reference Content - cho ví dụ minh hoạ sát bài */}
                    <div className="skkn-field" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, padding: 16, marginTop: 4 }}>
                        <label style={{ color: '#a78bfa', fontSize: 14, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            📚 Tài liệu để AI đưa ví dụ sát bài
                            <span style={{ fontSize: 11, fontWeight: 400, color: '#8b5cf6' }}>— paste nội dung SGK/giáo án để ví dụ minh hoạ chính xác hơn</span>
                        </label>
                        <textarea
                            className="skkn-input"
                            rows={4}
                            placeholder={"Paste tên bài, nội dung kiến thức, hoạt động dạy học... vào đây để AI đưa ví dụ sát bài. VD:\n- Bài 12: Diện tích hình thang (trang 93 SGK Toán 5)\n- Kiến thức: công thức S = (a+b) × h ÷ 2\n- HĐ: Khám phá (cắt ghép hình thang → hình chữ nhật)..."}
                            value={topicInfo.referenceText}
                            onChange={e => setTopicInfo({ ...topicInfo, referenceText: e.target.value })}
                            style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
                        />

                        {/* Image Upload */}
                        <div style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 13, color: '#94a3b8' }}>📷 Ảnh chụp SGK / Giáo án (tối đa 5 ảnh)</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {topicInfo.referenceImages.map((img, i) => (
                                    <div key={i} style={{ position: 'relative', width: 100, height: 100, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(139,92,246,0.3)' }}>
                                        <img src={img} alt={`Tham chiếu ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            onClick={() => setTopicInfo({ ...topicInfo, referenceImages: topicInfo.referenceImages.filter((_, idx) => idx !== i) })}
                                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >✕</button>
                                    </div>
                                ))}
                                {topicInfo.referenceImages.length < 5 && (
                                    <label
                                        style={{ width: 100, height: 100, borderRadius: 8, border: '2px dashed rgba(139,92,246,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8b5cf6', fontSize: 12, gap: 4, transition: 'all 0.15s' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.6)'; (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.05)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <span style={{ fontSize: 24 }}>+</span>
                                        <span>Thêm ảnh</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={e => {
                                                const files = Array.from(e.target.files || []);
                                                const remaining = 5 - topicInfo.referenceImages.length;
                                                files.slice(0, remaining).forEach(file => {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const dataUrl = ev.target?.result as string;
                                                        setTopicInfo(prev => ({
                                                            ...prev,
                                                            referenceImages: [...prev.referenceImages, dataUrl]
                                                        }));
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                )}
                            </div>
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

                    <div className="skkn-row">
                        <div className="skkn-field">
                            <label>🔬 Lớp thực nghiệm <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>(tùy chọn)</span></label>
                            <input className="skkn-input" placeholder="VD: Lớp 11A1 (38 HS)"
                                value={topicInfo.experimentClass} onChange={e => setTopicInfo({ ...topicInfo, experimentClass: e.target.value })} />
                        </div>
                        <div className="skkn-field">
                            <label>🔄 Lớp đối chứng <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>(tùy chọn)</span></label>
                            <input className="skkn-input" placeholder="VD: Lớp 11A2 (37 HS)"
                                value={topicInfo.controlClass} onChange={e => setTopicInfo({ ...topicInfo, controlClass: e.target.value })} />
                        </div>
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
                        <button className="skkn-btn skkn-btn-primary" onClick={() => {
                            if (!topicInfo.title.trim()) { setError('Vui lòng nhập tên đề tài'); return; }
                            if (!apiKey) { setError('Vui lòng nhập Groq API Key'); return; }
                            setError('');
                            setAppView('structure');
                        }} disabled={isStreaming}>
                            <Sparkles size={16} /> Tiếp tục chọn cấu trúc
                        </button>
                    </div>
                </div>
            )}

            {/* === STRUCTURE PREVIEW === */}
            {appView === 'structure' && (
                <div className="skkn-form" style={{ maxWidth: 900 }}>
                    <h2>📋 Chọn cấu trúc dàn ý</h2>
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: -16, marginBottom: 24 }}>
                        Chọn mẫu cấu trúc phù hợp với yêu cầu của Sở/Đơn vị, hoặc tùy chỉnh theo ý muốn
                    </p>

                    {/* Template selector cards */}
                    {reportType === 'skkn' && (
                        <div className="skkn-template-grid">
                            {SKKN_TEMPLATES.map(tpl => (
                                <div
                                    key={tpl.id}
                                    className={`skkn-template-card ${selectedTemplateId === tpl.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedTemplateId(tpl.id);
                                        setSections(cloneSections(tpl.sections));
                                    }}
                                >
                                    <div className="skkn-template-icon">{tpl.icon}</div>
                                    <div className="skkn-template-info">
                                        <div className="skkn-template-name">{tpl.name}</div>
                                        <div className="skkn-template-desc">{tpl.desc}</div>
                                    </div>
                                    {selectedTemplateId === tpl.id && <CheckCircle size={18} style={{ color: '#818cf8', flexShrink: 0 }} />}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Structure tree preview */}
                    <div className="skkn-structure-preview">
                        <div className="skkn-structure-header">
                            <h3>🎯 Cấu trúc dàn ý hiện tại</h3>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{getLeafSections(sections).length} mục</span>
                        </div>
                        <div className="skkn-structure-tree">
                            {sections.map((sec, si) => (
                                <div key={sec.id} className="skkn-structure-section">
                                    <div className="skkn-structure-item skkn-structure-parent">
                                        <span className="skkn-structure-bullet">◆</span>
                                        {editingSectionId === sec.id ? (
                                            <input
                                                className="skkn-input" style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
                                                value={editingSectionTitle}
                                                onChange={e => setEditingSectionTitle(e.target.value)}
                                                onBlur={() => {
                                                    if (editingSectionTitle.trim()) {
                                                        setSections(prev => prev.map(s => s.id === sec.id ? { ...s, title: editingSectionTitle } : s));
                                                    }
                                                    setEditingSectionId(null);
                                                }}
                                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                autoFocus
                                            />
                                        ) : (
                                            <span
                                                className="skkn-structure-title"
                                                onDoubleClick={() => { setEditingSectionId(sec.id); setEditingSectionTitle(sec.title); }}
                                                title="Double-click để sửa tên"
                                            >{sec.title}</span>
                                        )}
                                        <button
                                            className="skkn-structure-del"
                                            onClick={() => setSections(prev => prev.filter(s => s.id !== sec.id))}
                                            title="Xóa phần này"
                                        ><X size={12} /></button>
                                    </div>
                                    {sec.subsections?.map((sub, subi) => (
                                        <div key={sub.id} className="skkn-structure-item skkn-structure-child">
                                            <span className="skkn-structure-bullet">○</span>
                                            {editingSectionId === sub.id ? (
                                                <input
                                                    className="skkn-input" style={{ flex: 1, padding: '4px 8px', fontSize: 12 }}
                                                    value={editingSectionTitle}
                                                    onChange={e => setEditingSectionTitle(e.target.value)}
                                                    onBlur={() => {
                                                        if (editingSectionTitle.trim()) {
                                                            setSections(prev => prev.map(s =>
                                                                s.id === sec.id && s.subsections
                                                                    ? { ...s, subsections: s.subsections.map(ss => ss.id === sub.id ? { ...ss, title: editingSectionTitle } : ss) }
                                                                    : s
                                                            ));
                                                        }
                                                        setEditingSectionId(null);
                                                    }}
                                                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="skkn-structure-title"
                                                    onDoubleClick={() => { setEditingSectionId(sub.id); setEditingSectionTitle(sub.title); }}
                                                    title="Double-click để sửa tên"
                                                >{sub.title}</span>
                                            )}
                                            <button
                                                className="skkn-structure-del"
                                                onClick={() => {
                                                    setSections(prev => prev.map(s =>
                                                        s.id === sec.id && s.subsections
                                                            ? { ...s, subsections: s.subsections.filter(ss => ss.id !== sub.id) }
                                                            : s
                                                    ));
                                                }}
                                                title="Xóa mục này"
                                            ><X size={12} /></button>
                                        </div>
                                    ))}
                                    {/* Add subsection button */}
                                    <button
                                        className="skkn-structure-add-sub"
                                        onClick={() => {
                                            const newId = `${sec.id}_new_${Date.now()}`;
                                            setSections(prev => prev.map(s =>
                                                s.id === sec.id
                                                    ? { ...s, subsections: [...(s.subsections || []), { id: newId, title: 'Mục mới', content: '', status: 'empty' as const }] }
                                                    : s
                                            ));
                                            setEditingSectionId(newId);
                                            setEditingSectionTitle('Mục mới');
                                        }}
                                    ><Plus size={12} /> Thêm mục con</button>
                                </div>
                            ))}
                            {/* Add main section button */}
                            <button
                                className="skkn-structure-add-main"
                                onClick={() => {
                                    const newId = `main_new_${Date.now()}`;
                                    setSections(prev => [...prev, { id: newId, title: 'PHẦN MỚI', content: '', status: 'empty' as const }]);
                                    setEditingSectionId(newId);
                                    setEditingSectionTitle('PHẦN MỚI');
                                }}
                            ><Plus size={14} /> Thêm phần mới</button>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                            💡 Double-click vào tên mục để chỉnh sửa. Hoặc tải lên file cấu trúc ở bước trước.
                        </div>
                    </div>

                    <div className="skkn-form-actions">
                        <button className="skkn-btn skkn-btn-secondary" onClick={() => setAppView('form')}>← Quay lại</button>
                        <button className="skkn-btn skkn-btn-primary" onClick={handleStartWriting} disabled={isStreaming || sections.length === 0}>
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
                                        <button onClick={() => handleGenChart('bar')}><BarChart3 size={14} /> 📊 Biểu đồ cột (AI tự tạo)</button>
                                        <button onClick={() => handleGenChart('pie')}><PieChart size={14} /> 🥧 Biểu đồ tròn (AI tự tạo)</button>
                                        <button onClick={() => openChartModal('bar')}><BarChart3 size={14} /> 📊 Biểu đồ cột (nhập số liệu)</button>
                                        <button onClick={() => openChartModal('pie')}><PieChart size={14} /> 🥧 Biểu đồ tròn (nhập số liệu)</button>
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
            {/* Chart Data Input Modal */}
            {showChartModal && (
                <div className="skkn-modal-overlay" style={{ zIndex: 10000 }} onClick={(e) => { if (e.target === e.currentTarget) setShowChartModal(false); }}>
                    <div className="skkn-modal" style={{ maxWidth: 520, background: 'linear-gradient(180deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
                            <h3 style={{ margin: 0, color: '#e0e7ff', fontSize: 18, fontWeight: 700 }}>
                                {chartModalType === 'bar' ? '📊' : '🥧'} {chartModalType === 'bar' ? 'Biểu đồ cột' : 'Biểu đồ tròn'} — Nhập số liệu
                            </h3>
                            <button className="skkn-btn-icon" onClick={() => setShowChartModal(false)} style={{ color: 'rgba(255,255,255,0.4)' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '0 24px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
                            {/* Class size info */}
                            {topicInfo.classSize && (
                                <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16, fontSize: 13, color: '#a5b4fc' }}>
                                    👥 Sĩ số lớp: <strong>{topicInfo.classSize}</strong> học sinh
                                    {chartModalType === 'bar' ? ' — tổng giá trị phải = sĩ số' : ' — tổng % phải = 100%'}
                                </div>
                            )}

                            {/* Title */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Tiêu đề biểu đồ</label>
                                <input
                                    className="skkn-input"
                                    placeholder="VD: Tỷ lệ học sinh giỏi"
                                    value={chartModalTitle}
                                    onChange={e => setChartModalTitle(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Data rows */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                                    Dữ liệu ({chartModalType === 'pie' ? 'nhãn + %' : 'nhãn + số lượng'})
                                </label>
                                {chartModalLabels.map((label, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                        <input
                                            className="skkn-input"
                                            placeholder="Nhãn"
                                            value={label}
                                            onChange={e => {
                                                const newLabels = [...chartModalLabels];
                                                newLabels[i] = e.target.value;
                                                setChartModalLabels(newLabels);
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <input
                                            className="skkn-input"
                                            type="number"
                                            placeholder={chartModalType === 'pie' ? '%' : 'SL'}
                                            value={chartModalValues[i] || ''}
                                            onChange={e => {
                                                const newValues = [...chartModalValues];
                                                newValues[i] = parseFloat(e.target.value) || 0;
                                                setChartModalValues(newValues);
                                            }}
                                            style={{ width: 80, textAlign: 'center' }}
                                        />
                                        {chartModalLabels.length > 2 && (
                                            <button
                                                onClick={() => {
                                                    setChartModalLabels(prev => prev.filter((_, idx) => idx !== i));
                                                    setChartModalValues(prev => prev.filter((_, idx) => idx !== i));
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                                                title="Xóa hàng"
                                            ><X size={16} /></button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        setChartModalLabels(prev => [...prev, '']);
                                        setChartModalValues(prev => [...prev, 0]);
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.3)', color: '#818cf8', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 4 }}
                                ><Plus size={14} /> Thêm hàng</button>
                            </div>

                            {/* Validation result */}
                            {(() => {
                                const validation = validateChartData(
                                    { labels: chartModalLabels, values: chartModalValues },
                                    topicInfo.classSize,
                                    chartModalType
                                );
                                return (
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        background: validation.valid ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        border: `1px solid ${validation.valid ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                        color: validation.valid ? '#86efac' : '#fca5a5',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        marginBottom: 20
                                    }}>
                                        {validation.message}
                                    </div>
                                );
                            })()}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                                <button
                                    onClick={handleAISuggestChartData}
                                    disabled={chartModalSuggesting || !apiKey}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: chartModalSuggesting ? 0.6 : 1 }}
                                >
                                    {chartModalSuggesting ? <><Loader2 size={14} className="spin" /> Đang gợi ý...</> : <><Sparkles size={14} /> AI Gợi ý</>}
                                </button>
                                <button
                                    onClick={handleGenChartWithData}
                                    disabled={!validateChartData({ labels: chartModalLabels, values: chartModalValues }, topicInfo.classSize, chartModalType).valid}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, background: validateChartData({ labels: chartModalLabels, values: chartModalValues }, topicInfo.classSize, chartModalType).valid ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(100,116,139,0.3)', color: 'white', cursor: validateChartData({ labels: chartModalLabels, values: chartModalValues }, topicInfo.classSize, chartModalType).valid ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700, border: 'none', boxShadow: validateChartData({ labels: chartModalLabels, values: chartModalValues }, topicInfo.classSize, chartModalType).valid ? '0 4px 16px rgba(99,102,241,0.3)' : 'none' }}
                                >
                                    ✓ Tạo biểu đồ
                                </button>
                            </div>
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
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                                    {proKeyInput.toUpperCase().includes('DUNGTHU')
                                        ? `Bạn có ${TRIAL_DAYS} ngày dùng thử tất cả tính năng Pro`
                                        : 'Tất cả tính năng Pro đã được mở khóa'}
                                </p>
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

                                {/* Trial - Join Zalo Group */}
                                <div style={{ padding: '20px 24px', textAlign: 'center' }}>
                                    <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08))', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 16, padding: '20px 16px', marginBottom: 16 }}>
                                        <div style={{ fontSize: 28, marginBottom: 8 }}>🎁</div>
                                        <h4 style={{ color: '#6ee7b7', fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Dùng thử MIỄN PHÍ</h4>
                                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>
                                            Quét mã QR hoặc nhấn nút bên dưới<br />để tham gia nhóm Zalo nhận mã dùng thử
                                        </p>
                                        <div style={{ background: 'white', borderRadius: 14, padding: 10, width: 160, margin: '0 auto 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://zalo.me/g/qdjuwq474')}`} alt="QR nhóm Zalo" style={{ width: '100%', borderRadius: 8 }} />
                                        </div>
                                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 12px' }}>Quét bằng Zalo trên điện thoại</p>
                                        <a href="https://zalo.me/g/qdjuwq474" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, background: 'linear-gradient(135deg, #0068FF, #0052CC)', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,104,255,0.3)', transition: 'all 0.15s' }}>
                                            💬 Tham gia nhóm Zalo nhận mã
                                        </a>
                                    </div>
                                </div>

                                {/* Divider with text */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', marginBottom: 4 }}>
                                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1))' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>hoặc mua ngay</span>
                                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)' }} />
                                </div>

                                {/* Price + QR (secondary) */}
                                <div style={{ padding: '16px 24px', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                                        <span style={{ color: '#fbbf24', fontSize: 22, fontWeight: 800 }}>100.000đ</span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>/ năm</span>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: 14, padding: 10, width: 150, margin: '0 auto 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                                        <img src="/qr-skkn.png.jpg" alt="QR chuyển khoản BIDV" style={{ width: '100%', borderRadius: 8 }} />
                                    </div>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '0 0 3px' }}>NGUYEN THE DUC - BIDV - 6701386512</p>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '0 0 8px' }}>Nội dung CK: <strong style={{ color: '#fbbf24' }}>SKKN {userEmail || ''}</strong></p>
                                    <a href="https://zalo.me/0975509490" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
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
