/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { Home } from './pages/Home';
import { Game } from './pages/Game';
import { Result } from './pages/Result';
import { Admin } from './pages/Admin';

export default function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<Game />} />
          <Route path="/result" element={<Result />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </GameProvider>
  );
}
