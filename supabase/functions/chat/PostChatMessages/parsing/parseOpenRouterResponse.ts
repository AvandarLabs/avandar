import { parseClarify } from "@sbfn/chat/PostChatMessages/parsing/parseClarify.ts";
import { parseCreateCaseTypes } from "@sbfn/chat/PostChatMessages/parsing/parseCreateCaseTypes.ts";
import { parseDashboardBlock } from "@sbfn/chat/PostChatMessages/parsing/parseDashboardBlock.ts";
import { parseProposeCaseType } from "@sbfn/chat/PostChatMessages/parsing/parseProposeCaseType.ts";
import { cleanLlmGeneratedSql } from "@sbfn/chat/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts";
import { extractSqlFromAssistantText } from "@sbfn/chat/utils/extractSqlFromAssistantText/extractSqlFromAssistantText.ts";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import type {
  OpenRouterMessage,
  OpenRouterToolCall,
} from "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type {
  ChatClarifyRequest,
  ChatCreatedCaseType,
  ChatGeneratedDashboardBlock,
  ChatProposedCaseType,
} from "$/types/chat.types.ts";

export type ParsedAttempt = {
  text: string;
  generatedSql?: ChatResponse.GeneratedSql;
  clarification?: ChatClarifyRequest;
  dashboardBlock?: ChatGeneratedDashboardBlock;
  createdCaseTypes?: ChatCreatedCaseType[];
  proposedCaseType?: ChatProposedCaseType;
};

/** Parses one OpenRouter message into the chat response alternatives. */
export function parseOpenRouterResponse(options: {
  message: OpenRouterMessage | undefined;
  attemptText: string;
  lastUserPrompt: string;
  priorClarifications: number;
  datasets?: ReadonlyArray<{ id: string; name: string }>;
  concepts?: ReadonlyArray<{ id: string; name: string }>;
  skipSqlExtraction?: boolean;
}): ParsedAttempt {
  const calls: OpenRouterToolCall[] = options.message?.tool_calls ?? [];
  let generatedSql: ChatResponse.GeneratedSql | undefined;
  let clarification: ChatClarifyRequest | undefined;
  let dashboardBlock: ChatGeneratedDashboardBlock | undefined;
  let createdCaseTypes: ChatCreatedCaseType[] | undefined;
  let proposedCaseType: ChatProposedCaseType | undefined;

  const createCasesCall = calls.find((call) => {
    return call?.function?.name === "createCaseTypes";
  });
  if (createCasesCall?.function) {
    createdCaseTypes = parseCreateCaseTypes(createCasesCall.function.arguments);
  }

  if (!createdCaseTypes) {
    const proposeCall = calls.find((call) => {
      return call?.function?.name === "proposeCaseType";
    });
    if (proposeCall?.function) {
      proposedCaseType = parseProposeCaseType(proposeCall.function.arguments);
    }
  }

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

  if (!generatedSql && !createdCaseTypes && !proposedCaseType) {
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
    !createdCaseTypes &&
    !proposedCaseType &&
    !options.skipSqlExtraction &&
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

  if (
    !generatedSql &&
    !clarification &&
    !createdCaseTypes &&
    !proposedCaseType
  ) {
    const blockCall = calls.find((call) => {
      return call?.function?.name === "addDashboardBlock";
    });
    if (blockCall?.function) {
      dashboardBlock = parseDashboardBlock(blockCall.function.arguments);
    }
  }

  return applySqlTableAliasesToParsedAttempt(
    {
      text: options.attemptText,
      generatedSql,
      clarification,
      dashboardBlock,
      createdCaseTypes,
      proposedCaseType,
    },
    options.datasets ?? [],
    options.concepts ?? [],
  );
}

function applySqlTableAliasesToParsedAttempt(
  parsed: ParsedAttempt,
  datasets: ReadonlyArray<{ id: string; name: string }>,
  concepts: ReadonlyArray<{ id: string; name: string }>,
): ParsedAttempt {
  if (datasets.length === 0 && concepts.length === 0) {
    return parsed;
  }
  const aliases = SqlTableAlias.fromSchema({ datasets, concepts });
  const generatedSql =
    parsed.generatedSql ?
      {
        ...parsed.generatedSql,
        sql: SqlTableAlias.applyToSql(parsed.generatedSql.sql, aliases),
      }
    : undefined;
  const clarification = applySqlTableAliasesToClarification(
    parsed.clarification,
    aliases,
  );
  return { ...parsed, generatedSql, clarification };
}

function applySqlTableAliasesToClarification(
  clarification: ChatClarifyRequest | undefined,
  aliases: readonly SqlTableAlias.T[],
): ChatClarifyRequest | undefined {
  if (clarification?.responseShape.kind !== "discovery") {
    return clarification;
  }
  return {
    ...clarification,
    responseShape: {
      ...clarification.responseShape,
      query: SqlTableAlias.applyToSql(
        clarification.responseShape.query,
        aliases,
      ),
    },
  };
}
