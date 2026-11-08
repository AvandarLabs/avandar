import { OpenRouterUsage } from "@sbfn/chat/PostChatMessages/openRouter/OpenRouterUsage.ts";
import { runMeasurementExtraction } from "@sbfn/chat/PostExtractMeasurements/runMeasurementExtraction.ts";
import { describe, expect, it, vi } from "vitest";

const { sendOpenRouterRequestMock } = vi.hoisted(() => {
  return { sendOpenRouterRequestMock: vi.fn() };
});

vi.mock(
  "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts",
  () => {
    return { sendOpenRouterRequest: sendOpenRouterRequestMock };
  },
);

describe("runMeasurementExtraction", () => {
  it("asks the model with the server's prompt, the rules' figures, and no tools", async () => {
    sendOpenRouterRequestMock.mockResolvedValue({
      message: { content: "[]" },
      text: "[]",
      usage: OpenRouterUsage.empty,
    });

    const result = await runMeasurementExtraction({
      regionText: "In June, 166 cases were reported in South Darfur.",
      alreadyExtracted: [{ metric: "cases", value: 166 }],
      model: "anthropic/claude-haiku-5.5",
      apiKey: "key",
      referer: "http://localhost",
    });

    const body = sendOpenRouterRequestMock.mock.calls[0]![0].requestBody;
    expect(body.model).toBe("anthropic/claude-haiku-5.5");
    expect(body).not.toHaveProperty("tools");
    expect(body.messages).toHaveLength(1);
    const content = body.messages[0].content as string;
    expect(content).toContain("Extract every quantitative measurement");
    expect(content).toContain('[{"metric":"cases","value":166}]');
    expect(content).toMatch(
      /Text:\nIn June, 166 cases were reported in South Darfur\.$/,
    );
    expect(result.text).toBe("[]");
  });
});
