import { randomUUID } from "node:crypto";
import { watch } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import { requireLicense } from "../../requireLicense";
import { buildStockContracts } from "../../stock/buildStockContracts/buildStockContracts";
import { createExportJobs } from "../createExportJobs/createExportJobs";
import { createThemeStore } from "../createThemeStore/createThemeStore";
import { makeShowcasePathsFromAppRoot } from "../makeShowcasePathsFromAppRoot";
import { withNarration } from "../narrationHelpers/narrationHelpers";
import { renderFilm } from "../render";
import { appRoot, ShowcaseFilms, PLANS } from "../ShowcaseFilms/ShowcaseFilms";
import { SHOWCASE_PUBLIC_FILES } from "../showcaseVitePluginHelpers";
import { servedFile, streamFile } from "../staticFileHelpers/staticFileHelpers";
import { watchShowcase } from "../watchShowcase";
import {
  type ExportJobInput,
  handleApiRequest,
} from "./handleApiRequest/handleApiRequest";

requireLicense();

const clients = new Set<ServerResponse>();
const media = new Map<string, string>();
const session = randomUUID();
let generation = 0;
/** Rebuilds stock contracts, then tells every open page to refresh. */
async function _publish(): Promise<void> {
  await buildStockContracts(appRoot);
  generation += 1;
  clients.forEach((client) => {
    return client.write(`data: ${session}:${generation}\n\n`);
  });
}
const site = await watchShowcase(_publish);
const showcasePaths = makeShowcasePathsFromAppRoot(appRoot);
let planTimer: ReturnType<typeof setTimeout> | undefined;
const plansWatcher = watch(
  path.join(appRoot, "storyboards"),
  { recursive: true },
  () => {
    clearTimeout(planTimer);
    planTimer = setTimeout(() => {
      void Promise.all(
        Object.keys(PLANS).map((id) => {
          return ShowcaseFilms.load(id);
        }),
      )
        .then(_publish)
        .catch((error) => {
          return console.error("Storyboard not ready:", error);
        });
    }, 200);
  },
);
const themeStore = createThemeStore({
  directory: path.join(appRoot, "themes"),
});
let themeTimer: ReturnType<typeof setTimeout> | undefined;
// A theme saved here or edited on disk republishes, so open galleries reload
// it.
const themesWatcher = watch(
  path.join(appRoot, "themes"),
  (_event, filename) => {
    if (!filename?.endsWith(".theme.json") || filename.startsWith(".")) {
      return;
    }
    clearTimeout(themeTimer);
    themeTimer = setTimeout(() => {
      _publish().catch((error) => {
        return console.error("Theme reload failed:", error);
      });
    }, 200);
  },
);
const jobs = createExportJobs<ExportJobInput>(
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
/**
 * The file a static path serves: a brand file from `public/`, approved plan
 * media, a tracked showcase poster, or a page or bundle from the built site.
 */
async function _getStaticFileFromPath(pathname: string): Promise<string> {
  const publicFile = Object.hasOwn(SHOWCASE_PUBLIC_FILES, pathname)
    ? path.join(appRoot, "public", SHOWCASE_PUBLIC_FILES[pathname])
    : undefined;
  const isAsset = pathname.startsWith("/assets/");
  return (
    publicFile ??
    media.get(pathname) ??
    (isAsset
      ? servedFile(showcasePaths.assets, pathname.slice("/assets/".length))
      : servedFile(
          showcasePaths.site,
          pathname === "/" ? "index.html" : pathname.slice(1),
        ))
  );
}
/** Opens the shared source-watch stream for one page. */
function _onEventsRequest(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  });
  res.write(`data: ${session}:${generation}\n\n`);
  clients.add(res);
  req.on("close", () => {
    return clients.delete(res);
  });
}

/** Routes one request to the API, the event stream, or a static file. */
async function _onRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
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
    await handleApiRequest({
      req,
      res,
      pathname,
      context: {
        themeStore,
        jobs,
        media,
        getGeneration: () => {
          return generation;
        },
      },
    });
    return;
  }
  if (!["GET", "HEAD"].includes(req.method ?? "")) {
    res.writeHead(405).end();
    return;
  }
  if (pathname === "/events") {
    _onEventsRequest(req, res);
    return;
  }
  const file = await _getStaticFileFromPath(pathname);
  if (path.extname(file) === ".mp4") {
    res.writeHead(404).end();
    return;
  }
  await streamFile(req, res, file);
}

const server = createServer(async (req, res) => {
  try {
    await _onRequest(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.writeHead(404);
    }
    res.end();
  }
});
server.listen(Number(process.env.PORT ?? 4173), "127.0.0.1", () => {
  return console.log(
    `Live showcase: http://localhost:${process.env.PORT ?? 4173}`,
  );
});
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
  void _close();
});
async function _close(): Promise<void> {
  clearTimeout(planTimer);
  clearTimeout(themeTimer);
  clients.forEach((client) => {
    return client.end();
  });
  plansWatcher.close();
  themesWatcher.close();
  server.close();
  await site.dispose();
}
process.once("SIGINT", () => {
  return void _close();
});
process.once("SIGTERM", () => {
  return void _close();
});
