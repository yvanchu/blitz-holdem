import { useGameStore } from '../store/gameStore';
import CardComponent from './Card';

export default function ResultOverlay() {
  const { result, revealedCards, yourPlayerId, players } = useGameStore();

  if (!result) return null;

  const isWinner = result.winnerId === yourPlayerId;

  return (
    <div data-testid="result-overlay" className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 max-w-lg w-full mx-4 text-center">
        {/* Result headline */}
        <div className={`text-4xl font-bold mb-4 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
          {isWinner ? '🎉 You Win!' : '😔 You Lose'}
        </div>

        {/* Winning hand */}
        {result.showdown && (
          <div className="mb-6">
            <div className="text-gray-400 text-sm mb-2">Winning Hand</div>
            <div className="text-white text-xl font-semibold">{result.winnerHandRank}</div>
          </div>
        )}

        {/* Revealed cards */}
        {result.showdown && revealedCards && (
          <div className="flex justify-center gap-8 mb-6">
            {/* Seat 0 cards */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">{players[0]?.alias}</div>
              <div className="flex gap-1 justify-center">
                {revealedCards.seat0 ? (
                  <>
                    <CardComponent card={revealedCards.seat0[0]} size="small" />
                    <CardComponent card={revealedCards.seat0[1]} size="small" />
                  </>
                ) : (
                  <span className="text-gray-500">Folded</span>
                )}
              </div>
            </div>

            {/* Seat 1 cards */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">{players[1]?.alias}</div>
              <div className="flex gap-1 justify-center">
                {revealedCards.seat1 ? (
                  <>
                    <CardComponent card={revealedCards.seat1[0]} size="small" />
                    <CardComponent card={revealedCards.seat1[1]} size="small" />
                  </>
                ) : (
                  <span className="text-gray-500">Folded</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pot awarded */}
        <div className="mb-6">
          <div className="text-gray-400 text-sm">Pot</div>
          <div className="text-yellow-400 text-2xl font-bold">+{result.potAwarded}s</div>
        </div>

        {/* Updated time banks */}
        <div className="flex justify-center gap-8 mb-6 text-sm">
          {players.map((player, i) => (
            <div key={i} className="text-center">
              <div className="text-gray-400">{player?.alias}</div>
              <div className="text-white font-bold">{player?.timeBank}s</div>
            </div>
          ))}
        </div>

        {/* Continue */}
        <div className="text-gray-400 text-sm animate-pulse">Next hand starting soon...</div>
      </div>
    </div>
  );
}
