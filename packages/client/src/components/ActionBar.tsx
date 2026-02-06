import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useGameStore,
  selectYourPlayer,
  selectIsYourTurn,
  selectToCall,
  selectValidActions,
} from '../store/gameStore';
import type { ActionType, C2SMessage } from '@blitz-holdem/common';

interface ActionBarProps {
  send: (message: C2SMessage) => void;
}

export default function ActionBar({ send }: ActionBarProps) {
  const { minRaise, currentBet, pot } = useGameStore();
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
  useEffect(() => {
    if (autoAllIn && isYourTurn && validActions.length > 0 && !autoAllInSentRef.current) {
      autoAllInSentRef.current = true;
      // Small delay to ensure the action is processed
      const timer = setTimeout(() => {
        send({ type: 'ACTION', action: 'all-in' });
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
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case 'f':
          if (validActions.includes('fold')) sendAction('fold');
          break;
        case 'c':
          if (validActions.includes('check')) sendAction('check');
          else if (validActions.includes('call')) sendAction('call', toCall);
          break;
        case 'r':
          if (validActions.includes('bet') || validActions.includes('raise')) {
            setShowRaisePanel(!showRaisePanel);
          }
          break;
        case 'enter':
          if (showRaisePanel) {
            sendAction(currentBet === 0 ? 'bet' : 'raise', betAmount);
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
  ]);

  if (!yourPlayer) return null;

  const canCall = validActions.includes('call');
  const canCheck = validActions.includes('check');
  const canRaise = validActions.includes('bet') || validActions.includes('raise');
  const canFold = validActions.includes('fold');
  const isBet = currentBet === 0; // True if this is a bet, false if it's a raise

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
    <div className="shrink-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 safe-area-bottom">
      {/* Raise/Bet panel */}
      {showRaisePanel && canRaise && (
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-700 bg-gray-800/50">
          <div className="max-w-lg mx-auto">
            {/* Slider with input - values are TOTAL bet amount */}
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <input
                type="range"
                min={minTotalBet}
                max={maxTotalBet}
                value={Math.max(minTotalBet, Math.min(maxTotalBet, betAmount))}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setHasUserModified(true);
                  setBetAmount(val);
                  setInputValue(String(val));
                }}
                className="flex-1 accent-green-500 h-2"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={minTotalBet}
                  max={maxTotalBet}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onBlur={() => {
                    // Auto-clamp to max on blur if too high
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
                  className={`w-20 px-2 py-1 border rounded text-white text-center text-sm ${
                    !isRaiseTooSmall
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-red-900/50 border-red-500'
                  }`}
                />
                <span className="text-gray-400 text-sm">s</span>
              </div>
            </div>

            {/* Preset buttons - pot-based presets add to current bet to get total */}
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => setPreset(minTotalBet)}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                Min Raise
              </button>
              <button
                onClick={() => setPreset(currentBet + Math.floor(pot / 2))}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                1/2 Pot
              </button>
              <button
                onClick={() => setPreset(currentBet + Math.floor((pot * 3) / 4))}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                3/4 Pot
              </button>
              <button
                onClick={() => setPreset(currentBet + pot)}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                Pot
              </button>
              <button
                onClick={() => setPreset(maxTotalBet)}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                All In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main buttons */}
      <div className="px-3 sm:px-4 py-2 sm:py-3">
        {/* Auto All-In checkbox */}
        <div className="max-w-lg mx-auto mb-2 sm:mb-3">
          <label
            className={`
              flex items-center gap-2 cursor-pointer select-none
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
              {autoAllIn && (
                <span className="ml-2 text-xs text-yellow-500/80 hidden sm:inline">
                  (Will go all-in on your turn)
                </span>
              )}
            </span>
          </label>
        </div>

        <div className="max-w-lg mx-auto grid grid-cols-4 gap-1.5 sm:gap-2">
          {/* CALL button */}
          <button
            onClick={() => sendAction('call', toCall)}
            disabled={!isYourTurn || !canCall}
            className={`
              py-2.5 sm:py-4 rounded-lg font-semibold text-xs sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canCall && isYourTurn
                  ? 'border-green-500 text-green-400 hover:bg-green-500/20 active:bg-green-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {canCall ? `Call ${Math.min(toCall, yourPlayer?.timeBank ?? 0)}s` : 'Call'}
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
            className={`
              py-2.5 sm:py-4 rounded-lg font-semibold text-xs sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canRaise && isYourTurn
                  ? showRaisePanel
                    ? !isRaiseTooSmall
                      ? 'border-green-500 bg-green-500/20 text-green-400'
                      : 'border-red-500 bg-red-500/20 text-red-400'
                    : 'border-green-500 text-green-400 hover:bg-green-500/20 active:bg-green-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {showRaisePanel
              ? `${isBet ? 'Bet' : 'Raise to'} ${betAmount}s`
              : isBet
                ? 'Bet'
                : 'Raise'}
          </button>

          {/* CHECK button */}
          <button
            onClick={() => sendAction('check')}
            disabled={!isYourTurn || !canCheck}
            className={`
              py-2.5 sm:py-4 rounded-lg font-semibold text-xs sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canCheck && isYourTurn
                  ? 'border-green-500 text-green-400 hover:bg-green-500/20 active:bg-green-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            Check
          </button>

          {/* FOLD button */}
          <button
            onClick={() => sendAction('fold')}
            disabled={!isYourTurn || !canFold}
            className={`
              py-2.5 sm:py-4 rounded-lg font-semibold text-xs sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canFold && isYourTurn
                  ? 'border-red-500 text-red-400 hover:bg-red-500/20 active:bg-red-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            Fold
          </button>
        </div>
      </div>
    </div>
  );
}
