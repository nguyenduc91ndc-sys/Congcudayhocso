import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Theme {
    id: string;
    name: string;
    emoji: string;
    type: 'light' | 'dark';
    // Background Gradient colors
    from: string;
    via: string;
    to: string;
}

export const themes: Theme[] = [
    {
        id: 'modern',
        name: 'Hiện đại (Mặc định)',
        emoji: '✨',
        type: 'light',
        from: '#f3e7e9',
        via: '#e3eeff',
        to: '#f3e7e9',
    },
    {
        id: 'midnight',
        name: 'Đêm huyền bí',
        emoji: '🌙',
        type: 'dark',
        from: '#0f172a',
        via: '#1e293b',
        to: '#0f172a',
    },
    {
        id: 'sunset',
        name: 'Hoàng hôn',
        emoji: '🌅',
        type: 'light',
        from: '#FFF3E0', // Very light orange
        via: '#FFCCBC', // Light deep orange
        to: '#FFF3E0',
    },
    {
        id: 'forest',
        name: 'Rừng nhiệt đới',
        emoji: '🌿',
        type: 'dark',
        from: '#004d40',
        via: '#194d33',
        to: '#004d40',
    },
    {
        id: 'neon',
        name: 'Thành phố Neon',
        emoji: '🌃',
        type: 'dark',
        from: '#000000',
        via: '#111111',
        to: '#2b2b2b',
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
