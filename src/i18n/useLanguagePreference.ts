import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, isSupportedLocale } from "./locales";
import type { SupportedLocale } from "./locales";

/**
 * Language preferences are scoped per workspace and persisted in
 * `localStorage`. They are intentionally client-side: the workspace settings
 * UI lets each user pick the language they see in that workspace. If/when we
 * want a workspace-wide enforced language, this can be promoted to a
 * `workspaces` column without breaking the hook signature.
 */
const STORAGE_KEY_PREFIX = "avandar:workspace-language:";

function _storageKey(workspaceId: string): string {
  return `${STORAGE_KEY_PREFIX}${workspaceId}`;
}

/**
 * Reads the persisted language preference for `workspaceId`, falling back to
 * `DEFAULT_LOCALE` when nothing is stored or the stored value is unsupported.
 */
export function readWorkspaceLanguage(workspaceId: string): SupportedLocale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }
  const raw = window.localStorage.getItem(_storageKey(workspaceId));
  return raw && isSupportedLocale(raw) ? raw : DEFAULT_LOCALE;
}

/**
 * Persists the language preference for `workspaceId` and notifies hook
 * subscribers in the same tab via a synthetic event.
 */
export function writeWorkspaceLanguage(
  workspaceId: string,
  locale: SupportedLocale,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(_storageKey(workspaceId), locale);
  // Notify other hook subscribers in the same tab. The native `storage`
  // event only fires across tabs, so we dispatch a synthetic event.
  window.dispatchEvent(
    new CustomEvent("avandar:workspace-language-changed", {
      detail: { workspaceId, locale },
    }),
  );
}

function _subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener("avandar:workspace-language-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("avandar:workspace-language-changed", callback);
  };
}

/**
 * Returns the language preference for the given workspace, plus a setter
 * that persists the choice. Re-renders subscribers when the value changes.
 */
export function useWorkspaceLanguage(workspaceId: string): {
  locale: SupportedLocale;
  setLocale: (next: SupportedLocale) => void;
} {
  const getSnapshot = useCallback(() => {
    return readWorkspaceLanguage(workspaceId);
  }, [workspaceId]);

  const locale = useSyncExternalStore(_subscribe, getSnapshot, () => {
    return DEFAULT_LOCALE;
  });

  const setLocale = useCallback(
    (next: SupportedLocale) => {
      return writeWorkspaceLanguage(workspaceId, next);
    },
    [workspaceId],
  );

  return { locale, setLocale };
}
