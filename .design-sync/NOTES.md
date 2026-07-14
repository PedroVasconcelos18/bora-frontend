# design-sync notes — bora-frontend

Repo-specific gotchas for future syncs. Read before re-syncing.

## Shape: this is an APP repo, not a packaged component library
- There is no `dist/` component entry. The bundle is driven from a hand-written
  **source barrel** `ds-entry.ts` (repo root) that re-exports the 20 UI components
  from `src/components/`, plus `showToast`.
- `cfg.componentSrcMap` pins all 20 component src paths (discovery has no `.d.ts`
  tree to read, so the map is authoritative). If a component is added to
  `src/components/`, add it to BOTH `ds-entry.ts` and `componentSrcMap`.
- Build/capture is driven with `--entry ./ds-entry.ts`.

## Tokens + fonts: cssEntry must be SELF-CONTAINED
- Components style themselves with inline `style={{}}` + `var(--token)` (20/20).
  The tokens live in `src/styles/tokens.css` (`:root { --paper … }`).
- The converter copies `cfg.cssEntry` verbatim into `_ds_bundle.css` but does
  **NOT** follow/inline nested `@import`s. A first attempt pointing cssEntry at a
  file that `@import`ed tokens.css shipped an unresolved import → tokens never
  defined → every `var(--green-bright)` etc. rendered transparent.
- Fix: `.design-sync/styles-entry.css` is **generated** = the Google-Fonts
  `@import url(...)` line + the **verbatim contents** of `src/styles/tokens.css`.
  cssEntry points at it. Since it's a copy of tokens.css, **regenerate it if
  tokens.css changes** (google @import line first, then the tokens.css body).
- Fonts: Baloo 2 + Plus Jakarta Sans load at runtime via the remote Google-Fonts
  `@import` (chromium has network in the render check). `cfg.runtimeFontPrefixes`
  suppresses the `[FONT_MISSING]` warning for these two families (no `@font-face`
  ships — matches how the real app loads them via `<link>` in index.html).

## Floor-card components (deliberate — not failures)
- **AppBar**, **TabBar**: no props; they call TanStack Router hooks
  (`useNavigate`, `useRouterState`) which need a RouterProvider. They render a
  clean floor card (no crash) without one. Left as floor cards on purpose — they
  are navigation chrome the web design rebuilds anyway (sidebar/top-nav). To
  author them later, add a `cfg.provider` with a memory RouterProvider.

## ToastContainer
- Fixed-position overlay host; renders nothing until `showToast()` fires. Its
  preview imports `showToast` (added to the barrel) and calls it in `useEffect`,
  wrapped in a `position:relative` container so the fixed pill is captured.

## Known render warns
- (none recorded yet)

## Re-sync risks (what can silently go stale)
- `.design-sync/styles-entry.css` duplicates `src/styles/tokens.css` — a tokens
  change won't reach the DS until styles-entry.css is regenerated.
- `ds-entry.ts` + `componentSrcMap` must both list every component; a new
  component silently missing from either won't sync.
- Preview data is hand-authored against the current prop shapes; a prop rename in
  a component will break its `previews/<Name>.tsx` compile (drops to floor card).
