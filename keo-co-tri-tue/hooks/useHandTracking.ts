import { useState, useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export type GestureType = 'A' | 'B' | 'C' | 'D' | 'NONE';

export const useHandTracking = () => {
    const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<GestureType>('NONE');
    const [error, setError] = useState<string | null>(null);
    const [fingerCount, setFingerCount] = useState<number>(0);

    useEffect(() => {
        const initMediaPipe = async () => {
            try {
                // Tải các file WASM của MediaPipe từ CDN (để không cần cấu hình quá nhiều ở local)
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                const landmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1, // Nhận diện 1 bàn tay tại một thời điểm cho chính xác
                });

                setHandLandmarker(landmarker);
                setIsModelLoaded(true);
            } catch (err) {
                console.error("Error loading MediaPipe model:", err);
                setError("Không thể tải mô hình AI. Vui lòng kiểm tra lại đường truyền mạng.");
            }
        };

        initMediaPipe();
    }, []);

    // Thuật toán đếm số ngón tay chính xác hơn
    const calculateFingers = (landmarks: any[]) => {
        if (!landmarks || landmarks.length < 21) return 0;
        
        let count = 0;
        
        // 1. Kiểm tra 4 ngón: Trỏ, Giữa, Áp út, Út
        // Một ngón được tính là "giơ lên" nếu đầu ngón cao hơn tất cả các khớp còn lại của ngón đó
        const fingerTips = [8, 12, 16, 20];
        const fingerBases = [5, 9, 13, 17]; // Khớp gốc bàn tay

        for (let i = 0; i < 4; i++) {
            const tip = landmarks[fingerTips[i]];
            const base = landmarks[fingerBases[i]];
            
            // Trong MediaPipe, trục Y hướng xuống dưới, nên Y nhỏ hơn nghĩa là cao hơn
            if (tip.y < base.y) {
                count++;
            }
        }

        // 2. Kiểm tra ngón cái (Thumb)
        // Ngón cái khó nhận diện hơn theo trục Y vì nó nằm ngang. 
        // Ta kiểm tra khoảng cách X giữa đầu ngón cái và khớp gốc ngón trỏ.
        const thumbTip = landmarks[4];
        const thumbBase = landmarks[2];
        const indexBase = landmarks[5];

        // Tính khoảng cách ngang. Nếu đầu ngón cái xa lòng bàn tay hơn khớp gốc thì coi là mở.
        const isThumbOpen = Math.abs(thumbTip.x - indexBase.x) > Math.abs(thumbBase.x - indexBase.x);
        if (isThumbOpen) {
            count++;
        }

        return count;
    };

    return {
        handLandmarker,
        isModelLoaded,
        error,
        calculateFingers
    };
};
