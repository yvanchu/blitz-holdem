import { useMemo, useState } from 'react';
import type { Card, PlayerPublic } from '@bullet-poker/common';
import { evaluateHand } from '@bullet-poker/common';
import { useGameStore } from '../store/gameStore';
import CardComponent from './Card';
import Timer from './Timer';

interface SeatProps {
  player: PlayerPublic | null;
  isDealer: boolean;
  position: 'top' | 'bottom';
  showCards?: boolean;
  hideCards?: boolean; // Hide cards entirely (e.g., in lobby before game starts)
  revealedCards?: [Card, Card] | null; // Cards revealed at showdown
  winningCards?: Card[]; // Cards that make the winning hand
  isSetupMode?: boolean; // Show name input + ready button (for joiner before clicking ready)
  onReady?: (alias: string) => void; // Called when ready button clicked in setup mode
  wins?: number; // Session wins count for this player
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
  hideCards = false,
  revealedCards,
  winningCards,
  isSetupMode = false,
  onReady,
  wins = 0,
}: SeatProps) {
  const { activePlayerIndex, result, communityCards, street, settings, lastAction } =
    useGameStore();
  const [aliasInput, setAliasInput] = useState('');

  // Evaluate hand strength when we have enough cards
  // NOTE: All hooks must be called before any conditional returns
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

  // Setup mode: show name input and ready button
  if (isSetupMode && player) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-full bg-gray-800/80">
          {/* Avatar */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm sm:text-base">
            {(aliasInput || 'P').charAt(0).toUpperCase()}
          </div>

          {/* Name input */}
          <input
            type="text"
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value.slice(0, 20))}
            placeholder="Player"
            className="w-24 sm:w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={20}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onReady) {
                onReady(aliasInput || 'Player');
              }
            }}
          />

          {/* Time bank display */}
          <div className="px-2 sm:px-3 py-1 rounded-full bg-gray-700 text-white font-mono tabular-nums text-xs sm:text-sm">
            {settings?.initialTimeBank ?? 300}s
          </div>
        </div>

        {/* Ready button */}
        <button
          onClick={() => onReady?.(aliasInput || 'Player')}
          data-testid="ready-button"
          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-colors flex items-center gap-2"
        >
          ✓ Ready
        </button>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex flex-col items-center gap-2">
        {/* Empty seat - pill shape like a regular player */}
        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1 sm:py-2 rounded-full bg-gray-800/80">
          {/* Empty avatar */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
            <span className="text-gray-600 text-lg sm:text-xl">?</span>
          </div>
          {/* Waiting text */}
          <span className="text-gray-500 text-xs sm:text-sm">Waiting for player...</span>
        </div>
      </div>
    );
  }

  const isActive = activePlayerIndex === player.seatIndex;
  const isFolded = player.folded;

  // Last-action indicator for the seat that most recently acted (UX §6).
  const lastActionLabel =
    lastAction && player.seatIndex === lastAction.seatIndex ? lastAction.label : null;

  // Determine which cards to show
  // Priority: player's holeCards (for own seat), revealedCards (from showdown or voluntary show), or hidden
  const cardsToShow = player.holeCards || revealedCards;
  // Show cards if: bottom position (your cards), showCards prop, or revealedCards exist (from showdown or voluntary show)
  const shouldShowCards = position === 'bottom' || showCards || !!revealedCards;

  // Bet chip component - always reserves space to keep the seat height stable
  const BetChip = () =>
    (
      <div
        className={`my-1 flex min-w-[54px] sm:min-w-[66px] items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-yellow-500 text-black text-xs sm:text-sm font-bold shadow-lg ${
          player.currentBet > 0 ? '' : 'invisible'
        }`}
        aria-hidden={player.currentBet > 0 ? undefined : true}
      >
        <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="12" cy="12" r="6" fill="currentColor" />
        </svg>
        {player.currentBet > 0 ? `${Math.round(player.currentBet)}s` : null}
      </div>
    );

  return (
    <div
      data-testid={`seat-${position}`}
      data-seat-active={isActive}
      data-seat-folded={isFolded}
      className={`flex flex-col items-center gap-1.5 sm:gap-2 transition-opacity ${
        isFolded ? 'opacity-50' : ''
      }`}
    >
      {/* For TOP position: Cards first, then player info, then bet (closest to center) */}
      {position === 'top' && (
        <>
          {/* Cards with hand strength badge - reserve space in lobby mode */}
          <div
            data-testid={hideCards ? undefined : 'hole-cards'}
            className={`relative flex gap-1 mb-1 sm:mb-2 ${hideCards ? 'invisible' : ''}`}
            aria-hidden={hideCards ? true : undefined}
          >
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
                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded bg-gray-900/90 text-white text-xs font-bold uppercase whitespace-nowrap shadow-lg border border-white/20">
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
            wins={wins}
            lastActionLabel={lastActionLabel}
            bubblePlacement="top"
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
            wins={wins}
            lastActionLabel={lastActionLabel}
            bubblePlacement="bottom"
          />

          {/* Cards with hand strength badge - reserve space in lobby mode */}
          <div
            data-testid={hideCards ? undefined : 'hole-cards'}
            className={`relative flex gap-1 mt-1 sm:mt-2 ${hideCards ? 'invisible' : ''}`}
            aria-hidden={hideCards ? true : undefined}
          >
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
                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded bg-gray-900/90 text-white text-xs font-bold uppercase whitespace-nowrap shadow-lg border border-white/20">
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
  wins = 0,
  lastActionLabel = null,
  bubblePlacement = 'top',
}: {
  player: PlayerPublic;
  isActive: boolean;
  isDealer: boolean;
  result: { winnerId: string; potAwarded: number } | null;
  wins?: number;
  lastActionLabel?: string | null;
  bubblePlacement?: 'top' | 'bottom';
}) {
  return (
    <div
      data-testid="player-info"
      data-player-id={player.id}
      data-player-active={isActive}
      className={`relative flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1 sm:py-2 rounded-full ${
        isActive ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'bg-gray-800/80'
      }`}
    >
      {/* Last-action indicator — neutral gray (informational, not safe/danger per §7).
          Placed away from the bet chip so it never overlaps the committed amount. */}
      {lastActionLabel && (
        <div
          data-testid="last-action"
          className={`absolute left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-gray-900/90 border border-white/20 text-white text-[10px] sm:text-xs font-semibold uppercase whitespace-nowrap shadow-lg ${
            bubblePlacement === 'top' ? '-top-3' : '-bottom-3'
          }`}
        >
          {lastActionLabel}
        </div>
      )}

      {/* Avatar */}
      <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm sm:text-base">
        {player.alias.charAt(0).toUpperCase()}
      </div>

      {/* Name */}
      <div className="flex min-w-0 flex-col">
        <span className="max-w-[7rem] sm:max-w-[9rem] truncate text-white font-medium text-xs sm:text-sm">
          {player.alias}
        </span>
      </div>

      {/* Timer with gain indicator */}
      <div className="flex flex-shrink-0 items-center gap-1">
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

      {/* All-in badge — amber per color language (§7): all-in is a betting action, not danger */}
      {player.isAllIn && (
        <div className="absolute -left-1 sm:-left-2 -top-1 sm:-top-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] sm:text-xs font-bold">
          ALL IN
        </div>
      )}

      {/* Folded badge */}
      {player.folded && (
        <div className="absolute -left-1 sm:-left-2 -top-1 sm:-top-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-600 text-white text-[10px] sm:text-xs font-bold">
          FOLD
        </div>
      )}

      {/* Disconnected indicator */}
      {!player.isConnected && (
        <div className="absolute -left-1 sm:-left-2 -bottom-1 sm:-bottom-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] sm:text-xs font-bold animate-pulse">
          AWAY
        </div>
      )}

      {/* Wins counter badge - bottom right (like dealer button style) */}
      {wins > 0 && (
        <div className="absolute -right-1 sm:-right-2 -bottom-1 sm:-bottom-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-yellow-500 text-black text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-lg">
          {wins}
        </div>
      )}
    </div>
  );
}
