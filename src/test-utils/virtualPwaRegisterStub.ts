import { vi } from "vitest";

/**
 * Stand-in for Vite's `virtual:pwa-register` module, which only exists when
 * `vite-plugin-pwa` runs (that plugin is excluded in `test` mode). Vite's
 * `resolve.alias` points `virtual:pwa-register` at this file during tests,
 * so the import resolves to something real; tests then configure its
 * behavior with `registerSW.mockImplementation(...)`.
 */
export const registerSW = vi.fn();
