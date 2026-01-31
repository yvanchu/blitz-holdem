import { useState, useEffect, useCallback } from 'react';
import {
  useGameStore,
  selectYourPlayer,
  selectIsYourTurn,
  selectToCall,
  selectValidActions,
  selectOpponentPlayer,
} from '../store/gameStore';
import type { ActionType, C2SMessage } from '@blitz-holdem/common';

interface ActionBarProps {
  send: (message: C2SMessage) => void;
}

export default function ActionBar({ send }: ActionBarProps) {
  const { minRaise, currentBet, pot } = useGameStore();
  const yourPlayer = useGameStore(selectYourPlayer);
  const opponent = useGameStore(selectOpponentPlayer);
  const isYourTurn = useGameStore(selectIsYourTurn);
  const toCall = useGameStore(selectToCall);
  const validActions = useGameStore(selectValidActions);

  const [betAmount, setBetAmount] = useState(minRaise);
  const [showRaisePanel, setShowRaisePanel] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hasUserModified, setHasUserModified] = useState(false);

  // Calculate effective stack - limited by opponent's remaining stack
  const opponentEffectiveStack = opponent
    ? Math.round(opponent.timeBank + opponent.currentBet)
    : Infinity;
  const yourCurrentBet = yourPlayer?.currentBet ?? 0;
  const maxEffectiveBet = Math.round(opponentEffectiveStack - yourCurrentBet);

  // Minimum raise amount: need to call first, then raise by at least minRaise
  // Total amount to put in = toCall + minRaise (the raise portion)
  const minBetAmount = toCall + minRaise;

  // Max bet is capped by both your stack and effective stack
  const maxBet = yourPlayer ? Math.min(yourPlayer.timeBank, maxEffectiveBet) : 0;

  // Only reset bet amount when it's a new betting action (not every tick)
  // Reset when: raise panel opens, or when minBetAmount increases beyond current bet
  useEffect(() => {
    if (!hasUserModified || betAmount < minBetAmount) {
      const clampedMin = Math.min(minBetAmount, maxBet);
      setBetAmount(clampedMin);
      setInputValue(String(clampedMin));
    }
  }, [minBetAmount]);

  // Reset user modified flag when raise panel closes
  useEffect(() => {
    if (!showRaisePanel) {
      setHasUserModified(false);
    }
  }, [showRaisePanel]);

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

  // Handle input change for exact amount
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setHasUserModified(true);
    const num = parseInt(value);
    if (!isNaN(num) && num >= minBetAmount && num <= maxBet) {
      setBetAmount(num);
    }
  };

  // Handle preset button clicks
  const setPreset = (amount: number) => {
    setHasUserModified(true);
    const clamped = Math.min(maxBet, Math.max(minBetAmount, Math.floor(amount)));
    setBetAmount(clamped);
    setInputValue(String(clamped));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 safe-area-bottom">
      {/* Raise/Bet panel */}
      {showRaisePanel && canRaise && (
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
          <div className="max-w-lg mx-auto">
            {/* Slider with input */}
            <div className="flex items-center gap-3 mb-3">
              <input
                type="range"
                min={minBetAmount}
                max={maxBet}
                value={betAmount}
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
                  min={minBetAmount}
                  max={maxBet}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onBlur={() => {
                    // Clamp value on blur
                    const num = parseInt(inputValue);
                    if (isNaN(num) || num < minBetAmount) {
                      setBetAmount(minBetAmount);
                      setInputValue(String(minBetAmount));
                    } else if (num > maxBet) {
                      setBetAmount(maxBet);
                      setInputValue(String(maxBet));
                    }
                  }}
                  className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-center text-sm"
                />
                <span className="text-gray-400 text-sm">s</span>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => setPreset(minBetAmount)}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                Min Raise
              </button>
              <button
                onClick={() => setPreset(Math.floor(pot / 2))}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                1/2 Pot
              </button>
              <button
                onClick={() => setPreset(Math.floor((pot * 3) / 4))}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                3/4 Pot
              </button>
              <button
                onClick={() => setPreset(pot)}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                Pot
              </button>
              <button
                onClick={() => setPreset(maxBet)}
                className="px-2 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded font-medium uppercase"
              >
                All In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main buttons */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto grid grid-cols-4 gap-2">
          {/* CALL button */}
          <button
            onClick={() => sendAction('call', toCall)}
            disabled={!isYourTurn || !canCall}
            className={`
              py-4 rounded-lg font-semibold text-sm sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canCall && isYourTurn
                  ? 'border-green-500 text-green-400 hover:bg-green-500/20 active:bg-green-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {canCall ? `Call ${toCall}s` : 'Call'}
          </button>

          {/* BET/RAISE button */}
          <button
            onClick={() => {
              if (showRaisePanel) {
                // Send the bet/raise with all-in if at max
                if (betAmount >= maxBet) {
                  sendAction('all-in', maxBet);
                } else {
                  sendAction(isBet ? 'bet' : 'raise', betAmount);
                }
              } else {
                setShowRaisePanel(true);
              }
            }}
            disabled={!isYourTurn || !canRaise}
            className={`
              py-4 rounded-lg font-semibold text-sm sm:text-base uppercase tracking-wide
              border-2 transition-all
              ${
                canRaise && isYourTurn
                  ? showRaisePanel
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-green-500 text-green-400 hover:bg-green-500/20 active:bg-green-500/30'
                  : 'border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {showRaisePanel ? `${isBet ? 'Bet' : 'Raise'} ${betAmount}s` : isBet ? 'Bet' : 'Raise'}
          </button>

          {/* CHECK button */}
          <button
            onClick={() => sendAction('check')}
            disabled={!isYourTurn || !canCheck}
            className={`
              py-4 rounded-lg font-semibold text-sm sm:text-base uppercase tracking-wide
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
              py-4 rounded-lg font-semibold text-sm sm:text-base uppercase tracking-wide
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
