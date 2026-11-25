import { match } from "ts-pattern";
import { parseDashboardBlockFields } from "$/agent/dashboardBlocks/DashboardBlockFields.ts";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types.ts";

/** Parses and bounds an addDashboardBlock tool call. */
export function parseDashboardBlock(
  argsJson: string | undefined,
): ChatGeneratedDashboardBlock | undefined {
  if (!argsJson) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(argsJson);
  } catch {
    return undefined;
  }
  const result = parseDashboardBlockFields(parsed);
  return result.kind === "valid" ? result.block : undefined;
}

/** Builds the user-facing summary for a dashboard block response. */
export function dashboardBlockSummary(
  block: ChatGeneratedDashboardBlock,
): string {
  return match(block)
    .with({ kind: "DataViz" }, ({ prompt, vizType }) => {
      return `Added "${prompt}" to your dashboard as a ${vizType}.`;
    })
    .with({ kind: "HeadingBlock" }, ({ text }) => {
      return `Added a heading: "${text}".`;
    })
    .with({ kind: "ParagraphBlock" }, () => {
      return "Added a paragraph to your dashboard.";
    })
    .with({ kind: "QuoteBlock" }, () => {
      return "Added a quote to your dashboard.";
    })
    .with({ kind: "DividerBlock" }, () => {
      return "Added a divider to your dashboard.";
    })
    .with({ kind: "CalloutBlock" }, ({ title }) => {
      return `Added a callout: "${title}".`;
    })
    .with({ kind: "ListBlock" }, ({ items }) => {
      return `Added a list with ${items.length} item(s) to your dashboard.`;
    })
    .with({ kind: "CodeBlock" }, () => {
      return "Added a code block to your dashboard.";
    })
    .with({ kind: "TableBlock" }, () => {
      return "Added a table to your dashboard.";
    })
    .with({ kind: "Card" }, ({ title }) => {
      return `Added a card: "${title}".`;
    })
    .exhaustive();
}
