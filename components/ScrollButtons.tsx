import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

const ScrollButtons: React.FC = () => {
    const [showScrollUp, setShowScrollUp] = useState(false);
    const [showScrollDown, setShowScrollDown] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            // Show scroll up when scrolled down more than 300px
            setShowScrollUp(scrollY > 300);

            // Show scroll down when not at bottom
            setShowScrollDown(scrollY < documentHeight - windowHeight - 100);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial state

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const scrollToBottom = () => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    };

    return (
        <div className="fixed right-4 bottom-32 z-50 flex flex-col gap-2">
            <AnimatePresence>
                {showScrollUp && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0, y: 20 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={scrollToTop}
                        className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                        title="Lên đầu trang"
                    >
                        <ChevronUp size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showScrollDown && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0, y: -20 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={scrollToBottom}
                        className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                        title="Xuống cuối trang"
                    >
                        <ChevronDown size={24} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ScrollButtons;
