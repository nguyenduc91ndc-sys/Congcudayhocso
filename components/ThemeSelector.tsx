import React from 'react';
import { useTheme, themes } from '../contexts/ThemeContext';
import { Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeSelector: React.FC = () => {
    const { currentTheme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-all border border-slate-700/50"
                title="Đổi màu giao diện"
            >
                <Palette size={18} className="text-slate-400" />
                <span className="hidden md:inline text-sm font-medium text-slate-300">
                    {currentTheme.emoji}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-12 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-3 z-50 min-w-[220px] max-h-[400px] overflow-y-auto"
                    >
                        <p className="text-xs text-slate-500 mb-2 px-2 font-medium">Chọn theme</p>
                        <div className="space-y-1">
                            {themes.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => {
                                        setTheme(theme.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentTheme.id === theme.id
                                            ? 'bg-slate-700 ring-1 ring-purple-500'
                                            : 'hover:bg-slate-700/50'
                                        }`}
                                >
                                    <div
                                        className="w-7 h-7 rounded-lg shadow-sm border border-white/10 flex-shrink-0"
                                        style={{
                                            background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientVia}, ${theme.gradientTo})`,
                                        }}
                                    />
                                    <span className="text-sm font-medium text-slate-200 flex-1 text-left">
                                        {theme.emoji} {theme.name}
                                    </span>
                                    {currentTheme.id === theme.id && (
                                        <span className="text-emerald-400 text-sm">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default ThemeSelector;

