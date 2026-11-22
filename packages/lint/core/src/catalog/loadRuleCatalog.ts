import { readFileSync } from "node:fs";
import { Ajv } from "ajv";
import { parse } from "yaml";
import type { RuleCatalog } from "./RuleCatalog.types.ts";

function _getCatalogUrl(filename: string): URL {
  return new URL(
    import.meta.url.endsWith("/src/catalog/loadRuleCatalog.ts")
      ? `../../../${filename}`
      : `./${filename}`,
    import.meta.url,
  );
}

/**
 * Validates external catalog data before engines or review tools consume it.
 */
export function validateRuleCatalog(value: unknown): RuleCatalog {
  const schema = JSON.parse(
    readFileSync(_getCatalogUrl("rules.schema.json"), "utf8"),
  );
  const validate = new Ajv({ allErrors: true }).compile<RuleCatalog>(schema);
  if (!validate(value)) {
    throw new Error(`Invalid rule catalog: ${JSON.stringify(validate.errors)}`);
  }
  ["id", "slug"].forEach((key) => {
    const values = value.rules.map((rule) => {
      return rule[key as "id" | "slug"];
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

/**
 * Loads canonical requirements for consumers such as coverage and rule docs.
 */
export function loadRuleCatalog(path?: string | URL): RuleCatalog {
  return validateRuleCatalog(
    parse(readFileSync(path ?? _getCatalogUrl("rules.yaml"), "utf8")),
  );
}
