import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer, request, type Server } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createThemeStore } from "../createThemeStore/createThemeStore";
import { handleThemeRequest } from "./handleThemeRequest";
import type { AddressInfo } from "node:net";

const CLASSIC_FILE = fileURLToPath(
  new URL("../../../themes/classic.theme.json", import.meta.url),
);
const WARM = {
  schemaVersion: 1,
  id: "warm",
  label: "Warm",
  extends: "classic",
};

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
  await new Promise<void>((resolve) => {
    return server.listen(0, "127.0.0.1", resolve);
  });
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await run(origin);
  } finally {
    await new Promise((resolve) => {
      return server.close(resolve);
    });
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function _write({
  origin,
  method,
  pathname,
  body,
  headers = {},
}: Readonly<{
  origin: string;
  method: string;
  pathname: string;
  body: unknown;
  headers?: Readonly<Record<string, string>>;
}>) {
  return fetch(`${origin}${pathname}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin, ...headers },
    body: JSON.stringify(body),
  });
}

test("the theme list is served", () => {
  return _withServer(async (origin) => {
    const response = await fetch(`${origin}/api/themes`);
    assert.equal(response.status, 200);
    assert.equal(
      ((await response.json()) as Array<{ id: string }>)[0].id,
      "classic",
    );
  });
});

test("the JSON Schema is served at schema.json, not read as a theme id", () => {
  return _withServer(async (origin) => {
    const schema = (await (
      await fetch(`${origin}/api/themes/schema.json`)
    ).json()) as { type: string };
    assert.equal(schema.type, "object");
  });
});

test("a theme is created with POST and saved with PUT using its hash", () => {
  return _withServer(async (origin) => {
    const created = (await (
      await _write({
        origin,
        method: "POST",
        pathname: "/api/themes",
        body: WARM,
      })
    ).json()) as { hash: string };
    const saved = await _write({
      origin,
      method: "PUT",
      pathname: "/api/themes/warm",
      body: { ...WARM, label: "Warmer" },
      headers: { "If-Match": created.hash },
    });
    assert.equal(saved.status, 200);
  });
});

test("a save without If-Match is refused with 428", () => {
  return _withServer(async (origin) => {
    await _write({
      origin,
      method: "POST",
      pathname: "/api/themes",
      body: WARM,
    });
    assert.equal(
      (
        await _write({
          origin,
          method: "PUT",
          pathname: "/api/themes/warm",
          body: WARM,
        })
      ).status,
      428,
    );
  });
});

test("a stale If-Match is a conflict", () => {
  return _withServer(async (origin) => {
    await _write({
      origin,
      method: "POST",
      pathname: "/api/themes",
      body: WARM,
    });
    assert.equal(
      (
        await _write({
          origin,
          method: "PUT",
          pathname: "/api/themes/warm",
          body: WARM,
          headers: { "If-Match": "stale" },
        })
      ).status,
      409,
    );
  });
});

test("a cross-origin write is refused", () => {
  return _withServer(async (origin) => {
    const response = await _write({
      origin,
      method: "POST",
      pathname: "/api/themes",
      body: WARM,
      headers: { Origin: "http://evil.test" },
    });
    assert.equal(response.status, 403);
  });
});

test("paths outside /api/themes are left to other routes", () => {
  return _withServer(async (origin) => {
    assert.equal((await fetch(`${origin}/api/exports`)).status, 404);
  });
});

/** Sends a JSON body in two TCP writes cut inside the first multibyte character. */
function _postSplitMidCharacter(origin: string, body: unknown) {
  const bytes = Buffer.from(JSON.stringify(body), "utf8");
  const cut = bytes.indexOf(0xc3) + 1;
  return new Promise<number>((resolve, reject) => {
    const req = request(
      `${origin}/api/themes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          "Content-Length": bytes.length,
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("error", reject);
    req.write(bytes.subarray(0, cut));
    setTimeout(() => {
      return req.end(bytes.subarray(cut));
    }, 50);
  });
}

test("a label with multibyte characters survives a body split across chunks", () => {
  return _withServer(async (origin) => {
    const label = "Café ✓";
    assert.equal(await _postSplitMidCharacter(origin, { ...WARM, label }), 201);
    const read = (await (await fetch(`${origin}/api/themes/warm`)).json()) as {
      document: { label: string };
    };
    assert.equal(read.document.label, label);
  });
});
