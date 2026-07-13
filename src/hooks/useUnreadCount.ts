import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';

/**
 * useUnreadCount — the SINGLE hook consumed by Sidebar.tsx, AppBar.tsx and
 * notifications.tsx (D-10/D-12/D-13). One shared queryKey for all 3
 * consumers — never 3 divergent keys. The logged-out guard lives INSIDE
 * the hook (not left to the consumer) so polling never fires on public
 * screens (login/signup/invites) even if a future consumer forgets to gate
 * it itself (T-09-10).
 */
export function useUnreadCount() {
  const { user } = useAuthStore();

  return useQuery<number>({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      if (!res.ok) throw new Error('unread-count-error');
      const body = (await res.json()) as { count: number };
      return body.count;
    },
    enabled: !!user,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
