import type { RuleCatalog } from "./RuleCatalog.types.ts";

function _escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

/**
 * Renders the complete catalog section for reference and README drift checks.
 */
export function renderRuleCatalog(catalog: Readonly<RuleCatalog>): string {
  return [
    "| ID | Slug | Requirement | Applicability | Repair | Phases | Owner | Proof boundary |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...catalog.rules.map((rule) => {
      return `| ${[rule.id, rule.slug, rule.title, rule.applicability.join(", "), rule.repair, rule.phases.join(", ") || "Judgment", rule.owner, rule.boundary].map(_escapeCell).join(" | ")} |`;
    }),
  ].join("\n");
}
