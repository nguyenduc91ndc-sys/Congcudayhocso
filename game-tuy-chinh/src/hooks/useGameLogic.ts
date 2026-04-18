import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import questionsData from '../data/questions.json';
import { getCustomGame, saveGameScore } from '../lib/firebaseService';

export type QuestionMedia = {
  text?: string;
  image?: string;
  video?: string;
  audio?: string;
};

export type OptionMedia = {
  text?: string;
  image?: string;
  audio?: string;
};

export type Question = {
  id: string;
  type: string;
  // Support both old simple string and new media object for backward compatibility
  question: string; 
  content?: QuestionMedia; 
  options: (string | OptionMedia)[];
  correctAnswer: number;
  level: string;
};

export type PlayerInfo = {
  name: string;
  className: string;
  level: string;
};

export function useGameLogic() {
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]); // Full question bank
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]); // Current session questions
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'result'>('idle');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameTitle, setGameTitle] = useState<string>('GAME TÙY CHỈNH');

  // Load questions from Firebase if ID is provided, else fallback to mock data
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('id');
      
      if (urlId) {
        setGameId(urlId);
        const gameData = await getCustomGame(urlId);
        if (gameData && gameData.questions && gameData.questions.length > 0) {
          setQuestions(gameData.questions);
          setGameTitle(gameData.title);
        } else {
          console.warn('Game ID not found or empty, loading default.');
          setQuestions(questionsData as any);
        }
      } else {
        // Fallback for direct access without ID or old local data
        setQuestions(questionsData as any);
      }
      setIsLoading(false);
    };
    loadQuestions();
  }, []);

  const startGame = (info: PlayerInfo) => {
    setPlayerInfo(info);
    
    // Filter questions by level if needed, or just shuffle
    let filtered = [...questions];
    if (info.level !== 'all') {
      filtered = questions.filter(q => q.level === info.level);
    }
    
    // Shuffle
    filtered = [...filtered].sort(() => Math.random() - 0.5);
    
    setGameQuestions(filtered);
    setCurrentQuestionIndex(0);
    setScore(0);
    setGameState('playing');
    setFeedback(null);
  };

  const answerQuestion = (answerIndex: number) => {
    const currentQuestion = gameQuestions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    if (isCorrect) {
      setScore(prev => prev + 10);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentQuestionIndex < gameQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        endGame();
      }
    }, 2000);
  };

  const endGame = async () => {
    setGameState('result');
    const finalScore = score + (feedback === 'correct' ? 10 : 0);
    
    if (playerInfo && gameId) {
      // Save to Firebase Leaderboard
      const entryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await saveGameScore(gameId, {
        id: entryId,
        name: playerInfo.name,
        className: playerInfo.className,
        score: finalScore,
        date: new Date().toISOString()
      });
    }
    setScore(finalScore);
  };

  const resetGame = () => {
    setGameState('idle');
    setPlayerInfo(null);
    setCurrentQuestionIndex(0);
    setScore(0);
    setFeedback(null);
    setGameQuestions([]);
  };

  return {
    playerInfo,
    gameId,
    gameTitle,
    questions, // Full bank for Admin if needed
    currentQuestionIndex,
    activeQuestions: gameQuestions, // Export active questions for the game session
    currentQuestion: gameQuestions[currentQuestionIndex],
    score,
    gameState,
    feedback,
    isLoading,
    startGame,
    answerQuestion,
    resetGame
  };
}
