/**
 * jsdom-storage.ts — works around a collision between Node's own built-in
 * `globalThis.localStorage`/`sessionStorage` accessors (stable since this
 * Node version, only functional with `--localstorage-file`) and vitest's
 * jsdom environment.
 *
 * Vitest's `populateGlobal` only copies a `window` property onto the test
 * global when that key is either absent from `global` already or on its
 * hardcoded allow-list. Node predefines `localStorage`/`sessionStorage` on
 * `globalThis`, so jsdom's real `Storage` implementation never gets
 * attached — every `localStorage.setItem`/`getItem` call under `jsdom`
 * environment silently reads/writes Node's broken stand-in instead
 * (discovered by quick 260802-fgr's `PushInviteModal` DOM test, the first
 * suite in this repo to exercise `localStorage` under jsdom).
 *
 * This setup file forwards both storages to the real jsdom instance vitest
 * exposes as `globalThis.jsdom` (only set under the `jsdom` environment —
 * a no-op guard so this has zero effect on the plain `node` environment
 * test files in this repo).
 */
const jsdomInstance = (globalThis as unknown as { jsdom?: { window: Window } }).jsdom;

if (jsdomInstance) {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      get: () => jsdomInstance.window[key],
    });
  }
}
