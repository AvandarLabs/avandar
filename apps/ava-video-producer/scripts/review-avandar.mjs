import fs from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { context } from "esbuild";
import { buildProduct } from "./build-avandar.mjs";
import { requireLicense } from "./require-license.mjs";

requireLicense();

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const root = path.join(appRoot, "out/component-review");
await fs.mkdir(root, { recursive: true });
const clients = new Set();
const productDirectory = path.join(root, "product");
const review = await context({
  absWorkingDir: appRoot,
  entryPoints: ["avandar-adapter/review.tsx"],
  bundle: true,
  format: "iife",
  outfile: path.join(root, "review.js"),
  loader: { ".woff2": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
  plugins: [
    {
      name: "review-product",
      setup(build) {
        build.onResolve(
          { filter: /generated\/product\.(js|css)$/ },
          (args) => ({
            path: path.join(productDirectory, path.basename(args.path)),
          }),
        );
      },
    },
  ],
});
let generation = 0;
const onBuilt = async () => {
  await review.rebuild();
  generation += 1;
  for (const client of clients) client.write(`data: ${generation}\n\n`);
};
await fs.writeFile(
  path.join(root, "index.html"),
  '<!doctype html><html><head><link rel="icon" href="data:,"><link rel="stylesheet" href="review.css"><style>body{margin:0;background:#486581}</style></head><body><div id="root"></div><script src="review.js"></script><script>let generation;new EventSource("/events").onmessage=event=>{if(generation!==undefined&&generation!==event.data)location.reload();generation=event.data;};</script></body></html>',
);
const buildOnly = process.argv.includes("--build-only");
const product = await buildProduct({
  watch: !buildOnly,
  onBuilt,
  outputDirectory: productDirectory,
});
if (buildOnly) {
  await review.dispose();
} else {
  const port = Number(process.env.PORT || 4175);
  const server = createServer(async (req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(`data: ${generation}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    const file = pathname === "/" ? "index.html" : pathname.slice(1);
    if (!["index.html", "review.js", "review.css"].includes(file)) {
      res.writeHead(404).end();
      return;
    }
    try {
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader(
        "Content-Type",
        file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".js")
            ? "text/javascript"
            : "text/html",
      );
      res.end(await fs.readFile(path.join(root, file)));
    } catch {
      res.writeHead(404).end();
    }
  }).listen(port, "127.0.0.1", () =>
    console.log(
      `Component review (watching product source): http://localhost:${port}`,
    ),
  );
  const close = async () => {
    for (const client of clients) client.end();
    server.close();
    await product.dispose();
    await review.dispose();
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
