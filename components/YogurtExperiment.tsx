import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

// ─── TYPES ───
interface YogurtExperimentProps {
    onBack: () => void;
}

type SoundType = 'pour' | 'stir' | 'success' | 'drop' | 'complete';

interface StepData {
    title: string;
    description: string;
    image: string;
    scienceInfo: {
        title: string;
        content: string;
        hasAudio?: boolean;
    };
    dragItems: { id: string; name: string; emoji: string }[];
    dropZoneLabel: string;
    animation: 'steam' | 'bubbles' | 'bacteria' | 'bacteria-multiply' | 'snowflakes' | 'pouring' | 'none';
}

// ─── SOUND HOOK ───
const soundUrls: Record<SoundType, string> = {
    pour: 'https://assets.mixkit.co/active_storage/sfx/2496/2496-preview.mp3',
    stir: 'https://assets.mixkit.co/active_storage/sfx/2505/2505-preview.mp3',
    success: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    drop: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    complete: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
};

function useYogurtSound() {
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
    useEffect(() => {
        Object.entries(soundUrls).forEach(([type, url]) => {
            const audio = new Audio(url);
            audio.volume = 1.0;
            audio.preload = 'auto';
            audioRefs.current[type] = audio;
        });
    }, []);
    const play = useCallback((type: SoundType) => {
        try {
            const audio = audioRefs.current[type];
            if (audio) { audio.currentTime = 0; audio.play().catch(() => { }); }
        } catch { }
    }, []);
    return { play };
}

// ─── SUB-COMPONENTS ───
function YogurtDraggableItem({ id, name, image, disabled = false }: { id: string; name: string; image: string; disabled?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled });
    const style: React.CSSProperties = {
        ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
        ...(isDragging ? { opacity: 0.3, cursor: 'grabbing' } : {}),
    };
    return (
        <motion.div ref={setNodeRef} style={style} {...listeners} {...attributes}
            className={`yogurt-draggable-item ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
            whileHover={!disabled && !isDragging ? { scale: 1.1 } : undefined}
            whileTap={!disabled ? { scale: 0.95 } : undefined}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: disabled ? 0.4 : isDragging ? 0.3 : 1, y: 0 }}
        >
            <span className="yogurt-item-image">
                {image === JAR_EMOJI_PLACEHOLDER ? <YogurtJarIcon size={36} />
                    : image === HOT_WATER_PLACEHOLDER ? <HotWaterIcon size={36} />
                        : image}
            </span>
            <span className="yogurt-item-label">{name}</span>
        </motion.div>
    );
}

function YogurtDropZone({ id, children, label, isComplete = false }: { id: string; children?: React.ReactNode; label: string; isActive?: boolean; isComplete?: boolean }) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <motion.div ref={setNodeRef}
            className={`yogurt-drop-zone ${isOver ? 'over' : ''} ${isComplete ? 'complete' : ''}`}
            animate={{ scale: isOver ? 1.05 : 1, borderColor: isOver ? '#22c55e' : isComplete ? '#10b981' : '#60a5fa' }}
        >
            {children}
            <div className="yogurt-drop-zone-label">{label}</div>
            {isComplete && (
                <motion.div className="yogurt-check-mark" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>✓</motion.div>
            )}
        </motion.div>
    );
}

function YogurtSteam({ isActive }: { isActive: boolean }) {
    if (!isActive) return null;
    return (
        <div className="yogurt-steam-container">
            {[...Array(8)].map((_, i) => (
                <motion.div key={i} className="yogurt-steam-particle"
                    initial={{ y: 0, opacity: 0.8, x: Math.random() * 60 - 30 }}
                    animate={{ y: [-20, -80], opacity: [0.8, 0], x: [Math.random() * 60 - 30, Math.random() * 100 - 50] }}
                    transition={{ duration: 2 + Math.random(), repeat: Infinity, delay: i * 0.3, ease: 'easeOut' }}
                />
            ))}
        </div>
    );
}

function YogurtBubbles({ isActive }: { isActive: boolean }) {
    if (!isActive) return null;
    return (
        <div className="yogurt-bubbles-container">
            {[...Array(12)].map((_, i) => (
                <motion.div key={i} className="yogurt-bubble"
                    style={{ left: `${10 + Math.random() * 80}%`, width: `${8 + Math.random() * 12}px`, height: `${8 + Math.random() * 12}px` }}
                    initial={{ y: 0, opacity: 0.7 }}
                    animate={{ y: [-20, -120], opacity: [0.7, 0] }}
                    transition={{ duration: 1.5 + Math.random(), repeat: Infinity, delay: i * 0.15, ease: 'easeOut' }}
                />
            ))}
        </div>
    );
}

function YogurtBacteria({ isActive, multiplying = false }: { isActive: boolean; multiplying?: boolean }) {
    if (!isActive) return null;
    const count = multiplying ? 20 : 8;
    return (
        <div className="yogurt-bacteria-container">
            {[...Array(count)].map((_, i) => (
                <motion.div key={i} className="yogurt-bacterium"
                    style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
                    initial={{ scale: 0, rotate: Math.random() * 360 }}
                    animate={{ scale: [0.8, 1.2, 0.8], x: [0, Math.random() * 40 - 20, 0], y: [0, Math.random() * 40 - 20, 0], rotate: [0, 360] }}
                    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                />
            ))}
            {multiplying && (
                <motion.div className="yogurt-multiply-text" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
                    Vi khuẩn đang nhân đôi! 🦠×2
                </motion.div>
            )}
        </div>
    );
}

function YogurtSnowflakes({ isActive }: { isActive: boolean }) {
    if (!isActive) return null;
    return (
        <div className="yogurt-snowflakes-container">
            {[...Array(15)].map((_, i) => (
                <motion.div key={i} className="yogurt-snowflake" style={{ left: `${Math.random() * 100}%` }}
                    initial={{ y: -20, opacity: 1 }}
                    animate={{ y: 150, opacity: 0 }}
                    transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: i * 0.2 }}
                >❄️</motion.div>
            ))}
        </div>
    );
}

function YogurtPouringAnimation({ isActive }: { isActive: boolean }) {
    if (!isActive) return null;
    return (
        <div className="yogurt-pouring-container">
            <motion.div className="yogurt-milk-stream"
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {[...Array(8)].map((_, i) => (
                <motion.div key={i} className="yogurt-milk-drop" style={{ left: `${45 + Math.random() * 10}%` }}
                    initial={{ y: 0, opacity: 1, scale: 1 }}
                    animate={{ y: [0, 80, 120], opacity: [1, 1, 0], scale: [1, 0.8, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: "easeIn" }}
                />
            ))}
            {[...Array(5)].map((_, i) => (
                <motion.div key={`splash-${i}`} className="yogurt-milk-splash" style={{ left: `${40 + i * 5}%`, bottom: '20%' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.5, 0], opacity: [0, 0.8, 0], y: [0, -10, -5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.5 + i * 0.15 }}
                />
            ))}
        </div>
    );
}

// ─── CUSTOM SVG ICONS ───
const YOGURT_JAR = '/yogurt-experiment/yogurt-jar.svg';
const HOT_WATER_SVG = '/yogurt-experiment/hot-water.svg';
const YogurtJarIcon = ({ size = 40 }: { size?: number }) => (
    <img src={YOGURT_JAR} alt="Hũ sữa chua" style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }} />
);
const HotWaterIcon = ({ size = 40 }: { size?: number }) => (
    <img src={HOT_WATER_SVG} alt="Nước nóng" style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }} />
);
const JAR_EMOJI_PLACEHOLDER = '🥛_JAR';
const HOT_WATER_PLACEHOLDER = '🥛_HOT';

// ─── STEP DATA ───
const IMG = '/yogurt-experiment';
const stepsData: StepData[] = [
    {
        title: "Bước 1: Pha nước ấm (40-50°C)",
        description: "Kéo ấm nước nóng và nước lạnh vào bình pha để có nhiệt độ 40-50°C",
        image: `${IMG}/1.png`,
        scienceInfo: { title: "🌡️ Tại sao cần nhiệt độ 40-50°C?", content: "Nhiệt độ này là môi trường lý tưởng cho vi khuẩn lactic phát triển. Nếu quá nóng (>60°C), vi khuẩn sẽ chết. Nếu quá lạnh (<35°C), vi khuẩn hoạt động yếu." },
        dragItems: [{ id: 'hot-water', name: 'Nước nóng', emoji: HOT_WATER_PLACEHOLDER }, { id: 'cold-water', name: 'Nước lạnh', emoji: '🧊' }],
        dropZoneLabel: 'Bình pha', animation: 'pouring',
    },
    {
        title: "Bước 2: Hòa sữa đặc",
        description: "Kéo lon sữa đặc để đổ vào bình nước ấm",
        image: `${IMG}/warm_water_bowl.png`,
        scienceInfo: { title: "🥛 Vai trò của sữa đặc", content: "Sữa đặc cung cấp đường lactose - nguồn thức ăn chính cho vi khuẩn lactic. Vi khuẩn sẽ 'ăn' đường này và chuyển hóa thành acid lactic." },
        dragItems: [{ id: 'condensed-milk', name: 'Sữa đặc', emoji: '🥫' }],
        dropZoneLabel: 'Bình nước ấm', animation: 'pouring',
    },
    {
        title: "Bước 3: Cho sữa chua giống",
        description: "Kéo hũ sữa chua giống để đổ vào hỗn hợp sữa (bổ sung vi khuẩn lên men)",
        image: `${IMG}/milk_bowl.png`,
        scienceInfo: { title: "🦠 Vi khuẩn Lactobacillus (Lac-tô-ba-xi-lút)", content: "Sữa chua giống chứa vi khuẩn Lactobacillus - 'nhân vật chính' của quá trình lên men! Vi khuẩn này sẽ nhân đôi và biến đường thành acid lactic, làm sữa đông đặc lại thành sữa chua.", hasAudio: true },
        dragItems: [{ id: 'yogurt-starter', name: 'Sữa chua giống', emoji: '🥛' }],
        dropZoneLabel: 'Hỗn hợp sữa 🥣', animation: 'pouring',
    },
    {
        title: "Bước 4: Rót vào cốc",
        description: "Kéo cốc sữa để rót hỗn hợp vào các hũ thủy tinh",
        image: `${IMG}/4.png`,
        scienceInfo: { title: "🏺 Tại sao phải đậy kín nắp?", content: "Vi khuẩn lactic là vi khuẩn kỵ khí (không cần oxy). Đậy kín nắp giúp tạo môi trường yếm khí, giúp vi khuẩn hoạt động hiệu quả hơn." },
        dragItems: [{ id: 'milk-cup', name: 'Cốc sữa', emoji: '🥛' }],
        dropZoneLabel: 'Hũ thủy tinh', animation: 'pouring',
    },
    {
        title: "Bước 5: Ủ ấm (8-12 giờ)",
        description: "Kéo từng hũ sữa vào hộp ủ nhiệt để vi khuẩn hoạt động",
        image: `${IMG}/empty_box.png`,
        scienceInfo: { title: "⏰ Quá trình lên men diệu kỳ!", content: "Trong 8-12 giờ, vi khuẩn lactic sẽ: 1) Nhân đôi số lượng hàng triệu lần 2) 'Ăn' đường lactose 3) Tạo ra acid lactic 4) Acid lactic làm protein sữa đông tụ → sữa chua thành hình!" },
        dragItems: [{ id: 'jar-1', name: 'Hũ 1', emoji: JAR_EMOJI_PLACEHOLDER }, { id: 'jar-2', name: 'Hũ 2', emoji: JAR_EMOJI_PLACEHOLDER }, { id: 'jar-3', name: 'Hũ 3', emoji: JAR_EMOJI_PLACEHOLDER }, { id: 'jar-4', name: 'Hũ 4', emoji: JAR_EMOJI_PLACEHOLDER }],
        dropZoneLabel: 'Hộp ủ nhiệt 📦', animation: 'bacteria-multiply',
    },
    {
        title: "Bước 6: Kiểm tra sản phẩm",
        description: "Nhấn nút kiểm tra để xem kết quả thí nghiệm!",
        image: `${IMG}/8.jpg`,
        scienceInfo: { title: "✅ Dấu hiệu thành công", content: "Sữa chua thành công khi: • Đông đặc, không chảy nước • Màu trắng ngà • Mùi thơm nhẹ, hơi chua • Vị chua dịu, ngọt nhẹ. Vị chua là do acid lactic mà vi khuẩn tạo ra!" },
        dragItems: [], dropZoneLabel: '', animation: 'none',
    },
    {
        title: "Bước 7: Bảo quản lạnh",
        description: "Kéo sữa chua vào tủ lạnh để bảo quản",
        image: `${IMG}/7.png`,
        scienceInfo: { title: "❄️ Tại sao cần bảo quản lạnh?", content: "Nhiệt độ lạnh (2-4°C) làm vi khuẩn 'ngủ đông', ngừng hoạt động. Điều này giúp sữa chua không bị chua thêm và giữ được chất lượng lâu hơn (7-14 ngày)." },
        dragItems: [{ id: 'yogurt-cup', name: 'Hũ sữa chua', emoji: JAR_EMOJI_PLACEHOLDER }],
        dropZoneLabel: 'Tủ lạnh 🧊', animation: 'snowflakes',
    }
];

// ─── MAIN COMPONENT ───
const YogurtExperiment: React.FC<YogurtExperimentProps> = ({ onBack }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [showComplete, setShowComplete] = useState(false);
    const [completedItems, setCompletedItems] = useState<Record<number, string[]>>({});
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showAnimation, setShowAnimation] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { play } = useYogurtSound();

    // ─── SENSORS for stable drag ───
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 5 },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 250, tolerance: 5 },
    });
    const sensors = useSensors(pointerSensor, touchSensor);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const stepData = stepsData[currentStep - 1];
    const stepCompleted = completedItems[currentStep]?.length === stepData.dragItems.length;

    const speakLactobacillus = useCallback(() => {
        const utterance = new SpeechSynthesisUtterance('Lactobacillus');
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    }, []);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (over && over.id === 'yogurt-drop-zone') {
            const itemId = active.id as string;
            const currentCompleted = completedItems[currentStep] || [];
            if (!currentCompleted.includes(itemId)) {
                play('drop');
                setCompletedItems(prev => ({ ...prev, [currentStep]: [...currentCompleted, itemId] }));
                if (currentCompleted.length + 1 === stepData.dragItems.length) {
                    setShowAnimation(true);
                    setTimeout(() => play('success'), 500);
                }
            }
        }
    }, [currentStep, completedItems, stepData.dragItems.length, play]);

    const handleNext = () => {
        if (currentStep < 7) { setShowAnimation(false); setCurrentStep(currentStep + 1); }
        else { play('complete'); setShowComplete(true); }
    };
    const handlePrev = () => { if (currentStep > 1) { setShowAnimation(false); setCurrentStep(currentStep - 1); } setShowComplete(false); };
    const handleReset = () => { setCurrentStep(1); setShowComplete(false); setCompletedItems({}); setShowAnimation(false); };
    const handleCheckStep6 = () => { setShowAnimation(true); play('success'); setCompletedItems(prev => ({ ...prev, 6: ['checked'] })); };
    const isItemCompleted = (itemId: string) => completedItems[currentStep]?.includes(itemId) || false;
    const canProceed = stepData.dragItems.length === 0 ? (currentStep === 6 ? completedItems[6]?.includes('checked') : true) : stepCompleted;

    return (
        <div className="yogurt-app-container">
            {/* Back Button */}
            <motion.button className="yogurt-back-btn" onClick={onBack} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <ArrowLeft size={20} /> Quay lại
            </motion.button>

            {/* Fullscreen Button */}
            <motion.button className="yogurt-fullscreen-btn" onClick={toggleFullscreen} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                title={isFullscreen ? 'Thoát toàn màn hình' : 'Phóng to màn hình'}>
                {isFullscreen ? '⛶' : '⛶'}
            </motion.button>

            {/* Header */}
            <header className="yogurt-header">
                <motion.h1 className="yogurt-title-3d"
                    initial={{ opacity: 0, y: -20, rotateX: -30 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ type: 'spring', stiffness: 100 }}>
                    🥛 Thí Nghiệm Làm Sữa Chua
                </motion.h1>
                <motion.p className="yogurt-step-indicator" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    {showComplete ? "🎉 Hoàn thành!" : `Bước ${currentStep} / 7`}
                </motion.p>
            </header>

            {/* Progress Bar */}
            <div className="yogurt-progress-bar">
                {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                    <motion.div key={step}
                        className={`yogurt-progress-step ${step < currentStep ? 'completed' : step === currentStep ? 'current' : 'pending'}`}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setCurrentStep(step); setShowComplete(false); setShowAnimation(false); }}>
                        {completedItems[step]?.length === stepsData[step - 1].dragItems.length && stepsData[step - 1].dragItems.length > 0 ? '✓' : step}
                    </motion.div>
                ))}
            </div>

            {/* Main Content */}
            <AnimatePresence mode="wait">
                <motion.main key={showComplete ? 'complete' : currentStep} className="yogurt-main-content"
                    initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
                    {showComplete ? (
                        <div className="yogurt-complete-animation">
                            <motion.div className="yogurt-emoji" animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>🎉</motion.div>
                            <h2>Chúc mừng! Bạn đã hoàn thành thí nghiệm!</h2>
                            <p style={{ fontSize: '1.2rem', color: '#6b7280', marginBottom: '20px' }}>
                                Bạn đã học được vai trò quan trọng của <strong>vi khuẩn Lactobacillus</strong> trong quá trình làm sữa chua:
                            </p>
                            <div className="yogurt-science-info" style={{ textAlign: 'left', maxWidth: '700px', margin: '0 auto', padding: '25px 30px' }}>
                                <h3 style={{ fontSize: '1.6rem', marginBottom: '20px' }}>🦠 Tóm tắt kiến thức</h3>
                                <p style={{ fontSize: '1.4rem', lineHeight: '2.2' }}>
                                    • Vi khuẩn lác-tíc chuyển hóa đường lac-tô-zơ → a-xít lác-tíc<br />
                                    • A-xít lác-tíc làm prô-tê-in sữa đông tụ → sữa chua<br />
                                    • Nhiệt độ 40-50°C là môi trường lý tưởng cho vi khuẩn<br />
                                    • Bảo quản lạnh giúp vi khuẩn ngừng hoạt động
                                </p>
                            </div>
                            <motion.button className="yogurt-btn yogurt-btn-primary" onClick={handleReset} style={{ marginTop: '30px' }}
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                🔄 Làm lại từ đầu
                            </motion.button>
                        </div>
                    ) : (
                        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <h2 className="yogurt-step-title">{stepData.title}</h2>

                            {/* Drag Items Panel */}
                            {stepData.dragItems.length > 0 && (
                                <div className="yogurt-drag-items-panel">
                                    <p className="yogurt-drag-hint">👆 Kéo các vật phẩm vào vùng thả bên dưới:</p>
                                    <div className="yogurt-drag-items">
                                        {stepData.dragItems.map((item) => (
                                            <YogurtDraggableItem key={item.id} id={item.id} name={item.name} image={item.emoji} disabled={isItemCompleted(item.id)} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lab Bench */}
                            <div className="yogurt-lab-bench">
                                {stepData.dragItems.length > 0 ? (
                                    <YogurtDropZone id="yogurt-drop-zone" label={stepData.dropZoneLabel} isComplete={stepCompleted}>
                                        <img src={stepData.image} alt={`Bước ${currentStep}`} className="yogurt-step-image" />
                                        {currentStep === 5 && (completedItems[5]?.length ?? 0) > 0 && (
                                            <div className="yogurt-dropped-jars-container">
                                                {completedItems[5]?.map((itemId, index) => (
                                                    <motion.div key={itemId} className="yogurt-dropped-jar" style={{ left: `${20 + index * 18}%` }}
                                                        initial={{ y: -50, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }}
                                                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}><YogurtJarIcon size={32} /></motion.div>
                                                ))}
                                            </div>
                                        )}
                                        {showAnimation && stepData.animation === 'steam' && <YogurtSteam isActive={true} />}
                                        {showAnimation && stepData.animation === 'bubbles' && <YogurtBubbles isActive={true} />}
                                        {showAnimation && stepData.animation === 'bacteria' && <YogurtBacteria isActive={true} />}
                                        {showAnimation && stepData.animation === 'bacteria-multiply' && <YogurtBacteria isActive={true} multiplying={true} />}
                                        {showAnimation && stepData.animation === 'snowflakes' && <YogurtSnowflakes isActive={true} />}
                                        {showAnimation && stepData.animation === 'pouring' && <YogurtPouringAnimation isActive={true} />}
                                    </YogurtDropZone>
                                ) : (
                                    <div className="yogurt-step-image-container">
                                        <img src={stepData.image} alt={`Bước ${currentStep}`} className={`yogurt-step-image ${currentStep === 6 ? 'landscape-mode' : ''}`} />
                                        {showAnimation && currentStep === 6 && (
                                            <motion.div className="yogurt-success-overlay" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}>
                                                <span className="yogurt-success-emoji">✅</span>
                                                <span>Sữa chua thành công!</span>
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Check Button for Step 6 */}
                            {currentStep === 6 && !completedItems[6]?.includes('checked') && (
                                <motion.button className="yogurt-btn yogurt-btn-check" onClick={handleCheckStep6} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    🔍 Kiểm tra sản phẩm
                                </motion.button>
                            )}

                            {/* Drag Overlay */}
                            <DragOverlay dropAnimation={null}>
                                {activeId ? (
                                    <div className="yogurt-drag-overlay">
                                        <span className="yogurt-drag-overlay-icon">
                                            {(() => { const item = stepData.dragItems.find(item => item.id === activeId); if (!item) return null; const emoji = item.emoji; return emoji === JAR_EMOJI_PLACEHOLDER ? <YogurtJarIcon size={40} /> : emoji === HOT_WATER_PLACEHOLDER ? <HotWaterIcon size={40} /> : <span style={{ fontSize: '2.2rem' }}>{emoji}</span>; })()}
                                        </span>
                                        <span className="yogurt-drag-overlay-label">{stepData.dragItems.find(item => item.id === activeId)?.name}</span>
                                    </div>
                                ) : null}
                            </DragOverlay>

                            {/* Step Description */}
                            <div className="yogurt-step-description">{stepData.description}</div>

                            {/* Science Info */}
                            <motion.div className="yogurt-science-info" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                <h3>
                                    {stepData.scienceInfo.title}
                                    {stepData.scienceInfo.hasAudio && (
                                        <button onClick={speakLactobacillus} style={{
                                            marginLeft: '10px', padding: '5px 10px',
                                            background: 'linear-gradient(145deg, #8b5cf6, #7c3aed)',
                                            border: 'none', borderRadius: '8px', cursor: 'pointer',
                                            fontSize: '1rem', color: 'white',
                                            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)'
                                        }} title="Nghe phát âm">🔊</button>
                                    )}
                                </h3>
                                <p>{stepData.scienceInfo.content}</p>
                            </motion.div>

                            {/* Controls */}
                            <div className="yogurt-controls">
                                <motion.button className="yogurt-btn yogurt-btn-secondary" onClick={handlePrev} disabled={currentStep === 1}
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>← Quay lại</motion.button>
                                <motion.button className={`yogurt-btn ${canProceed ? 'yogurt-btn-primary' : 'yogurt-btn-disabled'}`}
                                    onClick={handleNext} disabled={!canProceed}
                                    whileHover={canProceed ? { scale: 1.05 } : undefined}
                                    whileTap={canProceed ? { scale: 0.95 } : undefined}>
                                    {currentStep === 7 ? "Hoàn thành ✓" : "Tiếp theo →"}
                                </motion.button>
                            </div>
                        </DndContext>
                    )}
                </motion.main>
            </AnimatePresence>

            {/* Footer */}
            <footer style={{ marginTop: '10px', textAlign: 'center', padding: '8px' }}>
                <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: '500', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                    🔬 Thí nghiệm ảo - Lớp 5 | ✨ Tạo bởi thầy Đức
                </span>
            </footer>
        </div>
    );
};

export default YogurtExperiment;
