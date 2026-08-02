/**
 * waiting-deadline.test.ts — DOM-free vitest para lib/waiting-deadline.ts.
 *
 * Trava a regressão da quick 260802-mjb: `saoPauloDaysBetween` devolve
 * NEGATIVO para uma data de início já passada, e o helper antigo tratava
 * qualquer negativo como "hoje" (`daysLeft <= 0`). O primeiro describe
 * abaixo é o caso de produção — o desafio `c167d738-cbf0-4dc8-badd-13dc52f62a49`,
 * cujo `startsAt` (30/07) já tinha passado quatro dias e a tela ainda dizia
 * "O desafio começa hoje (30/07)". A resolução correta pra esse par
 * deadline/startsAt é 02/08 às 17:05 (horário de SP) — exatamente o que a
 * produção fez ao cancelar automaticamente.
 */

import { describe, it, expect } from 'vitest';
import { challengeResolvesAt, formatWaitingDeadline } from '../src/lib/waiting-deadline';

describe('challengeResolvesAt', () => {
  it('entrada real de produção (desafio c167d738): deadline vence depois do startsAt, resolve em 02/08 17:05 SP', () => {
    const resolvesAt = challengeResolvesAt(
      '2026-08-02T20:05:52.664Z',
      '2026-07-30T03:00:00.000Z',
    );
    expect(resolvesAt).toEqual(new Date('2026-08-02T20:05:52.664Z'));
  });

  it('startsAt depois do deadline devolve o startsAt (adiamento do processDeadline)', () => {
    const resolvesAt = challengeResolvesAt(
      '2026-08-02T20:05:52.664Z',
      '2026-08-10T03:00:00.000Z',
    );
    expect(resolvesAt).toEqual(new Date('2026-08-10T03:00:00.000Z'));
  });

  it('sem startsAt devolve o próprio deadline', () => {
    const resolvesAt = challengeResolvesAt('2026-08-02T20:05:52.664Z', null);
    expect(resolvesAt).toEqual(new Date('2026-08-02T20:05:52.664Z'));
  });
});

describe('formatWaitingDeadline — headline', () => {
  it('startsAt 3 dias no passado devolve a frase de data vencida (o defeito 1 consertado)', () => {
    const { headline } = formatWaitingDeadline({
      deadlineIso: '2026-08-10T00:00:00.000Z',
      startsAtIso: '2026-07-30T03:00:00.000Z', // 30/07 00:00 SP
      now: new Date('2026-08-02T15:00:00.000Z'), // 02/08 12:00 SP
    });
    expect(headline).toBe('A data de início (30/07) já passou e a turma não fechou.');
  });

  it('startsAt no mesmo dia-calendário SP de agora devolve a frase de "hoje"', () => {
    const { headline } = formatWaitingDeadline({
      deadlineIso: '2026-08-10T00:00:00.000Z',
      startsAtIso: '2026-08-02T03:00:00.000Z', // 02/08 00:00 SP
      now: new Date('2026-08-02T15:00:00.000Z'), // 02/08 12:00 SP
    });
    expect(headline).toBe('O desafio começa hoje (02/08).');
  });

  it('startsAt amanhã devolve "Falta 1 dia..."', () => {
    const { headline } = formatWaitingDeadline({
      deadlineIso: '2026-08-10T00:00:00.000Z',
      startsAtIso: '2026-08-03T03:00:00.000Z',
      now: new Date('2026-08-02T15:00:00.000Z'),
    });
    expect(headline).toBe('Falta 1 dia pro desafio começar (03/08).');
  });

  it('startsAt daqui a 3 dias devolve "Faltam 3 dias..."', () => {
    const { headline } = formatWaitingDeadline({
      deadlineIso: '2026-08-10T00:00:00.000Z',
      startsAtIso: '2026-08-05T03:00:00.000Z',
      now: new Date('2026-08-02T15:00:00.000Z'),
    });
    expect(headline).toBe('Faltam 3 dias pro desafio começar (05/08).');
  });
});

describe('formatWaitingDeadline — detail', () => {
  it('sem data vencida devolve a frase atual sobre quando os dias começam a contar', () => {
    const { detail } = formatWaitingDeadline({
      deadlineIso: '2026-08-10T00:00:00.000Z',
      startsAtIso: '2026-08-03T03:00:00.000Z',
      now: new Date('2026-08-02T15:00:00.000Z'),
    });
    expect(detail).toBe('Os dias do desafio só começam a contar quando todo mundo pagar.');
  });

  it('data vencida + resolução no futuro + pago devolve a frase com valor, data, hora e fila de reembolso', () => {
    const { detail } = formatWaitingDeadline({
      deadlineIso: '2026-08-05T20:00:00.000Z', // 05/08 17:00 SP
      startsAtIso: '2026-07-30T03:00:00.000Z', // 30/07 00:00 SP — já passou
      paidAmountLabel: 'R$ 10,00',
      now: new Date('2026-08-02T15:00:00.000Z'), // antes do deadline
    });
    expect(detail).toBe(
      'Você já pagou R$ 10,00. Se a turma não fechar até 05/08 às 17:00, o desafio é cancelado automaticamente e o valor entra na fila de reembolso, de volta pra sua chave Pix.',
    );
  });

  it('data vencida + resolução no futuro + sem pagamento devolve só a frase do cancelamento', () => {
    const { detail } = formatWaitingDeadline({
      deadlineIso: '2026-08-05T20:00:00.000Z',
      startsAtIso: '2026-07-30T03:00:00.000Z',
      now: new Date('2026-08-02T15:00:00.000Z'),
    });
    expect(detail).toBe(
      'Se a turma não fechar até 05/08 às 17:00, o desafio é cancelado automaticamente.',
    );
  });

  it('data vencida + resolução já passada + pago devolve a frase de "já deve estar acontecendo" com reembolso', () => {
    const { detail } = formatWaitingDeadline({
      deadlineIso: '2026-07-30T20:00:00.000Z',
      startsAtIso: '2026-07-28T03:00:00.000Z',
      paidAmountLabel: 'R$ 10,00',
      now: new Date('2026-08-02T15:00:00.000Z'), // depois de deadline e startsAt
    });
    expect(detail).toBe(
      'Você já pagou R$ 10,00. O cancelamento automático já deve estar acontecendo — o valor entra na fila de reembolso e volta pra sua chave Pix.',
    );
  });

  it('data vencida + resolução já passada + sem pagamento devolve só a frase do cancelamento em curso', () => {
    const { detail } = formatWaitingDeadline({
      deadlineIso: '2026-07-30T20:00:00.000Z',
      startsAtIso: '2026-07-28T03:00:00.000Z',
      now: new Date('2026-08-02T15:00:00.000Z'),
    });
    expect(detail).toBe('O cancelamento automático do desafio já deve estar acontecendo.');
  });

  it('entrada real de produção (desafio c167d738): data vencida + resolução no futuro (02/08 17:05) + pago', () => {
    const { headline, detail } = formatWaitingDeadline({
      deadlineIso: '2026-08-02T20:05:52.664Z',
      startsAtIso: '2026-07-30T03:00:00.000Z',
      paidAmountLabel: 'R$ 10,00',
      now: new Date('2026-08-02T15:00:00.000Z'), // antes da resolução (17:05 SP)
    });
    expect(headline).toBe('A data de início (30/07) já passou e a turma não fechou.');
    expect(detail).toBe(
      'Você já pagou R$ 10,00. Se a turma não fechar até 02/08 às 17:05, o desafio é cancelado automaticamente e o valor entra na fila de reembolso, de volta pra sua chave Pix.',
    );
  });
});
