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
import type {
  ChatAPI,
  ChatClarifyRequest,
  ChatGeneratedSQL,
  ChatModelsResponse,
  ChatResponse,
} from "@sbfn/chat/chat.types.ts";
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

const MAX_CLARIFICATIONS_PER_QUESTION = 3;

const CLARIFICATION_MARKER_RE = /^\[Clarification answer:/m;

/**
 * Counts how many clarification answers the user has already provided in
 * the visible thread. The frontend tags each answered clarification by
 * appending a `[Clarification answer: ...]` block to the user message.
 * Once we reach the cap, we omit the `clarify` tool from the next turn so
 * the model has to commit to SQL.
 */
function _countClarificationsInHistory(
  messages: ReadonlyArray<{ role: string; content: string }>,
): number {
  let count = 0;
  for (const msg of messages) {
    if (msg.role !== "user") {
      continue;
    }
    if (CLARIFICATION_MARKER_RE.test(msg.content)) {
      count += 1;
    }
  }
  return count;
}

type RawClarifyArgs = {
  question?: unknown;
  rationale?: unknown;
  responseShape?: {
    kind?: unknown;
    placeholder?: unknown;
    options?: unknown;
    multi?: unknown;
  };
};

function _parseClarify(
  argsJson: string | undefined,
  priorClarifications: number,
): ChatClarifyRequest | undefined {
  if (priorClarifications >= MAX_CLARIFICATIONS_PER_QUESTION) {
    return undefined;
  }
  if (!argsJson) {
    return undefined;
  }
  let parsed: RawClarifyArgs;
  try {
    parsed = JSON.parse(argsJson) as RawClarifyArgs;
  } catch {
    return undefined;
  }

  if (
    typeof parsed.question !== "string" ||
    parsed.question.trim().length === 0
  ) {
    return undefined;
  }
  const rationale =
    typeof parsed.rationale === "string" ?
      parsed.rationale.trim() || undefined
    : undefined;

  const shape = parsed.responseShape;
  if (!shape || typeof shape !== "object") {
    return undefined;
  }
  const turnNumber = (priorClarifications + 1) as 1 | 2 | 3;

  if (shape.kind === "free_text") {
    return {
      question: parsed.question.trim(),
      rationale,
      responseShape: {
        kind: "free_text",
        ...(typeof shape.placeholder === "string" ?
          { placeholder: shape.placeholder.slice(0, 80) }
        : {}),
      },
      turnNumber,
    };
  }
  if (shape.kind === "fixed_options") {
    if (!Array.isArray(shape.options)) {
      return undefined;
    }
    const options = shape.options
      .filter((o): o is string => {
        return typeof o === "string";
      })
      .slice(0, 8);
    if (options.length < 2) {
      return undefined;
    }
    return {
      question: parsed.question.trim(),
      rationale,
      responseShape: {
        kind: "fixed_options",
        options,
        multi: shape.multi === true,
      },
      turnNumber,
    };
  }
  return undefined;
}

const dataExplorerSystemPrefix = `
You are Avandar, an embedded assistant that helps users analyze their data
inside the Avandar workspace.

The user is currently in the Data Explorer. When they ask a data question,
either call the \`generateSql\` tool with a DuckDB SELECT, or call the
\`clarify\` tool first if the question is materially ambiguous.

CLARIFYING QUESTIONS

When to call \`clarify\`:
- Subjective terms without a clear metric ("good", "best", "poor",
  "important", "successful").
- Multi-meaning columns (e.g. "client" could mean customer or beneficiary).
- Subjective categorizations the model has to guess at ("poverty
  indicators", "at-risk groups").
- Ambiguous scopes ("this year" when the data spans multiple years).

When NOT to call \`clarify\`:
- The metadata already disambiguates the question.
- The ambiguity is minor and a reasonable default exists — make the
  choice, explain it briefly in your reply, and proceed with SQL.
- The question is straightforward ("monthly revenue by region").

How to clarify:
- Ask ONE question at a time. Keep it under 25 words.
- Prefer \`fixed_options\` (≤8 choices) when you can enumerate from the
  metadata. Use \`free_text\` for open-ended or numeric answers.
- State neutrally. Do not assume the answer.
- NEVER use gendered, ethnic, religious, or culturally loaded framing.
- Include a brief \`rationale\` so the user understands why you're asking.

When the user has answered prior clarification(s), the answers will be
attached at the end of the conversation as \`[Clarification answer: ...]\`
lines. Use them; do not ask the same thing again.

After at most 3 clarification turns within one analytic question, make
a reasonable assumption and call \`generateSql\`.

If the user asks something that is not a data question, answer it
concisely without calling any tool.`;

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
    GET: GET("/models").action(async (): Promise<ChatModelsResponse> => {
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
    }),
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

        const priorClarifications = _countClarificationsInHistory(messages);
        const clarificationCapReached =
          priorClarifications >= MAX_CLARIFICATIONS_PER_QUESTION;

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
            ...(clarificationCapReached ?
              []
            : [
                {
                  type: "function",
                  function: {
                    name: "clarify",
                    description:
                      "Ask the user one clarifying question when their request is materially ambiguous and the answer would change the SQL. Prefer fixed_options when the choices can be enumerated from metadata. Use this BEFORE generateSql when ambiguous.",
                    parameters: {
                      type: "object",
                      properties: {
                        question: {
                          type: "string",
                          maxLength: 200,
                          description:
                            "≤25 words, neutrally phrased, single question.",
                        },
                        rationale: {
                          type: "string",
                          maxLength: 200,
                          description:
                            "Optional one-sentence explanation of why you are asking.",
                        },
                        responseShape: {
                          oneOf: [
                            {
                              type: "object",
                              properties: {
                                kind: { const: "free_text" },
                                placeholder: { type: "string", maxLength: 80 },
                              },
                              required: ["kind"],
                              additionalProperties: false,
                            },
                            {
                              type: "object",
                              properties: {
                                kind: { const: "fixed_options" },
                                options: {
                                  type: "array",
                                  minItems: 2,
                                  maxItems: 8,
                                  items: { type: "string", maxLength: 80 },
                                },
                                multi: { type: "boolean" },
                              },
                              required: ["kind", "options", "multi"],
                              additionalProperties: false,
                            },
                          ],
                        },
                      },
                      required: ["question", "responseShape"],
                      additionalProperties: false,
                    },
                  },
                },
              ]),
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

        let generatedSql: ChatGeneratedSQL | undefined;
        let clarification: ChatClarifyRequest | undefined;
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

        // Only honor `clarify` if no SQL was also produced this turn — the
        // SQL path is the terminal one. If the model emitted both, it
        // already knows what to do, so we skip the clarification.
        if (!generatedSql) {
          const clarifyToolCall = toolCalls.find((tc) => {
            return tc?.function?.name === "clarify";
          });
          if (clarifyToolCall?.function) {
            const parsed = _parseClarify(
              clarifyToolCall.function.arguments,
              priorClarifications,
            );
            if (parsed) {
              clarification = parsed;
            }
          }
        }

        const assistantText =
          text ||
          (generatedSql ?
            "Here is the SQL I ran. Results are on the canvas to the left."
          : clarification ? clarification.question
          : "I could not generate a query for that. Try rephrasing.");

        const result: ChatResponse = {
          assistantText,
          ...(generatedSql ? { generatedSql: generatedSql } : {}),
          ...(clarification ? { clarification } : {}),
        };
        return result;
      }),
  },
});
