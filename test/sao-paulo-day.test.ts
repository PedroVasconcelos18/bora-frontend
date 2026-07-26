/**
 * sao-paulo-day.test.ts — DOM-free vitest para lib/sao-paulo-day.ts.
 *
 * Trava a regressão achada na validação de 26/07: `startsAt` chegava como
 * meia-noite UTC e as telas formatavam/contavam no fuso do device, mostrando a
 * véspera; e o header "Dia X de Y" usava blocos de 24h corridas, discordando da
 * grade do ranking (dia-calendário SP). Estes testes fixam a regra única.
 */

import { describe, it, expect } from 'vitest';
import {
  saoPauloDay,
  formatSaoPauloShortDate,
  saoPauloDaysBetween,
  challengeDayNumber,
  challengeDayDates,
} from '../src/lib/sao-paulo-day';

describe('saoPauloDay', () => {
  it('resolve um instante pro dia-calendário de SP (UTC-3)', () => {
    expect(saoPauloDay(new Date('2026-07-19T02:30:00.000Z'))).toBe('2026-07-18');
  });

  it('meia-noite SP (03:00Z) já é o próprio dia', () => {
    expect(saoPauloDay(new Date('2026-07-29T03:00:00.000Z'))).toBe('2026-07-29');
  });
});

describe('formatSaoPauloShortDate', () => {
  it('formata no fuso de SP, não no do device', () => {
    // O bug: startsAt 29/07 00:00 SP renderizado como 28/07 em qualquer device
    // cujo fuso ficasse atrás de SP naquele instante.
    expect(formatSaoPauloShortDate(new Date('2026-07-29T03:00:00.000Z'))).toBe('29/07');
  });

  it('não vira o dia por causa da hora da noite', () => {
    expect(formatSaoPauloShortDate(new Date('2026-07-30T02:00:00.000Z'))).toBe('29/07');
  });
});

describe('saoPauloDaysBetween', () => {
  it('conta viradas de dia, não períodos de 24h', () => {
    const noite = new Date('2026-07-26T01:00:00.000Z'); // 25/07 22:00 SP
    const manha = new Date('2026-07-26T13:00:00.000Z'); // 26/07 10:00 SP
    expect(saoPauloDaysBetween(noite, manha)).toBe(1);
  });

  it('mesmo dia SP é 0 mesmo com muitas horas de diferença', () => {
    const cedo = new Date('2026-07-26T09:00:00.000Z'); // 26/07 06:00 SP
    const tarde = new Date('2026-07-27T00:00:00.000Z'); // 26/07 21:00 SP
    expect(saoPauloDaysBetween(cedo, tarde)).toBe(0);
  });
});

describe('challengeDayNumber', () => {
  const startsAt = new Date('2026-07-25T03:00:00.000Z'); // 25/07 00:00 SP

  it('o dia do início é o dia 1', () => {
    expect(challengeDayNumber(startsAt, 30, new Date('2026-07-25T15:00:00.000Z'))).toBe(1);
  });

  it('o dia seguinte é o dia 2 — a regressão que dizia "Dia 2" quando a grade dizia 3', () => {
    // 26/07 02:38 SP. A conta antiga (floor(elapsed/24h)+1) dava 2 porque só
    // 29h haviam passado; a grade do ranking já estava no terceiro dia porque
    // o dia 1 tinha caído em 24/07. Com startsAt corrigido + contagem por
    // dia-calendário, ambos dizem 2.
    expect(challengeDayNumber(startsAt, 30, new Date('2026-07-26T05:38:00.000Z'))).toBe(2);
  });

  it('nunca passa da duração nem desce abaixo de 1', () => {
    expect(challengeDayNumber(startsAt, 30, new Date('2026-12-01T12:00:00.000Z'))).toBe(30);
    expect(challengeDayNumber(startsAt, 30, new Date('2026-07-20T12:00:00.000Z'))).toBe(1);
  });
});

describe('challengeDayDates', () => {
  it('produz um instante por dia, começando no início', () => {
    const dates = challengeDayDates(new Date('2026-07-25T03:00:00.000Z'), 3);
    expect(dates.map((d) => saoPauloDay(d))).toEqual(['2026-07-25', '2026-07-26', '2026-07-27']);
  });
});
