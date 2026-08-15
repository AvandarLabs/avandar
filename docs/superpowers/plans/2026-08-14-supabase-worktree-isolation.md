# Supabase Worktree Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add branch-scoped `ava supabase switch` and `ava supabase restore`
commands that create, configure, and clean up an isolated local Supabase stack.

**Architecture:** Pure transformation helpers parse and rewrite Supabase TOML,
status JSON, and development environment files. A filesystem and process
adapter owns local side effects, while one workflow module implements
transactional switch and restore operations against branch-scoped backups.
Thin Acclimate commands expose the workflow.

**Tech Stack:** Node.js 22, TypeScript, Vitest, Acclimate, Supabase CLI, Docker.

## Global Constraints

- Never access or mutate a remote Supabase project. Do not pass `--linked` or a
  database URL to any Supabase command.
- Modify only `supabase/config.toml`, `.env.development`, and existing
  `.env.development.*` files during a switch.
- Never print environment values, generated keys, or backed-up credentials.
- Backups are keyed by the current named Git branch and current worktree path.
  The manifest records both values. A detached HEAD is an error.
- Refuse a second active switch for the same branch in the same worktree.
  Backups for other branches or worktrees do not block the current worktree.
- Treat the optional port as the API base port. Preserve every active local
  Supabase port's offset from the current API port. Leave `[remotes.*]`
  project ids and ports unchanged.
- Without an explicit port, choose a base whose entire derived port set is free.
- Restore exact file contents even when temporary-stack cleanup fails.
- Cleanup may remove only containers, networks, and volumes owned by the
  recorded temporary project. Never remove shared Docker images.
- Refuse a temporary project id that already labels any Docker container,
  network, or volume. This ownership check occurs before backup and startup.
- Follow red/green TDD. Run the focused Ava CLI test file for each task.
- Do not commit, push, merge, or publish. Leave changes dirty for user review.

---

## File Structure

**Created:**

| Path                                                                                             | Responsibility                                              |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types.ts`        | Shared state, manifest, credentials, and injected-I/O types |
| `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabaseConfig.ts`                        | Pure TOML and dotenv transformations                        |
| `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabaseConfig.test.ts`                   | Configuration transformation behavior                       |
| `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabasePorts.ts`                         | Derived-port validation and automatic selection             |
| `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabasePorts.test.ts`                    | Port selection behavior                                     |
| `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO.ts`      | Node filesystem, Git, port-probe, and process adapter       |
| `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO.test.ts` | Real filesystem filtering behavior for the adapter          |
| `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.ts`              | Transactional switch and restore workflows                  |
| `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.test.ts`         | Workflow, rollback, branch ownership, and cleanup tests     |
| `apps/ava-cli/src/SupabaseCLI/SupabaseSwitchCLI/SupabaseSwitchCLI.ts`                            | `ava supabase switch <new-id> [port]` command               |
| `apps/ava-cli/src/SupabaseCLI/SupabaseRestoreCLI/SupabaseRestoreCLI.ts`                          | `ava supabase restore` command                              |

**Modified:**

| Path                                          | Change                                   |
| --------------------------------------------- | ---------------------------------------- |
| `apps/ava-cli/src/SupabaseCLI/SupabaseCLI.ts` | Register `switch` and `restore` commands |

## Task 1: Add pure Supabase configuration transformations

**Files:**

- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types.ts`
- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabaseConfig.ts`
- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabaseConfig.test.ts`

**Interfaces:**

- Produces: `makeSupabaseConfigStateFromContents`, `makeSupabaseConfigFromBasePort`,
  `makeSupabaseLocalStatusFromJson`, and `makeDevelopmentEnvFromStatus`.
- `makeSupabaseConfigFromBasePort` preserves all detected port offsets and
  replaces only the root `project_id` and active local numeric port assignments.

- [ ] **Step 1: Write the failing configuration tests**

Create `supabaseConfig.test.ts` with these behavioral cases:

```ts
import {
  makeDevelopmentEnvFromStatus,
  makeSupabaseConfigFromBasePort,
  makeSupabaseConfigStateFromContents,
  makeSupabaseLocalStatusFromJson,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/supabaseConfig";
import { describe, expect, it } from "vitest";

const CONFIG = `project_id = "avandar"

[api]
port = 54321

[db]
port = 54322
shadow_port = 54320

[studio]
port = 54323

[inbucket]
port = 51634

[edge_runtime]
inspector_port = 8083

[analytics]
port = 54327

[remotes.production]
project_id = "remote-project-ref"

[remotes.production.api]
port = 64321
`;

describe("makeSupabaseConfigStateFromContents", () => {
  it("reads the project id, API port, and every active local port", () => {
    expect(makeSupabaseConfigStateFromContents(CONFIG)).toEqual({
      projectId: "avandar",
      apiPort: 54321,
      ports: {
        "api.port": 54321,
        "db.port": 54322,
        "db.shadow_port": 54320,
        "studio.port": 54323,
        "inbucket.port": 51634,
        "edge_runtime.inspector_port": 8083,
        "analytics.port": 54327,
      },
    });
  });
});

describe("makeSupabaseConfigFromBasePort", () => {
  it("replaces the project id and shifts every port by the API delta", () => {
    const rewritten = makeSupabaseConfigFromBasePort({
      configContents: CONFIG,
      projectId: "analytics-p2-temp",
      basePort: 55321,
    });

    expect(rewritten).toContain('project_id = "analytics-p2-temp"');
    expect(rewritten).toContain('project_id = "remote-project-ref"');
    expect(rewritten).toContain("[remotes.production.api]\nport = 64321");
    expect(makeSupabaseConfigStateFromContents(rewritten).ports).toEqual({
      "api.port": 55321,
      "db.port": 55322,
      "db.shadow_port": 55320,
      "studio.port": 55323,
      "inbucket.port": 52634,
      "edge_runtime.inspector_port": 9083,
      "analytics.port": 55327,
    });
  });
});

describe("makeSupabaseLocalStatusFromJson", () => {
  it("reads the local credentials needed by development environments", () => {
    expect(
      makeSupabaseLocalStatusFromJson(
        JSON.stringify({
          API_URL: "http://127.0.0.1:55321",
          DB_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
          ANON_KEY: "legacy-anon",
          SERVICE_ROLE_KEY: "legacy-service",
          PUBLISHABLE_KEY: "publishable",
          SECRET_KEY: "secret",
        }),
      ),
    ).toEqual({
      apiUrl: "http://127.0.0.1:55321",
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
      anonKey: "legacy-anon",
      serviceRoleKey: "legacy-service",
      publishableKey: "publishable",
      secretKey: "secret",
    });
  });
});

describe("makeDevelopmentEnvFromStatus", () => {
  it("updates known Supabase values and preserves every unrelated line", () => {
    const rewritten = makeDevelopmentEnvFromStatus({
      envContents:
        "VITE_SUPABASE_API_URL=old\nSUPABASE_URL=old\nOPENAI_API_KEY=keep\n",
      status: {
        apiUrl: "http://127.0.0.1:55321",
        databaseUrl: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
        anonKey: "anon",
        serviceRoleKey: "service",
        publishableKey: "publishable",
        secretKey: "secret",
      },
    });

    expect(rewritten).toBe(
      "VITE_SUPABASE_API_URL=http://127.0.0.1:55321\n" +
        "SUPABASE_URL=http://127.0.0.1:55321\n" +
        "OPENAI_API_KEY=keep\n",
    );
  });

  it("updates edge-function keys and derives the JWT issuer", () => {
    expect(
      makeDevelopmentEnvFromStatus({
        envContents:
          "SB_SECRET_KEY=old\nSB_PUBLISHABLE_KEY=old\nSB_JWT_ISSUER=old\n",
        status: {
          apiUrl: "http://127.0.0.1:55321",
          databaseUrl:
            "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
          anonKey: "anon",
          serviceRoleKey: "service",
          publishableKey: "publishable",
          secretKey: "secret",
        },
      }),
    ).toBe(
      "SB_SECRET_KEY=secret\n" +
        "SB_PUBLISHABLE_KEY=publishable\n" +
        "SB_JWT_ISSUER=http://127.0.0.1:55321/auth/v1\n",
    );
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

```bash
pnpm vitest run -c apps/ava-cli/vitest.config.ts \
  apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabaseConfig.test.ts
```

Expected: FAIL because `supabaseConfig.ts` does not exist.

- [ ] **Step 3: Add the shared types**

Create `SupabaseLocalEnvironment.types.ts`:

```ts
/** Parsed identity and port assignments from a Supabase config. */
export type SupabaseConfigState = {
  projectId: string;
  apiPort: number;
  ports: Record<string, number>;
};

/** Local URLs and keys emitted by `supabase status`. */
export type SupabaseLocalStatus = {
  apiUrl: string;
  databaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  publishableKey: string;
  secretKey: string;
};

/** One source file and its exact branch-scoped backup copy. */
export type SupabaseBackupFile = {
  sourcePath: string;
  backupPath: string;
};

/** Durable state required to restore one branch's local configuration. */
export type SupabaseBackupManifest = {
  branch: string;
  worktreePath: string;
  temporaryProjectId: string;
  basePort: number;
  derivedPorts: Record<string, number>;
  files: SupabaseBackupFile[];
  state: "switching" | "active";
};
```

- [ ] **Step 4: Implement the pure transformations**

Create `supabaseConfig.ts`. Use a section-aware line transform so comments and
formatting survive:

```ts
import type {
  SupabaseConfigState,
  SupabaseLocalStatus,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const PROJECT_ID_PATTERN = /^(\s*project_id\s*=\s*)"([^"]+)"(\s*)$/;
const SECTION_PATTERN = /^\s*\[([^\]]+)\]\s*$/;
const PORT_PATTERN =
  /^(\s*)(port|shadow_port|inspector_port)(\s*=\s*)(\d+)(\s*)$/;

const ENV_VALUE_FROM_KEY: Readonly<Record<string, keyof SupabaseLocalStatus>> =
  {
    VITE_SUPABASE_API_URL: "apiUrl",
    VITE_SUPABASE_ANON_KEY: "anonKey",
    SUPABASE_POSTGRES_URL: "databaseUrl",
    SUPABASE_SERVICE_ROLE_KEY: "serviceRoleKey",
    SUPABASE_URL: "apiUrl",
    SB_SECRET_KEY: "secretKey",
    SB_PUBLISHABLE_KEY: "publishableKey",
  };

function _readRequiredString(value: unknown, sourceKey: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Supabase status is missing ${sourceKey}.`);
  }
  return value;
}

/** Reads the project identity and active ports from Supabase TOML. */
export function makeSupabaseConfigStateFromContents(
  configContents: string,
): SupabaseConfigState {
  let section = "";
  let projectId: string | undefined;
  const ports: Record<string, number> = {};

  configContents.split("\n").forEach((line) => {
    const sectionMatch = line.match(SECTION_PATTERN);
    if (sectionMatch) {
      section = sectionMatch[1];
      return;
    }
    const projectMatch = line.match(PROJECT_ID_PATTERN);
    if (projectMatch && section === "") {
      projectId = projectMatch[2];
      return;
    }
    const portMatch = line.match(PORT_PATTERN);
    if (portMatch && section !== "" && !section.startsWith("remotes.")) {
      ports[`${section}.${portMatch[2]}`] = Number(portMatch[4]);
    }
  });

  const apiPort = ports["api.port"];
  if (!projectId || apiPort === undefined) {
    throw new Error(
      "supabase/config.toml must define project_id and api.port.",
    );
  }
  return { projectId, apiPort, ports };
}

/** Rewrites Supabase TOML with a project id and shifted port assignments. */
export function makeSupabaseConfigFromBasePort(
  options: Readonly<{
    configContents: string;
    projectId: string;
    basePort: number;
  }>,
): string {
  const { configContents, projectId, basePort } = options;
  const original = makeSupabaseConfigStateFromContents(configContents);
  const portDelta = basePort - original.apiPort;
  let section = "";

  return configContents
    .split("\n")
    .map((line) => {
      const sectionMatch = line.match(SECTION_PATTERN);
      if (sectionMatch) {
        section = sectionMatch[1];
        return line;
      }
      const projectMatch = line.match(PROJECT_ID_PATTERN);
      if (projectMatch && section === "") {
        return `${projectMatch[1]}"${projectId}"${projectMatch[3]}`;
      }
      const portMatch = line.match(PORT_PATTERN);
      const portKey = portMatch ? `${section}.${portMatch[2]}` : undefined;
      if (!portMatch || !portKey || original.ports[portKey] === undefined) {
        return line;
      }
      const shiftedPort = original.ports[portKey] + portDelta;
      return `${portMatch[1]}${portMatch[2]}${portMatch[3]}${shiftedPort}${portMatch[5]}`;
    })
    .join("\n");
}

/** Parses the credentials emitted by `supabase status -o json`. */
export function makeSupabaseLocalStatusFromJson(
  statusJson: string,
): SupabaseLocalStatus {
  const value = JSON.parse(statusJson) as Record<string, unknown>;
  return {
    apiUrl: _readRequiredString(value.API_URL, "API_URL"),
    databaseUrl: _readRequiredString(value.DB_URL, "DB_URL"),
    anonKey: _readRequiredString(value.ANON_KEY, "ANON_KEY"),
    serviceRoleKey: _readRequiredString(
      value.SERVICE_ROLE_KEY,
      "SERVICE_ROLE_KEY",
    ),
    publishableKey: _readRequiredString(
      value.PUBLISHABLE_KEY,
      "PUBLISHABLE_KEY",
    ),
    secretKey: _readRequiredString(value.SECRET_KEY, "SECRET_KEY"),
  };
}

/** Rewrites known development variables from local Supabase status. */
export function makeDevelopmentEnvFromStatus(
  options: Readonly<{
    envContents: string;
    status: SupabaseLocalStatus;
  }>,
): string {
  const { envContents, status } = options;
  return envContents
    .split("\n")
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 1) {
        return line;
      }
      const key = line.slice(0, separatorIndex);
      if (key === "SB_JWT_ISSUER") {
        return `${key}=${status.apiUrl}/auth/v1`;
      }
      const statusKey = ENV_VALUE_FROM_KEY[key];
      return statusKey ? `${key}=${status[statusKey]}` : line;
    })
    .join("\n");
}
```

- [ ] **Step 5: Run the focused test and type check**

```bash
pnpm vitest run -c apps/ava-cli/vitest.config.ts \
  apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabaseConfig.test.ts
pnpm type-check
```

Expected: all configuration tests pass and TypeScript reports no errors.

- [ ] **Step 6: Review checkpoint**

Do not commit. Record the changed files and focused test output for the task
reviewer.

## Task 2: Add derived-port selection

**Files:**

- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabasePorts.ts`
- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabasePorts.test.ts`

**Interfaces:**

- Consumes: `SupabaseConfigState` from Task 1.
- Produces: `makeDerivedPortsFromBasePort` and `getAvailableBasePortFromPorts`.

- [ ] **Step 1: Write the failing tests**

```ts
import {
  getAvailableBasePortFromPorts,
  makeDerivedPortsFromBasePort,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/supabasePorts";
import { describe, expect, it, vi } from "vitest";

const PORTS = {
  "api.port": 54321,
  "db.port": 54322,
  "db.shadow_port": 54320,
  "studio.port": 54323,
  "inbucket.port": 51634,
  "edge_runtime.inspector_port": 8083,
  "analytics.port": 54327,
};

describe("makeDerivedPortsFromBasePort", () => {
  it("preserves every offset from the current API port", () => {
    expect(
      makeDerivedPortsFromBasePort({
        currentApiPort: 54321,
        currentPorts: PORTS,
        basePort: 55321,
      }),
    ).toEqual({
      "api.port": 55321,
      "db.port": 55322,
      "db.shadow_port": 55320,
      "studio.port": 55323,
      "inbucket.port": 52634,
      "edge_runtime.inspector_port": 9083,
      "analytics.port": 55327,
    });
  });

  it("rejects a derived port outside the TCP range", () => {
    expect(() => {
      makeDerivedPortsFromBasePort({
        currentApiPort: 54321,
        currentPorts: PORTS,
        basePort: 65530,
      });
    }).toThrow("outside the valid TCP port range");
  });
});

describe("getAvailableBasePortFromPorts", () => {
  it("rejects an explicit base when any derived port is occupied", async () => {
    const isPortAvailable = vi.fn(async (port: number) => port !== 55322);
    await expect(
      getAvailableBasePortFromPorts({
        currentApiPort: 54321,
        currentPorts: PORTS,
        requestedBasePort: 55321,
        isPortAvailable,
      }),
    ).rejects.toThrow("55322 is already in use");
  });

  it("skips occupied automatic candidates and returns the first free set", async () => {
    const isPortAvailable = vi.fn(async (port: number) => port !== 55321);
    await expect(
      getAvailableBasePortFromPorts({
        currentApiPort: 54321,
        currentPorts: PORTS,
        isPortAvailable,
      }),
    ).resolves.toBe(55341);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
pnpm vitest run -c apps/ava-cli/vitest.config.ts \
  apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabasePorts.test.ts
```

Expected: import resolution failure for `supabasePorts.ts`.

- [ ] **Step 3: Implement port derivation and selection**

```ts
const MIN_PORT = 1;
const MAX_PORT = 65_535;
const AUTOMATIC_PORT_OFFSET = 1_000;
const CANDIDATE_INCREMENT = 20;

/** Shifts every configured port by the requested API-port delta. */
export function makeDerivedPortsFromBasePort(
  options: Readonly<{
    currentApiPort: number;
    currentPorts: Readonly<Record<string, number>>;
    basePort: number;
  }>,
): Record<string, number> {
  const { currentApiPort, currentPorts, basePort } = options;
  const delta = basePort - currentApiPort;
  const derivedPorts = Object.fromEntries(
    Object.entries(currentPorts).map(([key, port]) => [key, port + delta]),
  );
  const invalidPort = Object.values(derivedPorts).find((port) => {
    return port < MIN_PORT || port > MAX_PORT;
  });
  if (invalidPort !== undefined) {
    throw new Error(
      `Derived port ${invalidPort} is outside the valid TCP port range.`,
    );
  }
  return derivedPorts;
}

async function _findOccupiedPort(
  options: Readonly<{
    ports: readonly number[];
    isPortAvailable: (port: number) => Promise<boolean>;
  }>,
): Promise<number | undefined> {
  const { ports, isPortAvailable } = options;
  const availability = await Promise.all(
    ports.map(async (port) => {
      return { port, isAvailable: await isPortAvailable(port) };
    }),
  );
  return availability.find(({ isAvailable }) => !isAvailable)?.port;
}

async function _findAutomaticBasePort(
  options: Readonly<{
    currentApiPort: number;
    currentPorts: Readonly<Record<string, number>>;
    candidate: number;
    isPortAvailable: (port: number) => Promise<boolean>;
  }>,
): Promise<number> {
  const { currentApiPort, currentPorts, candidate, isPortAvailable } = options;
  const derivedPorts = makeDerivedPortsFromBasePort({
    currentApiPort,
    currentPorts,
    basePort: candidate,
  });
  const occupiedPort = await _findOccupiedPort({
    ports: Object.values(derivedPorts),
    isPortAvailable,
  });
  if (occupiedPort === undefined) {
    return candidate;
  }
  const nextCandidate = candidate + CANDIDATE_INCREMENT;
  if (nextCandidate > MAX_PORT) {
    throw new Error("No complete Supabase port set is available.");
  }
  return await _findAutomaticBasePort({
    currentApiPort,
    currentPorts,
    candidate: nextCandidate,
    isPortAvailable,
  });
}

/** Finds a base whose complete derived Supabase port set is available. */
export async function getAvailableBasePortFromPorts(
  options: Readonly<{
    currentApiPort: number;
    currentPorts: Readonly<Record<string, number>>;
    requestedBasePort?: number;
    isPortAvailable: (port: number) => Promise<boolean>;
  }>,
): Promise<number> {
  const { currentApiPort, currentPorts, requestedBasePort, isPortAvailable } =
    options;
  if (requestedBasePort !== undefined) {
    const derivedPorts = makeDerivedPortsFromBasePort({
      currentApiPort,
      currentPorts,
      basePort: requestedBasePort,
    });
    const occupiedPort = await _findOccupiedPort({
      ports: Object.values(derivedPorts),
      isPortAvailable,
    });
    if (occupiedPort === undefined) {
      return requestedBasePort;
    }
    throw new Error(`Derived port ${occupiedPort} is already in use.`);
  }
  return await _findAutomaticBasePort({
    currentApiPort,
    currentPorts,
    candidate: currentApiPort + AUTOMATIC_PORT_OFFSET,
    isPortAvailable,
  });
}
```

- [ ] **Step 4: Run the focused tests and type check**

```bash
pnpm vitest run -c apps/ava-cli/vitest.config.ts \
  apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabaseConfig.test.ts \
  apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/supabasePorts.test.ts
pnpm type-check
```

Expected: both Supabase local-environment test files pass; type check passes.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the focused test evidence.

## Task 3: Add the local I/O adapter

**Files:**

- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO.ts`
- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO.test.ts`
- Modify: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types.ts`

**Interfaces:**

- Produces: `SupabaseLocalEnvironmentIO` and
  `createSupabaseLocalEnvironmentIO(projectRoot)`.
- Every filesystem path accepted by the adapter is absolute.

- [ ] **Step 1: Extend the shared types**

Add:

```ts
/** Captured output from one local process invocation. */
export type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

/** Side-effect boundary used by the local Supabase workflows. */
export type SupabaseLocalEnvironmentIO = Readonly<{
  projectRoot: string;
  readTextFile: (filePath: string) => Promise<string>;
  writeTextFile: (filePath: string, contents: string) => Promise<void>;
  copyFile: (sourcePath: string, targetPath: string) => Promise<void>;
  findDevelopmentEnvFiles: () => Promise<string[]>;
  makeDirectory: (directoryPath: string) => Promise<void>;
  removePath: (targetPath: string) => Promise<void>;
  pathExists: (targetPath: string) => Promise<boolean>;
  readBranch: () => Promise<string>;
  readWorktreePath: () => Promise<string>;
  isPortAvailable: (port: number) => Promise<boolean>;
  hasSupabaseResources: (projectId: string) => Promise<boolean>;
  runSupabase: (args: readonly string[]) => Promise<CommandResult>;
}>;
```

- [ ] **Step 2: Write a failing adapter test**

Create `createSupabaseLocalEnvironmentIO.test.ts`:

```ts
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO";
import { afterEach, describe, expect, it } from "vitest";

let temporaryDirectories: string[] = [];

afterEach(async () => {
  const directoriesToRemove = temporaryDirectories;
  temporaryDirectories = [];
  await Promise.all(
    directoriesToRemove.map(async (directoryPath) => {
      await rm(directoryPath, { recursive: true, force: true });
    }),
  );
});

describe("createSupabaseLocalEnvironmentIO", () => {
  it("finds only development environment files in sorted order", async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), "ava-supabase-io-"));
    temporaryDirectories.push(projectRoot);
    await Promise.all(
      [".env.development.edge", ".env.production", ".env.development"].map(
        async (fileName) => {
          await writeFile(
            path.join(projectRoot, fileName),
            "VALUE=test\n",
            "utf8",
          );
        },
      ),
    );

    const io = createSupabaseLocalEnvironmentIO(projectRoot);
    await expect(io.findDevelopmentEnvFiles()).resolves.toEqual([
      path.join(projectRoot, ".env.development"),
      path.join(projectRoot, ".env.development.edge"),
    ]);
  });
});
```

This test must fail before the adapter exists.

- [ ] **Step 3: Implement the adapter**

Use `node:fs/promises`, `node:child_process.execFile`, `node:net`, and
`node:util.promisify`. The public command adapter invokes only the `supabase`
binary with its supplied argument array and `cwd: projectRoot`. Implement port
probing by listening on `127.0.0.1`, resolving `true` after a successful listen
and close, and resolving `false` on `EADDRINUSE` or `EACCES`. Git reads use
`git branch --show-current` and `git rev-parse --show-toplevel`; an empty branch
is returned as an error by the workflow, not replaced in the adapter.

`hasSupabaseResources(projectId)` runs read-only Docker list commands for
containers, networks, and volumes with the exact label filter
`com.supabase.cli.project=<projectId>`. A non-empty ID list means the project id
is already owned. Any Docker query failure is an error, because proceeding
would make later cleanup unsafe.

The development-file glob is implemented without a dependency:

```ts
const directoryEntries = await readdir(projectRoot, { withFileTypes: true });
return directoryEntries
  .filter((entry) => {
    return (
      entry.isFile() &&
      (entry.name === ".env.development" ||
        entry.name.startsWith(".env.development."))
    );
  })
  .map((entry) => path.join(projectRoot, entry.name))
  .sort();
```

`runSupabase` must return `{ ok: false, stdout, stderr }` for non-zero exits
rather than throwing, so workflow rollback always receives the failed result.
The complete adapter is:

```ts
import { execFile } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import * as net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import type {
  CommandResult,
  SupabaseLocalEnvironmentIO,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const execFileAsync = promisify(execFile);

async function _runCommand(
  options: Readonly<{
    command: string;
    args: readonly string[];
    cwd: string;
  }>,
): Promise<CommandResult> {
  try {
    const result = await execFileAsync(options.command, [...options.args], {
      cwd: options.cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error) {
    const commandError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      ok: false,
      stdout: commandError.stdout?.trim() ?? "",
      stderr:
        commandError.stderr?.trim() ?? commandError.message ?? "Command failed",
    };
  }
}

function _isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }
      reject(error);
    });
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function _hasSupabaseResources(
  options: Readonly<{
    projectRoot: string;
    projectId: string;
  }>,
): Promise<boolean> {
  const resourceCommands = ["container", "network", "volume"].map(
    (resourceType) => [
      resourceType,
      "ls",
      ...(resourceType === "container" ? ["-a"] : []),
      "--filter",
      `label=com.supabase.cli.project=${options.projectId}`,
      "--format",
      "{{.ID}}",
    ],
  );
  const results = await Promise.all(
    resourceCommands.map(async (args) => {
      return await _runCommand({
        command: "docker",
        args,
        cwd: options.projectRoot,
      });
    }),
  );
  const failedResult = results.find(({ ok }) => !ok);
  if (failedResult) {
    throw new Error(
      `Cannot verify local Supabase project ownership: ${failedResult.stderr}`,
    );
  }
  return results.some(({ stdout }) => stdout !== "");
}

/** Creates the real local I/O boundary for Supabase switch and restore. */
export function createSupabaseLocalEnvironmentIO(
  projectRoot: string,
): SupabaseLocalEnvironmentIO {
  return {
    projectRoot,
    readTextFile: async (filePath) => await readFile(filePath, "utf8"),
    writeTextFile: async (filePath, contents) => {
      await writeFile(filePath, contents, "utf8");
    },
    copyFile: async (sourcePath, targetPath) => {
      await copyFile(sourcePath, targetPath);
    },
    findDevelopmentEnvFiles: async () => {
      const directoryEntries = await readdir(projectRoot, {
        withFileTypes: true,
      });
      return directoryEntries
        .filter((entry) => {
          return (
            entry.isFile() &&
            (entry.name === ".env.development" ||
              entry.name.startsWith(".env.development."))
          );
        })
        .map((entry) => path.join(projectRoot, entry.name))
        .sort();
    },
    makeDirectory: async (directoryPath) => {
      await mkdir(directoryPath, { recursive: true });
    },
    removePath: async (targetPath) => {
      await rm(targetPath, { recursive: true, force: true });
    },
    pathExists: async (targetPath) => {
      try {
        await access(targetPath);
        return true;
      } catch {
        return false;
      }
    },
    readBranch: async () => {
      const result = await _runCommand({
        command: "git",
        args: ["branch", "--show-current"],
        cwd: projectRoot,
      });
      if (!result.ok) {
        throw new Error(`Cannot read the current Git branch: ${result.stderr}`);
      }
      return result.stdout;
    },
    readWorktreePath: async () => {
      const result = await _runCommand({
        command: "git",
        args: ["rev-parse", "--show-toplevel"],
        cwd: projectRoot,
      });
      if (!result.ok) {
        throw new Error(`Cannot read the worktree path: ${result.stderr}`);
      }
      return result.stdout;
    },
    isPortAvailable: _isPortAvailable,
    hasSupabaseResources: async (projectId) => {
      return await _hasSupabaseResources({ projectRoot, projectId });
    },
    runSupabase: async (args) => {
      return await _runCommand({ command: "supabase", args, cwd: projectRoot });
    },
  };
}
```

- [ ] **Step 4: Run the adapter test and type check**

```bash
pnpm vitest run -c apps/ava-cli/vitest.config.ts \
  apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO.test.ts
pnpm type-check
```

Expected: PASS with no command output containing environment values.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record focused evidence.

## Task 4: Implement transactional switch and restore workflows

**Files:**

- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.ts`
- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.test.ts`

**Interfaces:**

- Consumes: all Task 1 through Task 3 helpers.
- Produces:
  `SupabaseLocalEnvironment.switch({ io, temporaryProjectId, requestedBasePort })`
  and `SupabaseLocalEnvironment.restore({ io })`.

- [ ] **Step 1: Write failing workflow tests with a fake I/O implementation**

Create `SupabaseLocalEnvironment.test.ts`. The fake is deliberately in-memory,
so the suite can assert ordering and rollback without starting Docker:

```ts
import path from "node:path";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import { describe, expect, it } from "vitest";
import type {
  CommandResult,
  SupabaseBackupManifest,
  SupabaseLocalEnvironmentIO,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const PROJECT_ROOT = "/repo";
const BRANCH = "feat/analytics-p2";
const CONFIG_PATH = `${PROJECT_ROOT}/supabase/config.toml`;
const ENV_PATH = `${PROJECT_ROOT}/.env.development`;
const EDGE_ENV_PATH = `${PROJECT_ROOT}/.env.development.edge`;
const ORIGINAL_CONFIG = `project_id = "avandar"

[api]
port = 54321

[db]
port = 54322
`;
const ORIGINAL_ENV = "VITE_SUPABASE_API_URL=old\nUNRELATED=keep\n";
const ORIGINAL_EDGE_ENV = "SB_SECRET_KEY=old\n";
const STATUS_JSON = JSON.stringify({
  API_URL: "http://127.0.0.1:55321",
  DB_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
  ANON_KEY: "anon",
  SERVICE_ROLE_KEY: "service",
  PUBLISHABLE_KEY: "publishable",
  SECRET_KEY: "secret",
});

type FakeOptions = Readonly<{
  branch?: string;
  worktreePath?: string;
  hasSupabaseResources?: boolean;
  copyFailureTarget?: string;
  commandResults?: Readonly<Record<string, CommandResult>>;
}>;

function _backupDirectory(
  branch = BRANCH,
  worktreePath = PROJECT_ROOT,
): string {
  const branchKey = Buffer.from(branch, "utf8").toString("base64url");
  const worktreeKey = Buffer.from(worktreePath, "utf8").toString("base64url");
  return `${PROJECT_ROOT}/.ava/backups/supabase/${branchKey}/${worktreeKey}`;
}

function _backupPath(sourcePath: string): string {
  const relativePath = path.relative(PROJECT_ROOT, sourcePath);
  const fileKey = Buffer.from(relativePath, "utf8").toString("base64url");
  return `${_backupDirectory()}/files/${fileKey}`;
}

function _createFakeIO(options: FakeOptions = {}) {
  const files = new Map<string, string>([
    [CONFIG_PATH, ORIGINAL_CONFIG],
    [ENV_PATH, ORIGINAL_ENV],
    [EDGE_ENV_PATH, ORIGINAL_EDGE_ENV],
  ]);
  const directories = new Set<string>();
  const commands: string[][] = [];
  const copyOperations: Array<readonly [string, string]> = [];
  const operations: string[] = [];
  const commandResults = options.commandResults ?? {};

  const io: SupabaseLocalEnvironmentIO = {
    projectRoot: PROJECT_ROOT,
    readTextFile: async (filePath) => {
      const contents = files.get(filePath);
      if (contents === undefined) {
        throw new Error(`Missing fake file ${filePath}`);
      }
      return contents;
    },
    writeTextFile: async (filePath, contents) => {
      operations.push(`write:${filePath}`);
      files.set(filePath, contents);
    },
    copyFile: async (sourcePath, targetPath) => {
      operations.push(`copy:${sourcePath}`);
      copyOperations.push([sourcePath, targetPath]);
      if (targetPath === options.copyFailureTarget) {
        throw new Error(`Cannot copy to ${targetPath}`);
      }
      const contents = files.get(sourcePath);
      if (contents === undefined) {
        throw new Error(`Missing fake file ${sourcePath}`);
      }
      files.set(targetPath, contents);
    },
    findDevelopmentEnvFiles: async () => [ENV_PATH, EDGE_ENV_PATH],
    makeDirectory: async (directoryPath) => {
      directories.add(directoryPath);
    },
    removePath: async (targetPath) => {
      operations.push(`remove:${targetPath}`);
      [...files.keys()]
        .filter((filePath) => filePath.startsWith(targetPath))
        .forEach((filePath) => files.delete(filePath));
      [...directories]
        .filter((directoryPath) => directoryPath.startsWith(targetPath))
        .forEach((directoryPath) => directories.delete(directoryPath));
    },
    pathExists: async (targetPath) => {
      return (
        files.has(targetPath) ||
        directories.has(targetPath) ||
        [...directories].some((directoryPath) => {
          return directoryPath.startsWith(`${targetPath}/`);
        })
      );
    },
    readBranch: async () => options.branch ?? BRANCH,
    readWorktreePath: async () => options.worktreePath ?? PROJECT_ROOT,
    isPortAvailable: async () => true,
    hasSupabaseResources: async () => options.hasSupabaseResources ?? false,
    runSupabase: async (args) => {
      const command = [...args];
      commands.push(command);
      operations.push(`command:${command.join(" ")}`);
      return (
        commandResults[command.join(" ")] ?? {
          ok: true,
          stdout: command[0] === "status" ? STATUS_JSON : "",
          stderr: "",
        }
      );
    },
  };

  return { io, files, directories, commands, copyOperations, operations };
}

function _seedActiveBackup(fake: ReturnType<typeof _createFakeIO>): void {
  const backupDirectory = _backupDirectory();
  const manifest: SupabaseBackupManifest = {
    branch: BRANCH,
    worktreePath: PROJECT_ROOT,
    temporaryProjectId: "analytics-p2-temp",
    basePort: 55321,
    derivedPorts: { "api.port": 55321, "db.port": 55322 },
    files: [CONFIG_PATH, ENV_PATH, EDGE_ENV_PATH].map((sourcePath) => ({
      sourcePath,
      backupPath: _backupPath(sourcePath),
    })),
    state: "active",
  };
  fake.directories.add(backupDirectory);
  fake.files.set(_backupPath(CONFIG_PATH), ORIGINAL_CONFIG);
  fake.files.set(_backupPath(ENV_PATH), ORIGINAL_ENV);
  fake.files.set(_backupPath(EDGE_ENV_PATH), ORIGINAL_EDGE_ENV);
  fake.files.set(
    `${backupDirectory}/manifest.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fake.files.set(CONFIG_PATH, 'project_id = "analytics-p2-temp"\n');
  fake.files.set(ENV_PATH, "VITE_SUPABASE_API_URL=temp\n");
  fake.files.set(EDGE_ENV_PATH, "SB_SECRET_KEY=temp\n");
}

describe("SupabaseLocalEnvironment.switch", () => {
  it("refuses a detached HEAD before creating a backup", async () => {
    const fake = _createFakeIO({ branch: "" });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("requires a named Git branch");
    expect(fake.copyOperations).toEqual([]);
  });

  it("rejects an unsafe project id before creating a backup", async () => {
    const fake = _createFakeIO();
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "../shared",
      }),
    ).rejects.toThrow("letters, numbers, hyphens, and underscores");
    expect(fake.copyOperations).toEqual([]);
  });

  it("refuses a project id already owned by local Docker resources", async () => {
    const fake = _createFakeIO({ hasSupabaseResources: true });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "another-agents-stack",
      }),
    ).rejects.toThrow("already belongs to another local Supabase stack");
    expect(fake.copyOperations).toEqual([]);
    expect(fake.commands).toEqual([]);
  });

  it("refuses to reuse the current Supabase project id", async () => {
    const fake = _createFakeIO();
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "avandar",
      }),
    ).rejects.toThrow("must differ from the current id");
    expect(fake.copyOperations).toEqual([]);
  });

  it("refuses a second switch for the same branch", async () => {
    const fake = _createFakeIO();
    fake.directories.add(_backupDirectory());
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("Run ava supabase restore first");
    expect(fake.commands).toEqual([]);
  });

  it("ignores a backup belonging to another branch", async () => {
    const fake = _createFakeIO();
    fake.directories.add(_backupDirectory("feat/other-work"));
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).resolves.toEqual({ basePort: 55321, projectId: "analytics-p2-temp" });
  });

  it("ignores a same-branch backup belonging to another worktree", async () => {
    const fake = _createFakeIO();
    fake.directories.add(_backupDirectory(BRANCH, "/repo-copy"));
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).resolves.toEqual({ basePort: 55321, projectId: "analytics-p2-temp" });
  });

  it("backs up every development file before rewriting configuration", async () => {
    const fake = _createFakeIO();
    await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });
    expect(
      fake.copyOperations.map(([sourcePath]) => sourcePath).sort(),
    ).toEqual([CONFIG_PATH, EDGE_ENV_PATH, ENV_PATH].sort());
    const configWriteIndex = fake.operations.indexOf(`write:${CONFIG_PATH}`);
    const lastCopyIndex = Math.max(
      ...fake.operations
        .map((operation, index) => ({ operation, index }))
        .filter(({ operation }) => operation.startsWith("copy:"))
        .map(({ index }) => index),
    );
    expect(lastCopyIndex).toBeLessThan(configWriteIndex);
  });

  it("removes a partial backup when copying a source file fails", async () => {
    const fake = _createFakeIO({ copyFailureTarget: _backupPath(ENV_PATH) });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow(`Cannot copy to ${_backupPath(ENV_PATH)}`);
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    await expect(fake.io.pathExists(_backupDirectory())).resolves.toBe(false);
    expect(fake.commands).toEqual([]);
  });

  it("starts before reading status and rewriting environments", async () => {
    const fake = _createFakeIO();
    await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });
    expect(fake.operations.indexOf("command:start")).toBeLessThan(
      fake.operations.indexOf("command:status -o json"),
    );
    expect(fake.operations.indexOf("command:status -o json")).toBeLessThan(
      fake.operations.indexOf(`write:${ENV_PATH}`),
    );
  });

  it("rolls back files and stops the temporary project when startup fails", async () => {
    const fake = _createFakeIO({
      commandResults: {
        start: { ok: false, stdout: "", stderr: "start failed" },
      },
    });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("Supabase start failed");
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    expect(fake.files.get(ENV_PATH)).toBe(ORIGINAL_ENV);
    expect(fake.commands).toContainEqual([
      "stop",
      "--project-id",
      "analytics-p2-temp",
      "--no-backup",
    ]);
    await expect(fake.io.pathExists(_backupDirectory())).resolves.toBe(false);
  });

  it("does not include status stdout in a failure", async () => {
    const fake = _createFakeIO({
      commandResults: {
        "status -o json": {
          ok: false,
          stdout: "SECRET_KEY=must-not-leak",
          stderr: "status failed",
        },
      },
    });
    const switchPromise = SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });
    await expect(switchPromise).rejects.toThrow("Supabase status failed");
    await expect(switchPromise).rejects.not.toThrow("must-not-leak");
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
  });
});

describe("SupabaseLocalEnvironment.restore", () => {
  it("refuses a manifest created for a different worktree", async () => {
    const fake = _createFakeIO();
    _seedActiveBackup(fake);
    const manifestPath = `${_backupDirectory()}/manifest.json`;
    const manifest = JSON.parse(fake.files.get(manifestPath) ?? "{}") as Record<
      string,
      unknown
    >;
    fake.files.set(
      manifestPath,
      `${JSON.stringify({ ...manifest, worktreePath: "/different-worktree" })}\n`,
    );
    await expect(
      SupabaseLocalEnvironment.restore({ io: fake.io }),
    ).rejects.toThrow("belongs to worktree");
    expect(fake.commands).toEqual([]);
  });

  it("refuses a manifest that would restore outside the current worktree", async () => {
    const fake = _createFakeIO();
    _seedActiveBackup(fake);
    const manifestPath = `${_backupDirectory()}/manifest.json`;
    const manifest = JSON.parse(fake.files.get(manifestPath) ?? "{}") as Record<
      string,
      unknown
    >;
    fake.files.set(
      manifestPath,
      `${JSON.stringify({
        ...manifest,
        files: [{ sourcePath: "/outside", backupPath: _backupPath(ENV_PATH) }],
      })}\n`,
    );
    await expect(
      SupabaseLocalEnvironment.restore({ io: fake.io }),
    ).rejects.toThrow("unsafe file paths");
    expect(fake.commands).toEqual([]);
  });

  it("restores files even when temporary project cleanup fails", async () => {
    const fake = _createFakeIO({
      commandResults: {
        "stop --project-id analytics-p2-temp --no-backup": {
          ok: false,
          stdout: "",
          stderr: "cleanup failed",
        },
      },
    });
    _seedActiveBackup(fake);
    await expect(
      SupabaseLocalEnvironment.restore({ io: fake.io }),
    ).rejects.toThrow("analytics-p2-temp requires manual cleanup");
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    expect(fake.files.get(ENV_PATH)).toBe(ORIGINAL_ENV);
    await expect(fake.io.pathExists(_backupDirectory())).resolves.toBe(false);
  });

  it("removes the current branch backup after a successful restore", async () => {
    const fake = _createFakeIO();
    _seedActiveBackup(fake);
    await expect(
      SupabaseLocalEnvironment.restore({ io: fake.io }),
    ).resolves.toBeUndefined();
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    expect(fake.files.get(EDGE_ENV_PATH)).toBe(ORIGINAL_EDGE_ENV);
    await expect(fake.io.pathExists(_backupDirectory())).resolves.toBe(false);
  });

  it("retains the backup when restoring a file fails", async () => {
    const fake = _createFakeIO({ copyFailureTarget: ENV_PATH });
    _seedActiveBackup(fake);
    await expect(
      SupabaseLocalEnvironment.restore({ io: fake.io }),
    ).rejects.toThrow("Backup retained");
    await expect(fake.io.pathExists(_backupDirectory())).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Run the workflow suite and verify RED**

```bash
pnpm vitest run -c apps/ava-cli/vitest.config.ts \
  apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.test.ts
```

Expected: import resolution failure for `SupabaseLocalEnvironment.ts`.

- [ ] **Step 3: Implement branch-scoped backup and validation helpers**

Create `SupabaseLocalEnvironment.ts` with these imports, constants, and helper
types:

```ts
import path from "node:path";
import {
  makeDevelopmentEnvFromStatus,
  makeSupabaseConfigFromBasePort,
  makeSupabaseConfigStateFromContents,
  makeSupabaseLocalStatusFromJson,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/supabaseConfig";
import {
  getAvailableBasePortFromPorts,
  makeDerivedPortsFromBasePort,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/supabasePorts";
import type {
  CommandResult,
  SupabaseBackupFile,
  SupabaseBackupManifest,
  SupabaseConfigState,
  SupabaseLocalEnvironmentIO,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const MANIFEST_FILE = "manifest.json";
const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

type SwitchPreparation = Readonly<{
  backupDirectory: string;
  configContents: string;
  configPath: string;
  envFiles: readonly string[];
  manifest: SupabaseBackupManifest;
}>;

type SwitchSource = Readonly<{
  config: SupabaseConfigState;
  configContents: string;
  configPath: string;
}>;

type RestorePreparation = Readonly<{
  backupDirectory: string;
  manifest: SupabaseBackupManifest;
}>;

function _branchKey(branch: string): string {
  return Buffer.from(branch, "utf8").toString("base64url");
}

function _backupDirectory(
  options: Readonly<{
    projectRoot: string;
    branch: string;
    worktreePath: string;
  }>,
): string {
  const worktreeKey = Buffer.from(options.worktreePath, "utf8").toString(
    "base64url",
  );
  return path.join(
    options.projectRoot,
    ".ava",
    "backups",
    "supabase",
    _branchKey(options.branch),
    worktreeKey,
  );
}

function _isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function _isBackupFile(value: unknown): value is SupabaseBackupFile {
  return (
    _isRecord(value) &&
    typeof value.sourcePath === "string" &&
    typeof value.backupPath === "string"
  );
}

function _isPortRecord(value: unknown): value is Record<string, number> {
  return (
    _isRecord(value) &&
    Object.values(value).every((port) => {
      return typeof port === "number" && Number.isInteger(port);
    })
  );
}

function _isManifest(value: unknown): value is SupabaseBackupManifest {
  return (
    _isRecord(value) &&
    typeof value.branch === "string" &&
    typeof value.worktreePath === "string" &&
    typeof value.temporaryProjectId === "string" &&
    typeof value.basePort === "number" &&
    Number.isInteger(value.basePort) &&
    _isPortRecord(value.derivedPorts) &&
    Array.isArray(value.files) &&
    value.files.length > 0 &&
    value.files.every(_isBackupFile) &&
    (value.state === "switching" || value.state === "active")
  );
}

function _isPathInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return (
    relativePath !== "" &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function _hasSafeManifestPaths(
  options: Readonly<{
    manifest: SupabaseBackupManifest;
    backupDirectory: string;
    worktreePath: string;
  }>,
): boolean {
  return options.manifest.files.every(({ sourcePath, backupPath }) => {
    return (
      _isPathInside(options.worktreePath, sourcePath) &&
      _isPathInside(options.backupDirectory, backupPath)
    );
  });
}

function _requireCommandSuccess(result: CommandResult, stage: string): void {
  if (!result.ok) {
    throw new Error(`${stage} failed: ${result.stderr || "unknown error"}`);
  }
}
```

Append the exact backup helpers. `_createBackup` removes a partially copied
directory before returning an error:

```ts
async function _writeManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    backupDirectory: string;
    manifest: SupabaseBackupManifest;
  }>,
): Promise<void> {
  const manifestPath = path.join(options.backupDirectory, MANIFEST_FILE);
  await options.io.writeTextFile(
    manifestPath,
    `${JSON.stringify(options.manifest, null, 2)}\n`,
  );
}

async function _copyFileToBackup(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    sourcePath: string;
    worktreePath: string;
    filesDirectory: string;
  }>,
): Promise<SupabaseBackupFile> {
  const relativePath = path.relative(options.worktreePath, options.sourcePath);
  if (!_isPathInside(options.worktreePath, options.sourcePath)) {
    throw new Error(`Cannot back up a file outside ${options.worktreePath}.`);
  }
  const fileKey = Buffer.from(relativePath, "utf8").toString("base64url");
  const backupPath = path.join(options.filesDirectory, fileKey);
  await options.io.copyFile(options.sourcePath, backupPath);
  return { sourcePath: options.sourcePath, backupPath };
}

async function _copyFilesToBackup(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    sourcePaths: readonly string[];
    worktreePath: string;
    filesDirectory: string;
  }>,
): Promise<SupabaseBackupFile[]> {
  const [sourcePath, ...remainingSourcePaths] = options.sourcePaths;
  if (!sourcePath) {
    return [];
  }
  const backupFile = await _copyFileToBackup({ ...options, sourcePath });
  const remainingBackupFiles = await _copyFilesToBackup({
    ...options,
    sourcePaths: remainingSourcePaths,
  });
  return [backupFile, ...remainingBackupFiles];
}

async function _createBackup(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    branch: string;
    worktreePath: string;
    backupDirectory: string;
    temporaryProjectId: string;
    basePort: number;
    derivedPorts: Record<string, number>;
    sourcePaths: readonly string[];
  }>,
): Promise<SupabaseBackupManifest> {
  const { io, backupDirectory } = options;
  const filesDirectory = path.join(backupDirectory, "files");
  await io.makeDirectory(filesDirectory);
  try {
    const files = await _copyFilesToBackup({
      io,
      sourcePaths: options.sourcePaths,
      worktreePath: options.worktreePath,
      filesDirectory,
    });
    const manifest: SupabaseBackupManifest = {
      branch: options.branch,
      worktreePath: options.worktreePath,
      temporaryProjectId: options.temporaryProjectId,
      basePort: options.basePort,
      derivedPorts: options.derivedPorts,
      files,
      state: "switching",
    };
    await _writeManifest({ io, backupDirectory, manifest });
    return manifest;
  } catch (error) {
    await io.removePath(backupDirectory);
    throw error;
  }
}

async function _readManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    backupDirectory: string;
  }>,
): Promise<SupabaseBackupManifest> {
  const manifestPath = path.join(options.backupDirectory, MANIFEST_FILE);
  const value: unknown = JSON.parse(
    await options.io.readTextFile(manifestPath),
  );
  if (!_isManifest(value)) {
    throw new Error(`Invalid Supabase backup manifest at ${manifestPath}.`);
  }
  return value;
}

async function _restoreFiles(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    manifest: SupabaseBackupManifest;
  }>,
): Promise<void> {
  await Promise.all(
    options.manifest.files.map(async ({ sourcePath, backupPath }) => {
      await options.io.copyFile(backupPath, sourcePath);
    }),
  );
}
```

- [ ] **Step 4: Implement switch preparation**

Append these helpers. Project-id validation and the nested-switch check both
happen before any backup directory is created:

```ts
async function _readSwitchIdentity(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
  }>,
): Promise<
  Readonly<{
    branch: string;
    worktreePath: string;
    backupDirectory: string;
  }>
> {
  const branch = await options.io.readBranch();
  if (branch === "") {
    throw new Error("Supabase switch requires a named Git branch.");
  }
  const worktreePath = await options.io.readWorktreePath();
  const backupDirectory = _backupDirectory({
    projectRoot: options.io.projectRoot,
    branch,
    worktreePath,
  });
  if (await options.io.pathExists(backupDirectory)) {
    throw new Error(
      `Branch ${branch} already has an active Supabase switch. Run ava supabase restore first.`,
    );
  }
  return { branch, worktreePath, backupDirectory };
}

async function _prepareSwitch(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    temporaryProjectId: string;
    requestedBasePort?: number;
  }>,
): Promise<SwitchPreparation> {
  const { io, temporaryProjectId, requestedBasePort } = options;
  if (!PROJECT_ID_PATTERN.test(temporaryProjectId)) {
    throw new Error(
      "The temporary project id must start with a lower-case letter or number and use only lower-case letters, numbers, hyphens, and underscores.",
    );
  }
  const identity = await _readSwitchIdentity({ io });
  const source = await _readSwitchSource({ io, temporaryProjectId });
  const basePort = await getAvailableBasePortFromPorts({
    currentApiPort: source.config.apiPort,
    currentPorts: source.config.ports,
    requestedBasePort,
    isPortAvailable: io.isPortAvailable,
  });
  const derivedPorts = makeDerivedPortsFromBasePort({
    currentApiPort: source.config.apiPort,
    currentPorts: source.config.ports,
    basePort,
  });
  const envFiles = await io.findDevelopmentEnvFiles();
  const manifest = await _createBackup({
    io,
    ...identity,
    temporaryProjectId,
    basePort,
    derivedPorts,
    sourcePaths: [source.configPath, ...envFiles],
  });
  return {
    backupDirectory: identity.backupDirectory,
    configContents: source.configContents,
    configPath: source.configPath,
    envFiles,
    manifest,
  };
}

async function _readSwitchSource(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    temporaryProjectId: string;
  }>,
): Promise<SwitchSource> {
  const { io, temporaryProjectId } = options;
  const configPath = path.join(io.projectRoot, "supabase", "config.toml");
  const configContents = await io.readTextFile(configPath);
  const config = makeSupabaseConfigStateFromContents(configContents);
  if (temporaryProjectId === config.projectId) {
    throw new Error(
      "The temporary project id must differ from the current id.",
    );
  }
  if (await io.hasSupabaseResources(temporaryProjectId)) {
    throw new Error(
      `Project id ${temporaryProjectId} already belongs to another local Supabase stack.`,
    );
  }
  return { config, configContents, configPath };
}
```

- [ ] **Step 5: Implement transactional switch orchestration**

Append the startup, environment rewrite, and rollback helpers followed by
`_switch`. A rollback always attempts both project cleanup and file restore. It
retains the backup if restoring a file fails:

```ts
async function _cleanupTemporaryProject(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    temporaryProjectId: string;
  }>,
): Promise<Error | undefined> {
  try {
    const result = await options.io.runSupabase([
      "stop",
      "--project-id",
      options.temporaryProjectId,
      "--no-backup",
    ]);
    if (!result.ok) {
      return new Error(result.stderr || "unknown cleanup error");
    }
    return undefined;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

async function _rewriteDevelopmentEnvironments(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    envFiles: readonly string[];
    statusJson: string;
  }>,
): Promise<void> {
  const status = makeSupabaseLocalStatusFromJson(options.statusJson);
  const [envPath, ...remainingEnvFiles] = options.envFiles;
  if (!envPath) {
    return;
  }
  const envContents = await options.io.readTextFile(envPath);
  await options.io.writeTextFile(
    envPath,
    makeDevelopmentEnvFromStatus({ envContents, status }),
  );
  await _rewriteDevelopmentEnvironments({
    ...options,
    envFiles: remainingEnvFiles,
  });
}

async function _rollbackSwitch(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    backupDirectory: string;
    manifest: SupabaseBackupManifest;
    switchError: unknown;
  }>,
): Promise<never> {
  const cleanupError = await _cleanupTemporaryProject({
    io: options.io,
    temporaryProjectId: options.manifest.temporaryProjectId,
  });
  try {
    await _restoreFiles({ io: options.io, manifest: options.manifest });
  } catch (restoreError) {
    throw new AggregateError(
      [options.switchError, restoreError],
      `Supabase switch failed and file restoration failed. Backup retained at ${options.backupDirectory}.`,
    );
  }
  try {
    await options.io.removePath(options.backupDirectory);
  } catch (backupError) {
    throw new AggregateError(
      [options.switchError, backupError],
      `Supabase switch failed and files were restored, but backup removal failed at ${options.backupDirectory}.`,
    );
  }
  if (cleanupError) {
    throw new AggregateError(
      [options.switchError, cleanupError],
      `Supabase switch failed; files were restored, but ${options.manifest.temporaryProjectId} requires manual cleanup.`,
    );
  }
  throw options.switchError;
}

async function _switch(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    temporaryProjectId: string;
    requestedBasePort?: number;
  }>,
): Promise<{ basePort: number; projectId: string }> {
  const preparation = await _prepareSwitch(options);
  try {
    return await _activateSwitch({
      io: options.io,
      preparation,
      temporaryProjectId: options.temporaryProjectId,
    });
  } catch (error) {
    return await _rollbackSwitch({
      io: options.io,
      backupDirectory: preparation.backupDirectory,
      manifest: preparation.manifest,
      switchError: error,
    });
  }
}

async function _activateSwitch(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    preparation: SwitchPreparation;
    temporaryProjectId: string;
  }>,
): Promise<{ basePort: number; projectId: string }> {
  const { io, preparation, temporaryProjectId } = options;
  await io.writeTextFile(
    preparation.configPath,
    makeSupabaseConfigFromBasePort({
      configContents: preparation.configContents,
      projectId: temporaryProjectId,
      basePort: preparation.manifest.basePort,
    }),
  );
  _requireCommandSuccess(await io.runSupabase(["start"]), "Supabase start");
  const statusResult = await io.runSupabase(["status", "-o", "json"]);
  _requireCommandSuccess(statusResult, "Supabase status");
  await _rewriteDevelopmentEnvironments({
    io,
    envFiles: preparation.envFiles,
    statusJson: statusResult.stdout,
  });
  await _writeManifest({
    io,
    backupDirectory: preparation.backupDirectory,
    manifest: { ...preparation.manifest, state: "active" },
  });
  return {
    basePort: preparation.manifest.basePort,
    projectId: temporaryProjectId,
  };
}
```

- [ ] **Step 6: Implement restore orchestration and export the module**

Append the complete restore workflow. It validates current branch and worktree
ownership before invoking the project-specific `supabase stop`. File restoration
runs in `finally`, and a restoration failure retains the backup:

```ts
async function _readRestorePreparation(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
  }>,
): Promise<RestorePreparation> {
  const branch = await options.io.readBranch();
  if (branch === "") {
    throw new Error("Supabase restore requires a named Git branch.");
  }
  const worktreePath = await options.io.readWorktreePath();
  const backupDirectory = _backupDirectory({
    projectRoot: options.io.projectRoot,
    branch,
    worktreePath,
  });
  if (!(await options.io.pathExists(backupDirectory))) {
    throw new Error(`Branch ${branch} has no active Supabase switch.`);
  }
  const manifest = await _readManifest({ io: options.io, backupDirectory });
  if (manifest.branch !== branch || manifest.worktreePath !== worktreePath) {
    throw new Error(
      `Supabase backup belongs to worktree ${manifest.worktreePath}, not ${worktreePath}.`,
    );
  }
  if (!_hasSafeManifestPaths({ manifest, backupDirectory, worktreePath })) {
    throw new Error("Supabase backup manifest contains unsafe file paths.");
  }
  return { backupDirectory, manifest };
}

async function _restore(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
  }>,
): Promise<void> {
  const preparation = await _readRestorePreparation(options);
  let cleanupError: Error | undefined;
  let restoreError: unknown;
  try {
    cleanupError = await _cleanupTemporaryProject({
      io: options.io,
      temporaryProjectId: preparation.manifest.temporaryProjectId,
    });
  } finally {
    try {
      await _restoreFiles({
        io: options.io,
        manifest: preparation.manifest,
      });
    } catch (error) {
      restoreError = error;
    }
  }
  if (restoreError) {
    throw new AggregateError(
      cleanupError ? [cleanupError, restoreError] : [restoreError],
      `Supabase file restoration failed. Backup retained at ${preparation.backupDirectory}.`,
    );
  }
  await options.io.removePath(preparation.backupDirectory);
  if (cleanupError) {
    throw new Error(
      `Files were restored, but ${preparation.manifest.temporaryProjectId} requires manual cleanup: ${cleanupError.message}`,
    );
  }
}

/** Manages branch-isolated local Supabase configuration and resources. */
export const SupabaseLocalEnvironment = {
  /** Starts an isolated local Supabase project for the current branch. */
  switch: _switch,

  /** Stops the current branch's temporary project and restores local files. */
  restore: _restore,
};
```

- [ ] **Step 7: Run workflow tests and type check**

```bash
pnpm vitest run -c apps/ava-cli/vitest.config.ts \
  apps/ava-cli/src/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.test.ts
pnpm type-check
```

Expected: all workflow tests pass, including the startup rollback and cleanup
failure cases.

- [ ] **Step 8: Review checkpoint**

Do not commit. Record test evidence and any cleanup warning behavior.

## Task 5: Wire the CLI and perform a real isolated-stack smoke test

**Files:**

- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseSwitchCLI/SupabaseSwitchCLI.ts`
- Create: `apps/ava-cli/src/SupabaseCLI/SupabaseRestoreCLI/SupabaseRestoreCLI.ts`
- Modify: `apps/ava-cli/src/SupabaseCLI/SupabaseCLI.ts`

**Interfaces:**

- Produces: `ava supabase switch <new-id> [port]` and
  `ava supabase restore`.

Backups live under the existing `.ava/` directory, which `.gitignore` already
ignores, so no ignore-file change is needed.

- [ ] **Step 1: Create the switch command**

```ts
import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import { printError, printSuccess } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

type Args = {
  newId: string;
  port?: number;
};

/** CLI for starting a branch-isolated local Supabase project. */
export const SupabaseSwitchCLI = Acclimate.createCLI("switch")
  .description("Start an isolated local Supabase project for this Git branch")
  .addPositionalArg({
    name: "newId",
    required: true,
    description: "Temporary local Supabase project id.",
    type: "string",
    validator: (value: string) => {
      if (!/^[a-z0-9][a-z0-9_-]*$/.test(value)) {
        return "Project id must start with a lower-case letter or number and use only lower-case letters, numbers, hyphens, and underscores.";
      }
      return true;
    },
  })
  .addPositionalArg({
    name: "port",
    required: false,
    description: "Optional API base port. Omit to select a free port set.",
    type: "number",
    parser: (value: string) => Number(value),
    validator: (value: number) => {
      if (!Number.isInteger(value) || value < 1 || value > 65_535) {
        return "Port must be an integer from 1 through 65535.";
      }
      return true;
    },
  })
  .action((args: Readonly<Args>) => {
    const io = createSupabaseLocalEnvironmentIO(process.cwd());
    return SupabaseLocalEnvironment.switch({
      io,
      temporaryProjectId: args.newId,
      requestedBasePort: args.port,
    })
      .then(({ basePort, projectId }) => {
        printSuccess(
          `Supabase project ${projectId} is active on API port ${basePort}.`,
        );
      })
      .catch((error: unknown) => {
        printError(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      });
  });
```

- [ ] **Step 2: Create the restore command**

Create `SupabaseRestoreCLI.ts`:

```ts
import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import { printError, printSuccess } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

/** CLI for restoring this branch's original local Supabase configuration. */
export const SupabaseRestoreCLI = Acclimate.createCLI("restore")
  .description("Stop this branch's isolated Supabase project and restore files")
  .action(() => {
    const io = createSupabaseLocalEnvironmentIO(process.cwd());
    return SupabaseLocalEnvironment.restore({ io })
      .then(() => {
        printSuccess("Supabase configuration restored for the current branch.");
      })
      .catch((error: unknown) => {
        printError(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      });
  });
```

- [ ] **Step 3: Register both commands**

```ts
import { SupabaseMigrationsCLI } from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/SupabaseMigrationsCLI";
import { SupabaseRestoreCLI } from "@ava-cli/SupabaseCLI/SupabaseRestoreCLI/SupabaseRestoreCLI";
import { SupabaseRunCLI } from "@ava-cli/SupabaseCLI/SupabaseRunCLI/SupabaseRunCLI";
import { SupabaseSwitchCLI } from "@ava-cli/SupabaseCLI/SupabaseSwitchCLI/SupabaseSwitchCLI";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for managing Avandar's Supabase database. */
export const SupabaseCLI = Acclimate.createCLI("supabase")
  .description(
    "Manage Supabase in Avandar. All commands default to the local database.",
  )
  .addCommand("migrations", SupabaseMigrationsCLI)
  .addCommand("restore", SupabaseRestoreCLI)
  .addCommand("run", SupabaseRunCLI)
  .addCommand("switch", SupabaseSwitchCLI);
```

- [ ] **Step 4: Run automated verification**

```bash
pnpm test:ava-cli
pnpm type-check
pnpm build:ava-cli
```

Expected: PASS with pristine output.

- [ ] **Step 5: Exercise a real automatic-port switch**

First record hashes without printing file contents:

```bash
shasum supabase/config.toml .env.development .env.development.*
docker ps \
  --filter label=com.supabase.cli.project=avandar \
  --format '{{.Names}}' | sort
ava supabase switch analytics-p2-isolated
docker ps \
  --filter label=com.supabase.cli.project=avandar \
  --format '{{.Names}}' | sort
```

Expected: the command reports a selected API port, the original shared project
container list is unchanged, and
`supabase status -o json | jq -r '.API_URL'` reports the selected port for this
worktree.

- [ ] **Step 6: Verify branch-scoped refusal**

```bash
ava supabase switch analytics-p2-second
```

Expected: non-zero exit explaining that the current branch must be restored
first. The active isolated stack remains running.

- [ ] **Step 7: Keep the isolated stack active for the analytics plan**

Do not restore yet. The revised analytics growth plan requires this isolated
stack for every migration and database test. Record the selected project id and
API/database ports without recording keys.

- [ ] **Step 8: Review checkpoint**

Do not commit. Hand the CLI diff and automated/manual test evidence to the task
reviewer. Execution continues only after review approval.
