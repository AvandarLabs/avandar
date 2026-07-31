import { parseClarify } from "@sbfn/chat/PostChatMessages/parsing/parseClarify.ts";
import { parseDashboardBlock } from "@sbfn/chat/PostChatMessages/parsing/parseDashboardBlock.ts";
import { cleanLlmGeneratedSql } from "@sbfn/chat/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts";
import { extractSqlFromAssistantText } from "@sbfn/chat/utils/extractSqlFromAssistantText/extractSqlFromAssistantText.ts";
import type {
  OpenRouterMessage,
  OpenRouterToolCall,
} from "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type {
  ChatClarifyRequest,
  ChatGeneratedDashboardBlock,
} from "$/types/chat.types.ts";

export type ParsedAttempt = {
  text: string;
  generatedSql?: ChatResponse.GeneratedSql;
  clarification?: ChatClarifyRequest;
  dashboardBlock?: ChatGeneratedDashboardBlock;
};

/** Parses one OpenRouter message into the chat response alternatives. */
export function parseOpenRouterResponse(options: {
  message: OpenRouterMessage | undefined;
  attemptText: string;
  isDataExplorer: boolean;
  isDashboards: boolean;
  lastUserPrompt: string;
  priorClarifications: number;
}): ParsedAttempt {
  const calls: OpenRouterToolCall[] = options.message?.tool_calls ?? [];
  let generatedSql: ChatResponse.GeneratedSql | undefined;
  let clarification: ChatClarifyRequest | undefined;
  let dashboardBlock: ChatGeneratedDashboardBlock | undefined;

  const sqlCall = calls.find((call) => {
    return call?.function?.name === "generateSql";
  });
  if (sqlCall?.function) {
    try {
      const args = JSON.parse(sqlCall.function.arguments ?? "{}");
      if (typeof args.sql === "string" && args.sql.trim()) {
        generatedSql = {
          sql: cleanLlmGeneratedSql(args.sql),
          prompt: options.lastUserPrompt,
        };
      }
    } catch {
      // Malformed tool args are ignored.
    }
  }

  if (!generatedSql) {
    const clarifyCall = calls.find((call) => {
      return call?.function?.name === "clarify";
    });
    if (clarifyCall?.function) {
      clarification = parseClarify(
        clarifyCall.function.arguments,
        options.priorClarifications,
      );
    }
  }

  if (
    !generatedSql &&
    !clarification &&
    options.isDataExplorer &&
    options.attemptText.length > 0
  ) {
    const extractedSql = extractSqlFromAssistantText(options.attemptText);
    if (extractedSql) {
      generatedSql = {
        sql: cleanLlmGeneratedSql(extractedSql),
        prompt: options.lastUserPrompt,
      };
    }
  }

  if (!generatedSql && !clarification && options.isDashboards) {
    const blockCall = calls.find((call) => {
      return call?.function?.name === "addDashboardBlock";
    });
    if (blockCall?.function) {
      dashboardBlock = parseDashboardBlock(blockCall.function.arguments);
    }
  }

  return {
    text: options.attemptText,
    generatedSql,
    clarification,
    dashboardBlock,
  };
}
