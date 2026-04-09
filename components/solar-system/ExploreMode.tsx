import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { planetsData, listPlanetsKeys } from './data';
import { X, Info, Orbit } from 'lucide-react';
import { playNotificationSound } from '../../utils/soundUtils';

export const ExploreMode: React.FC = () => {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  // When a planet is selected, we pause the orbit animation
  useEffect(() => {
    if (selectedPlanet) {
      setPaused(true);
    } else {
      setPaused(false);
    }
  }, [selectedPlanet]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Simulation Area */}
      <div className="relative w-[1200px] h-[1200px] flex items-center justify-center transform scale-[0.4] sm:scale-[0.5] md:scale-[0.6] lg:scale-[0.8] xl:scale-[0.9]">
        {/* Sun */}
        <div
          className="absolute z-10 rounded-full cursor-pointer shadow-[0_0_60px_#ff6a00]"
          style={{
            width: 100,
            height: 100,
            background: 'radial-gradient(circle, #fffa00, #ff8c00)',
          }}
          onClick={() => {
            setSelectedPlanet('sun');
            playNotificationSound();
          }}
        />

        {/* Orbits and Planets */}
        {listPlanetsKeys.map((key, idx) => {
          const p = planetsData[key];
          const radius = p.d / 2;
          const orbitDuration = p.sp * 2; // adjust speed

          return (
            <div key={key} className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none">
              {/* Orbit Ring */}
              <div
                className="absolute rounded-full border border-white/20"
                style={{
                  width: p.d,
                  height: p.d,
                }}
              />

              {/* Planet Rotating Container */}
              <motion.div
                className="absolute"
                style={{
                  width: p.d,
                  height: p.d,
                }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: orbitDuration,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {/* Planet Content with Counter Rotation to keep text upright */}
                <motion.div
                  className="absolute pointer-events-auto cursor-pointer"
                  style={{
                    width: p.s,
                    height: p.s,
                    top: -p.s / 2,
                    left: '50%',
                    x: '-50%',
                    y: 0,
                  }}
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: orbitDuration,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  whileHover={{ scale: 1.3 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlanet(key);
                    playNotificationSound();
                  }}
                >
                  {/* Planet Image */}
                  <div
                    className="w-full h-full rounded-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${p.img})`,
                      boxShadow: 'inset -8px -8px 20px rgba(0,0,0,0.7), 0 0 15px rgba(255,255,255,0.2)'
                    }}
                  />
                  
                  {/* Rings for Saturn */}
                  {p.r && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220%] h-[40%] rounded-[50%] border-[4px] border-amber-200/40 transform rotate-[20deg] pointer-events-none" />
                  )}

                  {/* Planet Label - placed to the right */}
                  <div className="absolute top-1/2 left-full ml-3 -translate-y-1/2 px-2 py-1 bg-black/60 border border-white/10 rounded text-xs font-bold text-white whitespace-nowrap opacity-0 md:opacity-100">
                    {p.n}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Control Panel (UI overlay) */}
      <div className="absolute top-6 left-6 max-w-xs bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl z-20">
        <h3 className="text-xl font-bold text-cyan-400 mb-2 flex items-center gap-2">
          <Orbit size={20} /> Khám phá Vũ Trụ
        </h3>
        <p className="text-sm text-white/80 leading-relaxed">
          Chạm vào các hành tinh hoặc Mặt Trời để xem thông tin chi tiết. 
          Các hành tinh đang di chuyển quanh Mặt Trời với tốc độ mô phỏng tương đối.
        </p>
      </div>

      {/* Planet Info Modal */}
      <AnimatePresence>
        {selectedPlanet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSelectedPlanet(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute z-50 p-6 w-[90%] max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-6 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <button 
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                onClick={() => setSelectedPlanet(null)}
              >
                <X size={18} />
              </button>

              {/* Image Section */}
              <div className="flex-1 rounded-2xl bg-black/50 p-4 flex items-center justify-center border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10" />
                <motion.img 
                  src={selectedPlanet === 'sun' ? 'https://upload.wikimedia.org/wikipedia/commons/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg' : planetsData[selectedPlanet].img}
                  alt="Planet"
                  className="w-48 h-48 sm:w-64 sm:h-64 object-cover rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                  initial={{ rotate: -20, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                />
              </div>

              {/* Info Section */}
              <div className="flex-1 flex flex-col justify-center">
                <h2 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-emerald-200 mb-2">
                  {selectedPlanet === 'sun' ? 'MẶT TRỜI' : planetsData[selectedPlanet].n.toUpperCase()}
                </h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 w-fit mb-4 text-cyan-200 text-sm font-semibold">
                  <Info size={14} />
                  {selectedPlanet === 'sun' ? 'Ngôi sao trung tâm' : planetsData[selectedPlanet].cl}
                </div>
                
                <ul className="space-y-3 mb-6">
                  {(selectedPlanet === 'sun' 
                    ? [
                      "Là trung tâm phát sáng khổng lồ của thời tiết", 
                      "Nhiệt độ bề mặt lên tới khoảng 5.500 độ C", 
                      "Lớn gấp hơn 1 triệu lần Trái Đất"
                    ] 
                    : planetsData[selectedPlanet].info).map((fact: string, index: number) => (
                    <li key={index} className="flex gap-3 text-white/90 text-sm sm:text-base">
                      <span className="text-cyan-400 mt-1 flex-shrink-0">🚀</span>
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => setSelectedPlanet(null)}
                  className="mt-auto py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-[0_4px_20px_rgba(6,182,212,0.3)] transition-all active:scale-95"
                >
                  TIẾP TỤC KHÁM PHÁ
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
