import { useGameStore, selectYourPlayer, selectOpponentPlayer } from '../store/gameStore';
import Seat from './Seat';
import CardComponent from './Card';
import type { Card } from '@blitz-holdem/common';

// Helper to check if a card is in the winning hand
function isWinningCard(card: Card, winningCards?: Card[]): boolean {
  if (!winningCards) return false;
  return winningCards.some((wc) => wc.rank === card.rank && wc.suit === card.suit);
}

export default function Table() {
  const { communityCards, pot, dealerIndex, yourSeatIndex, result, revealedCards } = useGameStore();
  const yourPlayer = useGameStore(selectYourPlayer);
  const opponentPlayer = useGameStore(selectOpponentPlayer);

  const opponentSeatIndex = yourSeatIndex === 0 ? 1 : 0;
  const winningCards = result?.winningCards;

  // Get revealed cards for each seat
  const yourRevealedCards = yourSeatIndex === 0 ? revealedCards?.seat0 : revealedCards?.seat1;
  const opponentRevealedCards =
    opponentSeatIndex === 0 ? revealedCards?.seat0 : revealedCards?.seat1;

  return (
    <div className="relative w-full h-full max-w-5xl flex flex-col items-center justify-between py-2 sm:py-4">
      {/* Opponent seat (top) */}
      <div className="relative">
        <Seat
          player={opponentPlayer}
          isDealer={dealerIndex === opponentSeatIndex}
          position="top"
          revealedCards={opponentRevealedCards}
          winningCards={winningCards}
        />
      </div>

      {/* Community cards & pot (center) */}
      <div className="flex flex-col items-center gap-2 sm:gap-4">
        {/* Community cards - responsive width */}
        <div className="flex gap-1 sm:gap-2 justify-center">
          {/* Always render 5 slots, show cards or placeholders */}
          {Array.from({ length: 5 }).map((_, i) => {
            const card = communityCards[i];
            return card ? (
              <CardComponent key={i} card={card} highlight={isWinningCard(card, winningCards)} />
            ) : (
              <div
                key={i}
                className="w-[40px] h-[56px] sm:w-[60px] sm:h-[84px] rounded-lg border-2 border-dashed border-white/20"
              />
            );
          })}
        </div>

        {/* Pot */}
        <div className="bg-black/40 px-4 sm:px-6 py-1 sm:py-2 rounded-full">
          <span className="text-gray-400 text-xs sm:text-sm">Pot: </span>
          <span className="text-white font-bold text-sm sm:text-lg">{Math.round(pot)}s</span>
        </div>
      </div>

      {/* Your seat (bottom) */}
      <div className="relative">
        <Seat
          player={yourPlayer}
          isDealer={dealerIndex === yourSeatIndex}
          position="bottom"
          showCards
          revealedCards={yourRevealedCards}
          winningCards={winningCards}
        />
      </div>
    </div>
  );
}
