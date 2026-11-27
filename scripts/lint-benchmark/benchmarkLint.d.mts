/** Duration and exit status returned by one lint measurement. */
export type BenchmarkSample = { durationMs: number; exitCode: number };

/** Cold and warm measurements recorded for one label. */
export type BenchmarkResult = {
  label: string;
  coldMs: number;
  warmMs: number[];
  warmMedianMs: number;
  exitCodes: number[];
};

/** Terminal operations used to request a benchmark label. */
export type LabelPrompt = {
  ask: (label: string, defaultValue: string) => Promise<string>;
  close?: () => void;
};

/** Measures one cold and five sequential warm lint runs. */
export function benchmarkLint(
  options: Readonly<{
    label: string;
    runSample?: (index: number) => Promise<BenchmarkSample>;
  }>,
): Promise<BenchmarkResult>;

/** Reads an explicit benchmark label or requests it through a terminal. */
export function getBenchmarkLabel(
  args: readonly string[],
  terminal?: () => LabelPrompt | undefined,
): Promise<string>;
