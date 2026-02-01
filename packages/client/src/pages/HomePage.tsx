import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// API URL configuration:
// - In development: use relative path (Vite proxy handles it)
// - In production: use VITE_API_URL env var pointing to server
const API_BASE = import.meta.env.VITE_API_URL || '';

export default function HomePage() {
  const [isCreating, setIsCreating] = useState(false);
  const [alias, setAlias] = useState('');
  const navigate = useNavigate();

  const createTable = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, { method: 'POST' });
      const data = await res.json();
      // Store alias in session
      sessionStorage.setItem('playerAlias', alias || 'Player');
      navigate(`/table/${data.roomId}`);
    } catch (err) {
      console.error('Failed to create room:', err);
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-5xl font-bold text-white mb-4">⚡ Blitz Hold'em</h1>
      <p className="text-gray-400 mb-8 text-center max-w-md">
        Heads-up no-limit Texas Hold'em where you bet with your time. Every second counts!
      </p>

      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md space-y-6">
        <div>
          <label htmlFor="alias" className="block text-sm font-medium text-gray-300 mb-2">
            Your Name
          </label>
          <input
            type="text"
            id="alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={20}
          />
        </div>

        <button
          onClick={createTable}
          disabled={isCreating}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <span className="animate-spin">⏳</span>
              Creating...
            </>
          ) : (
            <>🎮 Create Table</>
          )}
        </button>

        <div className="text-center text-gray-500 text-sm">
          Share the link with a friend to play
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl text-center">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="text-3xl mb-2">⏱️</div>
          <h3 className="font-semibold text-white mb-1">Time is Currency</h3>
          <p className="text-sm text-gray-400">Bet seconds from your time bank instead of chips</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="text-3xl mb-2">⚡</div>
          <h3 className="font-semibold text-white mb-1">Every Second Counts</h3>
          <p className="text-sm text-gray-400">Your time drains while you think</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="text-3xl mb-2">🏆</div>
          <h3 className="font-semibold text-white mb-1">Win the Pot</h3>
          <p className="text-sm text-gray-400">Winner gets the pot added to their time bank</p>
        </div>
      </div>
    </div>
  );
}
