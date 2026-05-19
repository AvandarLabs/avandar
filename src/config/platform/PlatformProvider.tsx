import { createContext, useContext, useMemo, type ReactNode } from "react";
import { isDesktop } from "$/platform/isDesktop";
import { DesktopAuthProvider } from "$/platform/desktop/DesktopAuthProvider";
import { DesktopDatasetBlobStore } from "$/platform/desktop/DesktopDatasetBlobStore";
import { DesktopDuckDbClient } from "$/platform/desktop/DesktopDuckDbClient";
import type { AuthProvider } from "$/platform/types/AuthProvider.types";
import type { DatasetBlobStore } from "$/platform/types/DatasetBlobStore.types";
import type { DuckDbClient } from "$/platform/types/DuckDbClient.types";
import { createWebAuthProvider } from "./createWebAuthProvider";
import { createWebDatasetBlobStore } from "./createWebDatasetBlobStore";
import { createWebDuckDbClient } from "./createWebDuckDbClient";

/**
 * The three platform-agnostic services consumers reach through
 * `usePlatform()`. Each is a small interface declared in
 * `shared/platform/types/`; the implementation behind it differs per
 * platform (`DesktopDuckDbClient` calls Bun-main DuckDB over IPC; the
 * web one wraps the legacy duckdb-wasm client; etc.).
 */
export type PlatformImpls = {
  readonly duckDb: DuckDbClient;
  readonly authProvider: AuthProvider;
  readonly datasetBlobStore: DatasetBlobStore;
};

const PlatformContext = createContext<PlatformImpls | null>(null);

/**
 * Wraps the React tree with the platform-aware implementations of
 * `DuckDbClient`, `AuthProvider`, and `DatasetBlobStore`. The branch
 * is picked once at mount time from `isDesktop()` — the indicator
 * lives in a `<html data-ava-platform>` dataset set by the Electrobun
 * bun-main process on `dom-ready` (see `apps/desktop/main/index.ts`),
 * so switching shells is one full reload, not a live toggle.
 *
 * Consumers call {@link usePlatform} to read the resolved
 * implementations.
 */
export function PlatformProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const impls = useMemo<PlatformImpls>(() => {
    if (isDesktop()) {
      return {
        duckDb: DesktopDuckDbClient,
        authProvider: DesktopAuthProvider,
        datasetBlobStore: DesktopDatasetBlobStore,
      };
    }
    return {
      duckDb: createWebDuckDbClient(),
      authProvider: createWebAuthProvider(),
      datasetBlobStore: createWebDatasetBlobStore(),
    };
  }, []);

  return (
    <PlatformContext.Provider value={impls}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Reads the platform-aware implementations from the surrounding
 * {@link PlatformProvider}. Throws when called outside a provider so
 * the mistake is loud at first render.
 *
 * @returns The {@link PlatformImpls} resolved at provider mount time.
 */
export function usePlatform(): PlatformImpls {
  const ctx = useContext(PlatformContext);
  if (ctx === null) {
    throw new Error("usePlatform must be used inside <PlatformProvider>");
  }
  return ctx;
}
