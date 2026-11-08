import { sendOpenRouterRequest } from "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts";
import { buildMeasurementExtractionMessage } from "$/agent/measurementExtraction/MeasurementExtractionPrompt.ts";
import type { AlreadyExtractedFigure } from "$/agent/measurementExtraction/MeasurementExtractionPrompt.ts";
import type { OpenRouterUsage } from "@sbfn/chat/PostChatMessages/openRouter/OpenRouterUsage.ts";

/** Tokens the model may write for one region's figures. */
const MAX_OUTPUT_TOKENS = 4000;

/** Options for {@link runMeasurementExtraction}. */
export type RunMeasurementExtractionOptions = {
  regionText: string;
  alreadyExtracted: readonly AlreadyExtractedFigure[];
  model: string;
  apiKey: string;
  referer: string;
};

/**
 * Asks the model for the figures in one PDF region, with the server's own
 * prompt and no tools: the reply is the JSON array the browser parses. The
 * HTTP route and the PDF assistant eval both call this.
 */
export async function runMeasurementExtraction(
  options: Readonly<RunMeasurementExtractionOptions>,
): Promise<{ text: string; usage: OpenRouterUsage }> {
  const { text, usage } = await sendOpenRouterRequest({
    requestBody: {
      model: options.model,
      messages: [
        {
          role: "user",
          content: buildMeasurementExtractionMessage({
            regionText: options.regionText,
            alreadyExtracted: options.alreadyExtracted,
          }),
        },
      ],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
    },
    apiKey: options.apiKey,
    referer: options.referer,
  });
  return { text, usage };
}
