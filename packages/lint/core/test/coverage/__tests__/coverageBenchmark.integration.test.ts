import { expect, it } from "vitest";

it("records one cold and five warm samples with their median", async () => {
  const { benchmarkLint } =
    await import("../../../../../../scripts/lint-benchmark/benchmarkLint.mjs");
  const durations = [900, 60, 10, 40, 20, 30];
  const result = await benchmarkLint({
    label: "fixture",
    runSample: async (index: number) => {
      return { durationMs: durations[index], exitCode: 0 };
    },
  });
  expect(result.coldMs).toBe(900);
  expect(result.warmMs).toEqual([60, 10, 40, 20, 30]);
  expect(result.warmMedianMs).toBe(30);
});

it("offers the benchmark label and visible default through its bare wizard", async () => {
  const { getBenchmarkLabel } =
    await import("../../../../../../scripts/lint-benchmark/benchmarkLint.mjs");
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
