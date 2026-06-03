import { DuckDBSpatialExtensionDocumentation } from "@sbfn/queries/DuckDBSpatialExtensionDocumentation.ts";
import { SPATIAL_KEYWORDS } from "@sbfn/queries/SpatialKeywords.ts";

const spatialKeywordsSet = new Set(SPATIAL_KEYWORDS);

type Dataset = { id: string; name: string };
type DatasetColumn = { dataset_id: string; name: string; data_type: string };

/**
 * Heuristic to detect whether a prompt looks like a geospatial question. Used
 * to decide whether to attach the spatial documentation to the system prompt.
 */
function isSpatialPrompt(prompt: string): boolean {
  return prompt
    .replace(/[\n\t\r\W]+/g, " ")
    .toLowerCase()
    .split(" ")
    .some((word) => {
      return spatialKeywordsSet.has(word);
    });
}

/**
 * Build the schema-aware system prompt used for natural-language → DuckDB SQL
 * generation. Shared between the `queries` edge function (used by the manual
 * "AI query" tab) and the new `chat` edge function (used by the persistent
 * chat panel) so both endpoints stay in sync.
 *
 * The schema is sent as a compact listing (one line per dataset + one line
 * per column), not as JSON, to keep token cost low.
 */
export function buildSqlSystemPrompt(args: {
  prompt: string;
  datasets: readonly Dataset[];
  columns: readonly DatasetColumn[];
}): string {
  const { prompt, datasets, columns } = args;

  return `You are a DuckDB SQL query generator. Given a natural language prompt and database schema, generate a valid DuckDB SQL SELECT query.

Available datasets:
${datasets
  .map((d) => {
    return `- ${d.name} (table name: "${d.id}")`;
  })
  .join("\n")}

Schema:
${columns
  .map((c) => {
    return `- "${c.name}" (${c.data_type}) in table "${c.dataset_id}"`;
  })
  .join("\n")}

Notes:

- Dataset names are for semantic convenience only. The tables in SQL are named
  after the dataset UUIDs, not the dataset names.
- The SQL query should reference the dataset IDs instead of names.
- Wrap all table IDs and column names in quotation marks, to avoid syntax errors.
- The query will run in DuckDB and should only use DuckDB functions supported
  by DuckDB.

Output:
Generate only the SQL query, no explanations.

${
  isSpatialPrompt(prompt) ?
    `Reference documentation:
If the query requires any geospatial operations, refer to the following document:
${DuckDBSpatialExtensionDocumentation}`
  : ""
}`;
}

/**
 * Strip markdown fencing and stray prefixes that LLMs sometimes wrap around
 * generated SQL.
 */
export function cleanGeneratedSql(raw: string): string {
  return raw
    .replace(/^\n?/i, "")
    .replace(/^```\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim()
    .replace(/^sql\s+/i, "");
}
