import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "./mock-data";
import { useData } from "./data-store";
import { HARDCODED_ACCOUNTS } from "./accounts";

export { HARDCODED_ACCOUNTS };

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => { ok: true; role: Role } | { ok: false; error: string };
  setUserFromId: (id: string) => void;
  setUser: (u: User) => void;
  register: (data: { name: string; email: string; password: string }) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (email, password) => {
        const e = email.trim().toLowerCase();
        const acc = HARDCODED_ACCOUNTS.find((a) => a.email.toLowerCase() === e && a.password === password);
        if (acc) {
          const { password: _pw, ...u } = acc;
          set({ user: u });
          return { ok: true, role: u.role };
        }
        const created = useData
          .getState()
          .users.find((u) => u.email.toLowerCase() === e && (u.password ?? "") === password);
        if (created) {
          if (created.status === "inactive") return { ok: false, error: "Account is inactive. Contact admin." };
          const { password: _pw, ...u } = created;
          set({ user: u });
          return { ok: true, role: u.role };
        }
        return { ok: false, error: "Invalid email or password." };
      },
      setUserFromId: (id) => {
        const acc = HARDCODED_ACCOUNTS.find((a) => a.id === id);
        if (acc) { const { password: _pw, ...u } = acc; set({ user: u }); return; }
        const u = useData.getState().users.find((x) => x.id === id);
        if (u) { const { password: _pw, ...rest } = u; set({ user: rest }); }
      },
      setUser: (u) => set({ user: u }),
      register: ({ name, email, password }) => {
        const e = email.trim().toLowerCase();
        if (!name.trim()) return { ok: false, error: "Name is required." };
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, error: "Enter a valid email." };
        if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
        const exists =
          HARDCODED_ACCOUNTS.some((a) => a.email.toLowerCase() === e) ||
          useData.getState().users.some((u) => u.email.toLowerCase() === e);
        if (exists) return { ok: false, error: "An account with that email already exists." };
        const id = `u-${Date.now().toString(36)}`;
        const newUser: User = {
          id, name: name.trim(), email: e, password,
          role: "student", status: "active",
          joinedAt: new Date().toISOString().slice(0, 10),
          courseIds: [],
        };
        useData.getState().addUserRaw(newUser);
        const { password: _pw, ...rest } = newUser;
        set({ user: rest });
        return { ok: true };
      },
      logout: () => set({ user: null }),
    }),
    { name: "itech-auth-v2" },
  ),
);
