import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Theme {
    id: string;
    name: string;
    emoji: string;
    gradientFrom: string;
    gradientVia: string;
    gradientTo: string;
    bubbleColors: string[];
}

export const themes: Theme[] = [
    {
        id: 'rainbow',
        name: 'Cầu vồng',
        emoji: '🌈',
        gradientFrom: '#667eea',
        gradientVia: '#f093fb',
        gradientTo: '#f5576c',
        bubbleColors: [
            'rgba(255, 107, 107, 0.6)',
            'rgba(255, 159, 67, 0.6)',
            'rgba(255, 214, 10, 0.6)',
            'rgba(46, 213, 115, 0.6)',
            'rgba(30, 144, 255, 0.6)',
            'rgba(156, 89, 182, 0.6)',
            'rgba(255, 107, 181, 0.6)',
        ],
    },
    {
        id: 'ocean',
        name: 'Đại dương',
        emoji: '🌊',
        gradientFrom: '#0093E9',
        gradientVia: '#56CCF2',
        gradientTo: '#80D0C7',
        bubbleColors: [
            'rgba(0, 147, 233, 0.5)',
            'rgba(86, 204, 242, 0.5)',
            'rgba(128, 208, 199, 0.5)',
            'rgba(255, 255, 255, 0.4)',
            'rgba(144, 224, 239, 0.5)',
        ],
    },
    {
        id: 'candy',
        name: 'Kẹo ngọt',
        emoji: '🍭',
        gradientFrom: '#ff9a9e',
        gradientVia: '#fecfef',
        gradientTo: '#a8edea',
        bubbleColors: [
            'rgba(255, 154, 158, 0.6)',
            'rgba(254, 207, 239, 0.6)',
            'rgba(168, 237, 234, 0.6)',
            'rgba(255, 182, 193, 0.6)',
            'rgba(255, 218, 185, 0.6)',
        ],
    },
    {
        id: 'forest',
        name: 'Rừng xanh',
        emoji: '🌲',
        gradientFrom: '#134E5E',
        gradientVia: '#3EA55C',
        gradientTo: '#71B280',
        bubbleColors: [
            'rgba(19, 78, 94, 0.5)',
            'rgba(62, 165, 92, 0.5)',
            'rgba(113, 178, 128, 0.5)',
            'rgba(144, 238, 144, 0.5)',
            'rgba(255, 255, 255, 0.3)',
        ],
    },
    {
        id: 'sunset',
        name: 'Hoàng hôn',
        emoji: '🌅',
        gradientFrom: '#F27121',
        gradientVia: '#E94057',
        gradientTo: '#8A2387',
        bubbleColors: [
            'rgba(242, 113, 33, 0.5)',
            'rgba(233, 64, 87, 0.5)',
            'rgba(138, 35, 135, 0.5)',
            'rgba(255, 183, 77, 0.5)',
            'rgba(255, 107, 107, 0.5)',
        ],
    },
    {
        id: 'dark',
        name: 'Dark Mode',
        emoji: '🌙',
        gradientFrom: '#1e293b',
        gradientVia: '#334155',
        gradientTo: '#1e293b',
        bubbleColors: [
            'rgba(100, 116, 139, 0.3)',
            'rgba(148, 163, 184, 0.2)',
            'rgba(71, 85, 105, 0.3)',
            'rgba(51, 65, 85, 0.4)',
            'rgba(30, 41, 59, 0.5)',
        ],
    },
    {
        id: 'midnight',
        name: 'Đêm khuya',
        emoji: '🌌',
        gradientFrom: '#0f0c29',
        gradientVia: '#302b63',
        gradientTo: '#24243e',
        bubbleColors: [
            'rgba(15, 12, 41, 0.5)',
            'rgba(48, 43, 99, 0.5)',
            'rgba(36, 36, 62, 0.5)',
            'rgba(138, 43, 226, 0.3)',
            'rgba(75, 0, 130, 0.3)',
        ],
    },
    {
        id: 'aurora',
        name: 'Cực quang',
        emoji: '✨',
        gradientFrom: '#00d2ff',
        gradientVia: '#3a7bd5',
        gradientTo: '#00d2ff',
        bubbleColors: [
            'rgba(0, 210, 255, 0.4)',
            'rgba(58, 123, 213, 0.4)',
            'rgba(0, 255, 255, 0.3)',
            'rgba(127, 255, 212, 0.4)',
            'rgba(255, 255, 255, 0.3)',
        ],
    },
    {
        id: 'sakura',
        name: 'Hoa anh đào',
        emoji: '🌸',
        gradientFrom: '#ffecd2',
        gradientVia: '#fcb69f',
        gradientTo: '#ff9a9e',
        bubbleColors: [
            'rgba(255, 236, 210, 0.6)',
            'rgba(252, 182, 159, 0.6)',
            'rgba(255, 154, 158, 0.6)',
            'rgba(255, 182, 193, 0.6)',
            'rgba(255, 218, 233, 0.5)',
        ],
    },
    {
        id: 'neon',
        name: 'Neon City',
        emoji: '🏙️',
        gradientFrom: '#0f0f23',
        gradientVia: '#1a1a3e',
        gradientTo: '#0f0f23',
        bubbleColors: [
            'rgba(0, 255, 255, 0.4)',
            'rgba(255, 0, 255, 0.4)',
            'rgba(255, 255, 0, 0.3)',
            'rgba(0, 255, 0, 0.3)',
            'rgba(255, 0, 100, 0.4)',
        ],
    },
];

interface ThemeContextType {
    currentTheme: Theme;
    setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

    useEffect(() => {
        const savedThemeId = localStorage.getItem('ntd_theme');
        if (savedThemeId) {
            const found = themes.find(t => t.id === savedThemeId);
            if (found) setCurrentTheme(found);
        }
    }, []);

    const setTheme = (themeId: string) => {
        const found = themes.find(t => t.id === themeId);
        if (found) {
            setCurrentTheme(found);
            localStorage.setItem('ntd_theme', themeId);
        }
    };

    return (
        <ThemeContext.Provider value={{ currentTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
