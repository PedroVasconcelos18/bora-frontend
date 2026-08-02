import { saoPauloDaysBetween, formatSaoPauloShortDate, formatSaoPauloClockTime } from './sao-paulo-day';

/**
 * waiting-deadline.ts — pure derivation for the WAITING-room "prazo" copy in
 * `routes/challenges/$challengeId.tsx` (quick 260802-mjb).
 *
 * THE BUG THIS REPLACES: the old inline `formatPayDeadline` compared
 * `daysLeft <= 0` for the `startsAt` branch. `saoPauloDaysBetween` returns a
 * NEGATIVE number once `startsAt` is in the past, and negative fell into the
 * same `<= 0` bucket as "today" — so a challenge whose start date had passed
 * DAYS ago still rendered "O desafio começa hoje". This module makes that
 * comparison a strict `=== 0` and adds the missing past-due branch, plus the
 * information the WAITING screen never gave in that state: how much the
 * viewer already paid and when the automatic cancellation happens.
 *
 * THE RESOLUTION INSTANT — `challengeResolvesAt` = `max(deadline, startsAt)`.
 * This mirrors backend behaviour across THREE files, on purpose duplicated
 * here only at the `max` — never the 3-day window itself:
 *
 * 1. `bora-backend/src/participants/participants.service.ts:165-167` already
 *    materialises `deadline` as `challenge.createdAt + PAYMENT_WINDOW_DAYS`
 *    (3 days) and returns it on the waiting-room endpoint. The `3` never
 *    lives in this file — the frontend only ever sees the computed date.
 * 2. `bora-backend/src/payments/payments.service.ts:767-769` — inside
 *    `processDeadline`, the deadline-cancel cron does NOT cancel while
 *    `challenge.startsAt` is still in the future; resolution is deferred to
 *    `startsAt`. That deferral is the one rule this file re-implements, as
 *    `Math.max(deadline, startsAt)`, over the two fields the same
 *    waiting-room response already returns side by side.
 * 3. `bora-backend/src/scheduler/deadline-cancel.job.ts` sweeps WAITING
 *    challenges past their resolution instant every 15 minutes (`@Cron('*\/15
 *    * * * *')`). The real cancellation happens on the job's next pass after
 *    the instant below, not at the instant itself — which is why the copy
 *    below always says "até" and never promises the exact minute.
 *
 * Nothing here touches `window`/`navigator`. `now` is always passed in by
 * the caller — see `test/waiting-deadline.test.ts` for the production entry
 * (challenge `c167d738-cbf0-4dc8-badd-13dc52f62a49`) this file is locked
 * against.
 */

/** O mais tarde entre `deadline` e `startsAt` — sem `startsAt`, o próprio deadline. */
export function challengeResolvesAt(deadlineIso: string, startsAtIso?: string | null): Date {
  const deadline = new Date(deadlineIso);
  if (!startsAtIso) return deadline;
  const startsAt = new Date(startsAtIso);
  return startsAt.getTime() > deadline.getTime() ? startsAt : deadline;
}

export interface WaitingDeadlineInput {
  deadlineIso: string;
  startsAtIso?: string | null;
  /** Já formatado pelo chamador (via `formatBRL`) — esta lib não formata moeda. */
  paidAmountLabel?: string | null;
  now?: Date;
}

export interface WaitingDeadlineCopy {
  headline: string;
  detail: string;
}

export function formatWaitingDeadline(input: WaitingDeadlineInput): WaitingDeadlineCopy {
  const now = input.now ?? new Date();
  const { deadlineIso, startsAtIso, paidAmountLabel } = input;

  let headline: string;
  let isPastDue: boolean;

  if (startsAtIso) {
    const startsAt = new Date(startsAtIso);
    const dateLabel = formatSaoPauloShortDate(startsAt);
    const d = saoPauloDaysBetween(now, startsAt);
    isPastDue = d < 0;
    if (d < 0) {
      headline = `A data de início (${dateLabel}) já passou e a turma não fechou.`;
    } else if (d === 0) {
      headline = `O desafio começa hoje (${dateLabel}).`;
    } else if (d === 1) {
      headline = `Falta 1 dia pro desafio começar (${dateLabel}).`;
    } else {
      headline = `Faltam ${d} dias pro desafio começar (${dateLabel}).`;
    }
  } else {
    const deadline = new Date(deadlineIso);
    const dateLabel = formatSaoPauloShortDate(deadline);
    const d = saoPauloDaysBetween(now, deadline);
    isPastDue = d <= 0;
    if (d <= 0) {
      headline = `O prazo pra todo mundo pagar terminou (${dateLabel}).`;
    } else if (d === 1) {
      headline = `Falta 1 dia pra todo mundo pagar (até ${dateLabel}).`;
    } else {
      headline = `Faltam ${d} dias pra todo mundo pagar (até ${dateLabel}).`;
    }
  }

  if (!isPastDue) {
    return {
      headline,
      detail: 'Os dias do desafio só começam a contar quando todo mundo pagar.',
    };
  }

  const resolvesAt = challengeResolvesAt(deadlineIso, startsAtIso);
  const dataR = formatSaoPauloShortDate(resolvesAt);
  const horaR = formatSaoPauloClockTime(resolvesAt);
  const hasPaid = !!paidAmountLabel;
  const notYetResolved = resolvesAt.getTime() > now.getTime();

  let detail: string;
  if (notYetResolved && hasPaid) {
    detail = `Você já pagou ${paidAmountLabel}. Se a turma não fechar até ${dataR} às ${horaR}, o desafio é cancelado automaticamente e o valor entra na fila de reembolso, de volta pra sua chave Pix.`;
  } else if (notYetResolved && !hasPaid) {
    detail = `Se a turma não fechar até ${dataR} às ${horaR}, o desafio é cancelado automaticamente.`;
  } else if (!notYetResolved && hasPaid) {
    detail = `Você já pagou ${paidAmountLabel}. O cancelamento automático já deve estar acontecendo — o valor entra na fila de reembolso e volta pra sua chave Pix.`;
  } else {
    detail = 'O cancelamento automático do desafio já deve estar acontecendo.';
  }

  return { headline, detail };
}
