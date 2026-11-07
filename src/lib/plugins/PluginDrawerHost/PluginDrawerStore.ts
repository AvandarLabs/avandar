import type { ReactNode } from "react";

type PluginDrawerState =
  | Readonly<{ title: string; content: ReactNode }>
  | undefined;

let drawerState: PluginDrawerState;
const listeners = new Set<() => void>();

function _emit(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

/**
 * Holds the one drawer plugin UI can have open, so the drawer survives the
 * command that opened it. `makePluginApi` opens it for
 * `avandar.ui.openDrawer`, and `PluginDrawerHost` reads it with
 * `useSyncExternalStore`.
 *
 * Keep this file free of the plugin SDK runtime: the host renders
 * `PluginDrawerHost` at startup, and importing the SDK here would pull it
 * into the main bundle.
 */
export const PluginDrawerStore = {
  open: (nextState: NonNullable<PluginDrawerState>): void => {
    drawerState = nextState;
    _emit();
  },
  close: (): void => {
    drawerState = undefined;
    _emit();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): PluginDrawerState => {
    return drawerState;
  },
};
