import { describe, expect, it } from "vitest";
import {
  extractSqlFromLlmText,
  parseAnalyzeJson,
} from "./parseOfflineLlmOutput";

describe("parseOfflineLlmOutput", () => {
  it("parses analyze JSON", () => {
    const result = parseAnalyzeJson('Here {"summary":"Ok","proceed":true} end');
    expect(result?.summary).toBe("Ok");
    expect(result?.proceed).toBe(true);
  });

  it("extracts SQL from fenced block", () => {
    expect(extractSqlFromLlmText("Text\n```sql\nSELECT 1\n```")).toBe(
      "SELECT 1",
    );
  });
});
