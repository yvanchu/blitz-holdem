import { useState } from 'react';
import { useGameStore, selectYourPlayer, selectOpponentPlayer } from '../store/gameStore';
import Seat from './Seat';
import CardComponent from './Card';
import SettingsModal from './SettingsModal';
import type { Card, C2SMessage } from '@blitz-holdem/common';

interface TableProps {
  send: (message: C2SMessage) => void;
}

// Helper to check if a card is in the winning hand
function isWinningCard(card: Card, winningCards?: Card[]): boolean {
  if (!winningCards) return false;
  return winningCards.some((wc) => wc.rank === card.rank && wc.suit === card.suit);
}

export default function Table({ send }: TableProps) {
  const {
    communityCards,
    pot,
    dealerIndex,
    yourSeatIndex,
    result,
    revealedCards,
    isHandInProgress,
    readyState,
    handNumber,
    sessionWins,
    gameOver,
    clearGameOver,
  } = useGameStore();
  const yourPlayer = useGameStore(selectYourPlayer);
  const opponentPlayer = useGameStore(selectOpponentPlayer);

  const [showSettings, setShowSettings] = useState(false);

  const opponentSeatIndex = yourSeatIndex === 0 ? 1 : 0;
  const winningCards = result?.winningCards;

  // Get revealed cards for each seat
  const yourRevealedCards = yourSeatIndex === 0 ? revealedCards?.seat0 : revealedCards?.seat1;
  const opponentRevealedCards =
    opponentSeatIndex === 0 ? revealedCards?.seat0 : revealedCards?.seat1;

  // Lobby state detection
  const isOwner = yourSeatIndex === 0;
  const opponentReady = readyState[opponentSeatIndex];
  const yourReady = readyState[yourSeatIndex ?? 0];
  const isInLobby = !isHandInProgress && handNumber === 0;
  // Opponent is considered "joined" only when they've clicked Ready
  const opponentJoined = opponentPlayer !== null && opponentReady;

  // Game over state (match ended - someone ran out of time)
  const isGameOver = gameOver !== null;

  // Handler for copy link
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  // Handler for start game (no force needed since opponent must be ready)
  const handleStart = () => {
    send({ type: 'START' });
  };

  // Handler for rematch
  const handleRematch = () => {
    clearGameOver();
    send({ type: 'REMATCH' });
  };

  return (
    <div className="relative w-full h-full max-w-5xl max-h-[450px] sm:max-h-[500px] flex flex-col items-center justify-between py-2 sm:py-4">
      {/* Opponent seat (top) */}
      <div className="relative">
        <Seat
          player={isOwner && !opponentReady ? null : opponentPlayer}
          isDealer={dealerIndex === opponentSeatIndex}
          position="top"
          hideCards={isInLobby}
          revealedCards={opponentRevealedCards}
          winningCards={winningCards}
          wins={sessionWins[opponentSeatIndex]}
        />
      </div>

      {/* Community cards & pot (center) OR Lobby/GameOver controls */}
      <div className="flex flex-col items-center gap-2 sm:gap-4">
        {isGameOver ? (
          /* Game Over controls - similar style to lobby */
          <div className="flex flex-col items-center gap-4">
            {/* Winner announcement */}
            <div className="text-center">
              <div className="text-4xl mb-2">
                {gameOver.winnerSeatIndex === yourSeatIndex ? '🏆' : '😔'}
              </div>
              <p className="text-lg font-semibold text-white">
                {gameOver.winnerSeatIndex === yourSeatIndex
                  ? 'You Win!'
                  : `${opponentPlayer?.alias || 'Opponent'} Wins!`}
              </p>
            </div>

            {/* Session score */}
            <div className="flex items-center gap-4 text-sm">
              <span className={yourSeatIndex === 0 ? 'text-cyan-400 font-bold' : 'text-gray-300'}>
                {sessionWins[0]}
              </span>
              <span className="text-gray-500">–</span>
              <span className={yourSeatIndex === 1 ? 'text-cyan-400 font-bold' : 'text-gray-300'}>
                {sessionWins[1]}
              </span>
            </div>

            {/* Controls */}
            {isOwner ? (
              /* Host controls */
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRematch}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-lg transition-colors"
                >
                  🔄 Rematch
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  title="Settings"
                >
                  ⚙️
                </button>
              </div>
            ) : (
              /* Joiner controls */
              <div className="flex flex-col items-center gap-3">
                {yourReady ? (
                  <p className="text-gray-400 text-sm">Waiting for host to start rematch...</p>
                ) : (
                  <button
                    onClick={handleRematch}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-lg transition-colors"
                  >
                    🔄 Rematch?
                  </button>
                )}
              </div>
            )}
          </div>
        ) : isInLobby ? (
          /* Lobby controls */
          <div className="flex flex-col items-center gap-4">
            {isOwner ? (
              /* Owner controls */
              !opponentJoined ? (
                /* Waiting for opponent - show copy link and settings */
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg transition-colors flex items-center gap-2"
                  >
                    🔗 Copy Invite Link
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                    title="Settings"
                  >
                    ⚙️
                  </button>
                </div>
              ) : (
                /* Opponent ready - show start button */
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleStart}
                    className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-colors flex items-center gap-2 text-lg"
                  >
                    ▶ Start Game
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                    title="Settings"
                  >
                    ⚙️
                  </button>
                </div>
              )
            ) : (
              /* Joiner - show waiting message if ready, otherwise nothing (ready button is in seat) */
              yourReady && (
                <p className="text-gray-400 text-sm">Waiting for host to start the game...</p>
              )
            )}
          </div>
        ) : (
          /* Game in progress - show community cards and pot */
          <>
            {/* Community cards - responsive width */}
            <div className="flex gap-1 sm:gap-2 justify-center">
              {/* Always render 5 slots, show cards or placeholders */}
              {Array.from({ length: 5 }).map((_, i) => {
                const card = communityCards[i];
                return card ? (
                  <CardComponent
                    key={i}
                    card={card}
                    highlight={isWinningCard(card, winningCards)}
                  />
                ) : (
                  <div
                    key={i}
                    className="w-[40px] h-[56px] sm:w-[60px] sm:h-[84px] rounded-lg border-2 border-dashed border-white/20"
                  />
                );
              })}
            </div>

            {/* Pot */}
            <div className="bg-gray-900/80 px-4 sm:px-6 py-1 sm:py-2 rounded-full border border-gray-700">
              <span className="text-gray-400 text-xs sm:text-sm">Pot: </span>
              <span className="text-yellow-400 font-mono tracking-wider tabular-nums font-bold text-sm sm:text-lg">
                {Math.round(pot)}s
              </span>
            </div>
          </>
        )}
      </div>

      {/* Your seat (bottom) */}
      <div className="relative">
        <Seat
          player={yourPlayer}
          isDealer={dealerIndex === yourSeatIndex}
          position="bottom"
          showCards
          hideCards={isInLobby}
          revealedCards={yourRevealedCards}
          winningCards={winningCards}
          isSetupMode={isInLobby && !isOwner && !yourReady}
          onReady={(alias) => {
            // Update alias if changed, then send ready
            if (alias && alias !== yourPlayer?.alias) {
              send({ type: 'UPDATE_ALIAS', alias });
            }
            send({ type: 'READY' });
          }}
          wins={sessionWins[yourSeatIndex ?? 0]}
        />
        {/* Show Cards button - visible after hand ends when cards not yet revealed */}
        {result && !isHandInProgress && !result.showdown && !yourRevealedCards && (
          <button
            onClick={() => send({ type: 'SHOW_CARDS' })}
            className="absolute -right-20 sm:-right-24 top-1/2 -translate-y-1/2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-lg transition-colors"
          >
            Show Cards
          </button>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} send={send} />
    </div>
  );
}
