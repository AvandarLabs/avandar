import { corsHeaders } from "../cors.ts";
import { OK } from "../httpCodes.ts";

/**
 * Wraps the data in a response with the success status and the CORS headers.
 * @param data - The data to send back in the response.
 * @returns A response with the data and the success status.
 */
export function responseSuccess(
  data: Record<string, unknown> | void = { success: true },
): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: OK,
  });
}
