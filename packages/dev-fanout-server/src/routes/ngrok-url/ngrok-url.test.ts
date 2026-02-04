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
  mockRejectedValue: (value: unknown) => void;
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

const AUTH_SECRET = "test-secret";
const AUTH_HEADER = `Bearer ${AUTH_SECRET}`;

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
  lastAccessedDate: "2026-01-03T00:00:00.000Z",
};

async function _createServer(): Promise<FastifyInstance> {
  const { registerNgrokURLRoutes } = await import("./");

  const server: FastifyInstance = Fastify({
    logger: false,
  });

  await server.register(registerNgrokURLRoutes);
  return server;
}

function _mockNgrokDevURLsJSON(options: {
  targets: readonly NgrokDevURLTarget[];
}): void {
  const mockedReadFile = readFile as unknown as MockReadFile;
  mockedReadFile.mockResolvedValue(
    JSON.stringify({
      targets: options.targets,
    }),
  );
}

function _mockNgrokDevURLsJSONMissing(): void {
  const mockedReadFile = readFile as unknown as MockReadFile;

  const error = new Error("missing") as Error & { code: string };
  error.code = "ENOENT";
  mockedReadFile.mockRejectedValue(error);
}

describe("registerNgrokURLRoutes", () => {
  let server: FastifyInstance | undefined = undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.AVA_DEV_FANOUT_SERVER_SECRET = AUTH_SECRET;

    vi.useRealTimers();

    const mockedWriteFile = writeFile as unknown as MockWriteFile;
    const mockedRename = rename as unknown as MockRename;
    const mockedMkdir = mkdir as unknown as MockMkdir;

    mockedWriteFile.mockResolvedValue(undefined);
    mockedRename.mockResolvedValue(undefined);
    mockedMkdir.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    delete process.env.AVA_DEV_FANOUT_SERVER_SECRET;

    if (server) {
      await server.close();
      server = undefined;
    }
  });

  it("returns 401 when missing auth", async () => {
    _mockNgrokDevURLsJSON({ targets: [] });
    server = await _createServer();

    const res = await server.inject({
      method: "GET",
      url: "/ngrok-url/list",
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when the bearer token does not match", async () => {
    _mockNgrokDevURLsJSON({ targets: [] });
    server = await _createServer();

    const res = await server.inject({
      method: "GET",
      url: "/ngrok-url/list",
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it("lists all targets", async () => {
    _mockNgrokDevURLsJSON({
      targets: [TARGET_A, TARGET_B],
    });
    server = await _createServer();

    const res = await server.inject({
      method: "GET",
      url: "/ngrok-url/list",
      headers: {
        authorization: AUTH_HEADER,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      targets: [TARGET_A, TARGET_B],
    });
  });

  it("lists empty when the file does not exist", async () => {
    _mockNgrokDevURLsJSONMissing();
    server = await _createServer();

    const res = await server.inject({
      method: "GET",
      url: "/ngrok-url/list",
      headers: {
        authorization: AUTH_HEADER,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ targets: [] });
  });

  it("returns 401 for add when the bearer token does not match", async () => {
    _mockNgrokDevURLsJSON({
      targets: [TARGET_A],
    });
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/ngrok-url/add",
      headers: {
        authorization: "Bearer wrong-secret",
      },
      payload: {
        url: "https://b.example",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(writeFile).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
  });

  it("adds a URL and persists it", async () => {
    _mockNgrokDevURLsJSON({
      targets: [TARGET_A],
    });
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/ngrok-url/add",
      headers: {
        authorization: AUTH_HEADER,
      },
      payload: {
        url: "https://b.example",
      },
    });

    expect(res.statusCode).toBe(200);
    const body: unknown = res.json();
    expect(body).toMatchObject({
      targets: [
        TARGET_A,
        {
          url: "https://b.example",
          lastAccessedDate: null,
        },
      ],
    });

    const added = (body as { targets: Array<{ dateAdded?: unknown }> })
      .targets[1];
    expect(typeof added?.dateAdded).toBe("string");
    expect(Number.isFinite(Date.parse(String(added?.dateAdded)))).toBe(true);

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(rename).toHaveBeenCalledTimes(1);
  });

  it("strips trailing slashes when adding a URL", async () => {
    _mockNgrokDevURLsJSON({
      targets: [TARGET_A],
    });
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/ngrok-url/add",
      headers: {
        authorization: AUTH_HEADER,
      },
      payload: {
        url: "https://b.example/base/",
      },
    });

    expect(res.statusCode).toBe(200);
    const body: unknown = res.json();
    expect(body).toMatchObject({
      targets: [
        TARGET_A,
        {
          url: "https://b.example/base",
          lastAccessedDate: null,
        },
      ],
    });

    const added = (body as { targets: Array<{ dateAdded?: unknown }> })
      .targets[1];
    expect(typeof added?.dateAdded).toBe("string");
    expect(Number.isFinite(Date.parse(String(added?.dateAdded)))).toBe(true);

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(rename).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when adding a duplicate URL", async () => {
    _mockNgrokDevURLsJSON({
      targets: [TARGET_A],
    });
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/ngrok-url/add",
      headers: {
        authorization: AUTH_HEADER,
      },
      payload: {
        url: "https://a.example",
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      ok: false,
      error: "URL already exists.",
      targets: [TARGET_A],
    });
  });

  it("returns 401 for remove when the bearer token does not match", async () => {
    _mockNgrokDevURLsJSON({
      targets: [TARGET_A, { ...TARGET_B, url: "https://b.example" }],
    });
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/ngrok-url/remove",
      headers: {
        authorization: "Bearer wrong-secret",
      },
      payload: {
        url: "https://a.example",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(writeFile).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
  });

  it("removes a URL and persists it", async () => {
    _mockNgrokDevURLsJSON({
      targets: [TARGET_A, { ...TARGET_B, url: "https://b.example" }],
    });
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/ngrok-url/remove",
      headers: {
        authorization: AUTH_HEADER,
      },
      payload: {
        url: "https://a.example",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      targets: [{ ...TARGET_B, url: "https://b.example" }],
    });

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(rename).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when removing a URL that does not exist", async () => {
    _mockNgrokDevURLsJSON({
      targets: [TARGET_A],
    });
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/ngrok-url/remove",
      headers: {
        authorization: AUTH_HEADER,
      },
      payload: {
        url: "https://b.example",
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      ok: false,
      error: "URL not found.",
      targets: [TARGET_A],
    });
  });

  it("returns 400 for an invalid URL body", async () => {
    _mockNgrokDevURLsJSON({ targets: [] });
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/ngrok-url/add",
      headers: {
        authorization: AUTH_HEADER,
      },
      payload: {
        url: "not-a-url",
      },
    });

    expect(res.statusCode).toBe(400);
  });
});
