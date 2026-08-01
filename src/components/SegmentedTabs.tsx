import { useState } from 'react';

export type SegmentedTabKey = 'hoje' | 'votar' | 'ranking';

interface SegmentedTab {
  key: SegmentedTabKey;
  label: string;
}

const TABS: SegmentedTab[] = [
  { key: 'hoje', label: 'Suas evidências' },
  { key: 'votar', label: 'Votar' },
  { key: 'ranking', label: 'Ranking' },
];

interface SegmentedTabsProps {
  children: (activeTab: SegmentedTabKey) => React.ReactNode;
  /** Reports the active tab upward. Optional — every existing call site keeps working unchanged. */
  onTabChange?: (activeTab: SegmentedTabKey) => void;
}

/**
 * SegmentedTabs — Hoje/Votar/Ranking tab bar shown only when
 * challenge.status === 'ACTIVE'. Controlled by local state (no navigation,
 * no route change) per UI-SPEC. Container mirrors TabBar's active/inactive
 * pill language but with its own 14px container / 10px tab-button radii.
 */
export function SegmentedTabs({ children, onTabChange }: SegmentedTabsProps) {
  const [activeTab, setActiveTab] = useState<SegmentedTabKey>('hoje');

  return (
    <div>
      <div
        style={{
          display: 'flex',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: 4,
          gap: 4,
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                onTabChange?.(tab.key);
              }}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'var(--mint)' : 'transparent',
                color: isActive ? 'var(--green-ink)' : 'var(--muted)',
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 14 }}>{children(activeTab)}</div>
    </div>
  );
}
