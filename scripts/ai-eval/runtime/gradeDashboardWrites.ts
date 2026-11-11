import type { ExpectedDashboardWrite, EvalQuestion } from "../EvalQuestion";
import type { Verdict } from "../grading/ResultMatchers";
import type { EvalAnswer, EvalDashboardWrite } from "../harnesses/EvalHarness";
import type { EvalQueryResult } from "./EvalDatabase";

function _describeWrite(write: EvalDashboardWrite): string {
  return `${write.block.kind} on ${write.dashboardId} via ${write.via}`;
}

/** Where the one write went, and how: the target, the path, the kind. */
function _checkTarget(
  expected: ExpectedDashboardWrite,
  write: EvalDashboardWrite,
): Verdict | undefined {
  if (write.dashboardId !== expected.dashboardId) {
    return {
      pass: false,
      detail: `added to dashboard ${write.dashboardId}, expected ${expected.dashboardId}`,
    };
  }
  if (write.via !== expected.via) {
    return {
      pass: false,
      detail: `added via ${write.via}, expected via ${expected.via}`,
    };
  }
  if (write.block.kind !== expected.kind) {
    return {
      pass: false,
      detail: `added a ${write.block.kind}, expected a ${expected.kind}`,
    };
  }
  return undefined;
}

function _gradeExpectedWrite(
  question: EvalQuestion,
  expected: ExpectedDashboardWrite,
  writes: readonly EvalDashboardWrite[],
  truth: Readonly<Record<string, EvalQueryResult>>,
): Verdict {
  const [write, ...extraWrites] = writes;
  if (!write) {
    return { pass: false, detail: "added no block" };
  }
  if (extraWrites.length > 0) {
    return {
      pass: false,
      detail: `added ${writes.length} blocks: ${writes.map(_describeWrite).join("; ")}`,
    };
  }
  const targetVerdict = _checkTarget(expected, write);
  if (targetVerdict) {
    return targetVerdict;
  }
  const blockVerdict = expected.checkBlock?.(write.block);
  if (blockVerdict && !blockVerdict.pass) {
    return blockVerdict;
  }
  if (write.block.kind !== "DataViz") {
    return blockVerdict ?? { pass: true, detail: _describeWrite(write) };
  }
  if (!write.result) {
    return { pass: false, detail: write.error ?? "the chart has no result" };
  }
  return question.grade({ result: write.result, truth });
}

/**
 * Grades a dashboard question's writes. Returns undefined when the question
 * expects no write and none was made, so the reply is graded as usual.
 */
export function gradeDashboardWrites(
  question: EvalQuestion,
  answer: EvalAnswer,
  truth: Readonly<Record<string, EvalQueryResult>>,
): Verdict | undefined {
  const writes = answer.dashboardWrites ?? [];
  const expected = question.expectedWrite;
  if (expected === undefined) {
    return undefined;
  }
  if (expected === "none") {
    return writes.length === 0
      ? undefined
      : {
          pass: false,
          detail: `added a block it was not asked for: ${writes.map(_describeWrite).join("; ")}`,
        };
  }
  return _gradeExpectedWrite(question, expected, writes, truth);
}
