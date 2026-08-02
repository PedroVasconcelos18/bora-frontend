import {
  BLOCKED_COPY,
  PUSH_PREFERENCE_ROWS,
  derivePreferencesSectionState,
  shouldShowInactiveHelper,
} from '../lib/push-preferences';
import { EMOJI_BY_TYPE } from '../lib/notifications';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { usePushPreferences } from '../hooks/usePushPreferences';

/**
 * NotificationPreferencesSection — a seção "Notificações push" dentro de
 * `profile.tsx` (D12-08, sem rota nova, sem entrada de navegação nova).
 *
 * Governa preferência POR TIPO (por usuário) — ortogonal a
 * `PushActivationCard`, que governa inscrição de DEVICE
 * (`PushSubscription`). Os dois nunca se escrevem: uma pessoa pode desligar
 * `EVIDENCE_SUBMITTED` aqui antes mesmo de ativar push em qualquer aparelho
 * (D12-07 — sem inscrição não sai nada, independente de preferência).
 *
 * Deliberadamente NÃO retorna `null` em permissão negada, ao contrário de
 * `PushActivationCard` (D-06). É a distinção que D12-09 desenha: `PushActivationCard`
 * insiste no fluxo — o que D-06 proíbe, e continua proibido — enquanto esta
 * seção só explica, numa tela que a pessoa foi procurar por conta própria.
 *
 * Nenhum estado é re-derivado aqui: o visual sai inteiro da lib pura de
 * derivação de estado (ver import abaixo), alimentada pelo estado de push já
 * pronto do hook de inscrição (nunca a API de permissão do navegador
 * diretamente) e pelo `isLoading` do próprio `usePushPreferences()`.
 */
export function NotificationPreferencesSection() {
  const { state } = usePushSubscription();
  const { preferences, isLoading, pendingType, setPreference } = usePushPreferences();

  const sectionState = derivePreferencesSectionState({
    pushState: state,
    isPreferencesLoading: isLoading,
  });

  return (
    <section style={sectionShellStyle}>
      <p style={headingStyle}>Notificações push</p>
      <p style={subtitleStyle}>
        Escolha o que você quer ver na tela bloqueada do seu celular, tipo por tipo.
      </p>

      {sectionState === 'loading' && (
        <>
          <div style={shimmerStripStyle} />
          <div style={{ ...shimmerStripStyle, marginTop: 10 }} />
          <div style={{ ...shimmerStripStyle, marginTop: 10 }} />
          <p style={loadingLabelStyle}>Carregando preferências...</p>
        </>
      )}

      {sectionState !== 'loading' && (
        <>
          {sectionState === 'blocked' && (
            <div style={blockedBannerStyle}>
              <p style={blockedHeadingStyle}>
                {state === 'denied' ? BLOCKED_COPY.deniedHeading : BLOCKED_COPY.unsupportedHeading}
              </p>
              <p style={blockedBodyStyle}>
                {state === 'denied' ? BLOCKED_COPY.deniedBody : BLOCKED_COPY.unsupportedBody}
              </p>
            </div>
          )}

          {sectionState === 'interactive' && shouldShowInactiveHelper(state) && (
            <p style={{ ...subtitleStyle, marginBottom: 12 }}>
              Isso só entra em ação depois que algum dos seus aparelhos ativar as notificações — pode
              ajustar aqui antes, sem problema.
            </p>
          )}

          {PUSH_PREFERENCE_ROWS.map((row, index, rows) => {
            const checked = preferences.find((p) => p.type === row.type)?.enabled ?? false;
            const disabled = sectionState === 'blocked' || pendingType === row.type;

            return (
              <div
                key={row.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 0',
                  borderBottom: index === rows.length - 1 ? undefined : '1px solid var(--line)',
                }}
              >
                <div style={emojiTileStyle}>{EMOJI_BY_TYPE[row.type]}</div>
                <div style={{ flex: 1 }}>
                  <p style={rowLabelStyle}>{row.label}</p>
                  <p style={rowDescriptionStyle}>{row.description}</p>
                  {row.caption && <p style={rowCaptionStyle}>{row.caption}</p>}
                </div>
                <PreferenceToggle
                  checked={checked}
                  disabled={disabled}
                  label={row.label}
                  onChange={() => setPreference(row.type, !checked)}
                />
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}

interface PreferenceToggleProps {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
}

/** PreferenceToggle — trilha+thumb próprios, sem biblioteca de switch/checkbox (12-UI-SPEC.md §Toggle Component). */
function PreferenceToggle({ checked, disabled, label, onChange }: PreferenceToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        position: 'relative',
        padding: 0,
        flexShrink: 0,
        background: checked ? 'var(--green-bright)' : 'var(--line)',
        transition: 'background 0.15s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/*
        A posição ligada de 23px que a UI-SPEC descreve (44 − 18 − 3) é obtida
        por `left: 3` + deslocamento de 20 via `transform: translateX(20px)`:
        a especificação declara a transição no `transform`, e uma transição de
        `transform` não anima uma mudança de `left` — o resultado em repouso
        é exatamente o mesmo pixel (3 + 20 = 23).
      */}
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'var(--card)',
          boxShadow: 'var(--shadow-sm)',
          position: 'absolute',
          top: 3,
          left: 3,
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.15s ease',
        }}
      />
    </button>
  );
}

const sectionShellStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: 18,
};

const headingStyle: React.CSSProperties = {
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '1.05rem',
  color: 'var(--ink)',
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.85rem',
  color: 'var(--muted)',
  marginBottom: 12,
};

const loadingLabelStyle: React.CSSProperties = {
  marginTop: 10,
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--muted)',
};

// Mesma receita de PushActivationCard.tsx's `shimmerStripStyle` — o
// keyframe `shimmer` de tokens.css nunca é redefinido aqui.
const shimmerStripStyle: React.CSSProperties = {
  height: 20,
  width: '60%',
  borderRadius: 8,
  background: 'linear-gradient(90deg, var(--line) 25%, var(--card) 37%, var(--line) 63%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
};

const blockedBannerStyle: React.CSSProperties = {
  padding: 14,
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  marginBottom: 8,
};

const blockedHeadingStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.9rem',
  fontWeight: 700,
  color: 'var(--ink)',
};

const blockedBodyStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.85rem',
  fontWeight: 400,
  color: 'var(--muted)',
  marginTop: 6,
};

const emojiTileStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: 'var(--mint)',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  fontSize: '1.2rem',
};

const rowLabelStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.95rem',
  fontWeight: 700,
  color: 'var(--ink)',
};

const rowDescriptionStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.82rem',
  fontWeight: 400,
  color: 'var(--muted)',
  marginTop: 2,
};

const rowCaptionStyle: React.CSSProperties = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--muted)',
  marginTop: 2,
};
