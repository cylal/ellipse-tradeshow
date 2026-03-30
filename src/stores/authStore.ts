import { create } from "zustand";
import { api } from "../services/api";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (token: string, user: User) => {
    await api.setToken(token);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await api.clearToken();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
