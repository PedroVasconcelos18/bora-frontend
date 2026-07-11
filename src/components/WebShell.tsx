import { Outlet } from '@tanstack/react-router';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS } from '../lib/breakpoints';
import { Sidebar } from './Sidebar';
import { ToastContainer } from './Toast';

/**
 * WebShell — the >=768px chrome tree (WEB-03): Sidebar (236px, fixed) +
 * a fluid content region, no `.device` mobile frame (D-13/D-15). Mounted
 * by __root.tsx only when `user` is truthy; public web routes render a
 * bare <Outlet /> instead (see __root.tsx).
 *
 * Content padding is 24px on tablet (768-1023px) and 32px on desktop
 * (>=1024px) — this is purely visual reflow *inside* the web shell, so per
 * D-03 it would normally live in a CSS media query. Approach (b) from the
 * plan is used instead: a second useMediaQuery read at the desktop
 * threshold, kept local to this component so no new CSS file is needed.
 */
export function WebShell() {
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: isDesktop ? 32 : 24 }}>
        <Outlet />
      </div>
      <ToastContainer />
    </div>
  );
}
