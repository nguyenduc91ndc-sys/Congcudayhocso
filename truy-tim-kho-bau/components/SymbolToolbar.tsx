import React, { useState } from 'react';

// Danh mục ký hiệu theo môn học
const SYMBOL_CATEGORIES = [
    {
        id: 'math', name: 'Toán', icon: '🔢',
        symbols: [
            '+', '−', '×', '÷', '=', '≠', '±', '√',
            '<', '>', '≤', '≥', '≈', '≡',
            '½', '¼', '¾', '⅓', '⅔', '⅕', '⅖', '⅗',
            '²', '³', '⁴', '⁵', 'ⁿ', '₀', '₁', '₂', '₃',
            '°', '△', '□', '○', '⊥', '∥', '∠', '⌀',
            '∈', '∉', '⊂', '⊃', '∪', '∩', '∅',
            '∧', '∨', '¬', '→', '↔', '∀', '∃',
            'π', '∞', 'Σ', '∫', 'Δ', '%', '‰', '∴'
        ]
    },
    {
        id: 'physics', name: 'Lý', icon: '⚡',
        symbols: [
            'Ω', 'Å', 'μ', 'λ', 'ν', 'ρ',
            'α', 'β', 'γ', 'δ', 'ε', 'θ', 'φ', 'ω', 'Φ', 'Ψ',
            '→', '←', '↑', '↓', '⇒', '⇔', '↗', '↘',
            '⃗', '∥', '⊥',
            '°C', '°F', 'K'
        ]
    },
    {
        id: 'chemistry', name: 'Hóa', icon: '🧪',
        symbols: [
            '→', '⇌', '↑', '↓', '⟶', '⟵',
            '₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉',
            '⁺', '⁻', '⁰', '⁺²', '⁺³', '⁻²',
            '−', '=', '≡',
            'H', 'O', 'N', 'C', 'S', 'P', 'Cl', 'Na', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Ag'
        ]
    },
    {
        id: 'biology', name: 'Sinh', icon: '🌿',
        symbols: [
            '♂', '♀', '⚥', '×', '→', '↓',
            '🧬', '🦠', '🧫', '🔬',
            'F₁', 'F₂', 'P', 'Aa', 'AA', 'aa',
            'n', '2n', '±'
        ]
    },
    {
        id: 'vietnamese', name: 'Văn', icon: '📚',
        symbols: [
            '«', '»', '„', '\u201c', '\u201d', '\u2018', '\u2019',
            '—', '–', '…',
            '§', '¶', '†', '‡', '•', '○', '●',
            '¹', '²', '³', '⁴', '⁵',
            '→', '⇒'
        ]
    },
    {
        id: 'geography', name: 'Địa', icon: '🌍',
        symbols: [
            '°', '′', '″',
            '↑', '↓', '←', '→', '↗', '↘', '↙', '↖',
            '★', '☆', '▲', '△', '■', '□', '●', '○',
            'N', 'S', 'E', 'W', '🧭', '🗺️'
        ]
    },
    {
        id: 'history', name: 'Sử', icon: '🕐',
        symbols: [
            'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ',
            'ⅰ', 'ⅱ', 'ⅲ', 'ⅳ', 'ⅴ',
            '→', '←', '↔', '⟹',
            '†', '‡', '§', '※'
        ]
    },
    {
        id: 'english', name: 'Anh', icon: '🔤',
        symbols: [
            'ə', 'æ', 'ɑ', 'ɔ', 'ʃ', 'ʒ', 'θ', 'ð', 'ŋ',
            'ɪ', 'ʊ', 'ʌ', 'ɜ', 'ɛ', 'ɒ',
            'ˈ', 'ˌ', 'ː',
            '/', '[', ']'
        ]
    }
];

interface SymbolToolbarProps {
    onInsert: (symbol: string) => void;
}

const SymbolToolbar: React.FC<SymbolToolbarProps> = ({ onInsert }) => {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const handleSymbolClick = (symbol: string) => {
        onInsert(symbol);
        setActiveCategory(null);
    };

    const activeSymbols = SYMBOL_CATEGORIES.find(c => c.id === activeCategory)?.symbols || [];

    return (
        <div className="relative">
            <div className="flex flex-wrap gap-2 mb-3">
                {SYMBOL_CATEGORIES.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${activeCategory === category.id
                                ? 'bg-orange-600 text-white shadow-lg scale-105'
                                : 'bg-white hover:bg-orange-50 text-orange-700 border-2 border-orange-200 hover:border-orange-400'
                            }`}
                    >
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                    </button>
                ))}
            </div>

            {activeCategory && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 border-orange-200 p-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-orange-700 flex items-center gap-2">
                            {SYMBOL_CATEGORIES.find(c => c.id === activeCategory)?.icon}
                            {SYMBOL_CATEGORIES.find(c => c.id === activeCategory)?.name} - Chọn ký hiệu
                        </h4>
                        <button
                            type="button"
                            onClick={() => setActiveCategory(null)}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold"
                        >
                            ×
                        </button>
                    </div>
                    <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-48 overflow-y-auto">
                        {activeSymbols.map((symbol, idx) => (
                            <button
                                key={`${symbol}-${idx}`}
                                type="button"
                                onClick={() => handleSymbolClick(symbol)}
                                className="w-10 h-10 flex items-center justify-center text-lg font-bold bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 rounded-lg border border-orange-100 hover:border-orange-300 transition-all hover:scale-110 hover:shadow-md"
                                title={symbol}
                            >
                                {symbol}
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-gray-400 text-center">
                        💡 Click vào ký hiệu để chèn vào ô đang chọn
                    </p>
                </div>
            )}
        </div>
    );
};

export default SymbolToolbar;
