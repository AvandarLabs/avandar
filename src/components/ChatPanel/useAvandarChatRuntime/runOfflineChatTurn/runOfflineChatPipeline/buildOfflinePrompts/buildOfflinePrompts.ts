/**
 * Offline chat prompts for the WebLLM pipeline (`runOfflineChatPipeline`).
 *
 * Deterministic SQL repair lives in `repairOfflineGeneratedSql.ts`.
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

import { isDefined, propEq } from "@avandar/utils";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type {
  OfflineChatSchema,
  OfflineChatSchemaDataset,
} from "$/types/offlineChat.types";

const REFINEMENT_HINTS =
  /^\s*(now|instead|also|actually|and|but|wait)\b|\b(it|that|this query|this one|the result|the previous|same|earlier|again|now also|drop|add|clean|remove)\b/i;

function aliasesFromSchema(
  schema: OfflineChatSchema,
): readonly SqlTableAlias.T[] {
  return SqlTableAlias.fromDatasets(schema.datasets);
}

function aliasForDatasetId(
  datasetId: string,
  aliases: readonly SqlTableAlias.T[],
): string | undefined {
  return aliases.find(propEq("datasetId", datasetId))?.alias;
}

function formatSchema(schema: OfflineChatSchema): string {
  const block = SqlTableAlias.formatSchemaBlock({
    aliases: aliasesFromSchema(schema),
    columns: schema.columns,
  });
  return `Available datasets (SQL FROM must use the alias, never a label):\n${block}`;
}

function formatAllowedTablesList(schema: OfflineChatSchema): string {
  return aliasesFromSchema(schema)
    .map((entry) => {
      return `- "${entry.alias}" (label: ${entry.name})`;
    })
    .join("\n");
}

function formatResolvedDatasetRequirement(
  dataset: OfflineChatSchemaDataset,
  aliases: readonly SqlTableAlias.T[],
): string {
  const alias = aliasForDatasetId(dataset.id, aliases) ?? dataset.id;
  return `Required: use FROM "${alias}" only (label: ${dataset.name}). No other table names.\n\n`;
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
  const alias =
    aliasForDatasetId(openDatasetId, aliasesFromSchema(schema)) ??
    openDataset.id;
  return `User has this dataset open. Default FROM table name: "${alias}" (label: ${openDataset.name}).\n\n`;
}

function formatOfflineSqlSchemaNotes(): string {
  return `Rules:
- SQL FROM / JOIN targets must be the quoted aliases above, never a label, filename, or topic word (wrong: FROM "covid_deaths"; right: FROM "t0").
- Do not invent datasets or system tables (pg_database, information_schema).
- Use only column names listed next to each alias. Never invent columns.
- Do not invent WHERE literal values unless the user named them.
- DuckDB uses LIMIT, not SELECT TOP.
- Wrap every table alias and column name in double quotes.
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

Pick the dataset alias (t0, t1, …; not a label) you will use. Set proceed false if materially ambiguous.

Respond with ONLY valid JSON (no markdown fence):
{
  "summary": "one sentence with dataset alias and columns",
  "tableName": "optional exact alias from Available datasets",
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
  const aliases = aliasesFromSchema(args.schema);
  const resolvedBlock =
    args.resolvedDataset ?
      formatResolvedDatasetRequirement(args.resolvedDataset, aliases)
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
  const aliases = aliasesFromSchema(args.schema);
  const resolvedBlock =
    args.resolvedDataset ?
      formatResolvedDatasetRequirement(args.resolvedDataset, aliases)
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
