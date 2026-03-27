import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { z, ZodError } from "npm:zod@4";

export function responseError(error: unknown, statusCode: number): Response {
  let errorMessage;
  let errorType;
  let httpCode: number = statusCode;

  if (error instanceof AvaHTTPError) {
    errorMessage = error.message;
    errorType = "AvaHTTPError";
    httpCode = error.httpCode;
  } else if (error instanceof ZodError) {
    errorMessage = z.prettifyError(error);
    errorType = "ZodError";
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorType = "Error";
  } else {
    errorMessage = String(error);
    errorType = "Unknown";
  }

  console.error(
    "Sending back an error response",
    {
      type: errorType,
      error: errorMessage,
    },
    error,
  );

  return new Response(JSON.stringify({ error: errorMessage }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: httpCode,
  });
}
