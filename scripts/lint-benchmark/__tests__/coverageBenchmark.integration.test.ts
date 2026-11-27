import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { expect, it } from "vitest";
import { createCoverageDirectory as _createDirectory } from "../../../packages/lint/core/src/__tests__/coverage.fixtures";

it("records one cold and five warm samples with their median", async () => {
  const { benchmarkLint } = await import("../benchmarkLint.mjs");
  const durations = [900, 60, 10, 40, 20, 30];
  const result = await benchmarkLint({
    label: "fixture",
    runSample: async (index: number) => {
      return { durationMs: durations[index]!, exitCode: 0 };
    },
  });
  expect(result.coldMs).toBe(900);
  expect(result.warmMs).toEqual([60, 10, 40, 20, 30]);
  expect(result.warmMedianMs).toBe(30);
});

it("offers the benchmark label and visible default through its bare wizard", async () => {
  const { getBenchmarkLabel } = await import("../benchmarkLint.mjs");
  const questions: string[] = [];
  expect(
    await getBenchmarkLabel([], () => {
      return {
        ask: async (label: string, defaultValue: string) => {
          questions.push(`${label}: ${defaultValue}`);
          return "chosen";
        },
        close: () => {},
      };
    }),
  ).toBe("chosen");
  expect(questions).toEqual(["Label: phase-3-before-package"]);
});

it("prompts for a missing label operand and closes the terminal", async () => {
  const { getBenchmarkLabel } = await import("../benchmarkLint.mjs");
  let hasClosed = false;
  const label = await getBenchmarkLabel(["--label"], () => {
    return {
      ask: async (): Promise<string> => {
        return "chosen";
      },
      close: (): void => {
        hasClosed = true;
      },
    };
  });
  expect(label).toBe("chosen");
  expect(hasClosed).toBe(true);
});

it("rejects a directory destination before starting any lint sample", () => {
  const directory = _createDirectory();
  const binaryDirectory = join(directory, "bin");
  const sampleLog = join(directory, "samples.log");
  mkdirSync(binaryDirectory);
  mkdirSync(join(directory, "docs/lint-benchmarks/oxlint-phase-3.md"), {
    recursive: true,
  });
  writeFileSync(
    join(binaryDirectory, "pnpm"),
    '#!/bin/sh\nprintf sample >> "$AVANDAR_BENCHMARK_LOG"\n',
    { mode: 0o755 },
  );
  const result = spawnSync(
    process.execPath,
    [
      resolve(import.meta.dirname, "../benchmarkLint.mjs"),
      "--label",
      "fixture",
    ],
    {
      cwd: directory,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binaryDirectory}${delimiter}${process.env.PATH ?? ""}`,
        AVANDAR_BENCHMARK_LOG: sampleLog,
      },
    },
  );
  expect(result.status, result.stderr).toBe(1);
  expect(existsSync(sampleLog)).toBe(false);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("oxlint-phase-3.md");
});
