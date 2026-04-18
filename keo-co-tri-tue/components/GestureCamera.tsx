import React, { useRef, useEffect, useState } from 'react';
import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision';
import { useHandTracking, GestureType } from '../hooks/useHandTracking';

interface GestureCameraProps {
    onGestureDetected: (gesture: GestureType) => void;
}

const GestureCamera: React.FC<GestureCameraProps> = ({ onGestureDetected }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { handLandmarker, isModelLoaded, error, calculateFingers } = useHandTracking();
    
    const [isCameraReady, setIsCameraReady] = useState(false);
    const lastVideoTimeRef = useRef(-1);
    const requestRef = useRef<number>();

    // Setup Webcam
    useEffect(() => {
        const setupCamera = async () => {
            if (!videoRef.current) return;
            
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 },
                    audio: false
                });
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setIsCameraReady(true);
                };
            } catch (err) {
                console.error("Error accessing webcam:", err);
            }
        };

        setupCamera();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    // Detection Loop
    useEffect(() => {
        if (!isModelLoaded || !isCameraReady || !handLandmarker || !videoRef.current || !canvasRef.current) return;

        const canvasCtx = canvasRef.current.getContext('2d');
        if (!canvasCtx) return;
        
        const drawingUtils = new DrawingUtils(canvasCtx);

        const predictWebcam = () => {
            if (!videoRef.current || !handLandmarker) return;

            let startTimeMs = performance.now();
            if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
                lastVideoTimeRef.current = videoRef.current.currentTime;
                
                const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

                canvasCtx.save();
                canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                if (results.landmarks) {
                    for (const landmarks of results.landmarks) {
                        // Vẽ skeleton
                        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
                            color: "#00FF00",
                            lineWidth: 5
                        });
                        drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 2 });

                        // Phân tích cử chỉ
                        const fingers = calculateFingers(landmarks);
                        let gesture: GestureType = 'NONE';
                        
                        if (fingers === 0) gesture = 'A';
                        else if (fingers === 1) gesture = 'B';
                        else if (fingers === 2 || fingers === 3) gesture = 'C'; // 2 hoặc 3 ngón đều là C cho dễ
                        else if (fingers >= 4) gesture = 'D';

                        onGestureDetected(gesture); // Luôn gọi kể cả NONE để reset
                    }
                } else {
                    // Không có bàn tay nào
                    onGestureDetected('NONE');
                }
                canvasCtx.restore();
            }
            requestRef.current = requestAnimationFrame(predictWebcam);
        };

        requestRef.current = requestAnimationFrame(predictWebcam);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isModelLoaded, isCameraReady, handLandmarker, onGestureDetected, calculateFingers]);

    return (
        <div className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
            {!isCameraReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-white font-medium">Đang khởi động Camera...</p>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="absolute inset-0 flex items-center justify-center z-30 bg-red-900/20 backdrop-blur-sm p-4 text-center">
                    <p className="text-red-400 font-bold">{error}</p>
                </div>
            )}

            <video 
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                playsInline
                muted
            />
            
            <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-10"
                width={1280}
                height={720}
            />

            <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">AI Vision Status</p>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isModelLoaded ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-xs font-bold text-white">{isModelLoaded ? 'READY' : 'LOADING'}</span>
                </div>
            </div>
        </div>
    );
};

export default GestureCamera;
