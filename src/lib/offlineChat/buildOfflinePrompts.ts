import type { OfflineChatSchema } from "./offlineChat.types";
import type { ChatPageContext } from "$/types/chat.types";

function formatSchema(schema: OfflineChatSchema): string {
  const datasetLines = schema.datasets
    .map((dataset) => {
      return `- ${dataset.name} (table name: "${dataset.id}")`;
    })
    .join("\n");

  const columnLines = schema.columns
    .map((column) => {
      return `- "${column.name}" (${column.data_type}) in table "${column.dataset_id}"`;
    })
    .join("\n");

  return `Available datasets:\n${datasetLines}\n\nSchema:\n${columnLines}`;
}

export function buildOfflineAnalyzePrompt(args: {
  schema: OfflineChatSchema;
  pageContext: ChatPageContext;
  lastUserPrompt: string;
}): string {
  const surface =
    args.pageContext.app === "dashboards" ?
      "The user is editing a dashboard and may want a chart or text block."
    : "The user is in the Data Explorer asking about their data.";

  return `You are Avandar's offline assistant. ${surface}

${formatSchema(args.schema)}

User question:
${args.lastUserPrompt}

Respond with ONLY valid JSON (no markdown fence):
{
  "summary": "one sentence",
  "proceed": true or false,
  "clarifyQuestion": "optional, under 25 words",
  "clarifyOptions": ["optional", "2-6", "short", "strings"]
}

Set proceed false when the question is materially ambiguous and the answer would change SQL or filters.
Set proceed true when you can write SQL confidently from metadata alone.`;
}

export function buildOfflineSqlPrompt(args: {
  schema: OfflineChatSchema;
  pageContext: ChatPageContext;
  analysisSummary: string;
  lastUserPrompt: string;
  lastSql?: string;
  lastError?: string;
}): string {
  const refinement =
    args.lastSql ?
      `\nPrevious SQL to refine:\n\`\`\`sql\n${args.lastSql}\n\`\`\``
    : "";
  const errorCtx =
    args.lastError ?
      `\nPrevious SQL failed:\n${args.lastError}\nFix the query.`
    : "";

  const dashboardHint =
    args.pageContext.app === "dashboards" ?
      "\nIf the user wants a chart or table, output DuckDB SQL in a ```sql fence and a short label line before it."
    : "";

  return `You are a DuckDB SQL generator. Tables use dataset UUIDs in double quotes.

Analysis:
${args.analysisSummary}

${formatSchema(args.schema)}

User question:
${args.lastUserPrompt}
${refinement}
${errorCtx}
${dashboardHint}

Output a brief plain-language reply, then a single DuckDB SELECT in a \`\`\`sql fence. Wrap all table ids and column names in double quotes.`;
}

export function buildOfflineFixSqlPrompt(args: {
  schema: OfflineChatSchema;
  sql: string;
  error: string;
  lastUserPrompt: string;
}): string {
  return `Fix this DuckDB SQL. Output only a brief note and a corrected query in a \`\`\`sql fence.

${formatSchema(args.schema)}

User question: ${args.lastUserPrompt}

Broken SQL:
\`\`\`sql
${args.sql}
\`\`\`

Error:
${args.error}`;
}
