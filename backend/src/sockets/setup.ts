import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { corsOrigins } from "../config/env";
import { logger } from "../config/logger";
import { verifyAccessToken } from "../utils/tokens";
import { setIO } from "./index";
import { SOCKET_EVENTS } from "../utils/constants";

export function initSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.toString().replace("Bearer ", "");
      if (!token) {
        return next();
      }
      const user = verifyAccessToken(token);
      socket.data.user = user;
      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { id?: string; role?: string } | undefined;
    if (user?.id) {
      socket.join(`user:${user.id}`);
      socket.join(`role:${user.role}`);
    }
    socket.join("dashboard");

    socket.on("join:shelter", (shelterId: string) => {
      if (shelterId) socket.join(`shelter:${shelterId}`);
    });

    socket.on("join:disaster", (disasterId: string) => {
      if (disasterId) socket.join(`disaster:${disasterId}`);
    });

    socket.on(SOCKET_EVENTS.VOLUNTEER_LOCATION, (payload) => {
      io.to("dashboard").emit(SOCKET_EVENTS.VOLUNTEER_LOCATION, {
        volunteerId: user?.id,
        ...payload,
      });
    });

    logger.info("Socket connected", { socketId: socket.id, userId: user?.id });

    socket.on("disconnect", () => {
      logger.debug("Socket disconnected", { socketId: socket.id });
    });
  });

  setIO(io);
  logger.info("Socket.IO initialized");
  return io;
}
