import {
  EMOJI_BY_TYPE,
  ACTION_LABEL_BY_TYPE,
  renderCopy,
  formatRelativeTime,
  type NotificationRow,
} from '../lib/notifications';

interface NotificationCardProps {
  notification: NotificationRow;
  dayLabel: string;
  isLast: boolean;
  onOpen: () => void;
}

/**
 * NotificationCard — item da lista do painel `/notifications` (§NotificationCard
 * da UI-SPEC, JSX literal). O card TODO é clicável (D-09/D-11) — um único
 * elemento de botão envolvendo o row inteiro, sem ações inline (o convite
 * NÃO tem "Aceitar"/"Recusar", D-09: "Recusar" não existe no backend e
 * "Aceitar" é um fluxo inteiro que já mora em /invites/$token).
 *
 * Estado de leitura é POR ITEM (`readAt === null`), NUNCA por bloco de dia
 * (ver 09-UI-SPEC.md §Estado de leitura por item — a foto do canvas com
 * "todo item de Hoje não-lido / todo item de Ontem lido" é ilustrativa,
 * não uma regra).
 */
export function NotificationCard({ notification, dayLabel, isLast, onOpen }: NotificationCardProps) {
  const isUnread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        width: '100%',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        padding: '16px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--line)',
        opacity: isUnread ? 1 : 0.82,
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          flexShrink: 0,
          background: isUnread ? 'var(--mint)' : 'var(--paper)',
          display: 'grid',
          placeItems: 'center',
          fontSize: '1.3rem',
        }}
      >
        {EMOJI_BY_TYPE[notification.type]}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '0.92rem', color: 'var(--ink)' }}>
          {renderCopy(notification)}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--muted)',
            marginTop: 2,
          }}
        >
          {formatRelativeTime(notification.createdAt, dayLabel)}
          {' · '}
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>
            {ACTION_LABEL_BY_TYPE[notification.type]}
          </span>
        </span>
      </span>
      {isUnread && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--green-bright)',
            flexShrink: 0,
            marginTop: 6,
          }}
        />
      )}
    </button>
  );
}
