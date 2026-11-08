import type { Verdict } from "./grading/ResultMatchers";
import type { EvalQueryResult } from "./runtime/EvalDatabase";

/**
 * How the simulated user answers when the assistant asks something. Without a
 * script, the user picks the first option or values named in the prompt.
 */
export type SimulatedUserScript = {
  /** Picks the first fixed option matching this pattern. */
  choose?: RegExp;
  /** Typed answer when no option fits or the card asks for free text. */
  say?: string;
  /** The stored values the user means, for a value lookup card. */
  pick?: readonly string[];
};

/** What a grader sees: the model's final result and the truth results. */
export type GradeContext = {
  result: EvalQueryResult;
  truth: Readonly<Record<string, EvalQueryResult>>;
};

/** One question in the eval, with its ground truth and grader. */
export type EvalQuestion = {
  id: string;
  category: "basic" | "intermediate" | "hard" | "non_technical" | "follow_up";
  prompt: string;
  /** The question this one follows in the same conversation. */
  followsId?: string;
  /**
   * `not_needed`: asking anything is a needless question. `allowed`: one
   * question is fine. `expected`: answering without asking is a miss.
   */
  clarification: "not_needed" | "allowed" | "expected";
  user?: SimulatedUserScript;
  /**
   * Ground-truth SQL by name, over the `us_deaths`, `us_cases`, and
   * `global_deaths` views.
   */
  truth: Readonly<Record<string, string>>;
  grade: (context: GradeContext) => Verdict;
  /** The user asked for a chart, so a table alone is a miss. */
  expectsChart?: boolean;
};
