import { Acclimate } from "@avandar/acclimate";
import { beforeEach, describe, expect, it, vi } from "vitest";

type FetchCall = readonly [
  input: string,
  init?:
    | {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      }
    | undefined,
];

type FetchMock = ((input: string, init?: FetchCall[1]) => Promise<Response>) & {
  mock: {
    calls: FetchCall[];
  };
  mockImplementation: (
    impl: (input: string, init?: FetchCall[1]) => Promise<Response>,
  ) => void;
};

function _mockFetch(
  impl: (input: string, init?: FetchCall[1]) => Promise<Response>,
): FetchMock {
  const fetchMock = vi.fn(impl) as unknown as FetchMock;
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function _getCombinedLogs(): string {
  const logCalls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;
  return logCalls.flat().join("\n");
}

describe("runNgrokURLList", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.AVA_DEV_FANOUT_SERVER_URL = "https://fanout.example/";
    process.env.AVA_DEV_FANOUT_SERVER_SECRET = "secret";

    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  it("lists registered URLs", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response(
        JSON.stringify({
          targets: [
            {
              url: "https://a.example/",
              dateAdded: "2026-01-01T00:00:00.000Z",
              lastAccessedDate: null,
            },
            {
              url: "https://b.example/",
              dateAdded: "2026-01-02T00:00:00.000Z",
              lastAccessedDate: "2026-01-03T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    });

    const { runNgrokURLList } = await import("./NgrokURLListCLI");
    await runNgrokURLList();

    expect(fetchMock.mock.calls.length).toBe(1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://fanout.example/ngrok-url/list");
    expect(init?.method).toBe("GET");
    expect(init?.headers?.authorization).toBe("Bearer secret");

    const logs = _getCombinedLogs();
    expect(logs).toContain("Registered ngrok URLs:");
    expect(logs).toContain("https://a.example/");
    expect(logs).toContain("https://b.example/");
    expect(logs).toContain("Thu, 01 Jan 2026 00:00:00 GMT");
    expect(logs).toContain("Sat, 03 Jan 2026 00:00:00 GMT");
    expect(logs).toContain("Never");
  });
});
