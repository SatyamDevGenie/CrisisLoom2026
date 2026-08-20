import { SOCKET_EVENTS } from "../utils/constants";
import { emitEvent } from "../sockets";

export const appEvents = {
  shelterUpdated(payload: unknown) {
    emitEvent(SOCKET_EVENTS.SHELTER_UPDATED, payload, "dashboard");
  },
  requestCritical(payload: unknown) {
    emitEvent(SOCKET_EVENTS.REQUEST_CRITICAL, payload, "dashboard");
  },
  dashboardStats(payload: unknown) {
    emitEvent(SOCKET_EVENTS.DASHBOARD_STATS, payload, "dashboard");
  },
};
