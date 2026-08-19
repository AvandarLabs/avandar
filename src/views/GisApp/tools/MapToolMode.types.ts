import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** Discriminated union of GIS map interaction modes. */
export type MapToolMode =
  | { type: "pan" }
  | { type: "aoi" }
  | { type: "measure" }
  | { type: "buffer" }
  | { type: "annotate"; kind: AvaMapConfig.AnnotationKind }
  | { type: "goto" };
