import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ThemeApi, type StoredTheme } from "../../ThemeApi/ThemeApi";
import { type ThemeDraft, ThemeDrafts } from "../../ThemeDrafts/ThemeDrafts";
import { StoredDraftRecords } from "../StoredDraftRecords/StoredDraftRecords";
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
  /**
   * Re-reads the active theme's file, so its current hash guards the next save.
   */
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
    options: Readonly<{
      baseHash: string;
      draft?: ThemeDraft;
    }>,
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
/**
 * The save options plus the request runner and latest drafts a save hook
 * shares.
 */
type SaveHookOptions = SaveOptions &
  Readonly<{
    run: RunThemeRequest;
    latestDrafts: LatestDrafts;
  }>;
/** Fields used while saving a draft to its existing theme. */
type SaveInPlaceOptions = Pick<
  SaveHookOptions,
  | "themeId"
  | "isBuiltIn"
  | "storedTheme"
  | "draft"
  | "storeTheme"
  | "rebaseDraft"
  | "run"
  | "latestDrafts"
>;
/** Fields used while creating a new theme from a draft. */
type SaveAsNewOptions = Pick<
  SaveHookOptions,
  | "library"
  | "themeId"
  | "draft"
  | "storeTheme"
  | "discard"
  | "selectTheme"
  | "run"
  | "latestDrafts"
>;
/**
 * Whether the just-saved draft still matches the latest edits for its theme.
 */
function _isSavedDraftCurrent({
  draft,
  latestDrafts,
  themeId,
}: Readonly<
  Pick<SaveHookOptions, "draft" | "latestDrafts" | "themeId">
>): boolean {
  return StoredDraftRecords.isDraftUnchanged({
    savedDraft: draft,
    currentDraft: StoredDraftRecords.getLatestDraftOfTheme({
      latestDrafts: latestDrafts.current,
      themeId,
      fallback: draft,
    }),
  });
}

/**
 * Saves the draft into its custom theme file, guarded by the file's hash.
 * Edits made while the save runs stay, on top of the saved theme.
 */
async function _saveAsNew({
  options,
  label,
}: Readonly<{
  options: SaveAsNewOptions;
  label: string;
}>): ReturnType<RunThemeRequest> {
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

  return run(async () => {
    const base = library.get(themeId);
    if (!base) {
      throw new Error(`The base theme "${themeId}" is not loaded.`);
    }
    const id = ThemeDrafts.makeThemeIdFromLabel({
      label,
      takenIds: [...library.keys()],
    });
    const document = ThemeDrafts.makeNewDocumentFromBase({
      base,
      draft,
      id,
      label,
    });
    const { hash } = await ThemeApi.create(document);
    storeTheme({ document, hash });
    if (_isSavedDraftCurrent({ draft, latestDrafts, themeId })) {
      discard();
    }
    selectTheme(id);
  });
}
async function _saveInPlace(options: SaveInPlaceOptions): Promise<void> {
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

  if (isBuiltIn || !storedTheme) {
    return;
  }
  const document = ThemeDrafts.toSavedDocument({
    document: storedTheme.document,
    draft,
  });
  await run(async () => {
    const { hash } = await ThemeApi.save({
      document,
      hash: storedTheme.hash,
    });
    storeTheme({ document, hash });
    rebaseDraft({
      baseHash: hash,
      draft: StoredDraftRecords.makeDraftFromSave({
        themeId,
        savedDraft: draft,
        savedDocument: document,
        latestDrafts: latestDrafts.current,
      }),
    });
  });
}
function useSaveInPlace(options: SaveHookOptions): () => Promise<void> {
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
  return useCallback(() => {
    return _saveInPlace({
      themeId,
      isBuiltIn,
      storedTheme,
      draft,
      storeTheme,
      rebaseDraft,
      run,
      latestDrafts,
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
function useSaveAsNew(
  options: SaveHookOptions,
): (label: string) => Promise<boolean> {
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
    (label: string) => {
      return _saveAsNew({
        options: {
          library,
          themeId,
          draft,
          storeTheme,
          discard,
          selectTheme,
          run,
          latestDrafts,
        },
        label,
      });
    },
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
    (request, failureKind) => {
      return runThemeRequest({ inFlight, setStatus, request, failureKind });
    },
    [setStatus],
  );
  const latestDrafts = useRef(new Map<string, ThemeDraft>());
  useEffect(() => {
    latestDrafts.current.set(options.themeId, options.draft);
  }, [options.themeId, options.draft]);
  const save = useSaveInPlace({ ...options, run, latestDrafts });
  const saveAsNew = useSaveAsNew({ ...options, run, latestDrafts });
  const { themeId, storeTheme, rebaseDraft } = options;
  const reloadTheme = useCallback(() => {
    return reloadStoredTheme({
      themeId,
      inFlight,
      read: ThemeApi.read,
      storeTheme,
      rebaseDraft,
      setStatus,
    });
  }, [themeId, storeTheme, rebaseDraft, setStatus]);
  return useMemo(() => {
    return {
      status,
      copyStatus,
      setCopyStatus,
      save,
      saveAsNew,
      reloadTheme,
    };
  }, [status, copyStatus, save, saveAsNew, reloadTheme]);
}
