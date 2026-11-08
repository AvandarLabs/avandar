/**
 * Copies every eval run's results from `.temp/ai-eval/runs/` (gitignored)
 * into `docs/ai-agent/eval-runs/` and writes an index of all of them, so the
 * numbers in `docs/ai-agent/eval.md` can be traced to the answers behind
 * them after the local runs are gone.
 *
 * Usage: pnpm vite-script scripts/ai-eval/archiveEvalRuns.ts
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type { EvalRunSummary } from "./runtime/summarizeEvalRun";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const RUNS_DIR = join(REPO_ROOT, ".temp/ai-eval/runs");
const ARCHIVE_DIR = join(REPO_ROOT, "docs/ai-agent/eval-runs");
const ARCHIVED_FILES = ["summary.json", "results.jsonl"] as const;

type ArchivedRun = { runId: string; summary: EvalRunSummary };

function _archiveRun(runId: string): ArchivedRun | undefined {
  const source = join(RUNS_DIR, runId);
  if (!existsSync(join(source, "summary.json"))) {
    return undefined;
  }
  const target = join(ARCHIVE_DIR, runId);
  mkdirSync(target, { recursive: true });
  for (const fileName of ARCHIVED_FILES) {
    if (existsSync(join(source, fileName))) {
      copyFileSync(join(source, fileName), join(target, fileName));
    }
  }
  const summary = JSON.parse(
    readFileSync(join(source, "summary.json"), "utf8"),
  ) as EvalRunSummary;
  return { runId, summary };
}

function _formatSeconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

function _formatRow(run: ArchivedRun): string {
  const { summary } = run;
  const misses = summary.failedIds.join(" ") || "none";
  return [
    `[${run.runId.slice(0, 19)}](${run.runId}/results.jsonl)`,
    `\`${summary.label}\``,
    `${summary.passCount}/${summary.questionCount}`,
    String(summary.needlessQuestions),
    String(summary.missedQuestions),
    `$${summary.costPerQuestion.toFixed(5)}`,
    `${_formatSeconds(summary.latencyMedianMs)} / ${_formatSeconds(summary.latencyP90Ms)}`,
    misses,
  ].join(" | ");
}

function _buildIndex(runs: readonly ArchivedRun[]): string {
  const rows = runs.map((run) => {
    return `| ${_formatRow(run)} |`;
  });
  return `# Eval run archive

Every run of \`scripts/ai-eval/runEval.ts\` made for the Avandar agent work,
copied from \`.temp/ai-eval/runs/\` by \`scripts/ai-eval/archiveEvalRuns.ts\`.
Each folder holds \`summary.json\` (the row below) and \`results.jsonl\`
(every answer: its SQL, a preview of the result, the questions asked, the
grader's verdict, tokens, cost, and time). How to read and reproduce them:
[eval.md](../eval.md).

Runs with fewer than 45 questions are screens, reruns of single questions,
or smoke checks; the label says which. Times are UTC.

| Run (UTC) | Label | Correct | Needless | Missed | Cost per question | Latency p50 / p90 | Misses |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
}

function main(): void {
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  const runs = readdirSync(RUNS_DIR)
    .sort()
    .flatMap((runId) => {
      const run = _archiveRun(runId);
      return run ? [run] : [];
    });
  writeFileSync(join(ARCHIVE_DIR, "README.md"), _buildIndex(runs));
  console.log(`Archived ${runs.length} runs to ${ARCHIVE_DIR}`);
}

main();
