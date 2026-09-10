import path from "node:path";
import { createSupabaseLocalEnvironmentFakeReadIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIo/createSupabaseLocalEnvironmentFakeReadIo";
import type {
  CommandOutputMode,
  CommandResult,
  SupabaseDockerResource,
  SupabaseDockerResourceInspection,
  SupabaseLocalEnvironmentIo,
  SupabaseSeedTarget,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** Canonical project root used by the local-environment fake. */
export const PROJECT_ROOT = "/repo";
/** Canonical Git branch used by the local-environment fake. */
export const BRANCH = "feat/analytics-p2";
/** Canonical Supabase config path used by the local-environment fake. */
export const CONFIG_PATH = `${PROJECT_ROOT}/supabase/config.toml`;
/** Canonical browser development environment path. */
export const ENV_PATH = `${PROJECT_ROOT}/.env.development`;
/** Canonical edge-function development environment path. */
export const EDGE_ENV_PATH = `${PROJECT_ROOT}/.env.development.edge`;
/** Initial Supabase configuration stored by the fake. */
export const ORIGINAL_CONFIG = `project_id = "avandar"

[api]
port = 54321

[db]
port = 54322
`;
/** Initial browser environment contents stored by the fake. */
export const ORIGINAL_ENV = `VITE_APP_URL=http://localhost:5173/
VITE_SUPABASE_API_URL=old
VITE_SUPABASE_ANON_KEY=old
SUPABASE_SERVICE_ROLE_KEY=old
UNRELATED=keep
`;
/** Initial edge-function environment contents stored by the fake. */
export const ORIGINAL_EDGE_ENV = `SB_SECRET_KEY=old
SB_PUBLISHABLE_KEY=old
SB_JWT_ISSUER=http://127.0.0.1:54321/auth/v1
GOOGLE_REDIRECT_URI="http://localhost:54321/functions/v1/google-auth-callback"
`;
/** Successful `supabase status` response returned by the fake. */
export const STATUS_JSON = JSON.stringify({
  API_URL: "http://127.0.0.1:55321",
  DB_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
  ANON_KEY: "anon",
  SERVICE_ROLE_KEY: "service",
  PUBLISHABLE_KEY: "publishable",
  SECRET_KEY: "secret",
});

/** Optional behavior and seeded state for the local-environment fake. */
export type FakeOptions = {
  branch?: string;
  worktreePath?: string;
  hasSupabaseResources?: boolean;
  copyFailureTarget?: string;
  makeDirectoryFailureTarget?: string;
  removeFailureTarget?: string;
  writeFailureTarget?: string;
  canonicalPaths?: Readonly<Record<string, string>>;
  developmentEnvFiles?: readonly string[];
  beforeReserve?: () => Promise<void>;
  commandResults?: Readonly<Record<string, CommandResult>>;
  supabaseResources?: readonly SupabaseDockerResource[];
  resourceInspections?: Readonly<
    Record<string, SupabaseDockerResourceInspection>
  >;
  resourceRemovalFailures?: readonly string[];
  listResourcesError?: string;
  publishedHostPorts?: readonly number[];
  seedResult?: Readonly<CommandResult>;
  seedError?: string;
};

/** Mutable state and I/O adapter exposed to local-environment tests. */
export type FakeHarness = {
  io: SupabaseLocalEnvironmentIo;
  files: Map<string, string>;
  directories: Set<string>;
  commands: string[][];
  commandOutputModes: Array<CommandOutputMode | undefined>;
  copyOperations: Array<[string, string]>;
  operations: string[];
  removedResources: SupabaseDockerResource[];
  seedTargets: SupabaseSeedTarget[];
};

/** Mutable fake state shared by its focused I/O adapters. */
export type FakeState = Omit<FakeHarness, "io"> & {
  commandResults: Readonly<Record<string, CommandResult>>;
};

/** Configuration shared by the fake's focused I/O adapters. */
export type FakeFactoryOptions = {
  options: Readonly<FakeOptions>;
  state: FakeState;
};

function _getResourceKeyFromResource(
  resource: Readonly<SupabaseDockerResource>,
): string {
  return `${resource.type}:${resource.id}`;
}

function _createFakeState(options: Readonly<FakeOptions>): FakeState {
  return {
    files: new Map<string, string>([
      [CONFIG_PATH, ORIGINAL_CONFIG],
      [ENV_PATH, ORIGINAL_ENV],
      [EDGE_ENV_PATH, ORIGINAL_EDGE_ENV],
    ]),
    directories: new Set<string>(),
    commands: [],
    commandOutputModes: [],
    copyOperations: [],
    operations: [],
    removedResources: [],
    seedTargets: [],
    commandResults: options.commandResults ?? {},
  };
}

function _createFakeDevelopmentEnvIo(
  factoryOptions: Readonly<FakeFactoryOptions>,
): Pick<SupabaseLocalEnvironmentIo, "findDevelopmentEnvFiles"> {
  const { options, state } = factoryOptions;
  return {
    findDevelopmentEnvFiles: async () => {
      if (options.developmentEnvFiles) {
        return [...options.developmentEnvFiles];
      }
      return [...new Set([...state.files.keys(), ...state.directories])]
        .filter((filePath) => {
          const fileName = path.basename(filePath);
          return (
            path.dirname(filePath) === PROJECT_ROOT &&
            (fileName === ".env.development" ||
              fileName.startsWith(".env.development."))
          );
        })
        .sort();
    },
  };
}

function _createFakeWriteIo(
  factoryOptions: Readonly<FakeFactoryOptions>,
): Pick<
  SupabaseLocalEnvironmentIo,
  "writeTextFile" | "copyFile" | "makeDirectory" | "reserveDirectory"
> {
  const { options, state } = factoryOptions;
  return {
    writeTextFile: async ({ filePath, contents }) => {
      state.operations.push(`write:${filePath}`);
      if (filePath === options.writeFailureTarget) {
        throw new Error(`Cannot write ${filePath}`);
      }
      state.files.set(filePath, contents);
    },
    copyFile: async ({ sourcePath, targetPath }) => {
      state.operations.push(`copy:${sourcePath}`);
      state.copyOperations.push([sourcePath, targetPath]);
      if (targetPath === options.copyFailureTarget) {
        throw new Error(`Cannot copy to ${targetPath}`);
      }
      const contents = state.files.get(sourcePath);
      if (contents === undefined) {
        throw new Error(`Missing fake file ${sourcePath}`);
      }
      state.files.set(targetPath, contents);
    },
    makeDirectory: async (directoryPath) => {
      state.directories.add(directoryPath);
      if (directoryPath === options.makeDirectoryFailureTarget) {
        throw new Error(`Cannot create ${directoryPath}`);
      }
    },
    reserveDirectory: async (directoryPath) => {
      await options.beforeReserve?.();
      if (state.directories.has(directoryPath)) {
        return false;
      }
      state.directories.add(directoryPath);
      return true;
    },
  };
}

function _createFakePathIo(
  factoryOptions: Readonly<FakeFactoryOptions>,
): Pick<SupabaseLocalEnvironmentIo, "removePath" | "pathExists" | "realPath"> {
  const { options, state } = factoryOptions;
  return {
    removePath: async (targetPath) => {
      state.operations.push(`remove:${targetPath}`);
      if (targetPath === options.removeFailureTarget) {
        throw new Error(`Cannot remove ${targetPath}`);
      }
      [...state.files.keys()]
        .filter((filePath) => {
          return (
            filePath === targetPath || filePath.startsWith(`${targetPath}/`)
          );
        })
        .forEach((filePath) => {
          return state.files.delete(filePath);
        });
      [...state.directories]
        .filter((directoryPath) => {
          return (
            directoryPath === targetPath ||
            directoryPath.startsWith(`${targetPath}/`)
          );
        })
        .forEach((directoryPath) => {
          return state.directories.delete(directoryPath);
        });
    },
    pathExists: async (targetPath) => {
      return (
        state.files.has(targetPath) ||
        state.directories.has(targetPath) ||
        [...state.directories].some((directoryPath) => {
          return directoryPath.startsWith(`${targetPath}/`);
        })
      );
    },
    realPath: async (targetPath) => {
      return options.canonicalPaths?.[targetPath] ?? targetPath;
    },
  };
}

function _createFakeDockerIo(
  factoryOptions: Readonly<FakeFactoryOptions>,
): Pick<
  SupabaseLocalEnvironmentIo,
  | "hasSupabaseResources"
  | "listSupabaseResources"
  | "inspectSupabaseResource"
  | "removeSupabaseResource"
  | "listPublishedHostPorts"
> {
  const { options, state } = factoryOptions;
  return {
    hasSupabaseResources: async () => {
      return options.hasSupabaseResources ?? false;
    },
    listSupabaseResources: async () => {
      if (options.listResourcesError) {
        throw new Error(options.listResourcesError);
      }
      return [...(options.supabaseResources ?? [])];
    },
    inspectSupabaseResource: async (resource) => {
      return (
        options.resourceInspections?.[
          _getResourceKeyFromResource(resource)
        ] ?? { exists: true, projectId: "analytics-p2-temp" }
      );
    },
    removeSupabaseResource: async (resource) => {
      const resourceKey = _getResourceKeyFromResource(resource);
      state.operations.push(`docker-remove:${resourceKey}`);
      if (options.resourceRemovalFailures?.includes(resourceKey)) {
        return { ok: false, stdout: "", stderr: "remove failed" };
      }
      state.removedResources.push(resource);
      return { ok: true, stdout: "", stderr: "" };
    },
    listPublishedHostPorts: async () => {
      return [...(options.publishedHostPorts ?? [])];
    },
  };
}

function _createFakeCommandIo(
  factoryOptions: Readonly<FakeFactoryOptions>,
): Pick<
  SupabaseLocalEnvironmentIo,
  | "readBranch"
  | "readWorktreePath"
  | "isPortAvailable"
  | "runSupabase"
  | "runSeed"
> {
  const { options, state } = factoryOptions;
  return {
    readBranch: async () => {
      return options.branch ?? BRANCH;
    },
    readWorktreePath: async () => {
      return options.worktreePath ?? PROJECT_ROOT;
    },
    isPortAvailable: async () => {
      return true;
    },
    runSupabase: async (commandArguments, commandOptions) => {
      const command = [...commandArguments];
      state.commands.push(command);
      state.commandOutputModes.push(commandOptions?.outputMode);
      state.operations.push(`command:${command.join(" ")}`);
      return (
        state.commandResults[command.join(" ")] ?? {
          ok: true,
          stdout: command[0] === "status" ? STATUS_JSON : "",
          stderr: "",
        }
      );
    },
    runSeed: async (target) => {
      state.seedTargets.push({ ...target });
      state.operations.push(`seed:${target.supabaseUrl}`);
      if (options.seedError) {
        throw new Error(options.seedError);
      }
      return (
        options.seedResult ?? {
          ok: true,
          stdout: "",
          stderr: "",
        }
      );
    },
  };
}

function _createFakeIo(options: Readonly<FakeOptions> = {}): FakeHarness {
  const state = _createFakeState(options);
  const factoryOptions = { options, state };
  const io: SupabaseLocalEnvironmentIo = {
    projectRoot: PROJECT_ROOT,
    ...createSupabaseLocalEnvironmentFakeReadIo(factoryOptions),
    ..._createFakeDevelopmentEnvIo(factoryOptions),
    ..._createFakeWriteIo(factoryOptions),
    ..._createFakePathIo(factoryOptions),
    ..._createFakeDockerIo(factoryOptions),
    ..._createFakeCommandIo(factoryOptions),
  };
  return {
    io,
    files: state.files,
    directories: state.directories,
    commands: state.commands,
    commandOutputModes: state.commandOutputModes,
    copyOperations: state.copyOperations,
    operations: state.operations,
    removedResources: state.removedResources,
    seedTargets: state.seedTargets,
  };
}

/** Builds and keys the fake I/O boundary used by local-environment tests. */
export const SupabaseLocalEnvironmentFakeIo = {
  /** Creates a mutable fake harness with configurable boundary behavior. */
  create: _createFakeIo,

  /** Returns the stable lookup key for a fake Docker resource. */
  getResourceKeyFromResource: _getResourceKeyFromResource,
};
