import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import type { SpawnSyncReturns } from "node:child_process";

const TERMINAL_CAPTURE_SCRIPT = `
import os, pty, select, signal, sys, time
pid, descriptor = pty.fork()
if pid == 0:
    os.execv(sys.argv[1], sys.argv[1:])
output = b''
deadline = time.time() + 4
while time.time() < deadline:
    if select.select([descriptor], [], [], 0.1)[0]:
        try:
            chunk = os.read(descriptor, 65536)
        except OSError:
            break
        if not chunk:
            break
        output += chunk
    child, status = os.waitpid(pid, os.WNOHANG)
    if child:
        print(output.decode(errors='replace'))
        sys.exit(os.waitstatus_to_exitcode(status))
if time.time() >= deadline:
    os.kill(pid, signal.SIGKILL)
_, status = os.waitpid(pid, 0)
print(output.decode(errors='replace'))
sys.exit(os.waitstatus_to_exitcode(status))
`;

function _runTerminalCommand(
  options: Readonly<{
    path: string;
    args: readonly string[];
    env?: Readonly<Record<string, string | undefined>>;
  }>,
): SpawnSyncReturns<string> {
  return spawnSync(
    "python3",
    [
      "-c",
      TERMINAL_CAPTURE_SCRIPT,
      process.execPath,
      options.path,
      ...options.args,
    ],
    {
      encoding: "utf8",
      timeout: 6000,
      env: {
        ...process.env,
        NO_COLOR: "",
        TERM: "xterm-256color",
        ...options.env,
      },
    },
  );
}

it.each([
  ["coverage", "../../../src/cli/cliHelpers.ts"],
  ["benchmark", "../../../../../../scripts/lint-benchmark/benchmarkLint.mjs"],
])("colors %s help on a capable terminal", (_name: string, path: string) => {
  const result = _runTerminalCommand({
    path: resolve(import.meta.dirname, path),
    args: ["--help"],
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("Usage");
  expect(result.stdout).toContain("\u001b[");
});

it.each([
  ["NO_COLOR", { NO_COLOR: "1", TERM: "xterm-256color" }],
  ["TERM=dumb", { NO_COLOR: "", TERM: "dumb" }],
])(
  "omits ANSI escapes in coverage help when %s is set",
  (_label: string, env: Readonly<Record<string, string>>) => {
    const result = _runTerminalCommand({
      path: resolve(import.meta.dirname, "../../../src/cli/cliHelpers.ts"),
      args: ["--help"],
      env,
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Usage");
    expect(result.stdout).not.toContain("\u001b[");
  },
);

it("colors benchmark invocation errors on a capable terminal", () => {
  const result = _runTerminalCommand({
    path: resolve(
      import.meta.dirname,
      "../../../../../../scripts/lint-benchmark/benchmarkLint.mjs",
    ),
    args: ["--invalid"],
  });
  expect(result.status, result.stderr).toBe(1);
  expect(result.stdout).toContain("\u001b[31m❌");
  expect(result.stdout).toContain("\u001b[33m  ⚠️");
});

it.each([
  [
    "paste and arrow Enter",
    "fixture.ts\r",
    0,
    '"paths":["fixture.ts"],"format":"json"',
  ],
  ["Ctrl-C", "\u0003", 130, "prompt_cancelled"],
  ["EOF", "\u0004", 130, "prompt_cancelled"],
] as const)(
  "accepts terminal %s through Acclimate wizard without dropping keys or hanging",
  (_, input, exitCode, expected) => {
    const cliPath = resolve(import.meta.dirname, "../cliHelpers.ts");
    const script = `import { CLIError } from "@avandar/acclimate"; import { runCoverageWizard } from ${JSON.stringify(cliPath)}; try { const result = await runCoverageWizard(); console.log(JSON.stringify(result)); } catch (error) { console.error(error instanceof CLIError ? error.code : String(error)); process.exitCode = error instanceof CLIError && error.code === "prompt_cancelled" ? 130 : 1; }`;
    const result = spawnSync(
      "python3",
      [
        "-c",
        `
import os, pty, select, sys, time, signal
pid, descriptor = pty.fork()
if pid == 0:
    os.execv(sys.argv[1], [sys.argv[1], '--input-type=module', '-e', sys.argv[2]])
output = b''
stage = 0
deadline = time.time() + 4
while time.time() < deadline:
    if select.select([descriptor], [], [], 0.1)[0]:
        try:
            chunk = os.read(descriptor, 65536)
        except OSError:
            break
        if not chunk:
            break
        output += chunk
        if stage == 0 and b'Paths (comma-separated)' in output:
            os.write(descriptor, sys.argv[3].encode())
            stage = 1
        elif stage == 1 and b'Format' in output:
            os.write(descriptor, b'\\x1b[A\\r')
            stage = 2
    child, status = os.waitpid(pid, os.WNOHANG)
    if child:
        print(output.decode(errors='replace'))
        sys.exit(os.waitstatus_to_exitcode(status))
if time.time() >= deadline:
    os.kill(pid, signal.SIGKILL)
    os.waitpid(pid, 0)
    print(output.decode(errors='replace'))
    sys.exit(2)
_, status = os.waitpid(pid, 0)
print(output.decode(errors='replace'))
sys.exit(os.waitstatus_to_exitcode(status))
`,
        process.execPath,
        script,
        input,
      ],
      {
        encoding: "utf8",
        timeout: 6000,
        env: {
          ...process.env,
          NO_COLOR: "1",
          TERM: "xterm-256color",
          CI: "",
        },
      },
    );
    expect(result.status, result.stdout + result.stderr).toBe(exitCode);
    expect(result.stdout).toContain(expected);
    expect(result.stdout).not.toMatch(
      new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`),
    );
  },
);
