/**
 * breakpoints.ts — single source of the responsive-shell breakpoint tiers.
 *
 * WHY THIS EXISTS:
 *   The web shell (v1.1) splits the app into 3 tiers: mobile (<768px),
 *   tablet (768-1023px) and desktop (>=1024px). Only the tablet threshold
 *   (768px) triggers the STRUCTURAL swap between the mobile chrome tree
 *   (AppBar/TabBar) and the web chrome tree (WebShell/Sidebar) — see D-02.
 *   The desktop threshold (1024px) does not change the chrome at all in
 *   this phase; it is reserved for the internal reflow of individual
 *   screens in later phases (Fases 6-7). Both constants are defined now so
 *   those phases can consume the same shared source instead of duplicating
 *   magic numbers.
 */

export const BREAKPOINTS = { tablet: 768, desktop: 1024 } as const;
