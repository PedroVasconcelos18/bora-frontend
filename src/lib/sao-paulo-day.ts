/**
 * Dias de calendário em America/Sao_Paulo — espelho do
 * `bora-backend/src/common/utils/sao-paulo-day.util.ts`.
 *
 * Por que existe: as telas de desafio contavam dias de três jeitos diferentes —
 * `toLocaleDateString` no fuso do device (mostrava a véspera pra quem estava em
 * SP, já que `startsAt` chegava em meia-noite UTC) e blocos de 24h corridas pro
 * header "Dia X de Y" (que discordava da grade do ranking, derivada por
 * dia-calendário SP no servidor). Com um único helper, countdown, header, grade
 * e lista de dias concordam sobre qual dia é o dia 1.
 */

const SP_TIME_ZONE = 'America/Sao_Paulo';

const SP_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: SP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const SP_SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SP_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
});

const SP_CLOCK_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

/** Dia-calendário SP de um instante, como 'YYYY-MM-DD'. */
export function saoPauloDay(date: Date = new Date()): string {
  return SP_DAY_FORMATTER.format(date);
}

/** 'DD/MM' no fuso de SP — correto mesmo num device fora do fuso. */
export function formatSaoPauloShortDate(date: Date): string {
  return SP_SHORT_DATE_FORMATTER.format(date);
}

/** 'HH:MM' no fuso de SP — não no do device. */
export function formatSaoPauloClockTime(date: Date): string {
  return SP_CLOCK_TIME_FORMATTER.format(date);
}

/**
 * Diferença em dias de calendário SP (`to − from`), ignorando a hora.
 * 25/07 23:00 → 26/07 01:00 é 1, não 0.
 */
export function saoPauloDaysBetween(from: Date, to: Date): number {
  const fromDay = Date.parse(`${saoPauloDay(from)}T00:00:00.000Z`);
  const toDay = Date.parse(`${saoPauloDay(to)}T00:00:00.000Z`);
  return Math.round((toDay - fromDay) / 86_400_000);
}

/**
 * Número do dia do desafio (1-based), com a MESMA regra do `ranking.service`:
 * dia 1 é o dia-calendário SP de `startsAt`. Fica preso entre 1 e `durationDays`.
 */
export function challengeDayNumber(startsAt: Date, durationDays: number, now: Date = new Date()): number {
  const elapsed = saoPauloDaysBetween(startsAt, now) + 1;
  return Math.min(durationDays, Math.max(1, elapsed));
}

/** Instante de cada dia do desafio, na ordem — dia 1 = `startsAt`. */
export function challengeDayDates(startsAt: Date, durationDays: number): Date[] {
  return Array.from(
    { length: durationDays },
    (_, i) => new Date(startsAt.getTime() + i * 86_400_000),
  );
}
