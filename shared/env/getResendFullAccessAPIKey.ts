import process from "node:process";

import { isDenoRuntime } from "$/env/isDenoRuntime.ts";
import { isNodeRuntime } from "$/env/isNodeRuntime.ts";
import { isViteBrowserRuntime } from "$/env/isViteBrowserRuntime.ts";

/** Returns the Resend API key with resource-management access. */
export function getResendFullAccessAPIKey(): string {
  let apiKey: string | undefined;

  if (isDenoRuntime()) {
    apiKey = Deno.env.get("RESEND_FULL_ACCESS_API_KEY");
  } else if (isNodeRuntime()) {
    apiKey = process.env.RESEND_FULL_ACCESS_API_KEY;
  } else if (isViteBrowserRuntime()) {
    throw new Error(
      "RESEND_FULL_ACCESS_API_KEY should never be read in the browser environment",
    );
  }

  if (!apiKey) {
    throw new Error("RESEND_FULL_ACCESS_API_KEY is not set");
  }

  return apiKey;
}
