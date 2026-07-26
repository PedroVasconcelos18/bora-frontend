import React from 'react';
import { EvidenceStatusBadge, type EvidenceStatus } from './EvidenceStatusBadge';

const R2_PUBLIC_BASE_URL: string = import.meta.env.VITE_R2_PUBLIC_BASE_URL ?? '';

export type VoteValue = 'SIM' | 'NAO';

export interface VoteCardEvidence {
  id: string;
  authorName: string;
  objectKey: string;
  windowClosesAt: string;
  /**
   * Instante real da postagem, vindo do backend. Antes o card derivava isso de
   * `windowClosesAt − 24h`; quando a janela passou a fechar às 23:59 do próprio
   * dia (item G), a conta virou ficção — evidência postada há 1 minuto aparecia
   * como "postou há 3h".
   */
  postedAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  hasVoted: boolean;
  /** Item I: como o próprio usuário votou (verde=SIM / coral=NAO). */
  myVote: VoteValue | null;
}

interface VoteCardProps {
  evidence: VoteCardEvidence;
  isVoting: boolean;
  onVote: (value: VoteValue) => void;
}

function evidenceStatusToBadge(status: VoteCardEvidence['status']): EvidenceStatus {
  return status === 'PENDING' ? 'SENT' : status;
}

/**
 * "postou há Xmin/Xh" a partir do instante real de postagem. Exportada pra ser
 * testável — a versão anterior chutava o horário e errava por horas.
 */
export function formatPostedMeta(postedAt: string, now: number = Date.now()): string {
  const elapsedMs = now - new Date(postedAt).getTime();
  const minutesAgo = Math.floor(elapsedMs / 60000);

  if (minutesAgo < 1) return 'postou agora';
  if (minutesAgo < 60) return `postou há ${minutesAgo}min`;

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `postou há ${hoursAgo}h`;
  return 'postou ontem';
}

/**
 * VoteCard — one card per open evidence from another participant ("Votar"
 * tab, D-04). Presentational only: the route owns the votable-evidences
 * query and the cast-vote mutation, this component just renders the
 * open/voted/resolved states and calls onVote. No Sim/Não tally is ever
 * accepted as a prop or rendered (D-05, T-03-15) — status/hasVoted alone
 * drive the body.
 */
export function VoteCard({ evidence, isVoting, onVote }: VoteCardProps) {
  const initials = evidence.authorName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  const thumbnailUrl = `${R2_PUBLIC_BASE_URL}/${encodeURIComponent(evidence.objectKey)}`;
  const isResolved = evidence.status !== 'PENDING';
  // O voto do próprio usuário nunca foi segredo (item I) — segue visível também
  // depois que a janela fecha, ao lado do resultado.
  const showHeaderVotedBadge = evidence.hasVoted;

  return (
    <div style={cardShellStyle}>
      <div style={headerRowStyle}>
        <div style={avatarStyle}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={nameStyle}>{evidence.authorName}</div>
          <div style={metaStyle}>{formatPostedMeta(evidence.postedAt)}</div>
        </div>
        {showHeaderVotedBadge && (
          <span style={votedBadgeStyleFor(evidence.myVote)}>{votedBadgeLabel(evidence.myVote)}</span>
        )}
      </div>

      {!isResolved && (
        <p style={hiddenVotesCaptionStyle}>
          Os votos ficam ocultos até a janela fechar, às 23:59 — ou antes, se a turma toda votar.
        </p>
      )}

      <img
        src={thumbnailUrl}
        alt={`Evidência de ${evidence.authorName}`}
        style={thumbnailStyle}
      />

      {isResolved ? (
        /* A janela do dia fecha COM o resultado: o card permanece na lista
           depois de resolvido (early-close ou 23:59) em vez de sumir. */
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <EvidenceStatusBadge status={evidenceStatusToBadge(evidence.status)} />
          <span style={resolvedCaptionStyle}>
            {evidence.status === 'ACCEPTED'
              ? 'Votação encerrada — a turma validou o dia.'
              : 'Votação encerrada — a turma não validou o dia.'}
          </span>
        </div>
      ) : (
        !evidence.hasVoted && (
          <div style={buttonsRowStyle}>
            <VoteButton
              variant="sim"
              label="Sim, valeu!"
              loading={isVoting}
              onClick={() => onVote('SIM')}
            />
            <VoteButton
              variant="nao"
              label="Não rolou"
              loading={isVoting}
              onClick={() => onVote('NAO')}
            />
          </div>
        )
      )}
    </div>
  );
}

interface VoteButtonProps {
  variant: 'sim' | 'nao';
  label: string;
  loading: boolean;
  onClick: () => void;
}

/**
 * Sim/Não vote button. Mirrors PrimaryButton's press-shadow interaction
 * mechanics (mouse down/up transform + shadow swap) but with the UI-SPEC's
 * distinct Sim/Não palette — not a PrimaryButton reuse, since the Não button
 * is a light-coral-tint + border, never solid --coral (accent-reservation
 * rule).
 */
function VoteButton({ variant, label, loading, onClick }: VoteButtonProps) {
  const isSim = variant === 'sim';

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      style={{
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4em',
        fontFamily: '"Baloo 2", system-ui, sans-serif',
        fontWeight: 700,
        fontSize: '0.95rem',
        minHeight: 44,
        padding: '12px 10px',
        borderRadius: 14,
        border: isSim ? 'none' : '2px solid var(--coral)',
        cursor: loading ? 'not-allowed' : 'pointer',
        background: isSim ? 'var(--green-bright)' : '#FFE2DA',
        color: isSim ? 'var(--green-ink)' : 'var(--coral)',
        boxShadow: isSim ? '0 7px 0 -1px #1aa652' : 'none',
        opacity: loading ? 0.7 : 1,
        transition: 'transform 0.14s, box-shadow 0.14s',
      }}
      onMouseDown={(e) => {
        if (!loading && isSim) e.currentTarget.style.transform = 'translateY(3px)';
      }}
      onMouseUp={(e) => {
        if (!loading && isSim) e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseLeave={(e) => {
        if (!loading && isSim) e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {loading ? <ButtonSpinner color={isSim ? 'var(--green-ink)' : 'var(--coral)'} /> : label}
    </button>
  );
}

function ButtonSpinner({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 16,
        height: 16,
        border: '2px solid rgba(0,0,0,0.15)',
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}

const cardShellStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: 14,
  marginBottom: 12,
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const avatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'var(--green)',
  display: 'grid',
  placeItems: 'center',
  color: '#fff',
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.75rem',
  flexShrink: 0,
};

const nameStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.95rem',
  color: 'var(--ink)',
};

const metaStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--muted)',
};

const votedBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  padding: '5px 10px',
  borderRadius: 999,
  background: '#EEE9DD',
  color: 'var(--muted)',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

/**
 * Item I: colore o badge "já votei" conforme o voto do usuário — verde (SIM),
 * coral (NAO), reaproveitando a paleta dos VoteButtons. `null` (voto
 * desconhecido) mantém o neutro atual.
 */
function votedBadgeStyleFor(myVote: VoteValue | null): React.CSSProperties {
  if (myVote === 'SIM') {
    return { ...votedBadgeStyle, background: 'var(--green-bright)', color: 'var(--green-ink)' };
  }
  if (myVote === 'NAO') {
    return { ...votedBadgeStyle, background: '#FFE2DA', color: 'var(--coral)' };
  }
  return votedBadgeStyle;
}

function votedBadgeLabel(myVote: VoteValue | null): string {
  if (myVote === 'SIM') return '✓ Votei: valeu';
  if (myVote === 'NAO') return 'Votei: não rolou';
  return '✓ Já votei';
}

const resolvedCaptionStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--muted)',
  fontWeight: 600,
};

const hiddenVotesCaptionStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'var(--muted)',
  fontWeight: 600,
  margin: '6px 0 0',
};

const thumbnailStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '4 / 3',
  objectFit: 'cover',
  borderRadius: 14,
  display: 'block',
  margin: '10px 0',
};

const buttonsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
};
