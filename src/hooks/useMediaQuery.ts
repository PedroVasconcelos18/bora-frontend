import { useEffect, useState } from 'react';

/**
 * useMediaQuery — matchMedia-based hook that decides which chrome TREE to
 * mount (mobile vs web). This is a STRUCTURAL React-tree switch (D-03), not
 * a CSS `display:none` toggle: the mobile shell (AppBar/TabBar) and the web
 * shell (WebShell/Sidebar) are different component trees, so the decision
 * has to happen in JS, reactively, as the viewport crosses the breakpoint.
 * Purely visual reflow *inside* the web shell (e.g. tablet vs desktop
 * padding) stays in CSS media queries — this hook is only for the
 * mobile<->web split.
 *
 * No SSR fallback needed: this is a client-only SPA (Vite, no SSR), so
 * `window.matchMedia` is always available at mount time.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
