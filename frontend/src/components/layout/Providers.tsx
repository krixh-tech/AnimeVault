'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { initSocket } from '@/lib/socket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  const socketInitialized = useRef(false);

  useEffect(() => {
    if (token && !socketInitialized.current) {
      initSocket(token);
      socketInitialized.current = true;
    }
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
