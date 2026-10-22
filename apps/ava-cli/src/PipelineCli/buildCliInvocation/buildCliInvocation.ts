import { spawnSync } from "node:child_process";
import { hostname, userInfo } from "node:os";
import { findAvandarRepoRoot } from "@ava-cli/PipelineCli/runPipelineLocal";

/** How the CLI was started, as each pipeline execution it starts records it. */
export type CliInvocation = Readonly<{
  /** The argv after the binary, exactly as typed. */
  cliArgv: readonly string[];
  /** `<OS user>@<hostname>`. */
  actor: string;
  host: string;
  /** The commit checked out where the CLI runs, when it runs in a checkout. */
  codeVersion?: string;
}>;

function _readUsername(): string {
  try {
    return userInfo().username;
  } catch {
    // `userInfo` throws for a user with no passwd entry, as in some
    // containers.
    return "unknown";
  }
}

/**
 * The commit checked out in `directory`, or `undefined` when it is not a git
 * checkout or git is not installed.
 */
export function readGitCommit(directory: string): string | undefined {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: directory,
    encoding: "utf8",
  });
  const commit = result.status === 0 ? result.stdout.trim() : "";
  return commit === "" ? undefined : commit;
}

/**
 * How this CLI process was started: its argv, who ran it where, and the
 * commit of the checkout it runs in.
 *
 * @param cliArgv - The argv after the binary. Defaults to this process's.
 */
export function buildCliInvocation(
  cliArgv: readonly string[] = process.argv.slice(2),
): CliInvocation {
  const host = hostname();
  const codeVersion = readGitCommit(findAvandarRepoRoot() ?? process.cwd());
  return {
    cliArgv,
    actor: `${_readUsername()}@${host}`,
    host,
    ...(codeVersion === undefined ? {} : { codeVersion }),
  };
}
