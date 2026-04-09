import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { planetsData, listPlanetsKeys } from './data';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { playNotificationSound } from '../../utils/soundUtils';

// Scale factors to convert 2D data to 3D space
const DISTANCE_SCALE = 0.05; // orbit diameter multiplier
const SIZE_SCALE = 0.02; // planet size multiplier
const TIME_SCALE = 0.2; // base spinning speed

const Sun = ({ onClick }: { onClick: () => void }) => {
  const sunTextureUrl = "https://upload.wikimedia.org/wikipedia/commons/b/b4/Solarsystemscope_texture_2k_sun.jpg";
  const texture = useTexture(sunTextureUrl);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <mesh ref={meshRef} onClick={onClick}>
      <sphereGeometry args={[100 * SIZE_SCALE * 1.5, 64, 64]} />
      {/* Sun Emissive Material */}
      <meshBasicMaterial map={texture} />
      <pointLight intensity={2} distance={200} decay={1} />
      
      {/* Subtle Glow */}
      <mesh>
        <sphereGeometry args={[100 * SIZE_SCALE * 1.65, 32, 32]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
    </mesh>
  );
};

const Planet3D = ({ planetKey, onClick }: { planetKey: string, onClick: () => void }) => {
  const p = planetsData[planetKey];
  const texture = useTexture(p.map3d);
  
  // Use ring texture if Saturn
  const ringTexture = p.r ? useTexture(p.ringMap3d) : null;
  
  const orbitRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const radius = (p.d / 2) * DISTANCE_SCALE + 3; // +3 to give sun some space
  const size = p.s * SIZE_SCALE;
  const speed = 1 / p.sp * TIME_SCALE; 

  // Random starting position in orbit
  const startAngle = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(() => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += speed;
    }
    if (planetRef.current) {
      planetRef.current.rotation.y += speed * 5; // Self rotation
    }
    if (ringRef.current && p.r) {
      ringRef.current.rotation.z += speed; 
    }
  });

  return (
    <group ref={orbitRef} rotation={[0, startAngle, 0]}>
      <mesh 
        position={[radius, 0, 0]} 
        ref={planetRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial map={texture} roughness={0.6} />

        {/* Labels float above planets */}
        <Html distanceFactor={15} transform sprite position={[0, size + 0.5, 0]}>
          <div className="bg-black/80 backdrop-blur border border-white/20 text-white px-2 py-1 rounded text-[10px] sm:text-xs font-bold whitespace-nowrap opacity-80 hover:opacity-100 cursor-pointer pointer-events-none">
            {p.n}
          </div>
        </Html>

        {/* Render Rings for Saturn */}
        {p.r && ringTexture && (
          <mesh rotation={[Math.PI / 2.2, 0, 0]} ref={ringRef}>
            <ringGeometry args={[size * 1.4, size * 2.2, 64]} />
            <meshStandardMaterial 
              map={ringTexture} 
              transparent 
              opacity={0.8} 
              side={THREE.DoubleSide} 
            />
          </mesh>
        )}
      </mesh>

      {/* Orbit Line */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const Explore3DMode: React.FC = () => {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  const handlePlanetSelect = (key: string) => {
    setSelectedPlanet(key);
    playNotificationSound();
  };

  const selectedData = selectedPlanet === 'sun' 
    ? {
        n: "Mặt Trời",
        cl: "Quả cầu lửa khổng lồ",
        img: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Solarsystemscope_texture_2k_sun.jpg",
        info: [
          "Ngôi sao trung tâm tạo ra ánh sáng và sức nóng cho mầm sống.",
          "To lớn đến mức có thể chứa hàng triệu Trái Đất bên trong.",
          "Bề mặt cuộn trào những ngọn lửa mặt trời khổng lồ."
        ]
      }
    : selectedPlanet ? planetsData[selectedPlanet] : null;

  return (
    <div className="relative w-full h-full bg-black">
      
      {/* ThreeJS Canvas */}
      <Canvas camera={{ position: [0, 15, 30], fov: 50 }}>
        {/* Ambient Light for the dark side of planets */}
        <ambientLight intensity={0.05} />
        
        {/* Stars Background */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Camera Controls */}
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          maxDistance={100}
          minDistance={5}
        />

        <React.Suspense fallback={
          <Html center>
            <div className="text-emerald-400 font-bold whitespace-nowrap bg-black/60 px-4 py-2 rounded-xl border border-white/10">
              Đang kiến tạo vũ trụ...
            </div>
          </Html>
        }>
          <Sun onClick={() => handlePlanetSelect('sun')} />
          {listPlanetsKeys.map(key => (
            <Planet3D 
              key={key} 
              planetKey={key} 
              onClick={() => handlePlanetSelect(key)} 
            />
          ))}
        </React.Suspense>
      </Canvas>

      {/* Floating Instructions */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none md:block hidden">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 max-w-xs shadow-2xl">
          <h4 className="text-emerald-400 font-bold mb-2 uppercase tracking-wide text-sm flex items-center gap-2">
            <span className="text-xl">🌌</span> ĐIỀU KHIỂN 3D
          </h4>
          <ul className="text-xs text-white/80 space-y-1">
            <li><span className="font-bold text-white">Chuột trái:</span> Kéo để xoay góc nhìn</li>
            <li><span className="font-bold text-white">Lăn chuột:</span> Cuộn để Thu/Phóng</li>
            <li><span className="font-bold text-white">Chuột phải:</span> Kéo để di chuyển</li>
            <li className="pt-2 text-amber-400">Chạm vào hành tinh để xem thông tin!</li>
          </ul>
        </div>
      </div>

      {/* Info Modal Component */}
      <AnimatePresence>
        {selectedPlanet && selectedData && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 md:bottom-auto md:left-auto md:top-1/2 md:-translate-y-1/2 md:right-10 z-30 w-[90%] md:w-[400px]"
          >
            <div className="bg-[#1a1a2e]/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              {/* Header Image */}
              <div className="relative h-48 sm:h-56 overflow-hidden bg-black flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/90 to-transparent z-10" />
                <motion.div 
                   className="w-40 h-40 rounded-full bg-cover bg-center shadow-[0_0_50px_rgba(255,255,255,0.1)] relative z-0"
                   style={{ backgroundImage: `url(${selectedData.img})` }}
                   initial={{ rotate: 0 }}
                   animate={{ rotate: 360 }}
                   transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                />
                
                <button 
                  onClick={() => setSelectedPlanet(null)}
                  className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 relative z-20 -mt-10">
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-400 mb-2 drop-shadow-md uppercase">
                  {selectedData.n}
                </h2>
                <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-emerald-200 mb-4">
                  🎨 {selectedData.cl}
                </div>
                
                <ul className="space-y-3">
                  {selectedData.info.map((fact: string, i: number) => (
                    <motion.li 
                      key={i} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="flex items-start gap-3"
                    >
                      <span className="text-cyan-400 mt-0.5 text-base shadow-sm">🚀</span>
                      <span className="text-sm text-slate-200 leading-relaxed font-medium">{fact}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
