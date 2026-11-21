import { z } from "zod";
import { VideoThemeSchemas } from "../../videoTheme/VideoThemeSchemas/VideoThemeSchemas";
import type { StoredTheme, ThemeSummary } from "./ThemeApi";

const themeSummarySchema = z.object({
  id: z.string(),
  label: z.string(),
  builtIn: z.boolean(),
  extends: z.string().optional(),
});
const storedThemeSchema = z.object({ document: z.unknown(), hash: z.string() });
const createdThemeSchema = z.object({ id: z.string(), hash: z.string() });
const savedThemeSchema = z.object({ hash: z.string() });
/** Checked response payloads returned by the local theme API. */
export const ThemeApiResponseParsers = {
  /** Reads every picker summary before requesting its document. */
  list: (value: unknown): ThemeSummary[] => {
    return z.array(themeSummarySchema).parse(value);
  },
  /** Reads a valid document and the byte hash used for optimistic saving. */
  stored: (value: unknown): StoredTheme => {
    const stored = storedThemeSchema.parse(value);
    return {
      document: VideoThemeSchemas.parseVideoThemeDocument(stored.document),
      hash: stored.hash,
    };
  },
  /** Reads the created theme's identity and hash. */
  created: (value: unknown): { id: string; hash: string } => {
    return createdThemeSchema.parse(value);
  },
  /** Reads the saved theme's new byte hash. */
  saved: (value: unknown): { hash: string } => {
    return savedThemeSchema.parse(value);
  },
};
