import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
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
  category:
    | "basic"
    | "intermediate"
    | "hard"
    | "non_technical"
    | "follow_up"
    | "page_context"
    | "mentions";
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
  /**
   * What is on screen when the user asks. The Pi harness renders it with
   * the app's `buildAgentPageContextBlock`. The baseline harness passes the
   * Data Explorer part as today's chat's page context.
   */
  pageContext?: AgentPageContext;
  /**
   * Columns the Pi harness treats as personal for this question, on top of
   * the ones `detectPii` flags by name, so a value compared with them in
   * page SQL reaches the model only as a placeholder.
   */
  personalColumns?: readonly string[];
  /** The user asked for a chart, so a table alone is a miss. */
  expectsChart?: boolean;
  /**
   * Gadgets the user attached to the chat, as the browser would have loaded
   * them. The Pi harness renders them with `buildAgentContextBlocks` and
   * the conversation's vault. A follow-up that repeats its parent's
   * `attached` is sent the "unchanged" line, as in the browser.
   */
  attached?: readonly AgentGadgetContext[];
  /**
   * Gadgets `prompt` mentions. Write each in `prompt` as its token
   * (`ChatMentionToken.buildToken(context.ref)`). The harness names it the
   * way the browser does.
   */
  mentions?: readonly AgentGadgetContext[];
  /**
   * The right answer runs no query: the assistant says it cannot see what
   * the question asks about. Any query it runs is a miss.
   */
  expectsNoQuery?: boolean;
};
