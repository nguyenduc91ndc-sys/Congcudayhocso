import React from 'react';
import { useTheme, themes } from '../contexts/ThemeContext';
import { Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeSelector: React.FC = () => {
    const { currentTheme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = React.useState(false);
    const isDark = currentTheme.type === 'dark';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700 border-slate-700/50 text-slate-300'
                    : 'bg-white/50 hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                title="Đổi màu giao diện"
            >
                <Palette size={18} className={isDark ? "text-slate-400" : "text-slate-600"} />
                <span className="hidden md:inline text-sm font-medium">
                    {currentTheme.emoji}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className={`absolute right-0 top-12 backdrop-blur-xl rounded-xl shadow-2xl border p-3 z-50 min-w-[240px] max-h-[400px] overflow-y-auto ${isDark
                            ? 'bg-slate-800/95 border-slate-700 text-slate-200'
                            : 'bg-white/90 border-white/40 text-slate-800'
                            }`}
                    >
                        <p className={`text-xs mb-2 px-2 font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Chọn giao diện</p>
                        <div className="space-y-1">
                            {themes.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => {
                                        setTheme(theme.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${currentTheme.id === theme.id
                                        ? (isDark ? 'bg-slate-700 ring-2 ring-purple-500 shadow-sm' : 'bg-purple-50 ring-2 ring-purple-500 shadow-sm')
                                        : (isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100')
                                        }`}
                                >
                                    <div
                                        className="w-8 h-8 rounded-full shadow-sm border-2 border-white/20 flex-shrink-0"
                                        style={{
                                            background: `linear-gradient(135deg, ${theme.from}, ${theme.via}, ${theme.to})`,
                                        }}
                                    />
                                    <div className="flex-1 text-left">
                                        <p className={`text-sm font-bold ${currentTheme.id === theme.id
                                            ? 'text-purple-500'
                                            : (isDark ? 'text-slate-200' : 'text-slate-700')
                                            }`}>
                                            {theme.name}
                                        </p>
                                        <p className="text-xs text-slate-400 font-medium capitalize">
                                            {theme.type} mode
                                        </p>
                                    </div>
                                    <span className="text-xl">{theme.emoji}</span>
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

