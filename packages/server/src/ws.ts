import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import type { RoomManager } from './room';
import type { C2SMessage } from '@blitz-holdem/common';

interface ExtendedWebSocket extends WebSocket {
  roomId?: string;
  playerId?: string;
  isAlive?: boolean;
}

export function setupWebSocket(server: Server, roomManager: RoomManager) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  console.log('WebSocket server initialized on path /ws');

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        return ws.terminate();
      }
      extWs.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws: ExtendedWebSocket, req: IncomingMessage) => {
    console.log(`WebSocket connection from ${req.socket.remoteAddress} - ${req.url}`);
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as C2SMessage;
        handleMessage(ws, message, roomManager);
      } catch (err) {
        console.error('Invalid message:', err);
        sendError(ws, 'INVALID_MESSAGE', 'Could not parse message');
      }
    });

    ws.on('close', () => {
      if (ws.roomId && ws.playerId) {
        const room = roomManager.getRoom(ws.roomId);
        room?.handleDisconnect(ws.playerId);
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });

  return wss;
}

function handleMessage(ws: ExtendedWebSocket, message: C2SMessage, roomManager: RoomManager) {
  switch (message.type) {
    case 'JOIN': {
      const room = roomManager.getRoom(message.roomId);
      if (!room) {
        sendError(ws, 'ROOM_NOT_FOUND', 'Room does not exist');
        return;
      }

      const result = room.addPlayer(ws, message.alias);
      if (!result.success) {
        sendError(ws, 'JOIN_FAILED', result.error ?? 'Could not join room');
        return;
      }

      ws.roomId = message.roomId;
      ws.playerId = result.playerId;
      break;
    }

    case 'READY': {
      if (!ws.roomId || !ws.playerId) {
        sendError(ws, 'NOT_IN_ROOM', 'Join a room first');
        return;
      }
      const room = roomManager.getRoom(ws.roomId);
      room?.setPlayerReady(ws.playerId);
      break;
    }

    case 'ACTION': {
      if (!ws.roomId || !ws.playerId) {
        sendError(ws, 'NOT_IN_ROOM', 'Join a room first');
        return;
      }
      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        sendError(ws, 'ROOM_NOT_FOUND', 'Room no longer exists');
        return;
      }

      const actionResult = room.handleAction(ws.playerId, message.action, message.amount);
      if (!actionResult.success) {
        sendError(ws, 'ACTION_FAILED', actionResult.error ?? 'Invalid action');
      }
      break;
    }

    case 'UPDATE_SETTINGS': {
      if (!ws.roomId || !ws.playerId) {
        sendError(ws, 'NOT_IN_ROOM', 'Join a room first');
        return;
      }
      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        sendError(ws, 'ROOM_NOT_FOUND', 'Room no longer exists');
        return;
      }

      const settingsResult = room.updateSettings(ws.playerId, message.settings);
      if (!settingsResult.success) {
        sendError(ws, 'SETTINGS_FAILED', settingsResult.error ?? 'Could not update settings');
      }
      break;
    }

    case 'UPDATE_ALIAS': {
      if (!ws.roomId || !ws.playerId) {
        sendError(ws, 'NOT_IN_ROOM', 'Join a room first');
        return;
      }
      const room = roomManager.getRoom(ws.roomId);
      if (!room) {
        sendError(ws, 'ROOM_NOT_FOUND', 'Room no longer exists');
        return;
      }

      room.updatePlayerAlias(ws.playerId, message.alias);
      break;
    }

    case 'PING': {
      ws.send(
        JSON.stringify({
          type: 'PONG',
          clientTime: message.clientTime,
          serverTime: Date.now(),
        })
      );
      break;
    }
  }
}

function sendError(ws: WebSocket, code: string, message: string) {
  ws.send(JSON.stringify({ type: 'ERROR', code, message }));
}
