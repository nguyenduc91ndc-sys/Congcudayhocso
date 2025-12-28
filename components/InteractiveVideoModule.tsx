import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, Plus, Save, Play, Trash2, Home, HelpCircle, BookOpen,
    Clock, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, ExternalLink,
    Share2, Edit3, X, Copy, ArrowLeft
} from 'lucide-react';
import { VideoLesson, Question } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ReactPlayer from 'react-player/youtube';
import { cleanYouTubeUrl, isValidYouTubeUrl, extractStartTime } from '../utils/youtubeUtils';
import { createShareUrl, shortenUrl } from '../utils/shareUtils';

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
    };

    // Load lesson data when editing
    const loadLessonForEdit = (lesson: VideoLesson) => {
        setTitle(lesson.title);
        setUrl(lesson.youtubeUrl);
        setStartTime(lesson.startTime);
        setAllowSeeking(lesson.allowSeeking);
        setQuestions(lesson.questions);
        setUrlValid(true);
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

    const addQuestion = () => {
        const newQuestion: Question = {
            id: uuidv4(),
            time: 0,
            text: '',
            options: { A: '', B: '', C: '', D: '' },
            correctOption: 'A',
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (id: string, field: keyof Question | string, value: any) => {
        setQuestions(questions.map(q => {
            if (q.id === id) {
                if (field.startsWith('option.')) {
                    const optionKey = field.split('.')[1] as keyof typeof q.options;
                    return { ...q, options: { ...q.options, [optionKey]: value } };
                }
                return { ...q, [field]: value };
            }
            return q;
        }));
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleSave = () => {
        if (!title || !url) return alert('Vui lòng nhập tên bài và link YouTube');
        if (urlError) return alert('Video này bị chặn nhúng, vui lòng đổi video khác.');

        const lessonToSave: VideoLesson = {
            id: editingLesson?.id || uuidv4(),
            title,
            youtubeUrl: getCleanVideoUrl(url),
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
        if (!title || !url) return alert('Vui lòng nhập tên bài và link YouTube để xem thử');
        if (urlError) return alert('Video này bị chặn nhúng, vui lòng đổi video khác.');

        const previewLesson: VideoLesson = {
            id: 'preview',
            title,
            youtubeUrl: getCleanVideoUrl(url),
            startTime,
            allowSeeking,
            questions: questions.sort((a, b) => a.time - b.time),
            createdAt: Date.now(),
        };
        onPlay(previewLesson);
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
        if (isCopyingLink) return;
        setIsCopyingLink(lesson.id);

        try {
            const longUrl = createShareUrl(lesson);
            const shortUrl = await shortenUrl(longUrl);
            await navigator.clipboard.writeText(shortUrl);
            setCopiedId(lesson.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
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

                                                <a
                                                    href={lesson.youtubeUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 hover:underline"
                                                >
                                                    <ExternalLink size={14} className="mr-1" /> Xem video gốc
                                                </a>

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

                                            {/* YouTube Link */}
                                            <div>
                                                <label className="block text-gray-700 font-bold mb-2">Link YouTube</label>
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
                                    {url && (
                                        <div className="rounded-2xl overflow-hidden shadow-lg border-4 border-white aspect-video max-w-2xl mx-auto bg-black">
                                            {!urlError ? (
                                                <ReactPlayer
                                                    url={getCleanVideoUrl(url)}
                                                    width="100%"
                                                    height="100%"
                                                    controls={true}
                                                    light={true}
                                                    onError={() => setUrlError(true)}
                                                    config={{
                                                        playerVars: {
                                                            origin: window.location.origin,
                                                            modestbranding: 1
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-white bg-gray-900 text-center p-4">
                                                    <AlertCircle size={32} className="text-red-400 mb-2" />
                                                    <span className="text-sm font-medium mb-2">Video này bị chủ sở hữu chặn nhúng.</span>
                                                    <a
                                                        href={getCleanVideoUrl(url)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg flex items-center gap-1"
                                                    >
                                                        <ExternalLink size={12} /> Kiểm tra trên YouTube
                                                    </a>
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

                                                {/* Options */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['A', 'B', 'C', 'D'].map((opt) => (
                                                        <div key={opt} className="relative flex items-center">
                                                            <span className={`absolute left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${q.correctOption === opt
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-gray-200 text-gray-600'
                                                                }`}>
                                                                {opt}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={q.options[opt as keyof typeof q.options]}
                                                                onChange={(e) => updateQuestion(q.id, `option.${opt}`, e.target.value)}
                                                                className={`w-full pl-11 pr-8 p-2 text-sm rounded-xl border transition-colors ${q.correctOption === opt
                                                                    ? 'border-green-400 bg-green-50'
                                                                    : 'border-gray-200 bg-white focus:border-purple-400'
                                                                    }`}
                                                                placeholder={`Đáp án ${opt}`}
                                                            />
                                                            <input
                                                                type="radio"
                                                                name={`correct-${q.id}`}
                                                                checked={q.correctOption === opt}
                                                                onChange={() => updateQuestion(q.id, 'correctOption', opt)}
                                                                className="absolute right-3 h-4 w-4 accent-green-500 cursor-pointer"
                                                                title="Chọn làm đáp án đúng"
                                                            />
                                                        </div>
                                                    ))}
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
                    <div className="w-72 bg-white border-l border-gray-200 p-6 flex flex-col">
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

                        {/* Action Buttons */}
                        <div className="space-y-3 flex-1">
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
                                <a
                                    href={savedLesson.youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                >
                                    Xem video gốc
                                </a>
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
                                        if (isCopyingLink) return;
                                        setIsCopyingLink(savedLesson.id);
                                        try {
                                            const longUrl = createShareUrl(savedLesson);
                                            const shortUrl = await shortenUrl(longUrl);
                                            await navigator.clipboard.writeText(shortUrl);
                                            setCopiedId(savedLesson.id);
                                            setTimeout(() => setCopiedId(null), 3000);
                                        } catch (error) {
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
