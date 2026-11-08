/**
 * Evaluates the PDF table assistant: for every case in `pdfAssistCases.ts`,
 * builds the region's text and rule results exactly as the app does, sends
 * the app's prompt through a setup, parses the reply with the app's parser,
 * and grades the final table.
 *
 * Usage:
 *   pnpm vite-script scripts/ai-eval/pdf/runPdfAssistEval.ts -- \
 *     --setup extract-route --model anthropic/claude-haiku-5.5 [--repeat 2]
 *     [--holdout]
 *
 * Setups: `chat-route` (the app's path before the eval: the chat function)
 * and `extract-route` (the assistant's own route). `--holdout` runs the
 * passages the prompt was never tuned on, graded for fabrication only.
 *
 * Writes `results.jsonl` and `summary.json` under `.temp/ai-eval/pdf-runs/`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseRegionResponse } from "@/workers/pdfSniff/llm/parseRegionResponse/parseRegionResponse";
import { readOpenRouterApiKey } from "../runtime/readOpenRouterApiKey";
import { gradePdfAssist } from "./gradePdfAssist";
import { PDF_ASSIST_CASES } from "./pdfAssistCases";
import holdoutRegions from "./pdfAssistHoldoutRegions.json";
import { createPdfAssistSetup } from "./pdfAssistSetups";
import { preparePdfAssistCase } from "./preparePdfAssistCase";
import { summarizePdfAssistRun } from "./summarizePdfAssistRun";
import type { ExtractedFigure, PdfAssistGrade } from "./gradePdfAssist";
import type { PdfAssistCase } from "./pdfAssistCases";
import type { PdfAssistSetup } from "./pdfAssistSetups";
import type { ExtractedTable } from "@/workers/pdfSniff/pdfSniff.types";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");

/** One graded region, as written to `results.jsonl`. */
export type PdfAssistResult = {
  id: string;
  attempt: number;
  grade: PdfAssistGrade;
  modelRows: ExtractedFigure[];
  responseText: string;
  cost: number;
  latencyMs: number;
  error?: string;
};

/** The rows of a rule or model table, as figures. */
export function tableToFigures(table: ExtractedTable): ExtractedFigure[] {
  return table.cells.slice(table.headerRows).flatMap((row) => {
    const value = Number(row[2]);
    return Number.isFinite(value)
      ? [
          {
            subject: row[0] ?? "",
            metric: row[1] ?? "",
            value,
            unit: row[3] ?? "",
          },
        ]
      : [];
  });
}

async function _runCase(
  setup: PdfAssistSetup,
  testCase: PdfAssistCase,
  attempt: number,
): Promise<PdfAssistResult> {
  const prepared = await preparePdfAssistCase(REPO_ROOT, testCase);
  const startedAt = performance.now();
  const reply = await setup.extract(prepared);
  const modelTable = parseRegionResponse({
    regionId: testCase.id,
    pageIndex: testCase.page - 1,
    bbox: testCase.bbox,
    responseText: reply.text,
  });
  const modelRows = tableToFigures(modelTable);
  return {
    id: testCase.id,
    attempt,
    grade: gradePdfAssist({
      testCase,
      regionText: prepared.regionText,
      ruleRows: tableToFigures(prepared.ruleTable),
      modelRows,
    }),
    modelRows,
    responseText: reply.text,
    cost: reply.cost,
    latencyMs: performance.now() - startedAt,
    error: reply.error,
  };
}

function _parseOptions() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => {
      return arg !== "--";
    }),
    options: {
      setup: { type: "string", default: "chat-route" },
      model: { type: "string", default: "anthropic/claude-haiku-5.5" },
      repeat: { type: "string", default: "1" },
      label: { type: "string", default: "" },
      holdout: { type: "boolean", default: false },
    },
  });
  return values;
}

function _writeRun(label: string, results: readonly PdfAssistResult[]): void {
  const runId = `${new Date().toISOString().replaceAll(":", "-").slice(0, 19)}-${label.replaceAll(/[^a-z0-9.-]+/gi, "_")}`;
  const runDir = join(REPO_ROOT, ".temp/ai-eval/pdf-runs", runId);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, "results.jsonl"),
    results
      .map((result) => {
        return JSON.stringify(result);
      })
      .join("\n"),
  );
  const summary = summarizePdfAssistRun(label, results);
  writeFileSync(join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  console.log(`Results: ${runDir}`);
}

/**
 * Passages the prompt was never tuned on: every other region the scan found
 * where the rules flag missed figures. They have no answer key, so only
 * fabrication (a number not in the text) and year-like rows are graded.
 */
function _listHoldoutCases(): PdfAssistCase[] {
  return (
    holdoutRegions as unknown as Array<
      Pick<PdfAssistCase, "file" | "page" | "bbox">
    >
  ).map((region, index) => {
    return {
      ...region,
      id: `holdout-${index}`,
      required: [],
      optional: [],
      note: "Held out: graded for fabrication only.",
    };
  });
}

async function main(): Promise<void> {
  const options = _parseOptions();
  const setup = createPdfAssistSetup({
    name: options.setup,
    model: options.model,
    repoRoot: REPO_ROOT,
    openRouterApiKey: readOpenRouterApiKey(REPO_ROOT),
  });
  const label = options.label || `${options.setup}:${options.model}`;
  const results: PdfAssistResult[] = [];
  for (let attempt = 1; attempt <= Number(options.repeat); attempt += 1) {
    const batch = await Promise.all(
      (options.holdout ? _listHoldoutCases() : PDF_ASSIST_CASES).map(
        (testCase) => {
          return _runCase(setup, testCase, attempt);
        },
      ),
    );
    for (const result of batch) {
      const { grade } = result;
      console.log(
        `${result.id}#${attempt} found ${grade.requiredFound}/${grade.requiredTotal} useful ${grade.useful} dup ${grade.duplicates} fair ${grade.fair} spurious ${grade.spurious} fabricated ${grade.fabricated} subj-miss ${grade.subjectMisses} unit-err ${grade.unitErrors}${result.error ? ` ERROR ${result.error}` : ""}`,
      );
    }
    results.push(...batch);
  }
  await setup.close();
  _writeRun(label, results);
}

void main();
