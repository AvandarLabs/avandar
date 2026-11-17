import { parseVideoThemeDocument } from "../../videoTheme/videoThemeSchemaHelpers/videoThemeSchemaHelpers";
import { ThemeApiError } from "./ThemeApiError";
import type {
  VideoThemeDocument,
  VideoThemeIssue,
} from "../../videoTheme/videoTheme.types";

/** One theme in the picker, as the showcase server lists it. */
export type ThemeSummary = Readonly<{
  id: string;
  label: string;
  builtIn: boolean;
  extends?: string;
}>;

/** A theme file and the hash of its bytes, sent back as `If-Match` when saving. */
export type StoredTheme = Readonly<{
  document: VideoThemeDocument;
  hash: string;
}>;

function _errorBody(body: unknown): {
  message: string;
  issues: VideoThemeIssue[];
} {
  const record =
    typeof body === "object" && body !== null
      ? (body as Readonly<Record<string, unknown>>)
      : {};
  return {
    message:
      typeof record.message === "string"
        ? record.message
        : "Theme request failed",
    issues: Array.isArray(record.issues) ? record.issues : [],
  };
}

async function _request<Body>(
  url: string,
  init: RequestInit = {},
): Promise<Body> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => ({}));
    const { message, issues } = _errorBody(errorBody);
    throw new ThemeApiError(response.status, message, issues);
  }
  return (await response.json().catch(() => ({}))) as Body;
}

async function _read(id: string): Promise<StoredTheme> {
  const stored = await _request<{ document: unknown; hash: string }>(
    `/api/themes/${encodeURIComponent(id)}`,
  );
  return {
    document: parseVideoThemeDocument(stored.document),
    hash: stored.hash,
  };
}

async function _loadAll(): Promise<{
  themes: ThemeSummary[];
  stored: Map<string, StoredTheme>;
}> {
  const themes = await _request<ThemeSummary[]>("/api/themes");
  const stored = await Promise.all(
    themes.map(async (theme) => [theme.id, await _read(theme.id)] as const),
  );
  return { themes, stored: new Map(stored) };
}

/**
 * The showcase's `/api/themes` routes from the browser. Writes send the
 * same-origin headers the routes require; failures throw `ThemeApiError`
 * with the server's status so the UI can explain them.
 */
export const ThemeApi = {
  loadAll: _loadAll,
  read: _read,
  create: (document: VideoThemeDocument) =>
    _request<{ id: string; hash: string }>("/api/themes", {
      method: "POST",
      body: JSON.stringify(document),
    }),
  save: (options: Readonly<{ document: VideoThemeDocument; hash: string }>) =>
    _request<{ hash: string }>(
      `/api/themes/${encodeURIComponent(options.document.id)}`,
      {
        method: "PUT",
        headers: { "If-Match": options.hash },
        body: JSON.stringify(options.document),
      },
    ),
};
