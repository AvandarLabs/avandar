import type {
  SUPABASE_BACKUP_STATES,
  SUPABASE_DOCKER_CLEANUP_RESOURCE_ORDER,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";

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

/** What a switch moved the worktree onto: a Docker project of its own. */
export type SupabaseLocalSwitchTarget = {
  kind: "local";
  temporaryProjectId: string;
  basePort: number;
  derivedPorts: Record<string, number>;
};

/** What a switch moved the worktree onto: a hosted Supabase project. */
export type SupabaseRemoteSwitchTarget = {
  kind: "remote";
  remoteProjectId: string;
  remoteApiUrl: string;
};

/** Either place a switch can move a worktree to. */
export type SupabaseSwitchTarget =
  | SupabaseLocalSwitchTarget
  | SupabaseRemoteSwitchTarget;

/** The manifest fields every switch records, whatever its target. */
export type SupabaseBackupRecord = {
  branch: string;
  worktreePath: string;
  files: SupabaseBackupFile[];
  state: (typeof SUPABASE_BACKUP_STATES)[number];
};

/** Durable state required to restore one branch's local configuration. */
export type SupabaseBackupManifest = SupabaseSwitchTarget &
  SupabaseBackupRecord;

/** A local-project manifest, the only kind that owns Docker resources. */
export type SupabaseLocalBackupManifest = SupabaseBackupManifest &
  SupabaseLocalSwitchTarget;

/** The hosted project `ava supabase switch remote` points a worktree at. */
export type SupabaseRemoteConnection = {
  /** The hosted project's reference id, e.g. `abcdefghijklmnopqrst`. */
  projectId: string;
  /** The project URL, e.g. `https://abcdefghijklmnopqrst.supabase.co`. */
  apiUrl: string;
  /** A `postgresql://` connection string for the hosted database. */
  databaseUrl: string;
  publishableKey: string;
  secretKey: string;
};

/** What a completed remote switch points the worktree at. */
export type SupabaseRemoteSwitchResult = {
  remoteProjectId: string;
  apiUrl: string;
};

/** Captured output from one local process invocation. */
export type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

/** A Docker resource type that may be owned by a local Supabase project. */
export type SupabaseDockerResourceType =
  (typeof SUPABASE_DOCKER_CLEANUP_RESOURCE_ORDER)[number];

/** One exact Docker resource identifier and its resource type. */
export type SupabaseDockerResource = {
  type: SupabaseDockerResourceType;
  id: string;
};

/** Current existence and project-label state for a Docker resource. */
export type SupabaseDockerResourceInspection =
  | { exists: false }
  | { exists: true; projectId?: string };

/** Controls whether a local command remains silent or forwards its output. */
export type CommandOutputMode = "capture" | "stream";

/** Side-effect boundary used by the local Supabase workflows. */
export type SupabaseLocalEnvironmentIo = {
  projectRoot: string;
  /** Reads a UTF-8 text file. */
  readTextFile: (filePath: string) => Promise<string>;
  /** Writes a UTF-8 text file. */
  writeTextFile: (
    options: Readonly<{ filePath: string; contents: string }>,
  ) => Promise<void>;
  /** Copies a file without changing its contents. */
  copyFile: (
    options: Readonly<{ sourcePath: string; targetPath: string }>,
  ) => Promise<void>;
  /** Lists the entry names in a directory. */
  readDirectory: (directoryPath: string) => Promise<string[]>;
  /** Finds development environment files beneath the project root. */
  findDevelopmentEnvFiles: () => Promise<string[]>;
  /** Reports whether a path identifies a directory. */
  isDirectory: (targetPath: string) => Promise<boolean>;
  /** Reports whether a path identifies a regular file. */
  isFile: (targetPath: string) => Promise<boolean>;
  /** Creates a directory and any missing parents. */
  makeDirectory: (directoryPath: string) => Promise<void>;
  /** Atomically reserves a directory when it does not exist. */
  reserveDirectory: (directoryPath: string) => Promise<boolean>;
  /** Removes a file or directory tree. */
  removePath: (targetPath: string) => Promise<void>;
  /** Reports whether a path exists. */
  pathExists: (targetPath: string) => Promise<boolean>;
  /** Resolves a path through symbolic links. */
  realPath: (targetPath: string) => Promise<string>;
  /** Reads the current Git branch. */
  readBranch: () => Promise<string>;
  /** Reads the canonical current Git worktree path. */
  readWorktreePath: () => Promise<string>;
  /** Reports whether a TCP port can be bound locally. */
  isPortAvailable: (port: number) => Promise<boolean>;
  /** Lists host TCP ports Docker has already published. */
  listPublishedHostPorts: () => Promise<number[]>;
  /** Reports whether Docker contains resources for a project. */
  hasSupabaseResources: (projectId: string) => Promise<boolean>;
  /** Lists Docker resources owned by a project. */
  listSupabaseResources: (
    projectId: string,
  ) => Promise<SupabaseDockerResource[]>;
  /** Reads the current label state for a Docker resource. */
  inspectSupabaseResource: (
    resource: Readonly<SupabaseDockerResource>,
  ) => Promise<SupabaseDockerResourceInspection>;
  /** Removes one Docker resource. */
  removeSupabaseResource: (
    resource: Readonly<SupabaseDockerResource>,
  ) => Promise<CommandResult>;
  /** Runs the Supabase CLI with the supplied command arguments. */
  runSupabase: (
    commandArguments: readonly string[],
    options?: Readonly<{ outputMode?: CommandOutputMode }>,
  ) => Promise<CommandResult>;
  /** Runs the repository seed against an explicitly addressed local stack. */
  runSeed: (options: Readonly<SupabaseSeedTarget>) => Promise<CommandResult>;
};

/** The one local stack a seed run is allowed to write to. */
export type SupabaseSeedTarget = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

/**
 * What the seed pass did after a switch activated.
 *
 * A failure is reported, never thrown: the stack it would have seeded is
 * already running and correct, so a bad seed must not cost the user the switch.
 */
export type SupabaseSeedOutcome =
  | { state: "seeded" }
  | { state: "skipped" }
  | { state: "unchanged" }
  | { state: "failed"; message: string };

/** The active project a completed switch left behind. */
export type SupabaseSwitchResult = {
  basePort: number;
  devServerPort: number;
  projectId: string;
  seed: SupabaseSeedOutcome;
};

/** Everything a switch needs before it starts mutating local files. */
export type SwitchPreparation = {
  manifest: SupabaseLocalBackupManifest;
  backupDirectory: string;
  /** The env file the Supabase CLI reads its project overrides from. */
  developmentEnvPath: string;
  devServerPort: number;
  envFiles: string[];
};

/** One development environment file as it exists on disk. */
export type DevelopmentEnvFile = {
  filePath: string;
  contents: string;
};

/** One labelled value rendered by `ava supabase status`. */
export type SupabaseStatusEntry = {
  label: string;
  value: string;
};

/** How far one development environment file has drifted from the stack. */
export type SupabaseEnvironmentDrift = {
  filePath: string;
  staleKeys: string[];
};

/**
 * Which Supabase a worktree is on: the shared develop stack, its own local
 * project, or a hosted project.
 */
export type SupabaseSwitchKind = "shared" | "local" | "remote";

/** Which Supabase a worktree is on, and whether that is right for it. */
export type SupabaseSwitchSummary = {
  branch: string;
  switchKind: SupabaseSwitchKind;
  /** The local project id the CLI uses, or the hosted project's id. */
  projectId: string;
  /** The project id `supabase/config.toml` names for the shared stack. */
  sharedProjectId: string;
  /** The hosted project's URL, for a remote switch only. */
  remoteApiUrl: string | undefined;
  /**
   * Whether `.env.development` points somewhere that no switch on this branch
   * created, for example override lines copied from another worktree.
   */
  hasStrayOverride: boolean;
  /** Whether the switch state is the healthy one for this branch. */
  isExpectedForBranch: boolean;
  /** The project id and ports the Supabase CLI uses in this worktree. */
  config: SupabaseConfigState;
};

/**
 * Identity, ports, and endpoints of the Supabase this worktree uses: the
 * shared stack, its own local project, or a hosted project.
 */
export type SupabaseStatusReport = Omit<SupabaseSwitchSummary, "config"> & {
  isSwitched: boolean;
  isRunning: boolean;
  ports: SupabaseStatusEntry[];
  environmentValues: SupabaseStatusEntry[];
  endpoints: SupabaseStatusEntry[];
  environmentDrift: SupabaseEnvironmentDrift[];
};

/** A validated backup plus the directories a restore will read. */
export type RestorePreparation = {
  backupDirectory: string;
  hasProvenOwnership: boolean;
  manifest: SupabaseBackupManifest;
};

/** The three directories one restore operates across. */
export type RestorePaths = {
  backupDirectory: string;
  filesDirectory: string;
  worktreePath: string;
};
