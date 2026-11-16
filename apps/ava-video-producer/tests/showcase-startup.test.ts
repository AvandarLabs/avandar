import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { request as sendRequest } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getLocalAssetPathsFromHtml } from "./getLocalAssetPathsFromHtml";
import {
  buildLicenseFixture,
  LICENSE_FIXTURE,
  licenseTestEnvironment,
} from "./license-fixture";

/** Reads every built showcase page and bundle, and the product bundle. */
async function _readBuiltShowcaseFiles(): Promise<string[]> {
  const appRoot = fileURLToPath(new URL("../", import.meta.url));
  const site = path.join(appRoot, "out/showcase/browser");
  const builtFiles = (await readdir(site, { recursive: true }))
    .map((filename) => path.join(site, filename))
    .filter((filename) => /\.(?:html|js|css)$/.test(filename));
  assert.ok(
    builtFiles.some((filename) => filename.endsWith(".js")),
    "The showcase build emitted no scripts",
  );
  return Promise.all(
    [...builtFiles, path.join(appRoot, "out/showcase/product/product.js")].map(
      (filename) => readFile(filename, "utf8"),
    ),
  );
}

function _assertNoLicenseLeak(text: string): void {
  assert.ok(!text.includes(LICENSE_FIXTURE.privateKey), "Private key leaked");
  assert.ok(
    !text.includes(LICENSE_FIXTURE.unrelatedSecret),
    "Unrelated dotenv secret leaked",
  );
}

test("an occupied showcase port exits with actionable guidance and no build errors", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "showcase-license-"));
  const keyFile = path.join(directory, ".env.local");
  await writeFile(keyFile, buildLicenseFixture());
  const occupied = createServer();
  occupied.listen(0, "127.0.0.1");
  await once(occupied, "listening");
  const address = occupied.address();
  assert.ok(address && typeof address !== "string");
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/yaml/registerYaml.ts",
      "scripts/showcase/server/server.ts",
    ],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: { ...licenseTestEnvironment(keyFile), PORT: String(address.port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  // The server builds the product and every page before it listens.
  const timeout = setTimeout(() => child.kill("SIGKILL"), 120_000);
  try {
    const [code, signal] = await once(child, "close");
    assert.equal(signal, null, output);
    assert.equal(code, 1, output);
    assert.match(output, /PORT=\d+ pnpm showcase/);
    assert.doesNotMatch(
      output,
      /\[WARNING\]|\[ERROR\]|Cannot rebuild|at Server\./,
    );
    const bundles = await _readBuiltShowcaseFiles();
    [...bundles, output].forEach(_assertNoLicenseLeak);
  } finally {
    clearTimeout(timeout);
    child.kill("SIGKILL");
    await new Promise<void>((resolve) => occupied.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});

const APP_ROOT = fileURLToPath(new URL("../", import.meta.url));

/** Every showcase page, by the path a browser requests. */
const PAGE_PATHS = [
  "/",
  "/index.html",
  "/productions.html",
  "/compositions.html",
  "/live.html",
  "/motion.html",
] as const;

/**
 * Paths outside the bounded showcase routes. Each must be refused without
 * reading the repository, private `.videos/` projects, or app source.
 */
const REFUSED_PATHS = [
  "/package.json",
  "/AGENTS.md",
  "/.env.local",
  "/.videos/project/storyboard.json",
  "/%2e%2e/package.json",
  "/%2e%2e/%2e%2e/package.json",
  "/assets/%2e%2e/%2e%2e/package.json",
  "/src/showcase/LivePlayer.tsx",
  "/showcase/index.html",
  "/node_modules/react/package.json",
  "/scripts/showcase/server/server.ts",
  "/out/showcase/exports/",
  "/not-a-page.html",
] as const;

type ShowcaseRequest = {
  port: number;
  pathname: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

/** Sends one raw request, leaving the path exactly as written. */
function _request({
  port,
  pathname,
  method = "GET",
  headers,
  body: requestBody,
}: Readonly<ShowcaseRequest>): Promise<{
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const outgoing = sendRequest(
      {
        host: "127.0.0.1",
        port,
        path: pathname,
        method,
        headers: { host: `localhost:${port}`, ...headers },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body,
          });
        });
      },
    );
    outgoing.on("error", reject);
    outgoing.end(requestBody);
  });
}

async function _findFreePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return address.port;
}

/** Starts `pnpm showcase`'s server and resolves once it listens. */
async function _startShowcase(
  port: number,
  keyFile: string,
): Promise<ChildProcess> {
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/yaml/registerYaml.ts",
      "scripts/showcase/server/server.ts",
    ],
    {
      cwd: APP_ROOT,
      env: { ...licenseTestEnvironment(keyFile), PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      output += chunk;
      if (output.includes("Live showcase:")) {
        resolve();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("close", (code) => {
      reject(new Error(`Showcase exited with ${code}:\n${output}`));
    });
  });
  return child;
}

async function _verifyPages(port: number): Promise<void> {
  // Every request is an independent GET, so the pages load in parallel.
  await Promise.all(
    PAGE_PATHS.map(async (pathname) => {
      const page = await _request({ port, pathname });
      assert.equal(page.status, 200, pathname);
      assert.match(
        String(page.headers["content-type"]),
        /^text\/html/,
        pathname,
      );
      await Promise.all(
        getLocalAssetPathsFromHtml(page.body).map(async (asset) => {
          const response = await _request({ port, pathname: asset });
          assert.equal(response.status, 200, `${pathname} loads ${asset}`);
          assert.ok(response.body.length > 0, `${asset} is empty`);
        }),
      );
    }),
  );
}

async function _verifyStaticRoutes(port: number): Promise<void> {
  await Promise.all(
    [
      "/brand/avandar-logo.png",
      "/fonts/figtree-latin.woff2",
      "/assets/title-study-poster.jpg",
      "/assets/avandar-home-poster.jpg?v=83129cdbb0e7",
    ].map(async (pathname) => {
      const response = await _request({ port, pathname });
      assert.equal(response.status, 200, pathname);
    }),
  );
  await Promise.all(
    REFUSED_PATHS.map(async (pathname) => {
      const response = await _request({ port, pathname });
      assert.equal(response.status, 404, pathname);
    }),
  );
  const foreignHost = await _request({
    port,
    pathname: "/",
    headers: { host: "example.com" },
  });
  assert.equal(foreignHost.status, 403);
  const post = await _request({
    port,
    pathname: "/index.html",
    method: "POST",
  });
  assert.equal(post.status, 405);
}

async function _verifyEvents(port: number): Promise<void> {
  const response = await new Promise<string>((resolve, reject) => {
    const outgoing = sendRequest(
      {
        host: "127.0.0.1",
        port,
        path: "/events",
        headers: { host: `localhost:${port}` },
      },
      (incoming) => {
        assert.equal(incoming.statusCode, 200);
        assert.match(
          String(incoming.headers["content-type"]),
          /text\/event-stream/,
        );
        incoming.setEncoding("utf8");
        incoming.once("data", (chunk: string) => {
          outgoing.destroy();
          resolve(chunk);
        });
      },
    );
    outgoing.on("error", reject);
    outgoing.end();
  });
  assert.match(response, /^data: [0-9a-f-]{36}:\d+\n\n$/);
}

async function _verifyExportValidation(port: number): Promise<void> {
  const origin = `http://localhost:${port}`;
  const post = (body: string, headers: Record<string, string> = { origin }) =>
    _request({ port, pathname: "/api/exports", method: "POST", headers, body });
  assert.equal((await post('{"id":"title-study"}', {})).status, 403);
  assert.equal((await post("{not json")).status, 400);
  assert.equal((await post('{"id":"title-study","extra":true}')).status, 400);
  assert.equal((await post('{"id":"not-a-film"}')).status, 400);
  assert.equal((await post(`{"id":"${"x".repeat(300_000)}"}`)).status, 413);
  const captions = await _request({
    port,
    pathname: "/api/captions",
    method: "POST",
    body: '{"id":"title-study"}',
  });
  assert.equal(captions.status, 403);
  const unknownJob = "/api/exports/00000000-0000-0000-0000-000000000000";
  assert.equal((await _request({ port, pathname: unknownJob })).status, 404);
  assert.equal(
    (await _request({ port, pathname: `${unknownJob}/download` })).status,
    404,
  );
  assert.equal(
    (await _request({ port, pathname: "/api/unknown", method: "PUT" })).status,
    405,
  );
  const film = await _request({ port, pathname: "/api/films/title-study" });
  assert.equal(film.status, 200);
  assert.equal(JSON.parse(film.body).id, "title-study");
  assert.equal(
    (await _request({ port, pathname: "/api/films/not-a-film" })).status,
    404,
  );
}

test("showcase serves its pages, players, and API through bounded local routes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "showcase-routes-"));
  const keyFile = path.join(directory, ".env.local");
  await writeFile(keyFile, buildLicenseFixture());
  const port = await _findFreePort();
  let child: ChildProcess | undefined;
  try {
    child = await _startShowcase(port, keyFile);
    await _verifyPages(port);
    await _verifyStaticRoutes(port);
    await _verifyEvents(port);
    await _verifyExportValidation(port);
  } finally {
    if (child && child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
