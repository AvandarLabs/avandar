/* oxlint-disable typescript/no-namespace, import/export */
import type {
  CrosswalkMatchT,
  CrosswalkMatchTarget,
  CrosswalkPrefill,
} from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch.types.ts";

export { CrosswalkMatchModule as CrosswalkMatch } from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatchModule/CrosswalkMatchModule.ts";

/** Public namespace for matching a layout's columns onto a crosswalk's. */
export namespace CrosswalkMatch {
  /** One source column a target would be filled with. */
  export type T = CrosswalkMatchT;

  /** A column of the combined dataset, with the profile it is matched by. */
  export type Target = CrosswalkMatchTarget;

  /** A fill a layout starts with. */
  export type Prefill = CrosswalkPrefill;
}
