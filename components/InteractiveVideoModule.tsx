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
    const [controlPanel, setControlPanel] = useState<'export' | 'design' | 'actions'>('export');

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
        const logoMarkup = playerTheme.logoImage
            ? `<img src="${playerTheme.logoImage}" alt="Logo">`
            : escapeHtml(playerTheme.logoText || 'GV');
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
<title>${exportTitle}</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:${playerTheme.fontFamily},Arial,sans-serif;background:radial-gradient(circle at 10% 0%,${playerTheme.primaryColor}22,transparent 32%),#0b1120;color:#e5edf8;min-height:100vh}.app{width:min(1640px,100%);margin:0 auto;padding:8px 14px 16px}.shell{border:1px solid rgba(148,163,184,.18);border-radius:${Math.max(16, playerTheme.radius)}px;background:#101827;box-shadow:0 24px 80px rgba(0,0,0,.38);overflow:hidden}.topbar{height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid rgba(148,163,184,.14);font-size:13px;font-weight:900;letter-spacing:.04em;color:#aeb8c9;text-transform:uppercase}.stats{display:flex;align-items:center;gap:14px;color:#fff}.layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;min-height:calc(100vh - 86px)}.main{padding:14px 14px 8px}.player{border:1px solid rgba(148,163,184,.22);border-radius:${playerTheme.radius}px;background:#030712;overflow:hidden}.stage{position:relative;aspect-ratio:16/9;background:#020617}video{width:100%;height:100%;object-fit:contain;background:#000}.brand{position:absolute;left:18px;top:18px;display:flex;align-items:center;gap:10px;max-width:70%;border-radius:999px;background:rgba(2,6,23,.55);padding:8px 13px;font-weight:900;color:#fff;backdrop-filter:blur(8px);pointer-events:none}.logo{display:inline-grid;place-items:center;overflow:hidden;min-width:32px;width:32px;height:32px;border-radius:999px;background:${playerTheme.primaryColor};font-size:12px}.logo img,.school-logo img{width:100%;height:100%;object-fit:contain}.badge{position:absolute;right:18px;top:18px;border-radius:999px;background:rgba(2,6,23,.55);padding:9px 14px;font-weight:900;color:#fff;backdrop-filter:blur(8px);pointer-events:none}.foot{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;gap:18px;padding:18px 24px;background:linear-gradient(to top,rgba(0,0,0,.82),transparent);font-weight:900;color:#fff}.overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:linear-gradient(135deg,${playerTheme.backgroundColor}dd,${playerTheme.primaryColor}cc,${playerTheme.secondaryColor}aa)}.overlay.show{display:flex}.card{width:min(570px,96%);border:1px solid rgba(255,255,255,.18);border-radius:${Math.max(16, playerTheme.radius)}px;padding:24px;background:${playerTheme.questionStyle === 'card' ? playerTheme.surfaceColor : 'rgba(15,23,42,.88)'};color:${playerTheme.questionStyle === 'card' ? playerTheme.textColor : '#fff'};box-shadow:0 24px 80px rgba(0,0,0,.42)}.qtitle{text-align:center;font-size:24px;font-weight:950;margin:0 0 18px}.option{width:100%;border:0;border-radius:999px;background:#fff;color:#1f2937;padding:13px 16px;margin:8px 0;text-align:left;font-weight:900;cursor:pointer}.option.selected{outline:3px solid ${playerTheme.accentColor}}.actions{display:flex;gap:10px;margin-top:16px}.actions button{flex:1;border:0;border-radius:999px;padding:13px 16px;color:#fff;font-weight:950;cursor:pointer}.primary{background:linear-gradient(90deg,${playerTheme.primaryColor},${playerTheme.secondaryColor})}.secondary{background:#0ea5e9}.result{min-height:24px;text-align:center;font-weight:950;margin-top:12px}.controls{height:54px;display:flex;align-items:center;gap:8px;padding:0 16px;background:#070d1d;border-top:1px solid rgba(148,163,184,.14)}.ctrl{width:32px;height:32px;border:0;border-radius:7px;background:#475569;color:#fff;font-weight:950;cursor:pointer}.ctrl:hover{background:${playerTheme.primaryColor}}.page{font-weight:950;color:#fff;margin-left:10px}.progress{flex:1;height:4px;accent-color:${playerTheme.primaryColor}}.time{font-size:12px;font-weight:900;color:#cbd5e1}.side{border-left:1px solid rgba(148,163,184,.14);background:#0e1628;padding:28px 26px}.school-logo{width:86px;height:86px;border-radius:999px;margin:0 auto 34px;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle,#fff 0 40%,${playerTheme.primaryColor} 42% 65%,#fff 67%);color:${playerTheme.primaryColor};font-weight:950}.profile{display:flex;align-items:center;gap:13px;margin-bottom:14px}.avatar{width:58px;height:58px;border-radius:14px;display:grid;place-items:center;background:#fff;color:${playerTheme.primaryColor};font-weight:950;border:3px solid rgba(255,255,255,.25)}.name{font-weight:950;color:#fff}.role{font-size:13px;color:#cbd5e1}.info{width:100%;border:1px solid rgba(255,255,255,.16);border-radius:4px;background:#334155;color:#fff;padding:9px;font-weight:900}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:28px 0 12px}.tab{background:#1f2937;color:#94a3b8;padding:10px;text-align:center;font-weight:900;font-size:13px}.tab.active{background:#334155;color:#fff}.search{width:100%;background:#050b16;border:0;color:#fff;padding:12px;margin-bottom:22px}.section-title{font-size:13px;font-weight:950;color:#fff;margin:0 0 12px;text-transform:uppercase}.qlist{display:flex;flex-direction:column;gap:8px}.qitem{border:1px solid rgba(148,163,184,.16);border-radius:20px;padding:13px 16px;background:#111a2e;color:#cbd5e1;font-weight:800;display:flex;justify-content:space-between;align-items:center}.qnum{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:999px;background:#1f2937;color:#94a3b8;margin-right:8px}.guide{display:none;color:#cbd5e1;line-height:1.55;font-size:14px}.side.show-guide .qlist,.side.show-guide .search,.side.show-guide .section-title{display:none}.side.show-guide .guide{display:block}@media(max-width:980px){.layout{grid-template-columns:1fr}.side{border-left:0;border-top:1px solid rgba(148,163,184,.14)}.app{padding:0}.shell{border-radius:0}.badge{display:none}}@media(max-width:700px){.topbar{padding:0 14px}.main{padding:8px}.brand{font-size:12px}.foot{font-size:12px}.qtitle{font-size:19px}.controls{gap:5px;padding:0 8px}.time{display:none}}
</style>
</head>
<body>
<div class="app"><main class="shell"><div class="topbar"><span>Video bài giảng tương tác</span><div class="stats"><span>★ <b id="score">0</b></span><span>${escapeHtml(playerTheme.logoText || 'GV')}</span></div></div><div class="layout"><section class="main"><div class="player"><div class="stage"><video id="video" src="${videoFileName}" playsinline></video><div class="brand"><span class="logo">${logoMarkup}</span><span>${escapeHtml(playerTheme.publishTitle || title)}</span></div><div class="badge">${escapeHtml(playerTheme.publishSubtitle || '')}</div><div class="foot"><span>${escapeHtml(playerTheme.footerLeftText || 'Giáo viên yêu công nghệ')}</span><span>${escapeHtml(playerTheme.footerRightText || '')}</span></div><div id="overlay" class="overlay"><div class="card"><h2 id="qtext" class="qtitle"></h2><div id="opts"></div><div class="actions"><button class="primary" id="answer">Trả lời ngay</button><button class="secondary" id="rewatch">Xem lại</button></div><div id="result" class="result"></div></div></div></div><div class="controls"><button class="ctrl" id="back">≪</button><button class="ctrl" id="play">▶</button><button class="ctrl" id="next">≫</button><button class="ctrl" id="restart">↻</button><span class="page">1 / 1</span><input class="progress" id="progress" type="range" min="0" value="0" step="0.1"><span class="time"><b id="now">00:00</b> / <b id="dur">00:00</b></span><button class="ctrl" id="full">⛶</button></div></div></section><aside class="side" id="side"><div class="school-logo">${logoMarkup}</div>${playerTheme.showAuthorPanel ? `<div class="profile"><div class="avatar">${escapeHtml((playerTheme.authorName || 'GV').slice(0, 2).toUpperCase())}</div><div><div class="name">${authorName}</div><div class="role">${authorInfo}</div></div></div><button class="info" id="authorInfo">Hiện thông tin</button>` : ''}<div class="tabs"><button class="tab active" id="menuTab">Mục lục</button><button class="tab" id="guideTab">Hướng dẫn</button></div><input class="search" id="searchBox" placeholder="Tìm kiếm"><h3 class="section-title">Trang 1</h3><div class="qlist" id="qlist"></div><div class="guide">${guideText}</div></aside></div></main></div>
<script>
const data=${JSON.stringify(exportData)};
const video=document.getElementById('video'),overlay=document.getElementById('overlay'),qtext=document.getElementById('qtext'),opts=document.getElementById('opts'),result=document.getElementById('result'),progress=document.getElementById('progress'),now=document.getElementById('now'),dur=document.getElementById('dur'),play=document.getElementById('play'),score=document.getElementById('score'),menuTab=document.getElementById('menuTab'),guideTab=document.getElementById('guideTab'),side=document.getElementById('side'),qlist=document.getElementById('qlist'),searchBox=document.getElementById('searchBox');
let current=null,selected=null,answered=[];
const fmt=s=>{s=Math.max(0,Math.floor(s||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
let audioCtx=null;
const getAudioCtx=()=>{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx};
const playTone=(freq,start,duration,type='sine',volume=.25)=>{try{const ctx=getAudioCtx(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(0,ctx.currentTime+start);gain.gain.linearRampToValueAtTime(volume,ctx.currentTime+start+.03);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+start+duration);osc.start(ctx.currentTime+start);osc.stop(ctx.currentTime+start+duration+.05)}catch(e){}};
const playCorrectSound=()=>{[523.25,659.25,783.99,1046.5].forEach((f,i)=>playTone(f,i*.1,.45,'sine',i===3 ? .22 : .28))};
const playIncorrectSound=()=>{[392,311.13,233.08].forEach((f,i)=>playTone(f,i*.13,.32,'sawtooth',.24));playTone(150,.45,.45,'square',.14)};
const renderList=(filter='')=>{qlist.innerHTML=data.questions.map((q,i)=>({q,i})).filter(({q,i})=>('câu '+(i+1)+' '+q.text).toLowerCase().includes(filter.toLowerCase())).map(({q,i})=>'<div class="qitem" data-time="'+q.time+'"><span><span class="qnum">'+(i+1)+'</span>Câu '+(i+1)+'</span><small>'+fmt(q.time)+'</small></div>').join('')};
renderList();
video.currentTime=data.startTime||0;
video.addEventListener('loadedmetadata',()=>{progress.max=video.duration||0;dur.textContent=fmt(video.duration)});
video.addEventListener('play',()=>play.textContent='❚❚');
video.addEventListener('pause',()=>play.textContent='▶');
video.addEventListener('timeupdate',()=>{progress.value=video.currentTime;now.textContent=fmt(video.currentTime);
const q=data.questions.find(x=>Math.abs(x.time-video.currentTime)<.7&&!answered.includes(x.id));if(q){current=q;selected=null;video.pause();qtext.textContent=q.text;result.textContent='';opts.innerHTML='';q.options.forEach((o,i)=>{const b=document.createElement('button');b.className='option';b.textContent=String.fromCharCode(65+i)+'. '+o;b.onclick=()=>{selected=i;document.querySelectorAll('.option').forEach(el=>el.classList.remove('selected'));b.classList.add('selected')};opts.appendChild(b)});overlay.classList.add('show')}});
play.onclick=()=>video.paused?video.play():video.pause();
progress.oninput=()=>{if(data.allowSeeking)video.currentTime=Number(progress.value)};
searchBox.oninput=()=>renderList(searchBox.value);
qlist.onclick=e=>{const item=e.target.closest('.qitem');if(item&&data.allowSeeking){video.currentTime=Number(item.dataset.time)||0;video.play()}};
document.getElementById('restart').onclick=()=>{video.currentTime=data.startTime||0;answered=[];score.textContent='0';video.play()};
document.getElementById('back').onclick=()=>{video.currentTime=Math.max(0,video.currentTime-10)};
document.getElementById('next').onclick=()=>{if(data.allowSeeking)video.currentTime=Math.min(video.duration||0,video.currentTime+10)};
document.getElementById('full').onclick=()=>document.querySelector('.shell').requestFullscreen&&document.querySelector('.shell').requestFullscreen();
menuTab.onclick=()=>{side.classList.remove('show-guide');menuTab.classList.add('active');guideTab.classList.remove('active')};
guideTab.onclick=()=>{side.classList.add('show-guide');guideTab.classList.add('active');menuTab.classList.remove('active')};
const authorInfo=document.getElementById('authorInfo');if(authorInfo){authorInfo.onclick=()=>alert('${authorName.replace(/'/g, "\\'")}\\n${escapeHtml(playerTheme.authorInfo || '').replace(/\n/g, '\\n').replace(/'/g, "\\'")}')};
document.getElementById('answer').onclick=()=>{if(!current||selected===null)return;if(selected===current.correctOption){playCorrectSound();result.textContent='Ch\\u00ednh x\\u00e1c!';answered.push(current.id);score.textContent=answered.length;setTimeout(()=>{overlay.classList.remove('show');video.play()},900)}else{playIncorrectSound();result.textContent='Ch\\u01b0a \\u0111\\u00fang, em h\\u00e3y xem l\\u1ea1i \\u0111o\\u1ea1n video nh\\u00e9.'}};
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

                        <div className="space-y-3 flex-1">
                            <button
                                type="button"
                                onClick={() => setControlPanel(controlPanel === 'export' ? 'actions' : 'export')}
                                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${controlPanel === 'export' ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <span className="flex items-center gap-2 text-sm font-black"><Download size={18} /> Xuất file</span>
                                <ChevronDown size={18} className={`transition ${controlPanel === 'export' ? 'rotate-180' : ''}`} />
                            </button>
                            {controlPanel === 'export' && (
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
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
                            )}

                            <button
                                type="button"
                                onClick={() => setControlPanel(controlPanel === 'design' ? 'actions' : 'design')}
                                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${controlPanel === 'design' ? 'border-purple-200 bg-purple-50 text-purple-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <span className="flex items-center gap-2 text-sm font-black"><Palette size={18} /> Tùy chỉnh giao diện</span>
                                <ChevronDown size={18} className={`transition ${controlPanel === 'design' ? 'rotate-180' : ''}`} />
                            </button>
                            {controlPanel === 'design' && (
                                <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
                                    <PlayerThemeCustomizer theme={playerTheme} onChange={setPlayerTheme} />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setControlPanel('actions')}
                                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${controlPanel === 'actions' ? 'border-orange-200 bg-orange-50 text-orange-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                <span className="flex items-center gap-2 text-sm font-black"><Play size={18} /> Thao tác nhanh</span>
                                <ChevronDown size={18} className={`transition ${controlPanel === 'actions' ? 'rotate-180' : ''}`} />
                            </button>
                            {controlPanel === 'actions' && (
                                <div className="space-y-3 rounded-2xl border border-orange-100 bg-orange-50 p-3">
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
                            )}
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
