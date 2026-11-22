import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LicenseFixtures } from "../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CONTROLLER = `
import errno, json, os, pty, select, sys, time
node, probe, mode, event_json = sys.argv[1:]
events = json.loads(event_json)
pid, descriptor = pty.fork()
if pid == 0:
    os.execv(node, [node, probe, mode])
output = b""
deadline = time.monotonic() + 5
try:
    while time.monotonic() < deadline:
        if select.select([descriptor], [], [], 0.1)[0]:
            try:
                chunk = os.read(descriptor, 65536)
            except OSError as error:
                if error.errno == errno.EIO: break
                raise
            if not chunk: break
            output += chunk
            if events and events[0][0].encode() in output:
                _, answer = events.pop(0)
                os.write(descriptor, answer.encode())
        if b"PROBE_RESULT=" in output or b"PROBE_CANCELLED=" in output: break
    else:
        raise RuntimeError("Terminal did not consume the queued input: " + output.decode(errors="replace"))
finally:
    try: os.kill(pid, 15)
    except ProcessLookupError: pass
    os.waitpid(pid, 0)
    os.close(descriptor)
print(output.decode(errors="replace"))
`;

function _probeSource(): string {
  const root = new URL("../runProducerCommand/", import.meta.url).href;
  return `import { TerminalSession } from ${JSON.stringify(`${root  }TerminalSession.mjs`)};
import { PromptView } from ${JSON.stringify(`${root  }PromptView.mjs`)};
import { prepareCommandInvocation } from ${JSON.stringify(`${root  }prepareCommandInvocation.mjs`)};
const mode = process.argv[2];
let terminal;
try {
  const result = mode === "menu" ? await (async () => {
    terminal = TerminalSession.open();
    return PromptView.choose({terminal, label:"Pick a value", choices:["First", "Middle", "Last"]});
  })() : await prepareCommandInvocation({commandName:mode === "explicit" ? "render" : mode === "prepared" ? "render:showcase" : "adopt",arguments:mode === "explicit" ? ["114", "--output-dir", "out/my exports"] : [],interactive:mode !== "prepared"});
  process.stdout.write("\\nPROBE_RESULT=" + JSON.stringify(result) + "\\n");
} catch (error) { process.stdout.write("\\nPROBE_CANCELLED=" + String(error) + "\\n"); }
finally { terminal?.close(); }
`;
}

async function _runProbe(
  mode: string,
  events: ReadonlyArray<readonly [string, string]>,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-terminal-"));
  try {
    const probe = path.join(directory, "probe.mjs");
    await writeFile(probe, _probeSource());
    const result = spawnSync(
      "python3",
      ["-c", CONTROLLER, process.execPath, probe, mode, JSON.stringify(events)],
      {
        cwd: APP_ROOT,
        env: LicenseFixtures.licenseTestEnvironment("/dev/null"),
        encoding: "utf8",
        timeout: 8000,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

test("a batched Up and Enter wraps to the last menu choice without losing Enter", async () => {
  const output = await _runProbe("menu", [["Pick a value", "\u001b[A\r"]]);
  assert.match(output, /PROBE_RESULT="Last"/);
});

test("full wizard keeps pasted spaces and asks all optional defaults before completion", async () => {
  const output = await _runProbe("wizard", [
    ["Stylesheet path", "path with spaces.css\r"],
    ["Palette", "\u001b[B\r"],
    ["Copy easing curves", "j\r"],
    ["Report without writing", "j\r"],
  ]);
  assert.match(output, /PROBE_RESULT=/);
  assert.match(output, /path with spaces\.css/);
  assert.match(output, /--mode=dark/);
  assert.match(output, /--curves/);
  assert.match(output, /--dry-run/);
});

test("Ctrl-C cancels a full wizard before it returns work arguments", async () => {
  const output = await _runProbe("wizard", [["Stylesheet path", "\u0003"]]);
  assert.match(output, /PROBE_CANCELLED=.*Cancelled/);
  assert.doesNotMatch(output, /PROBE_RESULT=/);
});

test("explicit values return without opening a terminal prompt", async () => {
  const output = await _runProbe("explicit", []);
  assert.match(output, /PROBE_RESULT=/);
  assert.match(output, /out\/my exports/);
  assert.doesNotMatch(
    output,
    /Poster frame|Composition identifier|Pick a value/,
  );
});

test("a previously prepared bare invocation validates without reopening its wizard", async () => {
  const output = await _runProbe("prepared", []);
  assert.match(output, /PROBE_RESULT=/);
  assert.doesNotMatch(output, /Stop after previews|No\r?\n|Yes\r?\n/);
});
