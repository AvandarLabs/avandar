export const SOURCE_TOP = 148;
export const SOURCE_STEP = 132;
export const SOURCE_WIDTH = 226;
export const SOURCE_HEIGHT = 86;
/** Frame at which the first source edge starts drawing in. */
export const SOURCE_EDGE_CUE = 24;
/** Frames between successive source edges starting to draw. */
export const SOURCE_EDGE_STEP = 3;
/** Frames between successive source packets' loop phases. */
export const SOURCE_PACKET_STEP = 22;
export const MERGE = { x: 508, y: 323 };
/** Where every source edge meets the merge node. */
export const MERGE_INPUT = { x: 491, y: MERGE.y };
export const OUTPUT = { from: { x: 525, y: 323 }, to: { x: 662, y: 323 } };
export const DESTINATION = { y: 233, width: 234, height: 180 };
export const MERGE_GLYPH =
  "M493 314 L508 329 L523 314 M508 300 V329 M508 329 V344";
