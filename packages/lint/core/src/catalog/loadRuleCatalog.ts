/* oxlint-disable import/extensions -- Node needs source extensions. */
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { getCatalogUrlFromFilename } from "./getCatalogUrlFromFilename.ts";
import { validateRuleCatalog } from "./validateRuleCatalog.ts";
import type { RuleCatalog } from "./RuleCatalog.types.ts";

/**
 * Loads canonical requirements for consumers such as coverage and rule docs.
 */
export function loadRuleCatalog(
  path: string | URL = getCatalogUrlFromFilename("rules.yaml"),
): RuleCatalog {
  return validateRuleCatalog(parse(readFileSync(path, "utf8")));
}
