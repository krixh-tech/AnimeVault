// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  avatar?: string;
  preferences?: any;
  isVerified?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      setAuth: (user, token, refreshToken) => {
        set({ user, token, refreshToken });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
      logout: () => {
        set({ user: null, token: null, refreshToken: null });
        delete api.defaults.headers.common['Authorization'];
      },
      updateUser: (updates) => set(state => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
    }),
    {
      name: 'animavault-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);
