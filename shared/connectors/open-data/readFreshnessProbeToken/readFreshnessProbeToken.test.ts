import { describe, expect, it, vi } from "vitest";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { readFreshnessProbeToken } from "$/connectors/open-data/readFreshnessProbeToken/readFreshnessProbeToken.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { FreshnessProbe } from "$/connectors/open-data/readFreshnessProbeToken/readFreshnessProbeToken.types.ts";

const API_BASE_URL = "https://ghoapi.azureedge.net/api";
const PROBE_URL = `${API_BASE_URL}/WHS3_62?$orderby=Date%20desc&$top=1&$select=Date&$count=true`;

const JSON_PATHS_PROBE: FreshnessProbe = {
  url: PROBE_URL,
  token: {
    kind: "json-paths",
    paths: [["value", 0, "Date"], ["@odata.count"]],
  },
};

function _httpAnswering(body: string): OpenDataHttp {
  return {
    get: vi.fn(),
    getBytes: vi.fn(async () => {
      return new TextEncoder().encode(body) as Uint8Array<ArrayBuffer>;
    }),
  };
}

async function _readFailureCode(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(
    () => {
      return undefined;
    },
    (caught: unknown) => {
      return caught;
    },
  );
  return OpenDataAcquisitionFailed.is(error) ? error.failure.code : "none";
}

describe("readFreshnessProbeToken", () => {
  it("joins the values at each JSON path with a pipe, in path order", async () => {
    const http = _httpAnswering(
      JSON.stringify({
        "@odata.count": 194,
        value: [{ Date: "2024-01-05T10:00:00+01:00" }],
      }),
    );

    const token = await readFreshnessProbeToken({
      probe: JSON_PATHS_PROBE,
      apiBaseUrl: API_BASE_URL,
      http,
    });

    expect(token).toBe("2024-01-05T10:00:00+01:00|194");
  });

  it("fetches the probe's own URL", async () => {
    const http = _httpAnswering(
      JSON.stringify({ "@odata.count": 1, value: [{ Date: "d" }] }),
    );

    await readFreshnessProbeToken({
      probe: JSON_PATHS_PROBE,
      apiBaseUrl: API_BASE_URL,
      http,
    });

    expect(vi.mocked(http.getBytes).mock.calls[0]?.[0]).toBe(PROBE_URL);
  });

  it("fails with freshness-probe-invalid when a path is missing", async () => {
    const http = _httpAnswering(
      JSON.stringify({ "@odata.count": 0, value: [] }),
    );

    const code = await _readFailureCode(
      readFreshnessProbeToken({
        probe: JSON_PATHS_PROBE,
        apiBaseUrl: API_BASE_URL,
        http,
      }),
    );

    expect(code).toBe("freshness-probe-invalid");
  });

  it("fails with freshness-probe-invalid when the body is not JSON", async () => {
    const http = _httpAnswering("<html>busy</html>");

    const code = await _readFailureCode(
      readFreshnessProbeToken({
        probe: JSON_PATHS_PROBE,
        apiBaseUrl: API_BASE_URL,
        http,
      }),
    );

    expect(code).toBe("freshness-probe-invalid");
  });

  it("hashes the whole body as lowercase SHA-256 hex for body-sha256", async () => {
    const http = _httpAnswering("abc");

    const token = await readFreshnessProbeToken({
      probe: {
        url: `${API_BASE_URL}/DIMENSION/SEX/DimensionValues`,
        token: { kind: "body-sha256" },
      },
      apiBaseUrl: API_BASE_URL,
      http,
    });

    expect(token).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it.each([
    ["another host", "https://evil.example.org/api/WHS3_62"],
    ["plain http", "http://ghoapi.azureedge.net/api/WHS3_62"],
    ["a sibling path that only shares a prefix", `${API_BASE_URL}x/WHS3_62`],
    ["the base URL itself", API_BASE_URL],
  ])("refuses a URL on %s without fetching it", async (_label, url) => {
    const http = _httpAnswering("{}");

    const code = await _readFailureCode(
      readFreshnessProbeToken({
        probe: { url, token: { kind: "body-sha256" } },
        apiBaseUrl: API_BASE_URL,
        http,
      }),
    );

    expect([code, vi.mocked(http.getBytes).mock.calls.length]).toEqual([
      "freshness-probe-invalid",
      0,
    ]);
  });

  it("refuses a body over 1 MB", async () => {
    const http = _httpAnswering("x".repeat(1024 * 1024 + 1));

    const code = await _readFailureCode(
      readFreshnessProbeToken({
        probe: { url: PROBE_URL, token: { kind: "body-sha256" } },
        apiBaseUrl: API_BASE_URL,
        http,
      }),
    );

    expect(code).toBe("freshness-probe-invalid");
  });
});
