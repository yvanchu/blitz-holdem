import { useGameStore } from '../store/gameStore';
import { useHandHistoryStore } from '../store/handHistoryStore';

interface GameOverOverlayProps {
  onRematch: () => void;
  onLeave: () => void;
  onViewHistory?: () => void;
}

export function GameOverOverlay({ onRematch, onLeave, onViewHistory }: GameOverOverlayProps) {
  const gameOver = useGameStore((state) => state.gameOver);
  const sessionWins = useGameStore((state) => state.sessionWins);
  const players = useGameStore((state) => state.players);
  const yourSeatIndex = useGameStore((state) => state.yourSeatIndex);
  const completedHandsCount = useHandHistoryStore((state) => state.completedHands.length);

  if (!gameOver) return null;

  const winner = players[gameOver.winnerSeatIndex];
  const isYouWinner = gameOver.winnerSeatIndex === yourSeatIndex;
  const winnerName = winner?.alias || 'Unknown';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-8 max-w-md w-full mx-4 text-center border border-zinc-700">
        {/* Trophy / Result Icon */}
        <div className="text-6xl mb-4">{isYouWinner ? '🏆' : '😔'}</div>

        {/* Main Message */}
        <h2 className="text-3xl font-bold mb-2">
          {isYouWinner ? (
            <span className="text-yellow-400">You Win!</span>
          ) : (
            <span className="text-zinc-400">Game Over</span>
          )}
        </h2>

        <p className="text-zinc-300 mb-6">
          {isYouWinner
            ? 'Your opponent ran out of time!'
            : `${winnerName} wins! You ran out of time.`}
        </p>

        {/* Session Score */}
        <div className="bg-zinc-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm text-zinc-400 uppercase tracking-wider mb-2">Session Score</h3>
          <div className="flex justify-center items-center gap-4">
            <div
              className={`flex flex-col ${yourSeatIndex === 0 ? 'text-cyan-400' : 'text-zinc-300'}`}
            >
              <span className="text-2xl font-bold">{sessionWins[0]}</span>
              <span className="text-xs text-zinc-500">{players[0]?.alias || 'Player 1'}</span>
            </div>
            <span className="text-zinc-600 text-xl">–</span>
            <div
              className={`flex flex-col ${yourSeatIndex === 1 ? 'text-cyan-400' : 'text-zinc-300'}`}
            >
              <span className="text-2xl font-bold">{sessionWins[1]}</span>
              <span className="text-xs text-zinc-500">{players[1]?.alias || 'Player 2'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 justify-center">
            <button
              onClick={onRematch}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-colors"
            >
              Rematch
            </button>
            <button
              onClick={onLeave}
              className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-semibold transition-colors"
            >
              Leave
            </button>
          </div>
          
          {/* Review Hand History Button */}
          {onViewHistory && completedHandsCount > 0 && (
            <button
              onClick={onViewHistory}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-zinc-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              Review Hand History ({completedHandsCount} hands)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
