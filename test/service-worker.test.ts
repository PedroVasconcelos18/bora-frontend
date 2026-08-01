/**
 * service-worker.test.ts — source-contract test for public/sw.js.
 *
 * There is no DOM environment and no testing-library in this project (see
 * sao-paulo-day.test.ts's plain describe/it/expect convention), so this is a
 * text + filesystem contract test, not a runtime test: it reads sw.js as
 * text and asserts on exact substrings (mirrors forbidden-vocab.test.ts's
 * readFileSync + import.meta.url path-resolution pattern).
 *
 * WHY THIS EXISTS:
 *   Discretion #4 (11-CONTEXT.md) rules the service worker's scope down to
 *   push + notificationclick only — no request interception, no Cache
 *   Storage, no offline strategy. This project already shipped a stale
 *   bundle to production once; a worker that caches responses would make
 *   that incident permanent and invisible instead of a one-off. These
 *   assertions are the machine-enforced form of that decision (T-11-22).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, '..', 'public');
const SW_PATH = join(PUBLIC_DIR, 'sw.js');
const MANIFEST_PATH = join(PUBLIC_DIR, 'manifest.json');

const swSource = readFileSync(SW_PATH, 'utf-8');

describe('public/sw.js — event handler contract', () => {
  it('registers the four expected handlers, by name', () => {
    expect(swSource).toContain("addEventListener('install'");
    expect(swSource).toContain("addEventListener('activate'");
    expect(swSource).toContain("addEventListener('push'");
    expect(swSource).toContain("addEventListener('notificationclick'");
  });

  it('never registers a request-interception handler (Discretion #4 / T-11-22)', () => {
    expect(swSource).not.toContain("addEventListener('fetch'");
  });

  it('never references the Cache Storage API (Discretion #4 / T-11-22)', () => {
    expect(swSource).not.toMatch(/caches\./);
  });

  it('does not import application code — this file is standalone', () => {
    expect(swSource).not.toMatch(/^\s*import /m);
  });

  it('references icon and badge assets that exist on disk under public/', () => {
    expect(swSource).toContain('/icons/icon-192.png');
    expect(swSource).toContain('/icons/badge-96.png');
    expect(existsSync(join(PUBLIC_DIR, 'icons', 'icon-192.png'))).toBe(true);
    expect(existsSync(join(PUBLIC_DIR, 'icons', 'badge-96.png'))).toBe(true);
  });

  it('falls back to the home route when a push carries no url', () => {
    expect(swSource).toContain("data?.url ?? '/home'");
  });
});

describe('public/manifest.json — start_url cross-check (SC-7)', () => {
  it('parses and points start_url at the app home route, not the document root', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) as {
      start_url?: string;
    };
    expect(manifest.start_url).toBe('/home');
  });
});
