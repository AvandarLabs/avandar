import { spawnSync } from "node:child_process";
import { hostname, userInfo } from "node:os";

/** How the CLI was started, as each pipeline execution it starts records it. */
export type CliInvocation = Readonly<{
  /** The argv after the binary, exactly as typed. */
  cliArgv: readonly string[];
  /** `<OS user>@<hostname>`. */
  actor: string;
  host: string;
  /**
   * The commit of the checkout the CLI was built from, which is the code that
   * executes. Absent when that location is not a git checkout.
   */
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
 * commit of the checkout the CLI itself lives in. The commit is resolved from
 * the running module's directory (the bundle is CommonJS, so `__dirname`),
 * never from the working directory, which can be any repo.
 *
 * @param cliArgv - The argv after the binary. Defaults to this process's.
 */
export function buildCliInvocation(
  cliArgv: readonly string[] = process.argv.slice(2),
): CliInvocation {
  const host = hostname();
  const codeVersion = readGitCommit(__dirname);
  return {
    cliArgv,
    actor: `${_readUsername()}@${host}`,
    host,
    ...(codeVersion === undefined ? {} : { codeVersion }),
  };
}
