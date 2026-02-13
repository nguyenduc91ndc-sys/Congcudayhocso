import React, { useState, useRef } from 'react';
import { GameConfig, Question } from '../types';
import { ASSETS } from '../constants';
import SymbolToolbar from './SymbolToolbar';
import { saveTreasureHuntConfig } from '../utils/firebaseTreasureHunt';
import { Plus, Trash2, Save, Share2, Copy, Check, Eye, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

// Icon mặc định cho chặng
const STAGE_ICONS = [
    '🍄', '💧', '🧗', '⛰️', '💎', '🏝️', '🌋', '🏰', '🗺️', '🧭',
    '⭐', '🌟', '🔥', '❄️', '🌈', '🎯', '🏆', '👑', '💰', '🎪',
    '🌊', '🌺', '🦋', '🐉', '🎨', '📚', '🔬', '🧪', '⚡', '🎮',
    '🐝', '🦠', '🌸', '🎭', '🎵', '🚀', '💡', '🔮', '🎲', '🧩'
];

interface AdminViewProps {
    onExit: () => void;
    onPreview: (config: GameConfig) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ onExit, onPreview }) => {
    const [title, setTitle] = useState('TRUY TÌM KHO BÁU');
    const [subtitle, setSubtitle] = useState('Khám phá thế giới...');
    const [description, setDescription] = useState('Em hãy cùng nhà thám hiểm vượt qua các chặng thử thách để mở kho báu thần kỳ nhé!');
    const [questions, setQuestions] = useState<Question[]>([
        createEmptyQuestion(1)
    ]);

    const [expandedQ, setExpandedQ] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState<number | null>(null);
    const [activeInputRef, setActiveInputRef] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);

    function createEmptyQuestion(id: number): Question {
        return {
            id,
            type: 'Câu hỏi',
            question: '',
            options: ['', '', '', ''],
            answer: '',
            explanation: '',
            stageName: `Chặng ${id}`,
            stageIcon: STAGE_ICONS[(id - 1) % STAGE_ICONS.length],
            stageImage: ''
        };
    }

    // Thêm câu hỏi mới
    const addQuestion = () => {
        const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
        const newQ = createEmptyQuestion(newId);
        setQuestions([...questions, newQ]);
        setExpandedQ(questions.length);
    };

    // Xóa câu hỏi
    const removeQuestion = (index: number) => {
        if (questions.length <= 1) return;
        const updated = questions.filter((_, i) => i !== index);
        setQuestions(updated);
        if (expandedQ >= updated.length) setExpandedQ(updated.length - 1);
    };

    // Cập nhật câu hỏi
    const updateQuestion = (index: number, updates: Partial<Question>) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], ...updates };
        setQuestions(updated);
    };

    // Thêm/xóa đáp án
    const addOption = (qIndex: number) => {
        const q = questions[qIndex];
        if (q.options.length >= 6) return;
        updateQuestion(qIndex, { options: [...q.options, ''] });
    };

    const removeOption = (qIndex: number, optIndex: number) => {
        const q = questions[qIndex];
        if (q.options.length <= 2) return;
        const newOptions = q.options.filter((_, i) => i !== optIndex);
        // Nếu đáp án đúng bị xóa, reset
        const removedOption = q.options[optIndex];
        const updates: Partial<Question> = { options: newOptions };
        if (q.answer === removedOption) updates.answer = '';
        updateQuestion(qIndex, updates);
    };

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const q = questions[qIndex];
        const newOptions = [...q.options];
        // Nếu đáp án cũ = option cũ, cập nhật luôn
        const wasAnswer = q.answer === newOptions[optIndex];
        newOptions[optIndex] = value;
        const updates: Partial<Question> = { options: newOptions };
        if (wasAnswer) updates.answer = value;
        updateQuestion(qIndex, updates);
    };

    // Insert ký hiệu vào ô đang focus
    const handleSymbolInsert = (symbol: string) => {
        if (activeInputRef) {
            const start = activeInputRef.selectionStart || 0;
            const end = activeInputRef.selectionEnd || 0;
            const value = activeInputRef.value;
            const newValue = value.substring(0, start) + symbol + value.substring(end);

            // Trigger React's onChange
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                activeInputRef instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(activeInputRef, newValue);
            activeInputRef.dispatchEvent(new Event('input', { bubbles: true }));

            // Restore cursor
            setTimeout(() => {
                activeInputRef.selectionStart = start + symbol.length;
                activeInputRef.selectionEnd = start + symbol.length;
                activeInputRef.focus();
            }, 0);
        }
    };

    // Lưu & chia sẻ
    const handleSave = async () => {
        // Validate
        const emptyQ = questions.find(q => !q.question.trim());
        if (emptyQ) {
            alert('Vui lòng nhập nội dung cho tất cả câu hỏi!');
            return;
        }
        const noAnswer = questions.find(q => !q.answer.trim());
        if (noAnswer) {
            alert('Vui lòng chọn đáp án đúng cho tất cả câu hỏi!');
            return;
        }

        setSaving(true);
        try {
            const config: GameConfig = { title, subtitle, description, questions };
            const gameId = await saveTreasureHuntConfig(config);
            const url = `${window.location.origin}/truy-tim-kho-bau/?gameId=${gameId}`;
            setShareUrl(url);
        } catch (error) {
            console.error('Lỗi lưu:', error);
            alert('Có lỗi xảy ra khi lưu. Vui lòng thử lại!');
        }
        setSaving(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePreview = () => {
        const config: GameConfig = { title, subtitle, description, questions };
        onPreview(config);
    };

    const getGameConfig = (): GameConfig => ({ title, subtitle, description, questions });

    return (
        <div
            className="min-h-screen w-full"
            style={{
                backgroundImage: `url(${ASSETS.BACKGROUND})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            }}
        >
            <div className="min-h-screen bg-black/30 backdrop-blur-[2px]">
                <div className="max-w-4xl mx-auto p-4 md:p-6">
                    {/* Header */}
                    <header className="bg-white/90 backdrop-blur-md rounded-3xl border-4 border-orange-400 p-6 mb-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-2xl md:text-3xl font-black text-orange-700 flex items-center gap-3">
                                🏴‍☠️ Soạn Game Truy Tìm Kho Báu
                            </h1>
                            <button
                                onClick={onExit}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold text-gray-600 transition-all"
                            >
                                ← Quay lại
                            </button>
                        </div>

                        {/* Thông tin game */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-orange-600 mb-1">Tiêu đề game</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    onFocus={e => setActiveInputRef(e.target)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-lg font-bold"
                                    placeholder="VD: TRUY TÌM KHO BÁU"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-orange-600 mb-1">Phụ đề</label>
                                    <input
                                        type="text"
                                        value={subtitle}
                                        onChange={e => setSubtitle(e.target.value)}
                                        onFocus={e => setActiveInputRef(e.target)}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 outline-none font-medium"
                                        placeholder="VD: Khám phá thế giới Nấm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-orange-600 mb-1">Mô tả ngắn</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        onFocus={e => setActiveInputRef(e.target)}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-500 outline-none font-medium"
                                        placeholder="Mô tả cho học sinh..."
                                    />
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Symbol Toolbar */}
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl border-2 border-orange-200 p-4 mb-4 shadow-lg relative z-20 overflow-visible">
                        <p className="text-sm font-bold text-orange-600 mb-2">📐 Chèn ký hiệu môn học</p>
                        <SymbolToolbar onInsert={handleSymbolInsert} />
                    </div>

                    {/* Danh sách câu hỏi */}
                    <div className="space-y-4 mb-6">
                        {questions.map((q, qIndex) => (
                            <div
                                key={q.id}
                                className="bg-white/95 backdrop-blur-md rounded-2xl border-3 border-orange-300 shadow-lg overflow-hidden"
                            >
                                {/* Question Header */}
                                <div
                                    className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 cursor-pointer select-none"
                                    onClick={() => setExpandedQ(expandedQ === qIndex ? -1 : qIndex)}
                                >
                                    <span className="text-3xl">{q.stageIcon}</span>
                                    <div className="flex-1">
                                        <h3 className="text-white font-black text-lg">
                                            Chặng {qIndex + 1}: {q.stageName || `Câu ${qIndex + 1}`}
                                        </h3>
                                        <p className="text-white/70 text-sm truncate">
                                            {q.question || 'Chưa nhập câu hỏi...'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {questions.length > 1 && (
                                            <button
                                                onClick={e => { e.stopPropagation(); removeQuestion(qIndex); }}
                                                className="p-2 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white transition-all"
                                                title="Xóa chặng"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        {expandedQ === qIndex ? <ChevronUp className="text-white" size={20} /> : <ChevronDown className="text-white" size={20} />}
                                    </div>
                                </div>

                                {/* Question Body */}
                                {expandedQ === qIndex && (
                                    <div className="p-5 space-y-4">
                                        {/* Tên chặng + Icon */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-gray-600 mb-1">Tên chặng</label>
                                                <input
                                                    type="text"
                                                    value={q.stageName}
                                                    onChange={e => updateQuestion(qIndex, { stageName: e.target.value })}
                                                    onFocus={e => setActiveInputRef(e.target)}
                                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 outline-none font-medium"
                                                    placeholder="VD: Rừng nấm"
                                                />
                                            </div>
                                            <div className="relative">
                                                <label className="block text-sm font-bold text-gray-600 mb-1">Icon chặng</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowIconPicker(showIconPicker === qIndex ? null : qIndex)}
                                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-orange-400 text-center text-2xl bg-white transition-all"
                                                >
                                                    {q.stageIcon}
                                                </button>
                                                {showIconPicker === qIndex && (
                                                    <div className="absolute z-50 top-full mt-1 right-0 w-72 bg-white rounded-xl shadow-2xl border-2 border-orange-300 p-3">
                                                        <div className="grid grid-cols-8 gap-1">
                                                            {STAGE_ICONS.map((icon, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        updateQuestion(qIndex, { stageIcon: icon });
                                                                        setShowIconPicker(null);
                                                                    }}
                                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-100 transition-all text-lg ${q.stageIcon === icon ? 'bg-orange-200 ring-2 ring-orange-400' : ''}`}
                                                                >
                                                                    {icon}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ảnh minh họa */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">🖼️ Ảnh minh họa (dán URL ảnh)</label>
                                            <div className="flex gap-3 items-start">
                                                <input
                                                    type="text"
                                                    value={q.stageImage}
                                                    onChange={e => updateQuestion(qIndex, { stageImage: e.target.value })}
                                                    onFocus={e => setActiveInputRef(e.target)}
                                                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 outline-none font-medium text-sm"
                                                    placeholder="Dán link ảnh (VD: https://i.imgur.com/abc.jpg)"
                                                />
                                                {q.stageImage && (
                                                    <div className="w-20 h-20 rounded-xl border-2 border-orange-200 overflow-hidden shrink-0 bg-gray-50">
                                                        <img
                                                            src={q.stageImage}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                            onError={e => (e.currentTarget.style.display = 'none')}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                💡 Tải ảnh lên <a href="https://imgur.com/upload" target="_blank" className="text-blue-500 underline">imgur.com</a> hoặc <a href="https://postimages.org/" target="_blank" className="text-blue-500 underline">postimages.org</a> rồi dán link vào đây. Để trống nếu không cần ảnh.
                                            </p>
                                        </div>

                                        {/* Loại câu hỏi */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">Loại câu hỏi</label>
                                            <select
                                                value={q.type}
                                                onChange={e => updateQuestion(qIndex, { type: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-orange-400 outline-none font-medium bg-white"
                                            >
                                                <option>Nhận biết</option>
                                                <option>Thông hiểu</option>
                                                <option>Vận dụng</option>
                                                <option>Vận dụng cao</option>
                                                <option>Tổng hợp</option>
                                                <option>Câu hỏi</option>
                                            </select>
                                        </div>

                                        {/* Nội dung câu hỏi */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">Nội dung câu hỏi</label>
                                            <textarea
                                                value={q.question}
                                                onChange={e => updateQuestion(qIndex, { question: e.target.value })}
                                                onFocus={e => setActiveInputRef(e.target)}
                                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 outline-none font-medium resize-none"
                                                rows={3}
                                                placeholder="Nhập câu hỏi..."
                                            />
                                        </div>

                                        {/* Đáp án */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-bold text-gray-600">
                                                    Đáp án ({q.options.length} lựa chọn)
                                                </label>
                                                <div className="flex gap-2">
                                                    {q.options.length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption(qIndex, q.options.length - 1)}
                                                            className="px-3 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                                                        >
                                                            − Bớt
                                                        </button>
                                                    )}
                                                    {q.options.length < 6 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => addOption(qIndex)}
                                                            className="px-3 py-1 text-xs font-bold rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-all"
                                                        >
                                                            + Thêm
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {q.options.map((opt, optIdx) => {
                                                    const label = String.fromCharCode(65 + optIdx); // A, B, C...
                                                    const isAnswer = q.answer === opt && opt !== '';
                                                    return (
                                                        <div key={optIdx} className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (opt.trim()) {
                                                                        updateQuestion(qIndex, { answer: opt });
                                                                    }
                                                                }}
                                                                className={`w-10 h-10 rounded-full font-black text-sm flex items-center justify-center shrink-0 transition-all border-2 ${isAnswer
                                                                    ? 'bg-green-500 text-white border-green-600 shadow-lg scale-110'
                                                                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:border-green-400 hover:bg-green-50'
                                                                    }`}
                                                                title={isAnswer ? 'Đáp án đúng' : 'Chọn làm đáp án đúng'}
                                                            >
                                                                {isAnswer ? <Check size={16} /> : label}
                                                            </button>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={e => updateOption(qIndex, optIdx, e.target.value)}
                                                                onFocus={e => setActiveInputRef(e.target)}
                                                                className={`flex-1 px-4 py-2.5 rounded-xl border-2 outline-none font-medium transition-all ${isAnswer
                                                                    ? 'border-green-400 bg-green-50'
                                                                    : 'border-gray-200 focus:border-orange-400'
                                                                    }`}
                                                                placeholder={`Đáp án ${label}...`}
                                                            />
                                                            {q.options.length > 2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeOption(qIndex, optIdx)}
                                                                    className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                💡 Nhấn vào chữ cái để chọn đáp án đúng (sẽ chuyển xanh ✓)
                                            </p>
                                        </div>

                                        {/* Giải thích */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">Giải thích (hiện sau khi trả lời đúng)</label>
                                            <textarea
                                                value={q.explanation}
                                                onChange={e => updateQuestion(qIndex, { explanation: e.target.value })}
                                                onFocus={e => setActiveInputRef(e.target)}
                                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 outline-none font-medium resize-none"
                                                rows={3}
                                                placeholder="Giải thích tại sao đáp án này đúng..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Nút thêm câu hỏi */}
                    <button
                        onClick={addQuestion}
                        className="w-full py-4 rounded-2xl border-4 border-dashed border-orange-300 bg-white/80 hover:bg-orange-50 text-orange-600 font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.01] mb-6"
                    >
                        <Plus size={24} /> Thêm chặng mới ({questions.length} chặng hiện tại)
                    </button>

                    {/* Action Buttons */}
                    <div className="bg-white/90 backdrop-blur-md rounded-3xl border-4 border-orange-400 p-6 shadow-xl space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handlePreview}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-lg shadow-lg hover:shadow-xl transition-all"
                            >
                                <Eye size={22} /> Xem thử
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <><span className="animate-spin">⏳</span> Đang lưu...</>
                                ) : (
                                    <><Save size={22} /> Lưu & Tạo link</>
                                )}
                            </button>
                        </div>

                        {/* Share URL */}
                        {shareUrl && (
                            <div className="bg-green-50 rounded-2xl border-2 border-green-300 p-4 animate-fade-in">
                                <p className="text-green-700 font-bold mb-2 flex items-center gap-2">
                                    <Share2 size={18} /> Link chia sẻ cho học sinh:
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={shareUrl}
                                        readOnly
                                        className="flex-1 px-4 py-3 rounded-xl border-2 border-green-300 bg-white font-mono text-sm"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${copied
                                            ? 'bg-green-600 text-white'
                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                            }`}
                                    >
                                        {copied ? <><Check size={18} /> Đã copy!</> : <><Copy size={18} /> Copy</>}
                                    </button>
                                </div>
                                <p className="text-green-600 text-sm mt-2">
                                    📱 Gửi link này cho học sinh để chơi game!
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="h-8"></div>
                </div>
            </div>
        </div>
    );
};

export default AdminView;
