import { z } from "zod";
import type { HelperCatalog } from "../helperCatalog.types";

const TEXT = z.string().min(1);

const CATEGORY_SCHEMA = z.strictObject({
  id: TEXT,
  title: TEXT,
  description: TEXT,
});

const MODULE_SCHEMA = z.strictObject({
  path: TEXT,
  exhaustiveMembers: z.array(TEXT).default([]),
  memberModules: z.array(TEXT).default([]),
  excluded: z.array(z.strictObject({ name: TEXT, reason: TEXT })),
});

const HELPER_SCHEMA = z.strictObject({
  id: TEXT,
  title: TEXT,
  category: TEXT,
  description: TEXT,
  source: TEXT,
  relatedSources: z.array(TEXT).default([]),
  exports: z.array(TEXT).min(1),
  signature: TEXT,
  defaults: z.array(z.strictObject({ name: TEXT, value: TEXT })),
  usage: TEXT,
  goodFor: TEXT,
  avoid: TEXT,
  usedBy: z.array(TEXT),
  demo: z.strictObject({
    id: TEXT,
    frames: z.number().int().positive(),
    assets: z.array(TEXT).optional(),
  }),
});

const CATALOG_SCHEMA = z.strictObject({
  categories: z.array(CATEGORY_SCHEMA).min(1),
  modules: z.array(MODULE_SCHEMA).min(1),
  helpers: z.array(HELPER_SCHEMA).min(1),
});

function _assertUniqueIds(ids: readonly string[]): void {
  const seen = new Set<string>();
  ids.forEach((id) => {
    if (seen.has(id)) {
      throw new Error(`Duplicate helper id: ${id}`);
    }
    seen.add(id);
  });
}

function _assertReferences(catalog: HelperCatalog): void {
  const categories = new Set(
    catalog.categories.map((item) => {
      return item.id;
    }),
  );
  const modules = new Set(
    catalog.modules.map((item) => {
      return item.path;
    }),
  );
  catalog.helpers.forEach((helper) => {
    if (!categories.has(helper.category)) {
      throw new Error(
        `Unknown category "${helper.category}" for "${helper.id}"`,
      );
    }
    if (!modules.has(helper.source)) {
      throw new Error(
        `Unlisted source module "${helper.source}" for "${helper.id}"`,
      );
    }
    helper.relatedSources.forEach((relatedSource) => {
      if (!modules.has(relatedSource)) {
        throw new Error(
          `Unlisted related source module "${relatedSource}" for "${helper.id}"`,
        );
      }
    });
  });
  catalog.categories.forEach((category) => {
    if (
      !catalog.helpers.some((helper) => {
        return helper.category === category.id;
      })
    ) {
      throw new Error(`Category "${category.id}" has no helpers`);
    }
  });
}

/**
 * Validates the authored helper catalog: strict fields, unique ids, declared
 * categories, and source modules that the drift test checks.
 */
export function parseHelperCatalog(raw: unknown): HelperCatalog {
  const catalog = CATALOG_SCHEMA.parse(raw);
  _assertUniqueIds(
    catalog.helpers.map((helper) => {
      return helper.id;
    }),
  );
  _assertReferences(catalog);
  return catalog;
}
