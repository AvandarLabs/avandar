import { type StageTextField } from "../../scenes/StageTheme/StageTheme";

const WORD_IN = 6;
const KICKER_IN = 22;
const RULE_IN = 26;
/** How far the kicker rises as it arrives, in pixels. */
const KICKER_RISE = 10;
/** The title words take their face and colour from the card. */
const WORD_FIELDS: readonly StageTextField[] = [
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "color",
];
/**
 * Coordinates title-word, kicker, and rule entrances with shared text fields.
 */
export const TitleCardShared = {
  /** Frame when the first title word starts its staggered entrance. */
  WORD_IN,
  /** The title words take their face and colour from the card. */
  WORD_FIELDS,
  /** Frame when the title card's horizontal rule starts to extend. */
  RULE_IN,
  /** Frame when the title card's kicker starts to fade and rise. */
  KICKER_IN,
  /** How far the kicker rises as it arrives, in pixels. */
  KICKER_RISE,
} as const;
