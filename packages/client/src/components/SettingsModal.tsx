import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import type { C2SMessage } from '@bullet-poker/common';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  send: (message: C2SMessage) => void;
}

export default function SettingsModal({ isOpen, onClose, send }: SettingsModalProps) {
  const { settings } = useGameStore();

  const [smallBlind, setSmallBlind] = useState(settings?.smallBlind ?? 1);
  const [bigBlind, setBigBlind] = useState(settings?.bigBlind ?? 2);
  const [timeBank, setTimeBank] = useState(settings?.initialTimeBank ?? 300);

  // Sync local state when settings change from server
  useEffect(() => {
    if (settings) {
      setSmallBlind(settings.smallBlind);
      setBigBlind(settings.bigBlind);
      setTimeBank(settings.initialTimeBank);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Validate
    const sb = Math.max(1, Math.floor(smallBlind));
    const bb = Math.max(sb, Math.floor(bigBlind));
    const tb = Math.max(bb * 10, Math.floor(timeBank));

    send({
      type: 'UPDATE_SETTINGS',
      settings: {
        smallBlind: sb,
        bigBlind: bb,
        initialTimeBank: tb,
      },
    });
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        data-testid="settings-modal"
        className="bg-gray-800 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">⚙️ Game Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Small Blind */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Small Blind</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={smallBlind}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setSmallBlind(val);
                  // Auto-adjust big blind if needed
                  if (bigBlind < val) {
                    setBigBlind(val * 2);
                  }
                }}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm w-8">sec</span>
            </div>
          </div>

          {/* Big Blind */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Big Blind</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={smallBlind}
                value={bigBlind}
                onChange={(e) => {
                  const val = Math.max(smallBlind, parseInt(e.target.value) || smallBlind);
                  setBigBlind(val);
                }}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm w-8">sec</span>
            </div>
          </div>

          {/* Time Bank */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Starting Time Bank
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={bigBlind * 10}
                step={10}
                value={timeBank}
                onChange={(e) => {
                  const val = Math.max(bigBlind * 10, parseInt(e.target.value) || bigBlind * 10);
                  setTimeBank(val);
                }}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm w-8">sec</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum: {bigBlind * 10} seconds (10 big blinds)
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            data-testid="settings-save-button"
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
