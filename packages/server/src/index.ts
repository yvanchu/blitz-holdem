import express, { type Express } from 'express';
import { createServer } from 'http';
import { setupWebSocket } from './ws';
import { RoomManager } from './room';

const PORT = process.env.PORT ?? 3001;

const app: Express = express();
app.use(express.json());

// CORS middleware for development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Create room endpoint
const roomManager = new RoomManager();

app.post('/api/rooms', (_req, res) => {
  const roomId = roomManager.createRoom();
  res.json({ roomId, joinUrl: `/table/${roomId}` });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({
    roomId: room.id,
    playerCount: room.getPlayerCount(),
    isPlaying: room.isPlaying(),
  });
});

const server = createServer(app);

// Setup WebSocket
setupWebSocket(server, roomManager);

server.listen(PORT, () => {
  console.log(`🃏 Bullet Poker server running on port ${PORT}`);
});

export { app, server };
