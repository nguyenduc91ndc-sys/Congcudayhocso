import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  Check,
  Clock3,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

type ToolTab = 'timer' | 'noise';
type TimerMode = 'countdown' | 'stopwatch';

const timerPresets = [
  { label: '1 phút', seconds: 60 },
  { label: '3 phút', seconds: 180 },
  { label: '5 phút', seconds: 300 },
  { label: '10 phút', seconds: 600 },
  { label: '15 phút', seconds: 900 },
  { label: '20 phút', seconds: 1200 },
];

const noiseStates = [
  { max: 34, label: 'Yên tĩnh', hint: 'Tập trung rất tốt', emoji: '🤫', tone: 'quiet' },
  { max: 59, label: 'Rất tốt', hint: 'Âm lượng phù hợp', emoji: '✨', tone: 'good' },
  { max: 79, label: 'Hơi ồn', hint: 'Cùng nói nhỏ lại', emoji: '👂', tone: 'warning' },
  { max: 100, label: 'Quá ồn', hint: 'Hạ âm lượng nhé', emoji: '🔔', tone: 'loud' },
];

const classroomSounds = {
  countdown: '/sounds/classroom-tools/countdown-tick.mp3',
  finish: '/sounds/classroom-tools/timer-finish.mp3',
  warning: '/sounds/classroom-tools/noise-warning.mp3',
  start: '/sounds/classroom-tools/timer-start.mp3',
};

type AudioHandle = { current: HTMLAudioElement | null };

let toolAudioContext: AudioContext | null = null;

function getToolAudioContext() {
  if (!toolAudioContext) toolAudioContext = new AudioContext();
  if (toolAudioContext.state === 'suspended') void toolAudioContext.resume();
  return toolAudioContext;
}

function playTone(frequency: number, duration = 0.09, volume = 0.05, delay = 0) {
  try {
    const context = getToolAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  } catch {
    // Trình duyệt có thể chặn âm thanh cho tới lần tương tác tiếp theo.
  }
}

function playFinishChime() {
  playTone(659.25, 0.16, 0.055, 0);
  playTone(783.99, 0.16, 0.055, 0.18);
  playTone(1046.5, 0.34, 0.06, 0.36);
}

function playSecondTickAccent(volume: number) {
  if (volume <= 0) return;
  try {
    const context = getToolAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + 0.006;
    const peakVolume = 0.025 + (volume / 100) * 0.13;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1320, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(720, startAt + 0.055);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peakVolume, startAt + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.065);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.075);
  } catch {
    // Giữ tệp MP3 làm phương án dự phòng nếu Web Audio chưa khả dụng.
  }
}

function playSoundFile(handle: AudioHandle, source: string, volume: number, startAt = 0, fallback?: () => void) {
  try {
    const audio = handle.current ?? new Audio(source);
    handle.current = audio;
    audio.preload = 'auto';
    audio.pause();
    audio.currentTime = Math.max(0, startAt);
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    void audio.play().catch(() => fallback?.());
  } catch {
    fallback?.();
  }
}

function stopSoundFile(handle: AudioHandle) {
  if (!handle.current) return;
  handle.current.pause();
  handle.current.currentTime = 0;
}

function playAudibleSecondTick(handle: AudioHandle, volume: number) {
  if (volume <= 0) return;
  playSoundFile(handle, classroomSounds.countdown, volume);
  playSecondTickAccent(volume);
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function ClassroomToolsPage() {
  const [activeTool, setActiveTool] = useState<ToolTab>('timer');
  const [timerMode, setTimerMode] = useState<TimerMode>('countdown');
  const [duration, setDuration] = useState(300);
  const [remaining, setRemaining] = useState(300);
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [finishSound, setFinishSound] = useState(true);
  const [secondTickSound, setSecondTickSound] = useState(true);
  const [timerVolume, setTimerVolume] = useState(72);
  const [secondTickVolume, setSecondTickVolume] = useState(65);
  const [isPresentation, setIsPresentation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [sensitivity, setSensitivity] = useState(55);
  const [noiseAlertEnabled, setNoiseAlertEnabled] = useState(true);
  const [noiseAlertThreshold, setNoiseAlertThreshold] = useState(80);
  const [noiseAlertCooldown, setNoiseAlertCooldown] = useState(10);
  const [noiseAlertVolume, setNoiseAlertVolume] = useState(68);
  const [microphoneError, setMicrophoneError] = useState('');

  const stageRef = useRef<HTMLElement | null>(null);
  const countdownEndRef = useRef(0);
  const stopwatchStartedRef = useRef(0);
  const stopwatchBaseRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const finishPlayedRef = useRef(false);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
  const finishAudioRef = useRef<HTMLAudioElement | null>(null);
  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  const noiseWarningAudioRef = useRef<HTMLAudioElement | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const microphoneContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedNoiseRef = useRef(0);
  const lastNoisePaintRef = useRef(0);
  const sensitivityRef = useRef(sensitivity);
  const noiseAlertSettingsRef = useRef({ enabled: noiseAlertEnabled, threshold: noiseAlertThreshold, cooldown: noiseAlertCooldown, volume: noiseAlertVolume });
  const noiseAboveThresholdSinceRef = useRef<number | null>(null);
  const lastNoiseAlertAtRef = useRef(Number.NEGATIVE_INFINITY);

  const displayedSeconds = timerMode === 'countdown' ? remaining : elapsed;
  const timerMinutes = Math.floor(duration / 60);
  const timerSeconds = duration % 60;
  const timerProgress = timerMode === 'countdown'
    ? (duration > 0 ? remaining / duration : 0)
    : (elapsed % 60) / 60;
  const timerUrgent = timerMode === 'countdown' && timerRunning && remaining <= 10;
  const circumference = 2 * Math.PI * 94;
  const noiseState = useMemo(
    () => noiseStates.find((state) => noiseLevel <= state.max) ?? noiseStates[noiseStates.length - 1],
    [noiseLevel],
  );

  useEffect(() => {
    if (!timerRunning) return;

    const updateTimer = () => {
      if (timerMode === 'countdown') {
        const nextRemaining = Math.max(0, Math.ceil((countdownEndRef.current - Date.now()) / 1000));
        setRemaining(nextRemaining);

        if (nextRemaining > 0 && nextRemaining !== lastTickRef.current) {
          lastTickRef.current = nextRemaining;
          if (secondTickSound) playAudibleSecondTick(countdownAudioRef, secondTickVolume);
        }

        if (nextRemaining === 0) {
          setTimerRunning(false);
          setTimerCompleted(true);
          stopSoundFile(countdownAudioRef);
          lastTickRef.current = null;
          if (!finishPlayedRef.current) {
            finishPlayedRef.current = true;
            if (finishSound) playSoundFile(finishAudioRef, classroomSounds.finish, timerVolume, 0, playFinishChime);
          }
        }
      } else {
        const nextElapsed = stopwatchBaseRef.current + Math.floor((Date.now() - stopwatchStartedRef.current) / 1000);
        setElapsed(nextElapsed);
      }
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 150);
    return () => window.clearInterval(interval);
  }, [finishSound, secondTickSound, secondTickVolume, timerMode, timerRunning, timerVolume]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setIsPresentation(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPresentation && !document.fullscreenElement) setIsPresentation(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPresentation]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    if (!secondTickSound) stopSoundFile(countdownAudioRef);
    if (countdownAudioRef.current) countdownAudioRef.current.volume = secondTickVolume / 100;
    if (finishAudioRef.current) finishAudioRef.current.volume = timerVolume / 100;
  }, [secondTickSound, secondTickVolume, timerVolume]);

  useEffect(() => {
    noiseAlertSettingsRef.current = { enabled: noiseAlertEnabled, threshold: noiseAlertThreshold, cooldown: noiseAlertCooldown, volume: noiseAlertVolume };
    if (!noiseAlertEnabled) stopSoundFile(noiseWarningAudioRef);
  }, [noiseAlertCooldown, noiseAlertEnabled, noiseAlertThreshold, noiseAlertVolume]);

  useEffect(() => {
    const soundEntries: [AudioHandle, string][] = [
      [countdownAudioRef, classroomSounds.countdown],
      [finishAudioRef, classroomSounds.finish],
      [startAudioRef, classroomSounds.start],
      [noiseWarningAudioRef, classroomSounds.warning],
    ];
    soundEntries.forEach(([handle, source]) => {
      handle.current = new Audio(source);
      handle.current.preload = 'auto';
      handle.current.load();
    });
  }, []);

  const releaseMicrophone = () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (microphoneContextRef.current && microphoneContextRef.current.state !== 'closed') {
      void microphoneContextRef.current.close();
    }
    microphoneContextRef.current = null;
  };

  useEffect(() => () => {
    releaseMicrophone();
    stopSoundFile(countdownAudioRef);
    stopSoundFile(finishAudioRef);
    stopSoundFile(startAudioRef);
    stopSoundFile(noiseWarningAudioRef);
  }, []);

  const stopListening = () => {
    releaseMicrophone();
    setIsListening(false);
    setNoiseLevel(0);
    smoothedNoiseRef.current = 0;
    noiseAboveThresholdSinceRef.current = null;
    lastNoiseAlertAtRef.current = Number.NEGATIVE_INFINITY;
    stopSoundFile(noiseWarningAudioRef);
  };

  const startListening = async () => {
    setMicrophoneError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneError('Trình duyệt này chưa hỗ trợ quyền micro. Hãy thử Chrome hoặc Edge phiên bản mới.');
      return;
    }

    try {
      releaseMicrophone();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      microphoneStreamRef.current = stream;
      microphoneContextRef.current = context;
      analyserRef.current = analyser;
      setIsListening(true);

      const samples = new Uint8Array(analyser.fftSize);
      const measure = (time: number) => {
        if (!analyserRef.current) return;
        analyser.getByteTimeDomainData(samples);
        let sumSquares = 0;
        for (const sample of samples) {
          const centered = (sample - 128) / 128;
          sumSquares += centered * centered;
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        const decibels = 20 * Math.log10(Math.max(rms, 0.00001));
        const mappedLevel = Math.max(0, Math.min(100, ((decibels + 60) / 45) * 100 + (sensitivityRef.current - 55) * 0.8));
        smoothedNoiseRef.current = smoothedNoiseRef.current * 0.72 + mappedLevel * 0.28;
        const measuredLevel = Math.round(smoothedNoiseRef.current);
        const alertSettings = noiseAlertSettingsRef.current;
        if (alertSettings.enabled && measuredLevel >= alertSettings.threshold) {
          noiseAboveThresholdSinceRef.current ??= time;
          const loudLongEnough = time - noiseAboveThresholdSinceRef.current >= 1200;
          const cooldownComplete = time - lastNoiseAlertAtRef.current >= alertSettings.cooldown * 1000;
          if (loudLongEnough && cooldownComplete) {
            lastNoiseAlertAtRef.current = time;
            noiseAboveThresholdSinceRef.current = time;
            playSoundFile(noiseWarningAudioRef, classroomSounds.warning, alertSettings.volume, 0, () => {
              playTone(659.25, 0.14, 0.05, 0);
              playTone(523.25, 0.2, 0.05, 0.18);
            });
          }
        } else {
          noiseAboveThresholdSinceRef.current = null;
        }
        if (time - lastNoisePaintRef.current > 45) {
          setNoiseLevel(measuredLevel);
          lastNoisePaintRef.current = time;
        }
        animationFrameRef.current = requestAnimationFrame(measure);
      };
      animationFrameRef.current = requestAnimationFrame(measure);
    } catch (error) {
      releaseMicrophone();
      setIsListening(false);
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');
      setMicrophoneError(denied
        ? 'Bạn chưa cho phép dùng micro. Hãy bấm biểu tượng ổ khóa trên thanh địa chỉ, cho phép Micro rồi thử lại.'
        : 'Chưa thể mở micro. Hãy kiểm tra micro đang kết nối và thử lại.');
    }
  };

  const selectTool = (tool: ToolTab) => {
    if (tool !== 'noise' && isListening) stopListening();
    setActiveTool(tool);
  };

  const toggleTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
      stopSoundFile(countdownAudioRef);
      if (timerMode === 'stopwatch') stopwatchBaseRef.current = elapsed;
      return;
    }

    setTimerCompleted(false);
    finishPlayedRef.current = false;
    lastTickRef.current = null;
    if (timerMode === 'countdown' && secondTickSound) {
      try { void getToolAudioContext().resume(); } catch { /* MP3 vẫn tiếp tục là phương án dự phòng. */ }
    }
    if (finishSound || secondTickSound) playSoundFile(startAudioRef, classroomSounds.start, Math.min(timerVolume, 58), 0, () => playTone(659.25, 0.08, 0.035));
    if (timerMode === 'countdown') {
      const startFrom = remaining > 0 ? remaining : duration;
      setRemaining(startFrom);
      countdownEndRef.current = Date.now() + startFrom * 1000;
    } else {
      stopwatchBaseRef.current = elapsed;
      stopwatchStartedRef.current = Date.now();
    }
    setTimerRunning(true);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    stopSoundFile(countdownAudioRef);
    stopSoundFile(finishAudioRef);
    setTimerCompleted(false);
    finishPlayedRef.current = false;
    setRemaining(duration);
    setElapsed(0);
    lastTickRef.current = null;
    stopwatchBaseRef.current = 0;
  };

  const setCountdownDuration = (nextDuration: number) => {
    const safeDuration = Math.max(1, Math.min(nextDuration, 99 * 60 + 59));
    setDuration(safeDuration);
    setRemaining(safeDuration);
    setTimerCompleted(false);
    finishPlayedRef.current = false;
  };

  const switchTimerMode = (mode: TimerMode) => {
    setTimerRunning(false);
    stopSoundFile(countdownAudioRef);
    setTimerMode(mode);
    setTimerCompleted(false);
    finishPlayedRef.current = false;
    setRemaining(duration);
    setElapsed(0);
    lastTickRef.current = null;
    stopwatchBaseRef.current = 0;
  };

  const togglePresentation = async () => {
    if (isPresentation) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setIsPresentation(false);
      return;
    }
    setIsPresentation(true);
    if (stageRef.current?.requestFullscreen) await stageRef.current.requestFullscreen().catch(() => undefined);
  };

  const resetNoiseBaseline = () => {
    smoothedNoiseRef.current = 0;
    setNoiseLevel(0);
    noiseAboveThresholdSinceRef.current = null;
  };

  const previewTimerSound = () => {
    playSoundFile(finishAudioRef, classroomSounds.finish, timerVolume, 0, playFinishChime);
  };

  const previewNoiseWarning = () => {
    lastNoiseAlertAtRef.current = performance.now();
    playSoundFile(noiseWarningAudioRef, classroomSounds.warning, noiseAlertVolume, 0, () => {
      playTone(659.25, 0.14, 0.05, 0);
      playTone(523.25, 0.2, 0.05, 0.18);
    });
  };

  return (
    <section className="classroom-tools-page" aria-label="Công cụ lớp học">
      <header className="classroom-tools-hero">
        <div className="classroom-tools-hero-copy">
          <span className="classroom-tools-kicker"><Sparkles size={14} /> CÔNG CỤ TRÌNH CHIẾU</span>
          <h1>Giữ nhịp lớp học thật vui</h1>
          <p>Đồng hồ trực quan và tín hiệu độ ồn giúp học sinh chủ động tập trung, không làm gián đoạn tiết học.</p>
        </div>
        <div className="classroom-tools-hero-art" aria-hidden="true">
          <span className="tools-art-clock"><Clock3 size={38} /></span>
          <span className="tools-art-wave">⌁</span>
          <span className="tools-art-spark">✦</span>
        </div>
      </header>

      <div className="classroom-tools-tabs" role="tablist" aria-label="Chọn công cụ">
        <button type="button" role="tab" aria-selected={activeTool === 'timer'} className={activeTool === 'timer' ? 'active' : ''} onClick={() => selectTool('timer')}>
          <span><Clock3 size={21} /></span>
          <div><strong>Đồng hồ</strong><small>Đếm ngược &amp; bấm giờ</small></div>
          {timerRunning && <em>Đang chạy</em>}
        </button>
        <button type="button" role="tab" aria-selected={activeTool === 'noise'} className={activeTool === 'noise' ? 'active' : ''} onClick={() => selectTool('noise')}>
          <span><Mic size={21} /></span>
          <div><strong>Độ ồn</strong><small>Phản hồi trực quan</small></div>
          {isListening && <em>Đang nghe</em>}
        </button>
      </div>

      <section ref={stageRef} className={`classroom-tool-stage ${activeTool} ${isPresentation ? 'is-presentation' : ''}`}>
        <div className="classroom-tool-stage-top">
          <div>
            <span>{activeTool === 'timer' ? '⏱️ QUẢN LÝ THỜI GIAN' : '🎙️ KHÔNG GIAN TẬP TRUNG'}</span>
            <strong>{activeTool === 'timer' ? 'Mỗi hoạt động đều đúng nhịp' : 'Cả lớp cùng giữ âm lượng đẹp'}</strong>
          </div>
          <button type="button" className="classroom-presentation-button" onClick={() => void togglePresentation()}>
            {isPresentation ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            <span>{isPresentation ? 'Thu nhỏ' : 'Trình chiếu'}</span>
          </button>
        </div>

        {activeTool === 'timer' ? (
          <div className="classroom-timer-layout">
            <div className={`classroom-timer-focus ${timerUrgent ? 'urgent' : ''} ${timerCompleted ? 'completed' : ''}`}>
              <div className="classroom-timer-mode" role="tablist" aria-label="Chế độ đồng hồ">
                <button type="button" className={timerMode === 'countdown' ? 'active' : ''} onClick={() => switchTimerMode('countdown')}>Đếm ngược</button>
                <button type="button" className={timerMode === 'stopwatch' ? 'active' : ''} onClick={() => switchTimerMode('stopwatch')}>Bấm giờ</button>
              </div>

              <div className="classroom-timer-ring" aria-live="polite">
                <svg viewBox="0 0 220 220" aria-hidden="true">
                  <defs>
                    <linearGradient id="happyTimerGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#9b5cff" />
                      <stop offset="55%" stopColor="#ed62b8" />
                      <stop offset="100%" stopColor="#ff9f5f" />
                    </linearGradient>
                  </defs>
                  <circle className="timer-ring-track" cx="110" cy="110" r="94" />
                  <circle
                    className="timer-ring-progress"
                    cx="110"
                    cy="110"
                    r="94"
                    style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - Math.max(0, Math.min(1, timerProgress))) }}
                  />
                </svg>
                <div className="timer-ring-content">
                  <span>{timerCompleted ? 'HOÀN THÀNH' : timerRunning ? 'ĐANG CHẠY' : 'SẴN SÀNG'}</span>
                  <strong>{formatTime(displayedSeconds)}</strong>
                  <small>{timerMode === 'countdown' ? 'thời gian còn lại' : 'thời gian đã qua'}</small>
                </div>
                <i className="timer-orbit-dot" />
              </div>

              <div className="classroom-timer-actions">
                <button type="button" className={`timer-primary ${timerRunning ? 'pause' : ''}`} onClick={toggleTimer}>
                  {timerRunning ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
                  {timerRunning ? 'Tạm dừng' : timerCompleted ? 'Chạy lại' : 'Bắt đầu'}
                </button>
                <button type="button" className="timer-reset" onClick={resetTimer}><RotateCcw size={19} /> Đặt lại</button>
              </div>
            </div>

            <aside className="classroom-timer-settings">
              {timerMode === 'countdown' ? (
                <>
                  <div className="tool-setting-heading"><div><span>THIẾT LẬP</span><h3>Chọn thời gian</h3></div><Clock3 size={22} /></div>
                  <div className="timer-input-row">
                    <label><span>Phút</span><input type="number" min="0" max="99" value={timerMinutes} disabled={timerRunning} onChange={(event) => setCountdownDuration(Number(event.target.value || 0) * 60 + timerSeconds)} /></label>
                    <strong>:</strong>
                    <label><span>Giây</span><input type="number" min="0" max="59" value={timerSeconds} disabled={timerRunning} onChange={(event) => setCountdownDuration(timerMinutes * 60 + Number(event.target.value || 0))} /></label>
                  </div>
                  <div className="timer-preset-title"><span>⚡</span> Mốc nhanh</div>
                  <div className="timer-preset-grid">
                    {timerPresets.map((preset) => (
                      <button type="button" key={preset.seconds} className={duration === preset.seconds ? 'active' : ''} disabled={timerRunning} onClick={() => setCountdownDuration(preset.seconds)}>{preset.label}</button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="stopwatch-tip">
                  <span>🏁</span>
                  <h3>Bấm giờ linh hoạt</h3>
                  <p>Dùng cho phần trình bày, trò chơi, thảo luận nhóm hoặc thử thách trên lớp.</p>
                </div>
              )}

              <div className="timer-sound-options">
                <button type="button" className={finishSound ? 'enabled' : ''} onClick={() => setFinishSound((value) => !value)}>
                  {finishSound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <span><strong>Chuông kết thúc</strong><small>{finishSound ? 'Đang bật' : 'Đang tắt'}</small></span>
                  <i>{finishSound ? <Check size={13} /> : ''}</i>
                </button>
                {timerMode === 'countdown' && (
                  <button type="button" className={secondTickSound ? 'enabled' : ''} onClick={() => setSecondTickSound((value) => !value)}>
                    <BellRing size={18} />
                    <span><strong>Âm thanh từng giây</strong><small>{secondTickSound ? 'Phát trong toàn bộ thời gian đếm ngược' : 'Đang tắt'}</small></span>
                    <i>{secondTickSound ? <Check size={13} /> : ''}</i>
                  </button>
                )}
              </div>
              {timerMode === 'countdown' && (
                <div className="tool-volume-control tick-volume-control">
                  <label htmlFor="second-tick-volume"><span><strong>Âm lượng tiếng giây</strong><small>Chỉnh riêng tiếng “tick” phát ở mỗi giây</small></span><em>{secondTickVolume}%</em></label>
                  <input id="second-tick-volume" type="range" min="0" max="100" value={secondTickVolume} disabled={!secondTickSound} onChange={(event) => setSecondTickVolume(Number(event.target.value))} />
                  <button type="button" disabled={!secondTickSound} onClick={() => playAudibleSecondTick(countdownAudioRef, secondTickVolume)}><Volume2 size={15} /> Nghe thử tiếng giây</button>
                </div>
              )}
              <div className="tool-volume-control timer-volume-control">
                <label htmlFor="timer-volume"><span><strong>Âm lượng chuông</strong><small>Áp dụng cho tiếng bắt đầu và hoàn thành</small></span><em>{timerVolume}%</em></label>
                <input id="timer-volume" type="range" min="10" max="100" value={timerVolume} onChange={(event) => setTimerVolume(Number(event.target.value))} />
                <button type="button" onClick={previewTimerSound}><Volume2 size={15} /> Nghe thử chuông</button>
              </div>
            </aside>
          </div>
        ) : (
          <div className="classroom-noise-layout">
            <div className={`classroom-noise-focus tone-${noiseState.tone} ${isListening ? 'is-listening' : ''}`}>
              <div className="noise-visual" aria-live="polite">
                <div className="noise-ripple ripple-one" />
                <div className="noise-ripple ripple-two" />
                <div className="noise-ripple ripple-three" />
                <div className="noise-face">
                  <span>{isListening ? noiseState.emoji : '🎙️'}</span>
                  <strong>{isListening ? noiseLevel : '--'}</strong>
                  <small>MỨC ỒN</small>
                </div>
              </div>
              <div className="noise-message">
                <span className={`noise-live-dot ${isListening ? 'active' : ''}`} />
                <div><h2>{isListening ? noiseState.label : 'Sẵn sàng lắng nghe'}</h2><p>{isListening ? noiseState.hint : 'Bật micro để bắt đầu phản hồi âm lượng của lớp.'}</p></div>
              </div>
              <div className="noise-bars" aria-hidden="true">
                {Array.from({ length: 24 }, (_, index) => <i key={index} className={noiseLevel >= (index + 1) * (100 / 24) ? 'active' : ''} style={{ height: `${30 + ((index * 17) % 55)}%` }} />)}
              </div>
              {noiseAlertEnabled && <div className={`noise-alert-live ${isListening && noiseLevel >= noiseAlertThreshold ? 'over' : ''}`}><BellRing size={14} /> {isListening && noiseLevel >= noiseAlertThreshold ? `Đang vượt ngưỡng ${noiseAlertThreshold}` : `Chuông cảnh báo từ mức ${noiseAlertThreshold}`}</div>}
              <button type="button" className={`noise-primary ${isListening ? 'stop' : ''}`} onClick={() => isListening ? stopListening() : void startListening()}>
                {isListening ? <MicOff size={21} /> : <Mic size={21} />}
                {isListening ? 'Tắt micro' : 'Bật micro'}
              </button>
              {microphoneError && <div className="microphone-error" role="alert"><MicOff size={18} /><span>{microphoneError}</span></div>}
            </div>

            <aside className="classroom-noise-settings">
              <div className="tool-setting-heading"><div><span>PHẢN HỒI TRỰC QUAN</span><h3>Mức âm lượng</h3></div><Mic size={22} /></div>
              <div className="noise-state-grid">
                {noiseStates.map((state, index) => {
                  const min = index === 0 ? 0 : noiseStates[index - 1].max + 1;
                  const active = isListening && state.tone === noiseState.tone;
                  return <div key={state.tone} className={`noise-state-card ${state.tone} ${active ? 'active' : ''}`}><span>{state.emoji}</span><div><strong>{state.label}</strong><small>{min}–{state.max}</small></div>{active && <Check size={15} />}</div>;
                })}
              </div>

              <div className="noise-sensitivity">
                <label htmlFor="noise-sensitivity"><span><strong>Độ nhạy micro</strong><small>Điều chỉnh theo khoảng cách tới lớp</small></span><em>{sensitivity}%</em></label>
                <input id="noise-sensitivity" type="range" min="35" max="80" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} />
                <div><span>Ít nhạy</span><span>Nhạy hơn</span></div>
                <button type="button" onClick={resetNoiseBaseline} disabled={!isListening}><RotateCcw size={16} /> Hiệu chỉnh lại</button>
              </div>

              <div className={`noise-alert-settings ${noiseAlertEnabled ? 'enabled' : ''}`}>
                <div className="noise-alert-heading">
                  <span><BellRing size={19} /></span>
                  <div><strong>Cảnh báo khi lớp quá ồn</strong><small>Chuông chỉ phát sau khi vượt ngưỡng liên tục 1,2 giây</small></div>
                  <button type="button" role="switch" aria-checked={noiseAlertEnabled} aria-label="Bật hoặc tắt cảnh báo tiếng ồn" onClick={() => setNoiseAlertEnabled((value) => !value)}><i /></button>
                </div>
                <div className="noise-alert-controls">
                  <label htmlFor="noise-alert-threshold"><span><strong>Ngưỡng cảnh báo</strong><small>Chuông phát từ mức này</small></span><em>{noiseAlertThreshold}</em></label>
                  <input id="noise-alert-threshold" type="range" min="60" max="95" value={noiseAlertThreshold} disabled={!noiseAlertEnabled} onChange={(event) => setNoiseAlertThreshold(Number(event.target.value))} />
                  <div className="noise-alert-row">
                    <label><span>Khoảng nghỉ</span><select value={noiseAlertCooldown} disabled={!noiseAlertEnabled} onChange={(event) => setNoiseAlertCooldown(Number(event.target.value))}><option value={5}>5 giây</option><option value={10}>10 giây</option><option value={15}>15 giây</option><option value={30}>30 giây</option></select></label>
                    <label><span>Âm lượng</span><div className="noise-volume-inline"><input aria-label="Âm lượng cảnh báo" type="range" min="10" max="100" value={noiseAlertVolume} disabled={!noiseAlertEnabled} onChange={(event) => setNoiseAlertVolume(Number(event.target.value))} /><em>{noiseAlertVolume}%</em></div></label>
                  </div>
                  <button type="button" className="noise-preview-button" disabled={!noiseAlertEnabled} onClick={previewNoiseWarning}><Volume2 size={15} /> Nghe thử cảnh báo</button>
                </div>
              </div>

              <div className="noise-privacy-note">
                <ShieldCheck size={22} />
                <div><strong>Riêng tư ngay trên thiết bị</strong><p>Âm thanh chỉ được phân tích tức thời để tạo hiệu ứng. App không ghi âm và không tải âm thanh lên mạng.</p></div>
              </div>
              <p className="noise-scale-note">Mức 0–100 là thang tương đối theo micro của thiết bị, không phải máy đo decibel chuyên dụng.</p>
            </aside>
          </div>
        )}
      </section>
    </section>
  );
}
