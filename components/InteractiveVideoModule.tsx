import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, Plus, Save, Play, Trash2, Home, HelpCircle, BookOpen,
    Clock, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, ExternalLink,
    Share2, Edit3, X, Copy, ArrowLeft, Minus, Upload, Link2, Palette, Download
} from 'lucide-react';
import { VideoLesson, Question, VideoPlayerTheme, VideoSourceType, DEFAULT_VIDEO_PLAYER_THEME, normalizeVideoPlayerTheme } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ReactPlayer from 'react-player';
import JSZip from 'jszip';
import { cleanYouTubeUrl, isValidYouTubeUrl, extractStartTime } from '../utils/youtubeUtils';
import { createShareUrl, shortenUrl, createShortShareUrl } from '../utils/shareUtils';
import { getLocalVideoFile, saveLocalVideoFile } from '../utils/localVideoStore';
import PlayerThemeCustomizer from './PlayerThemeCustomizer';

interface InteractiveVideoModuleProps {
    lessons: VideoLesson[];
    onSave: (lesson: VideoLesson) => void;
    onDelete: (lessonId: string) => void;
    onPlay: (lesson: VideoLesson) => void;
    onBack: () => void;
}

type ModuleView = 'MY_VIDEOS' | 'CREATE_NEW' | 'EDIT';

const InteractiveVideoModule: React.FC<InteractiveVideoModuleProps> = ({
    lessons,
    onSave,
    onDelete,
    onPlay,
    onBack
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
        setQuestions(lesson.questions);
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

    const addQuestion = () => {
        const newQuestion: Question = {
            id: uuidv4(),
            time: 0,
            text: '',
            options: ['', '', '', ''], // 4 đáp án mặc định
            correctOption: 0,
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
            questions: questions.sort((a, b) => a.time - b.time),
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
            id: 'preview',
            title,
            youtubeUrl: videoSource === 'local' ? '' : getCleanVideoUrl(url),
            videoSource,
            localVideoName,
            localVideoObjectUrl: videoSource === 'local' ? localVideoPreviewUrl : undefined,
            playerTheme,
            startTime,
            allowSeeking,
            questions: questions.sort((a, b) => a.time - b.time),
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

    const createExportHtml = (videoFileName: string) => {
        const exportData = {
            title,
            videoFileName,
            startTime,
            allowSeeking,
            questions: [...questions].sort((a, b) => a.time - b.time),
            theme: playerTheme,
        };

        return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title.replace(/</g, '&lt;')}</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:${playerTheme.fontFamily},Arial,sans-serif;background:${playerTheme.backgroundColor};color:#fff;min-height:100vh;display:grid;place-items:center;padding:24px}.shell{width:min(1100px,100%);border:6px solid rgba(255,255,255,.28);border-radius:${playerTheme.radius}px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.45);background:#000}.stage{position:relative;aspect-ratio:16/9;background:#000}video{width:100%;height:100%;object-fit:contain;background:#000}.top{position:absolute;left:18px;right:18px;top:18px;display:flex;justify-content:space-between;gap:12px;pointer-events:none}.brand,.badge{background:rgba(0,0,0,.48);backdrop-filter:blur(8px);border-radius:999px;padding:9px 14px;font-weight:800}.logo{display:inline-grid;place-items:center;min-width:28px;height:28px;border-radius:999px;margin-right:8px;background:${playerTheme.primaryColor}}.bottom{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;gap:16px;padding:22px;background:linear-gradient(to top,rgba(0,0,0,.72),transparent);font-weight:800}.overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:20px;background:linear-gradient(135deg,${playerTheme.backgroundColor}dd,${playerTheme.primaryColor}cc,${playerTheme.secondaryColor}aa)}.overlay.show{display:flex}.card{width:min(560px,96%);border-radius:${Math.max(16, playerTheme.radius)}px;padding:24px;background:${playerTheme.questionStyle === 'card' ? playerTheme.surfaceColor : 'rgba(15,23,42,.84)'};color:${playerTheme.questionStyle === 'card' ? playerTheme.textColor : '#fff'};box-shadow:0 22px 70px rgba(0,0,0,.36)}.qtitle{text-align:center;font-size:24px;font-weight:900;margin:0 0 18px}.option{width:100%;border:0;border-radius:999px;background:#fff;color:#1f2937;padding:13px 16px;margin:8px 0;text-align:left;font-weight:800;cursor:pointer}.option.selected{outline:3px solid ${playerTheme.accentColor}}.actions{display:flex;gap:10px;margin-top:16px}.actions button{flex:1;border:0;border-radius:999px;padding:13px 16px;color:#fff;font-weight:900;cursor:pointer}.primary{background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor})}.secondary{background:#0ea5e9}.result{min-height:24px;text-align:center;font-weight:900;margin-top:12px}.author{padding:16px 20px;background:rgba(255,255,255,.08);border-top:1px solid rgba(255,255,255,.12);font-size:14px}.author strong{color:${playerTheme.accentColor}}@media(max-width:700px){body{padding:0}.shell{border-radius:0;border:0}.badge{display:none}.qtitle{font-size:19px}}
</style>
</head>
<body>
<main class="shell">
<section class="stage">
<video id="video" src="${videoFileName}" controls ${allowSeeking ? '' : 'controlsList="nodownload"'}></video>
<div class="top"><div class="brand"><span class="logo">${playerTheme.logoText || 'GV'}</span>${playerTheme.publishTitle || title}</div><div class="badge">${playerTheme.publishSubtitle || ''}</div></div>
<div class="bottom"><span>${playerTheme.footerLeftText || playerTheme.guideText || ''}</span><span>${playerTheme.footerRightText || ''}</span></div>
<div id="overlay" class="overlay"><div class="card"><h2 id="qtext" class="qtitle"></h2><div id="opts"></div><div class="actions"><button class="primary" id="answer">Trả lời ngay</button><button class="secondary" id="rewatch">Xem lại</button></div><div id="result" class="result"></div></div></div>
</section>
${playerTheme.showAuthorPanel ? `<aside class="author"><strong>Tác giả:</strong> ${playerTheme.authorName || 'Chưa nhập'}<br>${(playerTheme.authorInfo || '').replace(/\n/g, '<br>')}</aside>` : ''}
</main>
<script>
const data=${JSON.stringify(exportData)};
const video=document.getElementById('video'),overlay=document.getElementById('overlay'),qtext=document.getElementById('qtext'),opts=document.getElementById('opts'),result=document.getElementById('result');
let current=null,selected=null,answered=[];
video.currentTime=data.startTime||0;
video.addEventListener('timeupdate',()=>{const q=data.questions.find(x=>Math.abs(x.time-video.currentTime)<.7&&!answered.includes(x.id));if(q){current=q;selected=null;video.pause();qtext.textContent=q.text;result.textContent='';opts.innerHTML='';q.options.forEach((o,i)=>{const b=document.createElement('button');b.className='option';b.textContent=String.fromCharCode(65+i)+'. '+o;b.onclick=()=>{selected=i;document.querySelectorAll('.option').forEach(el=>el.classList.remove('selected'));b.classList.add('selected')};opts.appendChild(b)});overlay.classList.add('show')}});
document.getElementById('answer').onclick=()=>{if(!current||selected===null)return;if(selected===current.correctOption){result.textContent='Chính xác!';answered.push(current.id);setTimeout(()=>{overlay.classList.remove('show');video.play()},900)}else{result.textContent='Chưa đúng, em hãy xem lại đoạn video nhé.'}};
document.getElementById('rewatch').onclick=()=>{if(!current)return;overlay.classList.remove('show');video.currentTime=Math.max(0,current.time-10);video.play()};
</script>
</body>
</html>`;
    };

    const handleExportHtml5 = async () => {
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
        const videoName = `media/${safeFileName(title)}.${extension}`;
        const zip = new JSZip();
        zip.file('index.html', createExportHtml(videoName));
        zip.file(videoName, videoFile);
        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${safeFileName(title)}-html5.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
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

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600">
            {/* Sidebar */}
            <div className="w-64 bg-gradient-to-b from-purple-700 to-purple-800 p-6 flex flex-col gap-4 shadow-2xl">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Video size={24} /> Video Tương Tác
                    </h2>
                </div>

                {/* Navigation Buttons */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                    <Home size={20} />
                    Về trang chủ
                </button>

                <button
                    onClick={() => window.open('https://zalo.me/0975509490', '_blank')}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                    <HelpCircle size={20} />
                    Hướng dẫn sử dụng
                </button>

                <button
                    onClick={handleCreateNew}
                    className={`flex items-center gap-3 w-full px-4 py-3 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 ${currentView === 'CREATE_NEW'
                        ? 'bg-white text-purple-700'
                        : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                >
                    <Plus size={20} />
                    Tạo video mới
                </button>

                <button
                    onClick={() => {
                        resetForm();
                        setCurrentView('MY_VIDEOS');
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 ${currentView === 'MY_VIDEOS'
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                >
                    <BookOpen size={20} />
                    Video của tôi
                </button>
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
                                                    {q.options.map((opt, optIndex) => (
                                                        <div key={optIndex} className="relative flex items-center gap-2">
                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${q.correctOption === optIndex
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-gray-200 text-gray-600'
                                                                }`}>
                                                                {optionLabels[optIndex]}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => updateQuestion(q.id, `option.${optIndex}`, e.target.value)}
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
                                                            {q.options.length > 2 && (
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
                                                    {q.options.length < 4 && (
                                                        <button
                                                            onClick={() => addOption(q.id)}
                                                            className="w-full py-2 mt-2 text-sm font-medium text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-xl border border-dashed border-purple-300 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <Plus size={14} /> Thêm đáp án ({q.options.length}/4)
                                                        </button>
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
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Bảng điều khiển</h3>

                        {/* Allow Seeking Toggle */}
                        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
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

                        <div className="mb-6 rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <Palette size={20} className="text-purple-600" />
                                <h3 className="font-bold text-gray-800">Tùy chỉnh giao diện</h3>
                            </div>
                            <PlayerThemeCustomizer theme={playerTheme} onChange={setPlayerTheme} />
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 flex-1">
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                                <div className="mb-2 flex items-center gap-2 text-sm font-black text-indigo-900">
                                    <Download size={18} />
                                    Xuất file
                                </div>
                                <button
                                    onClick={handleExportHtml5}
                                    className="mb-2 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                >
                                    <Download size={18} />
                                    Tải HTML5 (.zip)
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button disabled className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-400 ring-1 ring-indigo-100">
                                        SCORM 1.2 sắp có
                                    </button>
                                    <button disabled className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-400 ring-1 ring-indigo-100">
                                        SCORM 2004 sắp có
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={addQuestion}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                                <Plus size={20} />
                                Thêm câu hỏi
                            </button>

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
