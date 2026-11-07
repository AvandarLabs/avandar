/**
 * Runs the AI harness eval: asks every COVID question through a harness,
 * runs the resulting SQL in DuckDB, and grades it against ground truth.
 *
 * Usage:
 *   pnpm vite-script scripts/ai-eval/runEval.ts -- \
 *     --harness baseline --model anthropic/claude-sonnet-5 [--questions B01,B02]
 *     [--concurrency 4]
 *
 * Needs `~/cleaned-test-data` (the JHU long-format CSVs) and
 * `OPEN_ROUTER_API_KEY` (read from `.env.development.edge` when not set).
 * Writes `results.jsonl` and `summary.md` under `.temp/ai-eval/runs/`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { COVID_QUESTIONS } from "./covid/covidQuestions";
import { createBaselineHarness } from "./harnesses/baseline/BaselineHarness";
import { createPiHarness } from "./harnesses/pi/PiHarness";
import { EvalDatabase } from "./runtime/EvalDatabase";
import { gradeEvalAnswer } from "./runtime/gradeEvalAnswer";
import {
  formatSummaryRow,
  SUMMARY_TABLE_HEADER,
  summarizeEvalRun,
} from "./runtime/summarizeEvalRun";
import type { EvalQuestion } from "./EvalQuestion";
import type { EvalHarness } from "./harnesses/EvalHarness";
import type { EvalQueryResult } from "./runtime/EvalDatabase";
import type { GradedAnswer } from "./runtime/gradeEvalAnswer";

const REPO_ROOT = resolve(import.meta.dirname, "../..");

function _readOpenRouterApiKey(): string {
  if (process.env.OPEN_ROUTER_API_KEY) {
    return process.env.OPEN_ROUTER_API_KEY;
  }
  const envText = readFileSync(join(REPO_ROOT, ".env.development.edge"), "utf8");
  const line = envText.split("\n").find((envLine) => {
    return envLine.startsWith("OPEN_ROUTER_API_KEY=");
  });
  const key = line?.slice("OPEN_ROUTER_API_KEY=".length).replaceAll('"', "").trim();
  if (!key) {
    throw new Error("OPEN_ROUTER_API_KEY is not set");
  }
  return key;
}

/** Groups questions into conversations: a question and its follow-ups. */
function _toConversations(
  questions: readonly EvalQuestion[],
): EvalQuestion[][] {
  const conversations: EvalQuestion[][] = [];
  for (const question of questions) {
    const parent = conversations.find((conversation) => {
      return conversation.some((asked) => {
        return asked.id === question.followsId;
      });
    });
    if (parent) {
      parent.push(question);
    } else {
      conversations.push([question]);
    }
  }
  return conversations;
}

async function _computeTruth(
  database: EvalDatabase,
  question: EvalQuestion,
): Promise<Record<string, EvalQueryResult>> {
  const entries = await Promise.all(
    Object.entries(question.truth).map(async ([name, sql]) => {
      return [name, await database.query(sql)] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function _runConversation(
  options: Readonly<{
    harness: EvalHarness;
    database: EvalDatabase;
    questions: readonly EvalQuestion[];
    onGraded: (graded: GradedAnswer) => void;
  }>,
): Promise<void> {
  const conversation = options.harness.startConversation();
  for (const question of options.questions) {
    const [answer, truth] = await Promise.all([
      conversation.ask(question),
      _computeTruth(options.database, question),
    ]);
    options.onGraded(gradeEvalAnswer(question, answer, truth));
  }
}

/** Runs conversations with at most `concurrency` in flight. */
async function _runAll(
  conversations: readonly EvalQuestion[][],
  concurrency: number,
  runOne: (questions: readonly EvalQuestion[]) => Promise<void>,
): Promise<void> {
  const queue = [...conversations];
  const workers = Array.from({ length: concurrency }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      await runOne(next);
    }
  });
  await Promise.all(workers);
}

function _parseOptions() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => {
      return arg !== "--";
    }),
    options: {
      harness: { type: "string", default: "baseline" },
      model: { type: "string", default: "anthropic/claude-sonnet-5" },
      config: { type: "string", default: "" },
      questions: { type: "string", default: "" },
      concurrency: { type: "string", default: "4" },
      label: { type: "string", default: "" },
    },
  });
  return values;
}

function _selectQuestions(ids: string): readonly EvalQuestion[] {
  if (!ids) {
    return COVID_QUESTIONS;
  }
  const wanted = new Set(ids.split(","));
  return COVID_QUESTIONS.filter((question) => {
    return (
      wanted.has(question.id) ||
      [...wanted].some((id) => {
        return question.id.startsWith(id) && id.length === 1;
      })
    );
  });
}

function _createHarness(
  options: ReturnType<typeof _parseOptions>,
  database: EvalDatabase,
): EvalHarness {
  const openRouterApiKey = _readOpenRouterApiKey();
  if (options.harness === "pi") {
    return createPiHarness({
      openRouterApiKey,
      database,
      configName: options.config || "default",
      model: options.model,
    });
  }
  return createBaselineHarness({
    repoRoot: REPO_ROOT,
    openRouterApiKey,
    database,
    model: options.model,
  });
}

function _writeRun(
  harnessLabel: string,
  graded: readonly GradedAnswer[],
): string {
  const runId = `${new Date().toISOString().replaceAll(":", "-").slice(0, 19)}-${harnessLabel.replaceAll(/[^a-z0-9.-]+/gi, "_")}`;
  const runDir = join(REPO_ROOT, ".temp/ai-eval/runs", runId);
  mkdirSync(runDir, { recursive: true });
  const ordered = [...graded].sort((left, right) => {
    return left.id.localeCompare(right.id);
  });
  writeFileSync(
    join(runDir, "results.jsonl"),
    ordered.map((answer) => {
      return JSON.stringify(answer);
    }).join("\n"),
  );
  const summary = summarizeEvalRun(harnessLabel, ordered);
  writeFileSync(join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  writeFileSync(
    join(runDir, "summary.md"),
    `${SUMMARY_TABLE_HEADER}\n| ${formatSummaryRow(summary)} |\n`,
  );
  return runDir;
}

async function main(): Promise<void> {
  const options = _parseOptions();
  const database = await EvalDatabase.open({
    databasePath: join(REPO_ROOT, ".temp/ai-eval/covid.duckdb"),
  });
  const harness = _createHarness(options, database);
  const label = options.label || harness.label;
  const graded: GradedAnswer[] = [];
  await _runAll(
    _toConversations(_selectQuestions(options.questions)),
    Number(options.concurrency),
    async (questions) => {
      await _runConversation({
        harness,
        database,
        questions,
        onGraded: (answer) => {
          graded.push(answer);
          console.log(
            `${answer.pass ? "PASS" : "FAIL"} ${answer.id} ${answer.questionsAsked > 0 ? `(asked ${answer.questionsAsked}) ` : ""}$${answer.answer.usage.cost.toFixed(5)} ${(answer.answer.latencyMs / 1000).toFixed(1)}s  ${answer.detail}`,
          );
        },
      });
    },
  );
  await harness.close();
  database.close();
  const runDir = _writeRun(label, graded);
  console.log(`\n${SUMMARY_TABLE_HEADER}\n| ${formatSummaryRow(summarizeEvalRun(label, graded))} |`);
  console.log(`\nResults: ${runDir}`);
}

void main();
