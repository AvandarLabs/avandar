import { ThemeApiError } from "./ThemeApiError";
import { ThemeApiResponseParsers } from "./ThemeApiResponseParsers";
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
/**
 * A theme file and the hash of its bytes, sent back as `If-Match` when saving.
 */
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
async function _request<Body>({
  url,
  parse,
  init = {},
}: Readonly<{
  url: string;
  parse: (value: unknown) => Body;
  init?: RequestInit;
}>): Promise<Body> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => {
      return {};
    });
    const { message, issues } = _errorBody(errorBody);
    throw new ThemeApiError(response.status, message, issues);
  }
  const value: unknown = await response.json().catch(() => {
    return {};
  });
  return parse(value);
}
async function _read(id: string): Promise<StoredTheme> {
  return _request({
    url: `/api/themes/${encodeURIComponent(id)}`,
    parse: ThemeApiResponseParsers.stored,
  });
}
async function _loadAll(): Promise<{
  themes: ThemeSummary[];
  stored: Map<string, StoredTheme>;
}> {
  const themes = await _request({
    url: "/api/themes",
    parse: ThemeApiResponseParsers.list,
  });
  const stored = await Promise.all(
    themes.map(async (theme) => {
      return [theme.id, await _read(theme.id)] as const;
    }),
  );
  return { themes, stored: new Map(stored) };
}
/**
 * The showcase's `/api/themes` routes from the browser. Writes send the
 * same-origin headers the routes require; failures throw `ThemeApiError`
 * with the server's status so the UI can explain them.
 */
export const ThemeApi = {
  /**
   * Returns theme summaries and their stored documents for the editor library.
   */
  loadAll: _loadAll,
  /** Returns one stored theme document and its concurrency hash. */
  read: _read,
  /** Creates a theme and returns its ID and stored concurrency hash. */
  create: (
    document: VideoThemeDocument,
  ): Promise<{
    id: string;
    hash: string;
  }> => {
    return _request<{
      id: string;
      hash: string;
    }>({
      url: "/api/themes",
      parse: ThemeApiResponseParsers.created,
      init: {
        method: "POST",
        body: JSON.stringify(document),
      },
    });
  },
  /** Saves a theme against its concurrency hash and returns the new hash. */
  save: (
    options: Readonly<{
      document: VideoThemeDocument;
      hash: string;
    }>,
  ): Promise<{
    hash: string;
  }> => {
    return _request<{
      hash: string;
    }>({
      url: `/api/themes/${encodeURIComponent(options.document.id)}`,
      parse: ThemeApiResponseParsers.saved,
      init: {
        method: "PUT",
        headers: { "If-Match": options.hash },
        body: JSON.stringify(options.document),
      },
    });
  },
};
