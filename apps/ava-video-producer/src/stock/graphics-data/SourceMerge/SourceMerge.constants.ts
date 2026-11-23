/** Top of the first source card in the merge diagram. */
export const SOURCE_TOP = 148;
/** Vertical distance between source cards in the merge diagram. */
export const SOURCE_STEP = 132;
/** Width of each merge diagram source card. */
export const SOURCE_WIDTH = 226;
/** Height of each merge diagram source card. */
export const SOURCE_HEIGHT = 86;
/** Frame at which the first source edge starts drawing in. */
export const SOURCE_EDGE_CUE = 24;
/** Frames between successive source edges starting to draw. */
export const SOURCE_EDGE_STEP = 3;
/** Frames between successive source packets' loop phases. */
export const SOURCE_PACKET_STEP = 22;
/** Center of the merge junction in canvas pixels. */
export const MERGE = { x: 508, y: 323 };
/** Where every source edge meets the merge node. */
export const MERGE_INPUT = { x: 491, y: MERGE.y };
/** Endpoints of the merge junction output connector. */
export const OUTPUT = { from: { x: 525, y: 323 }, to: { x: 662, y: 323 } };
/** Dimensions and top offset of the merged destination card. */
export const DESTINATION = { y: 233, width: 234, height: 180 };
/** Path data for the merge junction arrow glyph. */
export const MERGE_GLYPH =
  "M493 314 L508 329 L523 314 M508 300 V329 M508 329 V344";
