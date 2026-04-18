import React, { createContext, useContext, ReactNode } from 'react';
import { useGameLogic } from '../hooks/useGameLogic';

type GameLogicType = ReturnType<typeof useGameLogic>;

const GameContext = createContext<GameLogicType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const gameLogic = useGameLogic();
  return (
    <GameContext.Provider value={gameLogic}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
