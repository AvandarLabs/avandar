import type { Proof } from "./nativeSafeRules.types.ts";

const JS_SEED = '\nif (Boolean(1)) console.log("coverage");';
const BODY_COMMENT_SEED = `
function _avandarBodyCommentSeed() {
  /** Keep this ordinary. */
  console.log(1);
}
`;
const SHORT_COMMENT_SEED = `
/**
 * Describe this seed.
 */
const _avandarShortCommentSeed = 1;
`;
const MODULE_COMMENT_SEED = `
/** Describe the module member seed. */
function _avandarModuleCommentSeed() {}
export const _AvandarSeedCommentModule = {
  read: _avandarModuleCommentSeed,
};
`;
const TOP_FUNCTION_SEED = `
const _avandarTopDeclarationSeed = () => { console.log(1); return 1; };
_avandarTopDeclarationSeed();
`;
const NESTED_FUNCTION_SEED = `
function _avandarNestedDeclarationSeed() {
  function nestedSeed() { return 1; }
  return nestedSeed();
}
_avandarNestedDeclarationSeed();
`;
const PRIVATE_FUNCTION_SEED = `
function avandarPrivateHelperSeed() { return 1; }
export function _avandarPrivateCallerSeed() {
  return avandarPrivateHelperSeed();
}
`;
const LOCAL_ACRONYM_SEED = `
const _avandarE2ECount = 1;
console.log(_avandarE2ECount);
`;
const PROPS_ALIAS_SEED = "\ntype AvandarSeedCardProps = { count: number };\n";
const PROPS_COMPONENT_SEED = `
function AvandarSeedCard(props: AvandarSeedCardProps) {
  return <div>{!_avandarReadySeed && <span />}</div>;
}
`;
const JSX_SEED = `
function _avandarJsxSeed() {
  return <>{!_avandarReadySeed && <span />}</>;
}
`;
const UTILITY_SEEDS = [
  [
    "literal-property-map",
    `
[{ _avandarId: 1 }].map(function(row) { return row._avandarId; });
`,
  ],
  [
    "literal-property-equality",
    `
[{ _avandarId: 1 }].filter(function(row) { return row._avandarId === 1; });
`,
  ],
  [
    "fresh-data-object",
    `
function _avandarObjectSeed() {
  const result = { count: 0 };
  result.count = 1;
  return result;
}
`,
  ],
  [
    "optional-parameter-candidates",
    `
function _avandarCandidatesSeed(candidate: number | undefined) {
  const result: number[] = [];
  if (candidate !== undefined) {
    result.push(candidate);
  }
  return result;
}
`,
  ],
] as const;
const TYPE_IMPORT_SEED =
  '\nimport { Stats as _AvandarSeedStats } from "node:fs";\nlet _avandarSeedStats: _AvandarSeedStats;\n';
const TYPE_EXPORT_SEED =
  "\ntype _AvandarSeedShape = { name: string };\nexport { _AvandarSeedShape };\n";
const LITERAL_SEED =
  '\nconst _avandarSeedLiteral = "coverage" as "coverage";\nconst _avandarSeedNumber: number = 1;\nconst _avandarSeedCopy = _avandarSeedNumber as number;\n';
function _getSeedSections(path: string): Array<readonly [string, string]> {
  // Keep the witness first. Only original AST module markers qualify.
  return [
    ["local-primitive-bindings", LOCAL_ACRONYM_SEED],
    ...(/\.tsx$/.test(path)
      ? ([
          ["single-component-props", PROPS_ALIAS_SEED],
          ["boolean-jsx-children", PROPS_COMPONENT_SEED],
        ] as const)
      : []),
    ...UTILITY_SEEDS.filter(([capability]) => {
      return (
        capability !== "optional-parameter-candidates" || /\.tsx?$/.test(path)
      );
    }),
    ["if-body", JS_SEED],
    ["standalone-body-prose", BODY_COMMENT_SEED],
    ["short-prose-jsdoc", SHORT_COMMENT_SEED],
    ["direct-top-level-calls", TOP_FUNCTION_SEED],
    ["direct-nested-calls", NESTED_FUNCTION_SEED],
    ["private-direct-calls", PRIVATE_FUNCTION_SEED],
    ...(/\.[cm]?tsx?$/.test(path)
      ? ([
          ["type-imports", TYPE_IMPORT_SEED],
          ["type-exports", TYPE_EXPORT_SEED],
          ["literal-assertions", LITERAL_SEED],
          ["one-to-one-module-key", MODULE_COMMENT_SEED],
        ] as const)
      : []),
    ...(/\.jsx$/.test(path)
      ? ([["boolean-jsx-children", JSX_SEED]] as const)
      : []),
  ];
}

/** Builds isolated, noncolliding native witness ranges for loadNativeProof. */
export function createNativeSeed(
  path: string,
  source: string,
): {
  seed: string;
  capabilityRanges: Proof["capabilityRanges"];
} {
  let markerIndex = 0;
  while (
    source.includes(`avandarCoverage${markerIndex}`) ||
    source.includes(`AvandarCoverage${markerIndex}`)
  ) {
    markerIndex += 1;
  }
  let offset = Buffer.byteLength(source);
  const capabilityRanges: Proof["capabilityRanges"] = {};
  const seed = _getSeedSections(path)
    .map(([capability, originalText]) => {
      const text = originalText
        .replaceAll("avandar", `avandarCoverage${markerIndex}`)
        .replaceAll("Avandar", `AvandarCoverage${markerIndex}`);
      const start = offset;
      offset += Buffer.byteLength(text);
      capabilityRanges[capability] = { start, end: offset };
      return text;
    })
    .join("");
  return { seed, capabilityRanges };
}
