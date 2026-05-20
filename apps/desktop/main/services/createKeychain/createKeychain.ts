/*
 * macOS Keychain wrapper. Shells out to `/usr/bin/security` instead of
 * binding `Security.framework` directly: the call frequency is ~1 read at
 * boot and ~1 write per Supabase access-token refresh, so `fork+exec`
 * overhead (~50-100ms) is invisible, and the trade buys us no FFI
 * marshaling, no segfault surface, and independence from Apple's
 * deprecated `SecKeychain*` C symbols. See the design spec's "Decisions
 * Captured" section for the full argument.
 *
 * The secret is fed via the child's stdin (never as a `-w VALUE` argv
 * flag) so it cannot leak to `ps`, audit logs, or shell history.
 */

const SECURITY_BIN = "/usr/bin/security";

/**
 * Public surface of the keychain service. All methods are async because
 * they spawn a subprocess and await the child's exit.
 */
export type Keychain = {
  set(
    serviceName: string,
    accountName: string,
    password: string,
  ): Promise<void>;
  get(serviceName: string, accountName: string): Promise<string | null>;
  delete(serviceName: string, accountName: string): Promise<void>;
};

/*
 * `Bun.spawn`'s type is exposed at runtime via `typeof Bun.spawn`; we
 * re-narrow it here as an injection seam so unit tests can replace it
 * with a fake that records argv + stdin and synthesises exit codes.
 */
export type KeychainSpawner = typeof Bun.spawn;

/**
 * Result of one `security` invocation, as the helper sees it. Exposed so
 * the unit suite can build fake spawners that return this shape.
 */
export type KeychainCommandResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

/**
 * Exit code `security` returns when an entry isn't found. Documented in
 * `man 1 security` (kErrSecItemNotFound surfaced as exit 44).
 */
export const KEYCHAIN_NOT_FOUND_EXIT = 44;

/**
 * Builds a {@link Keychain} bound to `Bun.spawn` (or an injected fake
 * during tests). The factory does no work at construction time; every
 * call to `set` / `get` / `delete` spawns a fresh `/usr/bin/security`
 * subprocess.
 *
 * @param spawn - Spawner used to launch `security`. Tests inject a fake;
 *   production passes (or defaults to) `Bun.spawn`.
 * @returns A ready-to-use {@link Keychain}.
 */
export function createKeychain(spawn?: KeychainSpawner): Keychain {
  // Only throw the platform guard for the production code path (no
  // injected spawn). Tests pass a fake spawn and can run on any OS.
  if (spawn === undefined) {
    if (process.platform !== "darwin") {
      // Windows lands in Phase 5 with the same shape against `cmdkey`.
      // Fail loud on unsupported platforms so the breakage is at boot,
      // not on the first sign-in.
      throw new Error(`Keychain not supported on ${process.platform}`);
    }
    spawn = Bun.spawn;
  }
  const spawnFn = spawn;
  async function run(
    argv: readonly string[],
    stdinPayload?: string,
  ): Promise<KeychainCommandResult> {
    const child = spawnFn([SECURITY_BIN, ...argv], {
      stdin: stdinPayload === undefined ? "ignore" : "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    if (stdinPayload !== undefined && child.stdin) {
      const writer = child.stdin as unknown as {
        write: (chunk: string) => void;
        end: () => Promise<void> | void;
      };
      writer.write(stdinPayload);
      await writer.end();
    }
    const [stdout, stderr] = await Promise.all([
      new Response(child.stdout as unknown as ReadableStream).text(),
      new Response(child.stderr as unknown as ReadableStream).text(),
    ]);
    const exitCode = await child.exited;
    return { exitCode, stdout, stderr };
  }

  return {
    async set(serviceName, accountName, password) {
      // `-w` without a value forces `security` to read the password from
      // stdin. Keeps the secret off argv. `-U` updates the entry in
      // place when one already exists, avoiding a window where the
      // entry is briefly absent.
      const { exitCode, stderr } = await run(
        [
          "add-generic-password",
          "-U",
          "-s",
          serviceName,
          "-a",
          accountName,
          "-w",
        ],
        password,
      );
      if (exitCode !== 0) {
        throw new Error(
          `security add-generic-password exit ${exitCode}: ${stderr.trim()}`,
        );
      }
    },

    async get(serviceName, accountName) {
      const { exitCode, stdout, stderr } = await run([
        "find-generic-password",
        "-w",
        "-s",
        serviceName,
        "-a",
        accountName,
      ]);
      if (exitCode === KEYCHAIN_NOT_FOUND_EXIT) {
        return null;
      }
      if (exitCode !== 0) {
        throw new Error(
          `security find-generic-password exit ${exitCode}: ${stderr.trim()}`,
        );
      }
      // `security` always appends a trailing newline to the printed value.
      return stdout.replace(/\n$/, "");
    },

    async delete(serviceName, accountName) {
      const { exitCode, stderr } = await run([
        "delete-generic-password",
        "-s",
        serviceName,
        "-a",
        accountName,
      ]);
      // 44 = nothing matched; treat delete as idempotent.
      if (exitCode !== 0 && exitCode !== KEYCHAIN_NOT_FOUND_EXIT) {
        throw new Error(
          `security delete-generic-password exit ${exitCode}: ${stderr.trim()}`,
        );
      }
    },
  };
}
