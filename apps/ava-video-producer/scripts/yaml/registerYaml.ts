import { register } from "node:module";

// Load with `--import tsx --import ./scripts/yaml/registerYaml.ts` for scripts
// that import authored YAML. tsx comes first so it can load the hook module.
register("./yamlHooks.ts", import.meta.url);
