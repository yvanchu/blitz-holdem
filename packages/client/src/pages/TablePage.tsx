import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import Table from '../components/Table';
import ActionBar from '../components/ActionBar';
import { HandHistoryModal } from '../components/HandHistoryModal';

export default function TablePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { connected, error, send, ownerLeft } = useSocket(roomId ?? '');
  const { isHandInProgress, yourPlayerId, yourSeatIndex, settings } = useGameStore();

  const alias = sessionStorage.getItem('playerAlias') || 'Player';

  // Warn before leaving if game is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isHandInProgress) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isHandInProgress]);

  // Join room on connect
  useEffect(() => {
    if (connected && roomId && !yourPlayerId) {
      send({ type: 'JOIN', roomId, alias });
    }
  }, [connected, roomId, yourPlayerId, send, alias]);

  // Redirect to home if owner left
  useEffect(() => {
    if (ownerLeft) {
      navigate('/');
    }
  }, [ownerLeft, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Back to Home
          </button>
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

  // Wait for room state to be received (yourSeatIndex will be set)
  if (yourSeatIndex === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-gray-400">Joining table...</p>
      </div>
    );
  }

  const isJoiner = yourSeatIndex === 1;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-felt">
      {/* Hand History Modal */}
      <HandHistoryModal />

      {/* Stakes display for joiner - top right */}
      {isJoiner && settings && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-gray-800/90 px-3 py-1.5 rounded-lg text-sm">
            <span className="text-gray-400">Stakes: </span>
            <span className="text-white font-medium">
              {settings.smallBlind}/{settings.bigBlind}
            </span>
          </div>
        </div>
      )}

      {/* Main table area */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-2 sm:px-4 pt-2 sm:pt-0 min-h-0 sm:min-h-[500px]">
        <Table send={send} />
      </div>

      {/* Action bar - always visible for consistent layout */}
      <ActionBar send={send} isHandInProgress={isHandInProgress} />
    </div>
  );
}
