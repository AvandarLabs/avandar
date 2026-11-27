import type { RuleCatalog } from "./RuleCatalog.types.ts";

/**
 * Renders a complete catalog as a Markdown table.
 * Use it, for example, to check the README catalog for drift.
 */
export function buildMarkdownFromRuleCatalog(
  catalog: Readonly<RuleCatalog>,
): string {
  return [
    "| ID | Slug | Requirement | Applicability | Repair | Phases | Owner | Proof boundary |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...catalog.rules.map((rule) => {
      return `| ${[
        rule.id,
        rule.slug,
        rule.title,
        rule.applicability.join(", "),
        rule.repair,
        rule.phases.join(", ") || "Judgment",
        rule.owner,
        rule.boundary,
      ]
        .map((value) => {
          return value.replaceAll("|", "\\|").replaceAll("\n", " ");
        })
        .join(" | ")} |`;
    }),
  ].join("\n");
}
