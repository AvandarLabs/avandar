import type { CodeFocusInput } from "../../presets/CodeFocus/CodeFocus.schema";

/** Supplies CodeFocus with frame-specific rendering geometry or progress. */
export function getKeyedCodeLinesFromLines(
  lines: ReadonlyArray<CodeFocusInput["lines"][number]>,
): Array<{
  key: string;
  codeTokens: CodeFocusInput["lines"][number];
  lineNumber: number;
}> {
  const lineSignatureCounts = new Map<string, number>();
  return lines.map((codeTokens, lineNumber) => {
    const signature = codeTokens
      .map((token) => {
        return `${token.color}:${token.text}`;
      })
      .join("|");
    const occurrence = lineSignatureCounts.get(signature) ?? 0;
    lineSignatureCounts.set(signature, occurrence + 1);
    return { key: `${signature}#${occurrence}`, codeTokens, lineNumber };
  });
}
