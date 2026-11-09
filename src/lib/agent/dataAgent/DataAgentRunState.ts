import type { DataAgentQueryOutcome } from "@/lib/agent/dataAgent/DataAgentHost";

/** One question card the agent showed, or a lookup it answered on its own. */
export type DataAgentQuestionRecord = {
  kind: "choice" | "values";
  question: string;
  answer: string;
  /** Answered on the device without showing the user a card. */
  isAutomatic: boolean;
};

/**
 * What happened while the agent answered one user message. The tools write
 * it; the agent reads it to decide on escalation, and callers read it for the
 * reply, analytics, and the eval.
 */
export type DataAgentRunState = {
  queryRuns: number;
  /** A query failed or came back empty, so a stronger model should retry. */
  needsEscalation: boolean;
  lastQuery?: {
    sql: string;
    summary: string;
    chart?: string;
    outcome: DataAgentQueryOutcome;
  };
  questions: DataAgentQuestionRecord[];
  /** A question card is on screen, so the turn ends until the user answers. */
  isWaitingForUser: boolean;
  /** Stored data values that were sent to the model (matched or picked). */
  valuesSentToModel: string[];
  /**
   * User texts of this conversation, oldest first. A query tool reads them
   * to tell a column question from a question about rows.
   */
  userTexts: string[];
};

/** A fresh run state for a new user message. */
export function createDataAgentRunState(): DataAgentRunState {
  return {
    queryRuns: 0,
    needsEscalation: false,
    questions: [],
    isWaitingForUser: false,
    valuesSentToModel: [],
    userTexts: [],
  };
}

/**
 * The run state for one new user message. Query bookkeeping starts over.
 * Earlier user texts stay, so a retry of a column question is still one.
 */
export function beginDataAgentRun(
  previous: DataAgentRunState,
  message: string,
): DataAgentRunState {
  return {
    ...createDataAgentRunState(),
    userTexts: [...previous.userTexts, message],
  };
}
