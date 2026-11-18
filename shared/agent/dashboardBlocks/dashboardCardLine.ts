import { quoteBlockText } from "$/agent/pageContext/agentBlockText.ts";

/**
 * A dashboard's name in a card line sent to a hosted model when the name
 * itself looks like personal data.
 */
export const REDACTED_DASHBOARD_NAME = "Untitled dashboard";

/** What the user did with a dashboard card, as the agent hears it. */
export type DashboardCardOutcome =
  | { kind: "confirmed"; dashboardName: string; isUnsaved: boolean }
  | { kind: "cancelled" };

/**
 * One `<dashboard_card>` line telling the agent what the user did with a
 * block it proposed. `mask` hides personal values in the dashboard name
 * for a hosted model; an offline turn passes the name through.
 */
export function formatDashboardCardLine(
  outcome: DashboardCardOutcome,
  mask: (text: string) => string,
): string {
  if (outcome.kind === "cancelled") {
    return "<dashboard_card>Cancelled: nothing was added.</dashboard_card>";
  }
  const where = outcome.isUnsaved ? " in the open editor, not saved yet" : "";
  return `<dashboard_card>Confirmed: added to ${quoteBlockText(mask(outcome.dashboardName))}${where}.</dashboard_card>`;
}
