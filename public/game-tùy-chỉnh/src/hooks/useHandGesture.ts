import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type GestureResult = 'A' | 'B' | 'C' | 'D' | 'FIST' | null;

export function useHandGesture(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [gesture, setGesture] = useState<GestureResult>(null);
  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const [isReady, setIsReady] = useState(false);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  
  // Temporal Smoothing: Store last 5 detections to avoid flickering
  const gestureHistoryRef = useRef<GestureResult[]>([]);

  useEffect(() => {
    let isMounted = true;

    const initHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (isMounted) {
          handLandmarkerRef.current = handLandmarker;
          setIsReady(true);
        }
      } catch (error) {
        console.error("Error initializing HandLandmarker:", error);
      }
    };

    initHandLandmarker();

    return () => {
      isMounted = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // MODERN VECTOR LOGIC: Checks if a finger is extended based on joint angles and relative distance
  const getExtendedFingers = (handLandmarks: any[]) => {
    const extended = [false, false, false, false, false]; // Thumb, Index, Middle, Ring, Pinky
    
    const wrist = handLandmarks[0];
    
    // 1. IMPROVED THUMB LOGIC (Based on horizontal distance from palm center)
    // We use the distance from index MCP (5) to thumb tip (4) relative to index MCP (5) to thumb MCP (2)
    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    const thumbExtension = dist(handLandmarks[4], handLandmarks[5]) / dist(handLandmarks[2], handLandmarks[5]);
    if (thumbExtension > 1.4) extended[0] = true;

    // 2. VECTOR-BASED LOGIC FOR 4 FINGERS
    // A finger is extended if the distance from Wrist to Tip is significantly larger 
    // than the distance from Wrist to PIP joint. This is rotation-invariant.
    const fingerIndices = [
      { tip: 8, pip: 6, mcp: 5 },  // Index
      { tip: 12, pip: 10, mcp: 9 }, // Middle
      { tip: 16, pip: 14, mcp: 13 }, // Ring
      { tip: 20, pip: 18, mcp: 17 }  // Pinky
    ];

    fingerIndices.forEach((f, idx) => {
      const wristToTip = dist(wrist, handLandmarks[f.tip]);
      const wristToPip = dist(wrist, handLandmarks[f.pip]);
      const wristToMcp = dist(wrist, handLandmarks[f.mcp]);
      
      // The ratio must be high enough. Typically tip is ~1.5x further from wrist than PIP
      if (wristToTip > wristToPip * 1.15 && wristToTip > wristToMcp * 1.3) {
        extended[idx + 1] = true;
      }
    });

    return extended.filter(Boolean).length;
  };

  const detect = useCallback(() => {
    if (!handLandmarkerRef.current || !videoRef.current) {
      requestRef.current = requestAnimationFrame(detect);
      return;
    }

    const video = videoRef.current;
    
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const startTimeMs = performance.now();
      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        try {
          const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);
          
          if (results.landmarks && results.landmarks.length > 0) {
            const currentLandmarks = results.landmarks[0];
            setLandmarks(currentLandmarks);
            const fingers = getExtendedFingers(currentLandmarks);
            
            // Map fingers to current requirement (1-A, 2-B, 3-C, 5-D)
            let rawGesture: GestureResult = null;
            if (fingers === 1) rawGesture = 'A';
            else if (fingers === 2) rawGesture = 'B';
            else if (fingers === 3) rawGesture = 'C';
            else if (fingers === 4 || fingers === 5) rawGesture = 'D';
            else rawGesture = 'FIST';

            // TEMPORAL SMOOTHING: Majority Vote over 5 frames
            gestureHistoryRef.current.push(rawGesture);
            if (gestureHistoryRef.current.length > 5) {
              gestureHistoryRef.current.shift();
            }

            // Find the most frequent gesture in history
            const counts = gestureHistoryRef.current.reduce((acc: any, val) => {
              if (val) acc[val] = (acc[val] || 0) + 1;
              return acc;
            }, {});

            const sorted = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]);
            const finalGesture = sorted.length > 0 && (sorted[0][1] as number) >= 3 ? (sorted[0][0] as GestureResult) : null;
            
            setGesture(finalGesture);
          } else {
            setGesture(null);
            setLandmarks(null);
            gestureHistoryRef.current = [];
          }
        } catch (error) {
          console.error("MediaPipe detection error:", error);
        }
      }
    }
    
    requestRef.current = requestAnimationFrame(detect);
  }, [videoRef]);

  useEffect(() => {
    if (isReady) {
      requestRef.current = requestAnimationFrame(detect);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isReady, detect]);

  return { gesture, isReady, landmarks };
}
