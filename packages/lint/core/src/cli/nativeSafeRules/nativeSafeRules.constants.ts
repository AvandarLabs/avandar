import type { CoverageEvidence } from "../coverageHelpers.ts";

/** Exact seed capabilities used by native coverage probes. */
export const CAPABILITIES = [
  ["AF-01", "if-body", "curly"],
  ["AF-03", "type-imports", "consistent-type-imports"],
  ["AF-03", "type-exports", "consistent-type-exports"],
  ["AF-04", "literal-assertions", "prefer-as-const"],
  ["AF-06", "standalone-body-prose", "function-body-line-comments"],
  ["AF-07", "short-prose-jsdoc", "single-line-short-jsdoc"],
  ["AF-08", "direct-top-level-calls", "top-level-function-declarations"],
  ["AF-09", "direct-nested-calls", "nested-arrow-functions"],
  ["AF-10", "private-direct-calls", "private-helper-prefix"],
  ["AF-11", "one-to-one-module-key", "export-key-jsdoc"],
  ["AF-12", "single-component-props", "component-props-name"],
  ["AF-13", "local-primitive-bindings", "local-e2e-casing"],
  ["AF-14", "boolean-jsx-children", "jsx-conditional-ternary"],
  ["AF-15", "literal-property-map", "property-helper-callbacks"],
  ["AF-15", "literal-property-equality", "property-helper-callbacks"],
  ["AF-16", "fresh-data-object", "straight-line-object-construction"],
  ["AF-17", "optional-parameter-candidates", "optional-array-candidates"],
] as const;
/** Capabilities that require the custom native plugin. */
export const CUSTOM_RULE_IDS: readonly string[] = [
  "AF-06",
  "AF-07",
  "AF-08",
  "AF-09",
  "AF-10",
  "AF-11",
  "AF-12",
  "AF-13",
  "AF-14",
  "AF-15",
  "AF-16",
  "AF-17",
];
/** Capabilities whose native seeds support JavaScript. */
export const JS_RULE_IDS: readonly string[] = [
  "AF-01",
  "AF-06",
  "AF-07",
  "AF-08",
  "AF-09",
  "AF-10",
  "AF-13",
  "AF-14",
  "AF-15",
  "AF-16",
  "AF-17",
];
/** Native diagnostic codes indexed by their configured rule names. */
export const NATIVE_CODES: Record<string, string> = {
  curly: "eslint(curly)",
  "consistent-type-imports": "typescript(consistent-type-imports)",
  "consistent-type-exports": "typescript(consistent-type-exports)",
  "prefer-as-const": "typescript(prefer-as-const)",
};
/** Neutral evidence used when a native capability has not been proven. */
export const UNPROVEN: CoverageEvidence = {
  available: false,
  enabled: false,
  included: false,
  operational: true,
  exitCode: 0,
  diagnosticRuleIds: [],
};
