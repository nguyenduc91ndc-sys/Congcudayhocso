import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactPlayer from 'react-player';
import { VideoLesson, Question, QuestionType, migrateVideoLesson, normalizeVideoPlayerTheme, normalizeVideoQuestionDisplayMode } from '../types';
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

interface ResultReportItem {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  time: number;
  learnerAnswer: string;
  correctAnswer: string;
  points: number;
  maxPoints: number;
  attempts: number;
}

const REPORT_API_URL = 'https://giaoviencn.io.vn/api/send-result-report';
const isAppsScriptReportUrl = (url: string) => /script\.google\.com|script\.googleusercontent\.com/i.test(url);
const getReportRequestTarget = (configuredUrl?: string) => {
  const reportUrl = String(configuredUrl || '').trim();
  if (isAppsScriptReportUrl(reportUrl)) {
    return { url: REPORT_API_URL, appsScriptUrl: reportUrl };
  }
  return { url: reportUrl || REPORT_API_URL, appsScriptUrl: '' };
};

const getReportSendErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/failed to fetch|load failed|networkerror/i.test(message)) {
    return 'Chưa kết nối được API gửi báo cáo. Hãy deploy lại web để cập nhật /api/send-result-report và cấu hình dịch vụ gửi email trên server.';
  }
  return message || 'Không gửi được báo cáo.';
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ lesson, onBack }) => {
  const [playing, setPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [maxPlayed, setMaxPlayed] = useState(0);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [mustRewatch, setMustRewatch] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [answerReportItems, setAnswerReportItems] = useState<Record<string, ResultReportItem>>({});
  const [, setReportSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [localVideoMissing, setLocalVideoMissing] = useState(false);
  const [showStartGate, setShowStartGate] = useState(true);
  const [learnerName, setLearnerName] = useState('');
  const [learnerClass, setLearnerClass] = useState('');
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
  const questionDisplayMode = normalizeVideoQuestionDisplayMode(migratedLesson.questionDisplayMode);
  const isAfterVideoQuestionMode = questionDisplayMode === 'after-video';
  const getQuestionPoints = (question: Question) => question.points ?? 10;
  const totalPoints = useMemo(() => migratedLesson.questions.reduce((sum, question) => sum + getQuestionPoints(question), 0), [migratedLesson.questions]);
  const earnedPoints = useMemo(
    () => migratedLesson.questions.reduce((sum, question) => answeredQuestions.includes(question.id) ? sum + getQuestionPoints(question) : sum, 0),
    [answeredQuestions, migratedLesson.questions]
  );

  // Nhãn đáp án (A, B, C, D)
  const optionLabels = ['A', 'B', 'C', 'D'];
  const getQuestionType = (question: Question): QuestionType => question.type || 'multiple-choice';
  const normalizeTextAnswer = (value: string, caseSensitive?: boolean) => {
    const trimmed = String(value || '').trim().replace(/\s+/g, ' ');
    if (caseSensitive) return trimmed;
    return trimmed
      .toLocaleLowerCase('vi-VN')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  };
  const isTextQuestionCorrect = (question: Question, answer: string) => {
    const acceptedAnswers = (question.acceptedAnswers || []).filter(item => String(item || '').trim());
    if (!acceptedAnswers.length) return false;
    const normalizedAnswer = normalizeTextAnswer(answer, question.caseSensitive);
    return acceptedAnswers.some(item => normalizeTextAnswer(item, question.caseSensitive) === normalizedAnswer);
  };
  const formatQuestionTime = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
  };
  const getQuestionCorrectAnswer = (question: Question) => {
    const questionType = getQuestionType(question);
    if (questionType === 'short-answer' || questionType === 'fill-blank') {
      return (question.acceptedAnswers || []).filter(answer => String(answer || '').trim()).join(' / ') || 'Chưa đặt đáp án';
    }
    if (questionType === 'image-choice') {
      return question.imageOptions?.[question.correctOption]?.text || question.options?.[question.correctOption] || `Đáp án ${optionLabels[question.correctOption] || ''}`;
    }
    return question.options?.[question.correctOption] || `Đáp án ${optionLabels[question.correctOption] || ''}`;
  };
  const getLearnerAnswerText = (question: Question, answerIndex: number | null, typedAnswer: string) => {
    const questionType = getQuestionType(question);
    if (questionType === 'short-answer' || questionType === 'fill-blank') return typedAnswer.trim();
    if (answerIndex === null) return '';
    if (questionType === 'image-choice') {
      return question.imageOptions?.[answerIndex]?.text || question.options?.[answerIndex] || `Đáp án ${optionLabels[answerIndex] || ''}`;
    }
    return question.options?.[answerIndex] || `Đáp án ${optionLabels[answerIndex] || ''}`;
  };
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

  const openQuestion = (question: Question) => {
    setPlaying(false);
    setCurrentQuestion(question);
    setSelectedOption(null);
    setTextAnswer('');
    setFeedback(null);
  };

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

    if (isAfterVideoQuestionMode) return;

    // Kiểm tra câu hỏi đến giờ xuất hiện
    const question = migratedLesson.questions.find(
      (q) =>
        Math.abs(q.time - state.playedSeconds) < 1 &&
        !answeredQuestions.includes(q.id)
    );

    if (question) {
      openQuestion(question);
    }
  };

  const handleAnswer = () => {
    if (!currentQuestion) return;
    const questionType = getQuestionType(currentQuestion);
    const isTextQuestion = questionType === 'short-answer' || questionType === 'fill-blank';
    if (!isTextQuestion && selectedOption === null) return;
    if (isTextQuestion && !textAnswer.trim()) return;

    const isCorrect = isTextQuestion
      ? isTextQuestionCorrect(currentQuestion, textAnswer)
      : selectedOption === currentQuestion.correctOption;
    const learnerAnswerText = getLearnerAnswerText(currentQuestion, selectedOption, textAnswer);

    if (isCorrect) {
      setAnswerReportItems(prev => ({
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          questionText: currentQuestion.text,
          questionType,
          time: currentQuestion.time,
          learnerAnswer: learnerAnswerText,
          correctAnswer: getQuestionCorrectAnswer(currentQuestion),
          points: getQuestionPoints(currentQuestion),
          maxPoints: getQuestionPoints(currentQuestion),
          attempts: wrongAttempts + 1,
        },
      }));
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
        setTextAnswer('');
        setWrongAttempts(0);
        if (isAfterVideoQuestionMode) {
          const nextQuestion = migratedLesson.questions.find(question => !nextAnswered.includes(question.id));
          if (nextQuestion) {
            openQuestion(nextQuestion);
          } else {
            showCompletionResult();
          }
        } else if (nextAnswered.length >= migratedLesson.questions.length) {
          const duration = playerRef.current?.getDuration?.() || 0;
          if (duration && playedSeconds >= duration - 0.75) {
            showCompletionResult();
          } else {
            setPlaying(true);
          }
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

  const showCompletionResult = () => {
    if (showFinalResult) return;
    setPlaying(false);
    setShowFinalResult(true);
    playVictorySound();
    confetti({
      particleCount: 220,
      spread: 120,
      origin: { y: 0.55 },
      colors: ['#10b981', '#34d399', '#fbbf24', '#ec4899', '#8b5cf6']
    });
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 62,
        spread: 85,
        origin: { x: 0, y: 0.72 },
        colors: [theme.primaryColor, '#fbbf24', '#ffffff', '#22c55e']
      });
      confetti({
        particleCount: 100,
        angle: 118,
        spread: 85,
        origin: { x: 1, y: 0.72 },
        colors: [theme.secondaryColor, '#ec4899', '#ffffff', '#38bdf8']
      });
    }, 220);
    setTimeout(() => {
      confetti({
        particleCount: 160,
        spread: 160,
        startVelocity: 42,
        origin: { y: 0.38 },
        colors: ['#fbbf24', '#22c55e', '#ec4899', '#8b5cf6', '#38bdf8']
      });
    }, 520);
  };

  const handleVideoEnded = () => {
    setPlaying(false);
    if (isAfterVideoQuestionMode) {
      const nextQuestion = migratedLesson.questions.find(question => !answeredQuestions.includes(question.id));
      if (nextQuestion) {
        openQuestion(nextQuestion);
        playNotificationSound();
        return;
      }
    }
    if (migratedLesson.questions.length === 0 || answeredQuestions.length >= migratedLesson.questions.length) {
      showCompletionResult();
    }
  };

  const handleRewatchFromQuestion = () => {
    if (!currentQuestion) return;

    const rewatchTime = isAfterVideoQuestionMode ? lesson.startTime : Math.max(0, currentQuestion.time - 10);
    playerRef.current?.seekTo(rewatchTime);

    setMustRewatch(false);
    setCurrentQuestion(null);
    setSelectedOption(null);
    setPlaying(true);
  };

  const handleReplay = () => {
    setVideoError(false);
    setShowFinalResult(false);
    setCurrentQuestion(null);
    setSelectedOption(null);
    setTextAnswer('');
    setFeedback(null);
    setMustRewatch(false);
    setWrongAttempts(0);
    playerRef.current?.seekTo(lesson.startTime);
    setPlaying(true);
    setAnsweredQuestions([]);
    setAnswerReportItems({});
    setMaxPlayed(lesson.startTime);
  }

  const escapeCertificateText = (value: string) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const buildResultReportText = (date = new Date().toLocaleString('vi-VN')) => {
    const completedCount = answeredQuestions.length;
    const totalQuestions = migratedLesson.questions.length;
    const percent = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 100;
    const lines = [
      'BÁO CÁO KẾT QUẢ HỌC TẬP',
      `Bài học: ${migratedLesson.title}`,
      `Học sinh: ${learnerName || 'Học sinh'}`,
      `Lớp: ${learnerClass || '-'}`,
      `Điểm: ${earnedPoints}/${totalPoints}`,
      `Tỷ lệ: ${percent}%`,
      `Hoàn thành: ${completedCount}/${totalQuestions} câu hỏi`,
      `Thời gian xuất báo cáo: ${date}`,
      `Giáo viên: ${theme.authorName || 'Giáo viên'}`,
      '',
      'CHI TIẾT CÂU HỎI',
    ];

    migratedLesson.questions.forEach((question, index) => {
      const item = answerReportItems[question.id];
      lines.push(
        '',
        `${index + 1}. ${question.text}`,
        `Thời điểm: ${formatQuestionTime(question.time)}`,
        `Trả lời của học sinh: ${item?.learnerAnswer || 'Chưa trả lời'}`,
        `Đáp án đúng: ${item?.correctAnswer || getQuestionCorrectAnswer(question)}`,
        `Lần thử: ${item?.attempts || 0}`,
        `Điểm: ${item?.points ?? 0}/${getQuestionPoints(question)}`
      );
    });

    return lines.join('\n');
  };

  const buildResultReportHtml = (date = new Date().toLocaleString('vi-VN')) => {
    const completedCount = answeredQuestions.length;
    const totalQuestions = migratedLesson.questions.length;
    const percent = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 100;
    const rows = migratedLesson.questions.map((question, index) => {
      const item = answerReportItems[question.id];
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeCertificateText(question.text)}<br><small>${formatQuestionTime(question.time)}</small></td>
        <td>${escapeCertificateText(item?.learnerAnswer || 'Chưa trả lời')}</td>
        <td>${escapeCertificateText(item?.correctAnswer || getQuestionCorrectAnswer(question))}</td>
        <td>${item?.attempts || 0}</td>
        <td>${item?.points ?? 0}/${getQuestionPoints(question)}</td>
      </tr>`;
    }).join('');

    return `<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#0f172a">
      <h2>Báo cáo kết quả học tập</h2>
      <p><b>Bài học:</b> ${escapeCertificateText(migratedLesson.title)}</p>
      <p><b>Học sinh:</b> ${escapeCertificateText(learnerName || 'Học sinh')}</p>
      <p><b>Lớp:</b> ${escapeCertificateText(learnerClass || '-')}</p>
      <p><b>Điểm:</b> ${earnedPoints}/${totalPoints} (${percent}%)</p>
      <p><b>Hoàn thành:</b> ${completedCount}/${totalQuestions} câu hỏi</p>
      <p><b>Thời gian:</b> ${escapeCertificateText(date)}</p>
      <p><b>Giáo viên:</b> ${escapeCertificateText(theme.authorName || 'Giáo viên')}</p>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;border-color:#e2e8f0">
        <thead><tr><th>#</th><th>Câu hỏi</th><th>Trả lời của học sinh</th><th>Đáp án đúng</th><th>Lần thử</th><th>Điểm</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;
  };

  const sendResultReport = async (
    recipient?: string,
    options: { silent?: boolean; promptIfMissing?: boolean } = {},
  ) => {
    const configuredRecipient = (recipient || theme.reportEmail || '').trim();
    const to = configuredRecipient || (options.promptIfMissing === false ? '' : (window.prompt('Nhập Gmail nhận báo cáo:', '') || '').trim());
    if (!to) return;

    const date = new Date().toLocaleString('vi-VN');
    setReportSendStatus('sending');

    try {
      const proxyTarget = getReportRequestTarget(theme.reportApiUrl);
      const proxyResponse = await fetch(proxyTarget.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: `Bao cao ket qua - ${migratedLesson.title}`,
          text: buildResultReportText(date),
          html: buildResultReportHtml(date),
          learnerName: learnerName || 'Hoc sinh',
          lessonTitle: migratedLesson.title,
          appsScriptUrl: proxyTarget.appsScriptUrl || undefined,
        }),
      });

      if (!proxyResponse.ok) {
        const data = await proxyResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Khong gui duoc bao cao');
      }

      setReportSendStatus('sent');
      if (!options.silent) {
        alert('Đã gửi báo cáo về Gmail.');
      }
      return;

      const reportTarget = getReportRequestTarget(theme.reportApiUrl);
      const reportUrl = reportTarget.url;
      const directAppsScript = false;
      const response = await fetch(reportUrl, directAppsScript ? {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          to,
          subject: `Báo cáo kết quả - ${migratedLesson.title}`,
          text: buildResultReportText(date),
          html: buildResultReportHtml(date),
          learnerName: learnerName || 'Học sinh',
          lessonTitle: migratedLesson.title,
          appsScriptUrl: reportTarget.appsScriptUrl || undefined,
        }),
      } : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: `Báo cáo kết quả - ${migratedLesson.title}`,
          text: buildResultReportText(date),
          html: buildResultReportHtml(date),
          learnerName: learnerName || 'Học sinh',
          lessonTitle: migratedLesson.title,
        }),
      });

      if (!directAppsScript && !response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Không gửi được báo cáo');
      }

      setReportSendStatus('sent');
      if (!options.silent) {
        alert('Đã gửi báo cáo về Gmail.');
      }
    } catch (error) {
      setReportSendStatus('error');
      if (options.silent) {
        console.warn('Không gửi được báo cáo:', error);
      } else {
        alert(getReportSendErrorMessage(error));
      }
    }
  };

  const handleCertificateWithReport = () => {
    handleCertificate();
    if ((theme.reportEmail || '').trim()) {
      void sendResultReport(theme.reportEmail, { silent: true, promptIfMissing: false });
    }
  };

  const handleResultReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    const date = new Date().toLocaleString('vi-VN');
    const reportTarget = getReportRequestTarget(theme.reportApiUrl);
    const reportPayload = JSON.stringify({
      to: (theme.reportEmail || '').trim(),
      subject: `Báo cáo kết quả - ${migratedLesson.title}`,
      text: buildResultReportText(date),
      html: buildResultReportHtml(date),
      learnerName: learnerName || 'Học sinh',
      lessonTitle: migratedLesson.title,
      appsScriptUrl: reportTarget.appsScriptUrl || undefined,
    }).replace(/</g, '\\u003c');
    const completedCount = answeredQuestions.length;
    const totalQuestions = migratedLesson.questions.length;
    const percent = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 100;
    const rows = migratedLesson.questions.map((question, index) => {
      const item = answerReportItems[question.id];
      const points = item?.points ?? 0;
      const maxPoints = getQuestionPoints(question);
      return `<tr>
        <td>${index + 1}</td>
        <td><strong>${escapeCertificateText(question.text)}</strong><small>${formatQuestionTime(question.time)}</small></td>
        <td>${escapeCertificateText(item?.learnerAnswer || 'Chưa trả lời')}</td>
        <td>${escapeCertificateText(item?.correctAnswer || getQuestionCorrectAnswer(question))}</td>
        <td>${item?.attempts || 0}</td>
        <td><b>${points}/${maxPoints}</b></td>
      </tr>`;
    }).join('');
    const reportCss = `*{box-sizing:border-box}body{margin:0;background:#eef2f7;font-family:${escapeCertificateText(theme.fontFamily)},Arial,sans-serif;color:#0f172a}.wrap{max-width:1080px;margin:0 auto;padding:26px 18px}.paper{overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 22px 70px rgba(15,23,42,.14)}.hero{padding:30px 34px;background:linear-gradient(135deg,${escapeCertificateText(theme.primaryColor)},${escapeCertificateText(theme.secondaryColor)});color:#fff}.kicker{margin:0 0 8px;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.16em;opacity:.82}h1{margin:0;font-size:34px;line-height:1.1}h2{margin:0 0 12px;font-size:18px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:18px 24px;background:#f8fafc}.metric{border-radius:18px;background:#fff;padding:14px 16px;border:1px solid #e2e8f0}.metric span{display:block;color:#64748b;font-size:12px;font-weight:800}.metric strong{display:block;margin-top:6px;font-size:20px}.section{padding:24px}.summary{display:grid;grid-template-columns:1.2fr 1fr;gap:16px;margin-bottom:18px}.box{border:1px solid #e2e8f0;border-radius:18px;padding:16px;background:#fff}.box p{margin:8px 0;color:#334155;font-weight:700}.box b{color:#0f172a}table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #e2e8f0;border-radius:16px}th,td{padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top;font-size:13px}th{background:#f8fafc;color:#475569;font-size:12px;text-transform:uppercase}tr:last-child td{border-bottom:0}td:first-child,td:nth-child(5),td:nth-child(6){text-align:center;white-space:nowrap}small{display:block;margin-top:5px;color:#94a3b8;font-weight:800}.toolbar{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:16px}.toolbar button{border:0;border-radius:14px;padding:12px 18px;color:#fff;background:#0f172a;font-weight:950;cursor:pointer}.toolbar .sendBtn{background:#dc2626}.status{font-size:13px;font-weight:800;color:#475569}@media(max-width:760px){.meta,.summary{grid-template-columns:1fr}th,td{font-size:12px;padding:10px 8px}.wrap{padding:10px}}@media print{body{background:#fff}.wrap{padding:0}.paper{box-shadow:none;border-radius:0}.toolbar{display:none}}`;
    reportWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo kết quả</title><style>${reportCss}</style></head><body><div class="wrap"><main class="paper"><header class="hero"><p class="kicker">Báo cáo kết quả học tập</p><h1>${escapeCertificateText(migratedLesson.title)}</h1></header><section class="meta"><div class="metric"><span>Học sinh</span><strong>${escapeCertificateText(learnerName || 'Học sinh')}</strong></div><div class="metric"><span>Lớp</span><strong>${escapeCertificateText(learnerClass || '-')}</strong></div><div class="metric"><span>Điểm</span><strong>${earnedPoints}/${totalPoints}</strong></div><div class="metric"><span>Tỷ lệ</span><strong>${percent}%</strong></div></section><section class="section"><div class="summary"><div class="box"><h2>Thông tin bài học</h2><p>Hoàn thành: <b>${completedCount}/${totalQuestions}</b> câu hỏi</p><p>Thời gian xuất báo cáo: <b>${escapeCertificateText(date)}</b></p></div><div class="box"><h2>Giáo viên</h2><p><b>${escapeCertificateText(theme.authorName || 'Giáo viên')}</b></p><p>${escapeCertificateText(theme.authorInfo || '')}</p></div></div><table><thead><tr><th>#</th><th>Câu hỏi</th><th>Trả lời của học sinh</th><th>Đáp án đúng</th><th>Lần thử</th><th>Điểm</th></tr></thead><tbody>${rows}</tbody></table><div class="toolbar"><button onclick="window.print()">In hoặc lưu PDF</button><button class="sendBtn" id="sendReportBtn" onclick="sendReport()">Gửi báo cáo</button><span class="status" id="sendStatus"></span></div></section></main></div><script>const reportPayload=${reportPayload};function reportErrorMessage(error){const message=error&&error.message?error.message:String(error||'');return /failed to fetch|load failed|networkerror/i.test(message)?'Chưa kết nối được API gửi báo cáo. Hãy deploy lại web và cấu hình dịch vụ gửi email trên server.':(message||'Không gửi được báo cáo.')}async function sendReport(){const btn=document.getElementById('sendReportBtn'),status=document.getElementById('sendStatus');if(!reportPayload.to){reportPayload.to=(prompt('Nhập Gmail nhận báo cáo:','')||'').trim()}if(!reportPayload.to)return;btn.disabled=true;status.textContent='Đang gửi...';try{const response=await fetch(${JSON.stringify(REPORT_API_URL)},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reportPayload)});if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Không gửi được báo cáo')}status.textContent='Đã gửi báo cáo.';alert('Đã gửi báo cáo về Gmail.')}catch(error){status.textContent='Gửi lỗi.';btn.disabled=false;alert(reportErrorMessage(error))}}</script></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
  };

  const handleCertificate = () => {
    const total = totalPoints;
    const score = earnedPoints;
    const learner = learnerName.trim() || 'Học sinh';
    const classLine = learnerClass.trim() ? `<p class="className">Lớp: ${escapeCertificateText(learnerClass.trim())}</p>` : '';
    const date = new Date().toLocaleDateString('vi-VN');
    const certificateWindow = window.open('', '_blank');
    if (!certificateWindow) return;

    const displayTitle = theme.certificateTitle?.trim() || 'Thư khen';
    const displaySubtitle = theme.certificateSubtitle?.trim() || 'Hoàn thành bài học tương tác';
    const certificateCss = `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');*{box-sizing:border-box}body{margin:0;background:#080c1f;font-family:${escapeCertificateText(theme.fontFamily)},Arial,sans-serif;color:#fff}.wrap{min-height:100vh;padding:24px;background:radial-gradient(circle at 18% 20%,${escapeCertificateText(theme.primaryColor)}55,transparent 26%),radial-gradient(circle at 86% 14%,${escapeCertificateText(theme.secondaryColor)}48,transparent 24%),linear-gradient(135deg,#091023,#10143a 54%,#220f35)}.paper{position:relative;width:980px;max-width:100%;aspect-ratio:1.58/1;margin:0 auto;padding:34px 56px;border-radius:34px;background:linear-gradient(135deg,rgba(10,17,42,.94),rgba(16,21,63,.9) 52%,rgba(38,18,72,.92));box-shadow:0 26px 80px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.18);overflow:hidden;text-align:center;animation:paperIn .72s cubic-bezier(.2,.8,.2,1) both}.paper:before{content:"";position:absolute;inset:-30%;background:conic-gradient(from 120deg,transparent,rgba(255,255,255,.2),transparent 28%,rgba(255,255,255,.14),transparent 60%);animation:spinGlow 9s linear infinite}.paper:after{content:"";position:absolute;inset:14px;border:1px solid rgba(255,255,255,.2);border-radius:26px;pointer-events:none}.beam{position:absolute;inset:-30% auto auto 50%;width:280px;height:880px;transform:translateX(-50%) rotate(18deg);background:linear-gradient(180deg,rgba(255,255,255,.3),transparent);filter:blur(6px);opacity:.42;animation:sweep 4.4s ease-in-out infinite}.dot{position:absolute;width:9px;height:9px;border-radius:50%;background:#fff;opacity:.45;animation:float 3.8s ease-in-out infinite}.d1{left:9%;top:20%}.d2{right:12%;top:26%;animation-delay:.7s}.d3{left:17%;bottom:22%;animation-delay:1.2s}.topLogos{position:absolute;left:54px;right:54px;top:36px;z-index:3;display:flex;justify-content:space-between}.certLogo img{max-width:94px;max-height:58px;object-fit:contain}.seal img{max-width:80px;max-height:80px;object-fit:contain}.content{position:relative;z-index:2;display:flex;min-height:100%;flex-direction:column;align-items:center;justify-content:center}.badgeIcon{display:grid;place-items:center;width:88px;height:88px;margin-bottom:12px;border-radius:28px;background:linear-gradient(135deg,${escapeCertificateText(theme.accentColor)},${escapeCertificateText(theme.secondaryColor)});font-size:48px;box-shadow:0 20px 46px ${escapeCertificateText(theme.secondaryColor)}55;animation:float 3.4s ease-in-out infinite}.eyebrow{margin:0 0 8px;padding:7px 16px;border-radius:999px;background:rgba(255,255,255,.1);color:#c7d2fe;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.16em}.title{margin:0;font-size:48px;line-height:1.02;font-weight:950;text-transform:uppercase;letter-spacing:.02em;background:linear-gradient(90deg,#fff,#c7d2fe,#f0abfc);-webkit-background-clip:text;background-clip:text;color:transparent}.nameWrap{position:relative;margin:28px 0 8px}.halo{position:absolute;left:50%;top:50%;width:300px;height:120px;transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,${escapeCertificateText(theme.primaryColor)}3d,transparent 68%);animation:haloPulse 1.8s ease-in-out infinite}.avatar{position:relative;font-size:38px}.name{position:relative;margin:2px 0 0;font-size:58px;line-height:1;font-weight:950;text-shadow:0 8px 28px rgba(0,0,0,.35)}.className{position:relative;margin:8px 0 0;color:#cbd5e1;font-size:16px;font-weight:900}.ribbon{margin:18px auto 12px;max-width:760px;padding:13px 28px;border:1px solid rgba(255,255,255,.22);border-radius:18px;background:linear-gradient(90deg,rgba(255,255,255,.16),rgba(255,255,255,.08));backdrop-filter:blur(12px);color:#fff;font-size:17px;font-weight:950;text-transform:uppercase;box-shadow:0 16px 36px rgba(0,0,0,.2);animation:slideUp .7s ease .18s both}.score{display:grid;place-items:center;width:96px;height:96px;border-radius:30px;background:linear-gradient(135deg,#22c55e,#14b8a6);font-size:24px;font-weight:950;box-shadow:0 18px 46px rgba(20,184,166,.32);transform:rotate(-4deg)}.score small{display:block;font-size:13px}.sign{position:absolute;left:58px;right:58px;bottom:38px;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;color:#cbd5e1;font-size:13px;font-weight:900}.sign>span{width:190px;text-align:center}.sign strong{display:block;color:#fff;font-size:16px}.line{width:130px;height:2px;margin:8px auto 8px;border-radius:999px;background:rgba(255,255,255,.34)}.teacher{display:flex;flex-direction:column;align-items:center;line-height:1.25;text-align:center}.signature{display:flex;align-items:flex-end;justify-content:center;width:100%;min-height:54px;margin-bottom:4px}.signature img{display:block;max-width:132px;max-height:50px;object-fit:contain}.toolbar{display:flex;justify-content:center;gap:10px;margin:16px auto 0}.toolbar button{border:0;border-radius:12px;padding:12px 17px;color:#fff;font-weight:950;cursor:pointer}.printBtn{background:${escapeCertificateText(theme.primaryColor)}}.imageBtn{background:#111827}.title{letter-spacing:0}.nameWrap{width:min(820px,100%);margin:24px auto 8px;padding:0 18px}.halo{width:min(520px,82%);height:128px}.avatar{margin-bottom:8px;font-size:34px;line-height:1}.name{max-width:100%;margin:0 auto;font-size:clamp(34px,5vw,50px);line-height:1.08;letter-spacing:0;text-wrap:balance;overflow-wrap:anywhere}.className{margin-top:10px}@keyframes paperIn{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}@keyframes spinGlow{to{transform:rotate(360deg)}}@keyframes sweep{0%,100%{opacity:.2;transform:translateX(-95%) rotate(18deg)}50%{opacity:.48;transform:translateX(25%) rotate(18deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes haloPulse{0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(.96)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@media print{body{background:#fff}.wrap{padding:0;background:#fff}.toolbar{display:none}.paper{box-shadow:none;margin:0 auto}.paper:before,.beam,.dot{animation:none}}`;
    const certificateLayoutCss = `body,.paper,.paper *{font-family:'Nunito','Be Vietnam Pro',Arial,sans-serif}.wrap{background:radial-gradient(circle at 12% 12%,${escapeCertificateText(theme.primaryColor)}30,transparent 28%),radial-gradient(circle at 88% 14%,${escapeCertificateText(theme.secondaryColor)}2e,transparent 28%),linear-gradient(135deg,#ecfeff,#fdf2f8 52%,#fff7ed)}.paper{background:linear-gradient(135deg,rgba(255,255,255,.98),rgba(240,253,250,.96) 48%,rgba(253,242,248,.98));color:#172033;box-shadow:0 26px 80px rgba(51,65,85,.18),inset 0 0 0 1px rgba(255,255,255,.85)}.paper:before{opacity:.28}.paper:after{border-color:rgba(99,102,241,.22)}.beam{opacity:.2}.dot{background:${escapeCertificateText(theme.primaryColor)};opacity:.24}.certLogo img,.seal img{mix-blend-mode:multiply;filter:saturate(1.12) contrast(1.08)}.content{gap:8px;justify-content:center}.badgeIcon{width:72px;height:72px;margin:0 0 2px;border-radius:22px;font-size:38px}.eyebrow{margin:0;background:rgba(99,102,241,.08);color:#6366f1;font-size:11px;letter-spacing:.08em}.title{max-width:820px;font-size:clamp(34px,4.8vw,44px);line-height:1.06;letter-spacing:0;background:linear-gradient(90deg,#2563eb,#7c3aed,#db2777);-webkit-background-clip:text;background-clip:text;color:transparent}.subtitle{max-width:760px;margin:-2px auto 2px;color:#64748b;font-size:16px;font-weight:900;line-height:1.25}.nameWrap{width:min(760px,100%);margin:4px auto 0;padding:0 18px}.halo{display:none}.avatar{display:inline-grid;place-items:center;width:56px;height:56px;margin:0 auto 8px;border-radius:18px;background:rgba(255,255,255,.72);font-size:30px;line-height:1;box-shadow:0 8px 20px rgba(99,102,241,.12),inset 0 0 0 1px rgba(99,102,241,.12)}.name{display:block;max-width:100%;margin:0 auto;padding:14px 28px;border:1px solid rgba(99,102,241,.14);border-radius:24px;background:linear-gradient(90deg,rgba(255,255,255,.9),rgba(238,242,255,.86),rgba(253,242,248,.88));color:#1e1b4b;font-size:clamp(28px,3.7vw,40px);line-height:1.08;letter-spacing:0;text-wrap:balance;overflow-wrap:anywhere;text-shadow:none;box-shadow:0 12px 30px rgba(99,102,241,.1)}.className{margin:8px 0 0;color:#475569;font-size:15px}.ribbon{margin:8px auto 8px;padding:10px 24px;border-color:rgba(99,102,241,.14);background:linear-gradient(90deg,rgba(224,231,255,.8),rgba(252,231,243,.8));color:#3730a3;font-size:15px;line-height:1.25;box-shadow:0 10px 24px rgba(99,102,241,.1)}.score{width:82px;height:82px;border-radius:24px;font-size:22px}.sign{bottom:28px;color:#64748b}.sign strong{color:#1e1b4b}.line{background:rgba(99,102,241,.28)}.signature:has(img){width:164px;min-height:56px;margin:5px 0 6px;padding:6px 12px;border-radius:14px;background:rgba(255,255,255,.34);box-shadow:0 8px 18px rgba(99,102,241,.08),inset 0 0 0 1px rgba(99,102,241,.14);backdrop-filter:blur(4px)}.signature:has(img) img{max-width:150px;max-height:44px;mix-blend-mode:multiply;filter:contrast(1.35) saturate(1.1);opacity:1}.title{font-family:'Nunito','Be Vietnam Pro',Arial,sans-serif;font-weight:900;text-transform:none}.eyebrow,.subtitle,.name,.className,.ribbon,.score,.sign{font-family:'Nunito','Be Vietnam Pro',Arial,sans-serif}.ribbon{text-transform:none;letter-spacing:0}.badgeIcon{background:linear-gradient(135deg,#38bdf8,#8b5cf6 52%,#ec4899);box-shadow:0 14px 30px rgba(124,58,237,.24)}.kidDecor{position:absolute;z-index:1;display:grid;place-items:center;font-family:'Nunito',Arial,sans-serif;font-size:26px;font-weight:900;filter:drop-shadow(0 8px 10px rgba(99,102,241,.18));animation:float 4s ease-in-out infinite}.kd1{left:9%;top:27%;color:#f59e0b}.kd2{right:10%;top:29%;color:#22c55e;animation-delay:.5s}.kd3{left:18%;bottom:24%;color:#ec4899;animation-delay:1s}.kd4{right:22%;bottom:22%;color:#38bdf8;animation-delay:1.4s}@media(max-width:760px){.kidDecor{display:none}}`;
    const certificateHtml = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeCertificateText(displayTitle)}</title><style id="certificateStyles">${certificateCss}${certificateLayoutCss}</style></head><body><div class="wrap"><main id="certificatePaper" class="paper"><span class="kidDecor kd1">★</span><span class="kidDecor kd2">✦</span><span class="kidDecor kd3">●</span><span class="kidDecor kd4">◆</span><span class="beam"></span><span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span><div class="topLogos"><div class="certLogo">${theme.certificateLogoImage ? `<img src="${theme.certificateLogoImage}" alt="Logo">` : ''}</div><div class="seal">${theme.certificateSealImage ? `<img src="${theme.certificateSealImage}" alt="Con dấu">` : ''}</div></div><section class="content"><div class="badgeIcon">✦</div><p class="eyebrow">${escapeCertificateText(migratedLesson.title)}</p><h1 class="title">${escapeCertificateText(displayTitle)}</h1><p class="subtitle">${escapeCertificateText(displaySubtitle)}</p><div class="nameWrap"><span class="halo"></span><div class="avatar">${escapeCertificateText(learnerAvatar)}</div><div class="name">${escapeCertificateText(learner)}</div>${classLine}</div><div class="ribbon">${escapeCertificateText(theme.certificateMessage || 'Đã hoàn thành bài học với tinh thần học tập tích cực.')}</div><div class="score">${score}/${total}<small>điểm</small></div></section><div class="sign"><span><strong>${escapeCertificateText(date)}</strong><span class="line"></span>Ngày hoàn thành</span><span class="teacher"><span>Giáo viên</span><span class="signature">${theme.certificateSignatureImage ? `<img src="${theme.certificateSignatureImage}" alt="Chữ ký">` : '<span class="line"></span>'}</span><strong>${escapeCertificateText(theme.authorName || 'Giáo viên')}</strong></span></div></main><div class="toolbar"><button class="printBtn" onclick="window.print()">In hoặc lưu PDF</button><button class="imageBtn" onclick="saveCertificateImage()">Lưu ảnh PNG</button></div></div><script>function saveCertificateImage(){const paper=document.getElementById('certificatePaper');const css=document.getElementById('certificateStyles').textContent;const width=paper.offsetWidth,height=paper.offsetHeight;const markup='<div xmlns="http://www.w3.org/1999/xhtml"><style>'+css+'</style>'+paper.outerHTML+'</div>';const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'"><foreignObject width="100%" height="100%">'+markup+'</foreignObject></svg>';const img=new Image();img.onload=function(){const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;const ctx=canvas.getContext('2d');ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.scale(2,2);ctx.drawImage(img,0,0);try{const a=document.createElement('a');a.download='vinh-danh-${escapeCertificateText(learner).replace(/\s+/g, '-').toLowerCase()}.png';a.href=canvas.toDataURL('image/png');a.click()}catch(e){alert('Không thể lưu ảnh vì trình duyệt chặn ảnh ngoài. Hãy dùng nút In hoặc lưu PDF.')}};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}</script></body></html>`;
    const certificateImagePayload = JSON.stringify({
      title: displayTitle,
      subtitle: displaySubtitle,
      lessonTitle: migratedLesson.title,
      learner,
      learnerClass: learnerClass.trim(),
      learnerAvatar,
      message: theme.certificateMessage || 'Đã hoàn thành bài học với tinh thần học tập tích cực.',
      score,
      total,
      date,
      teacher: theme.authorName || 'Giáo viên',
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      logoImage: theme.certificateLogoImage || '',
      sealImage: theme.certificateSealImage || '',
      signatureImage: theme.certificateSignatureImage || '',
    }).replace(/</g, '\\u003c');
    const certificateImageScript = `
const certificateImageData=${certificateImagePayload};
function certRoundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function certWrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines){const words=String(text||'').split(/\\s+/);let line='',lines=[];for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);lines.slice(0,maxLines).forEach((item,index)=>ctx.fillText(item,x,y+index*lineHeight));return Math.min(lines.length,maxLines)*lineHeight;}
function certFitText(ctx,text,maxWidth,maxSize,minSize){let size=maxSize;while(size>minSize){ctx.font='900 '+size+'px Nunito, Arial';if(ctx.measureText(String(text||'')).width<=maxWidth)return size;size-=2}return minSize;}
function certDownload(canvas,name){const a=document.createElement('a');a.download=name;a.href=canvas.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();}
function certLoadImage(src){return new Promise(resolve=>{if(!src)return resolve(null);const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});}
function certDrawContain(ctx,img,x,y,w,h){if(!img)return;const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight);const dw=img.naturalWidth*ratio,dh=img.naturalHeight*ratio;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
async function saveCertificateImage(){try{if(document.fonts&&document.fonts.ready){await document.fonts.ready}const d=certificateImageData;const scale=2,width=980,height=620;const canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;const ctx=canvas.getContext('2d');const logo=await certLoadImage(d.logoImage);const seal=await certLoadImage(d.sealImage);const signature=await certLoadImage(d.signatureImage);ctx.scale(scale,scale);const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#ecfeff');bg.addColorStop(.54,'#fdf2f8');bg.addColorStop(1,'#fff7ed');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);const glowA=ctx.createRadialGradient(180,120,0,180,120,280);glowA.addColorStop(0,String(d.primaryColor||'#6366f1')+'66');glowA.addColorStop(1,'transparent');ctx.fillStyle=glowA;ctx.fillRect(0,0,width,height);const glowB=ctx.createRadialGradient(820,92,0,820,92,250);glowB.addColorStop(0,String(d.secondaryColor||'#ec4899')+'5a');glowB.addColorStop(1,'transparent');ctx.fillStyle=glowB;ctx.fillRect(0,0,width,height);ctx.save();certRoundRect(ctx,34,34,width-68,height-68,34);ctx.fillStyle='rgba(255,255,255,.92)';ctx.fill();ctx.strokeStyle='rgba(99,102,241,.22)';ctx.lineWidth=1;ctx.stroke();ctx.restore();ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 25px Nunito, Arial';ctx.fillStyle='#f59e0b';ctx.fillText('★',112,180);ctx.fillStyle='#22c55e';ctx.fillText('✦',868,196);ctx.fillStyle='#ec4899';ctx.fillText('●',184,456);ctx.fillStyle='#38bdf8';ctx.fillText('◆',786,462);ctx.restore();if(logo){ctx.save();ctx.globalCompositeOperation='multiply';certDrawContain(ctx,logo,72,60,66,54);ctx.restore()}if(seal){ctx.save();ctx.globalCompositeOperation='multiply';certDrawContain(ctx,seal,842,62,66,60);ctx.restore()}ctx.save();ctx.translate(width/2,74);ctx.rotate(.16);const badge=ctx.createLinearGradient(-36,-36,36,36);badge.addColorStop(0,d.accentColor||'#f59e0b');badge.addColorStop(1,d.secondaryColor||'#ec4899');ctx.fillStyle=badge;certRoundRect(ctx,-36,-36,72,72,22);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 38px Nunito, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',0,3);ctx.restore();ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillStyle='#6366f1';ctx.font='900 12px Nunito, Arial';ctx.fillText(String(d.lessonTitle||'Video bài học').toUpperCase().slice(0,72),width/2,136);const titleGrad=ctx.createLinearGradient(260,0,720,0);titleGrad.addColorStop(0,'#2563eb');titleGrad.addColorStop(.5,'#7c3aed');titleGrad.addColorStop(1,'#db2777');ctx.fillStyle=titleGrad;ctx.font='900 44px Nunito, Arial';ctx.fillText(String(d.title||'Thư khen'),width/2,190);ctx.fillStyle='#64748b';ctx.font='900 16px Nunito, Arial';ctx.fillText(String(d.subtitle||'Hoàn thành bài học tương tác'),width/2,222);ctx.fillStyle='rgba(255,255,255,.08)';certRoundRect(ctx,width/2-28,238,56,56,18);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff';ctx.font='30px Nunito, Arial';ctx.fillText(d.learnerAvatar||'👦',width/2,277);const learnerText=String(d.learner||'Học sinh');const learnerSize=certFitText(ctx,learnerText,700,46,28);ctx.fillStyle='rgba(238,242,255,.88)';certRoundRect(ctx,140,306,700,78,24);ctx.fill();ctx.strokeStyle='rgba(99,102,241,.16)';ctx.stroke();ctx.fillStyle='#1e1b4b';ctx.font='900 '+learnerSize+'px Nunito, Arial';ctx.fillText(learnerText,width/2,356);if(d.learnerClass){ctx.fillStyle='#64748b';ctx.font='800 15px Nunito, Arial';ctx.fillText('Lớp: '+d.learnerClass,width/2,404)}ctx.fillStyle='#3730a3';ctx.font='900 16px Nunito, Arial';certWrapText(ctx,String(d.message||''),width/2,430,720,24,2);ctx.save();ctx.translate(width/2,506);ctx.rotate(-.06);const scoreGrad=ctx.createLinearGradient(-45,-45,45,45);scoreGrad.addColorStop(0,'#22c55e');scoreGrad.addColorStop(1,'#14b8a6');ctx.fillStyle=scoreGrad;certRoundRect(ctx,-46,-44,92,88,24);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 24px Nunito, Arial';ctx.fillText(String(d.score)+'/'+String(d.total),0,-4);ctx.font='900 12px Nunito, Arial';ctx.fillText('điểm',0,22);ctx.restore();ctx.fillStyle='#64748b';ctx.font='800 13px Nunito, Arial';ctx.fillText(String(d.date||''),150,555);ctx.fillText('Ngày hoàn thành',150,578);ctx.fillStyle='#64748b';ctx.font='800 13px Nunito, Arial';ctx.fillText('Giáo viên',830,514);if(signature){ctx.fillStyle='rgba(255,255,255,.58)';certRoundRect(ctx,748,524,164,50,14);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.38)';ctx.stroke();certDrawContain(ctx,signature,760,531,140,34)}ctx.fillStyle='#1e1b4b';ctx.font='900 16px Nunito, Arial';ctx.fillText(String(d.teacher||'Giáo viên'),830,604);certDownload(canvas,'vinh-danh-'+String(d.learner||'hoc-sinh').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^\\w-]+/g,'-').toLowerCase()+'.png')}catch(error){console.error(error);alert('Không thể lưu ảnh PNG trên trình duyệt này. Thầy cô dùng nút In hoặc lưu PDF giúp em nhé.')}};
`;
    const certificateHtmlWithImageSave = certificateHtml.replace(/<script>[\s\S]*?<\/script><\/body><\/html>$/, `<script>${certificateImageScript}</script></body></html>`);
    certificateWindow.document.write(certificateHtmlWithImageSave);
    certificateWindow.document.close();
    certificateWindow.focus();
  };

  const handleError = (e: any) => {
    console.error("YouTube Player Error:", e);
    setVideoError(true);
    setPlaying(false);
  };

  const handleStartLesson = () => {
    if (!learnerName.trim()) return;
    if (theme.requireLearnerClass && !learnerClass.trim()) return;
    playNotificationSound();
    setShowStartGate(false);
    setPlaying(true);
  };

  const handleAvatarSelect = (avatarIcon: string) => {
    setLearnerAvatar(avatarIcon);
    playNotificationSound();
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
      ? {
          background: `radial-gradient(circle at 14% 4%, rgba(255,255,255,.30), transparent 26%), radial-gradient(circle at 92% 92%, ${theme.accentColor}55, transparent 30%), linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 58%, ${theme.accentColor} 118%)`,
          borderColor: 'rgba(255,255,255,.34)',
          boxShadow: `0 30px 90px rgba(15,23,42,.34), inset 0 1px 0 rgba(255,255,255,.28), 0 0 0 1px ${theme.primaryColor}24`,
        }
      : {}),
  };

  const getSidebarQuestionStyle = (isAnswered: boolean, isActive: boolean) => {
    const style = theme.sidebarCardStyle || 'glow';
    if (isAnswered) {
      return {
        borderColor: 'rgba(16,185,129,.34)',
        background: 'linear-gradient(135deg, rgba(236,253,245,.96), rgba(209,250,229,.9))',
        color: '#047857',
        boxShadow: '0 10px 28px rgba(16,185,129,.12)',
      };
    }
    if (style === 'neon' || isActive) {
      return {
        borderColor: `${theme.primaryColor}aa`,
        background: `linear-gradient(135deg, ${theme.backgroundColor}, ${theme.primaryColor}24)`,
        color: '#ffffff',
        boxShadow: `0 0 0 1px ${theme.primaryColor}66, 0 0 26px ${theme.primaryColor}55`,
      };
    }
    if (style === 'solid') {
      return {
        borderColor: `${theme.primaryColor}55`,
        background: theme.primaryColor,
        color: '#ffffff',
        boxShadow: `0 16px 34px ${theme.primaryColor}24`,
      };
    }
    if (style === 'soft') {
      return {
        borderColor: 'rgba(226,232,240,.95)',
        background: '#f8fafc',
        color: '#334155',
        boxShadow: '0 8px 18px rgba(15,23,42,.06)',
      };
    }
    return {
      borderColor: `${theme.primaryColor}66`,
      background: `linear-gradient(135deg, #ffffff, ${theme.primaryColor}12)`,
      color: '#1e293b',
      boxShadow: `0 14px 34px ${theme.primaryColor}24`,
    };
  };

  const nextSidebarQuestionId = migratedLesson.questions.find(
    question => !answeredQuestions.includes(question.id) && (isAfterVideoQuestionMode || question.time >= playedSeconds - 0.5)
  )?.id;

  return (
    <div
      className="interactive-video-player h-full min-h-[100dvh] w-full overflow-y-auto overflow-x-hidden p-2 relative sm:flex sm:flex-col sm:items-center sm:justify-center sm:p-4"
      style={{
        fontFamily: `${theme.fontFamily}, Nunito, Arial, sans-serif`,
        fontSize: `${theme.fontScale || 100}%`,
        background: `radial-gradient(circle at 20% 0%, ${theme.primaryColor}44, transparent 32%), radial-gradient(circle at 80% 10%, ${theme.secondaryColor}33, transparent 30%), ${theme.backgroundColor}`,
      }}
    >
      <div className="video-bubble-layer" aria-hidden="true">
        <span style={{ '--bubble-left': '7%', '--bubble-size': '46px', '--bubble-duration': '17s', '--bubble-delay': '-4s', '--bubble-drift': '28px', '--bubble-opacity': '.24' } as React.CSSProperties} />
        <span style={{ '--bubble-left': '16%', '--bubble-size': '72px', '--bubble-duration': '22s', '--bubble-delay': '-11s', '--bubble-drift': '-34px', '--bubble-opacity': '.2', '--bubble-blur': '.2px' } as React.CSSProperties} />
        <span style={{ '--bubble-left': '31%', '--bubble-size': '38px', '--bubble-duration': '15s', '--bubble-delay': '-7s', '--bubble-drift': '42px', '--bubble-opacity': '.28' } as React.CSSProperties} />
        <span style={{ '--bubble-left': '47%', '--bubble-size': '96px', '--bubble-duration': '26s', '--bubble-delay': '-17s', '--bubble-drift': '-26px', '--bubble-opacity': '.18', '--bubble-blur': '.4px' } as React.CSSProperties} />
        <span style={{ '--bubble-left': '63%', '--bubble-size': '58px', '--bubble-duration': '19s', '--bubble-delay': '-2s', '--bubble-drift': '36px', '--bubble-opacity': '.23' } as React.CSSProperties} />
        <span style={{ '--bubble-left': '79%', '--bubble-size': '84px', '--bubble-duration': '24s', '--bubble-delay': '-13s', '--bubble-drift': '-42px', '--bubble-opacity': '.2' } as React.CSSProperties} />
        <span style={{ '--bubble-left': '93%', '--bubble-size': '34px', '--bubble-duration': '14s', '--bubble-delay': '-8s', '--bubble-drift': '-24px', '--bubble-opacity': '.3' } as React.CSSProperties} />
      </div>

      {/* Nút Quay lại */}
      {showStartGate && !videoError && (
        <div
          className="absolute inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-3 py-14 backdrop-blur-[2px] sm:items-center sm:p-4"
          style={{
            background: theme.startBackgroundImage
              ? `linear-gradient(rgba(2,6,23,.34), rgba(2,6,23,.42)), url("${theme.startBackgroundImage}") center/cover no-repeat`
              : `radial-gradient(circle at 20% 0%, ${theme.primaryColor}66, transparent 36%), linear-gradient(135deg, rgba(15,23,42,.94), rgba(49,46,129,.9))`,
          }}
        >
          <style>{`
            @keyframes startAvatarPulse {
              0%, 100% { box-shadow: 0 0 0 2px rgba(168,85,247,.18), 0 10px 22px rgba(124,58,237,.13); filter: brightness(1); }
              50% { box-shadow: 0 0 0 4px rgba(236,72,153,.22), 0 14px 28px rgba(124,58,237,.2); filter: brightness(1.06); }
            }
            @keyframes startAvatarIcon3d {
              0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
              45% { transform: translateY(-5px) rotate(4deg) scale(1.08); }
            }
          `}</style>
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-[24px] border border-white/20 bg-white p-4 text-center shadow-2xl sm:rounded-[28px] sm:p-6"
          >
            <h2 className="mb-2 text-2xl font-black sm:text-3xl" style={{ color: theme.primaryColor }}>{theme.startTitle || 'Vào bài học'}</h2>
            <p className="mb-5 text-sm font-bold text-slate-500">{theme.startSubtitle || 'Nhập họ tên, lớp và chọn nhân vật đại diện của em.'}</p>
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
            {theme.requireLearnerClass && (
              <input
                value={learnerClass}
                onChange={(event) => setLearnerClass(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleStartLesson();
                }}
                placeholder="Lớp"
                className="mb-4 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-base font-bold text-slate-800 outline-none focus:border-purple-400"
              />
            )}
            <div className="mb-5 grid grid-cols-3 gap-2 [perspective:760px] min-[390px]:grid-cols-6">
              {avatarOptions.map((avatar, index) => {
                const selected = learnerAvatar === avatar.icon;
                return (
                <motion.button
                  key={avatar.label}
                  type="button"
                  onClick={() => handleAvatarSelect(avatar.icon)}
                  onMouseEnter={() => playNotificationSound()}
                  aria-label={avatar.label}
                  title={avatar.label}
                  initial={{ opacity: 0, y: 12, rotateX: -18 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.24 }}
                  whileHover={{ y: -3, scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  className={`relative grid h-12 place-items-center rounded-2xl border-2 bg-white text-2xl transition sm:h-14 sm:text-3xl ${selected ? 'scale-105 border-purple-500 shadow-lg' : 'border-slate-200 hover:border-purple-200 hover:shadow-md'}`}
                  style={selected ? { animation: 'startAvatarPulse 1.25s ease-in-out infinite' } : undefined}
                >
                  <span
                    className="relative inline-block leading-none drop-shadow-[0_6px_6px_rgba(15,23,42,0.18)]"
                    style={{ animation: `startAvatarIcon3d ${1.65 + index * 0.08}s ease-in-out infinite` }}
                  >
                    {avatar.icon}
                  </span>
                </motion.button>
              );
              })}
            </div>
            <button
              type="button"
              onClick={handleStartLesson}
              className="w-full rounded-2xl px-5 py-3 text-base font-black text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
              disabled={!learnerName.trim() || (theme.requireLearnerClass && !learnerClass.trim())}
            >
              {theme.startButtonText || 'Bắt đầu học'}
            </button>
          </motion.div>
        </div>
      )}

      <button
        onClick={onBack}
        className="absolute left-2 top-2 z-50 bg-white/85 p-2 rounded-full shadow-lg hover:bg-white transition-all text-purple-700 sm:left-4 sm:top-4 sm:p-3"
      >
        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <div className={`relative z-10 w-full ${theme.layout === 'full' ? 'max-w-6xl' : theme.layout === 'sidebar' ? 'max-w-6xl' : 'max-w-5xl'} ${theme.layout === 'sidebar' ? 'grid grid-cols-1 lg:grid-cols-[1fr_260px]' : ''} bg-black shadow-2xl overflow-hidden border-2 sm:border-8 border-white/40 backdrop-blur-sm`}
        style={{ borderRadius: theme.radius }}>

        <div className="bg-slate-950">
        {!videoError && (
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950 px-3 py-2 text-white sm:gap-3 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-black sm:h-8 sm:w-8 sm:text-xs" style={{ backgroundColor: theme.primaryColor }}>
                {theme.logoImage ? <img src={theme.logoImage} alt="Logo" className="h-full w-full rounded-full object-contain" /> : (theme.logoText || 'GV')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black sm:text-sm">{theme.publishTitle || lesson.title}</p>
                {(theme.publishSubtitle || theme.authorName) && (
                  <p className="truncate text-[11px] text-white/60">{theme.publishSubtitle || theme.authorName}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {learnerName && (
                <div className="max-w-[104px] truncate rounded-full bg-white/10 px-2 py-1.5 text-[11px] font-black text-white sm:max-w-[160px] sm:px-3 sm:py-2 sm:text-xs">
                  {learnerAvatar} {learnerName}
                </div>
              )}
              {theme.showScoreReport && (
                <div className="rounded-full bg-white/10 px-2 py-1.5 text-[11px] font-black text-white sm:px-3 sm:py-2 sm:text-xs">
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
            onEnded={handleVideoEnded}
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
              className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto p-2 sm:items-center sm:p-4"
              style={questionOverlayStyle}
            >
              <motion.div
                initial={{ scale: 0.94, y: 24, filter: 'blur(6px)' }}
                animate={{ scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ scale: 0.94, y: 24, filter: 'blur(6px)' }}
                transition={{ type: 'spring', damping: 20, stiffness: 220 }}
                className={`${questionCardClass} video-question-font relative my-2 max-h-[calc(100dvh-120px)] w-full max-w-[95vw] overflow-y-auto rounded-[20px] border p-3 shadow-2xl sm:my-0 sm:max-w-xl sm:rounded-[24px] sm:p-5 md:max-w-2xl md:p-6`}
                style={questionCardStyle}
              >
                <motion.div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
                  style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0"
                  initial={{ x: '-120%' }}
                  animate={{ x: '120%' }}
                  transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.6 }}
                />
                <div className="mb-3 sm:mb-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full px-3 py-1 text-[11px] font-black uppercase text-white shadow-sm" style={{ background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}>
                      Câu hỏi tương tác
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                      +{currentQuestion.points || 10} điểm
                    </span>
                  </div>
                  <h3
                    className="question-title-text text-left text-lg font-bold leading-tight sm:text-2xl md:text-3xl"
                    style={{ color: theme.questionStyle === 'card' ? theme.textColor : '#ffffff' }}
                  >
                    {currentQuestion.text}
                  </h3>
                  <p className={`mt-2 text-sm font-semibold ${theme.questionStyle === 'card' ? 'text-slate-500' : 'text-white/70'}`}>
                    {getQuestionType(currentQuestion) === 'short-answer' || getQuestionType(currentQuestion) === 'fill-blank'
                      ? 'Nhập câu trả lời, sau đó kiểm tra đáp án.'
                      : 'Chọn đáp án đúng nhất, sau đó kiểm tra kết quả.'}
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
                <div className="mb-4 flex flex-col gap-2.5 sm:mb-5 sm:gap-3">
                  {(getQuestionType(currentQuestion) === 'multiple-choice' || getQuestionType(currentQuestion) === 'true-false') && currentQuestion.options
                    .map((optText, optIndex) => ({ optText, optIndex }))
                    .filter(({ optText }) => String(optText || '').trim())
                    .map(({ optText, optIndex }) => (
                    <motion.button
                      key={optIndex}
                      onClick={() => setSelectedOption(optIndex)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: optIndex * 0.06, duration: 0.24 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                      className={`question-3d-option group relative flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all sm:gap-3 sm:px-4 sm:py-3.5
                        ${selectedOption === optIndex
                          ? 'border-transparent bg-white shadow-lg ring-2 ring-slate-900/10'
                          : 'border-slate-200 bg-white/95 hover:border-slate-300 hover:bg-white hover:shadow-md'
                        }
                        ${feedback === 'correct' && selectedOption === optIndex ? 'bg-green-100 ring-2 ring-green-500' : ''}
                        ${feedback === 'incorrect' && selectedOption === optIndex ? 'bg-red-100 ring-2 ring-red-500' : ''}
                      `}
                    >
                      <span
                        className={`question-3d-label flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition
                          ${selectedOption === optIndex ? 'text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900'}
                          ${feedback === 'correct' && selectedOption === optIndex ? '!bg-green-500 !text-white' : ''}
                          ${feedback === 'incorrect' && selectedOption === optIndex ? '!bg-red-500 !text-white' : ''}
                        `}
                        style={selectedOption === optIndex && !feedback ? { background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` } : undefined}
                      >
                        {optionLabels[optIndex]}
                      </span>
                      <span className={`question-option-text min-w-0 flex-1 text-sm font-bold leading-snug sm:text-base
                        ${selectedOption === optIndex ? 'text-slate-950' : 'text-gray-700'}
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
                    </motion.button>
                  ))}
                  {getQuestionType(currentQuestion) === 'image-choice' && (currentQuestion.imageOptions || []).map((option, optIndex) => (
                    <motion.button
                      key={optIndex}
                      onClick={() => setSelectedOption(optIndex)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: optIndex * 0.06, duration: 0.24 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                      className={`question-3d-option group grid w-full gap-3 rounded-2xl border p-3 text-left transition-all sm:grid-cols-[150px_1fr]
                        ${selectedOption === optIndex
                          ? 'border-transparent bg-white shadow-lg ring-2 ring-slate-900/10'
                          : 'border-slate-200 bg-white/95 hover:border-slate-300 hover:bg-white hover:shadow-md'
                        }
                        ${feedback === 'correct' && selectedOption === optIndex ? 'bg-green-100 ring-2 ring-green-500' : ''}
                        ${feedback === 'incorrect' && selectedOption === optIndex ? 'bg-red-100 ring-2 ring-red-500' : ''}
                      `}
                    >
                      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs font-black text-slate-400">
                        {option.imageUrl ? <img src={option.imageUrl} alt={option.text || `Lua chon ${optionLabels[optIndex]}`} className="h-full w-full object-cover" /> : optionLabels[optIndex]}
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`question-3d-label flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition
                            ${selectedOption === optIndex ? 'text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900'}
                          `}
                          style={selectedOption === optIndex && !feedback ? { background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` } : undefined}
                        >
                          {optionLabels[optIndex]}
                        </span>
                        <span className={`question-option-text min-w-0 flex-1 text-sm font-bold leading-snug sm:text-base ${selectedOption === optIndex ? 'text-slate-950' : 'text-gray-700'}`}>
                          {option.text || `Lua chon ${optionLabels[optIndex]}`}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                  {(getQuestionType(currentQuestion) === 'short-answer' || getQuestionType(currentQuestion) === 'fill-blank') && (
                    <input
                      value={textAnswer}
                      onChange={(event) => setTextAnswer(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleAnswer();
                      }}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-black text-slate-800 outline-none focus:border-purple-400"
                      placeholder={getQuestionType(currentQuestion) === 'fill-blank' ? 'Nhập từ/cụm từ còn thiếu' : 'Nhập câu trả lời'}
                      autoFocus
                    />
                  )}
                </div>

                {/* 2 nút xếp ngang */}
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 sm:justify-center">
                  <button
                    onClick={handleAnswer}
                    disabled={feedback !== null || ((getQuestionType(currentQuestion) === 'short-answer' || getQuestionType(currentQuestion) === 'fill-blank') ? !textAnswer.trim() : selectedOption === null)}
                    className={`question-3d-action question-action-text flex-1 rounded-2xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all sm:py-3 sm:text-base
                            ${feedback !== null || ((getQuestionType(currentQuestion) === 'short-answer' || getQuestionType(currentQuestion) === 'fill-blank') ? !textAnswer.trim() : selectedOption === null)
                        ? 'bg-gray-400/50 cursor-not-allowed'
                        : 'hover:brightness-105 active:scale-95'
                      }
                        `}
                    style={feedback === null && !((getQuestionType(currentQuestion) === 'short-answer' || getQuestionType(currentQuestion) === 'fill-blank') ? !textAnswer.trim() : selectedOption === null) ? { background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.secondaryColor})` } : undefined}
                  >
                    Kiểm tra đáp án
                  </button>

                  {/* Nút xem lại video */}
                  <button
                    onClick={() => {
                      const rewatchTime = isAfterVideoQuestionMode ? lesson.startTime : Math.max(0, currentQuestion.time - 10);
                      playerRef.current?.seekTo(rewatchTime);
                      setCurrentQuestion(null);
                      setSelectedOption(null);
                      setTextAnswer('');
                      setPlaying(true);
                    }}
                    className="question-3d-action question-action-text flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95 sm:py-3 sm:text-base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 19 2 12 11 5 11 19"></polygon>
                      <polygon points="22 19 13 12 22 5 22 19"></polygon>
                    </svg>
                    Xem lại
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
              className="absolute inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-3 py-8 backdrop-blur-md sm:items-center sm:p-4"
            >
              <motion.div
                initial={{ scale: 0.92, y: 18 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 18 }}
                className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/20 bg-white text-center shadow-2xl"
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
                    <span className="text-xl font-black">{earnedPoints} / {totalPoints} điểm</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={handleCertificateWithReport}
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
              className="absolute inset-0 z-50 bg-gradient-to-br from-red-900/90 to-orange-900/90 backdrop-blur-md flex items-start justify-center overflow-y-auto p-3 py-8 sm:items-center sm:p-4"
            >
              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  transition: { type: "spring", damping: 10 }
                }}
                className="bg-white rounded-[24px] p-5 max-w-lg w-full shadow-2xl border-4 border-red-300 text-center sm:rounded-[32px] sm:p-8"
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
              className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] pointer-events-auto cursor-pointer text-purple-600 hover:bg-white sm:h-24 sm:w-24"
            >
              <Play fill="currentColor" className="ml-1 h-8 w-8 sm:ml-2 sm:h-12 sm:w-12" />
            </motion.button>
          </div>
        )}
        </div>

        {!videoError && (theme.footerLeftText || theme.footerRightText || theme.guideText) && (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-slate-950 px-3 py-2 text-[11px] font-bold text-white sm:px-4 sm:py-3 sm:text-xs">
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
              {migratedLesson.questions.map((q, index) => {
                const isAnswered = answeredQuestions.includes(q.id);
                const isActive = currentQuestion?.id === q.id;
                const isUpcoming = !isAnswered && !currentQuestion && q.id === nextSidebarQuestionId;
                const shouldPulse = theme.sidebarCardPulse && !isAnswered;
                return (
                  <div
                    key={q.id}
                    className={`min-h-[68px] rounded-2xl border px-4 py-3 text-sm transition-all ${shouldPulse ? 'video-question-pulse' : ''}`}
                    style={getSidebarQuestionStyle(isAnswered, isActive || isUpcoming)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/85 text-base shadow-sm">
                        {theme.sidebarIcon || '👩‍🏫'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[0.95rem] font-black leading-tight">Câu {index + 1}</p>
                        <p className="mt-1 font-mono text-[0.75rem] font-bold opacity-75">
                          {isAfterVideoQuestionMode ? 'Sau video' : `${Math.floor(q.time / 60)}:${String(q.time % 60).padStart(2, '0')}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Controls below video */}
      {!videoError && (
        <div className="relative z-10 mt-4 flex w-full justify-center gap-4 px-2 sm:mt-8">
          <button onClick={handleReplay} className="bg-white/80 backdrop-blur-md hover:bg-white text-purple-900 px-5 py-3 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 border border-white/50 sm:px-8">
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
