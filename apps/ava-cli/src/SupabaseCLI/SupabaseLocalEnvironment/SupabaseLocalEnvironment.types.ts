import type {
  SUPABASE_BACKUP_STATES,
  SUPABASE_DOCKER_CLEANUP_RESOURCE_ORDER,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";

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
  state: (typeof SUPABASE_BACKUP_STATES)[number];
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

/** Side-effect boundary used by the local Supabase workflows. */
export type SupabaseLocalEnvironmentIO = {
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
  runSupabase: (commandArguments: readonly string[]) => Promise<CommandResult>;
};

/** Everything a switch needs before it starts mutating local files. */
export type SwitchPreparation = {
  backupDirectory: string;
  configContents: string;
  configPath: string;
  devServerPort: number;
  envFiles: string[];
  manifest: SupabaseBackupManifest;
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

/** Identity, ports, and endpoints of the local Supabase this worktree uses. */
export type SupabaseStatusReport = {
  isSwitched: boolean;
  /** Whether the switch state is the healthy one for this branch. */
  isExpectedForBranch: boolean;
  isRunning: boolean;
  branch: string;
  projectId: string;
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
