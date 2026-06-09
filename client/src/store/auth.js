import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setTokens: (accessToken, refreshToken, user) => {
        set({ accessToken, refreshToken, user });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },

      isAuthenticated: () => {
        const state = useAuthStore.getState();
        return !!state.accessToken;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
