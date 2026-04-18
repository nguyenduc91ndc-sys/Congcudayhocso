import React, { useState, useEffect } from 'react';
import { ViewState, MatchSettings, Question } from './types';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import AdminPanel from './components/AdminPanel';

// Default fallback questions
const DEFAULT_QUESTIONS: Question[] = [
    {
        id: 'q1',
        text: 'Thủ đô của Việt Nam là gì?',
        options: ['Hải Phòng', 'Hà Nội', 'Đà Nẵng', 'TP. Hồ Chí Minh'],
        correctOptionIndex: 1
    },
    {
        id: 'q2',
        text: 'Đâu là con vật lớn nhất hành tinh?',
        options: ['Voi', 'Khủng long', 'Cá voi xanh', 'Hươu cao cổ'],
        correctOptionIndex: 2
    }
];

interface AppProps {
    onBack: () => void;
}

const KeoCoTriTueApp: React.FC<AppProps> = ({ onBack }) => {
    const [view, setView] = useState<ViewState>('SETUP');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [settings, setSettings] = useState<MatchSettings>({
        team1Name: 'Đội Xanh',
        team2Name: 'Đội Đỏ',
        questionsPerRound: 10,
        timePerQuestion: 15,
        answerDisplayType: 'letter'
    });

    // Load questions on mount
    useEffect(() => {
      const saved = localStorage.getItem('keo-co-tri-tue-questions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setQuestions(parsed);
          return;
        }
      }
      setQuestions(DEFAULT_QUESTIONS);
    }, []);

    const [winner, setWinner] = useState<string | null>(null);

    const handleStartGame = (newSettings: MatchSettings) => {
        setSettings(newSettings);
        setView('GAME');
    };

    const handleEndGame = (winnerName?: string) => {
        setWinner(winnerName || null);
        setView('RESULT');
    };

    const handleSaveQuestions = (newQuestions: Question[]) => {
      setQuestions(newQuestions);
    };

    return (
        <div className="relative w-full min-h-screen bg-[#0f172a] text-white font-sans overflow-hidden">
            {/* Back button */}
            <button
                onClick={view === 'SETUP' ? onBack : () => setView('SETUP')}
                className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all font-medium border border-white/10"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="m15 18-6-6 6-6" />
                </svg>
                {view === 'SETUP' ? 'Về trang chủ' : 'Quay lại'}
            </button>

            {/* Main Content Areas */}
            {view === 'SETUP' && (
                <SetupScreen
                    initialSettings={settings}
                    onStart={handleStartGame}
                    onAdmin={() => setView('ADMIN')}
                />
            )}

            {view === 'GAME' && (
                <GameScreen
                    settings={settings}
                    questions={questions.slice(0, settings.questionsPerRound)} // Only use requested number of questions
                    onEnd={handleEndGame}
                />
            )}

            {view === 'ADMIN' && (
                <AdminPanel 
                  onBack={() => setView('SETUP')} 
                  initialQuestions={questions}
                  onSaveQuestions={handleSaveQuestions}
                />
            )}

            {view === 'RESULT' && (
                <div className="flex h-screen items-center justify-center flex-col gap-8 bg-[#0f172a]" style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}>
                    <div className="text-8xl mb-4 animate-bounce">🏆</div>
                    <div className="text-center">
                        <p className="text-blue-400 font-black tracking-[0.5em] uppercase mb-2">Trận đấu kết thúc</p>
                        <h1 className="text-7xl font-black bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_0_50px_rgba(250,204,21,0.5)] uppercase italic py-4">
                        {winner ? `ĐỘI ${winner} THẮNG!` : 'HÒA NHAU!'}
                        </h1>
                    </div>
                    <div className="flex gap-4 mt-4">
                      <button
                          onClick={() => setView('SETUP')}
                          className="px-10 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl hover:brightness-110 font-black text-xl shadow-lg shadow-emerald-900/40 transition-all active:scale-95 uppercase tracking-widest"
                      >
                          CHƠI TIẾP
                      </button>
                      <button
                          onClick={onBack}
                          className="px-10 py-5 bg-slate-800 rounded-2xl hover:bg-slate-700 font-black text-xl border border-white/10 transition-all active:scale-95 uppercase tracking-widest"
                      >
                          THOÁT
                      </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KeoCoTriTueApp;
