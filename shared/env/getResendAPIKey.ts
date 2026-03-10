import process from "node:process";
import { isDenoRuntime } from "./isDenoRuntime.ts";
import { isNodeRuntime } from "./isNodeRuntime.ts";
import { isViteBrowserRuntime } from "./isViteBrowserRuntime.ts";

export function getResendAPIKey(): string {
  if (isDenoRuntime()) {
    return Deno.env.get("RESEND_API_KEY")!;
  }

  if (isNodeRuntime()) {
    return process.env.RESEND_API_KEY!;
  }

  if (isViteBrowserRuntime()) {
    throw new Error(
      "RESEND_API_KEY should never be set in the browser environment",
    );
  }

  throw new Error("RESEND_API_KEY is not set");
}
