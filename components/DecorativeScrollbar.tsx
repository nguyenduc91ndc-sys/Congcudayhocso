import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const DecorativeScrollbar: React.FC = () => {
    const [scrollPercent, setScrollPercent] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [docHeight, setDocHeight] = useState(0);
    const trackRef = useRef<HTMLDivElement>(null);

    // Track scroll position and document height
    useEffect(() => {
        const updateState = () => {
            const totalHeight = document.documentElement.scrollHeight;
            const windowHeight = window.innerHeight;
            setDocHeight(totalHeight - windowHeight);

            if (!isDragging) {
                const scrollTop = window.scrollY;
                const percent = (totalHeight - windowHeight) > 0
                    ? (scrollTop / (totalHeight - windowHeight)) * 100
                    : 0;
                setScrollPercent(Math.min(100, Math.max(0, percent)));
            }
        };

        window.addEventListener('scroll', updateState);
        window.addEventListener('resize', updateState);
        updateState();

        // Recheck for dynamic content
        const observer = new MutationObserver(updateState);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('scroll', updateState);
            window.removeEventListener('resize', updateState);
            observer.disconnect();
        };
    }, [isDragging]);

    // Handle drag
    const handleDrag = (clientY: number) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const thumbHeight = 40; // 10% of track height
        const trackHeight = rect.height - thumbHeight;
        const relativeY = clientY - rect.top - thumbHeight / 2;
        const percent = (relativeY / trackHeight) * 100;
        const clampedPercent = Math.min(100, Math.max(0, percent));

        setScrollPercent(clampedPercent);
        window.scrollTo({ top: (clampedPercent / 100) * docHeight, behavior: 'auto' });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        handleDrag(e.clientY);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            handleDrag(e.clientY);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDragging, docHeight]);

    // Thumb position - track is 70vh, thumb is 40px
    // Max travel = track height - thumb height (calculated dynamically)
    const trackHeight = typeof window !== 'undefined' ? window.innerHeight * 0.7 : 400;
    const thumbHeight = 40;
    const maxTravel = trackHeight - thumbHeight;
    const thumbPosition = (scrollPercent / 100) * maxTravel;

    return (
        <motion.div
            ref={trackRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="fixed right-2 top-1/2 -translate-y-1/2 z-[100] cursor-pointer group"
            onMouseDown={handleMouseDown}
        >
            {/* Track - 70% of screen height */}
            <div className="w-3 h-[70vh] bg-white/20 rounded-full relative backdrop-blur-md border border-white/30 shadow-lg group-hover:bg-white/30 transition-all duration-200">
                {/* Thumb */}
                <motion.div
                    className={`absolute left-0 right-0 w-3 h-10 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-full shadow-md transition-all duration-100 ${isDragging
                        ? 'scale-110 shadow-amber-500/50 shadow-lg'
                        : 'hover:scale-105 hover:shadow-amber-400/30'
                        }`}
                    style={{ top: thumbPosition }}
                />
            </div>

            {/* Scroll indicator text */}
            <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: isDragging ? 1 : 0 }}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-amber-500 text-white text-xs px-2 py-1 rounded-md font-medium shadow-lg"
            >
                {Math.round(scrollPercent)}%
            </motion.div>
        </motion.div>
    );
};

export default DecorativeScrollbar;
