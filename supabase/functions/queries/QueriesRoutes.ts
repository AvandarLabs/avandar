import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { fetchWorkspaceSchema } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";
import { buildSqlSystemPrompt } from "@sbfn/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts";
import { cleanLlmGeneratedSql } from "@sbfn/chat/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts";
import { z } from "zod";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import type { QueriesAPI } from "@sbfn/queries/QueriesRoutes.types.ts";

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
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

function _sqlWithRelationIds(
  sql: string,
  schema: {
    datasets: ReadonlyArray<{ id: string; name: string }>;
    concepts: ReadonlyArray<{ id: string; name: string }>;
  },
): string {
  return SqlTableAlias.applyToSql(
    cleanLlmGeneratedSql(sql),
    SqlTableAlias.fromSchema({
      datasets: schema.datasets,
      concepts: schema.concepts,
    }),
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
        const schema = await fetchWorkspaceSchema({
          supabaseClient,
          workspaceId,
        });
        const rawSql = await _requestGeneratedSql({
          prompt,
          systemPrompt: buildSqlSystemPrompt({
            prompt,
            datasets: schema.datasets,
            columns: schema.columns,
            concepts: schema.concepts,
            conceptAttributes: schema.conceptAttributes,
          }),
        });
        return { sql: _sqlWithRelationIds(rawSql, schema) };
      }),
  },
});
