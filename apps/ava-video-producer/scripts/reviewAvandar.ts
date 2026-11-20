import fs from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BuildContext, context } from "esbuild";
import { buildProduct } from "./buildProduct/buildProduct";
import { requireLicense } from "./requireLicense";

// `pnpm component:review [--build-only]`: rebuilds the product components and
// adapters on every source change and reloads a local review page.

/** The review page's own script, which reloads on each new generation. */
const REVIEW_PAGE =
  '<!doctype html><html><head><link rel="icon" href="data:,"><link rel="stylesheet" href="review.css"><style>body{margin:0;background:#486581}</style></head><body><div id="root"></div><script src="review.js"></script><script>let generation;new EventSource("/events").onmessage=event=>{if(generation!==undefined&&generation!==event.data)location.reload();generation=event.data;};</script></body></html>';

type ReviewRequest = {
  request: IncomingMessage;
  response: ServerResponse;
  root: string;
  clients: Set<ServerResponse>;
  getGeneration: () => number;
};

/** Bundles `review.tsx` against this command's own product build. */
function _createReviewBundle(options: {
  appRoot: string;
  root: string;
  productDirectory: string;
}): Promise<BuildContext> {
  return context({
    absWorkingDir: options.appRoot,
    entryPoints: ["avandar-adapter/review.tsx"],
    bundle: true,
    format: "iife",
    outfile: path.join(options.root, "review.js"),
    loader: { ".woff2": "dataurl" },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
    plugins: [
      {
        name: "review-product",
        setup: (build) => {
          build.onResolve(
            // Matches the extensionless script import and the stylesheet.
            { filter: /generated\/product(?:\.(js|css))?$/ },
            (args) => {
              return {
                path: path.join(
                  options.productDirectory,
                  args.path.endsWith(".css") ? "product.css" : "product.js",
                ),
              };
            },
          );
        },
      },
    ],
  });
}

function _getContentType(file: string): string {
  return file.endsWith(".css")
    ? "text/css"
    : file.endsWith(".js")
      ? "text/javascript"
      : "text/html";
}

/** Answers one review request: the event stream or a served file. */
async function _onRequest(options: Readonly<ReviewRequest>): Promise<void> {
  const { request, response, clients } = options;
  if (!["GET", "HEAD"].includes(request.method ?? "")) {
    response.writeHead(405).end();
    return;
  }
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (pathname === "/events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    response.write(`data: ${options.getGeneration()}\n\n`);
    clients.add(response);
    request.on("close", () => {
      return clients.delete(response);
    });
    return;
  }
  const file = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!["index.html", "review.js", "review.css"].includes(file)) {
    response.writeHead(404).end();
    return;
  }
  try {
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Content-Type", _getContentType(file));
    response.end(await fs.readFile(path.join(options.root, file)));
  } catch {
    response.writeHead(404).end();
  }
}

/** Stops the server, the product watcher, and the review bundle together. */
function _closeOnSignal(options: {
  server: Server;
  clients: Set<ServerResponse>;
  disposables: ReadonlyArray<BuildContext | undefined>;
}): void {
  const close = async () => {
    options.clients.forEach((client) => {
      return client.end();
    });
    options.server.close();
    await Promise.all(
      options.disposables.map((item) => {
        return item?.dispose();
      }),
    );
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

async function _runReview(isBuildOnly: boolean): Promise<void> {
  const appRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const root = path.join(appRoot, "out/component-review");
  await fs.mkdir(root, { recursive: true });
  const clients = new Set<ServerResponse>();
  const productDirectory = path.join(root, "product");
  const review = await _createReviewBundle({ appRoot, root, productDirectory });
  let generation = 0;
  const onBuilt = async () => {
    await review.rebuild();
    generation += 1;
    clients.forEach((client) => {
      return client.write(`data: ${generation}\n\n`);
    });
  };
  await fs.writeFile(path.join(root, "index.html"), REVIEW_PAGE);
  const product = await buildProduct({
    watch: !isBuildOnly,
    onBuilt,
    outputDirectory: productDirectory,
  });
  if (isBuildOnly) {
    await review.dispose();
    return;
  }
  const port = Number(process.env.PORT || 4175);
  const server = createServer((request, response) => {
    void _onRequest({
      request,
      response,
      root,
      clients,
      getGeneration: () => {
        return generation;
      },
    });
  }).listen(port, "127.0.0.1", () => {
    console.log(
      `Component review (watching product source): http://localhost:${port}`,
    );
  });
  _closeOnSignal({ server, clients, disposables: [product, review] });
}

requireLicense();
await _runReview(process.argv.includes("--build-only"));
