import { readFileSync } from "node:fs";
/* oxlint-disable import/extensions -- Node needs source extensions. */
import { Ajv } from "ajv";
import { getCatalogUrlFromFilename } from "./getCatalogUrlFromFilename.ts";
import type { RuleCatalog } from "./RuleCatalog.types.ts";

/**
 * Languages each language-specific ID namespace must apply to. The `common`
 * namespace holds language-agnostic rules and has no language requirement.
 */
const NAMESPACE_LANGUAGES: Readonly<Record<string, readonly string[]>> = {
  ts: ["typescript", "javascript"],
  css: ["css"],
  sql: ["sql"],
  py: ["python"],
  rs: ["rust"],
};

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
    const namespace = rule.id.split("-")[1]!;
    const namespaceLanguages = NAMESPACE_LANGUAGES[namespace];
    if (
      namespaceLanguages &&
      !rule.applicability.some((language) => {
        return namespaceLanguages.includes(language);
      })
    ) {
      throw new Error(`Catalog namespace disagrees with ${rule.id}`);
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
