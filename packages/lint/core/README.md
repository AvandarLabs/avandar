# @avandar/lint

Canonical catalog, engine metadata, and conservative coverage for review tools.
Requires Node 24.x. Workspace exports use source files without a prebuild;
published exports and the CLI resolve from `dist`.

```sh
avandar-lint coverage src/example.ts --format json
avandar-lint coverage src shared --format agent --no-prompt
```

A bare command offers an action menu and full coverage wizard on the controlling
terminal. Unattended defaults are current directory and `stylish`. Help exits
before configuration or repository access. JSON stdout is machine data;
progress and operational diagnostics use stderr. Operational failures exit 1.
A completed report exits 0 even when review fallback is required.

The catalog declares applicability. It does not prove enforcement. The coverage
API accepts `CoverageProbe` integrations that verify the exact file, capability,
repository configuration, and seeded engine diagnostic. Missing integrations,
disabled rules, excluded paths, unknown languages, and operational errors remain
`fallback`. Engine integrations are not registered by this package foundation.
Callers must retain review detection until an integration proves coverage.

Exports:

- `@avandar/lint/catalog`: `loadRuleCatalog`, `validateRuleCatalog`,
  `buildMarkdownFromRuleCatalog`, and catalog types.
- `@avandar/lint/coverage`: `collectCoverage`,
  `createCoverageSummariesFromOutcomes`, and exact-file engine contracts.
- `@avandar/lint/metadata`: `getRuleMetadataFromIdentity` creates canonical
  rule metadata for engine diagnostics.

The umbrella README and schema live one directory above this package. Build
copies canonical data into the tarball so consumers need no repository files.
