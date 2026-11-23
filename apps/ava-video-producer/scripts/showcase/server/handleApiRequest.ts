import { z } from "zod";
import {
  getAssetReferencesFromPlan,
  getPublicAssetPathFromAsset,
} from "../../lib/planHelpers/planHelpers";
import { type StockFingerprint } from "../../stock/StockFingerprintModule/StockFingerprintModule";
import { type createExportJobs } from "../createExportJobs/createExportJobs";
import {
  THEME_FILE_MAX_BYTES,
  type ThemeStore,
} from "../createThemeStore/createThemeStore";
import { handleThemeRequest } from "../handleThemeRequest/handleThemeRequest";
import {
  type CaptionFilesResult,
  makeCaptionFilesFromRequest,
} from "../makeCaptionFilesFromRequest/makeCaptionFilesFromRequest";
import { withNarration } from "../narrationHelpers/narrationHelpers";
import { appRoot, ShowcaseFilms } from "../ShowcaseFilms/ShowcaseFilms";
import { StaticFiles } from "../StaticFiles/StaticFiles";
import type { Film } from "../../../src/showcase/showcase.types";
import type { IncomingMessage, ServerResponse } from "node:http";

async function _onReadRequest({
  request,
  response,
  pathname,
  jobs,
  media,
}: Readonly<{
  request: IncomingMessage;
  response: ServerResponse;
  pathname: string;
  jobs: ApiContext["jobs"];
  media: ApiContext["media"];
}>): Promise<void> {
  const filmMatch =
    /^\/api\/films\/([^/]+)(?:\/(transcript\.txt|captions\.srt))?$/.exec(
      pathname,
    );
  if (filmMatch) {
    await _onFilmRequest({ response, match: filmMatch, media });
    return;
  }
  const exportMatch = /^\/api\/exports\/([a-f0-9-]+)(\/download)?$/.exec(
    pathname,
  );
  if (
    !exportMatch ||
    !(await _onExportJobRequest({
      request,
      response,
      match: exportMatch,
      jobs,
    }))
  ) {
    response.writeHead(404).end();
  }
}
async function _startExport({
  filmRequest,
  context,
  response,
}: Readonly<{
  filmRequest: NonNullable<Awaited<ReturnType<typeof _readFilmRequest>>>;
  context: ApiContext;
  response: ServerResponse;
}>): Promise<void> {
  const film = await ShowcaseFilms.load({
    id: filmRequest.id,
    rawOptions: filmRequest.options,
  });
  ShowcaseFilms.assertExportable(film);
  const fingerprint =
    film.kind === "stock"
      ? await ShowcaseFilms.getFingerprintFromFilm(film)
      : undefined;
  const key =
    fingerprint?.configurationHash ??
    JSON.stringify({ generation: context.getGeneration(), film });
  _sendJson({
    response,
    status: 202,
    body: context.jobs.start(key, { film, fingerprint }),
  });
}
/** What one queued export render needs: the film and its stock evidence. */
export type ExportJobInput = {
  film: Film;
  fingerprint?: StockFingerprint;
};
/** The serialized export renders the showcase server starts and reports. */
export type ExportJobs = ReturnType<typeof createExportJobs<ExportJobInput>>;
/** The server state the `/api/` routes read, shared with the static routes. */
export type ApiContext = {
  themeStore: ThemeStore;
  jobs: ExportJobs;
  /** Served path to file path for the media of every film opened so far. */
  media: Map<string, string>;
  getGeneration: () => number;
};
type FilmRequestOptions = {
  request: IncomingMessage;
  response: ServerResponse;
};
const requestSchema = z.strictObject({
  id: z.string().max(80),
  options: z.record(z.string(), z.unknown()).optional(),
});
/**
 * An export body: the film id, its options, and a theme patch of up to 256 KB.
 */
const EXPORT_BODY_MAX_BYTES = 8192 + THEME_FILE_MAX_BYTES;
function _sendJson(
  options: Readonly<{
    response: ServerResponse;
    status: number;
    body: unknown;
  }>,
): void {
  options.response
    .writeHead(options.status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    })
    .end(JSON.stringify(options.body));
}
async function _getPlayerFilmFromId({
  id,
  media,
}: Readonly<{
  id: string;
  media: Map<string, string>;
}>): Promise<Film> {
  const film = await withNarration(await ShowcaseFilms.load({ id }));
  const assets = film.plan
    ? getAssetReferencesFromPlan(film.plan)
    : film.kind === "helper"
      ? film.assets
      : [];
  await Promise.all(
    assets.map(async (asset) => {
      return media.set(
        `/${asset}`,
        await getPublicAssetPathFromAsset({
          root: appRoot,
          asset,
        }),
      );
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
  request,
  response,
}: Readonly<FilmRequestOptions>): Promise<
  z.infer<typeof requestSchema> | undefined
> {
  if (request.headers.origin !== `http://${request.headers.host}`) {
    _sendJson({
      response,
      status: 403,
      body: { message: "Use the local showcase to request a render." },
    });
    return undefined;
  }
  let body = "";
  request.setEncoding("utf8");
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > EXPORT_BODY_MAX_BYTES) {
      _sendJson({
        response,
        status: 413,
        body: { message: "Request too large" },
      });
      return undefined;
    }
  }
  try {
    return requestSchema.parse(JSON.parse(body));
  } catch (error) {
    console.error("Invalid showcase film request:", error);
    _sendJson({
      response,
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
  response,
  result,
  fileName,
}: Readonly<{
  response: ServerResponse;
  result: CaptionFilesResult<Film>;
  fileName: "transcript.txt" | "captions.srt";
}>): void {
  if (result.status === 404) {
    response.writeHead(404).end();
    return;
  }
  if (result.status === 400) {
    _sendJson({
      response,
      status: 400,
      body: {
        message:
          "Invalid theme or camera options for this film. Check the showcase terminal.",
      },
    });
    return;
  }
  response
    .writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.film.id}-${fileName}"`,
    })
    .end(
      fileName === "captions.srt" ? result.files.srt : result.files.transcript,
    );
}
/** Captions timed by the same options and theme an export sends. */
async function _captionRequest(
  options: Readonly<FilmRequestOptions>,
): Promise<void> {
  const filmRequest = await _readFilmRequest(options);
  if (filmRequest) {
    const result = await makeCaptionFilesFromRequest({
      id: filmRequest.id,
      options: filmRequest.options,
      load: ShowcaseFilms.load,
    });
    _sendCaptionFile({
      response: options.response,
      result,
      fileName: "captions.srt",
    });
  }
}
async function _onExportRequest(
  options: Readonly<
    FilmRequestOptions & {
      context: Readonly<ApiContext>;
    }
  >,
): Promise<void> {
  const { response, context } = options;
  const filmRequest = await _readFilmRequest(options);
  if (!filmRequest) {
    return;
  }
  try {
    await _startExport({ filmRequest, context, response });
  } catch (error) {
    const busy =
      error instanceof Error && error.message.includes("already rendering");
    if (!busy) {
      console.error("Invalid showcase export request:", error);
    }
    _sendJson({
      response,
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
  response,
  match,
  media,
}: Readonly<{
  response: ServerResponse;
  match: Readonly<RegExpExecArray>;
  media: Map<string, string>;
}>): Promise<void> {
  if (!match[2]) {
    _sendJson({
      response,
      status: 200,
      body: await _getPlayerFilmFromId({
        id: match[1],
        media,
      }),
    });
    return;
  }
  // A plain link downloads the saved film; a draft's captions come from
  // `POST /api/captions` with the export's options.
  const result = await makeCaptionFilesFromRequest({
    id: match[1],
    options: undefined,
    load: ShowcaseFilms.load,
  });
  _sendCaptionFile({
    response,
    result,
    fileName: match[2] === "captions.srt" ? "captions.srt" : "transcript.txt",
  });
}
/** Answers an export job's status or download; false when it is unknown. */
async function _onExportJobRequest({
  request,
  response,
  match,
  jobs,
}: Readonly<{
  request: IncomingMessage;
  response: ServerResponse;
  match: Readonly<RegExpExecArray>;
  jobs: ExportJobs;
}>): Promise<boolean> {
  if (match[2]) {
    const file = jobs.file(match[1]);
    if (file) {
      await StaticFiles.streamFile({
        req: request,
        res: response,
        file,
        download: true,
      });
    }
    return Boolean(file);
  }
  const job = jobs.get(match[1]);
  if (job) {
    _sendJson({ response, status: 200, body: job });
  }
  return Boolean(job);
}
/**
 * Routes every `/api/` request of the showcase server: themes, exports,
 * captions, and films. It answers the response itself, with a 404 for a path
 * that matches no route.
 */
export async function handleApiRequest({
  request,
  response,
  pathname,
  context,
}: Readonly<{
  request: IncomingMessage;
  response: ServerResponse;
  pathname: string;
  context: Readonly<ApiContext>;
}>): Promise<void> {
  const { themeStore, jobs, media } = context;
  if (
    await handleThemeRequest({
      req: request,
      res: response,
      pathname,
      store: themeStore,
    })
  ) {
    return;
  }
  if (pathname === "/api/exports" && request.method === "POST") {
    await _onExportRequest({ request, response, context });
    return;
  }
  if (pathname === "/api/captions" && request.method === "POST") {
    await _captionRequest({ request, response });
    return;
  }
  if (!["GET", "HEAD"].includes(request.method ?? "")) {
    response.writeHead(405).end();
    return;
  }
  await _onReadRequest({ request, response, pathname, jobs, media });
}
