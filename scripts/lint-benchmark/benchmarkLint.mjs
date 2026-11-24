#!/usr/bin/env node
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
  appendFile,
  lstat,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import {
  buildHelpText,
  createTheme,
  openTerminal,
} from "./benchmarkTerminalHelpers.mjs";

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

/**
 * Measures cold and warm lint timings and returns the samples, median, and exit
 * codes.
 * Use it, for example, to compare lint performance across configuration
 * changes.
 */
export async function benchmarkLint({ label, runSample = _runSample }) {
  const samples = [];
  for (let index = 0; index < 6; index += 1) {
    samples.push(await runSample(index));
  }
  const warmMs = samples.slice(1).map((sample) => sample.durationMs);
  return {
    label,
    coldMs: samples[0].durationMs,
    warmMs,
    warmMedianMs: [...warmMs].sort((left, right) => left - right)[2],
    exitCodes: samples.map((sample) => sample.exitCode),
  };
}

async function _prepareDestination() {
  const destination = resolve("docs/lint-benchmarks/oxlint-phase-3.md");
  await mkdir(dirname(destination), { recursive: true });
  try {
    const information = await lstat(destination);
    if (!information.isFile()) {
      throw new Error(
        `Benchmark destination must be a regular file: ${destination}`,
      );
    }
    await access(destination, constants.R_OK | constants.W_OK);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await access(dirname(destination), constants.W_OK);
  }
  return destination;
}

async function _recordMeasurement({ result, destination }) {
  try {
    await access(destination);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    await writeFile(
      destination,
      "# Lint benchmark\n\nFirst run is cold; warm samples follow without cache eviction. Durations are\nwall-clock milliseconds. A failed lint run is not a passing performance baseline.\n\n| Label | Cold ms | Warm 1 | Warm 2 | Warm 3 | Warm 4 | Warm 5 | Warm median ms | Exit codes |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n",
      { flag: "wx" },
    );
  }
  const row = `| ${result.label} | ${result.coldMs} | ${result.warmMs.join(" | ")} | ${result.warmMedianMs} | ${result.exitCodes.join(", ")} |\n`;
  const document = await readFile(destination, "utf8");
  const table = /^\| Label \|[^\n]*\n\| ---[^\n]*\n(?:\|[^\n]*\n)*/m.exec(
    document,
  );
  if (table) {
    const end = table.index + table[0].length;
    await writeFile(
      destination,
      `${document.slice(0, end)}${row}${document.slice(end)}`,
    );
  } else {
    await appendFile(destination, row);
  }
}

/**
 * Returns the explicit or prompted label for a lint measurement.
 * Use it, for example, to accept a label in unattended or interactive runs.
 */
export async function getBenchmarkLabel(args, terminal = openTerminal) {
  if (!args.length || (args.length === 1 && args[0] === "--label")) {
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
  const theme = createTheme(Boolean(process.stderr.isTTY));
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(
      buildHelpText({ text: HELP, isTerminal: Boolean(process.stdout.isTTY) }),
    );
    return 0;
  }
  try {
    const label = await getBenchmarkLabel(args);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(label)) {
      throw new Error("Label must use letters, digits, dots, or hyphens");
    }
    const destination = await _prepareDestination();
    const timer = setInterval(
      () => process.stderr.write("Still measuring lint...\n"),
      10000,
    );
    try {
      const result = await benchmarkLint({ label });
      await _recordMeasurement({ result, destination });
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
      `${theme.error(`❌ lint:benchmark: ${error.message}`)}\n${theme.warning("  ⚠️ Run pnpm lint:benchmark --label phase-3-before-package and retry.")}\n\n${buildHelpText({ text: HELP, isTerminal: Boolean(process.stderr.isTTY) })}`,
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
