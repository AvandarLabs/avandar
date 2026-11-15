import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ThemeApi, type StoredTheme } from "../../ThemeApi/ThemeApi";
import {
  buildThemeIdFromLabel,
  createNewThemeDocument,
  createSavedDocumentFromDraft,
  type ThemeDraft,
} from "../../themeDraft/themeDraft";
import {
  createDraftAfterSave,
  getLatestDraftOfTheme,
  isDraftUnchanged,
} from "../storedDraftRecord/storedDraftRecord";
import { reloadStoredTheme } from "./reloadStoredTheme/reloadStoredTheme";
import { runThemeRequest } from "./runThemeRequest/runThemeRequest";
import type { VideoThemeLibrary } from "../../../videoTheme/videoTheme.types";
import type { FailureKind, ThemeSaveStatus } from "./useThemeSaving.types";

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
  rebaseDraft: (
    options: Readonly<{ baseHash: string; draft?: ThemeDraft }>,
  ) => void;
}>;

/**
 * Each theme's last draft, read when a request finishes. It is keyed by
 * theme id because the active theme can change while a request runs.
 */
type LatestDrafts = RefObject<Map<string, ThemeDraft>>;

type RunThemeRequest = (
  request: () => Promise<void>,
  failureKind?: FailureKind,
) => Promise<boolean>;

/** The save options plus the request runner and latest drafts a save hook shares. */
type SaveHookOptions = SaveOptions &
  Readonly<{
    run: RunThemeRequest;
    latestDrafts: LatestDrafts;
  }>;

/**
 * Saves the draft into its custom theme file, guarded by the file's hash.
 * Edits made while the save runs stay, on top of the saved theme.
 */
function useSaveInPlace(options: SaveHookOptions) {
  const {
    themeId,
    isBuiltIn,
    storedTheme,
    draft,
    storeTheme,
    rebaseDraft,
    run,
    latestDrafts,
  } = options;
  return useCallback(async () => {
    if (isBuiltIn || !storedTheme) {
      return;
    }
    const document = createSavedDocumentFromDraft(storedTheme.document, draft);
    await run(async () => {
      const { hash } = await ThemeApi.save(document, storedTheme.hash);
      storeTheme({ document, hash });
      rebaseDraft({
        baseHash: hash,
        draft: createDraftAfterSave({
          themeId,
          savedDraft: draft,
          savedDocument: document,
          latestDrafts: latestDrafts.current,
        }),
      });
    });
  }, [
    themeId,
    isBuiltIn,
    storedTheme,
    draft,
    storeTheme,
    rebaseDraft,
    run,
    latestDrafts,
  ]);
}

/**
 * Saves the draft as a new theme and makes it the active one. A missing base
 * theme fails like any other refused save, so the status line says so. The
 * base theme's draft is cleared only when it did not change during the save,
 * so edits made meanwhile are not lost.
 */
function useSaveAsNew(options: SaveHookOptions) {
  const {
    library,
    themeId,
    draft,
    storeTheme,
    discard,
    selectTheme,
    run,
    latestDrafts,
  } = options;
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
            currentDraft: getLatestDraftOfTheme({
              latestDrafts: latestDrafts.current,
              themeId,
              fallback: draft,
            }),
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
      latestDrafts,
    ],
  );
}

/**
 * Saves the draft into its theme (custom themes only, guarded by the file's
 * hash) or into a new theme. A finished save clears the saved draft unless
 * the theme gained edits while it ran, which stay on top of the saved theme.
 * A new theme becomes the active one. The state and its functions keep their
 * identity until an option they use changes.
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
  const latestDrafts = useRef(new Map<string, ThemeDraft>());
  useEffect(() => {
    latestDrafts.current.set(options.themeId, options.draft);
  }, [options.themeId, options.draft]);
  const save = useSaveInPlace({ ...options, run, latestDrafts });
  const saveAsNew = useSaveAsNew({ ...options, run, latestDrafts });
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
