import { describe, expect, it } from "vitest";
import { parseCsvHeaderLine } from "$/connectors/open-data/parseCsvHeaderLine/parseCsvHeaderLine.ts";

describe("parseCsvHeaderLine", () => {
  it.each([
    ['"a","b","c"\n', ["a", "b", "c"]],
    ["a,b,c", ["a", "b", "c"]],
    ['"a, b","say ""hi""",c\r\n1,2,3', ["a, b", 'say "hi"', "c"]],
    ['"line\nbreak",b\n', ["line\nbreak", "b"]],
  ])("parses %j", (text, expected) => {
    expect(parseCsvHeaderLine(text)).toEqual(expected);
  });
});
