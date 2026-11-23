import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { RuleTester } from "oxlint/plugins-dev";
import videoThemeRestrictionsPlugin from "../../../../../eslint/video-theme-restrictions.js";

RuleTester.describe = describe;
RuleTester.it = it;
const RENDERER_FILENAME = fileURLToPath(
  new URL("../../../src/scenes/ThemePolicyFixture.tsx", import.meta.url),
);
const tester = new RuleTester();

tester.run(
  "video-theme/no-restricted-syntax",
  videoThemeRestrictionsPlugin.rules["no-restricted-syntax"],
  {
    valid: [
      {
        filename: RENDERER_FILENAME,
        name: "portable namespace with explicit curve has no diagnostics",
        code: "Motion.ramp({ frame, at, dur: motion.panel, easing: motion.entrance.easing });",
      },
      {
        filename: RENDERER_FILENAME,
        name: "themed lowercase ramp uses its supplied curve",
        code: "motion.ramp({ frame, at, dur: motion.panel });",
      },
      {
        filename: RENDERER_FILENAME,
        name: "a named ramp with an explicit theme curve has no diagnostics",
        code: "ramp({ frame, at, dur: motion.panel, easing: motion.entrance.easing });",
      },
      {
        filename: RENDERER_FILENAME,
        name: "a named ramp with a shorthand curve has no diagnostics",
        code: "ramp({ frame, at, dur: motion.panel, easing });",
      },
      {
        filename: RENDERER_FILENAME,
        name: "named cue windows and scaled durations have no diagnostics",
        code: `
        ramp({ frame, at: 88, dur: 92 - 88, easing: motion.entrance.easing });
        ramp({ frame, at, dur: motion.scale(18), easing: motion.entrance.easing });
        pop({ frame, at, durationInFrames: motion.sheet });
        countTo({ frame, at, to: 100, dur: motion.sheet });
      `,
      },
    ],
    invalid: [
      {
        filename: RENDERER_FILENAME,
        name: "portable named ramp without a curve has one diagnostic",
        code: "Motion.ramp({ frame, at, dur: motion.panel });",
        errors: 1,
      },
      {
        filename: RENDERER_FILENAME,
        name: "portable positional ramp without a curve has one diagnostic",
        code: "Motion.ramp(frame, at, motion.panel);",
        errors: 1,
      },
      {
        filename: RENDERER_FILENAME,
        name: "a named ramp without a curve has one diagnostic",
        code: "ramp({ frame, at, dur: motion.panel });",
        errors: 1,
      },
      {
        filename: RENDERER_FILENAME,
        name: "literal durations in three named primitive helpers have three diagnostics",
        code: `
        ramp({ frame, at, dur: 18, easing: motion.entrance.easing });
        pop({ frame, at, durationInFrames: 18 });
        countTo({ frame, at, to: 100, dur: 18 });
      `,
        errors: 3,
      },
      {
        filename: RENDERER_FILENAME,
        name: "positional literal durations and implicit easing retain four diagnostics",
        code: `
        ramp(frame, at, 18);
        motion.pop(frame, at, 18);
        motion.count(frame, at, total, 18);
      `,
        errors: 4,
      },
    ],
  },
);
