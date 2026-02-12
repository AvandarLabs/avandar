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

describe("runNgrokURLRemove", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.AVA_DEV_FANOUT_SERVER_URL = "https://fanout.example/";
    process.env.AVA_DEV_FANOUT_ADMIN_SERVER_SECRET = "secret";

    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  it("removes a URL", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response(
        JSON.stringify({
          targets: [],
        }),
        { status: 200 },
      );
    });

    const { runNgrokURLRemove } = await import("./NgrokURLRemoveCLI");
    await runNgrokURLRemove({ url: "https://a.example/" });

    expect(fetchMock.mock.calls.length).toBe(1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://fanout.example/ngrok-url/remove");
    expect(init?.method).toBe("POST");
    expect(init?.headers?.authorization).toBe("Bearer secret");
    expect(init?.body).toBe(JSON.stringify({ url: "https://a.example/" }));

    const logs = _getCombinedLogs();
    expect(logs).toContain("Removed ngrok URL.");
  });
});
