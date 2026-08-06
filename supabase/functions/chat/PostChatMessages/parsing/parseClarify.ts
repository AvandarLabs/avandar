import { isReadOnlyDiscoveryQuery } from "$/utils/privacy/isReadOnlyDiscoveryQuery.ts";
import { match } from "ts-pattern";
import type { ChatClarifyRequest } from "$/types/chat.types.ts";

export const MAX_CLARIFICATIONS_PER_QUESTION = 3;
const CLARIFICATION_MARKER_RE = /^\[Clarification answer:/m;

type RawClarifyArgs = {
  question?: unknown;
  rationale?: unknown;
  responseShape?: {
    kind?: unknown;
    placeholder?: unknown;
    options?: unknown;
    multi?: unknown;
    query?: unknown;
    column?: unknown;
  };
};

/** Counts answered clarification turns in the visible chat history. */
export function countClarificationsInHistory(
  messages: ReadonlyArray<{ role: string; content: string }>,
): number {
  return messages.filter((message) => {
    return (
      message.role === "user" && CLARIFICATION_MARKER_RE.test(message.content)
    );
  }).length;
}

/** Parses and bounds a model-generated clarification request. */
export function parseClarify(
  argsJson: string | undefined,
  priorClarifications: number,
): ChatClarifyRequest | undefined {
  if (priorClarifications >= MAX_CLARIFICATIONS_PER_QUESTION || !argsJson) {
    return undefined;
  }

  let parsed: RawClarifyArgs;
  try {
    parsed = JSON.parse(argsJson) as RawClarifyArgs;
  } catch {
    return undefined;
  }

  if (
    typeof parsed.question !== "string" ||
    parsed.question.trim().length === 0
  ) {
    return undefined;
  }

  const question = parsed.question.trim();
  const rationale =
    typeof parsed.rationale === "string" ?
      parsed.rationale.trim() || undefined
    : undefined;
  const shape = parsed.responseShape;
  if (!shape || typeof shape !== "object") {
    return undefined;
  }

  const turnNumber = (priorClarifications + 1) as 1 | 2 | 3;
  return match(shape.kind)
    .with("free_text", (): ChatClarifyRequest => {
      return {
        question,
        rationale,
        responseShape: {
          kind: "free_text",
          ...(typeof shape.placeholder === "string" ?
            { placeholder: shape.placeholder.slice(0, 80) }
          : {}),
        },
        turnNumber,
      };
    })
    .with("fixed_options", (): ChatClarifyRequest | undefined => {
      if (!Array.isArray(shape.options)) {
        return undefined;
      }
      const options = shape.options
        .filter((option): option is string => {
          return typeof option === "string";
        })
        .slice(0, 8);
      if (options.length < 2) {
        return undefined;
      }
      return {
        question,
        rationale,
        responseShape: {
          kind: "fixed_options",
          options,
          multi: shape.multi === true,
        },
        turnNumber,
      };
    })
    .with("discovery", (): ChatClarifyRequest | undefined => {
      if (typeof shape.query !== "string" || typeof shape.column !== "string") {
        return undefined;
      }
      const query = shape.query.trim();
      const column = shape.column.trim();
      if (!isReadOnlyDiscoveryQuery(query) || column.length === 0) {
        return undefined;
      }
      return {
        question,
        rationale,
        responseShape: {
          kind: "discovery",
          query,
          column,
          multi: shape.multi === true,
        },
        turnNumber,
      };
    })
    .otherwise(() => {
      return undefined;
    });
}
