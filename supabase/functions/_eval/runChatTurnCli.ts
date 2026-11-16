/**
 * Runs chat turns for the AI harness eval (`scripts/ai-eval`) through the
 * same code path as the `chat` edge function, without auth or a database.
 *
 * Reads one JSON request per stdin line and writes one JSON response per
 * stdout line, matched by `id`, so one process serves a whole eval run.
 * Requests run concurrently. This directory has no `index.ts`, so it is never
 * deployed as a function.
 *
 * Also runs the PDF table assistant's extraction for its eval
 * (`scripts/ai-eval/pdf`).
 *
 * Usage:
 *   deno run --allow-env --allow-net --allow-read \
 *     --config supabase/functions/chat/deno.json \
 *     supabase/functions/_eval/runChatTurnCli.ts
 */
import { runChatTurn } from "@sbfn/chat/PostChatMessages/runChatTurn/runChatTurn.ts";
import { runMeasurementExtraction } from "@sbfn/chat/PostExtractMeasurements/runMeasurementExtraction.ts";
import type { RunChatTurnOptions } from "@sbfn/chat/PostChatMessages/runChatTurn/runChatTurn.ts";
import type { RunMeasurementExtractionOptions } from "@sbfn/chat/PostExtractMeasurements/runMeasurementExtraction.ts";

/** A chat turn, or a PDF assistant extraction. */
type EvalTurnRequest =
  | { id: string; turn: Omit<RunChatTurnOptions, "apiKey" | "referer"> }
  | {
      id: string;
      extraction: Omit<RunMeasurementExtractionOptions, "apiKey" | "referer">;
    };

const REFERER = "http://localhost:6213";

const apiKey = Deno.env.get("OPEN_ROUTER_API_KEY");
if (!apiKey) {
  throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
}

const encoder = new TextEncoder();

function _writeLine(payload: unknown): void {
  Deno.stdout.writeSync(encoder.encode(`${JSON.stringify(payload)}\n`));
}

async function _handleLine(line: string, openRouterApiKey: string) {
  const request = JSON.parse(line) as EvalTurnRequest;
  const startedAt = performance.now();
  try {
    if ("extraction" in request) {
      const extraction = await runMeasurementExtraction({
        ...request.extraction,
        apiKey: openRouterApiKey,
        referer: REFERER,
      });
      _writeLine({
        id: request.id,
        text: extraction.text,
        usage: extraction.usage,
        latencyMs: performance.now() - startedAt,
      });
      return;
    }
    const turn = await runChatTurn({
      ...request.turn,
      apiKey: openRouterApiKey,
      referer: REFERER,
    });
    _writeLine({
      id: request.id,
      result: turn.result,
      attemptCount: turn.attemptCount,
      usage: turn.usage,
      latencyMs: performance.now() - startedAt,
    });
  } catch (error) {
    _writeLine({
      id: request.id,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: performance.now() - startedAt,
    });
  }
}

const decoder = new TextDecoderStream();
let buffered = "";
for await (const chunk of Deno.stdin.readable.pipeThrough(decoder)) {
  buffered += chunk;
  const lines = buffered.split("\n");
  buffered = lines.pop() ?? "";
  for (const line of lines) {
    if (line.trim()) {
      void _handleLine(line, apiKey);
    }
  }
}
