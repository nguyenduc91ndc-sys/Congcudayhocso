import React, { useState } from 'react';
import { Settings } from './components/Settings';
import { GamePlay } from './components/GamePlay';
import { Question } from './types';

interface Props {
  onBack: () => void;
}

export const NhayBaoBoApp: React.FC<Props> = ({ onBack }) => {
  const [questions, setQuestions] = useState<Question[] | null>(null);

  if (questions && questions.length > 0) {
    return (
      <GamePlay 
        questions={questions} 
        onBackToSettings={() => setQuestions(null)} 
      />
    );
  }

  return <Settings onStartGame={(q) => setQuestions(q)} onBack={onBack} />;
};

export default NhayBaoBoApp;
