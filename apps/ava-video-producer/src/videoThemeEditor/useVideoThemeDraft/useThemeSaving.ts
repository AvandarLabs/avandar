import { useState } from "react";
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
  saveAsNew: (label: string) => Promise<void>;
}>;

type Options = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  isBuiltIn: boolean;
  storedTheme: StoredTheme | undefined;
  draft: ThemeDraft;
  storeTheme: (stored: StoredTheme) => void;
  selectTheme: (themeId: string) => void;
  discard: () => void;
}>;

function _failure(error: unknown): ThemeSaveStatus {
  return error instanceof ThemeApiError
    ? { kind: "failed", status: error.status, issues: error.issues }
    : { kind: "failed", status: 0, issues: [] };
}

/**
 * Saves the draft into its theme (custom themes only, guarded by the file's
 * hash) or into a new theme, then clears the draft. A new theme becomes the
 * active one.
 */
export function useThemeSaving(options: Options): ThemeSavingState {
  const [status, setStatus] = useState<ThemeSaveStatus>({ kind: "idle" });
  const save = async () => {
    const { storedTheme } = options;
    if (options.isBuiltIn || !storedTheme) {
      return;
    }
    const document = createSavedDocumentFromDraft(
      storedTheme.document,
      options.draft,
    );
    setStatus({ kind: "saving" });
    try {
      const { hash } = await ThemeApi.save(document, storedTheme.hash);
      options.storeTheme({ document, hash });
      options.discard();
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus(_failure(error));
    }
  };
  const saveAsNew = async (label: string) => {
    const base = options.library.get(options.themeId);
    if (!base) {
      return;
    }
    const id = buildThemeIdFromLabel(label, [...options.library.keys()]);
    const document = createNewThemeDocument({
      base,
      draft: options.draft,
      id,
      label,
    });
    setStatus({ kind: "saving" });
    try {
      const { hash } = await ThemeApi.create(document);
      options.storeTheme({ document, hash });
      options.discard();
      options.selectTheme(id);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus(_failure(error));
    }
  };
  return { status, setStatus, save, saveAsNew };
}
