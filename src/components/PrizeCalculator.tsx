import { parseInvitees, computePrize, PLATFORM_FEE } from '../lib/prize';

/**
 * PrizeCalculator — live prize preview following referencia.html .summary.
 *
 * Formula (D-12, CHAL-02): max(0, (invitees + 1) × collab − R$ 10)
 * Pure client-side math — NO fetch/apiClient call.
 * Updates on every input event; clamped to R$ 0 minimum.
 *
 * Parse + formula live in src/lib/prize.ts — the same module ChallengePreview
 * consumes, so the two can no longer drift apart (UAT gap 6).
 */

interface PrizeCalculatorProps {
  emailsText: string;   // raw textarea value
  collabAmount: number; // collaboration amount per person
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function PrizeCalculator({ emailsText, collabAmount }: PrizeCalculatorProps) {
  const emails = parseInvitees(emailsText);

  const invitees = emails.length;
  const totalParticipants = invitees + 1; // +1 for creator
  const platformFee = PLATFORM_FEE;
  const estimatedPrize = computePrize(totalParticipants, collabAmount, platformFee);

  return (
    <div
      style={{
        background: 'var(--mint)',
        borderRadius: 14,
        padding: 15,
        margin: '4px 0 18px',
        fontSize: '0.9rem',
        color: 'var(--green-ink)',
      }}
    >
      {/* Participantes */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 0',
        }}
      >
        <span>Participantes (você + {invitees} convidados)</span>
        <b style={{ fontFamily: '"Baloo 2", system-ui, sans-serif' }}>
          {totalParticipants}
        </b>
      </div>

      {/* Colaboração de cada um */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 0',
        }}
      >
        <span>Colaboração de cada um</span>
        <b style={{ fontFamily: '"Baloo 2", system-ui, sans-serif' }}>
          {formatBRL(collabAmount)}
        </b>
      </div>

      {/* Taxa do Bora */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '3px 0',
        }}
      >
        <span>Taxa do Bora</span>
        <b style={{ fontFamily: '"Baloo 2", system-ui, sans-serif' }}>
          − {formatBRL(platformFee)}
        </b>
      </div>

      {/* Prêmio estimado (total row) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 0 3px',
          marginTop: 6,
          borderTop: '1px dashed var(--mint-deep)',
          fontWeight: 800,
        }}
      >
        <span>Prêmio estimado</span>
        <b style={{ fontFamily: '"Baloo 2", system-ui, sans-serif' }}>
          {formatBRL(estimatedPrize)}
        </b>
      </div>
    </div>
  );
}
