import { assertMeetsMinAppRole } from "@sbfn/_shared/assertMeetsMinAppRole.ts";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_REQUEST } from "@sbfn/_shared/httpCodes.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { verifyAckToken } from "@sbfn/_shared/privacy/verifyAckToken.ts";
import { runMeasurementExtraction } from "@sbfn/chat/PostExtractMeasurements/runMeasurementExtraction.ts";
import { z } from "zod";
import { getAppURL } from "$/env/getAppURL.ts";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";
import { hashTextPayload } from "$/utils/privacy/sessionSecretUtils.ts";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");

/**
 * Refuses the request unless the user consented to sending exactly this
 * text. The browser always asks first for the PDF assistant, so a missing
 * or mismatched acknowledgment is never a normal request.
 */
async function _assertConsented(
  options: Readonly<{
    ackToken: string;
    regionText: string;
    workspaceId: string;
    userId: string;
  }>,
): Promise<void> {
  const result = await verifyAckToken({
    token: options.ackToken,
    expectedWorkspaceId: options.workspaceId,
    expectedUserId: options.userId,
    expectedPayloadHash: await hashTextPayload(options.regionText),
  });
  if (!result.valid) {
    throw new AvaHTTPError(
      `UNAPPROVED_DATA_TRANSFER: consent failed verification: ${result.reason}`,
      BAD_REQUEST,
    );
  }
}

/**
 * The PDF table assistant: reads the figures the rule-based extractor
 * missed in one region the user drew. The prompt lives here, not in the
 * browser; the browser sends the region's text, the figures already found,
 * and proof the user agreed to send that text. Answers with the default
 * chat model.
 */
export const PostExtractMeasurements = POST({
  path: "/:workspaceId/extract-measurements",
  schema: { workspaceId: z.uuid() },
})
  .bodySchema({
    regionText: z.string().min(1).max(20_000),
    alreadyExtracted: z
      .array(z.object({ metric: z.string().max(300), value: z.number() }))
      .max(500),
    ackToken: z.string().min(1),
  })
  .action(async ({ pathParams, body, supabaseClient, user }) => {
    if (!openRouterApiKey) {
      throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
    }
    await assertMeetsMinAppRole({
      supabaseClient,
      workspaceId: pathParams.workspaceId,
      app: "data_sources",
      minRole: "editor",
    });
    await _assertConsented({
      ackToken: body.ackToken,
      regionText: body.regionText,
      workspaceId: pathParams.workspaceId,
      userId: user.id,
    });
    const model = ChatModelOption.Catalog.defaultId;
    const { text } = await runMeasurementExtraction({
      regionText: body.regionText,
      alreadyExtracted: body.alreadyExtracted,
      model,
      apiKey: openRouterApiKey,
      referer: getAppURL(),
    });
    return { responseText: text, model };
  });
