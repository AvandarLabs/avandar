import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type {
  AgentPageContext,
  AgentPageTile,
} from "$/agent/pageContext/AgentPageContext";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
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

/** A dashboard in the workspace, as a dashboard question's fixture. */
export type EvalDashboard = {
  id: string;
  name: string;
  /** Whether the user may edit it. Only editable dashboards can be targets. */
  canEdit: boolean;
  tiles: readonly AgentPageTile[];
};

/** The one block a dashboard question's answer must add. */
export type ExpectedDashboardWrite = {
  dashboardId: string;
  via: "editor" | "card";
  kind: ChatGeneratedDashboardBlock["kind"];
  /** Checks the block's own fields, such as a heading's text. */
  checkBlock?: (block: ChatGeneratedDashboardBlock) => Verdict;
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
    | "mentions"
    | "schema"
    | "coded"
    | "dashboards";
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
   * Ground-truth SQL by name, over the workspace's truth views: `us_deaths`,
   * `us_cases`, and `global_deaths`, or `line_list` for coded questions.
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
  /**
   * Grades the reply text. Set when the right answer is prose from the
   * schema, so a query shown to the user is a miss. `grade` is not called.
   */
  gradeText?: (assistantText: string) => Verdict;
  /**
   * The right answer calls the `fitRegression` plugin tool on a result the
   * Data Explorer shows, then states the fitted `slope`. The Pi harness
   * publishes `rows` and `columns` (all `double`) as the explorer's result
   * before it asks. A reply passes when it called the tool and names the
   * slope. `grade` is not called.
   */
  fitRegression?: {
    rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
    columns: readonly string[];
    xColumn: string;
    yColumn: string;
    slope: number;
  };
  /**
   * The workspace's dashboards. Set on dashboard questions, whose answer may
   * add a block to one of them.
   */
  dashboards?: readonly EvalDashboard[];
  /** The dashboard open in the editor when the user asks, if any. */
  openEditorDashboardId?: string;
  /**
   * How the simulated user answers a dashboard card: confirm (the default)
   * or cancel, and which dashboard to pick when several match.
   */
  card?: { action: "confirm" | "cancel"; pickDashboardId?: string };
  /**
   * The one block the answer must add, or `none` when it must add none.
   * With `none`, `grade` or `gradeText` then grades the reply as usual. A
   * DataViz write is graded by `grade` on the block's own result.
   */
  expectedWrite?: ExpectedDashboardWrite | "none";
};
