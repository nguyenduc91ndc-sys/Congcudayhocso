import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { useHandGesture, GestureResult } from '../hooks/useHandGesture';

interface HandGestureDetectorProps {
  onGestureConfirm: (gesture: GestureResult) => void;
  onGestureChange?: (gesture: GestureResult) => void;
  disabled?: boolean;
}

export function HandGestureDetector({ onGestureConfirm, onGestureChange, disabled = false }: HandGestureDetectorProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { gesture, isReady, landmarks } = useHandGesture(videoRef);
  const [confirmProgress, setConfirmProgress] = useState(0);
  const [lockedGesture, setLockedGesture] = useState<GestureResult>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [isCamReady, setIsCamReady] = useState(false);

  const handleUserMedia = () => {
    setIsCamReady(true);
    if (webcamRef.current && webcamRef.current.video) {
      videoRef.current = webcamRef.current.video;
    }
  };

  useEffect(() => {
    if (onGestureChange) {
      onGestureChange(gesture);
    }
  }, [gesture, onGestureChange]);

  // Draw hand landmarks
  useEffect(() => {
    if (!canvasRef.current || !landmarks || !isCamReady) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match video
    if (webcamRef.current?.video) {
      canvas.width = webcamRef.current.video.videoWidth;
      canvas.height = webcamRef.current.video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Joint connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // index
      [0, 9], [9, 10], [10, 11], [11, 12], // middle
      [0, 13], [13, 14], [14, 15], [15, 16], // ring
      [0, 17], [17, 18], [18, 19], [19, 20], // pinky
      [5, 9], [9, 13], [13, 17] // palm
    ];

    // Draw connections
    ctx.strokeStyle = '#34d399'; // color-secondary
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    connections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
      ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
      ctx.stroke();
    });

    // Draw joints
    ctx.fillStyle = '#FF6B6B'; // color-primary
    landmarks.forEach((landmark) => {
      ctx.beginPath();
      ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 6, 0, 2 * Math.PI);
      ctx.fill();
    });

  }, [landmarks, isCamReady]);

  // Auto confirm after 2 seconds of holding the same gesture
  useEffect(() => {
    if (disabled || !gesture || gesture === 'FIST') {
      setConfirmProgress(0);
      setLockedGesture(null);
      return;
    }

    if (gesture !== lockedGesture) {
      setLockedGesture(gesture);
      setConfirmProgress(0);
    }

    const interval = setInterval(() => {
      setConfirmProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onGestureConfirm(gesture);
          return 100;
        }
        return prev + 5; // 5% every 100ms = 2 seconds to 100%
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gesture, lockedGesture, disabled, onGestureConfirm]);

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="w-full aspect-[4/3] bg-black rounded-[20px] overflow-hidden relative border-4 border-[var(--color-dark)] group">
        {/* @ts-ignore */}
        <Webcam
          ref={webcamRef}
          audio={false}
          mirrored={true}
          muted={true}
          playsInline={true}
          className="w-full h-full object-cover"
          videoConstraints={{ facingMode: "user" }}
          onUserMedia={handleUserMedia}
          onUserMediaError={(err: any) => setCamError(err?.message || err?.name || "Lỗi không xác định")}
        />

        {/* Canvas Overlay for Hand Landmarks */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10 scale-x-[-1]"
        />
        
        {camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 text-white p-4 text-center z-50">
            <div className="text-4xl mb-2">⚠️</div>
            <div className="font-bold mb-2">LỖI CAMERA</div>
            <div className="text-xs opacity-80 mb-4">{camError}</div>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white text-red-900 rounded-lg font-bold text-sm">
              Tải lại trang
            </button>
          </div>
        )}

        {(!isReady || !isCamReady) && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#1a1a1a] to-[#333] text-white z-40">
            <div className="text-[48px] mb-2.5 animate-pulse">🎥</div>
            <div className="font-semibold text-[14px] uppercase text-center px-4">
              {!isCamReady ? "ĐANG KẾT NỐI CAMERA..." : "ĐANG TẢI AI NHẬN DIỆN..."}
            </div>
            <div className="absolute top-[40%] left-1/2 w-[120px] h-[120px] border-2 border-dashed border-white/50 rounded-full -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite]"></div>
          </div>
        )}

        {isReady && isCamReady && gesture && (
          <div className="absolute bottom-2.5 right-2.5 bg-[var(--color-accent)] text-[var(--color-dark)] px-3 py-1.5 rounded-[10px] font-extrabold text-[12px] z-50 shadow-lg border-2 border-white animate-in fade-in slide-in-from-bottom-2 duration-300 uppercase">
            {gesture === 'A' ? '☝️ 1 NGÓN (A)' : 
             gesture === 'B' ? '✌️ 2 NGÓN (B)' : 
             gesture === 'C' ? '🤟 3 NGÓN (C)' : 
             gesture === 'D' ? '🖐️ 5 NGÓN (D)' : 
             '✊ Nắm đấm (Dừng)'}
          </div>
        )}
      </div>

      <div className="relative h-4 bg-slate-200 rounded-full w-full overflow-hidden mt-auto border-2 border-slate-300">
        <div 
          className="h-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] transition-all duration-100 ease-linear"
          style={{ width: `${confirmProgress}%` }}
        />
        {confirmProgress > 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white uppercase tracking-widest drop-shadow-sm">
            Đang giữ để chọn...
          </div>
        )}
      </div>
    </div>
  );
}
