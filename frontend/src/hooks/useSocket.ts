// hooks/useSocket.ts
import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';

export function useSocket(event: string, handler: (...args: any[]) => void) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [event, handler]);
}
