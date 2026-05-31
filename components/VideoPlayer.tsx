import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactPlayer from 'react-player';
import { VideoLesson, Question, migrateVideoLesson, normalizeVideoPlayerTheme } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ArrowLeft, CheckCircle, XCircle, AlertTriangle, ExternalLink, RefreshCw, Star, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cleanYouTubeUrl } from '../utils/youtubeUtils';
import { playCorrectSound, playIncorrectSound, playNotificationSound, playMustRewatchSound, playVictorySound } from '../utils/soundUtils';
import RotateScreenHint from './RotateScreenHint';
import { getLocalVideoFile } from '../utils/localVideoStore';

interface VideoPlayerProps {
  lesson: VideoLesson;
  onBack: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ lesson, onBack }) => {
  const [playing, setPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [maxPlayed, setMaxPlayed] = useState(0);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [mustRewatch, setMustRewatch] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [localVideoMissing, setLocalVideoMissing] = useState(false);
  const [showStartGate, setShowStartGate] = useState(true);
  const [learnerName, setLearnerName] = useState('');
  const [learnerAvatar, setLearnerAvatar] = useState('👦');

  const playerRef = useRef<ReactPlayer>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Sử dụng hàm utility để làm sạch URL YouTube
  const getCleanVideoUrl = (url: string): string => {
    return cleanYouTubeUrl(url) || url;
  };

  const theme = normalizeVideoPlayerTheme(lesson.playerTheme);
  const cleanUrl = getCleanVideoUrl(lesson.youtubeUrl);
  const isLocalVideo = lesson.videoSource === 'local';

  // Migration: chuyển đổi lesson cũ sang format mới
  const migratedLesson = useMemo(() => migrateVideoLesson(lesson), [lesson]);

  // Nhãn đáp án (A, B, C, D)
  const optionLabels = ['A', 'B', 'C', 'D'];
  const avatarOptions = [
    { icon: '👦', label: 'Bé trai' },
    { icon: '👧', label: 'Bé gái' },
    { icon: '🤖', label: 'Rô bốt' },
    { icon: '🦸‍♂️', label: 'Siêu nhân nam' },
    { icon: '🦸‍♀️', label: 'Siêu nhân nữ' },
    { icon: '👨‍🚀', label: 'Phi hành gia' },
  ];

  useEffect(() => {
    let cancelled = false;

    const releaseObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    const loadPlaybackUrl = async () => {
      setLocalVideoMissing(false);
      setVideoError(false);
      releaseObjectUrl();

      if (!isLocalVideo) {
        setPlaybackUrl(cleanUrl);
        return;
      }

      if (lesson.id === 'preview' && lesson.localVideoObjectUrl) {
        setPlaybackUrl(lesson.localVideoObjectUrl);
        return;
      }

      try {
        const file = await getLocalVideoFile(lesson.id);
        if (cancelled) return;

        if (file) {
          const objectUrl = URL.createObjectURL(file);
          objectUrlRef.current = objectUrl;
          setPlaybackUrl(objectUrl);
          return;
        }

        if (lesson.localVideoObjectUrl) {
          setPlaybackUrl(lesson.localVideoObjectUrl);
          return;
        }

        if (!file) {
          setLocalVideoMissing(true);
          setVideoError(true);
          return;
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Cannot load local video:', error);
          if (lesson.localVideoObjectUrl) {
            setPlaybackUrl(lesson.localVideoObjectUrl);
            return;
          }
          setLocalVideoMissing(true);
          setVideoError(true);
        }
      }
    };

    loadPlaybackUrl();

    return () => {
      cancelled = true;
      releaseObjectUrl();
    };
  }, [cleanUrl, isLocalVideo, lesson.id, lesson.localVideoObjectUrl]);

  // Khởi tạo thời gian bắt đầu
  useEffect(() => {
    if (lesson.startTime > 0 && playerRef.current && !videoError) {
      playerRef.current.seekTo(lesson.startTime);
    }
    setMaxPlayed(lesson.startTime);
  }, [lesson.startTime, videoError]);

  const handleProgress = (state: { playedSeconds: number }) => {
    setPlayedSeconds(state.playedSeconds);

    // Chặn tua video nếu không cho phép
    if (!lesson.allowSeeking && state.playedSeconds > maxPlayed + 2) {
      playerRef.current?.seekTo(maxPlayed);
    } else {
      if (state.playedSeconds > maxPlayed) {
        setMaxPlayed(state.playedSeconds);
      }
    }

    // Kiểm tra câu hỏi đến giờ xuất hiện
    const question = migratedLesson.questions.find(
      (q) =>
        Math.abs(q.time - state.playedSeconds) < 1 &&
        !answeredQuestions.includes(q.id)
    );

    if (question) {
      setPlaying(false);
      setCurrentQuestion(question);
    }
  };

  const handleAnswer = () => {
    if (selectedOption === null || !currentQuestion) return;

    if (selectedOption === currentQuestion.correctOption) {
      setFeedback('correct');
      playCorrectSound();
      setShowCongrats(false);
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.58 },
        colors: [theme.primaryColor, theme.secondaryColor, theme.accentColor, '#22c55e', '#fbbf24']
      });
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { x: 0.32, y: 0.62 },
          colors: [theme.primaryColor, theme.secondaryColor, '#ffffff']
        });
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { x: 0.68, y: 0.62 },
          colors: [theme.accentColor, '#22c55e', '#ffffff']
        });
      }, 180);

      setTimeout(() => {
        const nextAnswered = [...answeredQuestions, currentQuestion.id];
        setAnsweredQuestions(nextAnswered);
        setFeedback(null);
        setCurrentQuestion(null);
        setSelectedOption(null);
        setWrongAttempts(0);
        if (nextAnswered.length >= migratedLesson.questions.length) {
          setPlaying(false);
          setShowFinalResult(true);
          playVictorySound();
          confetti({
            particleCount: 220,
            spread: 120,
            origin: { y: 0.55 },
            colors: ['#10b981', '#34d399', '#fbbf24', '#ec4899', '#8b5cf6']
          });
        } else {
          setPlaying(true);
        }
      }, 900);
    } else {
      setFeedback('incorrect');
      playIncorrectSound();
      setWrongAttempts(prev => prev + 1);

      if (wrongAttempts >= 1) {
        setTimeout(() => {
          setFeedback(null);
          setMustRewatch(true);
          playMustRewatchSound(); // Phát âm thanh "phải xem lại"
        }, 1500);
      } else {
        setTimeout(() => setFeedback(null), 1500);
      }
    }
  };

  const handleRewatchFromQuestion = () => {
    if (!currentQuestion) return;

    const rewatchTime = Math.max(0, currentQuestion.time - 10);
    playerRef.current?.seekTo(rewatchTime);

    setMustRewatch(false);
    setCurrentQuestion(null);
    setSelectedOption(null);
    setWrongAttempts(0);
    setPlaying(true);
  };

  const handleReplay = () => {
    setVideoError(false);
    setShowFinalResult(false);
    setCurrentQuestion(null);
    setSelectedOption(null);
    setFeedback(null);
    setMustRewatch(false);
    setWrongAttempts(0);
    playerRef.current?.seekTo(lesson.startTime);
    setPlaying(true);
    setAnsweredQuestions([]);
    setMaxPlayed(lesson.startTime);
  }

  const escapeCertificateText = (value: string) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const handleCertificate = () => {
    const total = migratedLesson.questions.length * 10;
    const score = answeredQuestions.length * 10;
    const learner = learnerName.trim() || 'Học sinh';
    const date = new Date().toLocaleDateString('vi-VN');
    const certificateWindow = window.open('', '_blank');
    if (!certificateWindow) return;

    certificateWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Thư khen</title><style>body{margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#1f2937}.paper{width:900px;max-width:94%;margin:32px auto;padding:54px;border:12px solid #f59e0b;border-radius:28px;background:radial-gradient(circle at top,#fff7ed,#fff 42%);text-align:center;box-shadow:0 24px 80px rgba(15,23,42,.18)}h1{margin:0;color:#b45309;font-size:52px;text-transform:uppercase}.sub{font-size:20px;font-weight:700;color:#64748b}.avatar{font-size:54px;margin:24px 0 0}.name{margin:12px 0 18px;font-size:42px;font-weight:950;color:#7c3aed}.score{display:inline-block;margin:16px 0 26px;padding:12px 28px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:24px;font-weight:950}.text{font-size:22px;line-height:1.55}.sign{display:flex;justify-content:space-between;margin-top:54px;font-weight:800}@media print{button{display:none}.paper{box-shadow:none;margin:0 auto}}</style></head><body><div class="paper"><h1>Thư khen</h1><p class="sub">Hoàn thành bài học tương tác</p><div class="avatar">${escapeCertificateText(learnerAvatar)}</div><div class="name">${escapeCertificateText(learner)}</div><p class="text">Đã hoàn thành bài học: <b>${escapeCertificateText(migratedLesson.title)}</b><br>với tinh thần học tập tích cực.</p><div class="score">${score} / ${total} điểm</div><div class="sign"><span>Ngày ${escapeCertificateText(date)}</span><span>Giáo viên: ${escapeCertificateText(theme.authorName || 'Giáo viên')}</span></div><button onclick="window.print()" style="margin-top:32px;padding:12px 22px;border:0;border-radius:12px;background:#7c3aed;color:white;font-weight:900">In hoặc lưu PDF</button></div></body></html>`);
    certificateWindow.document.close();
    certificateWindow.focus();
    setTimeout(() => certificateWindow.print(), 400);
  };

  const handleError = (e: any) => {
    console.error("YouTube Player Error:", e);
    setVideoError(true);
    setPlaying(false);
  };

  const handleStartLesson = () => {
    if (!learnerName.trim()) return;
    setShowStartGate(false);
    setPlaying(true);
  };

  const questionOverlayStyle = theme.questionStyle === 'card'
    ? { background: 'rgba(15, 23, 42, 0.55)' }
    : theme.questionStyle === 'gradient'
      ? { background: `radial-gradient(circle at 18% 12%, ${theme.primaryColor}44, transparent 35%), radial-gradient(circle at 82% 16%, ${theme.secondaryColor}55, transparent 36%), rgba(2, 6, 23, 0.24)` }
    : theme.questionStyle === 'playful'
      ? { background: `linear-gradient(135deg, ${theme.secondaryColor}dd 0%, ${theme.primaryColor}cc 55%, ${theme.accentColor}aa 100%)` }
      : { background: `linear-gradient(135deg, ${theme.backgroundColor}dd 0%, ${theme.primaryColor}c9 50%, ${theme.secondaryColor}b3 100%)` };

  const questionCardClass = theme.questionStyle === 'card'
    ? 'bg-white text-slate-800'
    : 'bg-slate-800/80 text-white backdrop-blur-xl border border-white/20';

  const questionCardStyle = {
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
    borderColor: theme.questionStyle === 'card' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.24)',
    boxShadow: `0 28px 90px rgba(15,23,42,.35), 0 0 0 1px ${theme.primaryColor}22`,
    ...(theme.questionStyle === 'gradient'
      ? { background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 58%, ${theme.accentColor} 100%)` }
      : {}),
  };

  return (
    <div
      className="h-full flex flex-col items-center justify-center p-4 relative"
      style={{
        fontFamily: `${theme.fontFamily}, Nunito, Arial, sans-serif`,
        background: `radial-gradient(circle at 20% 0%, ${theme.primaryColor}44, transparent 32%), radial-gradient(circle at 80% 10%, ${theme.secondaryColor}33, transparent 30%), ${theme.backgroundColor}`,
      }}
    >
      {/* Nút Quay lại */}
      {showStartGate && !videoError && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-[28px] border border-white/20 bg-white p-6 text-center shadow-2xl"
          >
            <h2 className="mb-2 text-3xl font-black" style={{ color: theme.primaryColor }}>Vào bài học</h2>
            <p className="mb-5 text-sm font-bold text-slate-500">Nhập họ tên và chọn nhân vật đại diện của em.</p>
            <input
              value={learnerName}
              onChange={(event) => setLearnerName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleStartLesson();
              }}
              placeholder="Họ và tên học sinh"
              className="mb-4 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-base font-bold text-slate-800 outline-none focus:border-purple-400"
              autoFocus
            />
            <div className="mb-5 grid grid-cols-6 gap-2">
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar.label}
                  type="button"
                  onClick={() => setLearnerAvatar(avatar.icon)}
                  aria-label={avatar.label}
                  title={avatar.label}
                  className={`h-14 rounded-2xl border-2 bg-white text-3xl transition ${learnerAvatar === avatar.icon ? 'scale-105 border-purple-500 shadow-lg' : 'border-slate-200 hover:border-purple-200'}`}
                >
                  {avatar.icon}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleStartLesson}
              className="w-full rounded-2xl px-5 py-3 text-base font-black text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
              disabled={!learnerName.trim()}
            >
              Bắt đầu học
            </button>
          </motion.div>
        </div>
      )}

      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all text-purple-700"
      >
        <ArrowLeft size={24} />
      </button>

      <div className={`w-full ${theme.layout === 'full' ? 'max-w-6xl' : theme.layout === 'sidebar' ? 'max-w-6xl' : 'max-w-5xl'} ${theme.layout === 'sidebar' ? 'grid grid-cols-1 lg:grid-cols-[1fr_260px]' : ''} bg-black shadow-2xl overflow-hidden relative border-4 sm:border-8 border-white/40 backdrop-blur-sm`}
        style={{ borderRadius: theme.radius }}>

        <div className="bg-slate-950">
        {!videoError && (
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-black" style={{ backgroundColor: theme.primaryColor }}>
                {theme.logoImage ? <img src={theme.logoImage} alt="Logo" className="h-full w-full rounded-full object-contain" /> : (theme.logoText || 'GV')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{theme.publishTitle || lesson.title}</p>
                {(theme.publishSubtitle || theme.authorName) && (
                  <p className="truncate text-[11px] text-white/60">{theme.publishSubtitle || theme.authorName}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {learnerName && (
                <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white">
                  {learnerAvatar} {learnerName}
                </div>
              )}
              {theme.showScoreReport && (
                <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white">
                  {answeredQuestions.length}/{migratedLesson.questions.length} câu hỏi
                </div>
              )}
            </div>
          </div>
        )}

        <div className="relative aspect-video bg-black">
        {!videoError && playbackUrl ? (
          <ReactPlayer
            ref={playerRef}
            url={playbackUrl}
            width="100%"
            height="100%"
            playing={playing}
            controls={lesson.allowSeeking}
            onProgress={handleProgress}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={handleError}
            config={{
              youtube: {
                playerVars: {
                  start: lesson.startTime,
                  modestbranding: 1,
                  rel: 0,
                  origin: window.location.origin
                }
              }
            }}
          />
        ) : (
          // Giao diện thông báo lỗi thân thiện (Fallback UI)
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/90 to-black/90 backdrop-blur-md text-white p-8 text-center z-50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/10 p-8 rounded-[32px] border border-white/20 shadow-2xl max-w-lg"
            >
              <AlertTriangle size={64} className="text-yellow-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-bold mb-4">Thầy cô ơi!</h3>
              <p className="text-gray-100 text-lg mb-8 leading-relaxed">
                {localVideoMissing
                  ? 'Không tìm thấy file video cục bộ trên máy này. Thầy cô hãy mở lại đúng thiết bị đã lưu hoặc chọn lại file video.'
                  : 'Video này bị chủ sở hữu chặn nhúng hoặc gặp lỗi cấu hình.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onBack}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-2xl transition-all"
                >
                  Chọn video khác
                </button>
                {!isLocalVideo && (
                  <a
                    href={cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105"
                  >
                    <ExternalLink size={20} /> Mở trên YouTube
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {false && !videoError && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4">
            <div className="flex max-w-[70%] items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-white backdrop-blur">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-black" style={{ backgroundColor: theme.primaryColor }}>
                {theme.logoImage ? <img src={theme.logoImage} alt="Logo" className="h-full w-full rounded-full object-contain" /> : (theme.logoText || 'GV')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{theme.publishTitle || lesson.title}</p>
                {(theme.publishSubtitle || theme.authorName) && (
                  <p className="truncate text-[11px] text-white/70">{theme.publishSubtitle || theme.authorName}</p>
                )}
              </div>
            </div>
            {theme.showScoreReport && (
              <div className="rounded-full bg-white/90 px-3 py-2 text-xs font-black text-slate-800 shadow">
                {answeredQuestions.length}/{migratedLesson.questions.length} câu hỏi
              </div>
            )}
          </div>
        )}

        {false && !videoError && (theme.footerLeftText || theme.footerRightText || theme.guideText) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent p-4 text-xs font-bold text-white">
            <span className="max-w-[70%] truncate">{theme.footerLeftText || theme.guideText}</span>
            <span className="shrink-0">{theme.footerRightText}</span>
          </div>
        )}

        {/* Overlay câu hỏi tương tác - thiết kế mới */}
        <AnimatePresence>
          {currentQuestion && !videoError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center p-2 sm:p-4"
              style={questionOverlayStyle}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className={`${questionCardClass} relative w-full max-w-[95vw] overflow-hidden rounded-[24px] border p-4 shadow-2xl sm:max-w-xl sm:p-5 md:max-w-2xl md:p-6`}
                style={questionCardStyle}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }} />
                <div className="mb-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-sm" style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}>
                      Câu hỏi tương tác
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                      +10 điểm
                    </span>
                  </div>
                  <h3
                    className="text-left text-xl font-black leading-tight tracking-tight sm:text-2xl md:text-3xl"
                    style={{ color: theme.questionStyle === 'card' ? theme.textColor : '#ffffff' }}
                  >
                    {currentQuestion.text}
                  </h3>
                  <p className={`mt-2 text-sm font-semibold ${theme.questionStyle === 'card' ? 'text-slate-500' : 'text-white/70'}`}>
                    Chọn một đáp án đúng rồi bấm Trả lời ngay.
                  </p>
                </div>
                {/* Tiêu đề câu hỏi - màu vàng với icon ? */}
                <div className="hidden">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold leading-snug flex items-center justify-center gap-2">
                    <span className="text-red-400 text-2xl sm:text-3xl">❓</span>
                    <span className="drop-shadow-md" style={{ color: theme.questionStyle === 'card' ? theme.textColor : '#fde68a' }}>
                      {currentQuestion.text}
                    </span>
                  </h3>
                </div>

                {/* Các lựa chọn - kiểu A. B. C. D. - Dynamic */}
                <div className="mb-5 flex flex-col gap-3">
                  {currentQuestion.options
                    .map((optText, optIndex) => ({ optText, optIndex }))
                    .filter(({ optText }) => String(optText || '').trim())
                    .map(({ optText, optIndex }) => (
                    <button
                      key={optIndex}
                      onClick={() => setSelectedOption(optIndex)}
                      className={`group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all sm:px-4 sm:py-3.5
                        ${selectedOption === optIndex
                          ? 'border-transparent bg-white shadow-lg ring-2 ring-purple-400'
                          : 'border-slate-200 bg-white/95 hover:-translate-y-0.5 hover:border-purple-200 hover:bg-white hover:shadow-md'
                        }
                        ${feedback === 'correct' && selectedOption === optIndex ? 'bg-green-100 ring-2 ring-green-500' : ''}
                        ${feedback === 'incorrect' && selectedOption === optIndex ? 'bg-red-100 ring-2 ring-red-500' : ''}
                      `}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition
                          ${selectedOption === optIndex ? 'text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-purple-50 group-hover:text-purple-700'}
                          ${feedback === 'correct' && selectedOption === optIndex ? '!bg-green-500 !text-white' : ''}
                          ${feedback === 'incorrect' && selectedOption === optIndex ? '!bg-red-500 !text-white' : ''}
                        `}
                        style={selectedOption === optIndex && !feedback ? { background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` } : undefined}
                      >
                        {optionLabels[optIndex]}
                      </span>
                      <span className={`min-w-0 flex-1 text-sm font-extrabold leading-snug sm:text-base
                        ${selectedOption === optIndex ? 'text-purple-800' : 'text-gray-700'}
                        ${feedback === 'correct' && selectedOption === optIndex ? '!text-green-800' : ''}
                        ${feedback === 'incorrect' && selectedOption === optIndex ? '!text-red-800' : ''}
                      `}>
                        {optText}
                      </span>

                      {feedback === 'correct' && selectedOption === optIndex && (
                        <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                      )}
                      {feedback === 'incorrect' && selectedOption === optIndex && (
                        <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                      )}
                    </button>
                  ))}
                </div>

                {/* 2 nút xếp ngang */}
                <div className="flex flex-row gap-2 sm:gap-3 justify-center">
                  <button
                    onClick={handleAnswer}
                    disabled={selectedOption === null || feedback !== null}
                    className={`flex-1 py-2.5 sm:py-3 px-4 rounded-full font-bold text-sm sm:text-base text-white shadow-lg transition-all
                            ${selectedOption === null || feedback !== null
                        ? 'bg-gray-400/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95'
                      }
                        `}
                  >
                    Trả lời ngay
                  </button>

                  {/* Nút xem lại video */}
                  <button
                    onClick={() => {
                      const rewatchTime = Math.max(0, currentQuestion.time - 10);
                      playerRef.current?.seekTo(rewatchTime);
                      setCurrentQuestion(null);
                      setSelectedOption(null);
                      setPlaying(true);
                    }}
                    className="flex-1 py-2.5 sm:py-3 px-4 rounded-full font-bold text-sm sm:text-base text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 19 2 12 11 5 11 19"></polygon>
                      <polygon points="22 19 13 12 22 5 22 19"></polygon>
                    </svg>
                    Xem lại video
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFinalResult && !videoError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[55] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.92, y: 18 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 18 }}
                className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/20 bg-white text-center shadow-2xl"
              >
                <div className="h-2" style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }} />
                <div className="p-6 sm:p-8">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-500">
                    <Trophy size={44} fill="currentColor" />
                  </div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Kết quả bài học</p>
                  <h2 className="mb-2 text-2xl font-black text-slate-900 sm:text-3xl">Hoàn thành xuất sắc</h2>
                  <p className="mb-5 text-sm font-bold text-slate-500">
                    {learnerAvatar} {learnerName || 'Học sinh'} đã hoàn thành {answeredQuestions.length}/{migratedLesson.questions.length} câu hỏi.
                  </p>
                  <div className="mx-auto mb-6 inline-flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-3 text-emerald-700">
                    <Star size={20} fill="currentColor" />
                    <span className="text-xl font-black">{answeredQuestions.length * 10} / {migratedLesson.questions.length * 10} điểm</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={handleCertificate}
                      className="rounded-2xl px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105"
                      style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                    >
                      Xuất thư khen
                    </button>
                    <button type="button" onClick={handleReplay} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200">
                      Xem lại
                    </button>
                    <button type="button" onClick={onBack} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                      Thoát video
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Popup chúc mừng khi trả lời đúng */}
        <AnimatePresence>
          {showCongrats && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                className="bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 rounded-3xl p-6 sm:p-8 shadow-2xl text-center max-w-sm mx-4"
              >
                {/* Icon Trophy */}
                <motion.div
                  animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 0.6, repeat: 2 }}
                  className="mb-3"
                >
                  <Trophy size={64} className="mx-auto text-yellow-200 drop-shadow-lg" fill="currentColor" />
                </motion.div>

                {/* Text chúc mừng */}
                <motion.h2
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-2xl sm:text-3xl font-black text-white drop-shadow-md mb-2"
                >
                  🎉 XUẤT SẮC! 🎉
                </motion.h2>
                <p className="text-white/90 text-base sm:text-lg font-bold">
                  Bạn đã trả lời đúng!
                </p>

                {/* Stars decoration */}
                <div className="flex justify-center gap-2 mt-3">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        rotate: [0, 360],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    >
                      <Star size={20} className="text-yellow-200" fill="currentColor" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal bắt buộc xem lại video */}
        <AnimatePresence>
          {mustRewatch && currentQuestion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-gradient-to-br from-red-900/90 to-orange-900/90 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  transition: { type: "spring", damping: 10 }
                }}
                className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl border-4 border-red-300 text-center"
              >
                <motion.div
                  animate={{
                    x: [0, -10, 10, -10, 10, 0],
                  }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle size={56} className="text-red-500" />
                  </div>
                </motion.div>

                <h3 className="text-3xl font-bold text-red-600 mb-4">
                  Ôi không! Sai rồi 😢
                </h3>

                <p className="text-gray-600 text-lg mb-6">
                  Em hãy xem lại video để hiểu bài nhé!<br />
                  <span className="text-sm text-gray-400">Video sẽ được tua lại đoạn trước câu hỏi</span>
                </p>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRewatchFromQuestion}
                  className="py-4 px-8 rounded-2xl font-bold text-xl text-white shadow-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 flex items-center justify-center gap-3 mx-auto"
                >
                  <RefreshCw size={24} />
                  Xem lại video
                </motion.button>

                <p className="text-xs text-gray-400 mt-4">
                  Đã trả lời sai {wrongAttempts} lần
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Play Button */}
        {!playing && !currentQuestion && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group pointer-events-none">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setPlaying(true)}
              className="w-24 h-24 bg-white/90 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] pointer-events-auto cursor-pointer text-purple-600 hover:bg-white"
            >
              <Play fill="currentColor" size={48} className="ml-2" />
            </motion.button>
          </div>
        )}
        </div>

        {!videoError && (theme.footerLeftText || theme.footerRightText || theme.guideText) && (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-slate-950 px-4 py-3 text-xs font-bold text-white">
            <span className="min-w-0 truncate">{theme.footerLeftText || theme.guideText}</span>
            <span className="shrink-0">{theme.footerRightText}</span>
          </div>
        )}
      </div>

        {theme.layout === 'sidebar' && (
          <aside className="hidden bg-white/95 p-5 text-slate-800 lg:block">
            <h3 className="mb-2 text-lg font-black" style={{ color: theme.primaryColor }}>{lesson.title}</h3>
            <p className="mb-4 text-sm text-slate-500">
              {migratedLesson.questions.length} câu hỏi tương tác
            </p>
            {theme.showAuthorPanel && (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-50 text-sm font-black" style={{ color: theme.primaryColor }}>
                    {theme.authorAvatarImage ? <img src={theme.authorAvatarImage} alt="Ảnh tác giả" className="h-full w-full object-cover" /> : (theme.authorName || 'GV').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tác giả</p>
                    <p className="truncate font-black text-slate-800">{theme.authorName || 'Chưa nhập tên tác giả'}</p>
                    {theme.authorInfo && <p className="mt-1 text-xs leading-relaxed text-slate-500">{theme.authorInfo}</p>}
                  </div>
                </div>
              </div>
            )}
            {theme.guideText && (
              <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold text-indigo-900">
                {theme.guideText}
              </div>
            )}
            <div className="space-y-2">
              {migratedLesson.questions.map((q, index) => (
                <div
                  key={q.id}
                  className={`rounded-xl border px-3 py-2 text-sm ${answeredQuestions.includes(q.id) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                >
                  <span className="font-bold">Câu {index + 1}</span>
                  <span className="ml-2 text-xs">{Math.floor(q.time / 60)}:{String(q.time % 60).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Controls below video */}
      {!videoError && (
        <div className="mt-8 flex gap-4">
          <button onClick={handleReplay} className="bg-white/80 backdrop-blur-md hover:bg-white text-purple-900 px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 border border-white/50">
            <RotateCcw size={20} /> Xem lại từ đầu
          </button>
        </div>
      )}

      {/* Gợi ý xoay ngang màn hình trên mobile */}
      <RotateScreenHint />
    </div>
  );
};

export default VideoPlayer;
