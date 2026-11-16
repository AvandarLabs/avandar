/**
 * Copies every eval run's results from `.temp/ai-eval/runs/` and
 * `.temp/ai-eval/pdf-runs/` (gitignored) into `docs/ai-agent/eval-runs/` and
 * `docs/ai-agent/eval-runs/pdf/`. Then it writes an index of each from every
 * run in the archive, not only the local ones, so the numbers in
 * `docs/ai-agent/eval.md` can be traced to the answers behind them after the
 * local runs are gone.
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
import type { PdfAssistRunSummary } from "./pdf/summarizePdfAssistRun";
import type { EvalRunSummary } from "./runtime/summarizeEvalRun";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const RUNS_DIR = join(REPO_ROOT, ".temp/ai-eval/runs");
const ARCHIVE_DIR = join(REPO_ROOT, "docs/ai-agent/eval-runs");
const PDF_RUNS_DIR = join(REPO_ROOT, ".temp/ai-eval/pdf-runs");
const PDF_ARCHIVE_DIR = join(ARCHIVE_DIR, "pdf");
const ARCHIVED_FILES = ["summary.json", "results.jsonl"] as const;

type ArchivedRun = { runId: string; summary: EvalRunSummary };

/** Copies one run's files. Returns false if the run is unfinished. */
function _copyRun(runsDir: string, archiveDir: string, runId: string): boolean {
  const source = join(runsDir, runId);
  if (!existsSync(join(source, "summary.json"))) {
    return false;
  }
  const target = join(archiveDir, runId);
  mkdirSync(target, { recursive: true });
  for (const fileName of ARCHIVED_FILES) {
    if (existsSync(join(source, fileName))) {
      copyFileSync(join(source, fileName), join(target, fileName));
    }
  }
  return true;
}

/** Copies every finished run from `runsDir` into `archiveDir`. */
function _copyRunsToArchive(runsDir: string, archiveDir: string): number {
  mkdirSync(archiveDir, { recursive: true });
  if (!existsSync(runsDir)) {
    return 0;
  }
  return readdirSync(runsDir).filter((runId) => {
    return _copyRun(runsDir, archiveDir, runId);
  }).length;
}

/**
 * Reads every archived run's summary from `archiveDir`, in run id order.
 * The indexes are built from the archive, not from the local runs folder,
 * so a fresh worktree with few local runs keeps every older row.
 */
function _readArchive<TSummary>(
  archiveDir: string,
): Array<{ runId: string; summary: TSummary }> {
  return readdirSync(archiveDir)
    .sort()
    .flatMap((runId) => {
      const summaryPath = join(archiveDir, runId, "summary.json");
      if (!existsSync(summaryPath)) {
        return [];
      }
      const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as TSummary;
      return [{ runId, summary }];
    });
}

function _formatPdfRow(
  run: Readonly<{ runId: string; summary: PdfAssistRunSummary }>,
): string {
  const { summary } = run;
  return [
    `[${run.runId.slice(0, 19)}](${run.runId}/results.jsonl)`,
    `\`${summary.label}\``,
    String(summary.answers),
    `${summary.requiredFound}/${summary.requiredTotal}`,
    String(summary.spurious),
    String(summary.fabricated),
    String(summary.subjectMisses),
    String(summary.emptyReplies),
    `$${summary.costPerRegion.toFixed(5)}`,
  ].join(" | ");
}

function _buildPdfIndex(
  runs: ReadonlyArray<{ runId: string; summary: PdfAssistRunSummary }>,
): string {
  const rows = runs.map((run) => {
    return `| ${_formatPdfRow(run)} |`;
  });
  return `# PDF table assistant eval runs

Every run of \`scripts/ai-eval/pdf/runPdfAssistEval.ts\`, copied from
\`.temp/ai-eval/pdf-runs/\`. Each folder holds \`summary.json\` and
\`results.jsonl\` (every region's reply, its rows, and its grade). Labels
starting \`holdout\` ran the 121 held-out regions, where "spurious" counts
real figures (there is no answer key) and only fabrication is graded. How to
read and reproduce them: [eval.md](../../eval.md#pdf-table-assistant).

| Run (UTC) | Label | Answers | Required found | Spurious | Fabricated | Wrong subject | Empty replies | Cost per region |
|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
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
or smoke checks; the label says which. Times are UTC. The PDF table
assistant's runs are in [pdf/](pdf/README.md).

| Run (UTC) | Label | Correct | Needless | Missed | Cost per question | Latency p50 / p90 | Misses |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}
`;
}

function main(): void {
  const copiedCount = _copyRunsToArchive(RUNS_DIR, ARCHIVE_DIR);
  const runs = _readArchive<EvalRunSummary>(ARCHIVE_DIR);
  writeFileSync(join(ARCHIVE_DIR, "README.md"), _buildIndex(runs));
  const copiedPdfCount = _copyRunsToArchive(PDF_RUNS_DIR, PDF_ARCHIVE_DIR);
  const pdfRuns = _readArchive<PdfAssistRunSummary>(PDF_ARCHIVE_DIR);
  writeFileSync(join(PDF_ARCHIVE_DIR, "README.md"), _buildPdfIndex(pdfRuns));
  console.log(
    `Copied ${copiedCount} chat runs and ${copiedPdfCount} PDF assistant runs. ` +
      `Indexed ${runs.length} chat runs and ${pdfRuns.length} PDF assistant runs in ${ARCHIVE_DIR}`,
  );
}

main();
