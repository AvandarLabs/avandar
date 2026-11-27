import type { CoverageEvidence } from "../coverageHelpers.ts";

/** Exact seed capabilities used by native coverage probes. */
export const CAPABILITIES = [
  ["avlint-ts-001", "if-body", "curly"],
  ["avlint-ts-003", "type-imports", "consistent-type-imports"],
  ["avlint-ts-003", "type-exports", "consistent-type-exports"],
  ["avlint-ts-004", "literal-assertions", "prefer-as-const"],
  ["avlint-common-001", "standalone-body-prose", "function-body-line-comments"],
  ["avlint-common-002", "short-prose-jsdoc", "single-line-short-jsdoc"],
  [
    "avlint-ts-006",
    "direct-top-level-calls",
    "top-level-function-declarations",
  ],
  ["avlint-ts-007", "direct-nested-calls", "nested-arrow-functions"],
  ["avlint-ts-008", "private-direct-calls", "private-helper-prefix"],
  ["avlint-ts-009", "one-to-one-module-key", "export-key-jsdoc"],
  ["avlint-ts-010", "single-component-props", "component-props-name"],
  ["avlint-ts-011", "boolean-jsx-children", "jsx-conditional-ternary"],
  ["avlint-ts-012", "literal-property-map", "property-helper-callbacks"],
  ["avlint-ts-012", "literal-property-equality", "property-helper-callbacks"],
  ["avlint-ts-013", "fresh-data-object", "straight-line-object-construction"],
  [
    "avlint-ts-014",
    "optional-parameter-candidates",
    "optional-array-candidates",
  ],
] as const;
/** Capabilities that require the custom native plugin. */
export const CUSTOM_RULE_IDS: readonly string[] = [
  "avlint-common-001",
  "avlint-common-002",
  "avlint-ts-006",
  "avlint-ts-007",
  "avlint-ts-008",
  "avlint-ts-009",
  "avlint-ts-010",
  "avlint-ts-011",
  "avlint-ts-012",
  "avlint-ts-013",
  "avlint-ts-014",
];
/** Capabilities whose native seeds support JavaScript. */
export const JS_RULE_IDS: readonly string[] = [
  "avlint-ts-001",
  "avlint-common-001",
  "avlint-common-002",
  "avlint-ts-006",
  "avlint-ts-007",
  "avlint-ts-008",
  "avlint-ts-011",
  "avlint-ts-012",
  "avlint-ts-013",
  "avlint-ts-014",
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
