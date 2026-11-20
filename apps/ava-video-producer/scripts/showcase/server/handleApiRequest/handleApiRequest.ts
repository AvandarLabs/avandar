import { z } from "zod";
import {
  assetReferences,
  publicAsset,
} from "../../../lib/planHelpers/planHelpers";
import { type StockFingerprint } from "../../../stock/StockFingerprintModule/StockFingerprintModule";
import {
  type CaptionFilesResult,
  createCaptionFilesFromRequest,
} from "../../createCaptionFilesFromRequest/createCaptionFilesFromRequest";
import { type createExportJobs } from "../../createExportJobs/createExportJobs";
import {
  THEME_FILE_MAX_BYTES,
  type ThemeStore,
} from "../../createThemeStore/createThemeStore";
import { handleThemeRequest } from "../../handleThemeRequest/handleThemeRequest";
import { withNarration } from "../../narrationHelpers/narrationHelpers";
import { appRoot, ShowcaseFilms } from "../../ShowcaseFilms/ShowcaseFilms";
import { streamFile } from "../../staticFileHelpers/staticFileHelpers";
import type { Film } from "../../../../src/showcase/showcase.types";
import type { IncomingMessage, ServerResponse } from "node:http";

/** What one queued export render needs: the film and its stock evidence. */
export type ExportJobInput = { film: Film; fingerprint?: StockFingerprint };

/** The serialized export renders the showcase server starts and reports. */
export type ExportJobs = ReturnType<typeof createExportJobs<ExportJobInput>>;

/** The server state the `/api/` routes read, shared with the static routes. */
export type ApiContext = Readonly<{
  themeStore: ThemeStore;
  jobs: ExportJobs;
  /** Served path to file path for the media of every film opened so far. */
  media: Map<string, string>;
  getGeneration: () => number;
}>;

type FilmRequestOptions = Readonly<{
  req: IncomingMessage;
  res: ServerResponse;
}>;

const requestSchema = z.strictObject({
  id: z.string().max(80),
  options: z.record(z.string(), z.unknown()).optional(),
});
/**
 * An export body: the film id, its options, and a theme patch of up to 256 KB.
 */
const EXPORT_BODY_MAX_BYTES = 8192 + THEME_FILE_MAX_BYTES;

function _sendJson(
  options: Readonly<{ res: ServerResponse; status: number; body: unknown }>,
): void {
  options.res
    .writeHead(options.status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    })
    .end(JSON.stringify(options.body));
}

async function _getPlayerFilmFromId(
  id: string,
  media: Map<string, string>,
): Promise<Film> {
  const film = await withNarration(await ShowcaseFilms.load(id));
  const assets = film.plan
    ? assetReferences(film.plan)
    : film.kind === "helper"
      ? film.assets
      : [];
  await Promise.all(
    assets.map(async (asset) => {
      return media.set(`/${asset}`, await publicAsset(appRoot, asset));
    }),
  );
  return film;
}

/**
 * The film id and options of an export or caption request, read under the
 * same origin check, byte cap, and strict schema. Answers the request itself
 * and returns undefined when the body is refused.
 */
async function _readFilmRequest({
  req,
  res,
}: FilmRequestOptions): Promise<z.infer<typeof requestSchema> | undefined> {
  if (req.headers.origin !== `http://${req.headers.host}`) {
    _sendJson({
      res,
      status: 403,
      body: { message: "Use the local showcase to request a render." },
    });
    return undefined;
  }
  let body = "";
  req.setEncoding("utf8");
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > EXPORT_BODY_MAX_BYTES) {
      _sendJson({ res, status: 413, body: { message: "Request too large" } });
      return undefined;
    }
  }
  try {
    return requestSchema.parse(JSON.parse(body));
  } catch (error) {
    console.error("Invalid showcase film request:", error);
    _sendJson({
      res,
      status: 400,
      body: {
        message: "Invalid film or export options. Check the showcase terminal.",
      },
    });
    return undefined;
  }
}

/** Sends a transcript or caption file, or the status its request earned. */
function _sendCaptionFile({
  res,
  result,
  fileName,
}: Readonly<{
  res: ServerResponse;
  result: CaptionFilesResult<Film>;
  fileName: "transcript.txt" | "captions.srt";
}>): void {
  if (result.status === 404) {
    res.writeHead(404).end();
    return;
  }
  if (result.status === 400) {
    _sendJson({
      res,
      status: 400,
      body: {
        message:
          "Invalid theme or camera options for this film. Check the showcase terminal.",
      },
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
async function _captionRequest(options: FilmRequestOptions): Promise<void> {
  const request = await _readFilmRequest(options);
  if (request) {
    const result = await createCaptionFilesFromRequest({
      id: request.id,
      options: request.options,
      load: ShowcaseFilms.load,
    });
    _sendCaptionFile({ res: options.res, result, fileName: "captions.srt" });
  }
}

async function _onExportRequest(
  options: FilmRequestOptions & Readonly<{ context: ApiContext }>,
): Promise<void> {
  const { res, context } = options;
  const request = await _readFilmRequest(options);
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
      fingerprint?.configurationHash ??
      JSON.stringify({ generation: context.getGeneration(), film });
    _sendJson({
      res,
      status: 202,
      body: context.jobs.start(key, { film, fingerprint }),
    });
  } catch (error) {
    const busy =
      error instanceof Error && error.message.includes("already rendering");
    if (!busy) {
      console.error("Invalid showcase export request:", error);
    }
    _sendJson({
      res,
      status: busy ? 409 : 400,
      body: {
        message: busy
          ? "Another film is already rendering. Try again when it finishes."
          : "Invalid film or export options. Check the showcase terminal.",
      },
    });
  }
}

/** Answers `GET /api/films/<id>` and its transcript and caption downloads. */
async function _onFilmRequest({
  res,
  match,
  media,
}: Readonly<{
  res: ServerResponse;
  match: Readonly<RegExpExecArray>;
  media: Map<string, string>;
}>): Promise<void> {
  if (!match[2]) {
    _sendJson({
      res,
      status: 200,
      body: await _getPlayerFilmFromId(match[1], media),
    });
    return;
  }
  // A plain link downloads the saved film; a draft's captions come from
  // `POST /api/captions` with the export's options.
  const result = await createCaptionFilesFromRequest({
    id: match[1],
    options: undefined,
    load: ShowcaseFilms.load,
  });
  _sendCaptionFile({
    res,
    result,
    fileName: match[2] === "captions.srt" ? "captions.srt" : "transcript.txt",
  });
}

/** Answers an export job's status or download; false when it is unknown. */
async function _onExportJobRequest({
  req,
  res,
  match,
  jobs,
}: Readonly<{
  req: IncomingMessage;
  res: ServerResponse;
  match: Readonly<RegExpExecArray>;
  jobs: ExportJobs;
}>): Promise<boolean> {
  if (match[2]) {
    const file = jobs.file(match[1]);
    if (file) {
      await streamFile(req, res, file, true);
    }
    return Boolean(file);
  }
  const job = jobs.get(match[1]);
  if (job) {
    _sendJson({ res, status: 200, body: job });
  }
  return Boolean(job);
}

/**
 * Routes every `/api/` request of the showcase server: themes, exports,
 * captions, and films. It answers the response itself, with a 404 for a path
 * that matches no route.
 */
export async function handleApiRequest({
  req,
  res,
  pathname,
  context,
}: Readonly<{
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
  context: ApiContext;
}>): Promise<void> {
  const { themeStore, jobs, media } = context;
  if (await handleThemeRequest({ req, res, pathname, store: themeStore })) {
    return;
  }
  if (pathname === "/api/exports" && req.method === "POST") {
    await _onExportRequest({ req, res, context });
    return;
  }
  if (pathname === "/api/captions" && req.method === "POST") {
    await _captionRequest({ req, res });
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
    await _onFilmRequest({ res, match: filmMatch, media });
    return;
  }
  const exportMatch = /^\/api\/exports\/([a-f0-9-]+)(\/download)?$/.exec(
    pathname,
  );
  if (
    !exportMatch ||
    !(await _onExportJobRequest({ req, res, match: exportMatch, jobs }))
  ) {
    res.writeHead(404).end();
  }
}
