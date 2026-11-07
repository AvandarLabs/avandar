import type { GradedAnswer } from "./gradeEvalAnswer";

/** Headline numbers for one harness configuration over the question set. */
export type EvalRunSummary = {
  label: string;
  questionCount: number;
  passCount: number;
  needlessQuestions: number;
  missedQuestions: number;
  consentPrompts: number;
  modelCalls: number;
  promptTokens: number;
  cachedPromptTokens: number;
  completionTokens: number;
  totalCost: number;
  costPerQuestion: number;
  latencyMedianMs: number;
  latencyP90Ms: number;
  failedIds: string[];
};

function _percentile(values: readonly number[], share: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => {
    return left - right;
  });
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]!;
}

function _sum(answers: readonly GradedAnswer[], pick: (answer: GradedAnswer) => number): number {
  return answers.reduce((total, answer) => {
    return total + pick(answer);
  }, 0);
}

/** Adds up a run's graded answers. */
export function summarizeEvalRun(
  label: string,
  answers: readonly GradedAnswer[],
): EvalRunSummary {
  const totalCost = _sum(answers, (answer) => {
    return answer.answer.usage.cost;
  });
  const latencies = answers.map((answer) => {
    return answer.answer.latencyMs;
  });
  return {
    label,
    questionCount: answers.length,
    passCount: answers.filter((answer) => {
      return answer.pass;
    }).length,
    needlessQuestions: answers.filter((answer) => {
      return answer.isNeedlessQuestion;
    }).length,
    missedQuestions: answers.filter((answer) => {
      return answer.isMissedQuestion;
    }).length,
    consentPrompts: _sum(answers, (answer) => {
      return answer.answer.consentPrompts;
    }),
    modelCalls: _sum(answers, (answer) => {
      return answer.answer.usage.calls;
    }),
    promptTokens: _sum(answers, (answer) => {
      return answer.answer.usage.promptTokens;
    }),
    cachedPromptTokens: _sum(answers, (answer) => {
      return answer.answer.usage.cachedPromptTokens;
    }),
    completionTokens: _sum(answers, (answer) => {
      return answer.answer.usage.completionTokens;
    }),
    totalCost,
    costPerQuestion: totalCost / Math.max(answers.length, 1),
    latencyMedianMs: _percentile(latencies, 0.5),
    latencyP90Ms: _percentile(latencies, 0.9),
    failedIds: answers
      .filter((answer) => {
        return !answer.pass;
      })
      .map((answer) => {
        return answer.id;
      }),
  };
}

/** One Markdown table row for a run summary. */
export function formatSummaryRow(summary: EvalRunSummary): string {
  return [
    summary.label,
    `${summary.passCount}/${summary.questionCount}`,
    String(summary.needlessQuestions),
    String(summary.missedQuestions),
    (summary.modelCalls / Math.max(summary.questionCount, 1)).toFixed(2),
    Math.round(summary.promptTokens / Math.max(summary.modelCalls, 1)).toString(),
    `$${summary.costPerQuestion.toFixed(5)}`,
    `${(summary.latencyMedianMs / 1000).toFixed(1)}s / ${(summary.latencyP90Ms / 1000).toFixed(1)}s`,
    summary.failedIds.join(" "),
  ].join(" | ");
}

/** The header for `formatSummaryRow`'s table. */
export const SUMMARY_TABLE_HEADER = `| Harness and model | Correct | Needless questions | Missed questions | Calls per question | Input tokens per call | Cost per question | Latency p50 / p90 | Wrong or failed |
|---|---|---|---|---|---|---|---|---|`;
