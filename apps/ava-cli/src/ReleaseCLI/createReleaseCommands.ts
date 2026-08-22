import { Acclimate } from "@avandar/acclimate";
import { spawnSync } from "node:child_process";

/** The outcome of one command: whether it succeeded, and what it printed. */
export type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

export type ReleaseCommands = Readonly<{
  /** Absolute path to the repo the release operates on. */
  repoRoot: string;
  /** When true, no mutating command is executed. */
  dryRun: boolean;
  /** Runs a read-only git command. Returns the trimmed stdout, or undefined. */
  readGit: (args: readonly string[]) => string | undefined;
  /** Runs a read-only command and reports success separately from output. */
  tryGit: (args: readonly string[]) => CommandResult;
  /**
   * Runs a read-only command other than git, e.g. `gh`. Always executed, even
   * on a dry run: a read changes nothing, and a dry run that skipped its reads
   * would report a different verdict than the real thing.
   */
  readCommand: (command: string, args: readonly string[]) => CommandResult;
  /** Runs a mutating command, echoing it. Skipped (but echoed) on dry runs. */
  mutate: (command: string, args: readonly string[]) => CommandResult;
  /** Runs a mutating command without echoing it (for cleanup after failure). */
  mutateQuietly: (command: string, args: readonly string[]) => CommandResult;
}>;

function _runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
): CommandResult {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    // spawnSync reports a failure to even start the process (e.g. `gh` is not
    // installed) via `error` rather than stderr, so fold it in.
    stderr: (result.stderr ?? result.error?.message ?? "").trim(),
  };
}

/**
 * The command layer for `ava release`, bound to one repo.
 *
 * Every read of repository state and every mutation of it goes through the
 * returned object, so `--dry-run` is enforced in exactly one place: `mutate`
 * prints the command and refuses to run it, while reads always run because they
 * change nothing.
 */
export function createReleaseCommands(
  options: Readonly<{ repoRoot: string; dryRun: boolean }>,
): ReleaseCommands {
  const { repoRoot, dryRun } = options;

  return {
    repoRoot,
    dryRun,

    readGit: (args: readonly string[]): string | undefined => {
      const result = _runCommand("git", args, repoRoot);
      return result.ok ? result.stdout : undefined;
    },

    tryGit: (args: readonly string[]): CommandResult => {
      return _runCommand("git", args, repoRoot);
    },

    readCommand: (command: string, args: readonly string[]): CommandResult => {
      return _runCommand(command, args, repoRoot);
    },

    mutate: (command: string, args: readonly string[]): CommandResult => {
      Acclimate.log("|gray|  $ $command$|reset|", {
        // Collapsed to one line: a commit message spanning several lines would
        // otherwise make the echoed command unreadable.
        command: [command, ...args].join(" ").replace(/\s*\n\s*/g, " "),
      });
      if (dryRun) {
        return { ok: true, stdout: "", stderr: "" };
      }
      return _runCommand(command, args, repoRoot);
    },

    mutateQuietly: (
      command: string,
      args: readonly string[],
    ): CommandResult => {
      if (dryRun) {
        return { ok: true, stdout: "", stderr: "" };
      }
      return _runCommand(command, args, repoRoot);
    },
  };
}
