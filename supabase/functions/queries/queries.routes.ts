import { z } from "zod";
import { defineRoutes, GET } from "../_shared/MiniServer/MiniServer.ts";
import { DuckDBSpatialExtensionDocumentation } from "./DuckDBSpatialExtensionDocumentation.ts";
import { SPATIAL_KEYWORDS } from "./SpatialKeywords.ts";
import type { QueriesAPI } from "./queries.types.ts";

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

const spatialKeywordsSet = new Set(SPATIAL_KEYWORDS);

/**
 * This is the route handler for all queries endpoints.
 */
export const Routes = defineRoutes<QueriesAPI>("queries", {
  "/:workspaceId/generate": {
    GET: GET({
      path: "/:workspaceId/generate",
      schema: {
        workspaceId: z.uuid(),
      },
    })
      .querySchema({
        prompt: z.string(),
      })
      .action(async ({ queryParams, pathParams, supabaseClient }) => {
        const { workspaceId } = pathParams;
        const { prompt } = queryParams;

        // Get datasets for the user's workspace to provide context
        const { data: datasets } = await supabaseClient
          .from("datasets")
          .select("id, name, workspace_id")
          .eq("workspace_id", workspaceId)
          .throwOnError();

        // Get dataset columns for schema context
        const { data: columns } = await supabaseClient
          .from("dataset_columns")
          .select("dataset_id, name, data_type")
          .throwOnError();

        const isSpatialPrompt = prompt
          // remove newlines, tabs, and special characters to make this easier
          .replace(/[\n\t\r\W]+/g, " ")
          .toLowerCase()
          .split(" ")
          .some((word) => {
            return spatialKeywordsSet.has(word);
          });

        // Build the system prompt
        const systemPrompt = `You are a DuckDB SQL query generator. Given a natural language prompt and database schema, generate a valid DuckDB SQL SELECT query.

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
  isSpatialPrompt ?
    `Reference documentation:
If the query requires any geospatial operations, refer to the following document:
${DuckDBSpatialExtensionDocumentation}`
  : ""
}`;

        // Call OpenAI
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: systemPrompt,
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              temperature: 0.3, // Lower temperature for more deterministic SQL
              max_tokens: 500, // Adjust based on expected query length
            }),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${error}`);
        }

        const data = await response.json();
        let sql = data.choices[0]?.message?.content?.trim();

        if (!sql) {
          throw new Error("No SQL generated from OpenAI");
        }

        // 5. Clean SQL (remove markdown if present)
        sql = sql
          .replace(/^\n?/i, "")
          .replace(/^```\n?/i, "")
          .replace(/\n?```$/i, "")
          .trim();

        // if string starts with the word 'sql' then also remove it
        sql = sql.replace(/^sql\s+/i, "");

        return { sql };
      }),
  },
});
