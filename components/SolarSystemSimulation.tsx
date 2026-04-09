import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Focus, HelpCircle, LogOut, Maximize, Minimize, Link, Check } from 'lucide-react';
import { ExploreMode } from './solar-system/ExploreMode';
import { PracticeMode } from './solar-system/PracticeMode';
import { QuizMode } from './solar-system/QuizMode';
import { playHoverSound } from '../utils/soundUtils';

interface Props {
  onBack: () => void;
}

type TabType = 'EXPLORE' | 'PRACTICE' | 'QUIZ';

export default function SolarSystemSimulation({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('EXPLORE');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/share/he-mat-troi`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a1a] flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* Deep Space Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a3a] via-[#0a0a1a] to-black" />
        {/* Simple stars background via CSS */}
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 1px), radial-gradient(white 2px, transparent 2px)',
          backgroundSize: '100px 100px, 250px 250px',
          backgroundPosition: '0 0, 50px 50px'
        }} />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col h-full order-2 md:order-1">
        
        {/* Top Bar for Mobile only */}
        <div className="md:hidden flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/10">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            HỆ MẶT TRỜI
          </h1>
          <button onClick={onBack} className="p-2 text-white/70 hover:text-white bg-white/5 rounded-lg">
            <LogOut size={20} />
          </button>
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'EXPLORE' && <ExploreMode />}
          {activeTab === 'PRACTICE' && <PracticeMode />}
          {activeTab === 'QUIZ' && <QuizMode />}
        </div>
      </div>

      {/* Side Navigation Panel (Sci-Fi Style) */}
      <div className="relative z-20 w-full md:w-24 lg:w-64 h-auto md:h-full bg-black/60 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-white/10 flex flex-row md:flex-col items-center py-2 md:py-8 px-4 md:px-0 order-1 md:order-2 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Header - Desktop only */}
        <div className="hidden md:flex flex-col items-center mb-10 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
            <Compass size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-wider lg:block hidden uppercase">
            HỆ MẶT TRỜI
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-row md:flex-col w-full gap-2 md:gap-4 md:px-4 justify-center">
          <TabButton 
            active={activeTab === 'EXPLORE'} 
            onClick={() => setActiveTab('EXPLORE')}
            icon={<Compass size={24} />} 
            label="Khám Phá" 
            color="from-cyan-400 to-blue-500"
          />
          <TabButton 
            active={activeTab === 'PRACTICE'} 
            onClick={() => setActiveTab('PRACTICE')}
            icon={<Focus size={24} />} 
            label="Thực Hành" 
            color="from-emerald-400 to-teal-500"
          />
          <TabButton 
            active={activeTab === 'QUIZ'} 
            onClick={() => setActiveTab('QUIZ')}
            icon={<HelpCircle size={24} />} 
            label="Luyện Tập" 
            color="from-amber-400 to-orange-500"
          />
        </div>

        {/* Action Buttons & Exit - Desktop only */}
        <div className="hidden md:flex flex-col mt-auto w-full px-4 gap-4">
          
          {/* Quick Actions */}
          <div className="flex flex-row w-full gap-2">
            <button
              onClick={handleCopyLink}
              onMouseEnter={playHoverSound}
              className="group flex-1 py-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 transition-colors border border-blue-500/30 overflow-hidden relative"
              title="Sao chép link chia sẻ"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/20 to-blue-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <motion.div whileHover={{ scale: 1.2, rotate: 15 }} transition={{ type: "spring" }}>
                {isCopied ? <Check size={20} /> : <Link size={20} />}
              </motion.div>
            </button>
            <button
              onClick={toggleFullScreen}
              onMouseEnter={playHoverSound}
              className="group flex-1 py-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl flex items-center justify-center text-green-400 transition-colors border border-green-500/30 overflow-hidden relative"
              title="Toàn màn hình"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/20 to-green-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <motion.div whileHover={{ scale: 1.2, rotate: -15 }} transition={{ type: "spring" }}>
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </motion.div>
            </button>
          </div>

          {/* Exit Button */}
          <button 
            onClick={onBack}
            onMouseEnter={playHoverSound}
            className="w-full py-4 flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-[rgba(239,68,68,0.2)] text-white/50 hover:text-red-400 transition-all font-bold group border border-transparent hover:border-red-500/50"
          >
            <motion.div whileHover={{ x: -5, scale: 1.1 }}>
              <LogOut size={20} />
            </motion.div>
            <span className="lg:block hidden">THOÁT</span>
          </button>
        </div>
      </div>

    </div>
  );
}

// Subcomponent for Navigation Buttons
function TabButton({ active, onClick, icon, label, color }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color: string }) {
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={playHoverSound}
      whileHover="hover"
      className={`relative w-full aspect-square md:aspect-auto md:py-4 rounded-2xl flex flex-col md:flex-row items-center justify-center lg:justify-start lg:px-6 gap-2 lg:gap-4 transition-all duration-300 overflow-hidden ${active ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-transparent text-white/40 hover:text-white/90 hover:bg-white/5 border border-transparent hover:border-white/10'}`}
    >
      {/* Background glow for active state */}
      {active && (
        <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-20`} />
      )}
      
      {/* Light sweep effect on hover */}
      <motion.div 
        variants={{
          hover: { x: ["-100%", "200%"] }
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
      />

      {/* Indicator Line */}
      {active && (
        <motion.div 
          layoutId="activeTabIndicator"
          className={`absolute bottom-0 md:bottom-auto md:left-0 w-1/2 md:w-1 h-1 md:h-1/2 rounded-full bg-gradient-to-b ${color}`} 
        />
      )}
      
      <motion.div 
        variants={{
          hover: { rotateY: 180, scale: 1.2, filter: "drop-shadow(0px 0px 8px rgba(255,255,255,0.8))" }
        }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className={`z-10 transition-colors duration-300 ${active ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : ''}`}
      >
        {icon}
      </motion.div>
      <span className="z-10 text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-wider hidden md:block lg:block">
        {label}
      </span>
      {/* Mobile label */}
      <span className="z-10 text-[10px] font-bold uppercase tracking-wider block md:hidden">
        {label}
      </span>
    </motion.button>
  );
}
