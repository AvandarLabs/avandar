/** A browsing group in the Helpers section, for example "Curves and durations". */
export type HelperCategory = {
  id: string;
  title: string;
  description: string;
};

/** An exported name in a listed module that is deliberately not catalogued. */
export type HelperExclusion = {
  name: string;
  reason: string;
};

/**
 * A source module whose runtime exports must all be catalogued or excluded.
 * `exhaustiveMembers` names exported objects (such as `EASE`) whose every
 * member must be catalogued on its own.
 */
export type HelperModule = {
  path: string;
  exhaustiveMembers: readonly string[];
  excluded: readonly HelperExclusion[];
};

/** A named default the helper applies when the caller omits an argument. */
export type HelperDefault = {
  name: string;
  value: string;
};

/** The live preview that plays a helper in isolation. */
export type HelperDemo = {
  id: string;
  frames: number;
  /** Public-relative media the preview loads, served to the live player. */
  assets?: readonly string[];
};

/** One shared motion helper as the Helpers section browses and previews it. */
export type HelperEntry = {
  id: string;
  title: string;
  category: string;
  description: string;
  /** App-relative source module, for example `src/motion.ts`. */
  source: string;
  /** Exported names, dotted for members such as `EASE.out`. */
  exports: readonly string[];
  signature: string;
  defaults: readonly HelperDefault[];
  usage: string;
  goodFor: string;
  avoid: string;
  /** App-relative files that call the helper. */
  usedBy: readonly string[];
  demo: HelperDemo;
};

/** The validated helper catalog. */
export type HelperCatalog = {
  categories: readonly HelperCategory[];
  modules: readonly HelperModule[];
  helpers: readonly HelperEntry[];
};
