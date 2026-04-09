import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { planetsData, listPlanetsKeys } from './data';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { playCorrectSound, playIncorrectSound, playHoverSound } from '../../utils/soundUtils';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay, CollisionDetection } from '@dnd-kit/core';

const radialCollisionDetection: CollisionDetection = (args) => {
  const { pointerCoordinates, droppableContainers } = args;
  if (!pointerCoordinates) return [];

  let bestHit = null;
  let minDiff = Infinity;

  for (const container of droppableContainers) {
    const rect = container.rect.current;
    if (!rect) continue;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const R = Math.max(rect.width, rect.height) / 2;

    const distanceToCenter = Math.sqrt(
      Math.pow(pointerCoordinates.x - cx, 2) + Math.pow(pointerCoordinates.y - cy, 2)
    );
    const distanceToRing = Math.abs(distanceToCenter - R);

    if (distanceToRing < minDiff) {
      minDiff = distanceToRing;
      bestHit = container;
    }
  }

  // Khoảng cách nhượng bộ 60px là đủ hào phóng để dễ chạm thả
  if (bestHit && minDiff < 60) {
    return [{ id: bestHit.id, data: { value: minDiff, droppableContainer: bestHit } }];
  }

  return [];
};

// Draggable Planet Component
const DraggablePlanet = ({ id, planet, isDragged }: { id: string; planet: any; isDragged?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, perspective: 1000 }}
      {...listeners}
      {...attributes}
      onMouseEnter={playHoverSound}
      className={`group flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing p-2 rounded-xl transition-all w-full touch-none
        ${isDragged ? 'opacity-0' : 'bg-white/5 border border-transparent hover:bg-white/10 hover:border-emerald-500/30'}`}
    >
      <motion.img 
        whileHover={{ rotateY: 180, scale: 1.1, filter: "drop-shadow(0 0 15px rgba(52,211,153,0.6))" }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        src={planet.img} 
        alt={planet.n} 
        className="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover shadow-lg border border-white/20" 
        draggable={false} 
      />
      <span className="text-[10px] sm:text-xs text-white text-center font-medium leading-tight group-hover:text-emerald-400 transition-colors">{planet.n}</span>
    </div>
  );
};

// Droppable Orbit Component
const DroppableOrbit = ({ orbitKey, isPlaced, isCorrectlyDropped }: { orbitKey: string; isPlaced: boolean; isCorrectlyDropped: boolean }) => {
  const p = planetsData[orbitKey];
  const { isOver, setNodeRef } = useDroppable({
    id: orbitKey,
  });

  return (
    <div className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none z-10">
      <div
        ref={setNodeRef}
        className={`absolute rounded-full border-2 transition-all duration-300 pointer-events-auto
          ${isPlaced 
              ? 'border-emerald-400/60 bg-emerald-500/5' 
              : 'border-white/30 border-dashed hover:border-emerald-400 hover:border-solid hover:bg-emerald-500/10'} 
          ${isOver && !isPlaced ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] border-solid bg-emerald-500/20' : ''}`}
        style={{ width: p.d, height: p.d }}
      />
    </div>
  );
};

export const PracticeMode: React.FC = () => {
  const [placedPlanets, setPlacedPlanets] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const availablePlanets = listPlanetsKeys.filter(k => !placedPlanets[k]);

  const [shuffledKeys] = useState(() => {
    return [...listPlanetsKeys].sort(() => Math.random() - 0.5);
  });

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    setFeedback(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.id === over.id) {
      setPlacedPlanets(prev => ({ ...prev, [active.id as string]: true }));
      setFeedback({ type: 'success', msg: `Xuất sắc! Bé đã đặt ${planetsData[active.id as string].n} thành công.` });
      playCorrectSound();
    } else {
      setFeedback({ type: 'error', msg: 'Chưa đúng rồi! Hành tinh này ở quỹ đạo khác.' });
      playIncorrectSound();
    }
  };

  const showFeedback = feedback !== null;
  const activePlanet = activeId ? planetsData[activeId] : null;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={radialCollisionDetection}>
      <div className="relative w-full h-full flex flex-row">
        
        {/* Sidebar: Planet Tray */}
        <div className="w-24 sm:w-32 h-full bg-black/60 backdrop-blur-xl border-r-2 border-emerald-500/30 p-2 sm:p-4 overflow-y-auto flex flex-col items-center gap-4 z-20 shadow-[5px_0_30px_rgba(16,185,129,0.1)] rounded-tr-3xl rounded-br-3xl">
          <h3 className="text-emerald-400 font-black text-xs sm:text-sm text-center mb-2 uppercase tracking-wide">SẮP XẾP</h3>
          <AnimatePresence>
            {shuffledKeys.map((key) => {
              if (placedPlanets[key]) return null;
              return (
                <DraggablePlanet 
                  key={key} 
                  id={key} 
                  planet={planetsData[key]} 
                  isDragged={activeId === key}
                />
              );
            })}
          </AnimatePresence>
          {availablePlanets.length === 0 && (
            <div className="text-center mt-10">
              <span className="text-4xl block mb-2">🎉</span>
              <p className="text-emerald-400 text-sm font-bold">HOÀN THÀNH!</p>
            </div>
          )}
        </div>

        {/* Main Simulation Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          
          {/* Instructions */}
          <div className="absolute top-6 right-6 max-w-[200px] sm:max-w-xs bg-black/60 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-4 shadow-2xl z-20 pointer-events-none shadow-[0_5px_30px_rgba(16,185,129,0.2)]">
            <h4 className="text-sm sm:text-base font-bold text-emerald-400 mb-1 flex items-center gap-2"><span className="text-lg">🪐</span> THỬ THÁCH SẮP XẾP</h4>
            <p className="text-xs sm:text-sm text-white/80">
              Bé chọn hành tinh rồi <b>kéo thả</b> vào vòng tròn phù hợp nhé!
            </p>
          </div>

          {/* Feedback Overlay Message */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div 
                initial={{ opacity: 0, y: -20, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -20, x: '-50%' }}
                className={`absolute top-24 left-1/2 z-30 px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3
                  ${feedback.type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-red-900/90 border-red-500 text-red-100'}`}
              >
                {feedback.type === 'success' ? <CheckCircle2 size={24} className="text-emerald-400" /> : <AlertCircle size={24} className="text-red-400" />}
                <span className="font-semibold text-sm sm:text-base">{feedback.msg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Solar System Container */}
          <div className="relative w-[1200px] h-[1200px] flex items-center justify-center transform scale-[0.4] sm:scale-[0.5] md:scale-[0.6] lg:scale-[0.8] xl:scale-[0.9]">
            {/* Sun */}
            <div
              className="absolute z-10 rounded-full shadow-[0_0_60px_#ff6a00]"
              style={{ width: 100, height: 100, background: 'radial-gradient(circle, #fffa00, #ff8c00)' }}
            />

            {/* Orbits and Placed Planets */}
            {listPlanetsKeys.map((key) => {
              const p = planetsData[key];
              const isPlaced = placedPlanets[key];

              return (
                <div key={key} className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none">
                  <DroppableOrbit orbitKey={key} isPlaced={isPlaced} isCorrectlyDropped={isPlaced} />

                  {/* Placed Planet Animation */}
                  <AnimatePresence>
                    {isPlaced && (
                      <motion.div
                        className="absolute z-20 pointer-events-none"
                        style={{ width: p.d, height: p.d }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: p.sp * 2, repeat: Infinity, ease: "linear" }}
                      >
                        {/* Counter-rotation container */}
                        <motion.div
                          className="absolute"
                          style={{
                            width: p.s,
                            height: p.s,
                            top: -p.s / 2,
                            left: '50%',
                            x: '-50%',
                            y: 0,
                          }}
                          animate={{ rotate: -360 }}
                          transition={{ duration: p.sp * 2, repeat: Infinity, ease: "linear" }}
                        >
                           {/* Planet Image */}
                           <motion.div
                             className="w-full h-full rounded-full bg-cover bg-center"
                             style={{
                               backgroundImage: `url(${p.img})`,
                               boxShadow: 'inset -8px -8px 20px rgba(0,0,0,0.7), 0 0 15px rgba(255,255,255,0.2)'
                             }}
                             initial={{ scale: 0 }}
                             animate={{ scale: 1 }}
                             transition={{ type: "spring" }}
                           />
                           
                           {/* Saturn Rings */}
                           {p.r && (
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220%] h-[40%] rounded-[50%] border-[4px] border-amber-200/40 transform rotate-[20deg]" />
                           )}

                           {/* Planet Label - placed to the right */}
                           <motion.div 
                             initial={{ opacity: 0, x: -10 }} 
                             animate={{ opacity: 1, x: 0 }} 
                             transition={{ delay: 0.2 }}
                             className="absolute top-1/2 left-full ml-3 -translate-y-1/2 px-2 py-1 bg-black/80 rounded text-xs font-bold text-white whitespace-nowrap shadow-[0_0_15px_rgba(52,211,153,0.6)] border border-emerald-400"
                           >
                             {p.n}
                           </motion.div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Drag Overlay (Visual representation while dragging) */}
        <DragOverlay>
          {activePlanet ? (
            <div className="flex flex-col items-center gap-1 cursor-grabbing p-2 overflow-visible scale-125">
              <img src={activePlanet.img} alt={activePlanet.n} className="w-14 h-14 rounded-full object-cover shadow-[0_0_20px_rgba(52,211,153,0.6)] border-2 border-emerald-400" />
              <span className="text-xs text-white text-center font-bold bg-black/60 px-2 rounded-full">{activePlanet.n}</span>
            </div>
          ) : null}
        </DragOverlay>

      </div>
    </DndContext>
  );
};

