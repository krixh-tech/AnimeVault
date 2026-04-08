// lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { useAuthStore } = await import('@/store/authStore');
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');
        const resp = await axios.post(`${original.baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRT } = resp.data.data;
        const { setAuth, user } = useAuthStore.getState();
        setAuth(user!, accessToken, newRT);
        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        const { useAuthStore } = await import('@/store/authStore');
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(err);
  }
);
