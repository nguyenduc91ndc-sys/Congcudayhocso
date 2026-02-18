import React from 'react';
import { Level } from '../types';
import { LEVELS } from '../constants';
import { playClick } from '../utils/sounds';

interface LevelSelectorProps {
    onSelect: (level: Level) => void;
    onBack: () => void;
    title: string;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ onSelect, onBack, title }) => {
    return (
        <div className="flex-col flex-center" style={{ minHeight: '100vh', padding: '40px 20px', gap: '32px' }}>
            <button
                onClick={() => { playClick(); onBack(); }}
                className="btn btn-outline btn-sm"
                style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}
            >
                ← Quay lại
            </button>

            <div className="text-center" style={{ maxWidth: '500px' }}>
                <h2 className="title-lg" style={{ marginBottom: '8px' }}>{title}</h2>
                <p className="subtitle">Chọn cấp độ phù hợp với trình độ của em</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                maxWidth: '700px',
                width: '100%',
            }}>
                {LEVELS.map((level) => (
                    <div
                        key={level.id}
                        className="level-card"
                        onClick={() => { playClick(); onSelect(level.id); }}
                    >
                        <div className="level-icon">{level.icon}</div>
                        <div className="level-name">{level.name}</div>
                        <div className="level-desc">{level.description}</div>
                        <span className="level-grade">{level.grade}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LevelSelector;
