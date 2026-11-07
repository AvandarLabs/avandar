import { arr, bool, obj, opt, str } from "@earendil-works/pi-schema";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { DataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import type { AgentTool } from "@earendil-works/pi-agent-core";

/** After this many questions in one answer, the agent must choose on its own. */
const MAX_QUESTIONS_PER_ANSWER = 2;

/** Options the card adds by itself, so the model should not repeat them. */
const CARD_BUILT_IN_OPTION_PATTERN =
  /^(something else|none of (the above|these)|other)\b/i;

/** What the model reads when the question card waits for the user. */
export const DEFERRED_ANSWER_TEXT =
  "The question is on the user's screen. Their answer will be their next message.";

const ASK_USER_PARAMETERS = obj({
  question: str({ description: "One neutral question, under 20 words." }),
  options: arr(str(), {
    minItems: 2,
    maxItems: 5,
    description: "Answers the data can support.",
  }),
  multi: opt(bool({ description: "Whether the user may pick several." })),
});

/**
 * The tool that asks the user one question on a card and waits for the
 * answer, so the clarification and the query happen in one agent run.
 */
export function createAskUserTool(
  options: Readonly<{ host: DataAgentHost; state: DataAgentRunState }>,
): AgentTool<typeof ASK_USER_PARAMETERS> {
  return {
    name: "ask_user",
    label: "Ask the user",
    description:
      "Asks the user one short question with options and returns the answer. Only for choices that change who or what is counted.",
    parameters: ASK_USER_PARAMETERS,
    executionMode: "sequential",
    execute: async (_toolCallId, params) => {
      const askedCount = options.state.questions.filter((question) => {
        return question.kind === "choice";
      }).length;
      if (askedCount >= MAX_QUESTIONS_PER_ANSWER) {
        return {
          content: [{ type: "text", text: "Do not ask again. Make a reasonable choice, say it in the summary, and run the query." }],
          details: undefined,
        };
      }
      const answer = await options.host.askUser({
        question: params.question,
        options: params.options.filter((option) => {
          return !CARD_BUILT_IN_OPTION_PATTERN.test(option.trim());
        }),
        isMulti: params.multi ?? false,
        kind: "choice",
      });
      if (answer.kind === "deferred") {
        options.state.questions.push({ kind: "choice", question: params.question, answer: "(on screen)", isAutomatic: false });
        return {
          content: [{ type: "text", text: DEFERRED_ANSWER_TEXT }],
          details: undefined,
          terminate: true,
        };
      }
      const answerText =
        answer.kind === "picked"
          ? answer.values.join(", ")
          : answer.kind === "typed"
            ? answer.text
            : "(dismissed)";
      options.state.questions.push({ kind: "choice", question: params.question, answer: answerText, isAutomatic: false });
      return {
        content: [
          {
            type: "text",
            text:
              answer.kind === "dismissed"
                ? "The user dismissed the question. Make a reasonable choice and say it in the summary."
                : `The user answered: ${answerText}`,
          },
        ],
        details: undefined,
      };
    },
  };
}
