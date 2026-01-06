import React, { useState } from 'react';

// Symbol categories by subject
const SYMBOL_CATEGORIES = [
    {
        id: 'math',
        name: 'Toán',
        icon: '🔢',
        symbols: [
            // Phép tính cơ bản
            '+', '−', '×', '÷', '=', '≠', '±', '√',
            // So sánh
            '<', '>', '≤', '≥', '≈', '≡',
            // Phân số
            '½', '¼', '¾', '⅓', '⅔', '⅕', '⅖', '⅗',
            // Lũy thừa & chỉ số
            '²', '³', '⁴', '⁵', 'ⁿ', '₀', '₁', '₂', '₃',
            // Hình học
            '°', '△', '□', '○', '⊥', '∥', '∠', '⌀',
            // Tập hợp
            '∈', '∉', '⊂', '⊃', '∪', '∩', '∅',
            // Logic
            '∧', '∨', '¬', '→', '↔', '∀', '∃',
            // Khác
            'π', '∞', 'Σ', '∫', 'Δ', '%', '‰', '∴'
        ]
    },
    {
        id: 'physics',
        name: 'Lý',
        icon: '⚡',
        symbols: [
            // Đơn vị & ký hiệu
            'Ω', 'Å', 'μ', 'λ', 'ν', 'ρ',
            // Hy Lạp
            'α', 'β', 'γ', 'δ', 'ε', 'θ', 'φ', 'ω', 'Φ', 'Ψ',
            // Mũi tên
            '→', '←', '↑', '↓', '⇒', '⇔', '↗', '↘',
            // Véctơ
            '⃗', '∥', '⊥',
            // Đơn vị
            '°C', '°F', 'K'
        ]
    },
    {
        id: 'chemistry',
        name: 'Hóa',
        icon: '🧪',
        symbols: [
            // Phản ứng
            '→', '⇌', '↑', '↓', '⟶', '⟵',
            // Chỉ số dưới
            '₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉',
            // Điện tích
            '⁺', '⁻', '⁰', '⁺²', '⁺³', '⁻²',
            // Liên kết
            '−', '=', '≡',
            // Nguyên tố phổ biến
            'H', 'O', 'N', 'C', 'S', 'P', 'Cl', 'Na', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Ag'
        ]
    },
    {
        id: 'biology',
        name: 'Sinh',
        icon: '🌿',
        symbols: [
            // Giới tính
            '♂', '♀', '⚥',
            // Di truyền
            '×', '→', '↓',
            // Biểu tượng
            '🧬', '🦠', '🧫', '🔬',
            // Ký hiệu
            'F₁', 'F₂', 'P', 'Aa', 'AA', 'aa',
            // Khác
            'n', '2n', '±'
        ]
    },
    {
        id: 'vietnamese',
        name: 'Văn',
        icon: '📚',
        symbols: [
            // Dấu ngoặc kép
            '«', '»', '„', '\u201c', '\u201d', '\u2018', '\u2019',
            // Gạch ngang
            '—', '–', '…',
            // Dấu đặc biệt
            '§', '¶', '†', '‡', '•', '○', '●',
            // Chú thích
            '¹', '²', '³', '⁴', '⁵',
            // Mũi tên
            '→', '⇒'
        ]
    },
    {
        id: 'geography',
        name: 'Địa',
        icon: '🌍',
        symbols: [
            // Tọa độ
            '°', '′', '″',
            // Hướng
            '↑', '↓', '←', '→', '↗', '↘', '↙', '↖',
            // Biểu tượng
            '★', '☆', '▲', '△', '■', '□', '●', '○',
            // Khác
            'N', 'S', 'E', 'W', '🧭', '🗺️'
        ]
    },
    {
        id: 'history',
        name: 'Sử',
        icon: '🕐',
        symbols: [
            // Số La Mã
            'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ',
            // Số La Mã nhỏ
            'ⅰ', 'ⅱ', 'ⅲ', 'ⅳ', 'ⅴ',
            // Mũi tên thời gian
            '→', '←', '↔', '⟹',
            // Ký hiệu
            '†', '‡', '§', '※'
        ]
    },
    {
        id: 'english',
        name: 'Anh',
        icon: '🔤',
        symbols: [
            // Phiên âm IPA
            'ə', 'æ', 'ɑ', 'ɔ', 'ʃ', 'ʒ', 'θ', 'ð', 'ŋ',
            'ɪ', 'ʊ', 'ʌ', 'ɜ', 'ɛ', 'ɒ',
            // Trọng âm
            'ˈ', 'ˌ', 'ː',
            // Dấu ngoặc
            '/', '[', ']'
        ]
    }
];

interface SymbolToolbarProps {
    onInsert: (symbol: string) => void;
}

const SymbolToolbar: React.FC<SymbolToolbarProps> = ({ onInsert }) => {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const handleCategoryClick = (categoryId: string) => {
        setActiveCategory(activeCategory === categoryId ? null : categoryId);
    };

    const handleSymbolClick = (symbol: string) => {
        onInsert(symbol);
        setActiveCategory(null); // Đóng popup sau khi chọn
    };

    const activeSymbols = SYMBOL_CATEGORIES.find(c => c.id === activeCategory)?.symbols || [];

    return (
        <div className="relative">
            {/* Category buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
                {SYMBOL_CATEGORIES.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategoryClick(category.id)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${activeCategory === category.id
                            ? 'bg-indigo-600 text-white shadow-lg scale-105'
                            : 'bg-white hover:bg-indigo-50 text-indigo-700 border-2 border-indigo-200 hover:border-indigo-400'
                            }`}
                    >
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                    </button>
                ))}
            </div>

            {/* Symbol grid popup */}
            {activeCategory && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 p-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-indigo-700 flex items-center gap-2">
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
                    <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {activeSymbols.map((symbol, idx) => (
                            <button
                                key={`${symbol}-${idx}`}
                                type="button"
                                onClick={() => handleSymbolClick(symbol)}
                                className="w-10 h-10 flex items-center justify-center text-lg font-bold bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-lg border border-indigo-100 hover:border-indigo-300 transition-all hover:scale-110 hover:shadow-md"
                                title={symbol}
                            >
                                {symbol}
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-gray-400 text-center">
                        💡 Click vào ký hiệu để chèn vào câu hỏi/đáp án đang chọn
                    </p>
                </div>
            )}
        </div>
    );
};

export default SymbolToolbar;
