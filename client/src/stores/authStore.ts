import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  email: string;
  targetTrack: string;
  level: string;
  mode: string;
  tier: string;
  masteryPercent: number;
  realityScore: number;
  trackRank: number;
  platformRank: number;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  setToken: (token) => {
    localStorage.setItem('accessToken', token);
    set({ accessToken: token });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null });
    window.location.href = '/login';
  },

  initialize: () => {
    const token = localStorage.getItem('accessToken');
    if (token) set({ accessToken: token });
    set({ isLoading: false });
  },
}));