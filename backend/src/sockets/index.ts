import type { Server as SocketServer } from "socket.io";
import { logger } from "../config/logger";

let io: SocketServer | null = null;

export function setIO(server: SocketServer) {
  io = server;
}

export function getIO() {
  return io;
}

export function emitEvent(event: string, payload: unknown, room?: string) {
  if (!io) {
    logger.debug("Socket emit skipped, server not ready", { event });
    return;
  }

  if (room) {
    io.to(room).emit(event, payload);
    return;
  }

  io.emit(event, payload);
}
