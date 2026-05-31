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
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [localVideoMissing, setLocalVideoMissing] = useState(false);

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
      playVictorySound(); // Âm thanh chiến thắng hoành tráng
      setShowCongrats(true); // Hiển popup chúc mừng

      // Confetti hoành tráng hơn
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b', '#ec4899', '#8b5cf6']
      });
      // Thêm confetti thứ 2 sau 300ms
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.7, x: 0.3 },
          colors: ['#22d3ee', '#a855f7', '#f472b6']
        });
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.7, x: 0.7 },
          colors: ['#22d3ee', '#a855f7', '#f472b6']
        });
      }, 300);

      setTimeout(() => {
        setShowCongrats(false);
        setAnsweredQuestions((prev) => [...prev, currentQuestion.id]);
        setFeedback(null);
        setCurrentQuestion(null);
        setSelectedOption(null);
        setWrongAttempts(0);
        setPlaying(true);
      }, 2500);
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
    playerRef.current?.seekTo(lesson.startTime);
    setPlaying(true);
    setAnsweredQuestions([]);
    setMaxPlayed(lesson.startTime);
  }

  const handleError = (e: any) => {
    console.error("YouTube Player Error:", e);
    setVideoError(true);
    setPlaying(false);
  };

  const questionOverlayStyle = theme.questionStyle === 'card'
    ? { background: 'rgba(15, 23, 42, 0.55)' }
    : theme.questionStyle === 'playful'
      ? { background: `linear-gradient(135deg, ${theme.secondaryColor}dd 0%, ${theme.primaryColor}cc 55%, ${theme.accentColor}aa 100%)` }
      : { background: `linear-gradient(135deg, ${theme.backgroundColor}dd 0%, ${theme.primaryColor}c9 50%, ${theme.secondaryColor}b3 100%)` };

  const questionCardClass = theme.questionStyle === 'card'
    ? 'bg-white text-slate-800'
    : 'bg-slate-800/80 text-white backdrop-blur-xl border border-white/20';

  return (
    <div
      className="h-full flex flex-col items-center justify-center p-4 relative"
      style={{
        fontFamily: `${theme.fontFamily}, Nunito, Arial, sans-serif`,
        background: `radial-gradient(circle at 20% 0%, ${theme.primaryColor}44, transparent 32%), radial-gradient(circle at 80% 10%, ${theme.secondaryColor}33, transparent 30%), ${theme.backgroundColor}`,
      }}
    >
      {/* Nút Quay lại */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 bg-white/80 p-3 rounded-full shadow-lg hover:bg-white transition-all text-purple-700"
      >
        <ArrowLeft size={24} />
      </button>

      <div className={`w-full ${theme.layout === 'full' ? 'max-w-6xl' : theme.layout === 'sidebar' ? 'max-w-6xl' : 'max-w-5xl'} ${theme.layout === 'sidebar' ? 'grid grid-cols-1 lg:grid-cols-[1fr_260px]' : ''} bg-black shadow-2xl overflow-hidden relative border-4 sm:border-8 border-white/40 backdrop-blur-sm`}
        style={{ borderRadius: theme.radius }}>

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
                className={`${questionCardClass} rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 w-full max-w-[95vw] sm:max-w-md md:max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto`}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* Tiêu đề câu hỏi - màu vàng với icon ? */}
                <div className="text-center mb-4 sm:mb-5">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold leading-snug flex items-center justify-center gap-2">
                    <span className="text-red-400 text-2xl sm:text-3xl">❓</span>
                    <span className="drop-shadow-md" style={{ color: theme.questionStyle === 'card' ? theme.textColor : '#fde68a' }}>
                      {currentQuestion.text}
                    </span>
                  </h3>
                </div>

                {/* Các lựa chọn - kiểu A. B. C. D. - Dynamic */}
                <div className="flex flex-col gap-2 sm:gap-2.5 mb-4 sm:mb-5">
                  {currentQuestion.options.map((optText, optIndex) => (
                    <button
                      key={optIndex}
                      onClick={() => setSelectedOption(optIndex)}
                      className={`py-2.5 sm:py-3 px-4 sm:px-5 rounded-full text-left transition-all relative overflow-hidden w-full
                        ${selectedOption === optIndex
                          ? 'bg-white shadow-lg ring-2 ring-purple-400'
                          : 'bg-white/90 hover:bg-white hover:shadow-md'
                        }
                        ${feedback === 'correct' && selectedOption === optIndex ? 'bg-green-100 ring-2 ring-green-500' : ''}
                        ${feedback === 'incorrect' && selectedOption === optIndex ? 'bg-red-100 ring-2 ring-red-500' : ''}
                      `}
                    >
                      <span className={`text-sm sm:text-base font-semibold
                        ${selectedOption === optIndex ? 'text-purple-800' : 'text-gray-700'}
                        ${feedback === 'correct' && selectedOption === optIndex ? '!text-green-800' : ''}
                        ${feedback === 'incorrect' && selectedOption === optIndex ? '!text-red-800' : ''}
                      `}>
                        {optionLabels[optIndex]}. {optText}
                      </span>

                      {feedback === 'correct' && selectedOption === optIndex && (
                        <CheckCircle className="absolute top-1/2 right-3 sm:right-4 transform -translate-y-1/2 text-green-500 w-5 h-5" />
                      )}
                      {feedback === 'incorrect' && selectedOption === optIndex && (
                        <XCircle className="absolute top-1/2 right-3 sm:right-4 transform -translate-y-1/2 text-red-500 w-5 h-5" />
                      )}
                    </button>
                  ))}
                </div>

                {/* 2 nút xếp ngang */}
                <div className="flex flex-row gap-2 sm:gap-3 justify-center">
                  <button
                    onClick={handleAnswer}
                    disabled={selectedOption === null}
                    className={`flex-1 py-2.5 sm:py-3 px-4 rounded-full font-bold text-sm sm:text-base text-white shadow-lg transition-all
                            ${selectedOption === null
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

        {theme.layout === 'sidebar' && (
          <aside className="hidden bg-white/95 p-5 text-slate-800 lg:block">
            <h3 className="mb-2 text-lg font-black" style={{ color: theme.primaryColor }}>{lesson.title}</h3>
            <p className="mb-4 text-sm text-slate-500">
              {migratedLesson.questions.length} câu hỏi tương tác
            </p>
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
