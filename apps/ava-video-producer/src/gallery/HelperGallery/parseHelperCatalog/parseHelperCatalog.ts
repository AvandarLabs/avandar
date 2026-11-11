import { z } from "zod";
import type { HelperCatalog } from "../helperCatalog.types";

const TEXT = z.string().min(1);

const CATEGORY_SCHEMA = z
  .object({ id: TEXT, title: TEXT, description: TEXT })
  .strict();

const MODULE_SCHEMA = z
  .object({
    path: TEXT,
    exhaustiveMembers: z.array(TEXT).default([]),
    excluded: z.array(z.object({ name: TEXT, reason: TEXT }).strict()),
  })
  .strict();

const HELPER_SCHEMA = z
  .object({
    id: TEXT,
    title: TEXT,
    category: TEXT,
    description: TEXT,
    source: TEXT,
    exports: z.array(TEXT).min(1),
    signature: TEXT,
    defaults: z.array(z.object({ name: TEXT, value: TEXT }).strict()),
    usage: TEXT,
    goodFor: TEXT,
    avoid: TEXT,
    usedBy: z.array(TEXT),
    demo: z
      .object({
        id: TEXT,
        frames: z.number().int().positive(),
        assets: z.array(TEXT).optional(),
      })
      .strict(),
  })
  .strict();

const CATALOG_SCHEMA = z
  .object({
    categories: z.array(CATEGORY_SCHEMA).min(1),
    modules: z.array(MODULE_SCHEMA).min(1),
    helpers: z.array(HELPER_SCHEMA).min(1),
  })
  .strict();

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
  const categories = new Set(catalog.categories.map((item) => item.id));
  const modules = new Set(catalog.modules.map((item) => item.path));
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
  });
  catalog.categories.forEach((category) => {
    if (!catalog.helpers.some((helper) => helper.category === category.id)) {
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
  _assertUniqueIds(catalog.helpers.map((helper) => helper.id));
  _assertReferences(catalog);
  return catalog;
}
