import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, Plus, Save, Play, Trash2, Home, HelpCircle, BookOpen,
    Clock, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, ExternalLink,
    Share2, Edit3, X, Copy, ArrowLeft, Minus, Upload, Link2, Palette, Download
} from 'lucide-react';
import { VideoLesson, Question, QuestionType, VideoPlayerTheme, VideoSourceType, DEFAULT_VIDEO_PLAYER_THEME, normalizeVideoPlayerTheme, migrateQuestion } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ReactPlayer from 'react-player';
import JSZip from 'jszip';
import { cleanYouTubeUrl, isValidYouTubeUrl, extractStartTime } from '../utils/youtubeUtils';
import { createShareUrl, shortenUrl, createShortShareUrl } from '../utils/shareUtils';
import { getLocalVideoFile, saveLocalVideoFile } from '../utils/localVideoStore';
import PlayerThemeCustomizer from './PlayerThemeCustomizer';
import { isValidVideoExportEmail, reserveVideoExportTurn, rollbackVideoExportTurn } from '../utils/firebaseVideoExportCodes';

interface InteractiveVideoModuleProps {
    lessons: VideoLesson[];
    onSave: (lesson: VideoLesson) => void;
    onDelete: (lessonId: string) => void;
    onPlay: (lesson: VideoLesson) => void;
    onBack: () => void;
    userEmail?: string;
}

type ModuleView = 'MY_VIDEOS' | 'CREATE_NEW' | 'EDIT';
type ScormVersion = '1.2' | '2004';
type PendingExport = { kind: 'html5' } | { kind: 'scorm'; version: ScormVersion };
type ExportPackageId = 'trial' | 'single' | 'bundle';

const EXPORT_BANK_INFO = {
    bankName: 'BIDV',
    branch: 'BIDV - PGD Trảng Dài',
    accountNumber: '6790470451',
    accountHolder: 'NGUYEN THE DUC',
    bankCode: 'BIDV',
    adminZalo: '0975509490',
};

const EXPORT_PACKAGES: Array<{
    id: ExportPackageId;
    title: string;
    description: string;
    turns: number;
    amount: number;
    transferCode: string;
    badge?: string;
    isTrial?: boolean;
}> = [
    {
        id: 'trial',
        title: 'Dùng thử',
        description: 'Nhập mã dùng thử xuất file do admin cấp. Không cần chuyển khoản.',
        turns: 1,
        amount: 0,
        transferCode: 'DUNGTHU',
        badge: 'Nhập mã',
        isTrial: true,
    },
    {
        id: 'single',
        title: '1 lượt xuất',
        description: 'Phù hợp khi chỉ cần xuất một bài giảng độc lập.',
        turns: 1,
        amount: 20000,
        transferCode: '1LUOT',
    },
    {
        id: 'bundle',
        title: '10 lượt xuất',
        description: 'Phù hợp khi thầy cô cần xuất nhiều bài giảng.',
        turns: 10,
        amount: 100000,
        transferCode: '10LUOT',
        badge: 'Tiết kiệm',
    },
];

const InteractiveVideoModule: React.FC<InteractiveVideoModuleProps> = ({
    lessons,
    onSave,
    onDelete,
    onPlay,
    onBack,
    userEmail = ''
}) => {
    const [currentView, setCurrentView] = useState<ModuleView>('MY_VIDEOS');
    const [editingLesson, setEditingLesson] = useState<VideoLesson | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [startTime, setStartTime] = useState(0);
    const [allowSeeking, setAllowSeeking] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [urlError, setUrlError] = useState<boolean>(false);
    const [urlValid, setUrlValid] = useState<boolean | null>(null);
    const [videoSource, setVideoSource] = useState<VideoSourceType>('youtube');
    const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);
    const [localVideoPreviewUrl, setLocalVideoPreviewUrl] = useState('');
    const [localVideoName, setLocalVideoName] = useState('');
    const [playerTheme, setPlayerTheme] = useState<VideoPlayerTheme>(DEFAULT_VIDEO_PLAYER_THEME);

    // UI state
    const [isCopyingLink, setIsCopyingLink] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showSavedCard, setShowSavedCard] = useState(false);
    const [savedLesson, setSavedLesson] = useState<VideoLesson | null>(null);
    const [controlPanel, setControlPanel] = useState<'export' | 'design' | 'actions'>('actions');
    const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);
    const [selectedExportPackageId, setSelectedExportPackageId] = useState<ExportPackageId>('single');
    const [copiedPaymentField, setCopiedPaymentField] = useState<string | null>(null);
    const [exportCodeInput, setExportCodeInput] = useState('');
    const [exportEmailInput, setExportEmailInput] = useState(userEmail || '');
    const [isExportingPaidFile, setIsExportingPaidFile] = useState(false);

    // Reset form when switching to create new
    const resetForm = () => {
        setTitle('');
        setUrl('');
        setStartTime(0);
        setAllowSeeking(false);
        setQuestions([]);
        setUrlValid(null);
        setUrlError(false);
        setEditingLesson(null);
        setVideoSource('youtube');
        setLocalVideoFile(null);
        setLocalVideoPreviewUrl('');
        setLocalVideoName('');
        setPlayerTheme(DEFAULT_VIDEO_PLAYER_THEME);
    };

    // Load lesson data when editing
    const loadLessonForEdit = (lesson: VideoLesson) => {
        setTitle(lesson.title);
        setUrl(lesson.youtubeUrl);
        setStartTime(lesson.startTime);
        setAllowSeeking(lesson.allowSeeking);
        setQuestions((lesson.questions || []).map(migrateQuestion));
        setVideoSource(lesson.videoSource || 'youtube');
        setLocalVideoFile(null);
        setLocalVideoPreviewUrl(lesson.localVideoObjectUrl || '');
        setLocalVideoName(lesson.localVideoName || '');
        setPlayerTheme(normalizeVideoPlayerTheme(lesson.playerTheme));
        setUrlValid((lesson.videoSource || 'youtube') === 'youtube');
        setEditingLesson(lesson);
        setCurrentView('EDIT');
    };

    const handleCreateNew = () => {
        resetForm();
        setCurrentView('CREATE_NEW');
    };

    const handleImportProjectBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const backup = JSON.parse(await file.text());
            const rawLesson = backup?.lesson || backup;
            if (!rawLesson || typeof rawLesson !== 'object' || !Array.isArray(rawLesson.questions)) {
                throw new Error('Invalid backup file');
            }

            const importedSource: VideoSourceType = rawLesson.videoSource === 'local' ? 'local' : 'youtube';
            const importedLocalVideoName = rawLesson.localVideoName || backup?.assets?.localVideoName || '';
            const importedLesson: VideoLesson = {
                id: uuidv4(),
                title: String(rawLesson.title || file.name.replace(/\.json$/i, '') || 'Bài giảng đã nhập').trim(),
                youtubeUrl: importedSource === 'youtube' ? getCleanVideoUrl(String(rawLesson.youtubeUrl || '')) : '',
                videoSource: importedSource,
                localVideoName: importedSource === 'local' ? undefined : undefined,
                localVideoObjectUrl: undefined,
                playerTheme: normalizeVideoPlayerTheme(rawLesson.playerTheme),
                startTime: Number(rawLesson.startTime) || 0,
                allowSeeking: Boolean(rawLesson.allowSeeking),
                questions: rawLesson.questions.map(migrateQuestion),
                createdAt: Date.now(),
            };

            setTitle(importedLesson.title);
            setUrl(importedLesson.youtubeUrl);
            setStartTime(importedLesson.startTime);
            setAllowSeeking(importedLesson.allowSeeking);
            setQuestions(importedLesson.questions);
            setVideoSource(importedSource);
            setLocalVideoFile(null);
            setLocalVideoPreviewUrl('');
            setLocalVideoName(importedSource === 'local' ? importedLocalVideoName : '');
            setPlayerTheme(normalizeVideoPlayerTheme(importedLesson.playerTheme));
            setUrlValid(importedSource === 'youtube' ? Boolean(importedLesson.youtubeUrl && isValidYouTubeUrl(importedLesson.youtubeUrl)) : null);
            setUrlError(false);
            setEditingLesson(importedLesson);
            setCurrentView('EDIT');

            if (importedSource === 'local') {
                alert(`Đã nhập dự án. File sao lưu không chứa video gốc${importedLocalVideoName ? ` "${importedLocalVideoName}"` : ''}, vui lòng chọn lại video từ máy trước khi lưu hoặc xuất file.`);
            } else {
                alert('Đã nhập dự án. Kiểm tra lại nội dung rồi bấm Lưu bài giảng.');
            }
        } catch (error) {
            alert('Không đọc được file sao lưu. Vui lòng chọn đúng file JSON đã xuất từ mục "Xuất bản sao lưu".');
        }
    };

    const getCleanVideoUrl = (rawUrl: string): string => {
        return cleanYouTubeUrl(rawUrl) || rawUrl;
    };

    const getPreviewVideoUrl = () => videoSource === 'local' ? localVideoPreviewUrl : getCleanVideoUrl(url);

    const handleVideoSourceChange = (source: VideoSourceType) => {
        setVideoSource(source);
        setUrlError(false);
        setUrlValid(source === 'youtube' && url ? isValidYouTubeUrl(url) : null);
    };

    const handleLocalVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            alert('Vui lòng chọn file video hợp lệ.');
            return;
        }

        if (localVideoPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(localVideoPreviewUrl);
        }
        const objectUrl = URL.createObjectURL(file);
        setLocalVideoFile(file);
        setLocalVideoPreviewUrl(objectUrl);
        setLocalVideoName(file.name);
        setUrl(objectUrl);
        setUrlValid(true);
        setUrlError(false);
        if (!title.trim()) {
            setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
    };

    // Nhãn cho đáp án (A, B, C, D)
    const optionLabels = ['A', 'B', 'C', 'D'];
    const questionTypes: Array<{ value: QuestionType; label: string; description: string }> = [
        { value: 'multiple-choice', label: 'Trắc nghiệm', description: 'Chọn 1 đáp án đúng' },
        { value: 'true-false', label: 'Đúng / Sai', description: 'Hai lựa chọn nhanh' },
        { value: 'short-answer', label: 'Trả lời ngắn', description: 'Học sinh gõ đáp án' },
        { value: 'fill-blank', label: 'Điền khuyết', description: 'Nhập từ/cụm từ còn thiếu' },
        { value: 'image-choice', label: 'Chọn hình ảnh', description: 'Chọn đáp án bằng ảnh' },
    ];

    const getQuestionType = (question: Question): QuestionType => question.type || 'multiple-choice';

    const normalizeAnswers = (answers?: string[]) => {
        const cleaned = (answers || []).map(answer => String(answer || '')).filter(answer => answer.trim() !== '');
        return cleaned.length ? cleaned : [''];
    };

    const normalizeQuestionForType = (question: Question, type: QuestionType): Question => {
        const base = { ...question, type, points: question.points || 10 };

        if (type === 'true-false') {
            return { ...base, options: ['Đúng', 'Sai'], correctOption: Math.min(question.correctOption || 0, 1) };
        }

        if (type === 'short-answer' || type === 'fill-blank') {
            return {
                ...base,
                options: [],
                correctOption: 0,
                acceptedAnswers: normalizeAnswers(question.acceptedAnswers || question.options),
                caseSensitive: Boolean(question.caseSensitive),
            };
        }

        if (type === 'image-choice') {
            const imageOptions = question.imageOptions?.length
                ? question.imageOptions
                : (question.options.length ? question.options : ['', '']).map(text => ({ text, imageUrl: '' }));
            return {
                ...base,
                options: imageOptions.map(option => option.text),
                imageOptions,
                correctOption: Math.min(question.correctOption || 0, Math.max(0, imageOptions.length - 1)),
            };
        }

        const options = question.options.length ? question.options : ['', '', '', ''];
        return { ...base, options, correctOption: Math.min(question.correctOption || 0, Math.max(0, options.length - 1)) };
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: uuidv4(),
            type: 'multiple-choice',
            time: 0,
            text: '',
            options: ['', '', '', ''], // 4 đáp án mặc định
            correctOption: 0,
            points: 10,
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (id: string, field: keyof Question | string, value: any) => {
        setQuestions(questions.map(q => {
            if (q.id === id) {
                if (field.startsWith('option.')) {
                    const optionIndex = parseInt(field.split('.')[1]);
                    const newOptions = [...q.options];
                    newOptions[optionIndex] = value;
                    return { ...q, options: newOptions };
                }
                return { ...q, [field]: value };
            }
            return q;
        }));
    };

    // Thêm đáp án (tối đa 4)
    const addOption = (questionId: string) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId && q.options.length < 4) {
                return { ...q, options: [...q.options, ''] };
            }
            return q;
        }));
    };

    // Xóa đáp án (tối thiểu 2)
    const removeOption = (questionId: string, optionIndex: number) => {
        setQuestions(questions.map(q => {
            if (q.id === questionId && q.options.length > 2) {
                const newOptions = q.options.filter((_, i) => i !== optionIndex);
                // Điều chỉnh correctOption nếu cần
                let newCorrectOption = q.correctOption;
                if (optionIndex < q.correctOption) {
                    newCorrectOption = q.correctOption - 1;
                } else if (optionIndex === q.correctOption) {
                    newCorrectOption = 0; // Reset về đáp án đầu tiên
                }
                return { ...q, options: newOptions, correctOption: newCorrectOption };
            }
            return q;
        }));
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const prepareQuestionsForSave = () => questions
        .map(question => normalizeQuestionForType(migrateQuestion(question), getQuestionType(question)))
        .sort((a, b) => a.time - b.time);

    const updateQuestionType = (questionId: string, type: QuestionType) => {
        setQuestions(questions.map(question => question.id === questionId ? normalizeQuestionForType(question, type) : question));
    };

    const updateAcceptedAnswer = (questionId: string, answerIndex: number, value: string) => {
        setQuestions(questions.map(question => {
            if (question.id !== questionId) return question;
            const acceptedAnswers = normalizeAnswers(question.acceptedAnswers);
            acceptedAnswers[answerIndex] = value;
            return { ...question, acceptedAnswers };
        }));
    };

    const addAcceptedAnswer = (questionId: string) => {
        setQuestions(questions.map(question => {
            if (question.id !== questionId) return question;
            return { ...question, acceptedAnswers: [...normalizeAnswers(question.acceptedAnswers), ''] };
        }));
    };

    const removeAcceptedAnswer = (questionId: string, answerIndex: number) => {
        setQuestions(questions.map(question => {
            if (question.id !== questionId) return question;
            const acceptedAnswers = normalizeAnswers(question.acceptedAnswers).filter((_, index) => index !== answerIndex);
            return { ...question, acceptedAnswers: acceptedAnswers.length ? acceptedAnswers : [''] };
        }));
    };

    const updateImageOption = (questionId: string, optionIndex: number, field: 'text' | 'imageUrl', value: string) => {
        setQuestions(questions.map(question => {
            if (question.id !== questionId) return question;
            const imageOptions = question.imageOptions?.length ? [...question.imageOptions] : question.options.map(text => ({ text, imageUrl: '' }));
            imageOptions[optionIndex] = { ...(imageOptions[optionIndex] || { text: '', imageUrl: '' }), [field]: value };
            return { ...question, imageOptions, options: imageOptions.map(option => option.text) };
        }));
    };

    const addImageOption = (questionId: string) => {
        setQuestions(questions.map(question => {
            if (question.id !== questionId) return question;
            const imageOptions = question.imageOptions?.length ? [...question.imageOptions] : question.options.map(text => ({ text, imageUrl: '' }));
            if (imageOptions.length >= 4) return question;
            const nextOptions = [...imageOptions, { text: '', imageUrl: '' }];
            return { ...question, imageOptions: nextOptions, options: nextOptions.map(option => option.text) };
        }));
    };

    const removeImageOption = (questionId: string, optionIndex: number) => {
        setQuestions(questions.map(question => {
            if (question.id !== questionId) return question;
            const imageOptions = (question.imageOptions?.length ? question.imageOptions : question.options.map(text => ({ text, imageUrl: '' }))).filter((_, index) => index !== optionIndex);
            if (imageOptions.length < 2) return question;
            let correctOption = question.correctOption;
            if (optionIndex < correctOption) correctOption -= 1;
            if (optionIndex === correctOption) correctOption = 0;
            return { ...question, imageOptions, options: imageOptions.map(option => option.text), correctOption };
        }));
    };

    const handleImageOptionFile = (questionId: string, optionIndex: number, file?: File) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => updateImageOption(questionId, optionIndex, 'imageUrl', String(reader.result || ''));
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!title) return alert('Vui lòng nhập tên bài.');
        if (videoSource === 'youtube' && !url) return alert('Vui lòng nhập link YouTube.');
        if (videoSource === 'local' && !localVideoFile && !editingLesson?.localVideoName) return alert('Vui lòng tải video từ máy lên.');
        if (urlError) return alert('Video này bị chặn nhúng, vui lòng đổi video khác.');

        const lessonId = editingLesson?.id || uuidv4();

        if (videoSource === 'local' && localVideoFile) {
            await saveLocalVideoFile(lessonId, localVideoFile);
        }

        const lessonToSave: VideoLesson = {
            id: lessonId,
            title,
            youtubeUrl: videoSource === 'local' ? '' : getCleanVideoUrl(url),
            videoSource,
            localVideoName: videoSource === 'local' ? (localVideoFile?.name || localVideoName || editingLesson?.localVideoName) : undefined,
            localVideoObjectUrl: videoSource === 'local' ? localVideoPreviewUrl : undefined,
            playerTheme,
            startTime,
            allowSeeking,
            questions: prepareQuestionsForSave(),
            createdAt: editingLesson?.createdAt || Date.now(),
        };

        onSave(lessonToSave);
        setSavedLesson(lessonToSave);
        setShowSavedCard(true);
    };

    const handlePreview = () => {
        if (!title) return alert('Vui lòng nhập tên bài để xem thử');
        if (videoSource === 'youtube' && !url) return alert('Vui lòng nhập link YouTube để xem thử');
        if (videoSource === 'local' && !localVideoPreviewUrl) return alert('Vui lòng tải video từ máy để xem thử');
        if (urlError) return alert('Video này bị chặn nhúng, vui lòng đổi video khác.');

        const previewLesson: VideoLesson = {
            id: 'interactive-preview',
            title,
            youtubeUrl: videoSource === 'local' ? '' : getCleanVideoUrl(url),
            videoSource,
            localVideoName,
            localVideoObjectUrl: videoSource === 'local' ? localVideoPreviewUrl : undefined,
            playerTheme,
            startTime,
            allowSeeking,
            questions: prepareQuestionsForSave(),
            createdAt: Date.now(),
        };
        onPlay(previewLesson);
    };

    const safeFileName = (name: string) => {
        return (name || 'video-tuong-tac')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9-_]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase() || 'video-tuong-tac';
    };

    const createProjectBackupObject = () => {
        const lessonBackup: VideoLesson = {
            id: editingLesson?.id || uuidv4(),
            title: title.trim(),
            youtubeUrl: videoSource === 'local' ? '' : getCleanVideoUrl(url),
            videoSource,
            localVideoName: videoSource === 'local' ? (localVideoFile?.name || localVideoName || editingLesson?.localVideoName) : undefined,
            playerTheme: normalizeVideoPlayerTheme(playerTheme),
            startTime,
            allowSeeking,
            questions: prepareQuestionsForSave(),
            createdAt: editingLesson?.createdAt || Date.now(),
        };

        return {
            schema: 'giaoviencn.interactive-video.backup',
            version: 1,
            exportedAt: new Date().toISOString(),
            app: 'GiaoVienCN',
            note: 'Bản sao lưu dùng để import lại cấu hình bài học. Video tải từ máy không được nhúng trong file JSON.',
            lesson: lessonBackup,
            assets: {
                localVideoIncluded: false,
                localVideoName: lessonBackup.localVideoName || '',
            },
        };
    };

    const handleExportProjectBackup = () => {
        if (!title.trim()) return alert('Vui lòng nhập tên bài trước khi xuất bản sao lưu.');

        const backup = createProjectBackupObject();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${safeFileName(title)}-sao-luu-video.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount);

    const cleanPaymentNotePart = (value: string) => {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .slice(0, 32);
    };

    const selectedExportPackage = EXPORT_PACKAGES.find(pkg => pkg.id === selectedExportPackageId) || EXPORT_PACKAGES[0];
    const isTrialExportPackage = Boolean(selectedExportPackage.isTrial);

    const getExportPaymentNote = (pkg = selectedExportPackage) => {
        return `VIDEO TUONG TAC XUAT FILE ${pkg.transferCode}`.slice(0, 80);
    };

    const getExportPaymentQrUrl = (pkg = selectedExportPackage) => {
        const params = new URLSearchParams({
            amount: String(pkg.amount),
            addInfo: getExportPaymentNote(pkg),
            accountName: EXPORT_BANK_INFO.accountHolder,
        });
        return `https://img.vietqr.io/image/${EXPORT_BANK_INFO.bankCode}-${EXPORT_BANK_INFO.accountNumber}-compact2.png?${params.toString()}`;
    };

    const copyPaymentText = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedPaymentField(field);
            setTimeout(() => setCopiedPaymentField(null), 1800);
        } catch {
            alert('Khong sao chep duoc tu dong, thay co vui long copy thu cong.');
        }
    };

    useEffect(() => {
        if (userEmail && !exportEmailInput) {
            setExportEmailInput(userEmail);
        }
    }, [userEmail, exportEmailInput]);

    const createExportHtml = (videoFileName: string, scormVersion?: ScormVersion) => {
        const escapeHtml = (value: string) => String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        const exportTitle = escapeHtml(title);
        const authorName = escapeHtml(playerTheme.authorName || 'Tên giáo viên');
        const authorInfo = escapeHtml(playerTheme.authorInfo || 'Giáo viên').replace(/\n/g, '<br>');
        const guideText = escapeHtml(playerTheme.guideText || 'Xem video và trả lời các câu hỏi để hoàn thành bài học.');
        const startTitle = escapeHtml(playerTheme.startTitle || 'Vào bài học');
        const startSubtitle = escapeHtml(playerTheme.startSubtitle || 'Nhập họ tên, lớp và chọn nhân vật đại diện của em.');
        const startButtonText = escapeHtml(playerTheme.startButtonText || 'Bắt đầu học');
        const startClassInput = playerTheme.requireLearnerClass ? '<input id="learnerClass" autocomplete="organization" placeholder="Lớp">' : '';
        const startGateBackground = playerTheme.startBackgroundImage
            ? `linear-gradient(rgba(2,6,23,.34),rgba(2,6,23,.42)),url("${playerTheme.startBackgroundImage}") center/cover no-repeat`
            : `radial-gradient(circle at 20% 0%,${playerTheme.primaryColor}66,transparent 36%),linear-gradient(135deg,#0f172aee,#312e81ee)`;
        const certificateLogoMarkup = playerTheme.certificateLogoImage ? `<img src="${playerTheme.certificateLogoImage}" alt="Logo">` : '';
        const certificateSealMarkup = playerTheme.certificateSealImage ? `<img src="${playerTheme.certificateSealImage}" alt="Con dấu">` : '';
        const certificateSignatureMarkup = playerTheme.certificateSignatureImage ? `<img src="${playerTheme.certificateSignatureImage}" alt="Chữ ký">` : '';
        const logoMarkup = playerTheme.logoImage
            ? `<img src="${playerTheme.logoImage}" alt="Logo">`
            : escapeHtml(playerTheme.logoText || 'GV');
        const authorAvatarMarkup = playerTheme.authorAvatarImage
            ? `<img src="${playerTheme.authorAvatarImage}" alt="Ảnh tác giả">`
            : escapeHtml((playerTheme.authorName || 'GV').slice(0, 2).toUpperCase());
        const exportSurface = playerTheme.questionStyle === 'card' ? '#f8fafc' : playerTheme.backgroundColor;
        const exportPanel = playerTheme.questionStyle === 'card' ? playerTheme.surfaceColor : playerTheme.backgroundColor;
        const exportPanelText = playerTheme.questionStyle === 'card' ? playerTheme.textColor : '#ffffff';
        const exportMutedText = playerTheme.questionStyle === 'card' ? '#64748b' : '#cbd5e1';
        const exportBorder = playerTheme.questionStyle === 'card' ? 'rgba(15,23,42,.12)' : 'rgba(255,255,255,.16)';
        const questionCardBackground = playerTheme.questionStyle === 'card'
            ? '#ffffff'
            : playerTheme.questionStyle === 'gradient'
                ? `radial-gradient(circle at 14% 4%, rgba(255,255,255,.30), transparent 26%), radial-gradient(circle at 92% 92%, ${playerTheme.accentColor}55, transparent 30%), linear-gradient(135deg, ${playerTheme.primaryColor} 0%, ${playerTheme.secondaryColor} 58%, ${playerTheme.accentColor} 118%)`
            : playerTheme.questionStyle === 'playful'
                ? `linear-gradient(135deg, ${playerTheme.accentColor} 0%, ${playerTheme.primaryColor}55 48%, ${playerTheme.secondaryColor} 100%)`
                : `linear-gradient(135deg, ${playerTheme.backgroundColor}ee, ${playerTheme.primaryColor}33, ${playerTheme.secondaryColor}33)`;
        const compactGradientQuestion = playerTheme.questionStyle === 'playful' || playerTheme.questionStyle === 'gradient';
        const questionOverlayBackground = compactGradientQuestion
            ? 'rgba(2,6,23,.16)'
            : playerTheme.questionStyle === 'card'
                ? 'rgba(2,6,23,.22)'
                : `linear-gradient(135deg, ${playerTheme.backgroundColor}88, ${playerTheme.primaryColor}55, ${playerTheme.secondaryColor}44)`;
        const exportFontScale = Math.min(118, Math.max(90, Number(playerTheme.fontScale || 100)));
        const sidebarStyle = playerTheme.sidebarCardStyle || 'glow';
        const sidebarPulseCss = playerTheme.sidebarCardPulse ? 'qitem-pulse' : '';
        const sidebarIcon = escapeHtml(playerTheme.sidebarIcon || '👩‍🏫');
        const sidebarBaseCss = sidebarStyle === 'neon'
            ? `border-color:${playerTheme.primaryColor}aa!important;background:linear-gradient(135deg,${playerTheme.backgroundColor},${playerTheme.primaryColor}24)!important;color:#fff!important;box-shadow:0 0 0 1px ${playerTheme.primaryColor}66,0 0 26px ${playerTheme.primaryColor}55!important`
            : sidebarStyle === 'solid'
                ? `border-color:${playerTheme.primaryColor}55!important;background:${playerTheme.primaryColor}!important;color:#fff!important;box-shadow:0 16px 34px ${playerTheme.primaryColor}24!important`
                : sidebarStyle === 'soft'
                    ? `border-color:rgba(226,232,240,.95)!important;background:#f8fafc!important;color:#334155!important;box-shadow:0 8px 18px rgba(15,23,42,.06)!important`
                    : `border-color:${playerTheme.primaryColor}66!important;background:linear-gradient(135deg,#ffffff,${playerTheme.primaryColor}12)!important;color:#1e293b!important;box-shadow:0 14px 34px ${playerTheme.primaryColor}24!important`;
        const exportLayoutCss = playerTheme.layout === 'sidebar'
            ? ''
            : playerTheme.layout === 'full'
                ? `.layout-full .app{width:100%;padding:0}.layout-full .shell{height:100vh!important;border:0!important;border-radius:0!important;box-shadow:none!important}.layout-full .topbar,.layout-full .metaTop,.layout-full .foot,.layout-full .side{display:none!important}.layout-full .layout{display:block!important;height:100vh!important;min-height:0!important}.layout-full .main{height:100vh!important;padding:0!important}.layout-full .player{height:100vh!important;border:0!important;border-radius:0!important}.layout-full .stage{flex:1 1 auto!important;height:calc(100vh - 54px)!important;aspect-ratio:auto!important}.layout-full .controls{height:54px!important}.layout-full video{object-fit:contain!important}`
                : `.layout-cinema .side{display:none!important}.layout-cinema .layout{display:block!important;min-height:0!important}.layout-cinema .app{width:min(1440px,100%)}.layout-cinema .shell{min-height:calc(100vh - 16px)}.layout-cinema .main{padding:14px!important}.layout-cinema .player{max-width:1280px;margin:0 auto}.layout-cinema .stage{aspect-ratio:16/9!important}`;
        const exportControlClasses = [
            !playerTheme.showFooterBar && 'hide-footer',
            !playerTheme.showControlBar && 'hide-controls',
            !playerTheme.showBackButton && 'hide-back',
            !playerTheme.showPlayButton && 'hide-play',
            !playerTheme.showNextButton && 'hide-next',
            !playerTheme.showRestartButton && 'hide-restart',
            !playerTheme.showPageIndicator && 'hide-page',
            !playerTheme.showProgressBar && 'hide-progress',
            !playerTheme.showTimeDisplay && 'hide-time',
            !playerTheme.showFullscreenButton && 'hide-fullscreen',
        ].filter(Boolean).join(' ');
        const exportLayoutClass = [`layout-${playerTheme.layout || 'cinema'}`, exportControlClasses].filter(Boolean).join(' ');
        const exportControlCss = `.hide-footer .foot{display:none!important}.hide-controls .controls{display:none!important}.hide-back #back,.hide-play #play,.hide-next #next,.hide-restart #restart,.hide-page .page,.hide-progress .progress,.hide-time .time,.hide-fullscreen #full{display:none!important}.layout-full.hide-controls .stage{height:100vh!important}`;
        const exportData = {
            title,
            videoFileName,
            startTime,
            allowSeeking,
            questions: prepareQuestionsForSave(),
            theme: playerTheme,
            scormVersion: scormVersion || null,
        };

        return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${exportTitle}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Play:wght@400;700&family=Paytone+One&display=swap');
*{box-sizing:border-box}body{margin:0;font-family:${playerTheme.fontFamily},Arial,sans-serif;font-size:${exportFontScale}%;background:radial-gradient(circle at 10% 0%,${playerTheme.primaryColor}22,transparent 32%),#0b1120;color:#e5edf8;min-height:100vh}.app{width:min(1640px,100%);margin:0 auto;padding:8px 14px 16px}.shell{border:1px solid rgba(148,163,184,.18);border-radius:${Math.max(16, playerTheme.radius)}px;background:#101827;box-shadow:0 24px 80px rgba(0,0,0,.38);overflow:hidden}.topbar{height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid rgba(148,163,184,.14);font-size:13px;font-weight:900;letter-spacing:.04em;color:#aeb8c9;text-transform:uppercase}.stats{display:flex;align-items:center;gap:14px;color:#fff}.layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;min-height:calc(100vh - 86px)}.main{padding:14px 14px 8px}.player{border:1px solid rgba(148,163,184,.22);border-radius:${playerTheme.radius}px;background:#030712;overflow:hidden}.stage{position:relative;aspect-ratio:16/9;background:#020617}video{width:100%;height:100%;object-fit:contain;background:#000}.metaTop{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;border-bottom:1px solid rgba(148,163,184,.14);background:#070d1d}.brand{display:flex;align-items:center;gap:10px;min-width:0;font-weight:900;color:#fff}.logo{display:inline-grid;place-items:center;overflow:hidden;min-width:32px;width:32px;height:32px;border-radius:999px;background:${playerTheme.primaryColor};font-size:12px}.logo img,.school-logo img{width:100%;height:100%;object-fit:contain}.badge{shrink:0;border-radius:999px;background:rgba(148,163,184,.14);padding:9px 14px;font-weight:900;color:#fff}.foot{display:flex;justify-content:space-between;gap:18px;padding:12px 18px;border-top:1px solid rgba(148,163,184,.14);background:#070d1d;font-weight:900;color:#fff}.overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:${questionOverlayBackground};backdrop-filter:blur(1px)}.overlay.show{display:flex}.card{width:min(570px,96%);border:1px solid rgba(255,255,255,.24);border-radius:${Math.max(16, playerTheme.radius)}px;padding:24px;background:${questionCardBackground};color:${playerTheme.questionStyle === 'card' ? playerTheme.textColor : '#fff'};box-shadow:0 24px 80px rgba(0,0,0,.36)}.qtitle{text-align:center;font-size:24px;font-weight:950;margin:0 0 18px}.option{width:100%;border:0;border-radius:999px;background:#fff;color:#1f2937;padding:13px 16px;margin:8px 0;text-align:left;font-weight:900;cursor:pointer}.option.selected{outline:3px solid ${playerTheme.accentColor}}.actions{display:flex;gap:10px;margin-top:16px}.actions button{flex:1;border:0;border-radius:999px;padding:13px 16px;color:#fff;font-weight:950;cursor:pointer}.primary{background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor})}.secondary{background:#0ea5e9}.result{min-height:24px;text-align:center;font-weight:950;margin-top:12px}.controls{height:54px;display:flex;align-items:center;gap:8px;padding:0 16px;background:#070d1d;border-top:1px solid rgba(148,163,184,.14)}.ctrl{width:32px;height:32px;border:0;border-radius:7px;background:#475569;color:#fff;font-weight:950;cursor:pointer}.ctrl:hover{background:${playerTheme.primaryColor}}.page{font-weight:950;color:#fff;margin-left:10px}.progress{flex:1;height:4px;accent-color:${playerTheme.primaryColor}}.time{font-size:12px;font-weight:900;color:#cbd5e1}.side{border-left:1px solid rgba(148,163,184,.14);background:#0e1628;padding:28px 26px}.school-logo{width:86px;height:86px;border-radius:999px;margin:0 auto 34px;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle,#fff 0 40%,${playerTheme.primaryColor} 42% 65%,#fff 67%);color:${playerTheme.primaryColor};font-weight:950}.profile{display:flex;align-items:center;gap:13px;margin-bottom:14px}.avatar{width:58px;height:58px;border-radius:14px;display:grid;place-items:center;overflow:hidden;background:#fff;color:${playerTheme.primaryColor};font-weight:950;border:3px solid rgba(255,255,255,.25)}.avatar img{width:100%;height:100%;object-fit:cover}.name{font-weight:950;color:#fff}.role{font-size:13px;color:#cbd5e1}.info{width:100%;border:1px solid rgba(255,255,255,.16);border-radius:4px;background:#334155;color:#fff;padding:9px;font-weight:900}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:28px 0 12px}.tab{background:#1f2937;color:#94a3b8;padding:10px;text-align:center;font-weight:900;font-size:13px}.tab.active{background:#334155;color:#fff}.search{width:100%;background:#050b16;border:0;color:#fff;padding:12px;margin-bottom:22px}.section-title{font-size:13px;font-weight:950;color:#fff;margin:0 0 12px;text-transform:uppercase}.qlist{display:flex;flex-direction:column;gap:10px}.qitem{min-height:68px;border:1px solid rgba(148,163,184,.16);border-radius:22px;padding:13px 16px;background:#111a2e;color:#cbd5e1;font-weight:800;display:flex;justify-content:space-between;align-items:center;transition:.24s}.qtext{min-width:0;display:flex;align-items:center;gap:12px}.qicon{display:grid;place-items:center;width:36px;height:36px;flex:0 0 36px;border-radius:999px;background:rgba(255,255,255,.88);box-shadow:0 8px 18px rgba(15,23,42,.10)}.qname{display:block;font-size:.95rem;font-weight:950;line-height:1.1}.qnum{display:none}.guide{display:none;color:#cbd5e1;line-height:1.55;font-size:14px}.side.show-guide .qlist,.side.show-guide .search,.side.show-guide .section-title{display:none}.side.show-guide .guide{display:block}@media(max-width:980px){.layout{grid-template-columns:1fr}.side{border-left:0;border-top:1px solid rgba(148,163,184,.14)}.app{padding:0}.shell{border-radius:0}.badge{display:none}}@media(max-width:700px){.topbar{padding:0 14px}.main{padding:8px}.brand{font-size:12px}.foot{font-size:12px}.qtitle{font-size:19px}.controls{gap:5px;padding:0 8px}.time{display:none}}
.bubble-bg{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}.bubble-bg span{position:absolute;bottom:-120px;left:var(--l);display:block;width:var(--s);height:var(--s);border-radius:999px;background:radial-gradient(circle at 30% 28%,rgba(255,255,255,.92),rgba(255,255,255,.34) 28%,rgba(255,255,255,.12) 58%,rgba(255,255,255,.03));box-shadow:inset -10px -14px 22px rgba(255,255,255,.08),inset 8px 10px 18px rgba(255,255,255,.2),0 0 22px rgba(255,255,255,.16);opacity:var(--o,.28);filter:blur(var(--b,0));animation:bubbleRise var(--d,18s) linear infinite;animation-delay:var(--delay,0s)}@keyframes bubbleRise{0%{transform:translate3d(0,0,0) scale(.82);opacity:0}12%,72%{opacity:var(--o,.28)}100%{transform:translate3d(var(--x,24px),-112vh,0) scale(1.08);opacity:0}}#fx{position:fixed;inset:0;z-index:160;pointer-events:none}.bonus{position:fixed;left:50%;top:22%;z-index:95;transform:translate(-50%,-20px) scale(.8);opacity:0;border-radius:999px;background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor});padding:12px 24px;color:#fff;font-size:28px;font-weight:950;box-shadow:0 18px 50px rgba(0,0,0,.35);transition:.45s}.bonus.show{transform:translate(-50%,-52px) scale(1);opacity:1}.cert{width:100%;border:0;border-radius:12px;background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor});color:#fff;padding:12px 14px;margin-top:16px;font-weight:950;cursor:pointer;box-shadow:0 12px 30px ${playerTheme.primaryColor}33}.cert:hover{filter:brightness(1.08)}
body{background:radial-gradient(circle at 10% 0%,${playerTheme.primaryColor}33,transparent 32%),radial-gradient(circle at 90% 0%,${playerTheme.secondaryColor}24,transparent 30%),${exportSurface}!important}.app{position:relative;z-index:1}.themeSync{color:${exportPanelText}}.shell,.player{background:${exportPanel}!important;border-color:${exportBorder}!important}.topbar,.metaTop,.foot,.controls{background:linear-gradient(90deg,${playerTheme.primaryColor}22,${playerTheme.secondaryColor}22),${exportPanel}!important;border-color:${exportBorder}!important;color:${exportPanelText}!important}.side{background:${playerTheme.questionStyle === 'card' ? '#ffffff' : exportPanel}!important;color:${exportPanelText}!important;border-color:${exportBorder}!important}.tab,.info,.qitem{background:${playerTheme.questionStyle === 'card' ? '#f8fafc' : `${playerTheme.primaryColor}18`}!important;color:${exportPanelText}!important;border-color:${exportBorder}!important}.tab.active{background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor})!important;color:#fff!important}.search{background:${playerTheme.questionStyle === 'card' ? '#f1f5f9' : '#00000033'}!important;color:${exportPanelText}!important}.role,.guide,.time,.qitem small{color:${exportMutedText}!important}.section-title,.name{color:${exportPanelText}!important}.school-logo,.avatar{color:${playerTheme.primaryColor}!important}.ctrl{background:${playerTheme.primaryColor}!important}.ctrl:hover{background:${playerTheme.secondaryColor}!important}.badge{background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor})!important}
.qitem:not(.answered){${sidebarBaseCss}}.qitem.answered{border-color:rgba(16,185,129,.34)!important;background:linear-gradient(135deg,rgba(236,253,245,.96),rgba(209,250,229,.9))!important;color:#047857!important;box-shadow:0 10px 28px rgba(16,185,129,.12)!important}.qitem.active{border-color:${playerTheme.primaryColor}cc!important;background:linear-gradient(135deg,${playerTheme.backgroundColor},${playerTheme.primaryColor}28)!important;color:#fff!important;box-shadow:0 0 0 1px ${playerTheme.primaryColor}55,0 0 22px ${playerTheme.primaryColor}38!important}@keyframes qitemSoftPulse{0%,100%{filter:brightness(1);box-shadow:0 10px 24px rgba(15,23,42,.09),0 0 0 1px ${playerTheme.primaryColor}42}50%{filter:brightness(1.035);box-shadow:0 12px 28px rgba(15,23,42,.11),0 0 0 1px ${playerTheme.primaryColor}66,0 0 18px ${playerTheme.primaryColor}38}}@keyframes qitemBorderBreathe{0%,100%{opacity:.28;transform:scale(1)}50%{opacity:.82;transform:scale(1.018)}}.qitem-pulse{position:relative;overflow:visible;animation:qitemSoftPulse 1.75s ease-in-out infinite;backface-visibility:hidden;transform:translateZ(0);will-change:box-shadow,filter}.qitem-pulse:after{content:'';position:absolute;inset:-3px;z-index:2;border-radius:inherit;border:1px solid ${playerTheme.primaryColor}b8;box-shadow:0 0 10px ${playerTheme.primaryColor}61,0 0 24px ${playerTheme.primaryColor}2e;pointer-events:none;animation:qitemBorderBreathe 1.75s ease-in-out infinite}.qitem-pulse>*{position:relative;z-index:3}
@keyframes questionCardIn{from{opacity:0;transform:translateY(22px) scale(.96);filter:blur(6px)}to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}}@keyframes questionFloat{0%,100%{translate:0 0}50%{translate:0 -4px}}@keyframes questionSheen{0%,42%{transform:translateX(-120%)}72%,100%{transform:translateX(120%)}}@keyframes pulseTop{0%,100%{opacity:.72}50%{opacity:1}}@keyframes optionIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.card{position:relative;width:min(680px,96%);overflow:hidden;border-radius:${Math.max(22, playerTheme.radius)}px;padding:26px;background:${questionCardBackground};border:1px solid ${playerTheme.questionStyle === 'card' ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.28)'};box-shadow:0 28px 90px rgba(15,23,42,.32),0 0 0 1px ${playerTheme.primaryColor}22;backdrop-filter:blur(16px);animation:questionCardIn .46s cubic-bezier(.2,.8,.2,1) both,questionFloat 5s ease-in-out .7s infinite}.card:before{content:'';position:absolute;left:0;right:0;top:0;z-index:1;height:6px;background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor});animation:pulseTop 2.6s ease-in-out infinite}.card:after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.16) 44%,transparent 60%);animation:questionSheen 4.4s ease-in-out infinite}.card>*{position:relative;z-index:2}.qhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 14px}.qtag,.qpoints{border-radius:999px;padding:6px 12px;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:0}.qtag{background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor});color:#fff}.qpoints{background:#f1f5f9;color:#64748b}.qtitle{text-align:left;font-size:${compactGradientQuestion ? '26px' : '30px'};line-height:1.16;font-weight:950;letter-spacing:0;margin:0 0 8px}.qhint{display:block;margin:0 0 20px;color:${playerTheme.questionStyle === 'card' ? '#64748b' : 'rgba(255,255,255,.78)'};font-size:14px;font-weight:800}.option{width:100%;display:flex;align-items:center;gap:12px;border:1px solid #e2e8f0;border-bottom:4px solid rgba(15,23,42,.14);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,.96));color:#1f2937;padding:13px 14px;margin:10px 0;text-align:left;font-weight:900;cursor:pointer;transform-style:preserve-3d;box-shadow:0 8px 0 rgba(15,23,42,.18),0 18px 34px rgba(15,23,42,.16),inset 0 1px 0 rgba(255,255,255,.85);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease;animation:optionIn .26s ease both}.option:nth-child(2){animation-delay:.05s}.option:nth-child(3){animation-delay:.1s}.option:nth-child(4){animation-delay:.15s}.option:hover{transform:translateY(-4px) rotateX(3deg);border-color:#cbd5e1;box-shadow:0 10px 0 rgba(15,23,42,.16),0 24px 42px rgba(15,23,42,.2),inset 0 1px 0 rgba(255,255,255,.9)}.option:active{transform:translateY(2px);box-shadow:0 3px 0 rgba(15,23,42,.22),0 10px 20px rgba(15,23,42,.16),inset 0 1px 0 rgba(255,255,255,.7)}.option.selected{outline:0;border-color:transparent;border-bottom-color:${playerTheme.primaryColor}99;box-shadow:0 6px 0 ${playerTheme.primaryColor}55,0 0 0 3px ${playerTheme.primaryColor}55,0 18px 36px rgba(15,23,42,.18),inset 0 1px 0 rgba(255,255,255,.8)}.option.selected:after{content:'✓';display:grid;place-items:center;flex:0 0 22px;width:22px;height:22px;border-radius:999px;background:#10b981;color:#fff;font-size:13px;font-weight:950}.olabel{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border-radius:12px;background:#f1f5f9;color:#64748b;font-weight:950;box-shadow:0 4px 0 rgba(15,23,42,.14),inset 0 1px 0 rgba(255,255,255,.8)}.option.selected .olabel{background:linear-gradient(135deg,${playerTheme.primaryColor},${playerTheme.secondaryColor});color:#fff}.otext{min-width:0;flex:1;line-height:1.35}.actions{display:flex;gap:12px;margin-top:18px}.actions button{flex:1;border:0;border-bottom:4px solid rgba(15,23,42,.24);border-radius:16px;padding:14px 16px;color:#fff;font-weight:950;cursor:pointer;box-shadow:0 8px 0 rgba(15,23,42,.2),0 18px 34px rgba(15,23,42,.18),inset 0 1px 0 rgba(255,255,255,.34);transition:transform .16s ease,filter .16s ease,box-shadow .16s ease}.actions button:hover{transform:translateY(-3px) rotateX(3deg);filter:brightness(1.06);box-shadow:0 10px 0 rgba(15,23,42,.18),0 24px 42px rgba(15,23,42,.22),inset 0 1px 0 rgba(255,255,255,.4)}.actions button:active{transform:translateY(2px);box-shadow:0 3px 0 rgba(15,23,42,.24),0 10px 20px rgba(15,23,42,.16),inset 0 1px 0 rgba(255,255,255,.26)}
.final{position:fixed;inset:0;z-index:130;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(2,6,23,.78);backdrop-filter:blur(12px)}.final.show{display:flex}.final-card{width:min(560px,100%);overflow:hidden;border-radius:28px;background:#fff;text-align:center;color:#0f172a;box-shadow:0 30px 100px rgba(0,0,0,.42)}.final-bar{height:8px;background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor})}.final-body{padding:30px}.final-icon{width:82px;height:82px;margin:0 auto 16px;border-radius:24px;display:grid;place-items:center;background:#fef3c7;color:#f59e0b;font-size:44px}.final-kicker{margin:0 0 8px;text-transform:uppercase;letter-spacing:.16em;color:#94a3b8;font-size:12px;font-weight:950}.final-title{margin:0 0 10px;font-size:30px;font-weight:950}.final-desc{margin:0 0 18px;color:#64748b;font-weight:800}.final-score{display:inline-flex;align-items:center;gap:8px;margin-bottom:22px;border-radius:18px;background:#ecfdf5;color:#047857;padding:12px 18px;font-size:22px;font-weight:950}.final-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.final-actions button{border:0;border-radius:16px;padding:13px 12px;font-weight:950;cursor:pointer}.final-cert{background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor});color:#fff}.final-replay{background:#f1f5f9;color:#334155}.final-exit{background:#0f172a;color:#fff}.cert:disabled{cursor:not-allowed;opacity:.45;filter:grayscale(.35)}
.gate{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;padding:22px;background:${startGateBackground};backdrop-filter:blur(2px)}.gate-card{width:min(520px,100%);border:1px solid rgba(255,255,255,.22);border-radius:26px;background:rgba(255,255,255,.94);padding:28px;color:#1e293b;box-shadow:0 28px 90px rgba(0,0,0,.42);text-align:center}.gate-card h1{margin:0 0 8px;font-size:28px;color:${playerTheme.primaryColor}}.gate-card p{margin:0 0 18px;color:#64748b;font-weight:700}.gate-card input{width:100%;border:2px solid #e2e8f0;border-radius:16px;padding:14px 16px;font-size:17px;font-weight:800;outline:none;margin-bottom:10px}.gate-card input:focus{border-color:${playerTheme.primaryColor}}.avatars{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:10px 0 18px}.avatarPick{position:relative;display:grid;place-items:center;height:58px;border:2px solid #e2e8f0;border-radius:18px;background:#fff;font-size:30px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,filter .18s ease;animation:avatarEntrance .36s ease both}.avatarPick:nth-child(2){animation-delay:.04s}.avatarPick:nth-child(3){animation-delay:.08s}.avatarPick:nth-child(4){animation-delay:.12s}.avatarPick:nth-child(5){animation-delay:.16s}.avatarPick:nth-child(6){animation-delay:.2s}.avatarPick .avatarIcon{position:relative;display:inline-block;line-height:1;filter:drop-shadow(0 6px 6px rgba(15,23,42,.18));animation:avatarIcon3d 1.7s ease-in-out infinite}.avatarPick:hover{transform:translateY(-3px) scale(1.06);border-color:${playerTheme.primaryColor}77;box-shadow:0 14px 26px rgba(15,23,42,.14)}.avatarPick.active{border-color:${playerTheme.primaryColor};background:${playerTheme.primaryColor}10;transform:translateY(-2px) scale(1.05);box-shadow:0 0 0 2px rgba(168,85,247,.18),0 10px 22px rgba(124,58,237,.13);animation:avatarSelectedPulse 1.2s ease-in-out infinite}.avatarPick.active .avatarIcon{animation:avatarIcon3d 1.05s ease-in-out infinite}.startBtn{width:100%;border:0;border-radius:16px;background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor});color:#fff;padding:15px 18px;font-size:17px;font-weight:950;cursor:pointer;box-shadow:0 14px 30px ${playerTheme.primaryColor}28;transition:transform .16s ease,filter .16s ease}.startBtn:hover{filter:brightness(1.06);transform:translateY(-1px)}@keyframes avatarEntrance{from{opacity:0;transform:translateY(12px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes avatarIcon3d{0%,100%{transform:translateY(0) rotate(-2deg) scale(1)}45%{transform:translateY(-5px) rotate(4deg) scale(1.08)}}@keyframes avatarSelectedPulse{0%,100%{box-shadow:0 0 0 2px rgba(168,85,247,.18),0 10px 22px rgba(124,58,237,.13);filter:brightness(1)}50%{box-shadow:0 0 0 4px rgba(236,72,153,.22),0 14px 28px rgba(124,58,237,.2);filter:brightness(1.06)}}
@media (min-width:981px){html,body{height:100%;overflow:hidden}.app{height:100vh;padding:8px}.shell{height:calc(100vh - 16px);display:flex;flex-direction:column}.topbar{height:38px;flex:0 0 auto}.layout{flex:1;min-height:0;height:auto;grid-template-columns:minmax(0,1fr) clamp(250px,21vw,320px)}.main{min-height:0;padding:10px}.player{height:100%;display:flex;flex-direction:column}.metaTop{flex:0 0 auto;padding:8px 14px}.stage{flex:1;min-height:0;aspect-ratio:auto}.foot{flex:0 0 auto;padding:8px 14px}.controls{flex:0 0 auto;height:44px}.side{min-height:0;overflow-y:auto;padding:18px}.school-logo{width:70px;height:70px;margin-bottom:18px}.profile{margin-bottom:10px}.tabs{margin:18px 0 10px}.cert{margin-top:12px}.badge{max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}@media (max-width:980px){body{overflow:auto}.app{min-height:100vh}.player{display:flex;flex-direction:column}.stage{aspect-ratio:16/9}.side{max-height:none;overflow:visible}}@media (max-height:720px) and (min-width:981px){.topbar{height:34px}.main{padding:8px}.metaTop{padding:7px 12px}.foot{padding:7px 12px}.controls{height:40px}.side{padding:14px}.school-logo{width:58px;height:58px;margin-bottom:12px}.profile{gap:8px}.avatar{width:48px;height:48px}.info{padding:7px}.tabs{margin:12px 0 8px}.search{padding:9px;margin-bottom:14px}.qitem{padding:10px 12px}.cert{padding:10px 12px}}
${exportLayoutCss}
${exportControlCss}
.card,.card button,.card input{font-family:'Play','Paytone One','Be Vietnam Pro',Arial,sans-serif!important;letter-spacing:0}.qtitle{font-family:'Play','Paytone One','Be Vietnam Pro',Arial,sans-serif!important;font-weight:700!important;letter-spacing:0;text-shadow:0 3px 0 rgba(15,23,42,.08),0 10px 24px rgba(15,23,42,.16)}.option,.otext,.actions button{font-family:'Play','Paytone One','Be Vietnam Pro',Arial,sans-serif!important;font-weight:700!important;letter-spacing:0}
</style>
</head>
<body class="${exportLayoutClass}">
<div class="bubble-bg" aria-hidden="true"><span style="--l:7%;--s:46px;--d:17s;--delay:-4s;--x:28px;--o:.24"></span><span style="--l:16%;--s:72px;--d:22s;--delay:-11s;--x:-34px;--o:.2;--b:.2px"></span><span style="--l:31%;--s:38px;--d:15s;--delay:-7s;--x:42px;--o:.28"></span><span style="--l:47%;--s:96px;--d:26s;--delay:-17s;--x:-26px;--o:.18;--b:.4px"></span><span style="--l:63%;--s:58px;--d:19s;--delay:-2s;--x:36px;--o:.23"></span><span style="--l:79%;--s:84px;--d:24s;--delay:-13s;--x:-42px;--o:.2"></span><span style="--l:93%;--s:34px;--d:14s;--delay:-8s;--x:-24px;--o:.3"></span></div><div id="startGate" class="gate"><div class="gate-card"><h1>Vào bài học</h1><p>Nhập họ tên và chọn nhân vật đại diện của em.</p><input id="learnerName" autocomplete="name" placeholder="Họ và tên học sinh"><div class="avatars"><button class="avatarPick active" title="Bé trai" data-avatar="👦"><span class="avatarIcon">👦</span></button><button class="avatarPick" title="Bé gái" data-avatar="👧"><span class="avatarIcon">👧</span></button><button class="avatarPick" title="Rô bốt" data-avatar="🤖"><span class="avatarIcon">🤖</span></button><button class="avatarPick" title="Siêu nhân nam" data-avatar="🦸‍♂️"><span class="avatarIcon">🦸‍♂️</span></button><button class="avatarPick" title="Siêu nhân nữ" data-avatar="🦸‍♀️"><span class="avatarIcon">🦸‍♀️</span></button><button class="avatarPick" title="Phi hành gia" data-avatar="👨‍🚀"><span class="avatarIcon">👨‍🚀</span></button></div><button id="startLesson" class="startBtn">Bắt đầu học</button></div></div><canvas id="fx"></canvas><div id="bonus" class="bonus">+10</div><div class="app themeSync"><main class="shell"><div class="topbar"><span>Video bài giảng tương tác</span><div class="stats"><span>★ Điểm: <b id="score">0</b></span><span id="learnerBadge"></span></div></div><div class="layout"><section class="main"><div class="player"><div class="metaTop"><div class="brand"><span class="logo">${logoMarkup}</span><span>${escapeHtml(playerTheme.publishTitle || title)}</span></div><div class="badge">${escapeHtml(playerTheme.publishSubtitle || '')}</div></div><div class="stage"><video id="video" src="${videoFileName}" playsinline></video><div id="overlay" class="overlay"><div class="card"><div class="qhead"><span class="qtag">Câu hỏi tương tác</span><span class="qpoints">+10 điểm</span></div><h2 id="qtext" class="qtitle"></h2><p class="qhint">Chọn đáp án đúng nhất, sau đó kiểm tra kết quả.</p><div id="opts"></div><div class="actions"><button class="primary" id="answer">Kiểm tra đáp án</button><button class="secondary" id="rewatch">Xem lại</button></div><div id="result" class="result"></div></div></div></div><div class="foot"><span>${escapeHtml(playerTheme.footerLeftText || 'Giáo viên yêu công nghệ')}</span><span>${escapeHtml(playerTheme.footerRightText || '')}</span></div><div class="controls"><button class="ctrl" id="back">≪</button><button class="ctrl" id="play">▶</button><button class="ctrl" id="next">≫</button><button class="ctrl" id="restart">↻</button><span class="page">1 / 1</span><input class="progress" id="progress" type="range" min="0" value="0" step="0.1"><span class="time"><b id="now">00:00</b> / <b id="dur">00:00</b></span><button class="ctrl" id="full">⛶</button></div></div></section><aside class="side" id="side"><div class="school-logo">${logoMarkup}</div>${playerTheme.showAuthorPanel ? `<div class="profile"><div class="avatar">${authorAvatarMarkup}</div><div><div class="name">${authorName}</div><div class="role">${authorInfo}</div></div></div><button class="info" id="authorInfo">Hiện thông tin</button>` : ''}<div class="tabs"><button class="tab active" id="menuTab">Mục lục</button><button class="tab" id="guideTab">Hướng dẫn</button></div><input class="search" id="searchBox" placeholder="Tìm kiếm"><h3 class="section-title">Trang 1</h3><div class="qlist" id="qlist"></div><div class="guide">${guideText}</div><button class="cert" id="certBtn" disabled>Xuất thư khen</button></aside></div></main></div><div id="finalResult" class="final"><div class="final-card"><div class="final-bar"></div><div class="final-body"><div class="final-icon">🏆</div><p class="final-kicker">Kết quả bài học</p><h2 class="final-title">Hoàn thành xuất sắc</h2><p id="finalDesc" class="final-desc"></p><div id="finalScore" class="final-score"></div><div class="final-actions"><button class="final-cert" id="finalCert">Xuất thư khen</button><button class="final-replay" id="finalReplay">Xem lại</button><button class="final-exit" id="finalExit">Thoát video</button></div></div></div></div>
<script>
const data=${JSON.stringify(exportData)};
const scormVersion=data.scormVersion;
let scormApi=null,scormStarted=false,scormDone=false;
const findScormApi=(win,name)=>{let depth=0;while(win&&depth<8){try{if(win[name])return win[name];if(win.parent===win)break;win=win.parent;depth++}catch(e){break}}try{return window.opener&&window.opener[name]}catch(e){return null}};
const scormCall=(method,...args)=>{try{return scormApi&&scormApi[method]?scormApi[method](...args):null}catch(e){return null}};
const scormInitialize=()=>{if(!scormVersion||scormStarted)return;scormApi=findScormApi(window,scormVersion==='2004'?'API_1484_11':'API');if(!scormApi)return;scormStarted=true;if(scormVersion==='2004'){scormCall('Initialize','');scormCall('SetValue','cmi.completion_status','incomplete');scormCall('SetValue','cmi.success_status','unknown');scormCall('SetValue','cmi.score.min','0');scormCall('SetValue','cmi.score.max',String(totalPoints()));scormCall('Commit','')}else{scormCall('LMSInitialize','');scormCall('LMSSetValue','cmi.core.lesson_status','incomplete');scormCall('LMSSetValue','cmi.core.score.min','0');scormCall('LMSSetValue','cmi.core.score.max',String(totalPoints()));scormCall('LMSCommit','')}};
const scormSetScore=(raw,total)=>{if(!scormVersion)return;scormInitialize();if(!scormApi)return;const score=String(raw||0),max=String(total||100);if(scormVersion==='2004'){scormCall('SetValue','cmi.score.raw',score);scormCall('SetValue','cmi.score.max',max);scormCall('SetValue','cmi.score.scaled',String(total?Math.min(1,raw/total):0));scormCall('Commit','')}else{scormCall('LMSSetValue','cmi.core.score.raw',score);scormCall('LMSSetValue','cmi.core.score.max',max);scormCall('LMSCommit','')}};
const scormComplete=()=>{if(scormDone)return;scormInitialize();if(!scormApi)return;scormDone=true;const total=totalPoints();scormSetScore(points,total);if(scormVersion==='2004'){scormCall('SetValue','cmi.completion_status','completed');scormCall('SetValue','cmi.success_status','passed');scormCall('Commit','')}else{scormCall('LMSSetValue','cmi.core.lesson_status','passed');scormCall('LMSCommit','')}};
const scormFinish=()=>{if(!scormStarted||!scormApi)return;if(scormVersion==='2004')scormCall('Terminate','');else scormCall('LMSFinish','')};
scormInitialize();addEventListener('beforeunload',scormFinish);
const video=document.getElementById('video'),overlay=document.getElementById('overlay'),qtext=document.getElementById('qtext'),opts=document.getElementById('opts'),result=document.getElementById('result'),progress=document.getElementById('progress'),now=document.getElementById('now'),dur=document.getElementById('dur'),play=document.getElementById('play'),score=document.getElementById('score'),menuTab=document.getElementById('menuTab'),guideTab=document.getElementById('guideTab'),side=document.getElementById('side'),qlist=document.getElementById('qlist'),searchBox=document.getElementById('searchBox'),bonus=document.getElementById('bonus'),certBtn=document.getElementById('certBtn'),fx=document.getElementById('fx'),fctx=fx.getContext('2d'),startGate=document.getElementById('startGate'),learnerInput=document.getElementById('learnerName'),startBtn=document.getElementById('startLesson'),learnerBadge=document.getElementById('learnerBadge');
const finalResult=document.getElementById('finalResult'),finalDesc=document.getElementById('finalDesc'),finalScore=document.getElementById('finalScore'),finalCert=document.getElementById('finalCert'),finalReport=document.getElementById('finalReport'),finalGmail=document.getElementById('finalGmail'),finalReplay=document.getElementById('finalReplay'),finalExit=document.getElementById('finalExit');
let current=null,selected=null,answered=[],points=0,particles=[],fxRunning=false,learnerName='',learnerClass='',learnerAvatar='👦',answerReport={},questionAttempts={};
const startHeading=document.querySelector('#startGate h1'),startDescription=document.querySelector('#startGate p');
if(startHeading)startHeading.textContent=data.theme.startTitle||'Vào bài học';
if(startDescription)startDescription.textContent=data.theme.startSubtitle||'Nhập họ tên, lớp và chọn nhân vật đại diện của em.';
if(startBtn)startBtn.textContent=data.theme.startButtonText||'Bắt đầu học';
let learnerClassInput=null;
if(data.theme.requireLearnerClass){learnerClassInput=document.createElement('input');learnerClassInput.id='learnerClass';learnerClassInput.autocomplete='organization';learnerClassInput.placeholder='Lớp';learnerInput.insertAdjacentElement('afterend',learnerClassInput);learnerClassInput.addEventListener('keydown',e=>{if(e.key==='Enter')startBtn.click()})}
function qType(q){return (q&&q.type)||'multiple-choice'}
function qPoints(q){return Number(q&&q.points)||10}
function totalPoints(){return data.questions.reduce((sum,q)=>sum+qPoints(q),0)||100}
function normalizeAnswer(value,caseSensitive){let text=String(value||'').trim().replace(/\\s+/g,' ');if(caseSensitive)return text;return text.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/đ/g,'d')}
function textCorrect(q,value){const accepted=(q.acceptedAnswers||[]).filter(x=>String(x||'').trim());if(!accepted.length)return false;const answer=normalizeAnswer(value,q.caseSensitive);return accepted.some(x=>normalizeAnswer(x,q.caseSensitive)===answer)}
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
let audioCtx=null;
const getAudioCtx=()=>{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx};
const playTone=(freq,start,duration,type='sine',volume=.25)=>{try{const ctx=getAudioCtx(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(0,ctx.currentTime+start);gain.gain.linearRampToValueAtTime(volume,ctx.currentTime+start+.03);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+start+duration);osc.start(ctx.currentTime+start);osc.stop(ctx.currentTime+start+duration+.05)}catch(e){}};
const playAvatarSound=()=>{[740,988].forEach((f,i)=>playTone(f,i*.055,.18,'triangle',.16))};
const playStartSound=()=>{[523.25,659.25,783.99].forEach((f,i)=>playTone(f,i*.08,.22,'sine',.2))};
const playCorrectSoundSynth=()=>{[523.25,659.25,783.99,1046.5].forEach((f,i)=>playTone(f,i*.1,.45,'sine',i===3 ? .22 : .28))};
const playCorrectSound=()=>{try{const sfx=new Audio('https://s2.file2s.com/amthanhhieuung/dung-6.mp3');sfx.volume=.9;sfx.play().catch(()=>playCorrectSoundSynth())}catch(e){playCorrectSoundSynth()}};
const playIncorrectSoundSynth=()=>{[392,311.13,233.08].forEach((f,i)=>playTone(f,i*.13,.32,'sawtooth',.24));playTone(150,.45,.45,'square',.14)};
const playIncorrectSound=()=>{try{const sfx=new Audio('https://s2.file2s.com/amthanhhieuung/sai-4.mp3');sfx.volume=.85;sfx.play().catch(()=>playIncorrectSoundSynth())}catch(e){playIncorrectSoundSynth()}};
const playVictorySoundSynth=()=>{[523.25,659.25,783.99,1046.5,1318.5,1567.98].forEach((f,i)=>playTone(f,i*.14,i>2?.42:.22,'triangle',i>2?.22:.28))};
const playVictorySound=()=>{try{const local=new Audio('assets/sounds/Am_thanh_chuc_mung_chien_thang-www_tiengdong_com.mp3');local.volume=1;local.play().catch(()=>{try{const sfx=new Audio('https://s2.file2s.com/amthanhhieuung/Am_thanh_chucmungchienthang.mp3');sfx.volume=1;sfx.play().catch(()=>playVictorySoundSynth())}catch(e){playVictorySoundSynth()}})}catch(e){playVictorySoundSynth()}};
const resizeFx=()=>{fx.width=innerWidth;fx.height=innerHeight};resizeFx();addEventListener('resize',resizeFx);
const burst=(x,y)=>{const colors=['#fbbf24','#f97316','#22c55e','#38bdf8','#a855f7','#ef4444'];for(let i=0;i<80;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:70+Math.random()*30,c:colors[i%colors.length]})}};
const animateFx=()=>{fxRunning=true;fctx.clearRect(0,0,fx.width,fx.height);particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.045;p.life-=1;fctx.globalAlpha=Math.max(0,p.life/90);fctx.fillStyle=p.c;fctx.beginPath();fctx.arc(p.x,p.y,3,0,Math.PI*2);fctx.fill()});fctx.globalAlpha=1;if(particles.length)requestAnimationFrame(animateFx);else fxRunning=false};
const firework=()=>{for(let i=0;i<5;i++)setTimeout(()=>burst(innerWidth*(.2+Math.random()*.6),innerHeight*(.18+Math.random()*.32)),i*170);if(!fxRunning)animateFx()};
const correctSpark=()=>{burst(innerWidth*.5,innerHeight*.38);setTimeout(()=>burst(innerWidth*.35,innerHeight*.48),120);setTimeout(()=>burst(innerWidth*.65,innerHeight*.48),220);if(!fxRunning)animateFx()};
const showBonus=(amount=10)=>{bonus.textContent='+'+amount;bonus.classList.add('show');setTimeout(()=>bonus.classList.remove('show'),900)};
const safe=s=>String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
function saveCertificatePng(w,learner,prefix,bgColor){const paper=w.document.getElementById('certificatePaper'),style=w.document.getElementById('certificateStyles');if(!paper||!style){alert('Không tìm thấy thư khen để lưu ảnh.');return}const rect=paper.getBoundingClientRect(),width=Math.ceil(rect.width||paper.offsetWidth),height=Math.ceil(rect.height||paper.offsetHeight),cssText=style.textContent||'',markup='<div xmlns="http://www.w3.org/1999/xhtml"><style>'+cssText+'</style>'+paper.outerHTML+'</div>',svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'"><foreignObject width="100%" height="100%">'+markup+'</foreignObject></svg>',img=new Image();let done=false;const fail=()=>{if(done)return;done=true;alert('Không thể lưu ảnh PNG trên trình duyệt này. Thầy cô dùng nút In hoặc lưu PDF giúp em nhé.')};const timer=w.setTimeout(fail,5000);img.onload=()=>{if(done)return;w.clearTimeout(timer);const canvas=w.document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;const ctx=canvas.getContext('2d');ctx.fillStyle=bgColor||'#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.scale(2,2);ctx.drawImage(img,0,0);try{const a=w.document.createElement('a');a.download=prefix+'-'+String(learner||'hoc-sinh').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^\\w-]+/g,'-').toLowerCase()+'.png';a.href=canvas.toDataURL('image/png');w.document.body.appendChild(a);a.click();a.remove();done=true}catch(e){fail()}};img.onerror=fail;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
const fmtLongDate=()=>new Date().toLocaleString('vi-VN');
function answerText(q,index){if(index===null||index===undefined)return'';if(qType(q)==='image-choice')return(q.imageOptions&&q.imageOptions[index]&&q.imageOptions[index].text)||q.options[index]||('Đáp án '+String.fromCharCode(65+index));return(q.options&&q.options[index])||('Đáp án '+String.fromCharCode(65+index))}
function correctText(q){if(qType(q)==='short-answer'||qType(q)==='fill-blank')return(q.acceptedAnswers||[]).filter(x=>String(x||'').trim()).join(' / ')||'Chưa đặt đáp án';return answerText(q,q.correctOption)}
function buildReportText(){const total=totalPoints(),pct=total?Math.round(points/total*100):100,lines=['BÁO CÁO KẾT QUẢ HỌC TẬP','Bài học: '+data.title,'Học sinh: '+(learnerName||'Học sinh'),'Lớp: '+(learnerClass||'-'),'Điểm: '+points+'/'+total,'Tỷ lệ: '+pct+'%','Hoàn thành: '+answered.length+'/'+data.questions.length+' câu hỏi','Thời gian xuất báo cáo: '+fmtLongDate(),'Giáo viên: '+((data.theme&&data.theme.authorName)||'Giáo viên'),'','CHI TIẾT CÂU HỎI'];data.questions.forEach((q,i)=>{const r=answerReport[q.id]||{};lines.push('',(i+1)+'. '+(q.text||''),'Thời điểm: '+fmt(q.time),'Trả lời của học sinh: '+(r.learnerAnswer||'Chưa trả lời'),'Đáp án đúng: '+(r.correctAnswer||correctText(q)),'Lần thử: '+String(r.attempts||0),'Điểm: '+String(r.points||0)+'/'+String(qPoints(q)))});return lines.join('\\n')}
async function openGmailReport(silent=false){const btn=silent?null:finalGmail,to=((data.theme&&data.theme.reportEmail)||'').trim()||(silent?'':(prompt('Nhập Gmail nhận báo cáo:','')||'').trim());if(!to)return;const payload={to:to,subject:'Báo cáo kết quả - '+data.title,text:buildReportText(),html:buildReportHtml(),learnerName:learnerName||'Học sinh',lessonTitle:data.title},reportUrl=((data.theme&&data.theme.reportApiUrl)||'').trim()||'https://giaoviencn.io.vn/api/send-result-report',directAppsScript=/script\\.google\\.com|script\\.googleusercontent\\.com/i.test(reportUrl);try{if(btn){btn.disabled=true;btn.textContent='Đang gửi'}const response=await fetch(reportUrl,directAppsScript?{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!directAppsScript&&!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||'Không gửi được báo cáo')}if(btn)btn.textContent='Đã gửi';if(!silent)alert('Đã gửi báo cáo về Gmail.')}catch(error){if(btn){btn.disabled=false;btn.textContent='Gửi báo cáo'}const message=error&&error.message?error.message:String(error||'');if(silent)console.warn('Không gửi được báo cáo:',error);else alert(/failed to fetch|load failed|networkerror/i.test(message)?'Chưa kết nối được API gửi báo cáo. Hãy kiểm tra link Apps Script hoặc deploy lại API gửi báo cáo.':(message||'Không gửi được báo cáo.'))}}
function buildReportHtml(){const total=totalPoints(),pct=total?Math.round(points/total*100):100,date=fmtLongDate(),rows=data.questions.map((q,i)=>{const r=answerReport[q.id]||{};return '<tr><td style="text-align:center">'+(i+1)+'</td><td><b>'+safe(q.text||'')+'</b><br><span style="color:#64748b;font-size:12px">'+fmt(q.time)+'</span></td><td>'+safe(r.learnerAnswer||'Chưa trả lời')+'</td><td>'+safe(r.correctAnswer||correctText(q))+'</td><td style="text-align:center">'+String(r.attempts||0)+'</td><td style="text-align:center"><b>'+String(r.points||0)+'/'+String(qPoints(q))+'</b></td></tr>'}).join('');return '<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.45"><div style="padding:18px 20px;border-radius:18px;background:linear-gradient(135deg,#16a34a,#ec4899);color:#fff"><div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.9">Báo cáo kết quả học tập</div><h2 style="margin:6px 0 0;font-size:22px">'+safe(data.title)+'</h2></div><table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:separate;border-spacing:8px"><tr><td style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc"><span style="color:#64748b;font-size:12px;font-weight:700">Học sinh</span><br><b>'+safe(learnerName||'Học sinh')+'</b></td><td style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc"><span style="color:#64748b;font-size:12px;font-weight:700">Lớp</span><br><b>'+safe(learnerClass||'-')+'</b></td><td style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc"><span style="color:#64748b;font-size:12px;font-weight:700">Điểm</span><br><b>'+points+'/'+total+'</b></td><td style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc"><span style="color:#64748b;font-size:12px;font-weight:700">Tỷ lệ</span><br><b>'+pct+'%</b></td></tr></table><p><b>Hoàn thành:</b> '+answered.length+'/'+data.questions.length+' câu hỏi<br><b>Thời gian:</b> '+safe(date)+'<br><b>Giáo viên:</b> '+safe((data.theme&&data.theme.authorName)||'Giáo viên')+'</p><h3 style="margin:18px 0 10px">Chi tiết câu hỏi</h3><table cellpadding="8" cellspacing="0" border="1" style="width:100%;border-collapse:collapse;border-color:#e2e8f0"><thead><tr style="background:#f1f5f9"><th>#</th><th>Câu hỏi</th><th>Trả lời của học sinh</th><th>Đáp án đúng</th><th>Lần thử</th><th>Điểm</th></tr></thead><tbody>'+rows+'</tbody></table></div>'}function openResultReport(){const total=totalPoints(),pct=total?Math.round(points/total*100):100,rows=data.questions.map((q,i)=>{const r=answerReport[q.id]||{};return '<tr><td>'+(i+1)+'</td><td><strong>'+safe(q.text)+'</strong><small>'+fmt(q.time)+'</small></td><td>'+safe(r.learnerAnswer||'Chưa trả lời')+'</td><td>'+safe(r.correctAnswer||correctText(q))+'</td><td>'+String(r.attempts||0)+'</td><td><b>'+String(r.points||0)+'/'+String(qPoints(q))+'</b></td></tr>'}).join(''),w=window.open('','_blank');if(!w)return;const css='*{box-sizing:border-box}body{margin:0;background:#eef2f7;font-family:Arial,sans-serif;color:#0f172a}.wrap{max-width:1080px;margin:0 auto;padding:26px 18px}.paper{overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 22px 70px rgba(15,23,42,.14)}.hero{padding:30px 34px;background:linear-gradient(135deg,${playerTheme.primaryColor},${playerTheme.secondaryColor});color:#fff}.kicker{margin:0 0 8px;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.16em;opacity:.82}h1{margin:0;font-size:34px;line-height:1.1}h2{margin:0 0 12px;font-size:18px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:18px 24px;background:#f8fafc}.metric{border-radius:18px;background:#fff;padding:14px 16px;border:1px solid #e2e8f0}.metric span{display:block;color:#64748b;font-size:12px;font-weight:800}.metric strong{display:block;margin-top:6px;font-size:20px}.section{padding:24px}.summary{display:grid;grid-template-columns:1.2fr 1fr;gap:16px;margin-bottom:18px}.box{border:1px solid #e2e8f0;border-radius:18px;padding:16px;background:#fff}.box p{margin:8px 0;color:#334155;font-weight:700}.box b{color:#0f172a}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #e2e8f0;border-radius:16px}th,td{padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top;font-size:13px}th{background:#f8fafc;color:#475569;font-size:12px;text-transform:uppercase}tr:last-child td{border-bottom:0}td:first-child,td:nth-child(5),td:nth-child(6){text-align:center;white-space:nowrap}small{display:block;margin-top:5px;color:#94a3b8;font-weight:800}.toolbar{display:flex;justify-content:center;gap:10px;margin-top:16px}.toolbar button{border:0;border-radius:14px;padding:12px 18px;color:#fff;background:#0f172a;font-weight:950;cursor:pointer}@media(max-width:760px){.meta,.summary{grid-template-columns:1fr}th,td{font-size:12px;padding:10px 8px}.wrap{padding:10px}}@media print{body{background:#fff}.wrap{padding:0}.paper{box-shadow:none;border-radius:0}.toolbar{display:none}}';w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo kết quả</title><style>'+css+'</style></head><body><div class="wrap"><main class="paper"><header class="hero"><p class="kicker">Báo cáo kết quả học tập</p><h1>'+safe(data.title)+'</h1></header><section class="meta"><div class="metric"><span>Học sinh</span><strong>'+safe(learnerName||'Học sinh')+'</strong></div><div class="metric"><span>Lớp</span><strong>'+safe(learnerClass||'-')+'</strong></div><div class="metric"><span>Điểm</span><strong>'+points+'/'+total+'</strong></div><div class="metric"><span>Tỷ lệ</span><strong>'+pct+'%</strong></div></section><section class="section"><div class="summary"><div class="box"><h2>Thông tin bài học</h2><p>Hoàn thành: <b>'+answered.length+'/'+data.questions.length+'</b> câu hỏi</p><p>Thời gian xuất báo cáo: <b>'+safe(fmtLongDate())+'</b></p></div><div class="box"><h2>Giáo viên</h2><p><b>${authorName}</b></p><p>${authorInfo}</p></div></div><table><thead><tr><th>#</th><th>Câu hỏi</th><th>Trả lời của học sinh</th><th>Đáp án đúng</th><th>Lần thử</th><th>Điểm</th></tr></thead><tbody>'+rows+'</tbody></table><div class="toolbar"><button onclick="window.print()">In hoặc lưu PDF</button></div></section></main></div></body></html>');w.document.close();w.focus()}
document.querySelectorAll('.avatarPick').forEach(btn=>{btn.onmouseenter=()=>playAvatarSound();btn.onclick=()=>{playAvatarSound();document.querySelectorAll('.avatarPick').forEach(x=>x.classList.remove('active'));btn.classList.add('active');learnerAvatar=btn.dataset.avatar||'👦'}});startBtn.onclick=()=>{const name=learnerInput.value.trim();const className=learnerClassInput?learnerClassInput.value.trim():'';if(!name){learnerInput.focus();learnerInput.placeholder='Vui lòng nhập họ tên trước khi học';return}if(data.theme.requireLearnerClass&&!className){learnerClassInput&&learnerClassInput.focus();return}playStartSound();learnerName=name;learnerClass=className;learnerBadge.textContent=learnerAvatar+' '+learnerName+(learnerClass?' - '+learnerClass:'');startGate.style.display='none';scormInitialize();video.play()};
learnerInput.addEventListener('keydown',e=>{if(e.key==='Enter')startBtn.click()});
const certificate=()=>{const learner=learnerName||(prompt('Nhập tên học sinh để ghi thư khen:','Học sinh')||'Học sinh').trim()||'Học sinh',classLine=learnerClass?'<p class="className">Lớp: '+safe(learnerClass)+'</p>':'',total=totalPoints(),date=new Date().toLocaleDateString('vi-VN'),w=window.open('','_blank');if(!w)return;w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>'+safe(data.theme.certificateTitle||'Thư khen')+'</title><style>body{margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1f2937}.paper{position:relative;width:900px;max-width:94%;margin:32px auto;padding:46px 54px 50px;border:12px solid ${playerTheme.accentColor};border-radius:28px;background:radial-gradient(circle at top,#fff7ed,#fff 42%);text-align:center;box-shadow:0 24px 80px rgba(15,23,42,.18);overflow:hidden}.top{display:flex;align-items:center;justify-content:space-between;min-height:78px}.certLogo,.seal,.signature{display:flex;align-items:center;justify-content:center}.certLogo img{max-width:120px;max-height:74px;object-fit:contain}.seal img{max-width:96px;max-height:96px;object-fit:contain;opacity:.9}h1{margin:12px 0 0;color:#b45309;font-size:52px;text-transform:uppercase}.sub{font-size:20px;font-weight:800;color:#64748b}.avatarCert{font-size:54px;margin:20px 0 0}.name{margin:10px 0 4px;font-size:42px;font-weight:950;color:${playerTheme.primaryColor}}.className{margin:0 0 16px;font-size:20px;font-weight:900;color:#475569}.score{display:inline-block;margin:16px 0 22px;padding:12px 28px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:24px;font-weight:950}.text{font-size:22px;line-height:1.55}.sign{display:flex;justify-content:space-between;align-items:flex-end;gap:28px;margin-top:46px;font-weight:800;text-align:left}.teacher{text-align:right}.signature img{max-width:170px;max-height:76px;object-fit:contain}.printBtn{margin-top:30px;padding:12px 22px;border:0;border-radius:12px;background:${playerTheme.primaryColor};color:white;font-weight:900}@media print{button{display:none}.paper{box-shadow:none;margin:0 auto}}</style></head><body><div class="paper"><div class="top"><div class="certLogo">${certificateLogoMarkup}</div><div class="seal">${certificateSealMarkup}</div></div><h1>'+safe(data.theme.certificateTitle||'Thư khen')+'</h1><p class="sub">'+safe(data.theme.certificateSubtitle||'Hoàn thành bài học tương tác')+'</p><div class="avatarCert">'+learnerAvatar+'</div><div class="name">'+safe(learner)+'</div>'+classLine+'<p class="text">'+safe(data.theme.certificateMessage||'Đã hoàn thành bài học với tinh thần học tập tích cực.')+'<br><b>'+safe(data.title)+'</b></p><div class="score">'+points+' / '+total+' điểm</div><div class="sign"><span>Ngày '+date+'</span><span class="teacher"><span>Giáo viên: ${authorName}</span><span class="signature">${certificateSignatureMarkup}</span></span></div><button class="printBtn" onclick="window.print()">In hoặc lưu PDF</button></div></body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),400)};
const certificatePro=()=>{const learner=learnerName||(prompt('Nhập tên học sinh để ghi thư khen:','Học sinh')||'Học sinh').trim()||'Học sinh',classLine=learnerClass?'<p class="className">Lớp: '+safe(learnerClass)+'</p>':'',total=totalPoints(),date=new Date().toLocaleDateString('vi-VN'),w=window.open('','_blank');if(!w)return;const css='*{box-sizing:border-box}body{margin:0;background:#eef2f7;font-family:Arial,sans-serif;color:#172033}.wrap{min-height:100vh;padding:22px 16px 30px}.paper{position:relative;width:780px;max-width:100%;min-height:548px;margin:0 auto;padding:28px 42px 30px;border:7px double ${playerTheme.accentColor};border-radius:18px;background:linear-gradient(135deg,#fffdf8,#fff 48%,#f8fafc);text-align:center;box-shadow:0 18px 55px rgba(15,23,42,.16);overflow:hidden}.paper:before{content:"";position:absolute;inset:18px;border:1px solid rgba(148,163,184,.45);border-radius:10px;pointer-events:none}.top{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;min-height:58px}.certLogo,.seal,.signature{display:flex;align-items:center;justify-content:center}.certLogo img{max-width:88px;max-height:58px;object-fit:contain}.seal img{max-width:76px;max-height:76px;object-fit:contain}.kicker{margin:10px 0 0;text-transform:uppercase;letter-spacing:.18em;color:#64748b;font-size:11px;font-weight:900}h1{position:relative;z-index:1;margin:6px 0 6px;color:#b45309;font-size:36px;line-height:1;text-transform:uppercase;letter-spacing:.04em}.sub{position:relative;z-index:1;margin:0 0 16px;font-size:17px;font-weight:800;color:#64748b}.avatarCert{font-size:38px;margin:4px 0}.name{margin:4px 0 2px;font-size:32px;line-height:1.1;font-weight:950;color:${playerTheme.primaryColor}}.className{margin:0 0 12px;font-size:17px;font-weight:900;color:#475569}.text{max-width:620px;margin:10px auto 0;font-size:18px;line-height:1.45;color:#172033}.lesson{display:block;margin-top:4px;font-size:19px;color:#0f172a}.score{display:inline-block;margin:18px 0 12px;padding:9px 24px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:21px;font-weight:950}.sign{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-top:26px;font-size:15px;font-weight:800;text-align:left}.teacher{text-align:right}.signature img{max-width:132px;max-height:58px;object-fit:contain}.toolbar{display:flex;justify-content:center;gap:10px;margin:16px auto 0}.toolbar button{border:0;border-radius:10px;padding:11px 16px;color:white;font-weight:900;cursor:pointer}.printBtn{background:${playerTheme.primaryColor}}.imageBtn{background:#0f172a}@media print{body{background:#fff}.wrap{padding:0}.toolbar{display:none}.paper{box-shadow:none;margin:0 auto;border-width:6px}}';w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>'+safe(data.theme.certificateTitle||'Thư khen')+'</title><style id="certificateStyles">'+css+'</style></head><body><div class="wrap"><main id="certificatePaper" class="paper"><div class="top"><div class="certLogo">${certificateLogoMarkup}</div><div class="seal">${certificateSealMarkup}</div></div><p class="kicker">Ghi nhận hoàn thành</p><h1>'+safe(data.theme.certificateTitle||'Thư khen')+'</h1><p class="sub">'+safe(data.theme.certificateSubtitle||'Hoàn thành bài học tương tác')+'</p><div class="avatarCert">'+learnerAvatar+'</div><div class="name">'+safe(learner)+'</div>'+classLine+'<p class="text">'+safe(data.theme.certificateMessage||'Đã hoàn thành bài học với tinh thần học tập tích cực.')+'<b class="lesson">'+safe(data.title)+'</b></p><div class="score">'+points+' / '+total+' điểm</div><div class="sign"><span>Ngày '+date+'</span><span class="teacher"><span>Giáo viên: ${authorName}</span><span class="signature">${certificateSignatureMarkup}</span></span></div></main><div class="toolbar"><button class="printBtn" onclick="window.print()">In hoặc lưu PDF</button><button class="imageBtn" onclick="saveCertificateImage()">Lưu ảnh PNG</button></div></div></body></html>');w.document.close();w.focus();w.saveCertificateImage=()=>saveCertificatePng(w,learner,'thu-khen','#fff');};
const certificateShowcase=()=>{const learner=learnerName||(prompt('Nhập tên học sinh để ghi giấy chứng nhận:','Học sinh')||'Học sinh').trim()||'Học sinh',classLine=learnerClass?'<p class="className">Lớp: '+safe(learnerClass)+'</p>':'',total=totalPoints(),date=new Date().toLocaleDateString('vi-VN'),displayTitle=(data.theme.certificateTitle&&data.theme.certificateTitle.trim())?data.theme.certificateTitle.trim():'Giấy chứng nhận',w=window.open('','_blank');if(!w)return;const css="@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');*{box-sizing:border-box}body{margin:0;background:linear-gradient(135deg,#f4d4ed,#dfe7ff 48%,#f7e2d5);font-family:Arial,sans-serif;color:#20223f}.wrap{min-height:100vh;padding:24px}.paper{position:relative;width:980px;max-width:100%;aspect-ratio:1.58/1;margin:0 auto;padding:28px 48px 34px;border-radius:22px;background:linear-gradient(90deg,rgba(255,255,255,.9) 0 46%,rgba(255,255,255,.62) 46% 100%);text-align:center;box-shadow:0 18px 54px rgba(37,43,91,.18);overflow:hidden}.frameA{position:absolute;inset:10px;border:8px solid rgba(255,255,255,.72);border-radius:18px;pointer-events:none}.frameB{position:absolute;inset:20px;border:1px solid rgba(255,255,255,.78);border-radius:12px;pointer-events:none}.orb{position:absolute;border-radius:999px;opacity:.78;pointer-events:none}.orb-left{width:230px;height:230px;left:-86px;top:-68px;background:#f5b3df}.orb-mid{width:300px;height:300px;left:36%;top:24%;background:#eef2ff;opacity:.62}.orb-right{width:240px;height:240px;right:-92px;bottom:-82px;background:#fff1a8}.star,.spark{position:absolute;z-index:2;display:grid;place-items:center;color:#fff;font-weight:950}.star{left:30px;top:32px;width:62px;height:62px;border-radius:50%;background:#facc15;font-size:30px}.spark{right:36px;top:30px;width:52px;height:52px;border-radius:15px;background:#ec4899;transform:rotate(14deg);font-size:26px}.content{position:relative;z-index:3;display:flex;min-height:100%;flex-direction:column;align-items:center;justify-content:center}.topLogos{position:absolute;left:48px;right:48px;top:30px;z-index:4;display:flex;align-items:flex-start;justify-content:space-between}.certLogo,.seal,.signature{display:flex;align-items:center;justify-content:center}.certLogo img{max-width:96px;max-height:62px;object-fit:contain}.seal img{max-width:84px;max-height:84px;object-fit:contain}.trophy{font-size:70px;line-height:1;margin:0 0 10px;text-shadow:0 4px 0 rgba(15,23,42,.18)}h1{margin:0;color:#5146e5;font-size:56px;line-height:1.02;text-transform:uppercase;font-weight:950}.grad{width:240px;height:12px;margin:16px auto 16px;border-radius:999px;background:linear-gradient(90deg,#ec65b7,#6f63ff)}.lessonPill{display:inline-block;min-width:124px;margin:0 auto 14px;padding:6px 16px;border-radius:999px;background:rgba(255,255,255,.74);color:#475569;font-size:13px;font-weight:950;text-transform:uppercase}.sub{margin:8px auto 12px;color:#64748b;font-size:17px;font-weight:900;line-height:1.25}.gift{display:inline-block;margin-bottom:8px;padding:8px 20px;border-radius:999px;background:#fde8f4;color:#db2777;font-size:15px;font-weight:950;text-transform:uppercase}.avatarCert{font-size:42px;line-height:1;margin:2px 0 2px}.name{margin:0;color:#20205a;font-size:56px;line-height:1;font-weight:950}.className{margin:8px 0 0;color:#475569;font-size:16px;font-weight:900}.ribbon{margin:18px 0 10px;padding:14px 34px;border-radius:18px;background:linear-gradient(100deg,#675cf6,#ec4899);color:#fff;font-size:18px;font-weight:950;text-transform:uppercase;transform:rotate(-2.5deg);box-shadow:0 12px 24px rgba(99,102,241,.26)}.medal{display:grid;place-items:center;width:94px;height:94px;margin:2px auto 0;border:8px solid #fff;border-radius:50%;background:#ffad2f;color:#fff;font-size:24px;font-weight:950;box-shadow:0 10px 24px rgba(245,158,11,.24)}.medal small{display:block;margin-top:2px;font-size:13px}.sign{position:absolute;left:54px;right:54px;bottom:34px;z-index:4;display:flex;align-items:flex-end;justify-content:space-between;color:#64748b;font-size:13px;font-weight:900}.sign strong{display:block;color:#25266d;font-size:16px}.line{width:120px;height:3px;margin:6px auto 9px;border-radius:999px;background:#cbd5e1}.teacher{text-align:center}.signature img{max-width:132px;max-height:52px;object-fit:contain}.toolbar{display:flex;justify-content:center;gap:10px;margin:16px auto 0}.toolbar button{border:0;border-radius:10px;padding:11px 16px;color:#fff;font-weight:900;cursor:pointer}.printBtn{background:${playerTheme.primaryColor}}.imageBtn{background:#111827}.avatarCert{display:inline-grid;place-items:center;width:54px;height:54px;margin:0 auto 8px;border-radius:18px;background:rgba(255,255,255,.74);font-size:30px}.name{display:block;max-width:min(700px,100%);margin:0 auto;padding:12px 24px;border-radius:22px;background:rgba(255,255,255,.68);color:#20205a;font-size:clamp(28px,3.6vw,40px);line-height:1.08;letter-spacing:0;text-wrap:balance;overflow-wrap:anywhere}.className{margin-top:8px}.ribbon{margin-top:12px;font-size:16px}.signature:has(img){width:164px;min-height:56px;margin:5px 0 6px;padding:6px 12px;border-radius:14px;background:rgba(255,255,255,.58);box-shadow:0 8px 18px rgba(37,43,91,.12),inset 0 0 0 1px rgba(255,255,255,.38);backdrop-filter:blur(4px)}.signature:has(img) img{max-width:150px;max-height:44px;filter:contrast(1.25) saturate(1.1);opacity:1}@media print{body{background:#fff}.wrap{padding:0}.toolbar{display:none}.paper{box-shadow:none;margin:0 auto}}";w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>'+safe(displayTitle)+'</title><style id="certificateStyles">'+css+'</style></head><body><div class="wrap"><main id="certificatePaper" class="paper"><span class="frameA"></span><span class="frameB"></span><span class="orb orb-left"></span><span class="orb orb-mid"></span><span class="orb orb-right"></span><span class="star">★</span><span class="spark">✦</span><div class="topLogos"><div class="certLogo">${certificateLogoMarkup}</div><div class="seal">${certificateSealMarkup}</div></div><section class="content"><div class="trophy">🏆</div><h1>'+safe(displayTitle)+'</h1><p class="sub">'+safe(data.theme.certificateSubtitle||'Hoàn thành bài học tương tác')+'</p><div class="grad"></div><span class="lessonPill">'+safe(data.title)+'</span><span class="gift">Trân trọng trao tặng cho</span><div class="avatarCert">'+learnerAvatar+'</div><div class="name">'+safe(learner)+'</div>'+classLine+'<div class="ribbon">'+safe(data.theme.certificateMessage||'Bạn đã hoàn thành xuất sắc bài học')+'</div><div class="medal">'+points+'/'+total+'<small>điểm</small></div></section><div class="sign"><span><strong>'+date+'</strong><span class="line"></span>Ngày hoàn thành</span><span class="teacher"><span>Giáo viên</span><span class="signature">${certificateSignatureMarkup||'<span class="line"></span>'}</span><strong>${authorName}</strong></span></div></main><div class="toolbar"><button class="printBtn" onclick="window.print()">In hoặc lưu PDF</button><button class="imageBtn" onclick="saveCertificateImage()">Lưu ảnh PNG</button></div></div></body></html>');w.document.close();w.focus();w.saveCertificateImage=()=>saveCertificatePng(w,learner,'giay-chung-nhan','#fff');};
const certificateStage=()=>{const learner=learnerName||(prompt('Nhập tên học sinh để ghi vinh danh:','Học sinh')||'Học sinh').trim()||'Học sinh',classLine=learnerClass?'<p class="className">Lớp: '+safe(learnerClass)+'</p>':'',total=totalPoints(),date=new Date().toLocaleDateString('vi-VN'),displayTitle=(data.theme.certificateTitle&&data.theme.certificateTitle.trim())?data.theme.certificateTitle.trim():'Thư khen',w=window.open('','_blank');if(!w)return;const css="@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');*{box-sizing:border-box}body{margin:0;background:#080c1f;font-family:Arial,sans-serif;color:#fff}.wrap{min-height:100vh;padding:24px;background:radial-gradient(circle at 18% 20%,${playerTheme.primaryColor}55,transparent 26%),radial-gradient(circle at 86% 14%,${playerTheme.secondaryColor}48,transparent 24%),linear-gradient(135deg,#091023,#10143a 54%,#220f35)}.paper{position:relative;width:980px;max-width:100%;aspect-ratio:1.58/1;margin:0 auto;padding:34px 56px;border-radius:34px;background:linear-gradient(135deg,rgba(10,17,42,.94),rgba(16,21,63,.9) 52%,rgba(38,18,72,.92));box-shadow:0 26px 80px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.18);overflow:hidden;text-align:center;animation:paperIn .72s cubic-bezier(.2,.8,.2,1) both}.paper:before{content:'';position:absolute;inset:-30%;background:conic-gradient(from 120deg,transparent,rgba(255,255,255,.2),transparent 28%,rgba(255,255,255,.14),transparent 60%);animation:spinGlow 9s linear infinite}.paper:after{content:'';position:absolute;inset:14px;border:1px solid rgba(255,255,255,.2);border-radius:26px;pointer-events:none}.beam{position:absolute;inset:-30% auto auto 50%;width:280px;height:880px;transform:translateX(-50%) rotate(18deg);background:linear-gradient(180deg,rgba(255,255,255,.3),transparent);filter:blur(6px);opacity:.42;animation:sweep 4.4s ease-in-out infinite}.dot{position:absolute;width:9px;height:9px;border-radius:50%;background:#fff;opacity:.45;animation:float 3.8s ease-in-out infinite}.d1{left:9%;top:20%}.d2{right:12%;top:26%;animation-delay:.7s}.d3{left:17%;bottom:22%;animation-delay:1.2s}.topLogos{position:absolute;left:54px;right:54px;top:36px;z-index:3;display:flex;justify-content:space-between}.certLogo img{max-width:94px;max-height:58px;object-fit:contain;mix-blend-mode:multiply;filter:saturate(1.12) contrast(1.08)}.seal img{max-width:80px;max-height:80px;object-fit:contain;mix-blend-mode:multiply;filter:saturate(1.12) contrast(1.08)}.content{position:relative;z-index:2;display:flex;min-height:100%;flex-direction:column;align-items:center;justify-content:center}.badgeIcon{display:grid;place-items:center;width:88px;height:88px;margin-bottom:12px;border-radius:28px;background:linear-gradient(135deg,${playerTheme.accentColor},${playerTheme.secondaryColor});font-size:48px;box-shadow:0 20px 46px ${playerTheme.secondaryColor}55;animation:float 3.4s ease-in-out infinite}.eyebrow{margin:0 0 8px;padding:7px 16px;border-radius:999px;background:rgba(255,255,255,.1);color:#c7d2fe;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.16em}.title{margin:0;font-size:48px;line-height:1.02;font-weight:950;text-transform:uppercase;letter-spacing:.02em;background:linear-gradient(90deg,#fff,#c7d2fe,#f0abfc);-webkit-background-clip:text;background-clip:text;color:transparent}.nameWrap{position:relative;margin:28px 0 8px}.halo{position:absolute;left:50%;top:50%;width:300px;height:120px;transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,${playerTheme.primaryColor}3d,transparent 68%);animation:haloPulse 1.8s ease-in-out infinite}.avatarCert{position:relative;font-size:38px}.name{position:relative;margin:2px 0 0;font-size:58px;line-height:1;font-weight:950;text-shadow:0 8px 28px rgba(0,0,0,.35)}.className{position:relative;margin:8px 0 0;color:#cbd5e1;font-size:16px;font-weight:900}.ribbon{margin:18px auto 12px;max-width:760px;padding:13px 28px;border:1px solid rgba(255,255,255,.22);border-radius:18px;background:linear-gradient(90deg,rgba(255,255,255,.16),rgba(255,255,255,.08));backdrop-filter:blur(12px);color:#fff;font-size:17px;font-weight:950;text-transform:uppercase;box-shadow:0 16px 36px rgba(0,0,0,.2);animation:slideUp .7s ease .18s both}.score{display:grid;place-items:center;width:96px;height:96px;border-radius:30px;background:linear-gradient(135deg,#22c55e,#14b8a6);font-size:24px;font-weight:950;box-shadow:0 18px 46px rgba(20,184,166,.32);transform:rotate(-4deg)}.score small{display:block;font-size:13px}.sign{position:absolute;left:58px;right:58px;bottom:38px;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;color:#cbd5e1;font-size:13px;font-weight:900}.sign>span{width:190px;text-align:center}.sign strong{display:block;color:#fff;font-size:16px}.line{width:130px;height:2px;margin:8px auto 8px;border-radius:999px;background:rgba(255,255,255,.34)}.teacher{display:flex;flex-direction:column;align-items:center;line-height:1.25;text-align:center}.signature{display:flex;align-items:flex-end;justify-content:center;width:100%;min-height:54px;margin-bottom:4px}.signature img{display:block;max-width:132px;max-height:50px;object-fit:contain}.toolbar{display:flex;justify-content:center;gap:10px;margin:16px auto 0}.toolbar button{border:0;border-radius:12px;padding:12px 17px;color:#fff;font-weight:950;cursor:pointer}.printBtn{background:${playerTheme.primaryColor}}.imageBtn{background:#111827}.content{gap:10px}.badgeIcon{width:72px;height:72px;margin:0 0 2px;border-radius:22px;font-size:38px}.eyebrow{margin:0;font-size:11px;letter-spacing:.08em}.title{max-width:820px;font-size:clamp(34px,4.8vw,44px);line-height:1.06;letter-spacing:0}.subtitle{max-width:760px;margin:-2px auto 2px;color:#cbd5e1;font-size:16px;font-weight:900;line-height:1.25}.nameWrap{width:min(760px,100%);margin:6px auto 0;padding:0 18px}.halo{display:none}.avatarCert{display:inline-grid;place-items:center;width:56px;height:56px;margin:0 auto 8px;border-radius:18px;background:rgba(255,255,255,.08);font-size:30px;line-height:1;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}.name{display:block;max-width:100%;margin:0 auto;padding:14px 28px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:linear-gradient(90deg,rgba(148,163,184,.22),rgba(148,163,184,.1));font-size:clamp(28px,3.7vw,40px);line-height:1.08;letter-spacing:0;text-wrap:balance;overflow-wrap:anywhere;text-shadow:0 6px 18px rgba(0,0,0,.22)}.className{margin-top:8px}.ribbon{margin:8px auto 8px;padding:10px 24px;font-size:15px;line-height:1.25}.score{width:82px;height:82px;border-radius:24px;font-size:22px}.sign{bottom:28px}.signature:has(img){width:164px;min-height:56px;margin:5px 0 6px;padding:6px 12px;border-radius:14px;background:rgba(255,255,255,.58);box-shadow:0 8px 18px rgba(0,0,0,.12),inset 0 0 0 1px rgba(255,255,255,.38);backdrop-filter:blur(4px)}.signature:has(img) img{max-width:150px;max-height:44px;mix-blend-mode:multiply;filter:contrast(1.35) saturate(1.1);opacity:1}body,.paper,.paper *{font-family:'Nunito','Be Vietnam Pro',Arial,sans-serif}.wrap{background:radial-gradient(circle at 18% 20%,${playerTheme.primaryColor}30,transparent 28%),radial-gradient(circle at 86% 14%,${playerTheme.secondaryColor}2e,transparent 28%),linear-gradient(135deg,#ecfeff,#fdf2f8 52%,#fff7ed)}.paper{background:linear-gradient(135deg,rgba(255,255,255,.98),rgba(240,253,250,.96) 48%,rgba(253,242,248,.98));color:#172033;box-shadow:0 26px 80px rgba(51,65,85,.18),inset 0 0 0 1px rgba(255,255,255,.85)}.paper:before{opacity:.28}.paper:after{border-color:rgba(99,102,241,.22)}.beam{opacity:.2}.dot{background:${playerTheme.primaryColor};opacity:.24}.eyebrow{background:rgba(99,102,241,.08);color:#6366f1}.title{background:linear-gradient(90deg,#2563eb,#7c3aed,#db2777);-webkit-background-clip:text;background-clip:text;color:transparent}.subtitle,.className,.sign{color:#64748b}.name{border-color:rgba(99,102,241,.14);background:linear-gradient(90deg,rgba(255,255,255,.9),rgba(238,242,255,.86),rgba(253,242,248,.88));color:#1e1b4b;text-shadow:none}.ribbon{border-color:rgba(99,102,241,.14);background:linear-gradient(90deg,rgba(224,231,255,.8),rgba(252,231,243,.8));color:#3730a3}.sign strong{color:#1e1b4b}.title{font-family:'Nunito','Be Vietnam Pro',Arial,sans-serif;font-weight:900;text-transform:none}.eyebrow,.subtitle,.name,.className,.ribbon,.score,.sign{font-family:'Nunito','Be Vietnam Pro',Arial,sans-serif}.ribbon{text-transform:none;letter-spacing:0}.badgeIcon{background:linear-gradient(135deg,#38bdf8,#8b5cf6 52%,#ec4899);box-shadow:0 14px 30px rgba(124,58,237,.24)}.kidDecor{position:absolute;z-index:1;display:grid;place-items:center;font-family:'Nunito',Arial,sans-serif;font-size:26px;font-weight:900;filter:drop-shadow(0 8px 10px rgba(99,102,241,.18));animation:float 4s ease-in-out infinite}.kd1{left:9%;top:27%;color:#f59e0b}.kd2{right:10%;top:29%;color:#22c55e;animation-delay:.5s}.kd3{left:18%;bottom:24%;color:#ec4899;animation-delay:1s}.kd4{right:22%;bottom:22%;color:#38bdf8;animation-delay:1.4s}@media(max-width:760px){.kidDecor{display:none}}@keyframes paperIn{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}@keyframes spinGlow{to{transform:rotate(360deg)}}@keyframes sweep{0%,100%{opacity:.2;transform:translateX(-95%) rotate(18deg)}50%{opacity:.48;transform:translateX(25%) rotate(18deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes haloPulse{0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(.96)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@media print{body{background:#fff}.wrap{padding:0;background:#fff}.toolbar{display:none}.paper{box-shadow:none;margin:0 auto}.paper:before,.beam,.dot{animation:none}}";w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>'+safe(displayTitle)+'</title><style id="certificateStyles">'+css+'</style></head><body><div class="wrap"><main id="certificatePaper" class="paper"><span class="kidDecor kd1">★</span><span class="kidDecor kd2">✦</span><span class="kidDecor kd3">●</span><span class="kidDecor kd4">◆</span><span class="beam"></span><span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span><div class="topLogos"><div class="certLogo">${certificateLogoMarkup}</div><div class="seal">${certificateSealMarkup}</div></div><section class="content"><div class="badgeIcon">✦</div><p class="eyebrow">'+safe(data.title)+'</p><h1 class="title">'+safe(displayTitle)+'</h1><p class="subtitle">'+safe(data.theme.certificateSubtitle||'Hoàn thành bài học tương tác')+'</p><div class="nameWrap"><span class="halo"></span><div class="avatarCert">'+learnerAvatar+'</div><div class="name">'+safe(learner)+'</div>'+classLine+'</div><div class="ribbon">'+safe(data.theme.certificateMessage||'Đã hoàn thành bài học với tinh thần học tập tích cực.')+'</div><div class="score">'+points+'/'+total+'<small>điểm</small></div></section><div class="sign"><span><strong>'+date+'</strong><span class="line"></span>Ngày hoàn thành</span><span class="teacher"><span>Giáo viên</span><span class="signature">${certificateSignatureMarkup||'<span class="line"></span>'}</span><strong>${authorName}</strong></span></div></main><div class="toolbar"><button class="printBtn" onclick="window.print()">In hoặc lưu PDF</button><button class="imageBtn" onclick="saveCertificateImage()">Lưu ảnh PNG</button></div></div></body></html>');w.document.close();w.focus();w.saveCertificateImage=()=>saveCertificatePng(w,learner,'vinh-danh','#f8fafc');};
let finalShown=false;
const showFinal=()=>{if(finalShown)return;finalShown=true;const total=totalPoints();video.pause();playVictorySound();firework();setTimeout(firework,520);certBtn.disabled=false;finalDesc.textContent=(learnerAvatar+' '+(learnerName||'Học sinh')+' đã hoàn thành '+answered.length+'/'+data.questions.length+' câu hỏi.');finalScore.textContent=points+' / '+total+' điểm';finalResult.classList.add('show')};
const renderList=(filter='')=>{const nextQuestion=(!current&&data.questions.find(x=>!answered.includes(x.id)&&(Number(x.time)||0)>=video.currentTime-.5))||null;qlist.innerHTML=data.questions.map((q,i)=>({q,i})).filter(({q,i})=>('câu '+(i+1)+' '+q.text).toLowerCase().includes(filter.toLowerCase())).map(({q,i})=>{const cls=['qitem'];if(answered.includes(q.id))cls.push('answered');else cls.push('${sidebarPulseCss}');if(current&&current.id===q.id){cls.push('active')}else if(nextQuestion&&nextQuestion.id===q.id){cls.push('active')}return '<div class="'+cls.filter(Boolean).join(' ')+'" data-time="'+q.time+'"><span class="qtext"><span class="qicon">${sidebarIcon}</span><span><span class="qname">Câu '+(i+1)+'</span></span></span><small>'+fmt(q.time)+'</small></div>'}).join('')};
renderList();
video.currentTime=data.startTime||0;
const renderQuestion=q=>{current=q;selected=null;video.pause();qtext.textContent=q.text;result.textContent='';opts.innerHTML='';const pointLabel=document.querySelector('.qpoints');if(pointLabel)pointLabel.textContent='+'+qPoints(q)+' diem';const hint=document.querySelector('.qhint');if(hint)hint.textContent=(qType(q)==='short-answer'||qType(q)==='fill-blank')?'Nhập câu trả lời, sau đó kiểm tra đáp án.':'Chọn đáp án đúng nhất, sau đó kiểm tra kết quả.';if(qType(q)==='short-answer'||qType(q)==='fill-blank'){const input=document.createElement('input');input.id='textAnswer';input.placeholder=qType(q)==='fill-blank'?'Nhập từ/cụm từ còn thiếu':'Nhập câu trả lời';input.style.cssText='width:100%;border:2px solid #e2e8f0;border-radius:18px;padding:14px 16px;font-size:17px;font-weight:900;outline:none';input.onkeydown=e=>{if(e.key==='Enter')document.getElementById('answer').click()};opts.appendChild(input);setTimeout(()=>input.focus(),80)}else if(qType(q)==='image-choice'){(q.imageOptions||[]).forEach((o,i)=>{const b=document.createElement('button');b.className='option';b.style.borderRadius='18px';b.innerHTML='<span class="olabel">'+String.fromCharCode(65+i)+'</span><span class="otext"></span>';if(o.imageUrl){const img=document.createElement('img');img.src=o.imageUrl;img.alt=o.text||('Lựa chọn '+String.fromCharCode(65+i));img.style.cssText='width:130px;aspect-ratio:16/9;object-fit:cover;border-radius:12px;background:#e2e8f0;flex:0 0 130px';b.insertBefore(img,b.firstChild)}b.querySelector('.otext').textContent=o.text||('Lựa chọn '+String.fromCharCode(65+i));b.onclick=()=>{selected=i;document.querySelectorAll('.option').forEach(el=>el.classList.remove('selected'));b.classList.add('selected')};opts.appendChild(b)})}else{(q.options||[]).forEach((o,i)=>{if(!String(o||'').trim())return;const b=document.createElement('button');b.className='option';b.innerHTML='<span class="olabel">'+String.fromCharCode(65+i)+'</span><span class="otext"></span>';b.querySelector('.otext').textContent=o;b.onclick=()=>{selected=i;document.querySelectorAll('.option').forEach(el=>el.classList.remove('selected'));b.classList.add('selected')};opts.appendChild(b)})}renderList(searchBox.value);overlay.classList.add('show')};
video.addEventListener('loadedmetadata',()=>{progress.max=video.duration||0;dur.textContent=fmt(video.duration)});
video.addEventListener('play',()=>play.textContent='❚❚');
video.addEventListener('pause',()=>play.textContent='▶');
video.addEventListener('ended',()=>{if(answered.length===data.questions.length){scormComplete();showFinal()}});
video.addEventListener('timeupdate',()=>{progress.value=video.currentTime;now.textContent=fmt(video.currentTime);if(!current)renderList(searchBox.value);
const q=data.questions.find(x=>Math.abs(x.time-video.currentTime)<.7&&!answered.includes(x.id));if(q)renderQuestion(q)});
play.onclick=()=>video.paused?video.play():video.pause();
progress.oninput=()=>{if(data.allowSeeking)video.currentTime=Number(progress.value)};
searchBox.oninput=()=>renderList(searchBox.value);
qlist.onclick=e=>{const item=e.target.closest('.qitem');if(item&&data.allowSeeking){video.currentTime=Number(item.dataset.time)||0;video.play()}};
document.getElementById('restart').onclick=()=>{video.currentTime=data.startTime||0;answered=[];points=0;current=null;answerReport={};questionAttempts={};finalShown=false;renderList(searchBox.value);score.textContent='0';certBtn.disabled=true;finalResult.classList.remove('show');video.play()};
document.getElementById('back').onclick=()=>{video.currentTime=Math.max(0,video.currentTime-10)};
document.getElementById('next').onclick=()=>{if(data.allowSeeking)video.currentTime=Math.min(video.duration||0,video.currentTime+10)};
document.getElementById('full').onclick=()=>document.querySelector('.shell').requestFullscreen&&document.querySelector('.shell').requestFullscreen();
menuTab.onclick=()=>{side.classList.remove('show-guide');menuTab.classList.add('active');guideTab.classList.remove('active')};
guideTab.onclick=()=>{side.classList.add('show-guide');guideTab.classList.add('active');menuTab.classList.remove('active')};
const authorInfo=document.getElementById('authorInfo');if(authorInfo){authorInfo.onclick=()=>alert('${authorName.replace(/'/g, "\\'")}\\n${escapeHtml(playerTheme.authorInfo || '').replace(/\n/g, '\\n').replace(/'/g, "\\'")}')};
document.getElementById('answer').onclick=()=>{if(!current)return;const isText=qType(current)==='short-answer'||qType(current)==='fill-blank';const textInput=document.getElementById('textAnswer');if(isText&&(!textInput||!textInput.value.trim()))return;if(!isText&&selected===null)return;const ok=isText?textCorrect(current,textInput.value):selected===current.correctOption;if(ok){const add=qPoints(current),attempts=(questionAttempts[current.id]||0)+1,learnerAnswer=isText?textInput.value:answerText(current,selected);questionAttempts[current.id]=attempts;answerReport[current.id]={learnerAnswer:learnerAnswer,correctAnswer:correctText(current),attempts:attempts,points:add};playCorrectSound();correctSpark();showBonus(add);result.textContent='Ch\\u00ednh x\\u00e1c! +'+add+' \\u0111i\\u1ec3m';answered.push(current.id);renderList(searchBox.value);points+=add;score.textContent=points;scormSetScore(points,totalPoints());setTimeout(()=>{overlay.classList.remove('show');current=null;renderList(searchBox.value);if(answered.length===data.questions.length&&video.duration&&video.currentTime>=video.duration-.75){scormComplete();showFinal()}else video.play()},900)}else{questionAttempts[current.id]=(questionAttempts[current.id]||0)+1;playIncorrectSound();result.textContent='Ch\\u01b0a \\u0111\\u00fang, em h\\u00e3y xem l\\u1ea1i \\u0111o\\u1ea1n video nh\\u00e9.'}};
certBtn.onclick=()=>{certificateStage();openGmailReport(true)};
finalCert.onclick=()=>{certificateStage();openGmailReport(true)};
finalReplay.onclick=()=>document.getElementById('restart').click();
finalExit.onclick=()=>{try{window.close()}catch(e){}; if(!window.closed) finalResult.classList.remove('show')};
document.getElementById('rewatch').onclick=()=>{if(!current)return;overlay.classList.remove('show');video.currentTime=Math.max(0,current.time-10);video.play()};
</script>
</body>
</html>`;
    };

    const createStructuredExportFiles = (fullHtml: string) => {
        const styleMatch = fullHtml.match(/<style>\s*([\s\S]*?)\s*<\/style>/);
        const scriptMatch = fullHtml.match(/<script>\s*([\s\S]*?)\s*<\/script>/);

        if (!styleMatch || !scriptMatch) {
            return {
                indexHtml: fullHtml,
                styleCss: '',
                dataJs: '',
                playerJs: '',
                paths: ['index.html'],
            };
        }

        const styleCss = `${styleMatch[1].trim()}\n`;
        const scriptBody = scriptMatch[1].trim();
        const dataMatch = scriptBody.match(/^const data=([^\n]*);\n/);
        const dataJson = dataMatch?.[1] || '{}';
        const dataJs = `window.GVCN_LESSON_DATA=${dataJson};\n`;
        const playerJs = `${scriptBody.replace(/^const data=[^\n]*;\n/, 'const data=window.GVCN_LESSON_DATA;\n').trim()}\n`;
        const indexHtml = fullHtml
            .replace(styleMatch[0], '<link rel="stylesheet" href="assets/css/style.css" />')
            .replace(scriptMatch[0], '<script src="assets/js/data.js"></script>\n<script src="assets/js/player.js"></script>');

        return {
            indexHtml,
            styleCss,
            dataJs,
            playerJs,
            paths: [
                'index.html',
                'assets/css/style.css',
                'assets/js/data.js',
                'assets/js/player.js',
            ],
        };
    };

    const exportVictorySoundPath = 'assets/sounds/Am_thanh_chuc_mung_chien_thang-www_tiengdong_com.mp3';

    const createExportReadme = (kind: 'HTML5' | `SCORM ${ScormVersion}`) => [
        `${kind} - ${title || 'Video bai giang tuong tac'}`,
        '',
        'Cau truc goi xuat:',
        '- index.html: file mo bai giang',
        '- assets/css/style.css: giao dien player',
        '- assets/js/data.js: du lieu bai hoc',
        '- assets/js/player.js: logic tuong tac',
        '- assets/media/: video cuc bo',
        '- assets/sounds/: am thanh hieu ung cua bai hoc',
        '- assets/images/: thu muc danh cho hinh anh bo sung',
        '- project-backup.json: file sao luu de nhap lai va chinh sua trong GiaoVienCN',
        '',
        kind.startsWith('SCORM')
            ? 'Voi LMS: tai len ca file ZIP nay, khong giai nen truoc khi import.'
            : 'Voi HTML5: giai nen ZIP roi mo index.html bang trinh duyet.',
    ].join('\n');

    const addStructuredExportFilesToZip = async (
        zip: JSZip,
        videoPath: string,
        videoFile: File,
        scormVersion?: ScormVersion
    ) => {
        const structured = createStructuredExportFiles(createExportHtml(videoPath, scormVersion));
        zip.file('index.html', structured.indexHtml);
        zip.file('assets/css/style.css', structured.styleCss);
        zip.file('assets/js/data.js', structured.dataJs);
        zip.file('assets/js/player.js', structured.playerJs);
        zip.file(videoPath, videoFile);
        const exportedFiles = [
            ...structured.paths,
            videoPath,
            'assets/images/README.txt',
            'project-backup.json',
            'README.txt',
        ];
        try {
            const response = await fetch('/sounds/Am_thanh_chuc_mung_chien_thang-www_tiengdong_com.mp3');
            if (response.ok) {
                zip.file(exportVictorySoundPath, await response.blob());
                exportedFiles.push(exportVictorySoundPath);
            }
        } catch {
            // The exported player still falls back to the online sound and synthesized fanfare.
        }
        zip.file('assets/images/README.txt', 'Dat hinh anh bo sung cua bai giang trong thu muc nay neu can.\n');
        zip.file('project-backup.json', JSON.stringify(createProjectBackupObject(), null, 2));
        zip.file('README.txt', createExportReadme(scormVersion ? `SCORM ${scormVersion}` : 'HTML5'));

        return exportedFiles;
    };

    const createScormManifest = (version: ScormVersion, videoFileName: string, extraFiles: string[] = []) => {
        const escapeXml = (value: string) => String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
        const manifestId = `GVCN-${safeFileName(title)}-${Date.now()}`;
        const titleXml = escapeXml(title || 'Video bài giảng tương tác');

        if (version === '1.2') {
            return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${titleXml}</title>
      <item identifier="ITEM-1" identifierref="RES-1">
        <title>${titleXml}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
      <file href="${escapeXml(videoFileName)}" />
${extraFiles.filter(file => file !== 'index.html' && file !== videoFileName).map(file => `      <file href="${escapeXml(file)}" />`).join('\n')}
    </resource>
  </resources>
</manifest>`;
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${titleXml}</title>
      <item identifier="ITEM-1" identifierref="RES-1">
        <title>${titleXml}</title>
        <imsss:sequencing>
          <imsss:controlMode choice="true" flow="true" />
        </imsss:sequencing>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html" />
      <file href="${escapeXml(videoFileName)}" />
${extraFiles.filter(file => file !== 'index.html' && file !== videoFileName).map(file => `      <file href="${escapeXml(file)}" />`).join('\n')}
    </resource>
  </resources>
</manifest>`;
    };

    const openExportPayment = (request: PendingExport) => {
        if (!title.trim()) return alert('Vui lòng nhập tên video trước khi xuất file.');
        if (videoSource !== 'local') {
            alert('Dùng link YouTube online thì miễn phí. Xuất file độc lập chạy offline cần chọn nguồn "Từ máy" và thanh toán theo lượt.');
            return;
        }
        setSelectedExportPackageId('single');
        setCopiedPaymentField(null);
        setExportEmailInput(userEmail || exportEmailInput || '');
        setPendingExport(request);
    };

    const handleExportHtml5 = () => openExportPayment({ kind: 'html5' });

    const runExportHtml5 = async () => {
        if (!title.trim()) return alert('Vui lòng nhập tên video trước khi xuất file.');
        if (videoSource !== 'local') {
            alert('Xuất HTML5 hiện hỗ trợ tốt nhất với video tải từ máy. Với YouTube, thầy cô dùng chia sẻ link trong app trước nhé.');
            return;
        }

        const videoFile = localVideoFile || (editingLesson?.id ? await getLocalVideoFile(editingLesson.id) : null);
        if (!videoFile) {
            alert('Chưa tìm thấy file video cục bộ. Vui lòng chọn lại video từ máy rồi xuất.');
            return;
        }

        const originalName = localVideoName || editingLesson?.localVideoName || 'video.mp4';
        const extension = originalName.includes('.') ? originalName.split('.').pop() || 'mp4' : 'mp4';
        const videoName = `assets/media/${safeFileName(title)}.${extension}`;
        const zip = new JSZip();
        await addStructuredExportFilesToZip(zip, videoName, videoFile);
        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${safeFileName(title)}-html5.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    };

    const handleExportScorm = (version: ScormVersion) => openExportPayment({ kind: 'scorm', version });

    const runExportScorm = async (version: ScormVersion) => {
        if (!title.trim()) return alert('Vui lòng nhập tên video trước khi xuất SCORM.');
        if (videoSource !== 'local') {
            alert('Xuất SCORM cần video tải từ máy để đóng gói vào LMS. Vui lòng chọn nguồn "Từ máy" trước khi xuất.');
            return;
        }

        const videoFile = localVideoFile || (editingLesson?.id ? await getLocalVideoFile(editingLesson.id) : null);
        if (!videoFile) {
            alert('Chưa tìm thấy file video cục bộ. Vui lòng chọn lại video từ máy rồi xuất SCORM.');
            return;
        }

        const originalName = localVideoName || editingLesson?.localVideoName || 'video.mp4';
        const extension = originalName.includes('.') ? originalName.split('.').pop() || 'mp4' : 'mp4';
        const videoName = `assets/media/${safeFileName(title)}.${extension}`;
        const zip = new JSZip();
        const packageFiles = await addStructuredExportFilesToZip(zip, videoName, videoFile, version);
        zip.file('imsmanifest.xml', createScormManifest(version, videoName, packageFiles));
        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${safeFileName(title)}-scorm-${version === '1.2' ? '12' : '2004'}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    };

    const confirmPaidExport = async () => {
        const request = pendingExport;
        if (!request) return;

        const code = exportCodeInput.toUpperCase().replace(/\s+/g, '').trim();
        const email = exportEmailInput.toLowerCase().trim();
        if (!code) {
            alert('Vui lòng nhập mã lượt xuất VIDX- do admin cấp.');
            return;
        }
        if (!isValidVideoExportEmail(email)) {
            alert('Vui lòng nhập đúng Gmail dùng mã xuất.');
            return;
        }

        setIsExportingPaidFile(true);
        const exportType = request.kind === 'html5' ? 'HTML5' : `SCORM ${request.version}`;
        const reserved = await reserveVideoExportTurn(code, email, title, exportType);
        if (!reserved.ok) {
            setIsExportingPaidFile(false);
            alert(`${reserved.reason}\n\nNếu vừa chuyển khoản, vui lòng liên hệ Zalo admin ${EXPORT_BANK_INFO.adminZalo} để được cấp/cộng lượt.`);
            return;
        }

        try {
            if (request.kind === 'html5') {
                await runExportHtml5();
            } else {
                await runExportScorm(request.version);
            }
            setPendingExport(null);
            alert(`Đã trừ 1 lượt xuất từ mã ${reserved.reservation.code}. Còn ${reserved.reservation.exportLimit - reserved.reservation.exportCount} lượt.`);
        } catch (error) {
            await rollbackVideoExportTurn(reserved.reservation);
            alert('Xuất file bị lỗi nên hệ thống đã hoàn lại lượt. Vui lòng thử lại.');
        } finally {
            setIsExportingPaidFile(false);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputUrl = e.target.value;
        setUrl(inputUrl);
        setUrlError(false);

        if (inputUrl.trim()) {
            const valid = isValidYouTubeUrl(inputUrl);
            setUrlValid(valid);
            if (valid && startTime === 0) {
                const extractedTime = extractStartTime(inputUrl);
                if (extractedTime > 0) {
                    setStartTime(extractedTime);
                }
            }
        } else {
            setUrlValid(null);
        }
    };

    const handleShare = async (lesson: VideoLesson) => {
        if (lesson.videoSource === 'local') {
            alert('Video từ máy đang lưu cục bộ trên thiết bị, không thể tạo link chia sẻ online. Hãy dùng xuất HTML5/SCORM ở bước tiếp theo.');
            return;
        }
        if (isCopyingLink) return;
        setIsCopyingLink(lesson.id);

        try {
            // Sử dụng Firebase để tạo link ngắn
            const shortUrl = await createShortShareUrl(lesson);
            await navigator.clipboard.writeText(shortUrl);
            setCopiedId(lesson.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            // Fallback về link dài nếu lỗi
            const longUrl = createShareUrl(lesson);
            await navigator.clipboard.writeText(longUrl);
            setCopiedId(lesson.id);
        } finally {
            setIsCopyingLink(null);
        }
    };

    const isEditing = currentView === 'CREATE_NEW' || currentView === 'EDIT';
    const sidebarItemBase = 'group flex min-h-[48px] w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-black transition-all hover:-translate-y-0.5 hover:shadow-lg';
    const sidebarItemIdle = 'border-white/10 bg-white/10 text-white/90 hover:border-white/20 hover:bg-white/16';
    const sidebarItemActive = 'border-white/30 bg-white text-purple-800 shadow-xl shadow-purple-950/20';
    const sidebarIconBase = 'grid h-9 w-9 shrink-0 place-items-center rounded-xl transition';
    const sidebarIconIdle = 'bg-white/12 text-white ring-1 ring-white/10 group-hover:bg-white/18';
    const sidebarIconActive = 'bg-purple-100 text-purple-700 ring-1 ring-purple-200';

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600">
            {/* Sidebar */}
            <div className="w-64 bg-gradient-to-b from-violet-800 via-purple-800 to-fuchsia-900 p-5 flex flex-col gap-4 shadow-2xl">
                <div className="mb-1 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-purple-950/20">
                    <h2 className="flex items-center gap-3 text-lg font-black text-white">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/14 ring-1 ring-white/15">
                            <Video size={21} />
                        </span>
                        <span className="leading-tight">Video Tương Tác</span>
                    </h2>
                    <p className="mt-2 text-xs font-bold text-white/55">Tạo, nhập và xuất bài học</p>
                </div>

                {/* Navigation Buttons */}
                <div className="space-y-2">
                    <p className="px-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">Chung</p>
                    <button
                        type="button"
                        onClick={onBack}
                        className={`${sidebarItemBase} ${sidebarItemIdle}`}
                    >
                        <span className={`${sidebarIconBase} ${sidebarIconIdle}`}>
                            <Home size={18} />
                        </span>
                        <span className="truncate">Về trang chủ</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => window.open('https://youtu.be/bxSN16ySCgw', '_blank')}
                        className={`${sidebarItemBase} ${sidebarItemIdle}`}
                    >
                        <span className={`${sidebarIconBase} ${sidebarIconIdle}`}>
                            <HelpCircle size={18} />
                        </span>
                        <span className="truncate">Hướng dẫn</span>
                    </button>
                </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-2">
                    <p className="px-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">Dự án</p>
                    <button
                        type="button"
                        onClick={handleCreateNew}
                        className={`${sidebarItemBase} ${isEditing ? sidebarItemActive : sidebarItemIdle}`}
                    >
                        <span className={`${sidebarIconBase} ${isEditing ? sidebarIconActive : sidebarIconIdle}`}>
                            <Plus size={18} />
                        </span>
                        <span className="truncate">Tạo video mới</span>
                    </button>

                    <label className={`${sidebarItemBase} ${sidebarItemIdle} cursor-pointer`}>
                        <span className={`${sidebarIconBase} ${sidebarIconIdle}`}>
                            <Upload size={18} />
                        </span>
                        <span className="truncate">Nhập dự án</span>
                        <input
                            type="file"
                            accept=".json,application/json"
                            onChange={handleImportProjectBackup}
                            className="hidden"
                        />
                    </label>

                    <button
                        type="button"
                        onClick={() => {
                            resetForm();
                            setCurrentView('MY_VIDEOS');
                        }}
                        className={`${sidebarItemBase} ${currentView === 'MY_VIDEOS' ? sidebarItemActive : sidebarItemIdle}`}
                    >
                        <span className={`${sidebarIconBase} ${currentView === 'MY_VIDEOS' ? sidebarIconActive : sidebarIconIdle}`}>
                            <BookOpen size={18} />
                        </span>
                        <span className="truncate">Video của tôi</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex">
                <div className="flex-1 bg-white rounded-l-[40px] p-8 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {currentView === 'MY_VIDEOS' && (
                            <motion.div
                                key="my-videos"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-8">
                                    <h1 className="text-3xl font-bold text-purple-800">Video của tôi</h1>
                                    <button
                                        onClick={handleCreateNew}
                                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                    >
                                        <Plus size={20} />
                                        Tạo video mới
                                    </button>
                                </div>

                                {/* Video List */}
                                {lessons.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="w-24 h-24 mb-6">
                                            <img
                                                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect x='10' y='20' width='25' height='35' rx='3' fill='%234ade80'/%3E%3Crect x='40' y='20' width='25' height='35' rx='3' fill='%2322c55e'/%3E%3Crect x='70' y='30' width='20' height='25' rx='3' fill='%23ef4444'/%3E%3C/svg%3E"
                                                alt="Books"
                                                className="w-full h-full"
                                            />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-700 mb-2">Chưa có video nào</h3>
                                        <p className="text-gray-500 mb-6">Hãy tạo video đầu tiên của bạn!</p>
                                        <button
                                            onClick={handleCreateNew}
                                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                                        >
                                            Tạo video mới
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {lessons.map(lesson => (
                                            <motion.div
                                                key={lesson.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="text-lg font-bold text-gray-800 truncate flex-1 pr-4">{lesson.title}</h4>
                                                    <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                                                        {lesson.questions.length} câu hỏi
                                                    </span>
                                                </div>

                                                <p className="text-gray-500 text-sm mb-2">
                                                    {new Date(lesson.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>

                                                {lesson.videoSource === 'local' ? (
                                                    <div className="inline-flex items-center text-emerald-700 text-sm font-medium mb-4">
                                                        <Upload size={14} className="mr-1" /> Video cục bộ: {lesson.localVideoName || 'đã lưu trên máy'}
                                                    </div>
                                                ) : (
                                                    <a
                                                        href={lesson.youtubeUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 hover:underline"
                                                    >
                                                        <ExternalLink size={14} className="mr-1" /> Xem video gốc
                                                    </a>
                                                )}

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => onPlay(lesson)}
                                                        className="py-2 px-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1"
                                                    >
                                                        <Play size={14} /> Xem
                                                    </button>
                                                    <button
                                                        onClick={() => loadLessonForEdit(lesson)}
                                                        className="py-2 px-3 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1"
                                                    >
                                                        <Edit3 size={14} /> Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleShare(lesson)}
                                                        disabled={isCopyingLink === lesson.id}
                                                        className="py-2 px-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-400 to-orange-500 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1 disabled:opacity-70"
                                                    >
                                                        {copiedId === lesson.id ? (
                                                            <><CheckCircle2 size={14} /> Đã sao chép</>
                                                        ) : (
                                                            <><Share2 size={14} /> Chia sẻ</>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(lesson.id)}
                                                        className="py-2 px-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1"
                                                    >
                                                        <Trash2 size={14} /> Xóa
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {isEditing && (
                            <motion.div
                                key="editor"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h1 className="text-2xl font-bold text-purple-800">
                                        {editingLesson ? '✏️ Chỉnh sửa video' : '🎬 Tạo video tương tác mới'}
                                    </h1>
                                </div>

                                {/* Form Content */}
                                <div className="space-y-6">
                                    {/* Video Info Card */}
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Title */}
                                            <div>
                                                <label className="block text-gray-700 font-bold mb-2">Tên video</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none bg-gray-50 text-gray-800"
                                                        placeholder="Chưa đặt tên"
                                                    />
                                                    <Edit3 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400" />
                                                </div>
                                            </div>

                                            {/* Video Source */}
                                            <div>
                                                <label className="block text-gray-700 font-bold mb-2">Nguồn video</label>
                                                <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleVideoSourceChange('youtube')}
                                                        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-all ${videoSource === 'youtube' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        <Link2 size={15} /> YouTube
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleVideoSourceChange('local')}
                                                        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-all ${videoSource === 'local' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        <Upload size={15} /> Từ máy
                                                    </button>
                                                </div>

                                                {videoSource === 'youtube' ? (
                                                    <input
                                                        type="text"
                                                        value={url}
                                                        onChange={handleUrlChange}
                                                        className={`w-full p-3 rounded-xl border-2 focus:outline-none bg-gray-50 transition-colors ${urlError ? 'border-red-400' :
                                                            urlValid === true ? 'border-green-400' :
                                                                urlValid === false ? 'border-orange-400' :
                                                                    'border-gray-200 focus:border-purple-400'
                                                            }`}
                                                        placeholder="https://youtu.be/..."
                                                    />
                                                ) : (
                                                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 px-3 py-4 text-center transition hover:border-purple-400 hover:bg-purple-100">
                                                        <Upload size={22} className="mb-1 text-purple-600" />
                                                        <span className="text-sm font-bold text-purple-800">{localVideoName || 'Chọn video MP4/WebM/OGG'}</span>
                                                        <span className="mt-1 text-xs text-purple-500">Lưu cục bộ trên máy, không upload lên server</span>
                                                        <input type="file" accept="video/mp4,video/webm,video/ogg,video/*" onChange={handleLocalVideoChange} className="hidden" />
                                                    </label>
                                                )}
                                            </div>

                                            {/* Start Time */}
                                            <div>
                                                <label className="block text-gray-700 font-bold mb-2">Thời điểm bắt đầu video</label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <input
                                                            type="number"
                                                            value={Math.floor(startTime / 60)}
                                                            onChange={(e) => setStartTime(Number(e.target.value) * 60 + (startTime % 60))}
                                                            className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none bg-gray-50 text-center"
                                                            placeholder="Phút"
                                                            min={0}
                                                        />
                                                        <div className="text-center text-xs text-gray-500 mt-1">Phút</div>
                                                    </div>
                                                    <span className="text-2xl text-gray-400 self-start pt-3">:</span>
                                                    <div className="flex-1">
                                                        <input
                                                            type="number"
                                                            value={startTime % 60}
                                                            onChange={(e) => setStartTime(Math.floor(startTime / 60) * 60 + Number(e.target.value))}
                                                            className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none bg-gray-50 text-center"
                                                            placeholder="Giây"
                                                            min={0}
                                                            max={59}
                                                        />
                                                        <div className="text-center text-xs text-gray-500 mt-1">Giây</div>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">Để trống = bắt đầu từ 0:00</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video Preview */}
                                    {getPreviewVideoUrl() && (
                                        <div
                                            className="overflow-hidden shadow-lg border-4 border-white aspect-video max-w-2xl mx-auto bg-black"
                                            style={{ borderRadius: playerTheme.radius }}
                                        >
                                            {!urlError ? (
                                                <ReactPlayer
                                                    url={getPreviewVideoUrl()}
                                                    width="100%"
                                                    height="100%"
                                                    controls={true}
                                                    light={videoSource === 'youtube'}
                                                    onError={() => setUrlError(true)}
                                                    config={{
                                                        youtube: {
                                                            playerVars: {
                                                                origin: window.location.origin,
                                                                modestbranding: 1
                                                            }
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-white bg-gray-900 text-center p-4">
                                                    <AlertCircle size={32} className="text-red-400 mb-2" />
                                                    <span className="text-sm font-medium mb-2">Video này bị chủ sở hữu chặn nhúng.</span>
                                                    {videoSource === 'youtube' && (
                                                        <a
                                                            href={getCleanVideoUrl(url)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg flex items-center gap-1"
                                                        >
                                                            <ExternalLink size={12} /> Kiểm tra trên YouTube
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Questions Counter */}
                                    <div className="text-center text-gray-600 font-medium py-2 bg-gray-100 rounded-xl">
                                        Đã tạo: <strong>{questions.length}</strong> câu hỏi
                                    </div>

                                    {/* Questions List */}
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                        {questions.map((q, index) => (
                                            <motion.div
                                                key={q.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-gray-50 rounded-2xl p-6 border border-gray-200 relative"
                                            >
                                                <button
                                                    onClick={() => removeQuestion(q.id)}
                                                    className="absolute top-4 right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>

                                                <h4 className="text-lg font-bold text-gray-700 mb-4">Câu hỏi {index + 1}</h4>

                                                {/* Time Input */}
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={Math.floor(q.time / 60)}
                                                            onChange={(e) => updateQuestion(q.id, 'time', Number(e.target.value) * 60 + (q.time % 60))}
                                                            className="w-16 p-2 rounded-lg border border-gray-300 text-center text-sm"
                                                            placeholder="Phút"
                                                            min={0}
                                                        />
                                                        <span className="text-gray-400">:</span>
                                                        <input
                                                            type="number"
                                                            value={q.time % 60}
                                                            onChange={(e) => updateQuestion(q.id, 'time', Math.floor(q.time / 60) * 60 + Number(e.target.value))}
                                                            className="w-16 p-2 rounded-lg border border-gray-300 text-center text-sm"
                                                            placeholder="Giây"
                                                            min={0}
                                                            max={59}
                                                        />
                                                    </div>
                                                    <span className="text-gray-500 text-sm">Thời điểm xuất hiện câu hỏi</span>
                                                </div>

                                                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_110px]">
                                                    <div>
                                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Loại câu hỏi</label>
                                                        <select
                                                            value={getQuestionType(q)}
                                                            onChange={(e) => updateQuestionType(q.id, e.target.value as QuestionType)}
                                                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-700 outline-none focus:border-purple-400"
                                                        >
                                                            {questionTypes.map(type => (
                                                                <option key={type.value} value={type.value}>{type.label}</option>
                                                            ))}
                                                        </select>
                                                        <p className="mt-1 text-xs text-gray-400">{questionTypes.find(type => type.value === getQuestionType(q))?.description}</p>
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Điểm</label>
                                                        <input
                                                            type="number"
                                                            value={q.points || 10}
                                                            onChange={(e) => updateQuestion(q.id, 'points', Math.max(0, Number(e.target.value)))}
                                                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-center text-sm font-bold outline-none focus:border-purple-400"
                                                            min={0}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Question Text */}
                                                <input
                                                    type="text"
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                                    className="w-full p-3 rounded-xl border border-gray-300 bg-white mb-4 font-medium"
                                                    placeholder="Nhập câu hỏi..."
                                                />

                                                {/* Options - Dynamic */}
                                                <div className="space-y-2">
                                                    {(getQuestionType(q) === 'multiple-choice' || getQuestionType(q) === 'true-false') && q.options.map((opt, optIndex) => (
                                                        <div key={optIndex} className="relative flex items-center gap-2">
                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${q.correctOption === optIndex
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-gray-200 text-gray-600'
                                                                }`}>
                                                                {optionLabels[optIndex]}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={getQuestionType(q) === 'true-false' ? ['Đúng', 'Sai'][optIndex] : opt}
                                                                onChange={(e) => updateQuestion(q.id, `option.${optIndex}`, e.target.value)}
                                                                disabled={getQuestionType(q) === 'true-false'}
                                                                className={`flex-1 pl-3 pr-8 p-2 text-sm rounded-xl border transition-colors ${q.correctOption === optIndex
                                                                    ? 'border-green-400 bg-green-50'
                                                                    : 'border-gray-200 bg-white focus:border-purple-400'
                                                                    }`}
                                                                placeholder={`Đáp án ${optionLabels[optIndex]}`}
                                                            />
                                                            <input
                                                                type="radio"
                                                                name={`correct-${q.id}`}
                                                                checked={q.correctOption === optIndex}
                                                                onChange={() => updateQuestion(q.id, 'correctOption', optIndex)}
                                                                className="h-4 w-4 accent-green-500 cursor-pointer flex-shrink-0"
                                                                title="Chọn làm đáp án đúng"
                                                            />
                                                            {/* Nút xóa đáp án */}
                                                            {getQuestionType(q) === 'multiple-choice' && q.options.length > 2 && (
                                                                <button
                                                                    onClick={() => removeOption(q.id, optIndex)}
                                                                    className="p-1 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg transition-colors flex-shrink-0"
                                                                    title="Xóa đáp án này"
                                                                >
                                                                    <Minus size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {/* Nút thêm đáp án */}
                                                    {getQuestionType(q) === 'multiple-choice' && q.options.length < 4 && (
                                                        <button
                                                            onClick={() => addOption(q.id)}
                                                            className="w-full py-2 mt-2 text-sm font-medium text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-xl border border-dashed border-purple-300 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <Plus size={14} /> Thêm đáp án ({q.options.length}/4)
                                                        </button>
                                                    )}
                                                    {(getQuestionType(q) === 'short-answer' || getQuestionType(q) === 'fill-blank') && (
                                                        <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="text-sm font-bold text-blue-900">Các đáp án đúng được chấp nhận</span>
                                                                <label className="flex items-center gap-2 text-xs font-bold text-blue-700">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(q.caseSensitive)}
                                                                        onChange={(e) => updateQuestion(q.id, 'caseSensitive', e.target.checked)}
                                                                        className="h-4 w-4 accent-blue-600"
                                                                    />
                                                                    Phân biệt hoa/thường
                                                                </label>
                                                            </div>
                                                            {normalizeAnswers(q.acceptedAnswers).map((answer, answerIndex) => (
                                                                <div key={answerIndex} className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={answer}
                                                                        onChange={(e) => updateAcceptedAnswer(q.id, answerIndex, e.target.value)}
                                                                        className="flex-1 rounded-xl border border-blue-100 bg-white p-2 text-sm font-semibold outline-none focus:border-blue-400"
                                                                        placeholder={getQuestionType(q) === 'fill-blank' ? 'Từ/cụm từ cần điền' : 'Đáp án đúng'}
                                                                    />
                                                                    {normalizeAnswers(q.acceptedAnswers).length > 1 && (
                                                                        <button type="button" onClick={() => removeAcceptedAnswer(q.id, answerIndex)} className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600" title="Xóa đáp án">
                                                                            <Minus size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            <button type="button" onClick={() => addAcceptedAnswer(q.id)} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-blue-300 bg-white py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100">
                                                                <Plus size={14} /> Thêm đáp án đúng
                                                            </button>
                                                        </div>
                                                    )}
                                                    {getQuestionType(q) === 'image-choice' && (
                                                        <div className="space-y-3">
                                                            {(q.imageOptions?.length ? q.imageOptions : q.options.map(text => ({ text, imageUrl: '' }))).map((option, optIndex) => (
                                                                <div key={optIndex} className={`rounded-2xl border p-3 ${q.correctOption === optIndex ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                                                    <div className="mb-2 flex items-center justify-between gap-2">
                                                                        <span className="text-sm font-black text-gray-600">Lựa chọn {optionLabels[optIndex]}</span>
                                                                        <label className="flex items-center gap-2 text-xs font-bold text-green-700">
                                                                            <input type="radio" name={`correct-${q.id}`} checked={q.correctOption === optIndex} onChange={() => updateQuestion(q.id, 'correctOption', optIndex)} className="h-4 w-4 accent-green-500" />
                                                                            Đáp án đúng
                                                                        </label>
                                                                    </div>
                                                                    <div className="grid gap-2 md:grid-cols-[120px_1fr]">
                                                                        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-xs font-bold text-gray-400">
                                                                            {option.imageUrl ? <img src={option.imageUrl} alt={option.text || `Lựa chọn ${optionLabels[optIndex]}`} className="h-full w-full object-cover" /> : 'Chưa có ảnh'}
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <input type="text" value={option.text} onChange={(e) => updateImageOption(q.id, optIndex, 'text', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-2 text-sm font-semibold outline-none focus:border-purple-400" placeholder="Nhãn đáp án" />
                                                                            <input type="text" value={option.imageUrl} onChange={(e) => updateImageOption(q.id, optIndex, 'imageUrl', e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs outline-none focus:border-purple-400" placeholder="Dán link ảnh hoặc tải ảnh từ máy" />
                                                                            <div className="flex items-center gap-2">
                                                                                <label className="cursor-pointer rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100">
                                                                                    Tải ảnh
                                                                                    <input type="file" accept="image/*" onChange={(e) => handleImageOptionFile(q.id, optIndex, e.target.files?.[0])} className="hidden" />
                                                                                </label>
                                                                                {(q.imageOptions?.length || q.options.length) > 2 && (
                                                                                    <button type="button" onClick={() => removeImageOption(q.id, optIndex)} className="rounded-lg px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50">
                                                                                        Xóa
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {(q.imageOptions?.length || q.options.length) < 4 && (
                                                                <button type="button" onClick={() => addImageOption(q.id)} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-purple-300 bg-purple-50 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-100">
                                                                    <Plus size={14} /> Thêm hình ảnh
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Control Panel - Only show when editing */}
                {isEditing && (
                    <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col overflow-y-auto">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Bảng điều khiển</h3>
                        <div className="mb-5 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 px-3 py-2.5 text-xs font-bold leading-relaxed text-sky-800 shadow-sm">
                            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-black text-white">
                                i
                            </span>
                            Nhấn vào từng mục bên dưới để xổ xuống và chỉnh sửa chi tiết.
                        </div>

                        <div className="flex flex-1 flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => setControlPanel(controlPanel === 'export' ? 'actions' : 'export')}
                                className={`order-5 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${controlPanel === 'export' ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <span className="flex items-center gap-2 text-sm font-black"><Download size={18} /> Xuất file</span>
                                <ChevronDown size={18} className={`transition ${controlPanel === 'export' ? 'rotate-180' : ''}`} />
                            </button>
                            {controlPanel === 'export' && (
                                <div className="order-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                                <div className="mb-3 rounded-xl bg-white/80 p-3 text-xs font-semibold leading-relaxed text-indigo-900 ring-1 ring-indigo-100">
                                    Link YouTube online dùng miễn phí. Chỉ xuất file độc lập HTML5/SCORM mới tính lượt: 20k/1 lượt hoặc 100k/10 lượt.
                                </div>
                                <button
                                    onClick={handleExportHtml5}
                                    className="mb-2 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                >
                                    <Download size={18} />
                                    Tải HTML5 (.zip)
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleExportScorm('1.2')} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100 transition hover:bg-indigo-600 hover:text-white">
                                                                                SCORM 1.2
                                    </button>
                                    <button onClick={() => handleExportScorm('2004')} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100 transition hover:bg-indigo-600 hover:text-white">
                                                                                SCORM 2004
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleExportProjectBackup}
                                    className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-indigo-200 bg-slate-800 px-4 py-3 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-slate-900 hover:shadow-lg"
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
                                        <Save size={20} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black leading-tight">Xuất bản sao lưu</span>
                                        <span className="mt-1 block text-xs font-semibold leading-snug text-indigo-100">Dùng để import vào máy khác</span>
                                    </span>
                                </button>
                            </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setControlPanel(controlPanel === 'design' ? 'actions' : 'design')}
                                className={`order-3 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${controlPanel === 'design' ? 'border-purple-200 bg-purple-50 text-purple-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <span className="flex items-center gap-2 text-sm font-black"><Palette size={18} /> Tùy chỉnh xuất bản</span>
                                <ChevronDown size={18} className={`transition ${controlPanel === 'design' ? 'rotate-180' : ''}`} />
                            </button>
                            {controlPanel === 'design' && (
                                <div className="order-4 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
                                    <PlayerThemeCustomizer theme={playerTheme} onChange={setPlayerTheme} />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setControlPanel('actions')}
                                className={`order-1 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${controlPanel === 'actions' ? 'border-orange-200 bg-orange-50 text-orange-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <span className="flex items-center gap-2 text-sm font-black"><Play size={18} /> Thao tác nhanh</span>
                                <ChevronDown size={18} className={`transition ${controlPanel === 'actions' ? 'rotate-180' : ''}`} />
                            </button>
                            {controlPanel === 'actions' && (
                                <div className="order-2 space-y-3 rounded-2xl border border-orange-100 bg-orange-50 p-3">
                                    <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                                        <span className="text-gray-700 font-medium">Cho phép tua video</span>
                                        <button
                                            onClick={() => setAllowSeeking(!allowSeeking)}
                                            className={`w-14 h-7 rounded-full transition-all duration-300 relative ${allowSeeking
                                                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                                : 'bg-gray-300'
                                                }`}
                                        >
                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${allowSeeking ? 'right-1' : 'left-1'
                                                }`} />
                                        </button>
                                    </div>

                            <button
                                onClick={addQuestion}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                                <Plus size={20} />
                                Thêm câu hỏi
                            </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 grid gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-3 shadow-sm">
                            <button
                                onClick={handleSave}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                                <Save size={20} />
                                Lưu bài giảng
                            </button>

                            <button
                                onClick={handlePreview}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                                <Play size={20} />
                                Xem thử
                            </button>
                        </div>

                        {/* Back Button */}
                        <button
                            onClick={() => {
                                resetForm();
                                setCurrentView('MY_VIDEOS');
                            }}
                            className="mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft size={18} />
                            Quay lại danh sách
                        </button>
                    </div>
                )}
            </div>

            {/* Saved Video Card Modal */}
            <AnimatePresence>
                {showSavedCard && savedLesson && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setShowSavedCard(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-center gap-2 mb-5 py-3 bg-green-50 rounded-xl border border-green-100">
                                <CheckCircle2 size={24} className="text-green-500" />
                                <h3 className="text-lg font-bold text-green-700">Đã lưu video thành công!</h3>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-xl font-bold text-slate-800 truncate pr-4 flex-1 flex items-center gap-2">
                                        <span className="text-purple-600">📹</span> {savedLesson.title}
                                    </h4>
                                    <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                                        {savedLesson.questions.length} câu hỏi
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm mb-2">
                                    Cập nhật: {new Date(savedLesson.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                {savedLesson.videoSource === 'local' ? (
                                    <div className="inline-flex items-center text-emerald-700 text-sm font-medium">
                                        <Upload size={14} className="mr-1" /> Video cục bộ: {savedLesson.localVideoName || 'đã lưu trên máy'}
                                    </div>
                                ) : (
                                    <a
                                        href={savedLesson.youtubeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                    >
                                        Xem video gốc
                                    </a>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setShowSavedCard(false);
                                        onPlay(savedLesson);
                                    }}
                                    className="py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Play size={16} /> Xem
                                </button>
                                <button
                                    onClick={() => setShowSavedCard(false)}
                                    className="py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Edit3 size={16} /> Tiếp tục sửa
                                </button>
                                <button
                                    onClick={async () => {
                                        if (savedLesson.videoSource === 'local') {
                                            alert('Video từ máy đang lưu cục bộ trên thiết bị, không thể tạo link chia sẻ online.');
                                            return;
                                        }
                                        if (isCopyingLink) return;
                                        setIsCopyingLink(savedLesson.id);
                                        try {
                                            // Sử dụng Firebase để tạo link ngắn
                                            const shortUrl = await createShortShareUrl(savedLesson);
                                            await navigator.clipboard.writeText(shortUrl);
                                            setCopiedId(savedLesson.id);
                                            setTimeout(() => setCopiedId(null), 3000);
                                        } catch (error) {
                                            // Fallback về link dài nếu lỗi
                                            const longUrl = createShareUrl(savedLesson);
                                            await navigator.clipboard.writeText(longUrl);
                                            setCopiedId(savedLesson.id);
                                        } finally {
                                            setIsCopyingLink(null);
                                        }
                                    }}
                                    disabled={!!isCopyingLink}
                                    className={`py-3 px-4 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 ${copiedId === savedLesson.id
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                        : 'bg-gradient-to-r from-amber-400 to-orange-500'
                                        }`}
                                >
                                    {copiedId === savedLesson.id ? (
                                        <><CheckCircle2 size={16} /> Đã sao chép!</>
                                    ) : (
                                        <><Share2 size={16} /> Sao chép link</>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSavedCard(false);
                                        resetForm();
                                        setCurrentView('MY_VIDEOS');
                                    }}
                                    className="py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-gray-500 to-slate-600 shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Home size={16} /> Đóng
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Export Payment Modal */}
            <AnimatePresence>
                {pendingExport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4"
                        onClick={() => setPendingExport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 18 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 18 }}
                            className="my-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-4 sm:max-h-[calc(100vh-2rem)]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex shrink-0 items-start justify-between gap-4 bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-4 text-white sm:px-6 sm:py-5">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">Xuất file độc lập</p>
                                    <h3 className="mt-1 text-2xl font-black">Chọn dùng thử hoặc gói lượt xuất</h3>
                                    <p className="mt-2 max-w-2xl text-sm font-medium text-white/85">
                                        Có mã dùng thử thì nhập trực tiếp. Nếu cần xuất nhiều file HTML5/SCORM để chạy độc lập, thầy cô chọn gói lượt và chuyển khoản.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPendingExport(null)}
                                    className="rounded-full bg-white/15 p-2 transition hover:bg-white/25"
                                    aria-label="Đóng"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className={`grid flex-1 gap-4 overflow-y-auto p-4 sm:p-5 ${isTrialExportPackage ? '' : 'lg:grid-cols-[minmax(0,1fr)_240px]'}`}>
                                <div className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        {EXPORT_PACKAGES.map(pkg => (
                                            <button
                                                key={pkg.id}
                                                type="button"
                                                onClick={() => setSelectedExportPackageId(pkg.id)}
                                                className={`relative rounded-2xl border p-4 text-left transition ${selectedExportPackageId === pkg.id
                                                    ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-100'
                                                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {pkg.badge && (
                                                    <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-black text-white">
                                                        {pkg.badge}
                                                    </span>
                                                )}
                                                <span className="block text-base font-black text-slate-900">{pkg.title}</span>
                                                <span className="mt-1 block text-sm font-medium text-slate-500">{pkg.description}</span>
                                                {pkg.isTrial ? (
                                                    <>
                                                        <span className="mt-4 block text-2xl font-black text-emerald-700">0đ</span>
                                                        <span className="mt-1 block text-xs font-bold text-emerald-700">Cần mã dùng thử</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="mt-4 block text-2xl font-black text-indigo-700">{formatCurrency(pkg.amount)}đ</span>
                                                        <span className="mt-1 block text-xs font-bold text-slate-500">{formatCurrency(Math.round(pkg.amount / pkg.turns))}đ/lượt</span>
                                                    </>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <div className={`rounded-2xl border p-4 text-sm ${isTrialExportPackage ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                                        <p className="font-black">Ghi chú</p>
                                        <p className="mt-1">
                                            {isTrialExportPackage
                                                ? 'Nếu thầy cô có mã dùng thử xuất file, nhập Gmail và mã VIDX- ở bên dưới để kiểm tra và xuất. Không cần quét QR hay chuyển khoản.'
                                                : 'Sau khi chuyển khoản, admin sẽ cấp mã VIDX- có đúng số lượt theo gói. Mỗi lần xuất thành công hệ thống tự trừ 1 lượt.'}
                                        </p>
                                    </div>

                                    <div className="grid gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-black uppercase text-indigo-700">Gmail dùng mã</label>
                                            <input
                                                type="email"
                                                value={exportEmailInput}
                                                onChange={e => setExportEmailInput(e.target.value)}
                                                className="w-full rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"
                                                placeholder="email@gmail.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-black uppercase text-indigo-700">
                                                {isTrialExportPackage ? 'Mã dùng thử xuất file' : 'Mã lượt xuất'}
                                            </label>
                                            <input
                                                type="text"
                                                value={exportCodeInput}
                                                onChange={e => setExportCodeInput(e.target.value.toUpperCase())}
                                                className="w-full rounded-xl border border-indigo-100 bg-white px-3 py-2 font-mono text-sm font-black text-slate-900 outline-none focus:border-indigo-400"
                                                placeholder="VIDX-ABCDEFGH"
                                            />
                                            <p className="mt-1 text-xs font-semibold text-indigo-700">
                                                {isTrialExportPackage
                                                    ? 'Mã dùng thử cũng bắt đầu bằng VIDX- và hệ thống tự trừ lượt sau khi xuất thành công.'
                                                    : 'Gói 1 lượt và 10 lượt đều dùng 1 mã riêng, hệ thống tự đếm số lượt còn lại.'}
                                            </p>
                                        </div>
                                    </div>

                                    {!isTrialExportPackage && <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase text-slate-500">Số tài khoản</p>
                                                <p className="font-mono text-base font-black text-slate-900">{EXPORT_BANK_INFO.accountNumber}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => copyPaymentText(EXPORT_BANK_INFO.accountNumber, 'account')}
                                                className="rounded-xl bg-white p-2 text-slate-500 shadow-sm transition hover:text-indigo-600"
                                                aria-label="Sao chép số tài khoản"
                                            >
                                                {copiedPaymentField === 'account' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase text-slate-500">Số tiền</p>
                                                <p className="text-base font-black text-orange-600">{formatCurrency(selectedExportPackage.amount)}đ</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => copyPaymentText(String(selectedExportPackage.amount), 'amount')}
                                                className="rounded-xl bg-white p-2 text-slate-500 shadow-sm transition hover:text-indigo-600"
                                                aria-label="Sao chép số tiền"
                                            >
                                                {copiedPaymentField === 'amount' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold uppercase text-slate-500">Nội dung chuyển khoản</p>
                                                <p className="break-words font-mono text-sm font-black text-slate-900">{getExportPaymentNote()}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => copyPaymentText(getExportPaymentNote(), 'note')}
                                                className="rounded-xl bg-white p-2 text-slate-500 shadow-sm transition hover:text-indigo-600"
                                                aria-label="Sao chép nội dung chuyển khoản"
                                            >
                                                {copiedPaymentField === 'note' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                    </div>}
                                </div>

                                {!isTrialExportPackage && <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                                    <img
                                        src={getExportPaymentQrUrl()}
                                        alt="QR thanh toán VietQR"
                                        className="h-44 w-44 rounded-xl object-contain lg:h-52 lg:w-52"
                                    />
                                    <p className="mt-3 text-sm font-black text-slate-900">{EXPORT_BANK_INFO.accountHolder}</p>
                                    <p className="text-xs font-semibold text-slate-500">{EXPORT_BANK_INFO.bankName} - {EXPORT_BANK_INFO.branch}</p>
                                    <a
                                        href={`https://zalo.me/${EXPORT_BANK_INFO.adminZalo}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 w-full rounded-xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 transition hover:bg-sky-100"
                                    >
                                        Zalo admin {EXPORT_BANK_INFO.adminZalo}
                                    </a>
                                </div>}
                            </div>

                            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
                                <button
                                    type="button"
                                    onClick={() => setPendingExport(null)}
                                    className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-100"
                                >
                                    Để sau
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmPaidExport}
                                    disabled={isExportingPaidFile}
                                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isExportingPaidFile
                                        ? 'Đang kiểm tra mã...'
                                        : `${isTrialExportPackage ? 'Kiểm tra mã dùng thử và xuất' : 'Kiểm tra mã và xuất'} ${pendingExport.kind === 'scorm' ? `SCORM ${pendingExport.version}` : 'HTML5'}`}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Copied Toast */}
            <AnimatePresence>
                {copiedId && !showSavedCard && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg z-50"
                    >
                        ✓ Đã sao chép link
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InteractiveVideoModule;
