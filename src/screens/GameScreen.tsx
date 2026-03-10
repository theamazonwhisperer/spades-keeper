import { Navigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useWakeLock } from '../hooks/useWakeLock';
import BiddingView from './views/BiddingView';
import TricksView from './views/TricksView';
import ScoringView from './views/ScoringView';
import GameOverView from './views/GameOverView';

export default function GameScreen() {
  const currentGame = useGameStore(s => s.currentGame);
  useWakeLock(!!currentGame && currentGame.phase !== 'complete');

  if (!currentGame) {
    return <Navigate to="/" replace />;
  }

  switch (currentGame.phase) {
    case 'bidding':
      return <BiddingView />;
    case 'tricks':
      return <TricksView />;
    case 'scoring':
      return <ScoringView />;
    case 'complete':
      return <GameOverView />;
    default:
      return <Navigate to="/" replace />;
  }
}
