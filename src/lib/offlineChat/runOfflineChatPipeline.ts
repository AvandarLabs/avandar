import {
  buildOfflineAnalyzePrompt,
  buildOfflineFixSqlPrompt,
  buildOfflineSqlPrompt,
} from "./buildOfflinePrompts";
import {
  extractSqlFromLlmText,
  parseAnalyzeJson,
  stripSqlFenceForAssistantText,
} from "./parseOfflineLlmOutput";
import type {
  OfflineChatPipelineArgs,
  OfflineChatPipelineResult,
} from "./offlineChat.types";

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

/**
 * Multi-pass offline inference: analyze → SQL → optional DuckDB fix.
 */
export async function runOfflineChatPipeline(
  args: OfflineChatPipelineArgs,
): Promise<OfflineChatPipelineResult> {
  const phaseLabels: string[] = [];
  const needsSql =
    args.pageContext.app === "data-explorer" ||
    args.pageContext.app === "dashboards";

  if (!needsSql) {
    appendPhase(phaseLabels, "Replying (offline)…", args.onPhase);
    const text = await args.engine.complete({
      messages: [
        {
          role: "system",
          content:
            "You are Avandar offline assistant. Answer briefly in plain language.",
        },
        ...args.messages.filter((message) => {return message.role !== "system"}),
      ],
      maxTokens: 300,
    });
    return {
      assistantText: text.trim(),
      phaseLabels,
    };
  }

  appendPhase(phaseLabels, "Understanding your question (offline)…", args.onPhase);
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

  const analyze = parseAnalyzeJson(analyzeRaw);
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

  appendPhase(phaseLabels, "Writing query (offline)…", args.onPhase);
  let sqlPassText = await args.engine.complete({
    messages: [
      {
        role: "system",
        content: buildOfflineSqlPrompt({
          schema: args.schema,
          pageContext: args.pageContext,
          analysisSummary: summary,
          lastUserPrompt: args.lastUserPrompt,
          lastSql: args.lastSql,
          lastError: args.lastError,
        }),
      },
      { role: "user", content: args.lastUserPrompt },
    ],
    maxTokens: SQL_MAX_TOKENS,
    onToken: args.onPhase ?
      (delta) => {
        if (delta.length > 0 && !phaseLabels.includes("streaming_sql")) {
          phaseLabels.push("streaming_sql");
          args.onPhase?.("Generating SQL (offline)…");
        }
      }
    : undefined,
  });

  let sql = extractSqlFromLlmText(sqlPassText);
  let assistantText = stripSqlFenceForAssistantText(sqlPassText);

  if (sql && args.executeSql) {
    const exec = await args.executeSql(sql);
    if (!exec.ok) {
      appendPhase(phaseLabels, "Fixing query (offline)…", args.onPhase);
      sqlPassText = await args.engine.complete({
        messages: [
          {
            role: "system",
            content: buildOfflineFixSqlPrompt({
              schema: args.schema,
              sql,
              error: exec.error,
              lastUserPrompt: args.lastUserPrompt,
            }),
          },
          { role: "user", content: "Fix the SQL." },
        ],
        maxTokens: FIX_MAX_TOKENS,
      });
      const fixedSql = extractSqlFromLlmText(sqlPassText);
      if (fixedSql) {
        sql = fixedSql;
        assistantText = stripSqlFenceForAssistantText(sqlPassText);
      }
    }
  }

  if (!sql) {
    return {
      assistantText:
        assistantText ||
        "I could not produce SQL offline. Try rephrasing or reconnect to use cloud chat.",
      phaseLabels,
    };
  }

  return {
    assistantText:
      assistantText ||
      "Here is a query based on your workspace metadata (offline).",
    generatedSql: { sql, prompt: args.lastUserPrompt },
    phaseLabels,
  };
}
