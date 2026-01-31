import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import type { C2SMessage } from '@blitz-holdem/common';

interface WaitingRoomProps {
  onReady: () => void;
  send: (message: C2SMessage) => void;
}

export default function WaitingRoom({ onReady, send }: WaitingRoomProps) {
  const { players, yourSeatIndex, settings } = useGameStore();

  const playerCount = players.filter(Boolean).length;
  const needsOpponent = playerCount < 2;
  const isFirstPlayer = yourSeatIndex === 0;

  // Local state for editable settings
  const [smallBlind, setSmallBlind] = useState(settings?.smallBlind ?? 1);
  const [bigBlind, setBigBlind] = useState(settings?.bigBlind ?? 2);
  const [timeBank, setTimeBank] = useState(settings?.initialTimeBank ?? 300);
  const [alias, setAlias] = useState(() => {
    return sessionStorage.getItem('playerAlias') || 'Player';
  });

  // Update local state when settings change from server
  useEffect(() => {
    if (settings) {
      setSmallBlind(settings.smallBlind);
      setBigBlind(settings.bigBlind);
      setTimeBank(settings.initialTimeBank);
    }
  }, [settings]);

  // Send settings update to server (only first player can change)
  const handleSettingsChange = (newSB: number, newBB: number, newTimeBank: number) => {
    // Validate
    const sb = Math.max(1, Math.floor(newSB));
    const bb = Math.max(sb, Math.floor(newBB));
    const tb = Math.max(bb * 10, Math.floor(newTimeBank)); // At least 10 BB

    setSmallBlind(sb);
    setBigBlind(bb);
    setTimeBank(tb);

    send({
      type: 'UPDATE_SETTINGS',
      settings: {
        smallBlind: sb,
        bigBlind: bb,
        initialTimeBank: tb,
      },
    });
  };

  // Send alias update
  const handleAliasChange = (newAlias: string) => {
    const trimmed = newAlias.trim().slice(0, 20) || 'Player';
    setAlias(trimmed);
    sessionStorage.setItem('playerAlias', trimmed);
    send({ type: 'UPDATE_ALIAS', alias: trimmed });
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 sm:p-8 max-w-md w-full">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">⚡ Blitz Hold'em</h2>

      {/* Players */}
      <div className="space-y-3 mb-6">
        {players.map((player, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 p-4 rounded-lg ${
              player ? 'bg-gray-700' : 'bg-gray-700/50 border-2 border-dashed border-gray-600'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                player ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gray-600'
              }`}
            >
              {player ? player.alias.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="flex-1 text-left">
              {player ? (
                <>
                  {i === yourSeatIndex ? (
                    // Editable name for your seat
                    <input
                      type="text"
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      onBlur={(e) => handleAliasChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAliasChange(alias)}
                      className="bg-transparent text-white font-medium border-b border-transparent hover:border-gray-500 focus:border-blue-400 focus:outline-none w-full"
                      maxLength={20}
                    />
                  ) : (
                    <div className="text-white font-medium">{player.alias}</div>
                  )}
                  <div className="text-sm text-gray-400">
                    {i === yourSeatIndex && <span className="text-blue-400">(You) · </span>}
                    Seat {i + 1}
                  </div>
                </>
              ) : (
                <div className="text-gray-500">Waiting for player...</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Settings - only first player can edit */}
      <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
        <div className="text-sm text-gray-400 mb-3 font-medium">Game Settings</div>

        <div className="grid grid-cols-3 gap-3">
          {/* Small Blind */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Small Blind</label>
            {isFirstPlayer ? (
              <div className="flex items-center">
                <input
                  type="number"
                  min={1}
                  value={smallBlind}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    handleSettingsChange(val, Math.max(val, bigBlind), timeBank);
                  }}
                  className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-center text-sm"
                />
                <span className="text-gray-400 text-xs ml-1">s</span>
              </div>
            ) : (
              <div className="text-white text-sm">{smallBlind}s</div>
            )}
          </div>

          {/* Big Blind */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Big Blind</label>
            {isFirstPlayer ? (
              <div className="flex items-center">
                <input
                  type="number"
                  min={smallBlind}
                  value={bigBlind}
                  onChange={(e) => {
                    const val = Math.max(smallBlind, parseInt(e.target.value) || smallBlind);
                    handleSettingsChange(smallBlind, val, timeBank);
                  }}
                  className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-center text-sm"
                />
                <span className="text-gray-400 text-xs ml-1">s</span>
              </div>
            ) : (
              <div className="text-white text-sm">{bigBlind}s</div>
            )}
          </div>

          {/* Time Bank */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Time Bank</label>
            {isFirstPlayer ? (
              <div className="flex items-center">
                <input
                  type="number"
                  min={bigBlind * 10}
                  step={10}
                  value={timeBank}
                  onChange={(e) => {
                    const val = Math.max(bigBlind * 10, parseInt(e.target.value) || bigBlind * 10);
                    handleSettingsChange(smallBlind, bigBlind, val);
                  }}
                  className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-center text-sm"
                />
                <span className="text-gray-400 text-xs ml-1">s</span>
              </div>
            ) : (
              <div className="text-white text-sm">{timeBank}s</div>
            )}
          </div>
        </div>

        {!isFirstPlayer && (
          <div className="text-xs text-gray-500 mt-2 text-center">
            Settings are controlled by the room creator
          </div>
        )}
      </div>

      {/* Ready button */}
      {needsOpponent ? (
        <div className="text-gray-400 text-center">
          <div className="animate-pulse mb-2">Waiting for opponent...</div>
          <div className="text-sm">Share this page's URL to invite a friend!</div>
        </div>
      ) : (
        <button
          onClick={onReady}
          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          ✓ Ready to Play
        </button>
      )}
    </div>
  );
}
