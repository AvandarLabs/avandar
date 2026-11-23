import type { VideoThemeDocument } from "../../../src/videoTheme/videoTheme.types";

/** One theme in the theme picker. */
export type ThemeSummary = Readonly<{
  id: string;
  label: string;
  builtIn: boolean;
  extends?: string;
}>;

/** A theme file's document and the hash of its bytes, used for `If-Match`. */
export type StoredTheme = Readonly<{
  document: VideoThemeDocument;
  hash: string;
}>;

/** Theme file operations over one `themes/` directory. */
export type ThemeStore = Readonly<{
  list: () => Promise<readonly ThemeSummary[]>;
  read: (id: string) => Promise<StoredTheme>;
  create: (document: unknown) => Promise<StoredTheme>;
  save: (
    id: string,
    document: unknown,
    ifMatch: string,
  ) => Promise<StoredTheme>;
}>;
