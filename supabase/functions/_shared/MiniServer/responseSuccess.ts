import { corsHeaders } from "../cors.ts";
import { OK } from "../httpCodes.ts";

export function responseSuccess(
  data: Record<string, unknown> | void = { success: true },
): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: OK,
  });
}
