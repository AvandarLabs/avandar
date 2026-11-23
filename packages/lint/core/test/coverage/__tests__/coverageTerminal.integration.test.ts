import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it.each([
  [
    "paste and arrow Enter",
    "fixture.ts\r",
    0,
    '"path":"fixture.ts","format":2',
  ],
  ["Ctrl-C", "\u0003", 1, "Cancelled"],
  ["EOF", "\u0004", 1, "Cancelled"],
] as const)(
  "accepts terminal %s without dropping keys or hanging",
  (_, input, exitCode, expected) => {
    const terminalPath = resolve(
      import.meta.dirname,
      "../../../src/cli/terminal.ts",
    );
    const script = `import {openTerminal} from ${JSON.stringify(terminalPath)}; const prompt=openTerminal(); try { const path=await prompt.ask('Paths','.'); const format=await prompt.choose('Format',['stylish','agent','json'],0); console.log(JSON.stringify({path,format})); } finally {prompt.close();}`;
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
        if stage == 0 and b'Paths [default:' in output:
            os.write(descriptor, sys.argv[3].encode())
            stage = 1
        elif stage == 1 and b'Format [default:' in output:
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
        env: { ...process.env, NO_COLOR: "1" },
      },
    );
    expect(result.status, result.stdout + result.stderr).toBe(exitCode);
    expect(result.stdout).toContain(expected);
    expect(result.stdout).not.toContain("\u001b[");
  },
);
