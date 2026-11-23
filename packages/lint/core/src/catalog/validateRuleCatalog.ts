import { readFileSync } from "node:fs";
/* oxlint-disable import/extensions -- Node needs source extensions. */
import { Ajv } from "ajv";
import { getCatalogUrlFromFilename } from "./getCatalogUrlFromFilename.ts";
import type { RuleCatalog } from "./RuleCatalog.types.ts";

/**
 * Validates catalog data before consumers use it. Use it, for example, to
 * reject malformed catalogs or duplicate rule identities before coverage runs.
 */
export function validateRuleCatalog(value: unknown): RuleCatalog {
  const schema = JSON.parse(
    readFileSync(getCatalogUrlFromFilename("rules.schema.json"), "utf8"),
  );
  const validate = new Ajv({ allErrors: true }).compile<RuleCatalog>(schema);
  if (!validate(value)) {
    throw new Error(`Invalid rule catalog: ${JSON.stringify(validate.errors)}`);
  }
  (["id", "slug"] as const).forEach((key) => {
    const values = value.rules.map((rule) => {
      return rule[key];
    });
    if (new Set(values).size !== values.length) {
      throw new Error(`Catalog ${key} values must be unique`);
    }
  });
  value.rules.forEach((rule) => {
    if (!rule.id.startsWith(`${rule.class}-`)) {
      throw new Error(`Catalog class disagrees with ${rule.id}`);
    }
    if (
      !rule.applicability.every((language) => {
        return value.languages.includes(language);
      })
    ) {
      throw new Error(`Undeclared language in ${rule.id}`);
    }
  });
  return value;
}
