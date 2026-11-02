// Upper Arial regular/bold advances, rounded up to 0.001em.
const ARIAL_ADVANCES: Readonly<Record<string, number>> = {
  " ": 0.278,
  "!": 0.334,
  '"': 0.475,
  "#": 0.557,
  $: 0.557,
  "%": 0.89,
  "&": 0.723,
  "'": 0.238,
  "(": 0.334,
  ")": 0.334,
  "*": 0.39,
  "+": 0.584,
  ",": 0.278,
  "-": 0.334,
  ".": 0.278,
  "/": 0.278,
  "0": 0.557,
  "1": 0.557,
  "2": 0.557,
  "3": 0.557,
  "4": 0.557,
  "5": 0.557,
  "6": 0.557,
  "7": 0.557,
  "8": 0.557,
  "9": 0.557,
  ":": 0.334,
  ";": 0.334,
  "<": 0.584,
  "=": 0.584,
  ">": 0.584,
  "?": 0.611,
  "@": 1.016,
  A: 0.723,
  B: 0.723,
  C: 0.723,
  D: 0.723,
  E: 0.667,
  F: 0.611,
  G: 0.778,
  H: 0.723,
  I: 0.278,
  J: 0.557,
  K: 0.723,
  L: 0.611,
  M: 0.834,
  N: 0.723,
  O: 0.778,
  P: 0.667,
  Q: 0.778,
  R: 0.723,
  S: 0.667,
  T: 0.611,
  U: 0.723,
  V: 0.667,
  W: 0.944,
  X: 0.667,
  Y: 0.667,
  Z: 0.611,
  "[": 0.334,
  "\\": 0.278,
  "]": 0.334,
  "^": 0.584,
  _: 0.557,
  "`": 0.334,
  a: 0.557,
  b: 0.611,
  c: 0.557,
  d: 0.611,
  e: 0.557,
  f: 0.334,
  g: 0.611,
  h: 0.611,
  i: 0.278,
  j: 0.278,
  k: 0.557,
  l: 0.278,
  m: 0.89,
  n: 0.611,
  o: 0.611,
  p: 0.611,
  q: 0.611,
  r: 0.39,
  s: 0.557,
  t: 0.334,
  u: 0.611,
  v: 0.557,
  w: 0.778,
  x: 0.557,
  y: 0.557,
  z: 0.5,
  "{": 0.39,
  "|": 0.28,
  "}": 0.39,
  "~": 0.584,
};

/**
 * Bounds Arial regular/600-weight or Courier advances without loading fonts.
 */
export function getConservativeWidthFromText({
  text,
  fontSize,
  mono = false,
}: Readonly<{ text: string; fontSize: number; mono?: boolean }>): number {
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    throw new Error("Text measurement requires a positive finite font size.");
  }
  return Array.from(text).reduce((total, character) => {
    const isCourierGlyph =
      (character.codePointAt(0) ?? 0) < 128 || character === "→";
    const advance = mono
      ? isCourierGlyph
        ? 0.601
        : 1.1
      : (ARIAL_ADVANCES[character] ?? 1.1);
    // Pixel rounding covers advances at the supported small font sizes.
    return total + Math.ceil(fontSize * advance);
  }, 0);
}
