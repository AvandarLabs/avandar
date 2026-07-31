/** A function call returned by the OpenRouter chat-completions API. */
export type OpenRouterToolCall = {
  function?: { name?: string; arguments?: string };
};

/** The message fields consumed from an OpenRouter completion. */
export type OpenRouterMessage = {
  content?: string;
  tool_calls?: OpenRouterToolCall[];
};

type OpenRouterCompletion = {
  choices?: Array<{ message?: OpenRouterMessage }>;
};

/** Sends one chat-completions request and returns its first message. */
export async function sendOpenRouterRequest(options: {
  requestBody: Record<string, unknown>;
  apiKey: string;
  referer: string;
}): Promise<{ message: OpenRouterMessage | undefined; text: string }> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
        "HTTP-Referer": options.referer,
        "X-Title": "Avandar",
      },
      body: JSON.stringify(options.requestBody),
    },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${errorText}`);
  }
  const data = (await response.json()) as OpenRouterCompletion;
  const message = data.choices?.[0]?.message;
  return { message, text: (message?.content ?? "").trim() };
}
