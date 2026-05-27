import {
  defineRoutes,
  GET,
  POST,
} from "@sbfn/_shared/MiniServer/MiniServer.ts";
import {
  buildSQLSystemPrompt,
  cleanGeneratedSQL,
} from "@sbfn/_shared/sql/buildSQLSystemPrompt.ts";
import { AppConfig } from "$/config/AppConfig.ts";
import { getAppURL } from "$/env/getAppURL.ts";
import { curateOpenRouterModels } from "$/utils/chat/curateOpenRouterModels.ts";
import { z } from "zod";
import type { ChatAPI } from "@sbfn/chat/chat.types.ts";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type { OpenRouterModelInput } from "$/utils/chat/curateOpenRouterModels.ts";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");
if (!openRouterApiKey) {
  throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
}

const openRouterReferer = getAppURL();

const OPENROUTER_MODELS_URL =
  "https://openrouter.ai/api/v1/models?output_modalities=text&supported_parameters=tools";

/** Matches OpenRouter model ids such as `openai/gpt-4o-mini`. */
const OPENROUTER_MODEL_ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9._-]+$/i;

type OpenRouterModelsResponse = {
  data?: OpenRouterModelInput[];
};

function _resolveChatModel(model: string | undefined): string {
  if (model && OPENROUTER_MODEL_ID_PATTERN.test(model)) {
    return model;
  }
  return AppConfig.chat.defaultModelId;
}

// Cheap heuristic for "this prompt is a refinement of the previous turn."
// When it matches AND the client gave us a `lastSql`, we attach the prior
// SQL to the system prompt so the model can edit it instead of rebuilding
// from scratch. The brief calls for "prior prompt + SQL only when relevant"
// to keep token spend honest; this regex is the relevance gate.
const REFINEMENT_HINTS =
  /^\s*(now|instead|also|actually|and|but|wait)\b|\b(it|that|this query|this one|the result|the previous|same|earlier|again|now also)\b/i;

// OpenRouter speaks the OpenAI Chat Completions wire format, so we POST
// directly the same way `queries.routes.ts` calls OpenAI. The brief names
// Vercel AI SDK as the target stack; using it here means npm: imports inside
// a Deno edge function, which adds runtime risk we don't need yet. We can
// migrate once the rest of the chat flow is stable.

type Dataset = { id: string; name: string };
type DatasetColumn = { dataset_id: string; name: string; data_type: string };

type OpenRouterToolCall = {
  function?: { name?: string; arguments?: string };
};

const dataExplorerSystemPrefix = `
You are Avandar, an embedded assistant that helps users analyze their data
inside the Avandar workspace.

The user is currently in the Data Explorer. When they ask a question about
their data, call the \`generateSql\` tool with a DuckDB SELECT statement that
answers it. Do not include the SQL in your text reply. Keep your reply short
(one or two sentences). If the user asks something that is not a data question,
answer it concisely without calling the tool.`;

const genericSystemPrompt = `
You are Avandar, an embedded assistant inside the Avandar workspace. The user
is not currently on a page where data tools are available. Be concise and
helpful, and let them know they can switch to the Data Explorer to ask questions about their data.`;

async function fetchSchemaForWorkspace(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any;
  workspaceId: string;
}): Promise<{ datasets: Dataset[]; columns: DatasetColumn[] }> {
  const { supabaseClient, workspaceId } = args;

  const { data: datasets } = await supabaseClient
    .from("datasets")
    .select("id, name, workspace_id")
    .eq("workspace_id", workspaceId)
    .throwOnError();

  if (!datasets || datasets.length === 0) {
    return { datasets: [], columns: [] };
  }

  const { data: columns } = await supabaseClient
    .from("dataset_columns")
    .select("dataset_id, name, data_type")
    .eq("workspace_id", workspaceId)
    .in(
      "dataset_id",
      datasets.map((d: Dataset) => {
        return d.id;
      }),
    )
    .throwOnError();

  return { datasets: datasets ?? [], columns: columns ?? [] };
}

/**
 * Routes for the persistent chat panel ("Ask Avandar"). The client posts the
 * current thread plus page context; the model decides whether to call the
 * `generateSql` tool. When it does, the resulting SQL is returned to the
 * client which auto-applies it to the Data Explorer canvas.
 */
export const Routes = defineRoutes<ChatAPI>("chat", {
  /**
   * Returns the OpenRouter model catalog for the chat panel model picker.
   * The edge function proxies OpenRouter so the API key stays server-side.
   * Returns a curated, grouped catalog (allowlist, deduped slugs, open vs
   * proprietary) for the chat panel model picker.
   */
  "/models": {
    GET: GET("/models").action(
      async (): Promise<{ groups: ChatModelOption.OptionGroup[] }> => {
        const response = await fetch(OPENROUTER_MODELS_URL, {
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            "HTTP-Referer": openRouterReferer,
            "X-Title": "Avandar",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter models API error: ${errorText}`);
        }

        const payload = (await response.json()) as OpenRouterModelsResponse;
        const groups = curateOpenRouterModels(payload.data ?? []);
        return { groups };
      },
    ),
  },
  /**
   * Handles a chat turn for the Ask Avandar panel in a workspace.
   * The client sends the thread, page context, and optional model id; we call
   * OpenRouter and may invoke `generateSql` on the Data Explorer.
   * The response is assistant text plus optional SQL for the canvas to run.
   */
  "/:workspaceId/messages": {
    POST: POST({
      path: "/:workspaceId/messages",
      schema: {
        workspaceId: z.uuid(),
      },
    })
      .bodySchema({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string(),
          }),
        ),
        context: z.object({
          app: z.enum(["data-explorer", "data-sources", "dashboards", "other"]),
          openDatasetId: z.string().optional(),
          lastSql: z.string().optional(),
          lastError: z.string().optional(),
        }),
        model: z.string().optional(),
      })
      .action(async ({ pathParams, body, supabaseClient }) => {
        const { workspaceId } = pathParams;
        const { messages, context, model: requestedModel } = body;
        const model = _resolveChatModel(requestedModel);

        const isDataExplorer = context.app === "data-explorer";

        // Only fetch the schema when we'll actually use it.
        const schema =
          isDataExplorer ?
            await fetchSchemaForWorkspace({ supabaseClient, workspaceId })
          : { datasets: [], columns: [] };

        const lastUserPrompt =
          [...messages].reverse().find((m) => {
            return m.role === "user";
          })?.content ?? "";

        const sqlSystemPrompt =
          isDataExplorer ?
            buildSQLSystemPrompt({
              prompt: lastUserPrompt,
              datasets: schema.datasets,
              columns: schema.columns,
            })
          : "";

        const hasLastSql =
          typeof context.lastSql === "string" && context.lastSql.length > 0;

        const isLikelyRefinement =
          isDataExplorer && hasLastSql && REFINEMENT_HINTS.test(lastUserPrompt);

        const refinementContext =
          isLikelyRefinement && hasLastSql ?
            `\n\nThe user's previous turn produced this SQL, and the current message looks like a refinement of it. When generating SQL, edit this prior query rather than starting over.\n\nPrevious SQL:\n\`\`\`sql\n${context.lastSql}\n\`\`\``
          : "";

        // When the prior SQL produced a runtime error and the client passed
        // it back, surface it so the model can fix the query in this turn.
        const errorContext =
          isDataExplorer && hasLastSql && context.lastError ?
            `\n\nThe previous SQL failed at runtime with this error. Use the error to fix the query.\n\nPrevious SQL:\n\`\`\`sql\n${context.lastSql}\n\`\`\`\n\nError:\n${context.lastError}`
          : "";

        const systemContent =
          isDataExplorer ?
            `${dataExplorerSystemPrefix}\n\n${sqlSystemPrompt}${refinementContext}${errorContext}`
          : genericSystemPrompt;

        const requestBody: Record<string, unknown> = {
          model,
          messages: [{ role: "system", content: systemContent }, ...messages],
          temperature: 0.3,
        };

        if (isDataExplorer) {
          requestBody.tools = [
            {
              type: "function",
              function: {
                name: "generateSql",
                description:
                  "Submit a DuckDB SELECT statement that answers the user's data question. Use this whenever the user asks about their data.",
                parameters: {
                  type: "object",
                  properties: {
                    sql: {
                      type: "string",
                      description:
                        "Valid DuckDB SELECT. Wrap all table IDs and column names in double quotes.",
                    },
                  },
                  required: ["sql"],
                  additionalProperties: false,
                },
              },
            },
          ];
          requestBody.tool_choice = "auto";
        }

        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterApiKey}`,
              "HTTP-Referer": openRouterReferer,
              "X-Title": "Avandar",
            },
            body: JSON.stringify(requestBody),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API error: ${errorText}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await response.json();
        const message = data.choices?.[0]?.message;
        const text = (message?.content ?? "").trim();

        let generatedSql: ChatResponse.GeneratedSql | undefined;
        const toolCalls: OpenRouterToolCall[] = message?.tool_calls ?? [];
        const generateSqlToolCall = toolCalls.find((tc) => {
          return tc?.function?.name === "generateSql";
        });
        if (generateSqlToolCall?.function) {
          try {
            const args = JSON.parse(
              generateSqlToolCall.function.arguments ?? "{}",
            );
            if (typeof args.sql === "string" && args.sql.trim()) {
              generatedSql = {
                sql: cleanGeneratedSQL(args.sql),
                prompt: lastUserPrompt,
              };
            }
          } catch {
            // Malformed tool args: ignore this tool call. The assistant
            // will still get a chance to produce text below.
          }
        }

        const assistantText =
          text ||
          (generatedSql ?
            "Here is the SQL I ran. Results are on the canvas to the left."
          : "I could not generate a query for that. Try rephrasing.");

        const result: ChatResponse.T = {
          assistantText,
          ...(generatedSql ? { generatedSql: generatedSql } : {}),
        };
        return result;
      }),
  },
});
