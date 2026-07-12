// Auth store — Zustand minimal global state for the authenticated user.
// NEVER store JWT tokens here — they live in httpOnly cookies only (D-07).
// This store holds only the decoded user identity for UI rendering.
import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// AuthStatus: 'loading' until boot resolves to exactly one of setUser/clearUser
// (200 -> a user, 401 -> definitively nobody); 'ready' from then on. This flag
// is the single source of truth __root.tsx gates its render on (07-06 gap fix)
// — it means "the store reflects a settled auth decision", not "a fetch is
// in flight", so there is no separate setter for it: only setUser/clearUser
// can settle it.
export type AuthStatus = 'loading' | 'ready';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  setUser: (user) => set({ user, status: 'ready' }),
  clearUser: () => set({ user: null, status: 'ready' }),
}));
