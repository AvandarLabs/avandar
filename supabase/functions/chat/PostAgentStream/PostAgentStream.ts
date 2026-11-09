import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { assertMeetsMinAppRole } from "@sbfn/_shared/assertMeetsMinAppRole.ts";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { BAD_REQUEST } from "@sbfn/_shared/httpCodes.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { buildDataAgentProxyContext } from "@sbfn/chat/PostAgentStream/buildDataAgentProxyContext.ts";
import { loadDataAgentDatasets } from "@sbfn/chat/PostAgentStream/loadDataAgentDatasets.ts";
import { toProxyEvent } from "@sbfn/chat/PostAgentStream/toProxyEvent.ts";
import { z } from "zod";
import { isDataAgentPromptId } from "$/agent/dataAgent/dataAgentTools.ts";
import {
  DATA_AGENT_PROXY_MAX_OUTPUT_TOKENS,
  DATA_AGENT_PROXY_MODEL_IDS,
} from "$/agent/DataAgentModelRoster.ts";
import type { Model, Api } from "@earendil-works/pi-ai";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");

/** A context bigger than this is refused rather than billed. */
const MAX_CONTEXT_CHARACTERS = 400_000;

const models = createModels();
models.setProvider(openrouterProvider());

/**
 * Looks the model up in the server's own catalog by id. The client's model
 * object is never used: its `baseUrl` or headers could send our API key
 * somewhere else.
 */
function _resolveModel(modelId: string): Model<Api> {
  const model = DATA_AGENT_PROXY_MODEL_IDS.has(modelId)
    ? models.getModel("openrouter", modelId)
    : undefined;
  if (!model) {
    throw new AvaHTTPError(`Model "${modelId}" is not available`, BAD_REQUEST);
  }
  return model;
}

function _toSseResponse(
  stream: AsyncIterable<Parameters<typeof toProxyEvent>[0]>,
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      for await (const event of stream) {
        const proxyEvent = toProxyEvent(event);
        if (proxyEvent) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(proxyEvent)}\n\n`),
          );
        }
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

/**
 * The server side of Pi's `streamProxy`: the browser data agent sends each
 * model request here, and this streams the model's events back. It holds the
 * OpenRouter key, checks the caller can use the Data Explorer in the
 * workspace, and enforces the model allowlist and output cap.
 *
 * The prompt and tools are the server's (decision D04): the path names the
 * prompt version (every version in `DATA_AGENT_PROMPT_IDS` is served), the
 * system prompt is built from the workspace's datasets, and the browser
 * contributes only the conversation. That keeps the prompt
 * private and stops the proxy from serving as a general-purpose model
 * endpoint. Only the options that change the answer pass through.
 */
export const PostAgentStream = POST({
  path: "/:workspaceId/agent/:promptId/api/stream",
  schema: { workspaceId: z.uuid(), promptId: z.string() },
})
  .bodySchema({
    model: z.looseObject({ id: z.string() }),
    context: z.looseObject({ messages: z.array(z.unknown()) }),
    options: z
      .looseObject({
        reasoning: z.enum(["minimal", "low", "medium"]).optional(),
        sessionId: z.string().max(100).optional(),
        temperature: z.number().min(0).max(1).optional(),
        maxTokens: z.number().int().positive().optional(),
      })
      .optional(),
  })
  .action(async ({ pathParams, body, supabaseClient }) => {
    if (!openRouterApiKey) {
      throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
    }
    const { promptId } = pathParams;
    if (!isDataAgentPromptId(promptId)) {
      throw new AvaHTTPError(
        `Unknown agent prompt "${promptId}". Reload the page.`,
        BAD_REQUEST,
      );
    }
    await assertMeetsMinAppRole({
      supabaseClient,
      workspaceId: pathParams.workspaceId,
      app: "data_explorer",
      minRole: "viewer",
    });
    if (JSON.stringify(body.context).length > MAX_CONTEXT_CHARACTERS) {
      throw new AvaHTTPError("This conversation is too long", BAD_REQUEST);
    }
    const options = body.options ?? {};
    const context = buildDataAgentProxyContext({
      clientMessages: body.context.messages,
      datasets: await loadDataAgentDatasets({
        supabaseClient,
        workspaceId: pathParams.workspaceId,
      }),
      today: new Date().toISOString().slice(0, 10),
      promptId,
    });
    const stream = models.streamSimple(_resolveModel(body.model.id), context, {
      apiKey: openRouterApiKey,
      reasoning: options.reasoning,
      sessionId: options.sessionId,
      temperature: options.temperature,
      maxTokens: Math.min(
        options.maxTokens ?? DATA_AGENT_PROXY_MAX_OUTPUT_TOKENS,
        DATA_AGENT_PROXY_MAX_OUTPUT_TOKENS,
      ),
    });
    return _toSseResponse(stream);
  });
