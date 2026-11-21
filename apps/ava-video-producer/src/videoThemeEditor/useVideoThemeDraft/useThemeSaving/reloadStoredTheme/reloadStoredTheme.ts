import { makeFailureStatusFromError } from "../makeFailureStatusFromError";
import type { StoredTheme } from "../../../ThemeApi/ThemeApi";
import type { ThemeSaveStatus } from "../useThemeSaving.types";
import type { RefObject } from "react";

/**
 * Re-reads one theme's file, stores it, and records the draft as made against
 * it, resolving true when it worked. The draft's edits stay, so nothing on
 * disk or in the draft is overwritten. It shares the in-flight guard with
 * saving: while a save runs it does nothing, so a late read cannot replace
 * the document and hash a save just stored. A successful reload clears the
 * status line, since a stale-hash failure no longer applies. A failed one
 * reports why.
 */
export async function reloadStoredTheme(
  options: Readonly<{
    themeId: string;
    inFlight: RefObject<boolean>;
    read: (themeId: string) => Promise<StoredTheme>;
    storeTheme: (stored: StoredTheme) => void;
    rebaseDraft: (options: Readonly<{ baseHash: string }>) => void;
    setStatus: (status: ThemeSaveStatus) => void;
  }>,
): Promise<boolean> {
  const { themeId, inFlight, read, storeTheme, rebaseDraft, setStatus } =
    options;
  if (inFlight.current) {
    return false;
  }
  inFlight.current = true;
  try {
    const stored = await read(themeId);
    storeTheme(stored);
    rebaseDraft({ baseHash: stored.hash });
    setStatus({ kind: "idle" });
    return true;
  } catch (error) {
    setStatus(makeFailureStatusFromError({ error, kind: "failed" }));
    return false;
  } finally {
    inFlight.current = false;
  }
}
