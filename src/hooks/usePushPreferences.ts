import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';
import { showToast } from '../components/Toast';
import { PREFERENCES_TOAST_ERROR, type PushPreference } from '../lib/push-preferences';
import type { NotificationType } from '../lib/notifications';

const PREFERENCES_QUERY_KEY = ['push-preferences'];

/**
 * usePushPreferences — shaped after the sibling `usePushSubscription`
 * (`hooks/usePushSubscription.ts`): one shared query key, `enabled` gated on
 * the logged-in user INSIDE the hook so it never fires on a public route.
 *
 * A preferência é POR USUÁRIO (`(userId, type)`), diferente da inscrição de
 * `usePushSubscription`, que é POR DEVICE — os dois hooks nunca se escrevem.
 *
 * Todo estado de UI da mutação vem dos callbacks de OPÇÃO
 * (`onMutate`/`onError`/`onSuccess`/`onSettled`), nunca do snapshot
 * retornado pelo `useMutation`: sob StrictMode o observer se desanexa em
 * voo e o snapshot congela em `pending` pra sempre — mesma cilada já
 * documentada no docblock de `usePushSubscription`'s `isMutating`.
 */
export function usePushPreferences() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [pendingType, setPendingType] = useState<NotificationType | null>(null);

  const query = useQuery<PushPreference[]>({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get('/push/preferences');
      if (!res.ok) throw new Error('push-preferences-error');
      return res.json();
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async ({ type, enabled }: { type: NotificationType; enabled: boolean }) => {
      const res = await apiClient.post('/push/preferences', { type, enabled });
      if (!res.ok) throw new Error('push-preferences-mutation-error');
      return res.json() as Promise<PushPreference[]>;
    },
    onMutate: async ({ type, enabled }) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY });
      const previous = queryClient.getQueryData<PushPreference[]>(PREFERENCES_QUERY_KEY);
      queryClient.setQueryData<PushPreference[]>(PREFERENCES_QUERY_KEY, (current) =>
        (current ?? []).map((pref) => (pref.type === type ? { ...pref, enabled } : pref)),
      );
      setPendingType(type);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<PushPreference[]>(PREFERENCES_QUERY_KEY, context.previous);
      }
      showToast(PREFERENCES_TOAST_ERROR);
    },
    onSuccess: (data) => {
      // A resposta do POST já é a lista inteira atualizada — reconcilia sem round-trip extra.
      queryClient.setQueryData<PushPreference[]>(PREFERENCES_QUERY_KEY, data);
    },
    onSettled: () => {
      setPendingType(null);
      void queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY });
    },
  });

  return {
    preferences: query.data ?? [],
    isLoading: query.isPending,
    pendingType,
    setPreference: (type: NotificationType, enabled: boolean) => mutation.mutate({ type, enabled }),
  };
}
