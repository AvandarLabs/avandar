#!/usr/bin/env node
import { spawn } from "node:child_process";
import { appendFile, mkdir, access, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import {
  openTerminal,
  createTheme,
} from "../../packages/lint/core/src/cli/terminal.ts";

const HELP = `Measure one cold and five warm runs of the repository lint command.

Usage: pnpm lint:benchmark --label <name>

Options:
  --label <name>  Sample label. Required unattended. Letters, digits, dots, hyphens.
  -h, --help      Print help before repository access and exit zero.

Records each duration, exit status, and the warm median in
 docs/lint-benchmarks/oxlint-phase-3.md. Failed samples remain visible and cause
exit 1 after all six samples. Cold means the first run, without OS cache flushing.
A bare command offers a label wizard in a terminal. Its visible default is
phase-3-before-package. Progress and lint output use stderr. stdout is JSON.

Examples:
  pnpm lint:benchmark --label phase-3-before-package
  pnpm lint:benchmark --label after-comment-fixers
`;

async function _runSample(index) {
  process.stderr.write(
    `Running ${index === 0 ? "cold" : `warm ${index}/5`} lint sample...\n`,
  );
  const started = performance.now();
  const exitCode = await new Promise((resolveStatus, reject) => {
    const child = spawn("pnpm", ["lint"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(process.stderr);
    child.stderr.pipe(process.stderr);
    child.once("error", reject);
    child.once("close", (code) => resolveStatus(code ?? 1));
  });
  return { durationMs: Math.round(performance.now() - started), exitCode };
}

/** Measures lint timings for repeatable performance comparisons. */
export async function benchmarkLint({ label, runSample = _runSample }) {
  const samples = await Array.from({ length: 6 }).reduce(
    async (previous, _, index) => {
      const completed = await previous;
      return [...completed, await runSample(index)];
    },
    Promise.resolve([]),
  );
  const warmMs = samples.slice(1).map((sample) => sample.durationMs);
  return {
    label,
    coldMs: samples[0].durationMs,
    warmMs,
    warmMedianMs: [...warmMs].sort((left, right) => left - right)[2],
    exitCodes: samples.map((sample) => sample.exitCode),
  };
}

async function _recordMeasurement(result) {
  const destination = resolve("docs/lint-benchmarks/oxlint-phase-3.md");
  await mkdir(dirname(destination), { recursive: true });
  try {
    await access(destination);
  } catch {
    await writeFile(
      destination,
      "# Lint benchmark\n\nFirst run is cold; warm samples follow without cache eviction. Durations are\nwall-clock milliseconds. A failed lint run is not a passing performance baseline.\n\n| Label | Cold ms | Warm 1 | Warm 2 | Warm 3 | Warm 4 | Warm 5 | Warm median ms | Exit codes |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n",
    );
  }
  await appendFile(
    destination,
    `| ${result.label} | ${result.coldMs} | ${result.warmMs.join(" | ")} | ${result.warmMedianMs} | ${result.exitCodes.join(", ")} |\n`,
  );
}

/** Gets the explicit or wizard-selected label for one lint measurement. */
export async function getBenchmarkLabel(args, terminal = openTerminal) {
  if (!args.length) {
    const prompt = terminal();
    if (!prompt) {
      throw new Error("Provide --label <name> without a terminal");
    }
    try {
      return await prompt.ask("Label", "phase-3-before-package");
    } finally {
      prompt.close?.();
    }
  }
  if (args.length !== 2 || args[0] !== "--label") {
    throw new Error(
      "Provide --label <name> using letters, digits, dots, or hyphens",
    );
  }
  return args[1];
}

async function _main(args) {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }
  try {
    const label = await getBenchmarkLabel(args);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(label)) {
      throw new Error("Label must use letters, digits, dots, or hyphens");
    }
    const theme = createTheme(Boolean(process.stderr.isTTY));
    const timer = setInterval(
      () => process.stderr.write("Still measuring lint...\n"),
      10000,
    );
    try {
      const result = await benchmarkLint({ label });
      await _recordMeasurement(result);
      process.stdout.write(`${JSON.stringify(result)}\n`);
      const hasFailures = result.exitCodes.some((code) => code !== 0);
      process.stderr.write(
        hasFailures
          ? `${theme.error("❌ Lint samples failed.")}\n${theme.warning("  ⚠️ Repair lint errors and repeat the benchmark.")}\n`
          : `${theme.success("✅ Lint benchmark recorded.")}\n`,
      );
      return hasFailures ? 1 : 0;
    } finally {
      clearInterval(timer);
    }
  } catch (error) {
    process.stderr.write(
      `❌ lint:benchmark: ${error.message}\n  ⚠️ Run pnpm lint:benchmark --label phase-3-before-package and retry.\n\n${HELP}`,
    );
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await _main(process.argv.slice(2));
}
