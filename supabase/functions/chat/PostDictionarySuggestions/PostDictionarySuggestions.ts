import { assertMeetsMinAppRole } from "@sbfn/_shared/assertMeetsMinAppRole.ts";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_REQUEST, PAYLOAD_TOO_LARGE } from "@sbfn/_shared/httpCodes.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { verifyAckToken } from "@sbfn/_shared/privacy/verifyAckToken.ts";
import { sendOpenRouterRequest } from "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts";
import { z } from "zod";
import { DATA_AGENT_MODEL_ROSTER } from "$/agent/DataAgentModelRoster.ts";
import {
  buildDictionarySuggestionsMessages,
  DictionarySuggestionsRequestSchema,
  getDictionarySuggestionsJsonSchema,
  getDictionarySuggestionsMaxTokens,
  isDictionarySuggestionsPromptId,
  isDictionarySuggestionsRequestTooLarge,
  stringifyDictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";
import { getAppURL } from "$/env/getAppURL.ts";
import { hashTextPayload } from "$/utils/privacy/sessionSecretUtils.ts";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");

/**
 * The request in a body, or a 4xx naming what is wrong with it: a 413 when
 * it is too long to consent to, a 400 when it is invalid, for example codes
 * on a column that is not coded or that is named after a person.
 */
function _parseRequest(value: unknown): DictionarySuggestionsRequest {
  const parsed = DictionarySuggestionsRequestSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  const details = z.prettifyError(parsed.error);
  if (isDictionarySuggestionsRequestTooLarge(parsed.error)) {
    throw new AvaHTTPError(
      `SUGGESTIONS_REQUEST_TOO_LARGE: ${details}`,
      PAYLOAD_TOO_LARGE,
    );
  }
  throw new AvaHTTPError(
    `INVALID_SUGGESTIONS_REQUEST: ${details}`,
    BAD_REQUEST,
  );
}

/**
 * Refuses the request unless the user consented to sending exactly this
 * request. The browser always asks first, so a missing or mismatched
 * acknowledgment is never a normal request.
 */
async function _assertConsented(
  options: Readonly<{
    ackToken: string;
    request: DictionarySuggestionsRequest;
    workspaceId: string;
    userId: string;
  }>,
): Promise<void> {
  const result = await verifyAckToken({
    token: options.ackToken,
    expectedWorkspaceId: options.workspaceId,
    expectedUserId: options.userId,
    expectedPayloadHash: await hashTextPayload(
      stringifyDictionarySuggestionsRequest(options.request),
    ),
  });
  if (!result.valid) {
    throw new AvaHTTPError(
      `UNAPPROVED_DATA_TRANSFER: consent failed verification: ${result.reason}`,
      BAD_REQUEST,
    );
  }
}

/**
 * Suggests labels for one coded column, or the columns that record the same
 * thing, for a Data Sources editor learning a dictionary from datasets. The
 * browser sends column names, kinds, and the codes of short coded columns,
 * with proof the user agreed to send them; rows never reach this route. It
 * answers with the data agent's primary model, held to the task's JSON
 * schema, and returns the raw reply, which the browser reads with the same
 * parser it uses for the offline model.
 */
export const PostDictionarySuggestions = POST({
  path: "/:workspaceId/dictionary-suggestions/:promptId",
  schema: { workspaceId: z.uuid(), promptId: z.string() },
})
  .bodySchema({
    // Typed for `ChatRoutes` but not checked here: `_parseRequest` checks it
    // in the action, so a bad request gets a 4xx of its own.
    request: z.custom<DictionarySuggestionsRequest>(),
    ackToken: z.string().min(1),
  })
  .action(async ({ pathParams, body, supabaseClient, user }) => {
    if (!isDictionarySuggestionsPromptId(pathParams.promptId)) {
      throw new AvaHTTPError(
        `Unknown dictionary suggestions prompt "${pathParams.promptId}". Reload the page.`,
        BAD_REQUEST,
      );
    }
    if (!openRouterApiKey) {
      throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
    }
    await assertMeetsMinAppRole({
      supabaseClient,
      workspaceId: pathParams.workspaceId,
      app: "data_sources",
      minRole: "editor",
    });
    const request = _parseRequest(body.request);
    await _assertConsented({
      ackToken: body.ackToken,
      request,
      workspaceId: pathParams.workspaceId,
      userId: user.id,
    });
    const { text } = await sendOpenRouterRequest({
      requestBody: {
        model: DATA_AGENT_MODEL_ROSTER.primary.openRouterId,
        messages: buildDictionarySuggestionsMessages(request),
        max_tokens: getDictionarySuggestionsMaxTokens(request),
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: `dictionary_${request.task}`,
            schema: getDictionarySuggestionsJsonSchema(request.task),
            strict: true,
          },
        },
      },
      apiKey: openRouterApiKey,
      referer: getAppURL(),
    });
    return { reply: text };
  });
