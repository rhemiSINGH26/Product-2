import { create } from "zustand";
import type { User, Role } from "./mock-data";
import { login as apiLogin, register as apiRegister, logout as apiLogout, getSession } from "./api/client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  register: (data: { name: string; email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>;
  setUser: (u: User) => void;
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiLogin({ email, password });

      if (response.ok) {
        set({
          user: response.user as User,
          isLoading: false,
        });
        return { ok: true, role: response.user.role as Role };
      }

      throw new Error(response.error || "Login failed");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      set({ error: errorMsg, isLoading: false });
      return { ok: false, error: errorMsg };
    }
  },

  register: async ({ name, email, password }) => {
    try {
      set({ isLoading: true, error: null });

      if (!name.trim()) {
        throw new Error("Name is required.");
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error("Enter a valid email.");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      const response = await apiRegister({ name, email, password });

      if (response.ok) {
        set({
          user: response.user as User,
          isLoading: false,
        });
        return { ok: true };
      }

      throw new Error(response.error || "Registration failed");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Registration failed";
      set({ error: errorMsg, isLoading: false });
      return { ok: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await apiLogout();
      set({ user: null, isLoading: false });
    } catch (err) {
      console.error("Logout error:", err);
      set({ user: null, isLoading: false });
    }
  },

  initializeSession: async () => {
    try {
      set({ isLoading: true, error: null });
      const session = await getSession();
      if (session.ok && session.user) {
        set({ user: session.user as User, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (err) {
      set({ user: null, isLoading: false });
    }
  },

  setUser: (u) => set({ user: u }),
}));
