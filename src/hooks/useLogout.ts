import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';

/**
 * useLogout — the single logout authority (07-06).
 *
 * WHY THIS EXISTS:
 *   Three identical logout handlers previously existed (profile.tsx,
 *   Sidebar.tsx, AppBar.tsx), none of which touched the ['auth-me'] query
 *   cache — logging out left a dead 200 user cached, which the (now-fixed)
 *   root guard/hydration split would otherwise resurrect on the next
 *   navigation (UAT gap 2). Centralizing here means the cache is reset
 *   exactly once, everywhere.
 *
 * queryClient.clear() (not a targeted removeQueries on ['auth-me']) is used
 * deliberately: on logout the previous user's ['challenges']/['profile-stats']
 * entries must not survive into the next session in the same tab (T-07-G02).
 *
 * The explicit navigate to /login stays for immediacy even though root's
 * guard effect will already redirect on the `user` transition — it is
 * idempotent with that redirect.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const { clearUser } = useAuthStore();
  const navigate = useNavigate();

  return async () => {
    try {
      await apiClient.delete('/auth/logout');
    } catch {
      // ignore — client state is cleared regardless
    }
    clearUser();
    queryClient.clear();
    void navigate({ to: '/login' });
  };
}
