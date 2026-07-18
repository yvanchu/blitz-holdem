import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useGameStore,
  selectYourPlayer,
  selectIsYourTurn,
  selectToCall,
  selectValidActions,
} from '../store/gameStore';
import type { ActionType, C2SMessage } from '@bullet-poker/common';
import { HandHistoryButton } from './HandHistoryButton';

// Ref for bet input focus from keyboard shortcut
let betInputRef: HTMLInputElement | null = null;

interface ActionBarProps {
  send: (message: C2SMessage) => void;
  isHandInProgress: boolean;
}

export default function ActionBar({ send, isHandInProgress }: ActionBarProps) {
  const { minRaise, currentBet, pot, result, revealedCards, yourSeatIndex } = useGameStore();
  const yourPlayer = useGameStore(selectYourPlayer);
  const isYourTurn = useGameStore(selectIsYourTurn);
  const toCall = useGameStore(selectToCall);
  const validActions = useGameStore(selectValidActions);

  const [betAmount, setBetAmount] = useState(minRaise);
  const [showRaisePanel, setShowRaisePanel] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hasUserModified, setHasUserModified] = useState(false);
  const [autoAllIn, setAutoAllIn] = useState(false);

  // Track if we've already sent the auto all-in for this turn
  const autoAllInSentRef = useRef(false);

  // The input is now the TOTAL bet amount (what you'll have committed after the action)
  // Minimum total bet = your current bet + toCall + minRaise (the raise portion)
  const yourCurrentBet = yourPlayer?.currentBet ?? 0;
  const minTotalBet = yourCurrentBet + toCall + minRaise;

  // Max bet is your current bet plus your entire time bank
  const maxTotalBet = yourCurrentBet + (yourPlayer?.timeBank ?? 0);

  // Only invalid if raise is too SMALL - too large will auto-clamp to all-in
  const isRaiseTooSmall = betAmount < minTotalBet;

  // Can show cards: hand ended, not showdown, cards not yet revealed
  const yourRevealedCards = yourSeatIndex === 0 ? revealedCards?.seat0 : revealedCards?.seat1;
  const canShowCards = result && !isHandInProgress && !result.showdown && !yourRevealedCards;

  // Handler for show cards
  const handleShowCards = useCallback(() => {
    send({ type: 'SHOW_CARDS' });
  }, [send]);

  // Auto-clamp betAmount to maxTotalBet when timebank decreases (tick down with all-in)
  useEffect(() => {
    if (betAmount > maxTotalBet) {
      setBetAmount(maxTotalBet);
      setInputValue(String(maxTotalBet));
    }
  }, [maxTotalBet]);

  // Only reset bet amount when it's a new betting action (not every tick)
  // Reset when: raise panel opens, or when minTotalBet increases beyond current bet
  useEffect(() => {
    if (!hasUserModified || betAmount < minTotalBet) {
      const clampedMin = Math.min(minTotalBet, maxTotalBet);
      setBetAmount(clampedMin);
      setInputValue(String(clampedMin));
    }
  }, [minTotalBet]);

  // Reset user modified flag when raise panel closes
  useEffect(() => {
    if (!showRaisePanel) {
      setHasUserModified(false);
    }
  }, [showRaisePanel]);

  // Reset auto all-in sent flag when it's no longer our turn
  useEffect(() => {
    if (!isYourTurn) {
      autoAllInSentRef.current = false;
    }
  }, [isYourTurn]);

  // Auto all-in: immediately send all-in action when it becomes our turn
  // If opponent is already all-in, we call instead
  useEffect(() => {
    if (autoAllIn && isYourTurn && validActions.length > 0 && !autoAllInSentRef.current) {
      autoAllInSentRef.current = true;
      // Small delay to ensure the action is processed
      const timer = setTimeout(() => {
        // If all-in is available, use it; otherwise call (opponent already all-in)
        if (validActions.includes('all-in')) {
          send({ type: 'ACTION', action: 'all-in' });
        } else if (validActions.includes('call')) {
          send({ type: 'ACTION', action: 'call' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoAllIn, isYourTurn, validActions, send]);

  const sendAction = useCallback(
    (action: ActionType, amount?: number) => {
      send({ type: 'ACTION', action, amount });
      setShowRaisePanel(false);
    },
    [send]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!isYourTurn) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Enter key in input fields for raise submission
      if (e.target instanceof HTMLInputElement && e.key.toLowerCase() !== 'enter') return;

      switch (e.key.toLowerCase()) {
        case 'f':
          if (validActions.includes('fold')) sendAction('fold');
          break;
        case 'c':
          if (validActions.includes('call')) sendAction('call', toCall);
          else if (validActions.includes('check')) sendAction('check');
          break;
        case 'k':
          if (validActions.includes('check')) sendAction('check');
          break;
        case 'r':
          if (validActions.includes('bet') || validActions.includes('raise')) {
            if (!showRaisePanel) {
              setShowRaisePanel(true);
              // Focus input after panel opens
              setTimeout(() => betInputRef?.focus(), 50);
            } else {
              // If panel already open, focus input
              betInputRef?.focus();
            }
          }
          break;
        case 'a':
          setAutoAllIn(!autoAllIn);
          break;
        case 'enter':
          if (showRaisePanel && !isRaiseTooSmall) {
            const raiseAmount = betAmount - yourCurrentBet;
            if (betAmount >= maxTotalBet) {
              sendAction('all-in', raiseAmount);
            } else {
              sendAction(currentBet === 0 ? 'bet' : 'raise', raiseAmount);
            }
          }
          break;
        case 'escape':
          setShowRaisePanel(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isYourTurn,
    validActions,
    sendAction,
    betAmount,
    toCall,
    yourPlayer,
    showRaisePanel,
    currentBet,
    autoAllIn,
    isRaiseTooSmall,
    yourCurrentBet,
    maxTotalBet,
  ]);

  // Keyboard shortcut for show cards (S key) - separate from turn-based shortcuts
  useEffect(() => {
    if (!canShowCards) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === 's') {
        handleShowCards();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canShowCards, handleShowCards]);

  if (!yourPlayer) {
    // Return minimal action bar with just Hand History when no player (shouldn't normally happen)
    return (
      <div className="shrink-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 safe-area-bottom">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div className="max-w-lg mx-auto">
            <HandHistoryButton />
          </div>
        </div>
      </div>
    );
  }

  const canCall = isHandInProgress && validActions.includes('call');
  const canCheck = isHandInProgress && validActions.includes('check');
  const canRaise =
    isHandInProgress && (validActions.includes('bet') || validActions.includes('raise'));
  const canFold = isHandInProgress && validActions.includes('fold');
  const isBet = currentBet === 0; // True if this is a bet, false if it's a raise
  const isRaisePanelOpen = showRaisePanel && canRaise;

  // Handle input change for exact amount - clamp to max if too high, allow low values for red indicator
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setHasUserModified(true);
    const num = parseInt(value);
    if (!isNaN(num)) {
      // Auto-clamp to maxTotalBet if exceeding (shows as all-in)
      if (num > maxTotalBet) {
        setBetAmount(maxTotalBet);
        setInputValue(String(maxTotalBet));
      } else {
        setBetAmount(num);
      }
    }
  };

  // Handle preset button clicks - presets use TOTAL bet amount
  const setPreset = (totalAmount: number) => {
    setHasUserModified(true);
    const clamped = Math.min(maxTotalBet, Math.max(minTotalBet, Math.floor(totalAmount)));
    setBetAmount(clamped);
    setInputValue(String(clamped));
  };

  return (
    <div
      data-testid="action-bar"
      className="shrink-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 safe-area-bottom"
    >
      {/* Raise/Bet panel - kept mounted so opening it does not recreate layout */}
      <div
        className={`overflow-hidden border-b sm:border-b border-gray-700 bg-gray-800/95 sm:bg-gray-800/50 transition-[max-height,opacity] ${
          isRaisePanelOpen
            ? 'max-h-72 opacity-100 px-3 sm:px-4 py-3 sm:py-4'
            : 'max-h-0 opacity-0 px-3 sm:px-4 py-0 pointer-events-none'
        }`}
        aria-hidden={!isRaisePanelOpen}
      >
        <div className="max-w-lg mx-auto">
          {/* Two column layout: big input on left, presets on right */}
          <div className="flex gap-3 sm:gap-4">
            {/* Large bet amount display */}
            <div className="flex-shrink-0">
              <div className="text-gray-400 text-xs mb-1">Your {isBet ? 'bet' : 'raise'}</div>
              <div
                className={`relative ${!isRaiseTooSmall ? 'bg-amber-600' : 'bg-red-600'} rounded-lg px-3 py-2 sm:px-4 sm:py-3`}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  data-testid={isRaisePanelOpen ? 'bet-input' : undefined}
                  ref={(el) => {
                    betInputRef = el;
                  }}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    const num = parseInt(inputValue);
                    if (isNaN(num)) {
                      setBetAmount(minTotalBet);
                      setInputValue(String(minTotalBet));
                    } else if (num > maxTotalBet) {
                      setBetAmount(maxTotalBet);
                      setInputValue(String(maxTotalBet));
                    } else {
                      setBetAmount(num);
                    }
                  }}
                  className="w-20 sm:w-24 bg-transparent text-white text-2xl sm:text-3xl font-bold text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

              {/* Presets and slider */}
              <div className="flex-1 flex flex-col gap-2">
                {/* Preset buttons */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setPreset(currentBet + Math.floor(pot / 3))}
                    className="px-1 py-2.5 sm:py-2 text-[11px] sm:text-xs bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
                  >
                    33%
                  </button>
                  <button
                    onClick={() => setPreset(currentBet + Math.floor((pot * 3) / 4))}
                    className="px-1 py-2.5 sm:py-2 text-[11px] sm:text-xs bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setPreset(currentBet + pot)}
                    className="px-1 py-2.5 sm:py-2 text-[11px] sm:text-xs bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
                  >
                    Pot
                  </button>
                  <button
                    onClick={() => setPreset(currentBet + Math.floor((pot * 3) / 2))}
                    className="px-1 py-2.5 sm:py-2 text-[11px] sm:text-xs bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
                  >
                    150%
                  </button>
                  <button
                    onClick={() => setPreset(maxTotalBet)}
                    className="px-1 py-2.5 sm:py-2 text-[11px] sm:text-xs bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
                  >
                    All In
                  </button>
                </div>

                {/* Slider */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreset(Math.max(minTotalBet, betAmount - 1))}
                    className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded text-lg font-bold"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    data-testid={isRaisePanelOpen ? 'bet-slider' : undefined}
                    min={minTotalBet}
                    max={maxTotalBet}
                    value={Math.max(minTotalBet, Math.min(maxTotalBet, betAmount))}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setHasUserModified(true);
                      setBetAmount(val);
                      setInputValue(String(val));
                    }}
                    className="flex-1 accent-amber-500 h-2"
                  />
                  <button
                    onClick={() => setPreset(Math.min(maxTotalBet, betAmount + 1))}
                    className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Back and Confirm buttons on mobile */}
            <div className="flex gap-2 mt-3 sm:hidden">
              <button
                onClick={() => setShowRaisePanel(false)}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm uppercase border-2 border-gray-600 text-gray-400"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (isRaiseTooSmall) return;
                  const raiseAmount = betAmount - yourCurrentBet;
                  if (betAmount >= maxTotalBet) {
                    sendAction('all-in', raiseAmount);
                  } else {
                    sendAction(isBet ? 'bet' : 'raise', raiseAmount);
                  }
                }}
                disabled={isRaiseTooSmall}
                data-testid={isRaisePanelOpen ? 'confirm-raise-button' : undefined}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm uppercase border-2 ${
                  !isRaiseTooSmall
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-red-500 bg-red-500/20 text-red-400'
                }`}
              >
                {isBet ? 'Bet' : 'Raise'}
              </button>
            </div>
          </div>
      </div>

      {/* Main buttons */}
      <div className="px-3 sm:px-4 py-2 sm:py-3">
        {/* Hand History Button + Auto All-In + Show Cards row - reserves height in all states */}
        <div
          className={`max-w-lg mx-auto mb-2 sm:mb-3 flex min-h-[38px] sm:min-h-[42px] items-center gap-2 ${
            isRaisePanelOpen ? 'invisible' : ''
          }`}
          aria-hidden={isRaisePanelOpen}
        >
          <HandHistoryButton />
          {isHandInProgress ? (
            <label
              className={`
                  flex items-center gap-2 cursor-pointer select-none flex-1
                  px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 transition-all
                  ${
                    autoAllIn
                      ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500'
                  }
              `}
            >
              <input
                type="checkbox"
                checked={autoAllIn}
                onChange={(e) => setAutoAllIn(e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="text-xs sm:text-sm font-medium">
                Auto All-In
                <span
                  className={`ml-2 text-xs text-yellow-500/80 hidden sm:inline ${
                    autoAllIn ? '' : 'invisible'
                  }`}
                >
                  (Will go all-in on your turn)
                </span>
              </span>
              <span className="hidden sm:block ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 border border-gray-600 rounded text-gray-400">
                A
              </span>
            </label>
          ) : (
            <div className="flex-1" aria-hidden="true" />
          )}
          {/* Show Cards button - visible after hand ends when cards not yet revealed */}
          <button
            onClick={handleShowCards}
            disabled={!canShowCards}
            data-testid={canShowCards ? 'show-cards-button' : undefined}
            className={`relative ml-auto px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-lg transition-colors ${
              canShowCards ? '' : 'invisible pointer-events-none'
            }`}
            aria-hidden={!canShowCards}
          >
            Show Cards
            <span className="hidden sm:block absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 border border-gray-600 rounded text-gray-400">
              S
            </span>
          </button>
        </div>

        <div className="max-w-lg mx-auto grid grid-cols-4 gap-1.5 sm:gap-2">
          {/* CALL button */}
          <button
            onClick={() => sendAction('call', toCall)}
            disabled={!isYourTurn || !canCall}
            data-testid="call-button"
            aria-label={
              canCall
                ? `Call ${Math.round(Math.min(toCall, yourPlayer?.timeBank ?? 0))} seconds`
                : 'Call'
            }
            className={`
              relative py-3.5 sm:py-4 rounded-lg font-semibold text-xs sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canCall && isYourTurn
                  ? 'border-green-500 text-green-400 hover:bg-green-500/20 active:bg-green-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {canCall ? `Call ${Math.round(Math.min(toCall, yourPlayer?.timeBank ?? 0))}s` : 'Call'}
            <span className="hidden sm:block absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 border border-gray-600 rounded text-gray-400">
              C
            </span>
          </button>

          {/* BET/RAISE button */}
          <button
            onClick={() => {
              if (showRaisePanel) {
                if (isRaiseTooSmall) return; // Don't submit if raise is too small
                // Calculate the delta (amount to add to reach total)
                const raiseAmount = betAmount - yourCurrentBet;
                // Send the bet/raise with all-in if at max
                if (betAmount >= maxTotalBet) {
                  sendAction('all-in', raiseAmount);
                } else {
                  sendAction(isBet ? 'bet' : 'raise', raiseAmount);
                }
              } else {
                setShowRaisePanel(true);
              }
            }}
            disabled={!isYourTurn || !canRaise || (showRaisePanel && isRaiseTooSmall)}
            data-testid="raise-button"
            aria-label={isBet ? 'Bet' : 'Raise'}
            className={`
              relative py-3.5 sm:py-4 rounded-lg font-semibold text-xs sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canRaise && isYourTurn
                  ? showRaisePanel
                    ? !isRaiseTooSmall
                      ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                      : 'border-red-500 bg-red-500/20 text-red-400'
                    : 'border-amber-500 text-amber-400 hover:bg-amber-500/20 active:bg-amber-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {showRaisePanel ? `${isBet ? 'Bet' : 'Raise'} ${betAmount}s` : isBet ? 'Bet' : 'Raise'}
            <span className="hidden sm:block absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 border border-gray-600 rounded text-gray-400">
              R
            </span>
          </button>

          {/* CHECK button */}
          <button
            onClick={() => sendAction('check')}
            disabled={!isYourTurn || !canCheck}
            data-testid="check-button"
            aria-label="Check"
            className={`
              relative py-3.5 sm:py-4 rounded-lg font-semibold text-xs sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canCheck && isYourTurn
                  ? 'border-green-500 text-green-400 hover:bg-green-500/20 active:bg-green-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            Check
            <span className="hidden sm:block absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 border border-gray-600 rounded text-gray-400">
              K
            </span>
          </button>

          {/* FOLD button */}
          <button
            onClick={() => sendAction('fold')}
            disabled={!isYourTurn || !canFold}
            data-testid="fold-button"
            aria-label="Fold"
            className={`
              relative py-3.5 sm:py-4 rounded-lg font-semibold text-xs sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canFold && isYourTurn
                  ? 'border-red-500 text-red-400 hover:bg-red-500/20 active:bg-red-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            Fold
            <span className="hidden sm:block absolute -top-2 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-gray-800 border border-gray-600 rounded text-gray-400">
              F
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
