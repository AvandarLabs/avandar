import type { UnknownRecord } from "./ResolvedTokenTiers.types";

/** Recognizes raw record and color-pair values while resolving video tokens. */
export const ResolvedTokenGuards = {
  /** Whether a raw value is a non-array record. */
  isRecord: (value: unknown): value is UnknownRecord => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  },
  /** Whether a raw value supplies both light and dark colors. */
  isColorPair: (
    value: unknown,
  ): value is Readonly<{
    onDark: unknown;
    onLight: unknown;
  }> => {
    return (
      ResolvedTokenGuards.isRecord(value) &&
      "onDark" in value &&
      "onLight" in value
    );
  },
} as const;
