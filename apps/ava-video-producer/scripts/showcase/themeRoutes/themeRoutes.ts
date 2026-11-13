import { createVideoThemeJsonSchema } from "../../../src/videoTheme/videoThemeSchema/videoThemeSchema";
import {
  THEME_FILE_MAX_BYTES,
  ThemeStoreError,
  type ThemeStore,
} from "../themeStore/themeStore";
import type { IncomingMessage, ServerResponse } from "node:http";

const THEME_ROUTE = /^\/api\/themes(?:\/([^/]+))?$/;

type ThemeRequest = Readonly<{
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
  store: ThemeStore;
}>;

function _send(res: ServerResponse, status: number, body: unknown): void {
  res
    .writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    })
    .end(JSON.stringify(body));
}

async function _readJsonBody(req: IncomingMessage): Promise<unknown> {
  let body = "";
  req.setEncoding("utf8");
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > THEME_FILE_MAX_BYTES) {
      throw new ThemeStoreError(413, "Themes are limited to 256 KB");
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new ThemeStoreError(400, "The request body is not valid JSON");
  }
}

function _assertSameOrigin(req: IncomingMessage): void {
  if (req.headers.origin !== `http://${req.headers.host}`) {
    throw new ThemeStoreError(403, "Use the local showcase to change themes.");
  }
}

async function _route(
  { req, res, store }: ThemeRequest,
  id: string | undefined,
): Promise<void> {
  const method = req.method ?? "GET";
  if (id === undefined && method === "GET") {
    return _send(res, 200, await store.list());
  }
  if (id === undefined && method === "POST") {
    _assertSameOrigin(req);
    const stored = await store.create(await _readJsonBody(req));
    return _send(res, 201, { id: stored.document.id, hash: stored.hash });
  }
  if (id === "schema.json" && method === "GET") {
    return _send(res, 200, createVideoThemeJsonSchema());
  }
  if (id !== undefined && method === "GET") {
    return _send(res, 200, await store.read(id));
  }
  if (id !== undefined && method === "PUT") {
    _assertSameOrigin(req);
    const ifMatch = req.headers["if-match"];
    if (typeof ifMatch !== "string") {
      throw new ThemeStoreError(428, "Send the theme's hash in If-Match");
    }
    const stored = await store.save(id, await _readJsonBody(req), ifMatch);
    return _send(res, 200, { hash: stored.hash });
  }
  res.writeHead(405).end();
}

/**
 * Serves `/api/themes`: list, read, the JSON Schema, create (POST), and save
 * (PUT with `If-Match`). Writes require a same-origin request. Returns false
 * for any other path so the showcase server can try its other routes.
 */
export async function handleThemeRequest(
  request: ThemeRequest,
): Promise<boolean> {
  const match = THEME_ROUTE.exec(request.pathname);
  if (!match) {
    return false;
  }
  try {
    await _route(request, match[1]);
  } catch (error) {
    if (error instanceof ThemeStoreError) {
      _send(request.res, error.status, {
        message: error.message,
        issues: error.issues,
      });
    } else {
      console.error("Theme request failed:", error);
      _send(request.res, 500, {
        message: "The theme request failed. Check the showcase terminal.",
      });
    }
  }
  return true;
}
