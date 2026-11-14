import type { TokenKind } from "../../videoTheme/videoTheme.types";

const DEFAULT_LITERALS: Partial<Record<TokenKind, unknown>> = {
  color: "#ffffff",
  length: 1,
  number: 1,
  opacity: 1,
  duration: 9,
  letterSpacing: 0,
  fontWeight: 400,
  cssLength: "16px",
  cssNumber: "1.3",
  easing: [0.45, 0, 0.55, 1],
  spring: { damping: 14, stiffness: 120, mass: 0.8 },
  shadow: {
    layers: [{ offsetX: 0, offsetY: 4, blur: 8, spread: 0, alpha: 0.2 }],
  },
  glow: { spread: 4, blur: 0, opacity: 0.1 },
  textShadow: { offsetX: 0, offsetY: 1, blur: 2, alpha: 0.5 },
  dash: [],
  fontFamily: "arial",
  boolean: false,
};

/** A valid starting value for a new literal of a kind, such as a new scale entry. */
export function getDefaultLiteralFromKind(kind: TokenKind): unknown {
  return DEFAULT_LITERALS[kind];
}
