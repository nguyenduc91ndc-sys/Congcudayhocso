import React, { useState, useEffect } from 'react';
import { VideoLesson, Question } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Play, Plus, Trash2, Clock, Settings, ArrowLeft, AlertCircle, ExternalLink, CheckCircle2, ChevronUp, ChevronDown, Share2, X, Home, Edit3, Copy } from 'lucide-react';
import ReactPlayer from 'react-player/youtube';
import { cleanYouTubeUrl, isValidYouTubeUrl, extractStartTime, getYouTubeThumbnailUrl } from '../utils/youtubeUtils';
import { createShareUrl, shortenUrl } from '../utils/shareUtils';

interface VideoEditorProps {
  lesson?: VideoLesson | null;
  onSave: (lesson: VideoLesson) => void;
  onCancel: () => void;
  onPreview: (lesson: VideoLesson) => void;
}

const VideoEditor: React.FC<VideoEditorProps> = ({ lesson, onSave, onCancel, onPreview }) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [allowSeeking, setAllowSeeking] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [urlError, setUrlError] = useState<boolean>(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSavedCard, setShowSavedCard] = useState(false);
  const [savedLesson, setSavedLesson] = useState<VideoLesson | null>(null);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Load dữ liệu lesson khi edit hoặc quay lại từ preview
  useEffect(() => {
    if (lesson) {
      // Load dữ liệu từ lesson (cả khi edit và khi quay lại từ preview)
      setTitle(lesson.title);
      setUrl(lesson.youtubeUrl);
      setStartTime(lesson.startTime);
      setAllowSeeking(lesson.allowSeeking);
      setQuestions(lesson.questions);
      setUrlValid(true);

      // Chỉ set editingId nếu KHÔNG phải preview (để khi save sẽ giữ ID cũ)
      if (lesson.id !== 'preview') {
        setEditingId(lesson.id);
      }
      // Nếu là preview, giữ editingId cũ (hoặc null nếu tạo mới)
    } else {
      // Reset form khi tạo mới (lesson = null)
      setTitle('');
      setUrl('');
      setStartTime(0);
      setAllowSeeking(false);
      setQuestions([]);
      setUrlValid(null);
      setEditingId(null);
    }
  }, [lesson]);

  // Sử dụng hàm utility để làm sạch URL
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

    const newId = editingId || uuidv4();
    const lessonToSave: VideoLesson = {
      id: newId,
      title,
      youtubeUrl: getCleanVideoUrl(url),
      startTime,
      allowSeeking,
      questions: questions.sort((a, b) => a.time - b.time),
      createdAt: editingId && lesson ? lesson.createdAt : Date.now(),
    };

    // Cập nhật editingId để lần save tiếp theo là update
    setEditingId(newId);

    // Lưu và hiển thị thẻ video đã lưu
    onSave(lessonToSave);
    setSavedLesson(lessonToSave);
    setShowSavedCard(true);
    setLinkCopied(false);
  };

  const handlePreview = () => {
    if (!title || !url) return alert('Vui lòng nhập tên bài và link YouTube để xem thử');
    if (urlError) return alert('Video này bị chặn nhúng, vui lòng đổi video khác.');

    const lesson: VideoLesson = {
      id: 'preview',
      title,
      youtubeUrl: getCleanVideoUrl(url),
      startTime,
      allowSeeking,
      questions: questions.sort((a, b) => a.time - b.time),
      createdAt: Date.now(),
    };
    onPreview(lesson);
  }

  // Helper to convert MM:SS to seconds
  const parseTime = (input: string) => {
    const parts = input.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  // Helper to convert seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputUrl = e.target.value;
    setUrl(inputUrl);
    setUrlError(false);

    // Kiểm tra URL hợp lệ và hiển thị feedback
    if (inputUrl.trim()) {
      const valid = isValidYouTubeUrl(inputUrl);
      setUrlValid(valid);

      // Tự động trích xuất thời gian bắt đầu từ URL nếu có
      if (valid && startTime === 0) {
        const extractedTime = extractStartTime(inputUrl);
        if (extractedTime > 0) {
          setStartTime(extractedTime);
        }
      }
    } else {
      setUrlValid(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden font-nunito">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors text-purple-700">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white drop-shadow-md">
            {editingId ? '✏️ Chỉnh sửa video' : '🎬 Tạo video tương tác mới'}
          </h2>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handlePreview}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-400 hover:bg-blue-500 text-white font-bold py-2 px-3 sm:px-4 rounded-xl shadow-lg transition-transform hover:scale-105 text-sm sm:text-base"
          >
            <Play size={18} /> <span className="hidden sm:inline">Xem thử</span><span className="sm:hidden">Xem</span>
          </button>
          <button
            onClick={handleSave}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-400 hover:bg-green-500 text-white font-bold py-2 px-3 sm:px-4 rounded-xl shadow-lg transition-transform hover:scale-105 text-sm sm:text-base"
          >
            <Save size={18} /> <span className="hidden sm:inline">Lưu bài giảng</span><span className="sm:hidden">Lưu</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 md:gap-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* Card 1: Basic Info */}
          <div className="bg-white/40 backdrop-blur-md rounded-[20px] sm:rounded-[32px] p-4 sm:p-6 md:p-8 shadow-lg border border-white/50">
            <h3 className="text-xl font-bold text-purple-900 mb-6 flex items-center gap-2">
              <Settings size={24} /> Thông tin cơ bản
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-purple-800 font-bold mb-2">Tên video</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-4 rounded-2xl border-2 border-purple-100 focus:border-purple-400 focus:outline-none bg-white/80 transition-colors shadow-sm"
                  placeholder="Ví dụ: Video AI 'Con Rồng cháu Tiên'"
                />
              </div>
              <div>
                <label className="block text-purple-800 font-bold mb-2">Link YouTube</label>
                <div className="relative">
                  <input
                    type="text"
                    value={url}
                    onChange={handleUrlChange}
                    className={`w-full p-4 pr-12 rounded-2xl border-2 focus:outline-none bg-white/80 shadow-sm transition-colors ${urlError ? 'border-red-400' :
                      urlValid === true ? 'border-green-400' :
                        urlValid === false ? 'border-orange-400' :
                          'border-purple-100 focus:border-purple-400'
                      }`}
                    placeholder="Dán bất kỳ link YouTube nào (youtube.com, youtu.be, shorts...)"
                  />
                  {urlValid === true && (
                    <CheckCircle2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                  )}
                </div>
                {urlError && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1 font-bold">
                    <AlertCircle size={16} /> Video này chặn nhúng, vui lòng chọn video khác.
                  </p>
                )}
                {urlValid === false && !urlError && (
                  <p className="text-orange-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle size={16} /> Link YouTube không hợp lệ. Hãy kiểm tra lại.
                  </p>
                )}
                {urlValid === true && (
                  <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
                    <CheckCircle2 size={16} /> Link hợp lệ! Hệ thống đã tự động làm sạch URL.
                  </p>
                )}
              </div>
              {/* Video Preview Small */}
              {url && (
                <div className="rounded-2xl overflow-hidden shadow-md border-4 border-white mt-4 aspect-video relative bg-black">
                  {!urlError ? (
                    <ReactPlayer
                      url={getCleanVideoUrl(url)}
                      width="100%"
                      height="100%"
                      controls={true}
                      light={true}
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
            </div>
          </div>

          {/* Card 2: Settings */}
          <div className="bg-white/40 backdrop-blur-md rounded-[32px] p-8 shadow-lg border border-white/50">
            <div className="flex flex-wrap gap-8">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-purple-800 font-bold mb-2">Bắt đầu video từ (giây)</label>
                <input
                  type="number"
                  value={startTime}
                  onChange={(e) => setStartTime(Number(e.target.value))}
                  className="w-full p-4 rounded-2xl border-2 border-purple-100 bg-white/80 focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-4 bg-white/50 p-4 rounded-2xl">
                <label className="text-purple-800 font-bold text-lg">Cho phép tua video?</label>
                <div
                  className={`w-20 h-10 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shadow-lg ${allowSeeking
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : 'bg-gradient-to-r from-red-400 to-rose-500'
                    }`}
                  onClick={() => setAllowSeeking(!allowSeeking)}
                >
                  <div className={`bg-white w-8 h-8 rounded-full shadow-md transform duration-300 flex items-center justify-center font-bold text-xs ${allowSeeking ? 'translate-x-10 text-green-600' : 'translate-x-0 text-red-500'
                    }`}>
                    {allowSeeking ? 'ON' : 'OFF'}
                  </div>
                </div>
                <span className={`text-sm font-bold ${allowSeeking ? 'text-green-600' : 'text-red-500'}`}>
                  {allowSeeking ? '✓ Được tua' : '✕ Chặn tua'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Questions */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white/40 backdrop-blur-md rounded-[20px] sm:rounded-[32px] shadow-lg border border-white/50 overflow-hidden max-h-[50vh] lg:max-h-none">
          <div className="p-6 bg-purple-100/50 border-b border-white/50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-purple-900">Danh sách câu hỏi</h3>
            <button
              onClick={addQuestion}
              className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
            >
              <Plus size={28} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <AnimatePresence>
              {questions.length === 0 && (
                <div className="text-center text-purple-800/60 mt-10 p-4">
                  <div className="bg-white/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Plus size={32} className="text-purple-400" />
                  </div>
                  <p className="font-bold text-lg">Chưa có câu hỏi nào</p>
                  <p className="text-sm mt-1">Nhấn dấu + ở góc phải để thêm câu hỏi trắc nghiệm</p>
                </div>
              )}
              {questions.map((q, index) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white/80 rounded-[24px] p-5 shadow-sm border border-purple-100 relative group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-lg text-sm">Câu {index + 1}</span>
                    <button onClick={() => removeQuestion(q.id)} className="text-red-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-purple-500" />
                      <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Thời gian (Phút:Giây)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Phút */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => updateQuestion(q.id, 'time', Math.min(59 * 60 + 59, q.time + 60))}
                          className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <ChevronUp size={18} className="text-purple-600" />
                        </button>
                        <span className="font-mono text-lg font-bold text-purple-800 w-8 text-center">
                          {String(Math.floor(q.time / 60)).padStart(2, '0')}
                        </span>
                        <button
                          onClick={() => updateQuestion(q.id, 'time', Math.max(0, q.time - 60))}
                          className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <ChevronDown size={18} className="text-purple-600" />
                        </button>
                        <span className="text-[10px] text-purple-500">phút</span>
                      </div>
                      <span className="font-mono text-xl font-bold text-purple-800">:</span>
                      {/* Giây */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => updateQuestion(q.id, 'time', q.time + 1)}
                          className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <ChevronUp size={18} className="text-purple-600" />
                        </button>
                        <span className="font-mono text-lg font-bold text-purple-800 w-8 text-center">
                          {String(q.time % 60).padStart(2, '0')}
                        </span>
                        <button
                          onClick={() => updateQuestion(q.id, 'time', Math.max(0, q.time - 1))}
                          className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <ChevronDown size={18} className="text-purple-600" />
                        </button>
                        <span className="text-[10px] text-purple-500">giây</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                      className="w-full p-3 text-sm rounded-xl border border-purple-200 bg-white mb-2 font-bold text-gray-800 placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                      placeholder="Nhập nội dung câu hỏi..."
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <div key={opt} className="relative flex items-center">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${q.correctOption === opt ? 'bg-green-500 text-white' : 'bg-purple-100 text-purple-600'}`}>
                          {opt}
                        </span>
                        <input
                          type="text"
                          value={q.options[opt as keyof typeof q.options]}
                          onChange={(e) => updateQuestion(q.id, `option.${opt}`, e.target.value)}
                          className={`w-full pl-11 pr-8 p-2 text-sm rounded-xl border transition-colors ${q.correctOption === opt ? 'border-green-400 bg-green-50' : 'border-purple-100 bg-white focus:border-purple-400'}`}
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
            </AnimatePresence>
          </div>
        </div>
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
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Success Header */}
              <div className="flex items-center justify-center gap-2 mb-5 py-3 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 size={24} className="text-green-500" />
                <h3 className="text-lg font-bold text-green-700">Đã lưu video thành công!</h3>
              </div>

              {/* Video Info - Style giống VideoItem */}
              <div className="mb-4">
                {/* Title và Badge */}
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xl font-bold text-slate-800 truncate pr-4 flex-1 flex items-center gap-2">
                    <span className="text-purple-600">📹</span> {savedLesson.title}
                  </h4>
                  <span className="flex-shrink-0 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow-sm">
                    {savedLesson.questions.length} câu hỏi
                  </span>
                </div>

                {/* Date */}
                <p className="text-slate-500 text-sm mb-2">
                  Cập nhật: {new Date(savedLesson.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>

                {/* View Original Link */}
                <a
                  href={savedLesson.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                >
                  Xem video gốc
                </a>
              </div>

              {/* Action Buttons Grid - Style giống VideoItem */}
              <div className="grid grid-cols-2 gap-3">
                {/* Xem */}
                <button
                  onClick={() => {
                    setShowSavedCard(false);
                    onPreview(savedLesson);
                  }}
                  className="py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play size={16} /> Xem
                </button>

                {/* Chỉnh sửa */}
                <button
                  onClick={() => setShowSavedCard(false)}
                  className="py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Edit3 size={16} /> Chỉnh sửa
                </button>

                {/* Sao chép link */}
                <button
                  onClick={async () => {
                    if (isCopyingLink) return;
                    setIsCopyingLink(true);
                    try {
                      const longUrl = createShareUrl(savedLesson);
                      const shortUrl = await shortenUrl(longUrl);
                      await navigator.clipboard.writeText(shortUrl);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 3000);
                    } catch (error) {
                      const longUrl = createShareUrl(savedLesson);
                      await navigator.clipboard.writeText(longUrl);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 3000);
                    } finally {
                      setIsCopyingLink(false);
                    }
                  }}
                  disabled={isCopyingLink}
                  className={`py-3 px-4 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait ${linkCopied
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
                    }`}
                >
                  {isCopyingLink ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : linkCopied ? (
                    <><CheckCircle2 size={16} /> Đã sao chép!</>
                  ) : (
                    <><Share2 size={16} /> Sao chép link</>
                  )}
                </button>

                {/* Đóng / Trang chủ */}
                <button
                  onClick={() => {
                    setShowSavedCard(false);
                    onCancel();
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
    </div>
  );
};

export default VideoEditor;