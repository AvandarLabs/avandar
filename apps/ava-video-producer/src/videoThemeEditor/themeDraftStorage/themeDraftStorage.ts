import { z } from "zod";
import { videoThemePatchSchema } from "../../videoTheme/VideoThemeSchemas/VideoThemeSchemas";
import { type ThemeDraft, ThemeDrafts } from "../ThemeDrafts/ThemeDrafts";

const DRAFT_KEY_PREFIX = "video-theme-draft:v1:";
const ACTIVE_THEME_KEY = "video-theme-active:v1";

const storedDraftSchema = z.strictObject({
  baseHash: z.string(),
  draft: z.strictObject({
    patch: videoThemePatchSchema,
    overrides: z.record(z.string(), videoThemePatchSchema),
  }),
});

/** A persisted draft and the hash of the theme file it was made against. */
export type StoredThemeDraft = Readonly<{
  baseHash: string;
  draft: ThemeDraft;
}>;

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

/**
 * The draft stored for a theme, or undefined when there is none or it no
 * longer matches the theme schema. Drafts are kept per viewer so they
 * survive a reload.
 */
function _readStoredThemeDraft(
  options: Readonly<{ storage: ReadableStorage; themeId: string }>,
): StoredThemeDraft | undefined {
  const { storage, themeId } = options;
  try {
    const parsed = storedDraftSchema.safeParse(
      JSON.parse(storage.getItem(`${DRAFT_KEY_PREFIX}${themeId}`) ?? "null"),
    );
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** Stores a theme's draft, or forgets it when the draft is empty. */
function _writeStoredThemeDraft(
  options: Readonly<{
    storage: WritableStorage;
    themeId: string;
    stored: StoredThemeDraft;
  }>,
): void {
  const { storage, themeId, stored } = options;
  const key = `${DRAFT_KEY_PREFIX}${themeId}`;
  try {
    if (ThemeDrafts.isThemeDraftEmpty(stored.draft)) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(stored));
    }
  } catch {
    // Without storage the draft still works for this visit.
  }
}

/**
 * The theme to open: `?theme=` when it names an available theme, then the
 * viewer's last choice, then `classic`.
 */
function _getActiveThemeIdFromLocation(
  options: Readonly<{
    search: string;
    storage: ReadableStorage;
    available: readonly string[];
  }>,
): string {
  const fromUrl = new URLSearchParams(options.search).get("theme");
  if (fromUrl && options.available.includes(fromUrl)) {
    return fromUrl;
  }
  const remembered = (() => {
    try {
      return options.storage.getItem(ACTIVE_THEME_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  })();
  return remembered && options.available.includes(remembered)
    ? remembered
    : "classic";
}

/** Remembers the viewer's theme choice for their next visit. */
function _rememberActiveThemeId(
  options: Readonly<{ storage: WritableStorage; themeId: string }>,
): void {
  const { storage, themeId } = options;
  try {
    storage.setItem(ACTIVE_THEME_KEY, themeId);
  } catch {
    // The choice still applies for this visit.
  }
}

/** Persists editor drafts and the selected theme in browser storage. */
export const ThemeDraftStorage = {
  /**
   * The draft stored for a theme, or undefined when there is none or it no
   * longer matches the theme schema.
   */
  readStoredThemeDraft: _readStoredThemeDraft,
  /** Stores a theme's draft, or forgets it when the draft is empty. */
  writeStoredThemeDraft: _writeStoredThemeDraft,
  /**
   * The theme to open: `?theme=` when it names an available theme, then the
   * viewer's last choice, then `classic`.
   */
  getActiveThemeIdFromLocation: _getActiveThemeIdFromLocation,
  /** Remembers the viewer's theme choice for their next visit. */
  rememberActiveThemeId: _rememberActiveThemeId,
};
