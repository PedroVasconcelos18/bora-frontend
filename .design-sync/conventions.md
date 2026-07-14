# Bora — design system conventions

Bora is a closed-group habit-challenge app (friends, Pix, daily photo evidence,
peer voting, ranking, prize). Voice: warm, playful, trustworthy — it handles
money. UI copy is Brazilian Portuguese.

## Setup / wrapping
No provider is required. Components are self-styled with inline styles that read
CSS custom properties (design tokens). The ONLY requirement is that the token
stylesheet is loaded — `styles.css` (its `@import` closure defines every `--*`
token and loads the two brand fonts). Import a component and render it; it looks
right as long as `styles.css` is present on the page.

Two components — `AppBar` and `TabBar` — are navigation chrome that read TanStack
Router context; they need a router at runtime and ship as reference-only cards.
For a web layout, build your own sidebar/top-nav from the tokens instead.

## Styling idiom: CSS custom properties (tokens) — NOT utility classes
There is no Tailwind/utility-class vocabulary to consume and no styling props.
Style your own layout glue with the SAME `var(--token)` values the components use.
Never invent hex colors — always reference a token.

Surfaces: `--paper` #FAF7F0 (app background), `--card` #FFFFFF (cards/inputs),
`--mint` #DFF6E8 (accent surface: pills, summary boxes, active tab),
`--mint-deep` #B8EBCE (mint borders, disabled).
Brand greens: `--green-bright` #2BD86B (primary CTA), `--green` #12B85C
(progress fill, links), `--green-ink` #0B3B22 (text on green, headings, logo).
Text: `--ink` #16241C (body), `--muted` #5C6B61 (secondary/meta).
Semantic: `--coral` #FF6B4A (destructive/error/focus ring), `--lemon` #FFC83D.
Structure: `--line` #E7E2D6 (borders/dividers), `--shadow` / `--shadow-sm`
(card shadows).

Fonts: headings use **"Baloo 2"** (rounded, friendly); body uses
**"Plus Jakarta Sans"**. Both load via `styles.css`.

## Where the truth lives
- `styles.css` — the token definitions and font loading. Read it before styling.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage + props.
- `components/<group>/<Name>/<Name>.d.ts` — the exact prop contract.

## Components (all render Brazilian-Portuguese content)
Challenge loop: `ChallengeCard`, `StatusPill`, `InviteCard`, `CopyableInviteLink`,
`WaitingRoomList`, `PrizeCalculator`, `EmojiPicker`, `SegmentedTabs`.
Evidence + voting: `EvidenceUploadCard`, `EvidenceStatusBadge`, `VoteCard`.
Ranking: `RankingList`, `StreakGrid`. Forms/actions: `FormField`, `PrimaryButton`,
`ToastContainer`, `DisclaimerFooter`, `NotBetBlock`. Chrome: `AppBar`, `TabBar`.

## Idiomatic build snippet
```tsx
import { ChallengeCard, PrimaryButton } from 'bora-frontend';

function Home() {
  return (
    <div style={{ background: 'var(--paper)', padding: 24, display: 'grid', gap: 16 }}>
      <h1 style={{ fontFamily: '"Baloo 2", sans-serif', color: 'var(--green-ink)' }}>
        Seus desafios
      </h1>
      <ChallengeCard
        id="c1" title="Treino 5x na semana" emoji="🏋️"
        durationDays={30} collabAmount="50" platformFee="10"
        status="WAITING" participants={[/* … */]} onClick={() => {}}
      />
      <PrimaryButton onClick={() => {}}>Bora criar o desafio</PrimaryButton>
    </div>
  );
}
```
The library component owns its look; your layout glue uses the tokens. When
adapting Bora from mobile to web, keep the tokens and components — reflow the
layout (sidebar nav, multi-column panels) rather than restyling the parts.
