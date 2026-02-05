import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

vi.mock("node:fs/promises", () => {
  return {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    rename: vi.fn(),
    writeFile: vi.fn(),
  };
});

type MockReadFile = typeof readFile & {
  mockResolvedValue: (value: string) => void;
};

type MockWriteFile = typeof writeFile & {
  mockResolvedValue: (value: void) => void;
};

type MockRename = typeof rename & {
  mockResolvedValue: (value: void) => void;
};

type MockMkdir = typeof mkdir & {
  mockResolvedValue: (value: void) => void;
};

type FetchCall = readonly [
  input: string,
  init?:
    | {
        method?: string;
        headers?: Record<string, string>;
        body?: unknown;
      }
    | undefined,
];

type FetchMock = ((input: string, init?: FetchCall[1]) => Promise<Response>) & {
  mock: {
    calls: FetchCall[];
  };
  mockClear: () => void;
  mockImplementation: (
    impl: (input: string, init?: FetchCall[1]) => Promise<Response>,
  ) => void;
};

async function _createServer(): Promise<FastifyInstance> {
  const { registerForwardRoute } = await import("./");

  const server: FastifyInstance = Fastify({
    logger: false,
  });

  const parseAsBuffer = (
    _request: unknown,
    body: unknown,
    done: (err: Error | null, body: unknown) => void,
  ): void => {
    done(null, body);
  };

  server.addContentTypeParser(
    ["application/json", "application/*+json"],
    { parseAs: "buffer" },
    parseAsBuffer,
  );

  server.addContentTypeParser("*", { parseAs: "buffer" }, parseAsBuffer);

  await server.register(registerForwardRoute);
  return server;
}

type NgrokDevURLTarget = Readonly<{
  url: string;
  dateAdded: string;
  lastAccessedDate: string | null;
}>;

const TARGET_A: NgrokDevURLTarget = {
  url: "https://a.example",
  dateAdded: "2026-01-01T00:00:00.000Z",
  lastAccessedDate: null,
};

const TARGET_B: NgrokDevURLTarget = {
  url: "https://b.example/base",
  dateAdded: "2026-01-02T00:00:00.000Z",
  lastAccessedDate: null,
};

function _mockNgrokTargetsJSON(options: {
  targets: readonly NgrokDevURLTarget[];
}): void {
  const mockedReadFile = readFile as unknown as MockReadFile;
  mockedReadFile.mockResolvedValue(
    JSON.stringify({
      targets: options.targets,
    }),
  );
}

function _mockFetchSequence(options: {
  impls: Array<(input: string, init?: FetchCall[1]) => Promise<Response>>;
}): FetchMock {
  let callIndex: number = 0;

  const fetchMock = vi.fn(async (input: string, init?: FetchCall[1]) => {
    const impl =
      options.impls.at(callIndex) ?? options.impls.at(options.impls.length - 1);
    callIndex += 1;

    if (!impl) {
      return new Response(null, { status: 204 });
    }

    return await impl(input, init);
  }) as unknown as FetchMock;

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("registerForwardingRoutes", () => {
  let server: FastifyInstance | undefined = undefined;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mockedWriteFile = writeFile as unknown as MockWriteFile;
    const mockedRename = rename as unknown as MockRename;
    const mockedMkdir = mkdir as unknown as MockMkdir;

    mockedWriteFile.mockResolvedValue(undefined);
    mockedRename.mockResolvedValue(undefined);
    mockedMkdir.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();

    if (server) {
      await server.close();
      server = undefined;
    }
  });

  function _expectISODateString(value: unknown): void {
    expect(typeof value).toBe("string");
    expect(Number.isFinite(Date.parse(String(value)))).toBe(true);
  }

  it("fans out /forward/* to each dev target, preserving path + search", async () => {
    _mockNgrokTargetsJSON({
      targets: [TARGET_A, TARGET_B],
    });

    const fetchMock = _mockFetchSequence({
      impls: [
        async () => {
          return new Response(null, { status: 200 });
        },
        async () => {
          return new Response(null, { status: 201 });
        },
      ],
    });

    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/forward/webhook/foo?x=1&y=2",
      headers: {
        "x-custom": "abc",
        host: "should-not-forward.example",
        connection: "close",
        "x-multi": ["a", "b"] as unknown as string,
      } as unknown as Record<string, string>,
      payload: Buffer.from("hello-world"),
    });

    expect(res.statusCode).toBe(200);

    const parsedBody: unknown = res.json();
    expect(parsedBody).toEqual({
      received: true,
      results: [
        {
          devURL: TARGET_A.url,
          forwardURL: "https://a.example/webhook/foo?x=1&y=2",
          ok: true,
          status: 200,
        },
        {
          devURL: TARGET_B.url,
          forwardURL: "https://b.example/base/webhook/foo?x=1&y=2",
          ok: true,
          status: 201,
        },
      ],
    });

    expect(fetchMock.mock.calls.length).toBe(2);

    const [firstURL, firstInit] = fetchMock.mock.calls[0]!;
    expect(firstURL).toBe("https://a.example/webhook/foo?x=1&y=2");
    expect(firstInit?.method).toBe("POST");
    expect(firstInit?.body).toBeInstanceOf(Buffer);

    const firstHeaders = firstInit?.headers ?? {};
    expect(firstHeaders["x-avandar-fanout"]).toBe("1");
    expect(firstHeaders["x-custom"]).toBe("abc");
    expect(firstHeaders["host"]).toBeUndefined();
    expect(firstHeaders["connection"]).toBeUndefined();
    expect(firstHeaders["content-length"]).toBeUndefined();
    expect(firstHeaders["x-multi"]).toBe("a,b");

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(rename).toHaveBeenCalledTimes(1);

    const [, writtenContents] = (
      writeFile as unknown as {
        mock: { calls: Array<readonly unknown[]> };
      }
    ).mock.calls[0]!;
    const parsed: unknown = JSON.parse(String(writtenContents));
    const targets = (parsed as { targets: NgrokDevURLTarget[] }).targets;

    expect(targets[0]).toMatchObject({ url: TARGET_A.url });
    expect(targets[1]).toMatchObject({ url: TARGET_B.url });
    _expectISODateString(targets[0]?.lastAccessedDate);
    _expectISODateString(targets[1]?.lastAccessedDate);
  });

  it("does not forward a body for GET requests", async () => {
    _mockNgrokTargetsJSON({
      targets: [TARGET_A, TARGET_B],
    });

    const fetchMock = _mockFetchSequence({
      impls: [
        async () => {
          return new Response(null, { status: 204 });
        },
        async () => {
          return new Response(null, { status: 204 });
        },
      ],
    });

    server = await _createServer();

    const res = await server.inject({
      method: "GET",
      url: "/forward?ping=1",
      payload: Buffer.from("this-should-not-forward"),
    });

    expect(res.statusCode).toBe(200);

    const [firstURL, firstInit] = fetchMock.mock.calls[0]!;
    expect(firstURL).toBe("https://a.example/?ping=1");
    expect(firstInit?.method).toBe("GET");
    expect(firstInit?.body).toBeUndefined();

    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it("forwards JSON bodies as raw buffers", async () => {
    _mockNgrokTargetsJSON({
      targets: [TARGET_A],
    });

    const fetchMock = _mockFetchSequence({
      impls: [
        async () => {
          return new Response(null, { status: 204 });
        },
      ],
    });

    server = await _createServer();

    const jsonBody: string = JSON.stringify({
      type: "ping",
      timestamp: "2026-02-05T00:00:00Z",
      data: {},
    });

    const res = await server.inject({
      method: "POST",
      url: "/forward/functions/v1/polar-public/webhook",
      headers: {
        "content-type": "application/json",
      },
      payload: jsonBody,
    });

    expect(res.statusCode).toBe(200);
    expect(fetchMock.mock.calls.length).toBe(1);

    const [, forwardedInit] = fetchMock.mock.calls[0]!;
    expect(forwardedInit?.method).toBe("POST");
    const forwardedBody: unknown = forwardedInit?.body;
    expect(forwardedBody).toBeInstanceOf(Buffer);
    expect((forwardedBody as Buffer).toString("utf8")).toBe(jsonBody);
  });

  it("captures fetch errors per-target and returns them in results", async () => {
    _mockNgrokTargetsJSON({
      targets: [TARGET_A, { ...TARGET_B, url: "https://b.example" }],
    });

    const fetchMock = _mockFetchSequence({
      impls: [
        async () => {
          throw new Error("boom");
        },
        async () => {
          return new Response(null, { status: 202 });
        },
      ],
    });

    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/forward/err",
      payload: Buffer.from("hi"),
    });

    expect(res.statusCode).toBe(200);

    const body: unknown = res.json();
    expect(body).toEqual({
      received: true,
      results: [
        {
          devURL: "https://a.example",
          forwardURL: "https://a.example/err",
          ok: false,
          error: "boom",
        },
        {
          devURL: "https://b.example",
          forwardURL: "https://b.example/err",
          ok: true,
          status: 202,
        },
      ],
    });

    expect(fetchMock.mock.calls.length).toBe(2);

    const [, writtenContents] = (
      writeFile as unknown as {
        mock: { calls: Array<readonly unknown[]> };
      }
    ).mock.calls[0]!;
    const parsed: unknown = JSON.parse(String(writtenContents));
    const targets = (parsed as { targets: NgrokDevURLTarget[] }).targets;

    expect(targets[0]).toMatchObject(TARGET_A);
    expect(targets[1]).toMatchObject({ url: "https://b.example" });
    expect(targets[0]?.lastAccessedDate).toBeNull();
    _expectISODateString(targets[1]?.lastAccessedDate);
  });

  it("does not update lastAccessedDate for 502 responses", async () => {
    _mockNgrokTargetsJSON({
      targets: [TARGET_A, { ...TARGET_B, url: "https://b.example" }],
    });

    _mockFetchSequence({
      impls: [
        async () => {
          return new Response(null, { status: 502 });
        },
        async () => {
          return new Response(null, { status: 500 });
        },
      ],
    });

    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/forward/health",
      payload: Buffer.from("hi"),
    });

    expect(res.statusCode).toBe(200);

    const [, writtenContents] = (
      writeFile as unknown as {
        mock: { calls: Array<readonly unknown[]> };
      }
    ).mock.calls[0]!;
    const parsed: unknown = JSON.parse(String(writtenContents));
    const targets = (parsed as { targets: NgrokDevURLTarget[] }).targets;

    expect(targets[0]).toMatchObject(TARGET_A);
    expect(targets[1]).toMatchObject({ url: "https://b.example" });
    expect(targets[0]?.lastAccessedDate).toBeNull();
    _expectISODateString(targets[1]?.lastAccessedDate);
  });
});
