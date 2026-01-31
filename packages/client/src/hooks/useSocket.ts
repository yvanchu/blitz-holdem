import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { C2SMessage, S2CMessage } from '@blitz-holdem/common';

export function useSocket(_roomId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnecting = useRef(false);

  const send = useCallback((message: C2SMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not open, cannot send:', message.type);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnecting.current = true;

    const connect = () => {
      // WebSocket URL configuration:
      // - In development: connect to localhost:3001
      // - In production: use VITE_WS_URL env var, or fallback to same host
      const wsUrl =
        import.meta.env.VITE_WS_URL ||
        (import.meta.env.DEV
          ? 'ws://localhost:3001/ws'
          : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);

      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setConnected(true);
        setError(null);
        useGameStore.getState().setConnected(true);
        reconnectAttempts.current = 0;
        isConnecting.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as S2CMessage;
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        useGameStore.getState().setConnected(false);
        isConnecting.current = false;

        // Attempt reconnect only if not a normal close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          setTimeout(connect, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Connection lost. Please refresh the page.');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
      };
    };

    connect();

    // Cleanup on unmount only
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, []); // Empty deps - only run once on mount

  // Separate effect for ping
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING', clientTime: Date.now() }));
      }
    }, 5000);

    return () => clearInterval(pingInterval);
  }, []);

  return { connected, error, send };
}

function handleMessage(message: S2CMessage) {
  const store = useGameStore.getState();

  switch (message.type) {
    case 'ROOM_STATE':
      store.setRoomState({
        roomId: message.roomId,
        yourPlayerId: message.yourPlayerId,
        yourSeatIndex: message.yourSeatIndex,
        players: message.players,
        dealerIndex: message.dealerIndex,
        activePlayerIndex: message.activePlayerIndex,
        street: message.street,
        communityCards: message.communityCards,
        pot: message.pot,
        currentBet: message.currentBet,
        minRaise: message.minRaise,
        settings: message.settings,
        handNumber: message.handNumber,
        isHandInProgress: message.isHandInProgress,
      });
      store.syncServerTime(message.serverTime);
      break;

    case 'HAND_START':
      store.setRoomState({
        handNumber: message.handNumber,
        dealerIndex: message.dealerIndex,
        isHandInProgress: true,
        street: 'preflop',
        communityCards: [],
        pot: message.pot,
        currentBet: 0,
      });
      store.updatePlayers(message.players);
      store.clearResult();
      store.syncServerTime(message.serverTime);
      break;

    case 'TURN':
      store.setRoomState({
        activePlayerIndex: message.activePlayerIndex,
        currentBet: message.currentBet,
        minRaise: message.minRaise,
        pot: message.pot,
      });
      store.syncServerTime(message.serverTime);
      break;

    case 'TICK':
      store.updateTimeBanks(message.players);
      store.syncServerTime(message.serverTime);
      break;

    case 'ACTION_CONFIRM':
      store.updatePlayers(message.players);
      store.setRoomState({ pot: message.pot });
      store.syncServerTime(message.serverTime);
      break;

    case 'STREET':
      store.setStreet(message.street, message.communityCards);
      store.setRoomState({ pot: message.pot, currentBet: message.currentBet });
      store.syncServerTime(message.serverTime);
      break;

    case 'RESULT':
      store.setResult(message.result, message.revealedCards, message.communityCards);
      store.updatePlayers(message.players);
      store.syncServerTime(message.serverTime);
      break;

    case 'PLAYER_JOINED': {
      // Update players array
      const joinPlayers = [...useGameStore.getState().players] as [
        typeof message.player | null,
        typeof message.player | null,
      ];
      joinPlayers[message.seatIndex] = message.player;
      store.updatePlayers(joinPlayers);
      break;
    }

    case 'PLAYER_LEFT': {
      const currentPlayers = useGameStore.getState().players;
      const leftPlayers: [(typeof currentPlayers)[0], (typeof currentPlayers)[1]] = [
        ...currentPlayers,
      ];
      leftPlayers[message.seatIndex] = null;
      store.updatePlayers(leftPlayers);
      break;
    }

    case 'ERROR':
      console.error('Server error:', message.code, message.message);
      break;

    case 'PONG': {
      // Calculate RTT
      const rtt = Date.now() - message.clientTime;
      console.debug('RTT:', rtt, 'ms');
      store.syncServerTime(message.serverTime);
      break;
    }

    case 'SETTINGS_UPDATED':
      store.setRoomState({ settings: message.settings });
      break;

    case 'PLAYER_UPDATED': {
      const currentPlayers = useGameStore.getState().players;
      const updatedPlayers: [(typeof currentPlayers)[0], (typeof currentPlayers)[1]] = [
        ...currentPlayers,
      ];
      updatedPlayers[message.seatIndex] = message.player;
      store.updatePlayers(updatedPlayers);
      break;
    }
  }
}
