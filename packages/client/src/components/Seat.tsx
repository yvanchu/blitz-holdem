import { useMemo } from 'react';
import type { Card, PlayerPublic } from '@blitz-holdem/common';
import { evaluateHand } from '@blitz-holdem/common';
import { useGameStore } from '../store/gameStore';
import CardComponent from './Card';
import Timer from './Timer';

interface SeatProps {
  player: PlayerPublic | null;
  isDealer: boolean;
  position: 'top' | 'bottom';
  showCards?: boolean;
  revealedCards?: [Card, Card] | null; // Cards revealed at showdown
  winningCards?: Card[]; // Cards that make the winning hand
}

// Helper to check if a card is part of the winning hand
function isWinningCard(card: Card, winningCards?: Card[]): boolean {
  if (!winningCards) return false;
  return winningCards.some((wc) => wc.rank === card.rank && wc.suit === card.suit);
}

export default function Seat({
  player,
  isDealer,
  position,
  showCards = false,
  revealedCards,
  winningCards,
}: SeatProps) {
  const { activePlayerIndex, result, communityCards, street } = useGameStore();

  // Evaluate hand strength when we have enough cards
  const handStrength = useMemo(() => {
    if (!player || player.folded) return null;

    // Get the cards to evaluate - either player's own cards or revealed cards
    const holeCards = player.holeCards || revealedCards;
    if (!holeCards) return null;

    // Need at least 3 community cards (flop) to evaluate
    if (communityCards.length < 3) return null;

    try {
      const allCards = [...holeCards, ...communityCards];
      const evaluated = evaluateHand(allCards);
      return evaluated.rankName;
    } catch {
      return null;
    }
  }, [player, revealedCards, communityCards]);

  // Should we show hand strength?
  // - For your own seat (bottom): always show post-flop
  // - For opponent seat: only show during showdown if cards are revealed
  const shouldShowHandStrength = useMemo(() => {
    if (!handStrength) return false;
    if (street === 'preflop') return false;

    // Bottom seat (your cards) - always show
    if (position === 'bottom' && player?.holeCards) return true;

    // Top seat (opponent) - only show during showdown with revealed cards
    if (result?.showdown && revealedCards) return true;

    return false;
  }, [handStrength, position, player, result, revealedCards, street]);

  if (!player) {
    return (
      <div className="flex flex-col items-center gap-2 opacity-50">
        <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
          <span className="text-gray-500 text-2xl">?</span>
        </div>
        <span className="text-gray-500 text-sm">Waiting...</span>
      </div>
    );
  }

  const isActive = activePlayerIndex === player.seatIndex;
  const isFolded = player.folded;

  // Determine which cards to show
  // Priority: player's holeCards (for own seat), revealedCards (showdown), or hidden
  const cardsToShow = player.holeCards || revealedCards;
  const shouldShowCards = position === 'bottom' || showCards || (revealedCards && result?.showdown);

  // Bet chip component
  const BetChip = () =>
    player.currentBet > 0 ? (
      <div className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-yellow-500 text-black text-xs sm:text-sm font-bold shadow-lg">
        <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="12" cy="12" r="6" fill="currentColor" />
        </svg>
        {Math.round(player.currentBet)}s
      </div>
    ) : null;

  return (
    <div
      className={`flex flex-col items-center gap-1 sm:gap-2 transition-opacity ${
        isFolded ? 'opacity-50' : ''
      }`}
    >
      {/* For TOP position: Cards first, then player info, then bet (closest to center) */}
      {position === 'top' && (
        <>
          {/* Cards with hand strength badge */}
          <div className="relative flex gap-1 mb-1 sm:mb-2">
            {shouldShowCards && cardsToShow ? (
              <>
                <CardComponent
                  card={cardsToShow[0]}
                  size="small"
                  highlight={isWinningCard(cardsToShow[0], winningCards)}
                />
                <CardComponent
                  card={cardsToShow[1]}
                  size="small"
                  highlight={isWinningCard(cardsToShow[1], winningCards)}
                />
                {shouldShowHandStrength && (
                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded bg-red-500 text-white text-xs font-bold uppercase whitespace-nowrap shadow-lg">
                    {handStrength}
                  </div>
                )}
              </>
            ) : (
              <>
                <CardComponent hidden size="small" />
                <CardComponent hidden size="small" />
              </>
            )}
          </div>

          {/* Player info */}
          <PlayerInfo
            player={player}
            isActive={isActive}
            isDealer={isDealer}
            result={result}
          />

          {/* Bet chip - at bottom for opponent (closest to center) */}
          <BetChip />
        </>
      )}

      {/* For BOTTOM position: Bet first (closest to center), then player info, then cards */}
      {position === 'bottom' && (
        <>
          {/* Bet chip - at top for you (closest to center) */}
          <BetChip />

          {/* Player info */}
          <PlayerInfo
            player={player}
            isActive={isActive}
            isDealer={isDealer}
            result={result}
          />

          {/* Cards with hand strength badge */}
          <div className="relative flex gap-1 mt-1 sm:mt-2">
            {shouldShowCards && cardsToShow ? (
              <>
                <CardComponent
                  card={cardsToShow[0]}
                  size="small"
                  highlight={isWinningCard(cardsToShow[0], winningCards)}
                />
                <CardComponent
                  card={cardsToShow[1]}
                  size="small"
                  highlight={isWinningCard(cardsToShow[1], winningCards)}
                />
                {shouldShowHandStrength && (
                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded bg-red-500 text-white text-xs font-bold uppercase whitespace-nowrap shadow-lg">
                    {handStrength}
                  </div>
                )}
              </>
            ) : (
              <>
                <CardComponent hidden size="small" />
                <CardComponent hidden size="small" />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Player info component to avoid duplication
function PlayerInfo({
  player,
  isActive,
  isDealer,
  result,
}: {
  player: PlayerPublic;
  isActive: boolean;
  isDealer: boolean;
  result: { winnerId: string; potAwarded: number } | null;
}) {
  return (
    <div
      className={`relative flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1 sm:py-2 rounded-full ${
        isActive ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'bg-gray-800/80'
      }`}
    >
      {/* Avatar */}
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm sm:text-base">
        {player.alias.charAt(0).toUpperCase()}
      </div>

      {/* Name */}
      <div className="flex flex-col">
        <span className="text-white font-medium text-xs sm:text-sm">{player.alias}</span>
      </div>

      {/* Timer with gain indicator */}
      <div className="flex items-center gap-1">
        <Timer timeBank={player.timeBank} isActive={isActive} isAllIn={player.isAllIn} />
        {result && result.winnerId === player.id && (
          <span className="text-green-400 font-bold text-xs sm:text-sm animate-pulse">
            +{result.potAwarded}s
          </span>
        )}
      </div>

      {/* Dealer button */}
      {isDealer && (
        <div className="absolute -right-1 sm:-right-2 -top-1 sm:-top-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-black text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-lg">
          D
        </div>
      )}

      {/* All-in badge */}
      {player.isAllIn && (
        <div className="absolute -left-1 sm:-left-2 -top-1 sm:-top-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] sm:text-xs font-bold">
          ALL IN
        </div>
      )}

      {/* Folded badge */}
      {player.folded && (
        <div className="absolute -left-1 sm:-left-2 -top-1 sm:-top-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-600 text-white text-[10px] sm:text-xs font-bold">
          FOLD
        </div>
      )}
    </div>
  );
}
