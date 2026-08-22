import process from "node:process";

import { isDenoRuntime } from "$/env/isDenoRuntime.ts";
import { isNodeRuntime } from "$/env/isNodeRuntime.ts";
import { isViteBrowserRuntime } from "$/env/isViteBrowserRuntime.ts";

/** Returns the Resend API key restricted to sending email. */
export function getResendSendingAPIKey(): string {
  let apiKey: string | undefined;

  if (isDenoRuntime()) {
    apiKey = Deno.env.get("RESEND_SENDING_API_KEY");
  } else if (isNodeRuntime()) {
    apiKey = process.env.RESEND_SENDING_API_KEY;
  } else if (isViteBrowserRuntime()) {
    throw new Error(
      "RESEND_SENDING_API_KEY should never be read in the browser environment",
    );
  }

  if (!apiKey) {
    throw new Error("RESEND_SENDING_API_KEY is not set");
  }

  return apiKey;
}
