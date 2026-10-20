import { register } from "node:module";

// Load with --import alongside tsx for scripts that import authored YAML.
register("./yamlHooks.mjs", import.meta.url);
