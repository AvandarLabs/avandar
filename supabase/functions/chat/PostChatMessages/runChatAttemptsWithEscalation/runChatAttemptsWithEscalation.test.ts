/**
 * The escalation ladder is what turns an empty model response into a usable
 * one, and `attemptCount` is what `analytics.chat_health` averages into
 * `avg_attempt_count`. A miscount there silently misreports how often the
 * ladder fires, so these pin both the stopping point and the count.
 */
import { runChatAttemptsWithEscalation } from "@sbfn/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendOpenRouterRequestMock, parseOpenRouterResponseMock } = vi.hoisted(
  () => {
    return {
      sendOpenRouterRequestMock: vi.fn(),
      parseOpenRouterResponseMock: vi.fn(),
    };
  },
);

vi.mock(
  "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts",
  () => {
    return { sendOpenRouterRequest: sendOpenRouterRequestMock };
  },
);

vi.mock(
  "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts",
  () => {
    return { parseOpenRouterResponse: parseOpenRouterResponseMock };
  },
);

const EMPTY = {
  text: "",
  generatedSql: undefined,
  clarification: undefined,
  dashboardBlock: undefined,
};

const USABLE = { ...EMPTY, text: "here you go" };

function _run(
  requestBody: Record<string, unknown>,
  datasets?: ReadonlyArray<{ id: string; name: string }>,
  concepts?: ReadonlyArray<{ id: string; name: string }>,
) {
  return runChatAttemptsWithEscalation({
    requestBody,
    apiKey: "key",
    referer: "https://example.test",
    lastUserPrompt: "show revenue",
    priorClarifications: 0,
    datasets,
    concepts,
  });
}

beforeEach(() => {
  sendOpenRouterRequestMock.mockReset();
  parseOpenRouterResponseMock.mockReset();
  sendOpenRouterRequestMock.mockResolvedValue({ message: {}, text: "" });
});

describe("runChatAttemptsWithEscalation", () => {
  it("stops after one call when the first attempt is usable", async () => {
    parseOpenRouterResponseMock.mockReturnValue(USABLE);

    const { parsed, attemptCount } = await _run({ model: "m" });

    expect(parsed).toBe(USABLE);
    expect(attemptCount).toBe(1);
    expect(sendOpenRouterRequestMock).toHaveBeenCalledTimes(1);
  });

  it("retries at a higher temperature when the first attempt is empty", async () => {
    parseOpenRouterResponseMock
      .mockReturnValueOnce(EMPTY)
      .mockReturnValueOnce(USABLE);

    const { attemptCount } = await _run({ model: "m", temperature: 0.3 });

    expect(attemptCount).toBe(2);
    // A literal repeat at 0.3 would just redraw the same emptiness, so the
    // second attempt has to raise the temperature.
    expect(
      sendOpenRouterRequestMock.mock.calls[1]?.[0].requestBody,
    ).toMatchObject({ temperature: 0.5 });
  });

  it("forces a tool choice on the third attempt when tools are registered", async () => {
    parseOpenRouterResponseMock.mockReturnValue(EMPTY);

    const { attemptCount } = await _run({ model: "m", tools: [{ name: "t" }] });

    expect(attemptCount).toBe(3);
    expect(
      sendOpenRouterRequestMock.mock.calls[2]?.[0].requestBody,
    ).toMatchObject({ temperature: 0.5, tool_choice: "required" });
  });

  it("skips the forced-tool attempt when the request registers no tools", async () => {
    parseOpenRouterResponseMock.mockReturnValue(EMPTY);

    // The generic surface sends no tools, so there is nothing to force.
    const { attemptCount } = await _run({ model: "m" });

    expect(attemptCount).toBe(2);
  });

  it("skips the forced-tool attempt when tools is an empty list", async () => {
    parseOpenRouterResponseMock.mockReturnValue(EMPTY);

    const { attemptCount } = await _run({ model: "m", tools: [] });

    expect(attemptCount).toBe(2);
  });

  it("lets a request failure propagate for the caller to record", async () => {
    const failure = new Error("OpenRouter API error: 500");
    sendOpenRouterRequestMock.mockRejectedValue(failure);

    await expect(_run({ model: "m" })).rejects.toBe(failure);
  });

  it("forwards datasets so generated aliases can be rewritten to ids", async () => {
    parseOpenRouterResponseMock.mockReturnValue(USABLE);
    const datasets = [
      { id: "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff", name: "Cholera cases" },
    ];

    await _run({ model: "m" }, datasets);

    expect(parseOpenRouterResponseMock.mock.calls[0]?.[0].datasets).toBe(
      datasets,
    );
  });

  it("forwards concepts so generated aliases can be rewritten to table names", async () => {
    parseOpenRouterResponseMock.mockReturnValue(USABLE);
    const concepts = [
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Case" },
    ];

    await _run({ model: "m" }, undefined, concepts);

    expect(parseOpenRouterResponseMock.mock.calls[0]?.[0].concepts).toBe(
      concepts,
    );
  });
});
