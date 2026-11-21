import type { RenderedLabelExpectation } from "./RenderedLabelExpectation.types";

/**
 * Returns authored accessible copy independently of its painted representation.
 */
export function getAccessibleTextFromLabelExpectation(
  label: Readonly<RenderedLabelExpectation>,
): string {
  return typeof label === "string" ? label : label.text;
}
