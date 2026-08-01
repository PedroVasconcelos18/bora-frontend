import { useState } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { showToast } from './Toast';
import { usePushSubscription } from '../hooks/usePushSubscription';

export type PushActivationCardMode = 'invite' | 'control';

interface PushActivationCardProps {
  /**
   * `invite` — insertion points 1 (post-Pix) and 2 (challenge activation).
   * Never renders the `on` state: these two points exist to invite
   * activation, not to report status (11-UI-SPEC.md gating rule).
   *
   * `control` — insertion point 3 (post-evidence). The only place that ever
   * shows the active state and the off switch.
   */
  mode: PushActivationCardMode;
}

/**
 * PushActivationCard — the two-layer permission card (D-05/D-06/D-07).
 *
 * Consumes `usePushSubscription()`'s already-derived `state` — it does NOT
 * read `Notification.permission`, `pushManager` or any other browser API
 * directly. Plan 11-07's `derivePushCardState` owns that decision; re-deriving
 * it here is exactly how the two would drift apart.
 *
 * The "dismissed" flag below is local, component-level state — deliberately
 * NOT persisted anywhere (no browser storage, no server flag). Declining
 * costs nothing per D-05: the card is allowed to come back on the next mount
 * of any of the 3 insertion points.
 */
export function PushActivationCard({ mode }: PushActivationCardProps) {
  const { state, isMutating, subscribe, unsubscribe } = usePushSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // D-06: a denied permission renders nothing, anywhere, unconditionally.
  // A browser with no Push API at all gets the same treatment.
  if (state === 'denied' || state === 'unsupported') return null;

  // Points 1 and 2 (`invite`) only ever invite activation — when the
  // intersection is already true there is nothing left to invite, so the
  // `on` state is reserved for `control` (insertion point 3) alone.
  if (state === 'on' && mode !== 'control') return null;

  const handleActivate = () => {
    try {
      // This tap is the ONLY thing in the app that reaches the native
      // permission prompt (D-05, Layer 2) — the actual `Notification.
      // requestPermission()` call lives inside `subscribeBrowser` (push.ts),
      // one hop below the hook this component consumes.
      subscribe();
    } catch {
      showToast('Não deu pra ativar o lembrete agora. Tenta de novo em instantes.');
    }
  };

  const handleDeactivate = () => {
    try {
      unsubscribe();
    } catch {
      showToast('Não deu pra desativar o lembrete agora. Tenta de novo em instantes.');
    }
  };

  if (state === 'reconciling') {
    return (
      <div style={cardShellStyle}>
        <div style={shimmerStripStyle} />
        <p style={loadingLabelStyle}>Verificando lembrete...</p>
      </div>
    );
  }

  if (state === 'ios-not-installed') {
    return (
      <div style={cardShellStyle}>
        <p style={headingStyle}>Pra eu te lembrar às 18h, adiciona o Bora na tela de início</p>
        <p style={bodyTextStyle}>Toque em Compartilhar e depois em Adicionar à Tela de Início.</p>
        <div style={{ marginTop: 12 }}>
          <button type="button" style={cheapTextStyle} onClick={() => setDismissed(true)}>
            Agora não
          </button>
        </div>
      </div>
    );
  }

  if (state === 'on') {
    return (
      <div style={cardShellStyle}>
        <p style={headingStyle}>Lembrete às 18h ativado</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <span style={badgeStyle}>ativo</span>
          <button type="button" style={cheapTextStyle} onClick={handleDeactivate}>
            Desativar
          </button>
        </div>
      </div>
    );
  }

  // state === 'off'
  return (
    <div style={cardShellStyle}>
      <p style={headingStyle}>Quer que eu te lembre às 18h?</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <PrimaryButton onClick={handleActivate} loading={isMutating}>
            Ativar
          </PrimaryButton>
        </div>
        <button type="button" style={cheapTextStyle} onClick={() => setDismissed(true)}>
          Agora não
        </button>
      </div>
    </div>
  );
}

const cardShellStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: 18,
};

const headingStyle: React.CSSProperties = {
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '1rem',
  color: 'var(--ink)',
};

const bodyTextStyle: React.CSSProperties = {
  color: 'var(--muted)',
  marginTop: 8,
};

const cheapTextStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--muted)',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
};

const loadingLabelStyle: React.CSSProperties = {
  marginTop: 10,
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--muted)',
};

// Reuses the EXISTING `shimmer` keyframe from tokens.css — never redefined
// here. Gradient stops are 100% token-based (var(--line) / var(--card)),
// per WEB-05 (Phase 5 D-17) — no new hex.
const shimmerStripStyle: React.CSSProperties = {
  height: 20,
  width: '60%',
  borderRadius: 8,
  background: 'linear-gradient(90deg, var(--line) 25%, var(--card) 37%, var(--line) 63%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
};

// Local copy of EvidenceStatusBadge's ACCEPTED-state recipe — kept local
// rather than extending that component's status union (evidence-outcome
// badges and this card's activation badge are distinct concerns).
const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.7rem',
  padding: '5px 10px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
  background: 'var(--mint)',
  color: 'var(--green-ink)',
};
