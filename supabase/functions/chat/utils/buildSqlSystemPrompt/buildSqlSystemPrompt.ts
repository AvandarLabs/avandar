import { DuckDbSpatialExtensionDocumentation } from "@sbfn/queries/DuckDbSpatialExtensionDocumentation.ts";
import { SPATIAL_KEYWORDS } from "@sbfn/queries/SpatialKeywords.ts";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";

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
 * Spatial-extension notes for a prompt that looks geospatial. Empty when the
 * prompt has no spatial keywords.
 */
export function makeSpatialSqlDocumentationFromPrompt(prompt: string): string {
  return isSpatialPrompt(prompt) ?
      `Reference documentation:
If the query requires any geospatial operations, refer to the following document:
${DuckDbSpatialExtensionDocumentation}`
    : "";
}

type BuildSqlSystemPromptOptions = {
  prompt: string;
  datasets: readonly Dataset[];
  columns: readonly DatasetColumn[];
  includeSpatialDocumentation?: boolean;
};

/**
 * Build the schema-aware system prompt used for natural-language → DuckDB SQL
 * generation. Shared between the `chat` edge function surfaces so they stay
 * in sync.
 *
 * The schema is a compact alias listing (one line per dataset, columns inline),
 * not JSON, to keep the character budget low. Dataset UUIDs are rewritten
 * after the model returns SQL. Spatial docs default on for the queries
 * endpoint; chat omits them here and puts them in the volatile turn suffix.
 */
export function buildSqlSystemPrompt(
  options: Readonly<BuildSqlSystemPromptOptions>,
): string {
  const {
    prompt,
    datasets,
    columns,
    includeSpatialDocumentation = true,
  } = options;
  const aliases = SqlTableAlias.fromDatasets(datasets);
  const schemaBlock = SqlTableAlias.formatSchemaBlock({ aliases, columns });
  const spatialDocs =
    includeSpatialDocumentation ?
      makeSpatialSqlDocumentationFromPrompt(prompt)
    : "";

  return `You are a DuckDB SQL query generator. Given a natural language prompt and database schema, generate a valid DuckDB SQL SELECT query.

Available datasets:
${schemaBlock}

Notes:

- SQL FROM / JOIN targets must be the aliases above (t0, t1, …), never a label
  or filename. Wrap aliases and column names in double quotes.
- Do not invent datasets or columns.
- The query will run in DuckDB and should only use DuckDB functions supported
  by DuckDB.

Output:
Generate only the SQL query, no explanations.

${spatialDocs}`;
}
