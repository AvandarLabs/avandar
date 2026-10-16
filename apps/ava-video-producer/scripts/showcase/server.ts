import { randomUUID } from "node:crypto";
import { watch } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import { z } from "zod";
import { buildAtlas } from "../build-motion-gallery.mjs";
import { assetReferences, publicAsset, captionFiles } from "../lib/planHelpers";
import { requireLicense } from "../require-license.mjs";
import { buildLivePlayers } from "./build";
import { createExportJobs } from "./createExportJobs/createExportJobs";
import { appRoot, loadFilm, plans } from "./loadFilm/loadFilm";
import { withNarration } from "./narrationHelpers/narrationHelpers";
import { renderFilm } from "./render";
import { servedFile, streamFile } from "./staticFileHelpers/staticFileHelpers";
import type { Film } from "../../src/showcase/showcase.types";

requireLicense();

const clients = new Set<ServerResponse>();
const media = new Map<string, string>();
const session = randomUUID();
let generation = 0;
const publish = async () => {
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
const plansWatcher = watch(path.join(appRoot, "storyboards"), () => {
  clearTimeout(planTimer);
  planTimer = setTimeout(() => {
    void Promise.all(Object.keys(plans).map((id) => loadFilm(id)))
      .then(publish)
      .catch((error) => console.error("Storyboard not ready:", error));
  }, 200);
});
const jobs = createExportJobs<Film>(async (film, id, progress) =>
  renderFilm(await withNarration(film), id, progress),
);
const requestSchema = z
  .object({
    id: z.string().max(80),
    options: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

function json(res: ServerResponse, status: number, body: unknown) {
  res
    .writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    })
    .end(JSON.stringify(body));
}
async function filmForPlayer(id: string) {
  const film = await withNarration(await loadFilm(id));
  await Promise.all(
    (film.plan ? assetReferences(film.plan) : []).map(async (asset) =>
      media.set(`/${asset}`, await publicAsset(appRoot, asset)),
    ),
  );
  return film;
}
async function exportRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.headers.origin !== `http://${req.headers.host}`) {
    json(res, 403, { message: "Use the local showcase to request a render." });
    return;
  }
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 8192) {
      json(res, 413, { message: "Request too large" });
      return;
    }
  }
  try {
    const request = requestSchema.parse(JSON.parse(body));
    const film = await loadFilm(request.id, request.options);
    json(res, 202, jobs.start(JSON.stringify({ generation, film }), film));
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
  if (pathname === "/api/exports" && req.method === "POST") {
    await exportRequest(req, res);
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
    const film = await loadFilm(filmMatch[1]);
    if (!film.plan) {
      res.writeHead(404).end();
      return;
    }
    const files = captionFiles(film.plan);
    res
      .writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${film.id}-${filmMatch[2]}"`,
      })
      .end(filmMatch[2] === "captions.srt" ? files.srt : files.transcript);
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
      "/showcase-theme.css",
    ].includes(pathname);
    const file =
      (pathname === "/fonts/geist-latin.woff2"
        ? path.join(appRoot, "public/fonts/geist-latin.woff2")
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
  clients.forEach((client) => client.end());
  plansWatcher.close();
  server.close();
  await live.dispose();
  await atlas?.dispose();
}
process.once("SIGINT", () => void close());
process.once("SIGTERM", () => void close());
