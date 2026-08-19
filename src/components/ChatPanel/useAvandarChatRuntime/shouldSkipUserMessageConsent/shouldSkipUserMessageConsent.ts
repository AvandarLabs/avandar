import { CaseDesignKickoff } from "@/components/ChatPanel/CaseDesignKickoff/CaseDesignKickoff";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";

const CLARIFICATION_ANSWER_RE = /^\[Clarification answer:/;

/**
 * Returns whether a user-message line should skip bias detection and
 * cross-boundary consent (view-change events, Case Manager kickoff, and
 * clarification answers).
 */
export function shouldSkipUserMessageConsent(content: string): boolean {
  return (
    ChatViewEvent.isViewChangeContent(content) ||
    CaseDesignKickoff.isKickoffContent(content) ||
    CLARIFICATION_ANSWER_RE.test(content)
  );
}
