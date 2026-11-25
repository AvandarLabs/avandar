import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import classicTheme from "../../../themes/classic.theme.json";
import { ThemeApi } from "./ThemeApi";
import { ThemeApiError } from "./ThemeApiError";

const WARM = {
  schemaVersion: 1,
  id: "warm",
  label: "Warm",
  extends: "classic",
} as const;

function _respondWith(
  responses: Readonly<Record<string, readonly [number, unknown]>>,
) {
  mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const [status, body] = responses[String(input)] ?? [
      404,
      { message: "Not found", issues: [] },
    ];
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
}

afterEach(() => {
  mock.restoreAll();
});

test("a refused save keeps the server's status and issues", async () => {
  _respondWith({
    "/api/themes/warm": [
      400,
      {
        message: "Bad",
        issues: [{ path: "color.accent", message: "Missing" }],
      },
    ],
  });
  await assert.rejects(
    ThemeApi.save({ document: WARM, hash: "hash" }),
    (error: unknown) => {
      return (
        error instanceof ThemeApiError &&
        error.status === 400 &&
        error.issues[0]?.path === "color.accent"
      );
    },
  );
});

test("loading the library reads every listed theme with its hash", async () => {
  _respondWith({
    "/api/themes": [
      200,
      [
        { id: "classic", label: "Classic", builtIn: true },
        { id: "warm", label: "Warm", builtIn: false, extends: "classic" },
      ],
    ],
    "/api/themes/classic": [200, { document: classicTheme, hash: "a" }],
    "/api/themes/warm": [200, { document: WARM, hash: "b" }],
  });
  const loaded = await ThemeApi.loadAll();
  assert.deepEqual([...loaded.stored.keys()], ["classic", "warm"]);
  assert.equal(loaded.stored.get("warm")?.hash, "b");
});

test("malformed successful write responses are rejected before their hashes can be reused", async () => {
  for (const body of [{}, { id: "warm", hash: 4 }, { id: 4, hash: "a" }]) {
    _respondWith({ "/api/themes": [200, body] });
    await assert.rejects(ThemeApi.create(WARM));
  }
  _respondWith({ "/api/themes/warm": [200, { hash: 4 }] });
  await assert.rejects(ThemeApi.save({ document: WARM, hash: "a" }));
});

test("a malformed stored hash is rejected even when the document is valid", async () => {
  _respondWith({ "/api/themes/warm": [200, { document: WARM, hash: 4 }] });
  await assert.rejects(ThemeApi.read("warm"));
});

test("malformed theme summaries are rejected before library reads", async () => {
  _respondWith({
    "/api/themes": [200, [{ id: "warm", label: 4, builtIn: "no" }]],
    "/api/themes/warm": [200, { document: WARM, hash: "a" }],
  });
  await assert.rejects(ThemeApi.loadAll());
});
