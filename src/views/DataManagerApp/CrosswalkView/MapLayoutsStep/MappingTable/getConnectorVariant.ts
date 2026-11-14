import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

/** How the line joining a column to its fill is drawn. */
export type ConnectorVariant = "solid" | "dashed" | "none";

/**
 * Solid for a confirmed fill, dashed for a suggestion, and none for Leave
 * empty or no fill yet.
 */
export function getConnectorVariant(
  mapping: CrosswalkDraft.Mapping | undefined,
): ConnectorVariant {
  if (!mapping || mapping.fill.kind === "empty") {
    return "none";
  }
  return mapping.status === "suggested" ? "dashed" : "solid";
}
