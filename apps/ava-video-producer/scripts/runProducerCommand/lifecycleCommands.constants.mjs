/** Static help and execution contracts for this producer command family. */
export const LIFECYCLE_COMMANDS = {
  test: {
    purpose:
      "Build product components, then run producer-owned unit and integration tests.",
    synopsis: "[node-test-options...]",
    details: [
      "Node test-runner options are forwarded unchanged. Default: run all producer-owned test files.",
      "The Remotion license is required before the product build or test runner starts.",
      "The pretest lifecycle hook is inert; this command owns its build prerequisite.",
    ],
    examples: ["pnpm test", "pnpm test --test-name-pattern=license"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx scripts/buildProduct/buildProduct.ts && node --import tsx --import ./scripts/yaml/registerYaml.ts scripts/testing/runProducerTests.ts",
  },
  typecheck: {
    purpose:
      "Build showcase prerequisites, then typecheck product and tool sources.",
    synopsis: "[typescript-options...]",
    details: [
      "TypeScript options are forwarded to the tools typecheck. Default: check both source and tool projects without emitting.",
      "The Remotion license is required before the showcase build or compiler starts.",
      "The pretypecheck lifecycle hook is inert; this command owns its build prerequisite.",
    ],
    examples: ["pnpm typecheck", "pnpm typecheck --pretty false"],
    command:
      "node --import tsx scripts/requireLicense.ts && node --import tsx --import ./scripts/yaml/registerYaml.ts scripts/showcase/buildShowcaseCli.ts && tsc --noEmit && tsc --noEmit -p tsconfig.tools.json",
  },
  pretest: {
    purpose:
      "Provide an inert npm test lifecycle hook so help can run before prerequisites.",
    synopsis: "",
    details: [
      "No command-specific arguments or options. This lifecycle shim performs no work.",
      "The test command checks the license and builds product components itself.",
      "Use component:build for an explicit product build.",
    ],
    examples: ["pnpm pretest"],
    command: null,
  },
  pretypecheck: {
    purpose:
      "Provide an inert npm typecheck lifecycle hook so help runs before prerequisites.",
    synopsis: "",
    details: [
      "No command-specific arguments or options. This lifecycle shim performs no work.",
      "The typecheck command checks the license and builds the showcase itself.",
      "Use motion:build for an explicit showcase build.",
    ],
    examples: ["pnpm pretypecheck"],
    command: null,
  },
};
