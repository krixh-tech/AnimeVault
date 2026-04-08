// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initSocket(token?: string) {
  if (socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket?.id));
  socket.on('disconnect', () => console.log('[Socket] Disconnected'));

  // Global: new episode notification
  socket.on('new:episode:global', (data) => {
    if (typeof window !== 'undefined') {
      const { useNotificationStore } = require('@/store/notificationStore');
      useNotificationStore.getState().increment();
    }
  });

  return socket;
}

export function getSocket() { return socket; }

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
