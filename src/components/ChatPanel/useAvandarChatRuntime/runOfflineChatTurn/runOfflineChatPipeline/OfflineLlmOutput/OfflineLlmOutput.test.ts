import { describe, expect, it } from "vitest";

import { OfflineLlmOutput } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/OfflineLlmOutput/OfflineLlmOutput";

describe("OfflineLlmOutput/OfflineLlmOutput", () => {
  it("parses analyze JSON", () => {
    const result = OfflineLlmOutput.parseAnalyzeJson(
      'Here {"summary":"Ok","proceed":true} end',
    );
    expect(result?.summary).toBe("Ok");
    expect(result?.proceed).toBe(true);
  });

  it("extracts SQL from fenced block", () => {
    expect(OfflineLlmOutput.extractSql("Text\n```sql\nSELECT 1\n```")).toBe(
      "SELECT 1",
    );
  });
});
