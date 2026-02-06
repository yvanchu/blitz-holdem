import { nanoid } from 'nanoid';
import { TableController } from './table';
import type { TableSettings } from '@blitz-holdem/common';

export class RoomManager {
  private rooms = new Map<string, TableController>();
  private defaultSettings?: Partial<TableSettings>;

  constructor(defaultSettings?: Partial<TableSettings>) {
    this.defaultSettings = defaultSettings;
  }

  createRoom(settingsOverrides?: Partial<TableSettings>): string {
    const roomId = nanoid(8);
    const settings = { ...this.defaultSettings, ...settingsOverrides };
    const table = new TableController(roomId, settings);
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
