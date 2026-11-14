import { randomUUID } from "node:crypto";
import { watch } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import { z } from "zod";
import { buildAtlas } from "../buildAtlas/buildAtlas.mjs";
import { assetReferences, publicAsset } from "../lib/planHelpers";
import { requireLicense } from "../require-license.mjs";
import { buildStockContracts } from "../stock/buildStockContracts/buildStockContracts";
import { type StockFingerprint } from "../stock/StockFingerprintModule/StockFingerprintModule";
import { buildLivePlayers } from "./build";
import {
  type CaptionFilesResult,
  createCaptionFilesFromRequest,
} from "./captionFileOptions/captionFileOptions";
import { createExportJobs } from "./createExportJobs/createExportJobs";
import { withNarration } from "./narrationHelpers/narrationHelpers";
import { renderFilm } from "./render";
import { appRoot, ShowcaseFilms, PLANS } from "./ShowcaseFilms/ShowcaseFilms";
import { servedFile, streamFile } from "./staticFileHelpers/staticFileHelpers";
import { handleThemeRequest } from "./themeRoutes/themeRoutes";
import {
  createThemeStore,
  THEME_FILE_MAX_BYTES,
} from "./themeStore/themeStore";
import type { Film } from "../../src/showcase/showcase.types";

requireLicense();

/** Brand files from `public/` that showcase pages load, by served path. */
const PUBLIC_FILES: Record<string, string> = {
  "/fonts/figtree-latin.woff2": "fonts/figtree-latin.woff2",
  "/brand/avandar-logo.png": "avandar/logo.png",
};
const clients = new Set<ServerResponse>();
const media = new Map<string, string>();
const session = randomUUID();
let generation = 0;
const publish = async () => {
  await buildStockContracts(appRoot);
  generation += 1;
  clients.forEach((client) =>
    client.write(`data: ${session}:${generation}\n\n`),
  );
};
const live = await buildLivePlayers(publish);
const atlas = await buildAtlas({
  watch: true,
  onBuilt: publish,
  outputDirectory: live.output,
});
let planTimer: ReturnType<typeof setTimeout> | undefined;
const plansWatcher = watch(
  path.join(appRoot, "storyboards"),
  { recursive: true },
  () => {
    clearTimeout(planTimer);
    planTimer = setTimeout(() => {
      void Promise.all(Object.keys(PLANS).map((id) => ShowcaseFilms.load(id)))
        .then(publish)
        .catch((error) => console.error("Storyboard not ready:", error));
    }, 200);
  },
);
const themeStore = createThemeStore({
  directory: path.join(appRoot, "themes"),
});
let themeTimer: ReturnType<typeof setTimeout> | undefined;
// A theme saved here or edited on disk republishes, so open galleries reload it.
const themesWatcher = watch(
  path.join(appRoot, "themes"),
  (_event, filename) => {
    if (!filename?.endsWith(".theme.json") || filename.startsWith(".")) {
      return;
    }
    clearTimeout(themeTimer);
    themeTimer = setTimeout(() => {
      publish().catch((error) => console.error("Theme reload failed:", error));
    }, 200);
  },
);
const jobs: ReturnType<
  typeof createExportJobs<{ film: Film; fingerprint?: StockFingerprint }>
> = createExportJobs<{ film: Film; fingerprint?: StockFingerprint }>(
  async ({ input: { film, fingerprint }, directoryId: id, progress }) => {
    const release = ShowcaseFilms.retainContracts(film);
    try {
      return await renderFilm(
        await withNarration(film),
        id,
        progress,
        fingerprint?.sourceHash,
      );
    } finally {
      await release();
    }
  },
);
const requestSchema = z.strictObject({
  id: z.string().max(80),
  options: z.record(z.string(), z.unknown()).optional(),
});
/** An export body: the film id, its options, and a theme patch of up to 256 KB. */
const EXPORT_BODY_MAX_BYTES = 8192 + THEME_FILE_MAX_BYTES;

function json(res: ServerResponse, status: number, body: unknown) {
  res
    .writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    })
    .end(JSON.stringify(body));
}
async function filmForPlayer(id: string) {
  const film = await withNarration(await ShowcaseFilms.load(id));
  const assets = film.plan
    ? assetReferences(film.plan)
    : film.kind === "helper"
      ? film.assets
      : [];
  await Promise.all(
    assets.map(async (asset) =>
      media.set(`/${asset}`, await publicAsset(appRoot, asset)),
    ),
  );
  return film;
}
/**
 * The film id and options of an export or caption request, read under the
 * same origin check, byte cap, and strict schema. Answers the request itself
 * and returns undefined when the body is refused.
 */
async function readFilmRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<z.infer<typeof requestSchema> | undefined> {
  if (req.headers.origin !== `http://${req.headers.host}`) {
    json(res, 403, { message: "Use the local showcase to request a render." });
    return undefined;
  }
  let body = "";
  req.setEncoding("utf8");
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > EXPORT_BODY_MAX_BYTES) {
      json(res, 413, { message: "Request too large" });
      return undefined;
    }
  }
  try {
    return requestSchema.parse(JSON.parse(body));
  } catch (error) {
    console.error("Invalid showcase film request:", error);
    json(res, 400, {
      message: "Invalid film or export options. Check the showcase terminal.",
    });
    return undefined;
  }
}
/** Sends a transcript or caption file, or the status its request earned. */
function sendCaptionFile(
  res: ServerResponse,
  result: CaptionFilesResult<Film>,
  fileName: "transcript.txt" | "captions.srt",
) {
  if (result.status === 404) {
    res.writeHead(404).end();
    return;
  }
  if (result.status === 400) {
    json(res, 400, {
      message:
        "Invalid theme or camera options for this film. Check the showcase terminal.",
    });
    return;
  }
  res
    .writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.film.id}-${fileName}"`,
    })
    .end(
      fileName === "captions.srt" ? result.files.srt : result.files.transcript,
    );
}
/** Captions timed by the same options and theme an export sends. */
async function captionRequest(req: IncomingMessage, res: ServerResponse) {
  const request = await readFilmRequest(req, res);
  if (request) {
    const result = await createCaptionFilesFromRequest({
      id: request.id,
      options: request.options,
      load: ShowcaseFilms.load,
    });
    sendCaptionFile(res, result, "captions.srt");
  }
}
async function exportRequest(req: IncomingMessage, res: ServerResponse) {
  const request = await readFilmRequest(req, res);
  if (!request) {
    return;
  }
  try {
    const film = await ShowcaseFilms.load(request.id, request.options);
    ShowcaseFilms.assertExportable(film);
    const fingerprint =
      film.kind === "stock"
        ? await ShowcaseFilms.getFingerprintFromFilm(film)
        : undefined;
    const key =
      fingerprint?.configurationHash ?? JSON.stringify({ generation, film });
    json(res, 202, jobs.start(key, { film, fingerprint }));
  } catch (error) {
    const busy =
      error instanceof Error && error.message.includes("already rendering");
    if (!busy) {
      console.error("Invalid showcase export request:", error);
    }
    json(res, busy ? 409 : 400, {
      message: busy
        ? "Another film is already rendering. Try again when it finishes."
        : "Invalid film or export options. Check the showcase terminal.",
    });
  }
}
async function api(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
) {
  if (await handleThemeRequest({ req, res, pathname, store: themeStore })) {
    return;
  }
  if (pathname === "/api/exports" && req.method === "POST") {
    await exportRequest(req, res);
    return;
  }
  if (pathname === "/api/captions" && req.method === "POST") {
    await captionRequest(req, res);
    return;
  }
  if (!["GET", "HEAD"].includes(req.method ?? "")) {
    res.writeHead(405).end();
    return;
  }
  const filmMatch =
    /^\/api\/films\/([^/]+)(?:\/(transcript\.txt|captions\.srt))?$/.exec(
      pathname,
    );
  if (filmMatch) {
    if (!filmMatch[2]) {
      json(res, 200, await filmForPlayer(filmMatch[1]));
      return;
    }
    // A plain link downloads the saved film; a draft's captions come from
    // `POST /api/captions` with the export's options.
    const result = await createCaptionFilesFromRequest({
      id: filmMatch[1],
      options: undefined,
      load: ShowcaseFilms.load,
    });
    sendCaptionFile(
      res,
      result,
      filmMatch[2] === "captions.srt" ? "captions.srt" : "transcript.txt",
    );
    return;
  }
  const exportMatch = /^\/api\/exports\/([a-f0-9-]+)(\/download)?$/.exec(
    pathname,
  );
  if (exportMatch) {
    if (exportMatch[2]) {
      const file = jobs.file(exportMatch[1]);
      if (file) {
        await streamFile(req, res, file, true);
        return;
      }
    } else {
      const job = jobs.get(exportMatch[1]);
      if (job) {
        json(res, 200, job);
        return;
      }
    }
  }
  res.writeHead(404).end();
}
const server = createServer(async (req, res) => {
  try {
    if (
      !["localhost", "127.0.0.1"].includes(
        new URL(`http://${req.headers.host}`).hostname,
      )
    ) {
      res.writeHead(403).end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(req.url ?? "/", `http://${req.headers.host}`).pathname,
    );
    if (pathname.startsWith("/api/")) {
      await api(req, res, pathname);
      return;
    }
    if (!["GET", "HEAD"].includes(req.method ?? "")) {
      res.writeHead(405).end();
      return;
    }
    if (pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      res.write(`data: ${session}:${generation}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    const generated = [
      "/live-player.js",
      "/live-player.css",
      "/motion-gallery.js",
      "/motion-gallery.css",
      "/showcase-theme.css",
    ].includes(pathname);
    const file =
      (Object.hasOwn(PUBLIC_FILES, pathname)
        ? path.join(appRoot, "public", PUBLIC_FILES[pathname])
        : media.get(pathname)) ??
      (await servedFile(
        generated ? live.output : path.join(appRoot, "showcase"),
        pathname === "/" ? "index.html" : pathname.slice(1),
      ));
    if (path.extname(file) === ".mp4") {
      res.writeHead(404).end();
      return;
    }
    await streamFile(req, res, file);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.writeHead(404);
    }
    res.end();
  }
});
server.listen(Number(process.env.PORT ?? 4173), "127.0.0.1", () =>
  console.log(`Live showcase: http://localhost:${process.env.PORT ?? 4173}`),
);
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    const port = Number(process.env.PORT ?? 4173);
    console.error(
      `Port ${port} is already in use. Stop the existing server, or run PORT=${port === 65535 ? 4173 : port + 1} pnpm showcase.`,
    );
  } else {
    console.error(error);
  }
  process.exitCode = 1;
  void close();
});
async function close() {
  clearTimeout(planTimer);
  clearTimeout(themeTimer);
  clients.forEach((client) => client.end());
  plansWatcher.close();
  themesWatcher.close();
  server.close();
  await live.dispose();
  await atlas?.dispose();
}
process.once("SIGINT", () => void close());
process.once("SIGTERM", () => void close());
