import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { buildSqlSystemPrompt } from "@sbfn/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts";
import { cleanLlmGeneratedSql } from "@sbfn/chat/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import { z } from "zod";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type { QueriesAPI } from "@sbfn/queries/QueriesRoutes.types.ts";

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

type QueryDataset = { id: string; name: string };
type QueryColumn = { dataset_id: string; name: string; data_type: string };

async function _fetchWorkspaceQuerySchema(args: {
  supabaseClient: AvaSupabaseClient;
  workspaceId: string;
}): Promise<{ datasets: QueryDataset[]; columns: QueryColumn[] }> {
  const { data: datasets } = await args.supabaseClient
    .from("datasets")
    .select("id, name")
    .eq("workspace_id", args.workspaceId)
    .throwOnError();
  if (datasets.length === 0) {
    return { datasets: [], columns: [] };
  }
  const { data: columns } = await args.supabaseClient
    .from("dataset_columns")
    .select("dataset_id, name, data_type")
    .eq("workspace_id", args.workspaceId)
    .in(
      "dataset_id",
      datasets.map((dataset) => {
        return dataset.id;
      }),
    )
    .throwOnError();
  return { datasets, columns };
}

async function _requestGeneratedSql(args: {
  prompt: string;
  systemPrompt: string;
}): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: args.systemPrompt },
        { role: "user", content: args.prompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 4096,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`);
  }
  const data = await response.json();
  const sql = data.choices[0]?.message?.content?.trim();
  if (!sql) {
    throw new Error("No SQL generated from OpenAI");
  }
  return sql;
}

function _sqlWithDatasetIds(
  sql: string,
  datasets: readonly QueryDataset[],
): string {
  return SqlTableAlias.applyToSql(
    cleanLlmGeneratedSql(sql),
    SqlTableAlias.fromDatasets(datasets),
  );
}

/**
 * Route handler for the queries edge function, including natural-language SQL
 * generation for the Data Explorer AI query tab.
 */
export const QueriesRoutes = defineRoutes<QueriesAPI>("queries", {
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
        const { datasets, columns } = await _fetchWorkspaceQuerySchema({
          supabaseClient,
          workspaceId,
        });
        const rawSql = await _requestGeneratedSql({
          prompt,
          systemPrompt: buildSqlSystemPrompt({ prompt, datasets, columns }),
        });
        return { sql: _sqlWithDatasetIds(rawSql, datasets) };
      }),
  },
});
