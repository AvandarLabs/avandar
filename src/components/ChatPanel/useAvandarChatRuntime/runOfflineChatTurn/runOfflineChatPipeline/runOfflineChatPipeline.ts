import {
  buildOfflineAnalyzePrompt,
  buildOfflineFixSqlPrompt,
  buildOfflineSqlPrompt,
} from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/buildOfflinePrompts/buildOfflinePrompts";
import { devLogOfflineChat } from "@/components/ChatPanel/offlineChatHelpers/devLogOfflineChat";
import { narrowOfflineSchema } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/narrowOfflineSchema";
import { OfflineLlmOutput } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/OfflineLlmOutput/OfflineLlmOutput";
import { repairOfflineGeneratedSql } from "@/components/ChatPanel/offlineChatHelpers/repairOfflineGeneratedSql/repairOfflineGeneratedSql";
import { resolveOfflineDataset } from "@/components/ChatPanel/offlineChatHelpers/resolveOfflineDataset/resolveOfflineDataset";
import type {
  OfflineChatPipelineArgs,
  OfflineChatPipelineResult,
} from "$/types/offlineChat.types";

const ANALYZE_MAX_TOKENS = 220;
const SQL_MAX_TOKENS = 450;
const FIX_MAX_TOKENS = 350;

function appendPhase(
  phases: string[],
  label: string,
  onPhase?: (label: string) => void,
): void {
  phases.push(label);
  onPhase?.(label);
}

function hardenExtractedSql(args: {
  sql: string;
  schema: OfflineChatPipelineArgs["schema"];
  lastUserPrompt: string;
  pageContext: OfflineChatPipelineArgs["pageContext"];
  analyzeTableName?: string;
  resolvedDatasetId?: string;
  executionError?: string;
}): string {
  const repaired = repairOfflineGeneratedSql({
    sql: args.sql,
    schema: args.schema,
    lastUserPrompt: args.lastUserPrompt,
    openDatasetId: args.pageContext.openDatasetId,
    analyzeTableName: args.analyzeTableName,
    resolvedDatasetId: args.resolvedDatasetId,
    executionError: args.executionError,
  });
  devLogOfflineChat("hardenExtractedSql", {
    sqlIn: args.sql,
    sqlOut: repaired.sql,
    resolvedDatasetId: args.resolvedDatasetId,
    appliedSteps: repaired.appliedSteps,
  });
  return repaired.sql;
}

/**
 * Multi-pass offline inference: analyze → SQL → deterministic repair → DuckDB
 * → optional column repair → optional LLM fix.
 */
export async function runOfflineChatPipeline(
  args: OfflineChatPipelineArgs,
): Promise<OfflineChatPipelineResult> {
  const phaseLabels: string[] = [];
  const needsSql =
    args.pageContext.app === "data-explorer" ||
    args.pageContext.app === "dashboards";

  if (!needsSql) {
    appendPhase(phaseLabels, args.copy.replying, args.onPhase);
    const text = await args.engine.complete({
      messages: [
        {
          role: "system",
          content:
            "You are Avandar offline assistant. Answer briefly in plain language.",
        },
        ...args.messages.filter((message) => {
          return message.role !== "system";
        }),
      ],
      maxTokens: 300,
    });
    return {
      assistantText: text.trim(),
      phaseLabels,
    };
  }

  appendPhase(phaseLabels, args.copy.understandingQuestion, args.onPhase);
  const analyzeRaw = await args.engine.complete({
    messages: [
      {
        role: "system",
        content: buildOfflineAnalyzePrompt({
          schema: args.schema,
          pageContext: args.pageContext,
          lastUserPrompt: args.lastUserPrompt,
        }),
      },
      { role: "user", content: args.lastUserPrompt },
    ],
    maxTokens: ANALYZE_MAX_TOKENS,
  });

  const analyze = OfflineLlmOutput.parseAnalyzeJson(analyzeRaw);
  const summary = analyze?.summary ?? "Proceeding with your question.";
  const proceed = analyze?.proceed ?? true;

  if (!proceed && analyze?.clarifyQuestion) {
    const options = analyze.clarifyOptions;
    return {
      assistantText: analyze.clarifyQuestion,
      clarification: {
        question: analyze.clarifyQuestion,
        responseShape:
          options && options.length >= 2 ?
            { kind: "fixed_options", options, multi: false }
          : { kind: "free_text" },
        turnNumber: 1,
      },
      phaseLabels,
    };
  }

  const resolvedDataset = resolveOfflineDataset({
    schema: args.schema,
    lastUserPrompt: args.lastUserPrompt,
    openDatasetId: args.pageContext.openDatasetId,
    analyzeTableName: analyze?.tableName,
  });

  devLogOfflineChat("runOfflineChatPipeline:resolvedDataset", {
    resolvedId: resolvedDataset?.id,
    resolvedName: resolvedDataset?.name,
    analyzeTableName: analyze?.tableName,
    lastUserPrompt: args.lastUserPrompt,
  });

  const sqlPromptSchema =
    resolvedDataset ?
      narrowOfflineSchema(args.schema, resolvedDataset.id)
    : args.schema;

  appendPhase(phaseLabels, args.copy.writingQuery, args.onPhase);
  let sqlPassText = await args.engine.complete({
    messages: [
      {
        role: "system",
        content: buildOfflineSqlPrompt({
          schema: sqlPromptSchema,
          pageContext: args.pageContext,
          analysisSummary: summary,
          lastUserPrompt: args.lastUserPrompt,
          resolvedDataset,
          lastSql: args.lastSql,
          lastError: args.lastError,
        }),
      },
      { role: "user", content: args.lastUserPrompt },
    ],
    maxTokens: SQL_MAX_TOKENS,
    onToken:
      args.onPhase ?
        (delta) => {
          if (
            delta.length > 0 &&
            !phaseLabels.includes(args.copy.generatingSql)
          ) {
            phaseLabels.push(args.copy.generatingSql);
            args.onPhase?.(args.copy.generatingSql);
          }
        }
      : undefined,
  });

  let sql = OfflineLlmOutput.extractSql(sqlPassText);
  devLogOfflineChat("runOfflineChatPipeline:sqlExtracted", {
    rawLlmSql: sql,
  });
  let assistantText = resolveOfflineSqlAssistantText({
    pageContext: args.pageContext,
    sqlPassText,
    hasSql: sql !== undefined,
  });

  if (sql) {
    appendPhase(phaseLabels, args.copy.repairingQuery, args.onPhase);
    sql = hardenExtractedSql({
      sql,
      schema: args.schema,
      lastUserPrompt: args.lastUserPrompt,
      pageContext: args.pageContext,
      analyzeTableName: analyze?.tableName,
      resolvedDatasetId: resolvedDataset?.id,
    });
  }

  if (sql && args.executeSql) {
    let exec = await args.executeSql(sql);
    if (!exec.ok) {
      sql = hardenExtractedSql({
        sql,
        schema: args.schema,
        lastUserPrompt: args.lastUserPrompt,
        pageContext: args.pageContext,
        analyzeTableName: analyze?.tableName,
        resolvedDatasetId: resolvedDataset?.id,
        executionError: exec.error,
      });
      exec = await args.executeSql(sql);
    }
    if (!exec.ok) {
      appendPhase(phaseLabels, args.copy.fixingQuery, args.onPhase);
      sqlPassText = await args.engine.complete({
        messages: [
          {
            role: "system",
            content: buildOfflineFixSqlPrompt({
              schema: args.schema,
              sql,
              error: exec.error,
              lastUserPrompt: args.lastUserPrompt,
              resolvedDataset,
            }),
          },
          { role: "user", content: "Fix the SQL." },
        ],
        maxTokens: FIX_MAX_TOKENS,
      });
      const fixedSql = OfflineLlmOutput.extractSql(sqlPassText);
      if (fixedSql) {
        sql = hardenExtractedSql({
          sql: fixedSql,
          schema: args.schema,
          lastUserPrompt: args.lastUserPrompt,
          pageContext: args.pageContext,
          analyzeTableName: analyze?.tableName,
          resolvedDatasetId: resolvedDataset?.id,
          executionError: exec.error,
        });
        assistantText = resolveOfflineSqlAssistantText({
          pageContext: args.pageContext,
          sqlPassText,
          hasSql: true,
        });
        if (args.executeSql) {
          await args.executeSql(sql);
        }
      }
    }
  }

  if (!sql) {
    return {
      assistantText: assistantText || args.copy.noSql,
      phaseLabels,
    };
  }

  devLogOfflineChat("runOfflineChatPipeline:finalSql", { sql });

  return {
    assistantText:
      assistantText ||
      (args.pageContext.app === "data-explorer" ? "" : args.copy.metadataQuery),
    generatedSql: { sql, prompt: args.lastUserPrompt },
    phaseLabels,
  };
}

function resolveOfflineSqlAssistantText(args: {
  pageContext: OfflineChatPipelineArgs["pageContext"];
  sqlPassText: string;
  hasSql: boolean;
}): string {
  if (args.pageContext.app === "data-explorer" && args.hasSql) {
    return "";
  }
  return OfflineLlmOutput.stripSqlFence(args.sqlPassText);
}
