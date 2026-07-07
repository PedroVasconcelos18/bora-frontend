/**
 * EmojiPicker — grid of emoji buttons following referencia.html .emo-pick.
 * Button: 46×46px, border-radius 13px, border 2px solid var(--line)
 * Selected: border-color var(--green-bright), background var(--mint), scale(1.05)
 */

const DEFAULT_EMOJIS = [
  '🏋️', '🚭', '💧', '👟', '📚',
  '🌙', '🥤', '🏃', '🧘', '🍎',
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  emojis?: string[];
}

export function EmojiPicker({ value, onChange, emojis = DEFAULT_EMOJIS }: EmojiPickerProps) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {emojis.map((emoji) => {
        const isSelected = emoji === value;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              border: `2px solid ${isSelected ? 'var(--green-bright)' : 'var(--line)'}`,
              background: isSelected ? 'var(--mint)' : 'var(--card)',
              fontSize: '1.4rem',
              cursor: 'pointer',
              transition: 'transform 0.15s, border-color 0.15s, background 0.15s',
              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              display: 'grid',
              placeItems: 'center',
            }}
            aria-label={`Selecionar emoji ${emoji}`}
            aria-pressed={isSelected}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
