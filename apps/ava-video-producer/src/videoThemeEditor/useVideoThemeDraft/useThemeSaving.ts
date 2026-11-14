import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import {
  ThemeApi,
  ThemeApiError,
  type StoredTheme,
} from "../ThemeApi/ThemeApi";
import {
  buildThemeIdFromLabel,
  createNewThemeDocument,
  createSavedDocumentFromDraft,
  type ThemeDraft,
} from "../themeDraft/themeDraft";
import type {
  VideoThemeIssue,
  VideoThemeLibrary,
} from "../../videoTheme/videoTheme.types";

/** What the last theme action did, for the theme bar's status line. */
export type ThemeSaveStatus =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "saving" }>
  | Readonly<{ kind: "saved" }>
  | Readonly<{ kind: "copied" }>
  | Readonly<{
      kind: "failed";
      status: number;
      issues: readonly VideoThemeIssue[];
    }>;

/** Saving actions and their status. */
export type ThemeSavingState = Readonly<{
  status: ThemeSaveStatus;
  setStatus: (status: ThemeSaveStatus) => void;
  save: () => Promise<void>;
  /** Resolves true when the new theme was created, false when it was not. */
  saveAsNew: (label: string) => Promise<boolean>;
}>;

type SaveOptions = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  isBuiltIn: boolean;
  storedTheme: StoredTheme | undefined;
  draft: ThemeDraft;
  storeTheme: (stored: StoredTheme) => void;
  selectTheme: (themeId: string) => void;
  discard: () => void;
}>;

function _buildFailureStatusFromError(error: unknown): ThemeSaveStatus {
  return error instanceof ThemeApiError
    ? { kind: "failed", status: error.status, issues: error.issues }
    : { kind: "failed", status: 0, issues: [] };
}

/**
 * Runs one theme request with its status updates and resolves true when it
 * succeeded. A request started while another is in flight is ignored and
 * resolves false, so a double click cannot send the same stale hash twice.
 */
export async function runThemeRequest(
  options: Readonly<{
    inFlight: RefObject<boolean>;
    setStatus: (status: ThemeSaveStatus) => void;
    request: () => Promise<void>;
  }>,
): Promise<boolean> {
  const { inFlight, setStatus, request } = options;
  if (inFlight.current) {
    return false;
  }
  inFlight.current = true;
  setStatus({ kind: "saving" });
  try {
    await request();
    setStatus({ kind: "saved" });
    return true;
  } catch (error) {
    setStatus(_buildFailureStatusFromError(error));
    return false;
  } finally {
    inFlight.current = false;
  }
}

type RunThemeRequest = (request: () => Promise<void>) => Promise<boolean>;

/** Saves the draft into its custom theme file, guarded by the file's hash. */
function useSaveInPlace(options: SaveOptions, run: RunThemeRequest) {
  const { isBuiltIn, storedTheme, draft, storeTheme, discard } = options;
  return useCallback(async () => {
    if (isBuiltIn || !storedTheme) {
      return;
    }
    const document = createSavedDocumentFromDraft(storedTheme.document, draft);
    await run(async () => {
      const { hash } = await ThemeApi.save(document, storedTheme.hash);
      storeTheme({ document, hash });
      discard();
    });
  }, [isBuiltIn, storedTheme, draft, storeTheme, discard, run]);
}

/** Saves the draft as a new theme and makes it the active one. */
function useSaveAsNew(options: SaveOptions, run: RunThemeRequest) {
  const { library, themeId, draft, storeTheme, discard, selectTheme } = options;
  return useCallback(
    async (label: string) => {
      const base = library.get(themeId);
      if (!base) {
        return false;
      }
      const id = buildThemeIdFromLabel(label, [...library.keys()]);
      const document = createNewThemeDocument({ base, draft, id, label });
      return run(async () => {
        const { hash } = await ThemeApi.create(document);
        storeTheme({ document, hash });
        discard();
        selectTheme(id);
      });
    },
    [library, themeId, draft, storeTheme, discard, selectTheme, run],
  );
}

/**
 * Saves the draft into its theme (custom themes only, guarded by the file's
 * hash) or into a new theme, then clears the draft. A new theme becomes the
 * active one. The state and its functions keep their identity until an
 * option they use changes.
 */
export function useThemeSaving(options: SaveOptions): ThemeSavingState {
  const [status, setStatus] = useState<ThemeSaveStatus>({ kind: "idle" });
  const inFlight = useRef(false);
  const run = useCallback<RunThemeRequest>(
    (request) => runThemeRequest({ inFlight, setStatus, request }),
    [],
  );
  const save = useSaveInPlace(options, run);
  const saveAsNew = useSaveAsNew(options, run);
  return useMemo(
    () => ({ status, setStatus, save, saveAsNew }),
    [status, save, saveAsNew],
  );
}
