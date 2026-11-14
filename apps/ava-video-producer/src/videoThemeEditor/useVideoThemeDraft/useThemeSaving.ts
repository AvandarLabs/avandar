import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
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
import { createDraftAfterSave, isDraftUnchanged } from "./storedDraftRecord";
import type {
  VideoThemeIssue,
  VideoThemeLibrary,
} from "../../videoTheme/videoTheme.types";

/** What the last theme action did, for the theme bar's status line. */
export type ThemeSaveStatus =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "saving" }>
  | Readonly<{ kind: "saved" }>
  | Readonly<{
      kind: "failed";
      status: number;
      issues: readonly VideoThemeIssue[];
    }>
  /** Saving as a new theme was refused. A 409 means the name is taken. */
  | Readonly<{
      kind: "createFailed";
      status: number;
      issues: readonly VideoThemeIssue[];
    }>;

type FailureKind = "failed" | "createFailed";

/**
 * What the last Copy JSON did. It is kept apart from the save status so a
 * copy never changes whether a save is running.
 */
export type ThemeCopyStatus = "idle" | "copied" | "failed";

/** Saving actions and their status. */
export type ThemeSavingState = Readonly<{
  status: ThemeSaveStatus;
  copyStatus: ThemeCopyStatus;
  setCopyStatus: (status: ThemeCopyStatus) => void;
  save: () => Promise<void>;
  /** Resolves true when the new theme was created, false when it was not. */
  saveAsNew: (label: string) => Promise<boolean>;
  /** Re-reads the active theme's file, so its current hash guards the next save. */
  reloadTheme: () => Promise<boolean>;
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
  rebaseDraft: (baseHash: string, nextDraft?: ThemeDraft) => void;
}>;

/** The draft as it is now, read when a request finishes. */
type LatestDraft = RefObject<ThemeDraft>;

function _buildFailureStatusFromError(
  error: unknown,
  kind: FailureKind,
): ThemeSaveStatus {
  return error instanceof ThemeApiError
    ? { kind, status: error.status, issues: error.issues }
    : { kind, status: 0, issues: [] };
}

/**
 * Runs one theme request with its status updates and resolves true when it
 * succeeded. A request started while another is in flight is ignored and
 * resolves false, so a double click cannot send the same stale hash twice.
 * A failure is reported as `failureKind`, which a create sets to
 * `createFailed` so its conflict is not read as a changed file.
 */
export async function runThemeRequest(
  options: Readonly<{
    inFlight: RefObject<boolean>;
    setStatus: (status: ThemeSaveStatus) => void;
    request: () => Promise<void>;
    failureKind?: FailureKind;
  }>,
): Promise<boolean> {
  const { inFlight, setStatus, request, failureKind = "failed" } = options;
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
    setStatus(_buildFailureStatusFromError(error, failureKind));
    return false;
  } finally {
    inFlight.current = false;
  }
}

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
    rebaseDraft: (baseHash: string) => void;
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
    rebaseDraft(stored.hash);
    setStatus({ kind: "idle" });
    return true;
  } catch (error) {
    setStatus(_buildFailureStatusFromError(error, "failed"));
    return false;
  } finally {
    inFlight.current = false;
  }
}

type RunThemeRequest = (
  request: () => Promise<void>,
  failureKind?: FailureKind,
) => Promise<boolean>;

/**
 * Saves the draft into its custom theme file, guarded by the file's hash.
 * Edits made while the save runs stay, on top of the saved theme.
 */
function useSaveInPlace(
  options: SaveOptions,
  run: RunThemeRequest,
  latestDraft: LatestDraft,
) {
  const { isBuiltIn, storedTheme, draft, storeTheme, rebaseDraft } = options;
  return useCallback(async () => {
    if (isBuiltIn || !storedTheme) {
      return;
    }
    const document = createSavedDocumentFromDraft(storedTheme.document, draft);
    await run(async () => {
      const { hash } = await ThemeApi.save(document, storedTheme.hash);
      storeTheme({ document, hash });
      rebaseDraft(
        hash,
        createDraftAfterSave({
          savedDraft: draft,
          currentDraft: latestDraft.current,
          savedDocument: document,
        }),
      );
    });
  }, [
    isBuiltIn,
    storedTheme,
    draft,
    storeTheme,
    rebaseDraft,
    run,
    latestDraft,
  ]);
}

/**
 * Saves the draft as a new theme and makes it the active one. A missing base
 * theme fails like any other refused save, so the status line says so. The
 * base theme's draft is cleared only when it did not change during the save,
 * so edits made meanwhile are not lost.
 */
function useSaveAsNew(
  options: SaveOptions,
  run: RunThemeRequest,
  latestDraft: LatestDraft,
) {
  const { library, themeId, draft, storeTheme, discard, selectTheme } = options;
  return useCallback(
    (label: string) =>
      run(async () => {
        const base = library.get(themeId);
        if (!base) {
          throw new Error(`The base theme "${themeId}" is not loaded.`);
        }
        const id = buildThemeIdFromLabel(label, [...library.keys()]);
        const document = createNewThemeDocument({ base, draft, id, label });
        const { hash } = await ThemeApi.create(document);
        storeTheme({ document, hash });
        if (
          isDraftUnchanged({
            savedDraft: draft,
            currentDraft: latestDraft.current,
          })
        ) {
          discard();
        }
        selectTheme(id);
      }),
    [
      library,
      themeId,
      draft,
      storeTheme,
      discard,
      selectTheme,
      run,
      latestDraft,
    ],
  );
}

/**
 * Saves the draft into its theme (custom themes only, guarded by the file's
 * hash) or into a new theme, then clears the draft. A new theme becomes the
 * active one. The state and its functions keep their identity until an
 * option they use changes.
 */
export function useThemeSaving(options: SaveOptions): ThemeSavingState {
  const [status, setSaveStatus] = useState<ThemeSaveStatus>({ kind: "idle" });
  const [copyStatus, setCopyStatus] = useState<ThemeCopyStatus>("idle");
  const setStatus = useCallback((nextStatus: ThemeSaveStatus) => {
    setSaveStatus(nextStatus);
    setCopyStatus("idle");
  }, []);
  const inFlight = useRef(false);
  const run = useCallback<RunThemeRequest>(
    (request, failureKind) =>
      runThemeRequest({ inFlight, setStatus, request, failureKind }),
    [setStatus],
  );
  const latestDraft = useRef(options.draft);
  useEffect(() => {
    latestDraft.current = options.draft;
  }, [options.draft]);
  const save = useSaveInPlace(options, run, latestDraft);
  const saveAsNew = useSaveAsNew(options, run, latestDraft);
  const { themeId, storeTheme, rebaseDraft } = options;
  const reloadTheme = useCallback(
    () =>
      reloadStoredTheme({
        themeId,
        inFlight,
        read: ThemeApi.read,
        storeTheme,
        rebaseDraft,
        setStatus,
      }),
    [themeId, storeTheme, rebaseDraft, setStatus],
  );
  return useMemo(
    () => ({
      status,
      copyStatus,
      setCopyStatus,
      save,
      saveAsNew,
      reloadTheme,
    }),
    [status, copyStatus, save, saveAsNew, reloadTheme],
  );
}
