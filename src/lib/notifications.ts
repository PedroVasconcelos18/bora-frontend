import { createElement, Fragment, type ReactNode } from 'react';

// NOTE: this module is `.ts` (not `.tsx`) per the plan's artifact list, so
// `renderCopy` below is built with `createElement` calls instead of JSX
// syntax (JSX literals require a `.tsx` file to parse).
function frag(...children: ReactNode[]): ReactNode {
  return createElement(Fragment, null, ...children);
}

function strong(value: ReactNode): ReactNode {
  return createElement('strong', null, value);
}

/**
 * notifications.ts — types, copy, deep-links, agrupamento por dia e tempo
 * relativo pro painel `/notifications` (NOTIF-04). Nenhuma lib de data nova
 * (Intl.RelativeTimeFormat cobre tudo, per 09-RESEARCH.md §Don't Hand-Roll).
 */

export type NotificationType =
  | 'INVITE_RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'EVIDENCE_SUBMITTED'
  | 'EVIDENCE_VALIDATED'
  | 'EVIDENCE_REMINDER'
  | 'CHALLENGE_FINALIZED'
  | 'CHALLENGE_CANCELLED'
  | 'CHALLENGE_ACTIVATED'
  | 'EVIDENCE_REJECTED';

export interface NotificationRow {
  id: string;
  type: NotificationType;
  entityId: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

// §Deep-links por tipo (09-UI-SPEC.md) — glifos exatos, não improvisados.
export const EMOJI_BY_TYPE: Record<NotificationType, string> = {
  INVITE_RECEIVED: '🏃',
  PAYMENT_CONFIRMED: '💸',
  EVIDENCE_SUBMITTED: '🗳️',
  EVIDENCE_VALIDATED: '✅',
  EVIDENCE_REMINDER: '📸',
  CHALLENGE_FINALIZED: '🏆',
  CHALLENGE_CANCELLED: '😕',
  CHALLENGE_ACTIVATED: '🚀',
  EVIDENCE_REJECTED: '❌',
};

// Todo card tem afordância de ação (D-09/D-11 — o card inteiro é clicável).
export const ACTION_LABEL_BY_TYPE: Record<NotificationType, string> = {
  INVITE_RECEIVED: 'ver convite →',
  PAYMENT_CONFIRMED: 'ver desafio →',
  EVIDENCE_SUBMITTED: 'votar agora →',
  EVIDENCE_VALIDATED: 'ver desafio →',
  EVIDENCE_REMINDER: 'postar agora →',
  CHALLENGE_FINALIZED: 'ver resultado →',
  CHALLENGE_CANCELLED: 'ver desafio →',
  CHALLENGE_ACTIVATED: 'ver desafio →',
  EVIDENCE_REJECTED: 'ver desafio →',
};

function pluralizePessoas(count: number): string {
  return count === 1 ? '1 pessoa' : `${count} pessoas`;
}

/**
 * renderCopy — a copy exata dos 9 tipos (§Copywriting Contract). Interpola
 * campos do payload dentro de <strong>, sempre via createElement/JSX puro
 * — nunca via a API de innerHTML bruto do React (T-09-11 — React escapa
 * texto por padrão, mesmo com nomes digitados por usuários).
 *
 * ⚠️ Tipo 3 (EVIDENCE_SUBMITTED): a copy é POR EVENTO ("{author} postou
 * evidência nova no {challenge}") — NÃO é a linha agregada "3 evidências
 * esperando seu voto" que o canvas desenha (essa pertence ao
 * PendenciasCard do dashboard, D-05/D-06).
 */
export function renderCopy(n: NotificationRow): ReactNode {
  const p = n.payload as Record<string, string | number | boolean | undefined>;

  switch (n.type) {
    case 'INVITE_RECEIVED':
      return frag(
        strong(p.inviterName),
        ' te convidou pro desafio ',
        strong(p.challengeTitle),
        ` — R$ ${p.amount} de colaboração`,
      );
    case 'PAYMENT_CONFIRMED': {
      const missingCount = Number(p.missingCount ?? 0);
      return frag(
        'Pagamento de ',
        strong(p.payerName),
        ' confirmado no ',
        strong(p.challengeTitle),
        ` — falta ${pluralizePessoas(missingCount)}`,
      );
    }
    case 'EVIDENCE_SUBMITTED':
      return frag(
        strong(p.authorName),
        ' postou evidência nova no ',
        strong(p.challengeTitle),
      );
    case 'EVIDENCE_VALIDATED':
      return frag(
        'Sua evidência de ',
        strong(p.weekdayLabel),
        ' foi ',
        strong('validada pela turma'),
        ` — ${p.totalValidatedDays} dias no total 💪`,
      );
    case 'EVIDENCE_REMINDER':
      return frag('Falta a sua evidência de hoje no ', strong(p.challengeTitle));
    case 'CHALLENGE_FINALIZED':
      if (p.isCurrentUserWinner) {
        return frag(
          strong(p.challengeTitle),
          ` terminou — você levou o prêmio de R$ ${p.prizeAmount}! 🎉`,
        );
      }
      return frag(
        strong(p.challengeTitle),
        ` terminou — ${p.winnerName} levou o prêmio de R$ ${p.prizeAmount}`,
      );
    case 'CHALLENGE_CANCELLED':
      return frag(strong(p.challengeTitle), ' foi cancelado — seu reembolso está a caminho');
    case 'CHALLENGE_ACTIVATED':
      return frag(
        strong(p.challengeTitle),
        ' começou! Bora postar a primeira evidência 🚀',
      );
    case 'EVIDENCE_REJECTED':
      return frag(
        'Sua evidência de ',
        strong(p.weekdayLabel),
        ' não foi validada pela turma — bora tentar de novo amanhã',
      );
  }
}

interface DeepLinkTarget {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}

/**
 * buildDeepLink — tabela §Deep-links por tipo. `challengeId` vem SEMPRE de
 * `payload.challengeId` (o `entityId` NÃO é o challengeId na maioria dos
 * tipos — é paymentId/evidenceId/token), exceto o tipo 1, cujo `entityId`
 * já É o token do convite.
 */
export function buildDeepLink(n: NotificationRow): DeepLinkTarget {
  if (n.type === 'INVITE_RECEIVED') {
    return { to: '/invites/$token', params: { token: n.entityId } };
  }

  const challengeId = String((n.payload as Record<string, unknown>).challengeId ?? '');

  if (n.type === 'EVIDENCE_SUBMITTED') {
    return { to: '/challenges/$challengeId', params: { challengeId }, search: { panel: 'votar' } };
  }

  if (n.type === 'CHALLENGE_FINALIZED') {
    return {
      to: '/challenges/$challengeId',
      params: { challengeId },
      search: { panel: 'ranking' },
    };
  }

  return { to: '/challenges/$challengeId', params: { challengeId } };
}

const RTF = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/**
 * formatRelativeTime — Intl.RelativeTimeFormat, sem lib de data nova.
 * Bucket "Hoje": "há X min" / "há Xh". Outros buckets: "{rótulo do dia em
 * minúsculo} às HH:MM".
 */
export function formatRelativeTime(createdAt: string, dayLabel: string): string {
  const created = new Date(createdAt);

  if (dayLabel === 'Hoje') {
    const diffMs = Date.now() - created.getTime();
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin < 60) {
      return RTF.format(-diffMin, 'minute');
    }
    const diffHours = Math.round(diffMin / 60);
    return RTF.format(-diffHours, 'hour');
  }

  const time = created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dayLabel.toLowerCase()} às ${time}`;
}

const SAO_PAULO_TZ = 'America/Sao_Paulo';
const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

/** Returns the calendar day (YYYY-MM-DD) of `date` in America/Sao_Paulo. */
function saoPauloDayKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: SAO_PAULO_TZ }); // en-CA -> YYYY-MM-DD
}

function daysBetween(dayKeyA: string, dayKeyB: string): number {
  const a = new Date(`${dayKeyA}T00:00:00Z`).getTime();
  const b = new Date(`${dayKeyB}T00:00:00Z`).getTime();
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

function dayLabelFor(createdAt: string, todayKey: string): string {
  const dayKey = saoPauloDayKey(new Date(createdAt));
  const diff = daysBetween(todayKey, dayKey);

  if (diff === 0) return 'Hoje';
  if (diff === -1) return 'Ontem';
  if (diff >= -6) {
    const weekday = new Date(`${dayKey}T12:00:00Z`).toLocaleDateString('en-US', {
      timeZone: SAO_PAULO_TZ,
      weekday: 'long',
    });
    const index = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ].indexOf(weekday);
    return WEEKDAY_LABELS[index] ?? dayKey;
  }
  const [, month, day] = dayKey.split('-');
  return `${day}/${month}`;
}

export interface NotificationDayGroup {
  label: string;
  items: NotificationRow[];
}

/**
 * groupByDay — agrupa por dia em America/Sao_Paulo, ordem decrescente
 * (mais recente primeiro). Puramente organizacional — NÃO é proxy de
 * estado de leitura (cada item mantém seu próprio `readAt`).
 */
export function groupByDay(rows: NotificationRow[]): NotificationDayGroup[] {
  const todayKey = saoPauloDayKey(new Date());
  const groups: NotificationDayGroup[] = [];

  for (const row of rows) {
    const label = dayLabelFor(row.createdAt, todayKey);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(row);
    } else {
      groups.push({ label, items: [row] });
    }
  }

  return groups;
}
