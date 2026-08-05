/**
 * Offline chat prompts for the WebLLM pipeline (`runOfflineChatPipeline`).
 *
 * Deterministic SQL repair lives in `repairOfflineGeneratedSql.ts`.
 * See `docs/offline-chat-sql-hardening.md`.
 *
 * ## Dropped vs online chat (`chat.routes.ts`)
 *
 * - Tools: `generateSql`, `clarify` (including discovery DISTINCT), and
 *   `addDashboardBlock` (non-SQL blocks)
 * - Long persona and the full spatial extension documentation
 *
 * ## Privacy (not applicable offline)
 *
 * - `crossBoundary`, `reviewGeneratedSqlAssumptions`, `consentAcks`, discovery
 *   queries to a remote model
 */

import { isDefined, propEq } from "@utils";
import type {
  OfflineChatSchema,
  OfflineChatSchemaDataset,
} from "$/types/offlineChat.types";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";

const REFINEMENT_HINTS =
  /^\s*(now|instead|also|actually|and|but|wait)\b|\b(it|that|this query|this one|the result|the previous|same|earlier|again|now also|drop|add|clean|remove)\b/i;

function formatSchema(schema: OfflineChatSchema): string {
  const datasetLines = schema.datasets
    .map((dataset) => {
      return `- table name: "${dataset.id}" | label: ${dataset.name}`;
    })
    .join("\n");

  const columnLines = schema.columns
    .map((column) => {
      return `- "${column.name}" (${column.data_type}) in table "${column.dataset_id}"`;
    })
    .join("\n");

  return `Available datasets (SQL FROM must use table name, never label):\n${datasetLines}\n\nSchema:\n${columnLines}`;
}

function formatAllowedTablesList(schema: OfflineChatSchema): string {
  return schema.datasets
    .map((dataset) => {
      return `- "${dataset.id}" (label: ${dataset.name})`;
    })
    .join("\n");
}

function formatResolvedDatasetRequirement(
  dataset: OfflineChatSchemaDataset,
): string {
  return `Required: use FROM "${dataset.id}" only (label: ${dataset.name}). No other table names.\n\n`;
}

function formatOpenDatasetHint(
  pageContext: ChatPageContext.T,
  schema: OfflineChatSchema,
): string {
  const openDatasetId = pageContext.openDatasetId;
  if (!openDatasetId) {
    return "";
  }
  const openDataset = schema.datasets.find(propEq("id", openDatasetId));
  if (!openDataset) {
    return "";
  }
  return `User has this dataset open. Default FROM table name: "${openDataset.id}" (label: ${openDataset.name}).\n\n`;
}

function formatOfflineSqlSchemaNotes(): string {
  return `Rules:
- SQL FROM / JOIN targets must be the quoted table name values above, never a label, filename, or topic word (wrong: FROM "covid_deaths"; right: FROM "<uuid from table name>").
- Do not invent datasets or system tables (pg_database, information_schema).
- Use only column names listed under Schema. Never invent columns.
- Do not invent WHERE literal values unless the user named them.
- DuckDB uses LIMIT, not SELECT TOP.
- Wrap every table id and column name in double quotes.
- One read-only SELECT or WITH. No semicolons.`;
}

function formatSqlTurnContext(args: {
  lastSql?: string;
  lastError?: string;
  lastUserPrompt: string;
}): string {
  const refinementLead =
    REFINEMENT_HINTS.test(args.lastUserPrompt) ?
      "The user is refining prior SQL. Edit this query; do not start over."
    : "Prior SQL from this session (reuse or edit if the question asks to change it).";
  const parts = [
    args.lastSql ?
      `${refinementLead}\n\nPrevious SQL:\n\`\`\`sql\n${args.lastSql}\n\`\`\``
    : undefined,
    args.lastError ?
      `Previous SQL failed in DuckDB:\n${args.lastError}\nUse only Allowed table names and Schema columns below.`
    : undefined,
  ].filter(isDefined);
  if (parts.length === 0) {
    return "";
  }
  return `\n${parts.join("\n\n")}\n`;
}

function formatSqlOutputInstruction(pageContext: ChatPageContext.T): string {
  if (pageContext.app === "dashboards") {
    return "Output one short chart label line, then a single DuckDB SELECT in a ```sql fence. No other prose.";
  }
  return "Output ONLY one DuckDB SELECT inside a ```sql fence. No explanations or markdown outside the fence.";
}

export function buildOfflineAnalyzePrompt(args: {
  schema: OfflineChatSchema;
  pageContext: ChatPageContext.T;
  lastUserPrompt: string;
}): string {
  const surface =
    args.pageContext.app === "dashboards" ?
      "The user is editing a dashboard and may want chart SQL. Non-SQL blocks are not available offline."
    : "The user is in the Data Explorer asking about their data.";

  return `You are Avandar's offline assistant. ${surface}

${formatSchema(args.schema)}

User question:
${args.lastUserPrompt}

Pick the dataset table name (UUID, not label) you will use. Set proceed false if materially ambiguous.

Respond with ONLY valid JSON (no markdown fence):
{
  "summary": "one sentence with dataset table id and Schema columns",
  "tableName": "optional exact UUID from Available datasets",
  "proceed": true or false,
  "clarifyQuestion": "optional, under 25 words",
  "clarifyOptions": ["optional", "2-6", "short strings"]
}`;
}

export function buildOfflineSqlPrompt(args: {
  schema: OfflineChatSchema;
  pageContext: ChatPageContext.T;
  analysisSummary: string;
  lastUserPrompt: string;
  resolvedDataset?: OfflineChatSchemaDataset;
  lastSql?: string;
  lastError?: string;
}): string {
  const resolvedBlock =
    args.resolvedDataset ?
      formatResolvedDatasetRequirement(args.resolvedDataset)
    : "";

  return `You are a DuckDB SQL generator for Avandar offline chat.

${formatOpenDatasetHint(args.pageContext, args.schema)}${resolvedBlock}Analysis:
${args.analysisSummary}

${formatSchema(args.schema)}

${formatOfflineSqlSchemaNotes()}

User question:
${args.lastUserPrompt}${formatSqlTurnContext({
    lastSql: args.lastSql,
    lastError: args.lastError,
    lastUserPrompt: args.lastUserPrompt,
  })}
${formatSqlOutputInstruction(args.pageContext)}`;
}

export function buildOfflineFixSqlPrompt(args: {
  schema: OfflineChatSchema;
  sql: string;
  error: string;
  lastUserPrompt: string;
  resolvedDataset?: OfflineChatSchemaDataset;
}): string {
  const resolvedBlock =
    args.resolvedDataset ?
      formatResolvedDatasetRequirement(args.resolvedDataset)
    : "";

  return `Fix this DuckDB SQL. Use ONLY Allowed table names and Schema columns.

Allowed table names:
${formatAllowedTablesList(args.schema)}

Forbidden: pg_database, information_schema, invented names, dataset labels as tables.

${resolvedBlock}${formatOfflineSqlSchemaNotes()}

User question: ${args.lastUserPrompt}

Broken SQL:
\`\`\`sql
${args.sql}
\`\`\`

DuckDB error:
${args.error}

Output ONLY the corrected DuckDB SELECT in a \`\`\`sql fence. No prose.`;
}
