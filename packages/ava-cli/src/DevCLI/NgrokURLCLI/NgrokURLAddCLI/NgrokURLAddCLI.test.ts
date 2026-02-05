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

describe("runNgrokURLAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.AVA_DEV_FANOUT_SERVER_URL = "https://fanout.example/";
    process.env.AVA_DEV_FANOUT_ADMIN_SERVER_SECRET = "secret";

    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  it("adds a URL", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response(
        JSON.stringify({
          targets: [
            {
              url: "https://a.example/",
              dateAdded: "2026-01-10T12:00:00.000Z",
              lastAccessedDate: null,
            },
          ],
        }),
        { status: 200 },
      );
    });

    const { runNgrokURLAdd } = await import("./NgrokURLAddCLI");
    await runNgrokURLAdd({ url: "https://a.example/" });

    expect(fetchMock.mock.calls.length).toBe(1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://fanout.example/ngrok-url/add");
    expect(init?.method).toBe("POST");
    expect(init?.headers?.authorization).toBe("Bearer secret");
    expect(init?.body).toBe(JSON.stringify({ url: "https://a.example/" }));

    const logs = _getCombinedLogs();
    expect(logs).toContain("Registered ngrok URL.");
  });

  it("throws on non-2xx responses", async () => {
    _mockFetch(async () => {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "URL already exists.",
        }),
        { status: 409, statusText: "Conflict" },
      );
    });

    const { runNgrokURLAdd } = await import("./NgrokURLAddCLI");

    await expect(runNgrokURLAdd({ url: "https://a.example/" })).rejects.toThrow(
      "409 Conflict",
    );

    const logs = _getCombinedLogs();
    expect(logs).toContain("Failed to add ngrok URL.");
  });
});
