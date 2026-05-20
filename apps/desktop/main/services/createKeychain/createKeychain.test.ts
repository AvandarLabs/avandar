import { describe, expect, it } from "vitest";
import { createKeychain, KEYCHAIN_NOT_FOUND_EXIT } from "./createKeychain";
import type { KeychainSpawner } from "./createKeychain";

/*
 * G2.13 — Keychain pure-layer unit suite.
 *
 * Mocks `Bun.spawn` so the suite stays hermetic and cross-platform (the
 * module itself does a `process.platform !== "darwin"` throw at import
 * time, but `createKeychain` accepts an injected spawn and is callable
 * once the module has loaded). Pins:
 *
 *   - Argv composition for set / get / delete.
 *   - Secrets are written to the child's stdin and never put on argv.
 *   - Exit-code parsing: 44 → null/no-op, other non-zero → throws.
 *   - Stderr is surfaced in thrown errors; the password never is.
 */

type SpawnCall = {
  argv: readonly string[];
  stdinWrites: string[];
  stdinEnded: boolean;
};

type FakeChildResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function makeFakeSpawn(result: FakeChildResult): {
  spawn: KeychainSpawner;
  calls: SpawnCall[];
} {
  const calls: SpawnCall[] = [];
  const spawn = ((argv: readonly string[], _options: unknown) => {
    const call: SpawnCall = { argv, stdinWrites: [], stdinEnded: false };
    calls.push(call);

    const stdin = {
      write(chunk: string): void {
        call.stdinWrites.push(chunk);
      },
      end(): Promise<void> {
        call.stdinEnded = true;
        return Promise.resolve();
      },
    };
    const stdoutStream = new Response(result.stdout).body;
    const stderrStream = new Response(result.stderr).body;
    return {
      stdin,
      stdout: stdoutStream,
      stderr: stderrStream,
      exited: Promise.resolve(result.exitCode),
    };
  }) as unknown as KeychainSpawner;

  return { spawn, calls };
}

describe("createKeychain", () => {
  describe("set", () => {
    it("invokes `/usr/bin/security add-generic-password -U` with stdin password", async () => {
      const { spawn, calls } = makeFakeSpawn({
        exitCode: 0,
        stdout: "",
        stderr: "",
      });
      const keychain = createKeychain(spawn);

      await keychain.set("com.example.app", "alice", "s3cr3t");

      expect(calls.length).toBe(1);
      expect(calls[0]!.argv).toEqual([
        "/usr/bin/security",
        "add-generic-password",
        "-U",
        "-s",
        "com.example.app",
        "-a",
        "alice",
        "-w",
      ]);
      expect(calls[0]!.stdinWrites).toEqual(["s3cr3t"]);
      expect(calls[0]!.stdinEnded).toBe(true);
    });

    it("never places the password on argv", async () => {
      const { spawn, calls } = makeFakeSpawn({
        exitCode: 0,
        stdout: "",
        stderr: "",
      });
      const keychain = createKeychain(spawn);

      await keychain.set("svc", "acc", "the-secret-payload");

      const argv = calls[0]!.argv;
      expect(argv.includes("the-secret-payload")).toBe(false);
    });

    it("throws with stderr context (but not the password) on non-zero exit", async () => {
      const { spawn } = makeFakeSpawn({
        exitCode: 1,
        stdout: "",
        stderr: "security: SecKeychainAddGenericPassword: oops\n",
      });
      const keychain = createKeychain(spawn);

      await expect(
        keychain.set("svc", "acc", "the-secret-payload"),
      ).rejects.toThrow(/exit 1.*SecKeychainAddGenericPassword/);

      try {
        await keychain.set("svc", "acc", "the-secret-payload");
      } catch (err) {
        expect(String(err).includes("the-secret-payload")).toBe(false);
      }
    });
  });

  describe("get", () => {
    it("invokes `/usr/bin/security find-generic-password -w` and trims trailing newline", async () => {
      const { spawn, calls } = makeFakeSpawn({
        exitCode: 0,
        stdout: "s3cr3t\n",
        stderr: "",
      });
      const keychain = createKeychain(spawn);

      const value = await keychain.get("com.example.app", "alice");

      expect(value).toBe("s3cr3t");
      expect(calls[0]!.argv).toEqual([
        "/usr/bin/security",
        "find-generic-password",
        "-w",
        "-s",
        "com.example.app",
        "-a",
        "alice",
      ]);
      // get never feeds stdin (read-only operation).
      expect(calls[0]!.stdinWrites).toEqual([]);
    });

    it("returns null when the entry is missing (exit 44)", async () => {
      const { spawn } = makeFakeSpawn({
        exitCode: KEYCHAIN_NOT_FOUND_EXIT,
        stdout: "",
        stderr:
          "security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain.\n",
      });
      const keychain = createKeychain(spawn);

      await expect(keychain.get("svc", "acc")).resolves.toBeNull();
    });

    it("throws on other non-zero exits", async () => {
      const { spawn } = makeFakeSpawn({
        exitCode: 50,
        stdout: "",
        stderr: "boom\n",
      });
      const keychain = createKeychain(spawn);

      await expect(keychain.get("svc", "acc")).rejects.toThrow(/exit 50.*boom/);
    });
  });

  describe("delete", () => {
    it("invokes `/usr/bin/security delete-generic-password`", async () => {
      const { spawn, calls } = makeFakeSpawn({
        exitCode: 0,
        stdout: "",
        stderr: "",
      });
      const keychain = createKeychain(spawn);

      await keychain.delete("com.example.app", "alice");

      expect(calls[0]!.argv).toEqual([
        "/usr/bin/security",
        "delete-generic-password",
        "-s",
        "com.example.app",
        "-a",
        "alice",
      ]);
    });

    it("treats exit 44 (not found) as idempotent success", async () => {
      const { spawn } = makeFakeSpawn({
        exitCode: KEYCHAIN_NOT_FOUND_EXIT,
        stdout: "",
        stderr: "nothing to delete\n",
      });
      const keychain = createKeychain(spawn);

      await expect(keychain.delete("svc", "acc")).resolves.toBeUndefined();
    });

    it("throws on other non-zero exits", async () => {
      const { spawn } = makeFakeSpawn({
        exitCode: 1,
        stdout: "",
        stderr: "permission denied\n",
      });
      const keychain = createKeychain(spawn);

      await expect(keychain.delete("svc", "acc")).rejects.toThrow(
        /exit 1.*permission denied/,
      );
    });
  });
});
