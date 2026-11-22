/** Catalog records used by lint engines and review coverage consumers. */
export type CatalogRule = {
  id: string;
  slug: string;
  class: "AF" | "GD" | "RP" | "JR";
  title: string;
  scope: string;
  applicability: string[];
  repair: "safe" | "guided" | "evidence" | "judgment";
  phases: number[];
  owner: "lint" | "avandar-code-review";
  boundary: string;
};

/** Canonical language scope and requirements shared across ecosystem packs. */
export type RuleCatalog = {
  version: 1;
  languages: string[];
  rules: CatalogRule[];
};
