import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import Table from '../components/Table';
import ActionBar from '../components/ActionBar';
import WaitingRoom from '../components/WaitingRoom';

export default function TablePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { connected, error, send } = useSocket(roomId ?? '');
  const { isHandInProgress, yourPlayerId } = useGameStore();
  const [isReady, setIsReady] = useState(false);

  const alias = sessionStorage.getItem('playerAlias') || 'Player';

  // Join room on connect
  useEffect(() => {
    if (connected && roomId && !yourPlayerId) {
      send({ type: 'JOIN', roomId, alias });
    }
  }, [connected, roomId, yourPlayerId, send, alias]);

  const handleReady = () => {
    send({ type: 'READY' });
    setIsReady(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-gray-400">Connecting to table...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      {/* Share link - compact header */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="text-sm text-gray-400">
          Room: <span className="text-white font-mono">{roomId}</span>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          📋 Copy Link
        </button>
      </div>

      {/* Main table area - flex-1 to fill remaining space */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0">
        {!isHandInProgress && !isReady ? (
          <WaitingRoom onReady={handleReady} send={send} />
        ) : (
          <Table />
        )}
      </div>

      {/* Action bar */}
      {isHandInProgress && <ActionBar send={send} />}
    </div>
  );
}
