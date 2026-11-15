import { BODY_Y } from "../../chrome/chrome";

/** Total length, in frames, of the Demo clip's body (excluding the title card). */
export const DEMO_LEN = 414;

/* ------------------------------------------------------------ beat sheet -- */

export const APP_IN = 0;
export const FIELD_CLICK = 20;
export const TYPE_AT = 26;
export const RUN_CLICK = 88;
export const ROWS_AT = 96;
export const COUNT_AT = 100;
export const CHIP_CLICK = 184;
export const REFILTER_AT = 190;
export const PUBLISH_CLICK = 274;
export const TOAST_AT = 282;
export const OUT_AT = 380;

export const PROMPT = "Revenue by channel, last quarter";

export const CLICKS = [FIELD_CLICK, RUN_CLICK, CHIP_CLICK, PUBLISH_CLICK];

/* The pointer path. Keys are absolute frames; trackPos eases between them,
 * so the cursor is always already at a target before the click beat lands
 * on it. Give it ~16 frames to travel any real distance.
 *
 * Every one of these has to be the CENTRE of the thing being pressed, and
 * the only way to know is to render the click frame and look. Nothing in the
 * pipeline can catch a miss: the press animation fires, the state changes,
 * the gate sees a clean frame, and the cursor is just sitting somewhere else
 * while it all happens. This target was 84px above the chip row, on the
 * counter, for exactly that reason. Absolute layout is what makes the
 * choreography possible; it is also what lets a coordinate quietly rot.
 *
 * PAIR EVERY TARGET WITH A HOLD. trackPos eases from one key straight into
 * the next, so a lone key means the pointer starts leaving the instant it
 * arrives, and the click beat, twenty frames later, fires somewhere along
 * the way out. On the chip that was a 21px drift onto the bottom edge: the
 * cursor visibly missing the thing it had just pressed. A real pointer
 * stops, presses, and only then goes. The second key at CLICK + HOLD is what
 * makes it stop. Publish never showed the defect only because it happens to
 * be followed by a key at the same coordinates: the drift scales with the
 * distance to the next target, so the worst miss is always the beat before
 * the longest move. */
const HOLD = 8; // press() runs DUR.press * 2 = 8 frames; outlast it

/* Targets measured off a rendered frame, not estimated from the CSS. */
export const POINTER = [
  { at: 0, x: 860, y: 700 },
  { at: FIELD_CLICK - 14, x: 420, y: 194 },
  { at: TYPE_AT + Math.ceil((PROMPT.length * 30) / 28) + 4, x: 420, y: 194 },
  { at: RUN_CLICK - 16, x: 1484, y: 194 },
  { at: RUN_CLICK + HOLD, x: 1484, y: 194 },
  { at: CHIP_CLICK - 20, x: 1285, y: 465 },
  { at: CHIP_CLICK + HOLD, x: 1285, y: 465 },
  { at: PUBLISH_CLICK - 22, x: 1305, y: 917 },
  { at: DEMO_LEN, x: 1305, y: 917 },
];

/* ------------------------------------------------------------- geometry -- */

export const W = 1600;
export const FIELD = { x: 48, y: BODY_Y + 50, w: 1504, h: 72 };
export const RESULTS = { x: 48, y: 262, w: 980, h: 596 };
export const SIDE = { x: 1060, y: 262, w: 492, h: 596 };
export const PUBLISH = { x: 1060, y: 884, w: 492, h: 68 };

/* Bars are proportional to the figures beside them: 0.92 is the widest, and
 * every other bar is n/1204 of it. A chart whose bars disagree with its own
 * numbers is the kind of thing a viewer cannot name but does register. */
export const ROWS = [
  { label: "Organic search", bar: 0.92, n: 1204, paid: false },
  { label: "Paid social", bar: 0.6, n: 786, paid: true },
  { label: "Paid search", bar: 0.39, n: 512, paid: true },
  { label: "Email", bar: 0.3, n: 389, paid: false },
  { label: "Referral", bar: 0.13, n: 171, paid: false },
];

export const TOTAL_ALL = 3062; // the five rows above
export const TOTAL_PAID = 1298; // the two marked paid

export const CHIPS = ["All channels", "Paid only", "Organic"];
export const LIT_CHIP = 1;
