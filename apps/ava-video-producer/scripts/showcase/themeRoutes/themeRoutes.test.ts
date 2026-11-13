import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createThemeStore } from "../themeStore/themeStore";
import { handleThemeRequest } from "./themeRoutes";

const CLASSIC_FILE = fileURLToPath(new URL("../../../themes/classic.theme.json", import.meta.url));
const WARM = { schemaVersion: 1, id: "warm", label: "Warm", extends: "classic" };

async function _withServer(run: (origin: string) => Promise<void>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "theme-routes-"));
  await fs.copyFile(CLASSIC_FILE, path.join(directory, "classic.theme.json"));
  const store = createThemeStore({ directory });
  const server: Server = createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    void handleThemeRequest({ req, res, pathname, store }).then((handled) => {
      if (!handled) {
        res.writeHead(404).end();
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await run(origin);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function _write(origin: string, method: string, pathname: string, body: unknown, headers = {}) {
  return fetch(`${origin}${pathname}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin, ...headers },
    body: JSON.stringify(body),
  });
}

test("the theme list is served", () =>
  _withServer(async (origin) => {
    const response = await fetch(`${origin}/api/themes`);
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { id: string }[])[0].id, "classic");
  }));

test("the JSON Schema is served at schema.json, not read as a theme id", () =>
  _withServer(async (origin) => {
    const schema = (await (await fetch(`${origin}/api/themes/schema.json`)).json()) as { type: string };
    assert.equal(schema.type, "object");
  }));

test("a theme is created with POST and saved with PUT using its hash", () =>
  _withServer(async (origin) => {
    const created = (await (await _write(origin, "POST", "/api/themes", WARM)).json()) as { hash: string };
    const saved = await _write(origin, "PUT", "/api/themes/warm", { ...WARM, label: "Warmer" }, { "If-Match": created.hash });
    assert.equal(saved.status, 200);
  }));

test("a save without If-Match is refused with 428", () =>
  _withServer(async (origin) => {
    await _write(origin, "POST", "/api/themes", WARM);
    assert.equal((await _write(origin, "PUT", "/api/themes/warm", WARM)).status, 428);
  }));

test("a stale If-Match is a conflict", () =>
  _withServer(async (origin) => {
    await _write(origin, "POST", "/api/themes", WARM);
    assert.equal((await _write(origin, "PUT", "/api/themes/warm", WARM, { "If-Match": "stale" })).status, 409);
  }));

test("a cross-origin write is refused", () =>
  _withServer(async (origin) => {
    const response = await _write(origin, "POST", "/api/themes", WARM, { Origin: "http://evil.test" });
    assert.equal(response.status, 403);
  }));

test("paths outside /api/themes are left to other routes", () =>
  _withServer(async (origin) => {
    assert.equal((await fetch(`${origin}/api/exports`)).status, 404);
  }));
