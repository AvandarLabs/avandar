import type { ReactNode } from "react";

type PluginDrawerState =
  | Readonly<{
      /** Increases on every `open`, so the host can tell one open apart. */
      openId: number;
      isOpen: boolean;
      title: string;
      content: ReactNode;
    }>
  | undefined;

let drawerState: PluginDrawerState;
let lastOpenId = 0;
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
 * `useSyncExternalStore` and closes it.
 *
 * Closing keeps the title and content so the drawer can animate out. The host
 * calls `clearClosed` when that animation ends and `clear` when it unmounts.
 *
 * Keep this file free of the plugin SDK runtime: the host renders
 * `PluginDrawerHost` at startup, and importing the SDK here would pull it
 * into the main bundle.
 */
export const PluginDrawerStore = {
  open: (drawer: Readonly<{ title: string; content: ReactNode }>): void => {
    lastOpenId += 1;
    drawerState = { ...drawer, openId: lastOpenId, isOpen: true };
    _emit();
  },
  close: (): void => {
    if (drawerState === undefined || !drawerState.isOpen) {
      return;
    }
    drawerState = { ...drawerState, isOpen: false };
    _emit();
  },
  /** Drops a closed drawer's content. An open drawer stays as it is. */
  clearClosed: (): void => {
    if (drawerState === undefined || drawerState.isOpen) {
      return;
    }
    drawerState = undefined;
    _emit();
  },
  /** Drops the drawer, open or not, without waiting for it to animate out. */
  clear: (): void => {
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
