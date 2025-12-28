import React from 'react';

interface WinnerModalProps {
    isOpen: boolean;
    winnerName: string | null;
    onContinue: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({ isOpen, winnerName, onContinue }) => {
    if (!isOpen || !winnerName) return null;

    return (
        <div className="fixed inset-0 bg-white/40 flex flex-col items-center justify-center z-50 backdrop-blur-md animate-[fade-in_0.5s_ease-out_forwards]">
            <div className="text-center p-8 animate-[bounce-custom_2s_infinite] rounded-3xl border border-white/40 shadow-lg bg-white/20">
                 <p className="text-3xl md:text-5xl font-bold text-pink-600 mb-6 drop-shadow-sm font-bungee tracking-widest">
                    🎉 CHÚC MỪNG 🎉
                </p>
                <h2 
                    className="font-bungee text-5xl md:text-7xl lg:text-8xl my-8 text-center text-pink-500"
                    style={{ 
                        textShadow: '3px 3px 0px #FFF, 5px 5px 0px rgba(0,0,0,0.1)',
                        filter: 'drop-shadow(0 4px 6px rgba(236, 72, 153, 0.3))'
                    }}
                >
                    {winnerName}
                </h2>
            </div>
           
            <button
                onClick={onContinue}
                className="font-bungee text-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white py-4 px-12 rounded-full shadow-[0_10px_20px_rgba(236,72,153,0.4)] transform hover:scale-105 active:scale-95 transition-all mt-8 border-4 border-white"
            >
                Tiếp Tục
            </button>
        </div>
    );
};