import React from 'react';

const ConfettiPiece: React.FC<{ id: number }> = ({ id }) => {
    // Updated colors for the pink theme
    const colors = ['#FF9AA2', '#FFB7B2', '#FFD1DC', '#E0BBE4', '#B5EAD7', '#FFF'];
    const randomRotation = Math.random() * 360;
    const randomLeft = Math.random() * 100;
    const randomAnimDuration = Math.random() * 3 + 4;
    const randomDelay = Math.random() * 2;
    const randomSize = Math.random() * 10 + 5;

    const style: React.CSSProperties = {
        position: 'absolute',
        width: `${randomSize}px`,
        height: `${randomSize}px`,
        backgroundColor: colors[id % colors.length],
        top: `-20px`,
        left: `${randomLeft}%`,
        opacity: 0.9,
        borderRadius: '2px',
        transform: `rotate(${randomRotation}deg)`,
        animation: `fall ${randomAnimDuration}s linear forwards`,
        animationDelay: `${randomDelay}s`
    };
    return <div style={style}></div>;
};

export const Confetti: React.FC = () => {
    return (
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-50">
            {[...Array(100)].map((_, i) => <ConfettiPiece key={i} id={i} />)}
        </div>
    );
};