import { nanoid } from 'nanoid';
import { TableController } from './table';

export class RoomManager {
  private rooms = new Map<string, TableController>();

  createRoom(): string {
    const roomId = nanoid(8);
    const table = new TableController(roomId);
    this.rooms.set(roomId, table);
    console.log(`Room created: ${roomId}`);
    return roomId;
  }

  getRoom(roomId: string): TableController | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (room) {
      room.destroy();
      this.rooms.delete(roomId);
      console.log(`Room deleted: ${roomId}`);
      return true;
    }
    return false;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }
}
