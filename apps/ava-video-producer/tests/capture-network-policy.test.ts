import assert from "node:assert/strict";
import test from "node:test";
import {
  isWorkspaceRoute,
  requestPolicy,
  validateBaseUrl,
} from "../scripts/capture-lib.mjs";

test("capture origins are literal loopback origins, without embedded credentials or routes", () => {
  for (const origin of [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
  ])
    assert.equal(validateBaseUrl(origin), origin);
  for (const origin of [
    "https://avandar.com",
    "http://localhost.evil.test",
    "http://0.0.0.0:5173",
    "file:///tmp/app",
    "http://user:pass@localhost:5173",
    "http://localhost:5173/signin",
    "http://localhost:5173?token=abc",
    "http://localhost:5173/#token",
  ]) {
    assert.throws(() => validateBaseUrl(origin));
  }
  assert.equal(
    isWorkspaceRoute(
      "http://localhost:5173/avandar-labs/data-manager",
      "http://localhost:5173",
      "avandar-labs",
    ),
    true,
  );
  assert.equal(
    isWorkspaceRoute(
      "http://localhost:5173/avandar-labs-other",
      "http://localhost:5173",
      "avandar-labs",
    ),
    false,
  );
});

test("network policy allows local writes and readonly assets, rejects external data and mutations", () => {
  assert.equal(
    requestPolicy({
      url: "http://127.0.0.1:54321/rest/v1/datasets",
      method: "POST",
    }).allow,
    true,
  );
  assert.equal(
    requestPolicy({
      url: "https://tiles.example.test/3/2/1.pbf?key=secret",
      resourceType: "fetch",
    }).allow,
    true,
  );
  assert.equal(
    requestPolicy({
      url: "https://fonts.googleapis.com/css2?family=Geist",
      resourceType: "stylesheet",
    }).allow,
    true,
  );
  assert.equal(
    requestPolicy({
      url: "https://cdn.example.test/extension.wasm",
      resourceType: "fetch",
    }).allow,
    true,
  );
  for (const request of [
    { url: "https://project.supabase.co/rest/v1/data", method: "GET" },
    {
      url: "https://project.supabase.co/storage/v1/image.png",
      resourceType: "image",
    },
    { url: "https://api.example.test/change", method: "POST" },
    {
      url: "https://api.example.test/change.png",
      method: "DELETE",
      resourceType: "image",
    },
    { url: "https://example.test/index.html", resourceType: "document" },
    { url: "https://example.test/api/users", resourceType: "fetch" },
    { url: "wss://example.test/realtime", resourceType: "websocket" },
  ])
    assert.equal(requestPolicy(request).allow, false);
  assert.equal(
    requestPolicy({ url: "ws://localhost:5173/", resourceType: "websocket" })
      .allow,
    true,
  );
});

test("only the exact feedback-widget configuration POST is suppressible", () => {
  const endpoint =
    "https://avandar.featurebase.app/api/v1/feedback/widget/config";
  assert.deepEqual(
    requestPolicy({ url: endpoint, method: "POST", resourceType: "fetch" }),
    {
      allow: false,
      suppress: true,
      reason: "nonessential-feedback-widget",
    },
  );
  for (const request of [
    { url: `${endpoint}?extra=1`, method: "POST" },
    { url: `${endpoint}/other`, method: "POST" },
    { url: endpoint.replace("https:", "http:"), method: "POST" },
    {
      url: endpoint.replace("avandar.featurebase.app", "other.featurebase.app"),
      method: "POST",
    },
    { url: endpoint, method: "DELETE" },
    { url: endpoint, method: "GET" },
    { url: endpoint, method: "POST", resourceType: "document" },
    {
      url: "https://project.supabase.co/api/v1/feedback/widget/config",
      method: "POST",
    },
  ]) {
    const decision = requestPolicy(request);
    assert.equal(decision.allow, false);
    assert.notEqual("suppress" in decision && decision.suppress, true);
  }
});
