import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

// Single shared socket for the whole app — Lead Detail pages join/leave a
// `lead:<id>` room as the user navigates between leads. Auto-reconnects by
// default (socket.io's built-in behavior), which matters on Render's free
// tier: the backend can spin down after ~15 min idle, and the next request
// wakes it back up — the client just quietly reconnects when that happens.
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
  }
  return socket;
}
