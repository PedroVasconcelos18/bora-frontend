import type { NotificationType } from './notifications';
import type { PushCardState } from './push';

/**
 * push-preferences.ts — vocabulário e derivação de estado da seção "Notificações
 * push" em `profile.tsx` (Plano 12-06, `12-UI-SPEC.md`).
 *
 * Este arquivo é PURO de propósito: é a única coisa testável neste
 * repositório, que não tem jsdom nem testing-library (mesma convenção de
 * `push-state.test.ts`/`sao-paulo-day.test.ts`). Nada aqui lê `window`,
 * `navigator` ou qualquer API de permissão do navegador (a propriedade do
 * objeto global que expõe o estado de permissão de notificação) — o estado
 * de push chega pronto via `usePushSubscription().state`
 * (D12-09, Pitfall 6 do 12-RESEARCH.md); esta lib só decide, a partir dele
 * (mais o carregamento da própria consulta de preferências), qual dos 3
 * estados visuais a seção mostra.
 *
 * A ordem de `PUSH_PREFERENCE_ROWS` espelha exatamente a ordem de declaração
 * de `NotificationType` em `lib/notifications.ts` — esta lista e o painel de
 * notificações nunca podem discordar sobre ordenação.
 */

/** A forma que `GET /push/preferences` devolve e `POST /push/preferences` recebe. */
export interface PushPreference {
  type: NotificationType;
  enabled: boolean;
}

/** Um item da lista de 9 tipos exibida na seção de preferências. */
export interface PushPreferenceRow {
  type: NotificationType;
  label: string;
  description: string;
  caption?: string;
}

// Ordem = ordem de declaração de `NotificationType` em `lib/notifications.ts:20-29`.
export const PUSH_PREFERENCE_ROWS: readonly PushPreferenceRow[] = [
  {
    type: 'INVITE_RECEIVED',
    label: 'Convites pra desafio',
    description: 'Quando alguém te chama pra um desafio novo.',
  },
  {
    type: 'PAYMENT_CONFIRMED',
    label: 'Pagamento confirmado',
    description: 'Quando alguém do seu desafio paga a entrada.',
  },
  {
    type: 'EVIDENCE_SUBMITTED',
    label: 'Evidência pra votar',
    description: 'Quando alguém posta evidência nova, pronta pra você votar.',
    caption: 'Desligado por padrão — desafios grandes geram bastante notificação desse tipo.',
  },
  {
    type: 'EVIDENCE_VALIDATED',
    label: 'Evidência validada',
    description: 'Quando a turma valida a sua evidência do dia.',
  },
  {
    type: 'EVIDENCE_REMINDER',
    label: 'Lembrete de evidência',
    description: 'O lembrete das 18h pra postar sua evidência do dia.',
  },
  {
    type: 'CHALLENGE_FINALIZED',
    label: 'Desafio finalizado',
    description: 'Quando um desafio termina e sai o resultado.',
  },
  {
    type: 'CHALLENGE_CANCELLED',
    label: 'Desafio cancelado',
    description: 'Quando um desafio é cancelado e seu reembolso está a caminho.',
  },
  {
    type: 'CHALLENGE_ACTIVATED',
    label: 'Desafio começou',
    description: 'Quando todo mundo paga e o desafio entra no ar.',
  },
  {
    type: 'EVIDENCE_REJECTED',
    label: 'Evidência não validada',
    description: 'Quando a turma não valida a sua evidência do dia.',
  },
];

/**
 * PreferencesSectionState — os 3 estados visuais mutuamente exclusivos da
 * seção (`12-UI-SPEC.md` §Preferences Section — State Contract).
 */
export type PreferencesSectionState = 'loading' | 'blocked' | 'interactive';

export interface DerivePreferencesSectionStateInput {
  pushState: PushCardState;
  isPreferencesLoading: boolean;
}

/**
 * derivePreferencesSectionState — PURA, sem acesso a `window`/`navigator`.
 * Avaliada nesta ordem, porque a ordem é a decisão de produto:
 * 1. `pushState === 'reconciling'` ou `isPreferencesLoading` -> `'loading'`
 *    (nunca piscar um estado adivinhado, carregar tem precedência sobre
 *    bloquear);
 * 2. `pushState === 'denied'` ou `'unsupported'` -> `'blocked'`;
 * 3. qualquer outro caso -> `'interactive'`.
 */
export function derivePreferencesSectionState(
  input: DerivePreferencesSectionStateInput,
): PreferencesSectionState {
  if (input.pushState === 'reconciling' || input.isPreferencesLoading) return 'loading';
  if (input.pushState === 'denied' || input.pushState === 'unsupported') return 'blocked';
  return 'interactive';
}

/**
 * shouldShowInactiveHelper — verdadeiro para `'off'` e `'ios-not-installed'`,
 * os dois estados em que a pessoa pode ajustar preferência mas nenhum
 * device está inscrito ainda. Evita a leitura "nada do que eu faço aqui
 * funciona" que o desacoplamento entre preferência (por usuário) e
 * inscrição (por device) do D12-07 cria.
 */
export function shouldShowInactiveHelper(pushState: PushCardState): boolean {
  return pushState === 'off' || pushState === 'ios-not-installed';
}

export const PREFERENCES_TOAST_ERROR =
  'Não deu pra salvar essa preferência agora. Tenta de novo em instantes.';

/** Textos literais do §Copywriting Contract do 12-UI-SPEC.md para o estado Bloqueado. */
export const BLOCKED_COPY = {
  deniedHeading: '🔒 Bloqueado neste navegador',
  deniedBody:
    'Você bloqueou a notificação deste site em algum momento — nenhum interruptor abaixo liga sozinho enquanto isso não mudar. No Chrome do Android: toque no ícone à esquerda do endereço (🔒 ou ⓘ) → Permissões → Notificações → Permitir. Em outros navegadores, o mesmo ícone ao lado do endereço leva à mesma opção.',
  unsupportedHeading: 'Notificação push não é compatível com este navegador',
  unsupportedBody: 'Esse navegador não tem suporte a notificações push, então não tem o que ativar aqui.',
};
