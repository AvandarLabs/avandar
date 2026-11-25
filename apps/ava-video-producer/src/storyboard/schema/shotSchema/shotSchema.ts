import { z } from "zod";
import { continuitySchema } from "../../../continuity/continuitySchema/continuitySchema";
import {
  stockRequestEnvelopeSchema,
  stockRequestSchema,
} from "../../../stock/contracts/stockRequestSchema/stockRequestSchema";
import {
  assetPathSchema,
  detail,
  frame,
  id,
  label,
  positiveFrames,
  text,
  unit,
} from "../primitives";
import { shotTransitionSchema } from "../shotTransitionSchema";
import { shotThemeSchema } from "../themeSchema";
import { brandLockupSchema } from "./brandLockupSchema";

/** Elements fading out in place one after another before a cut. */
const stagedExitSchema = z.strictObject({
  atFrame: frame,
  staggerFrames: z.number().int().min(0).max(12).optional(),
  durationInFrames: positiveFrames.max(30).optional(),
});
const heading = {
  title: text.max(100).optional(),
  kicker: text.max(160).optional(),
};
/** A heading whose title and kicker can wipe in instead of rising. Only
 *  scenes that draw their heading through `SceneShell` take it. */
const headingWithReveal = {
  ...heading,
  headingReveal: z
    .strictObject({
      mode: z.enum(["rise", "wipe"]),
      atFrame: frame.optional(),
      staggerFrames: z.number().int().min(0).max(30).optional(),
    })
    .optional(),
};
const edgeSchema = z.strictObject({
  id,
  from: id,
  to: id,
  label: label.optional(),
  offset: z.number().min(-1).max(1).optional(),
  arrow: z.boolean().optional(),
  packets: z
    .array(
      z.strictObject({
        atFrame: frame,
        durationInFrames: positiveFrames.max(120),
        direction: z.enum(["forward", "reverse"]).optional(),
      }),
    )
    .max(12)
    .optional(),
});
const graph = z.strictObject({
  ...headingWithReveal,
  nodes: z
    .array(
      z.strictObject({
        id,
        label,
        detail: detail.optional(),
        x: unit,
        y: unit,
        width: z.number().min(0.1).max(0.6).optional(),
        items: z.array(label).max(8).optional(),
        frame: z.enum(["card", "ticks"]).optional(),
      }),
    )
    .min(1)
    .max(12),
  edges: z.array(edgeSchema).max(40),
  traversal: z.array(z.strictObject({ nodeId: id, atFrame: frame })).optional(),
  revealAtFrame: frame.optional(),
});
const flowchart = z.strictObject({
  ...heading,
  steps: z
    .array(z.strictObject({ id, label, detail: detail.optional() }))
    .min(1)
    .max(6),
  connectors: z
    .array(z.strictObject({ from: id, to: id, label: label.optional() }))
    .max(12),
  activeStep: id.optional(),
  stepAtFrames: z.array(frame).optional(),
  revealAtFrame: frame.optional(),
});
const metric = z.strictObject({
  ...headingWithReveal,
  label,
  value: z.number().finite(),
  from: z.number().finite().optional(),
  unit: z.string().max(24).optional(),
  precision: z.number().int().min(0).max(6).optional(),
  detail: detail.optional(),
  countAtFrame: frame.optional(),
  countDurationInFrames: positiveFrames.optional(),
});
const typography = z.strictObject({
  ...headingWithReveal,
  lines: z.array(text.max(120)).min(1).max(6),
  emphasis: z.array(text.max(60)).max(12).optional(),
  align: z.enum(["left", "center"]).optional(),
  fontSize: z.number().min(40).max(160).optional(),
  revealAtFrame: frame.optional(),
  wordStaggerFrames: z.number().int().min(2).max(12).optional(),
  revealMode: z.enum(["word-mask", "line-fade", "wipe", "cut"]).optional(),
  lineStaggerFrames: z.number().int().min(1).max(12).optional(),
  icon: z
    .strictObject({
      src: assetPathSchema,
      size: z.number().min(40).max(480).optional(),
      atFrame: frame.optional(),
    })
    .optional(),
  exit: stagedExitSchema.optional(),
  size: z.enum(["display", "caption"]).optional(),
});
const region = {
  x: unit,
  y: unit,
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
};
const media = z.strictObject({
  ...heading,
  kind: z.enum(["image", "video"]),
  src: assetPathSchema,
  trimBefore: frame.optional(),
  fit: z.enum(["contain", "cover"]).optional(),
  objectPosition: z.strictObject({ x: unit, y: unit }).optional(),
  crop: z.strictObject(region).optional(),
  callouts: z
    .array(
      z.strictObject({
        id,
        label,
        ...region,
        startFrame: frame,
        endFrame: positiveFrames,
      }),
    )
    .max(8)
    .optional(),
});
const barComparison = z.strictObject({
  ...headingWithReveal,
  panels: z
    .array(
      z.strictObject({
        value: z.number().finite(),
        precision: z.number().int().min(0).max(6).optional(),
        unit: z.string().max(12).optional(),
        caption: detail.optional(),
        rows: z
          .array(
            z.strictObject({
              label,
              value: z.number().finite().nonnegative(),
              display: z.string().max(24).optional(),
              highlight: z.boolean().optional(),
            }),
          )
          .min(1)
          .max(8),
      }),
    )
    .min(1)
    .max(2),
  revealAtFrame: frame.optional(),
  panelStaggerFrames: z.number().int().min(0).max(30).optional(),
  barEdge: z.enum(["straight", "rough"]).optional(),
  footnote: detail.optional(),
  exit: z
    .strictObject({
      kind: z.literal("erase"),
      atFrame: frame,
      staggerFrames: z.number().min(0).max(4).optional(),
      durationInFrames: positiveFrames.max(30).optional(),
    })
    .optional(),
});
const windowSource = {
  kind: z.enum(["image", "video"]),
  src: assetPathSchema,
  trimBefore: frame.optional(),
  fit: z.enum(["contain", "cover"]).optional(),
  objectPosition: z.strictObject({ x: unit, y: unit }).optional(),
  scrollSteps: z
    .array(z.strictObject({ atFrame: frame, offset: unit }))
    .max(12)
    .optional(),
};
const raceColumn = z.strictObject({
  label,
  window: z.strictObject(windowSource),
  counter: z.strictObject({
    from: z.number().finite().optional(),
    to: z.number().finite(),
    precision: z.number().int().min(0).max(3).optional(),
    unit: z.string().max(6).optional(),
    startFrame: frame,
    endFrame: positiveFrames,
  }),
  stat: label.optional(),
});
const tiltedWindow = z.strictObject({
  headlines: z
    .array(
      z.strictObject({
        atFrame: frame,
        lines: z.array(text.max(40)).min(1).max(3),
        subtitle: text.max(60).optional(),
      }),
    )
    .max(6)
    .optional(),
  layout: z.enum(["single", "pair"]).optional(),
  windows: z
    .array(
      z.strictObject({
        ...windowSource,
        atFrame: frame.optional(),
        swap: z.enum(["slide", "cut"]).optional(),
      }),
    )
    .min(1)
    .max(12)
    .optional(),
  pair: z.tuple([raceColumn, raceColumn]).optional(),
  badge: label.optional(),
  enter: z
    .discriminatedUnion("kind", [
      z.strictObject({
        kind: z.literal("whip"),
        atFrame: frame.optional(),
        durationInFrames: positiveFrames.max(60).optional(),
        reveal: z
          .strictObject({
            columns: z.number().int().min(2).max(12).optional(),
            durationInFrames: positiveFrames.max(30),
          })
          .optional(),
      }),
      z.strictObject({
        kind: z.literal("from-sides"),
        atFrame: frame.optional(),
        durationInFrames: positiveFrames.max(60).optional(),
      }),
      z.strictObject({
        kind: z.enum(["flip-split", "none"]),
        atFrame: frame.optional(),
      }),
      z.strictObject({
        kind: z.literal("pull-back"),
        atFrame: frame,
        durationInFrames: positiveFrames.max(60).optional(),
        ease: z.enum(["word", "inOut"]).optional(),
      }),
    ])
    .optional(),
  windowBox: z.enum(["default", "tall"]).optional(),
  exit: z
    .strictObject({
      kind: z.literal("whip-left"),
      atFrame: frame,
      durationInFrames: positiveFrames.max(30).optional(),
    })
    .optional(),
  camera: z
    .array(
      z.strictObject({
        at: frame,
        x: unit,
        y: unit,
        zoom: z.number().min(1).max(3),
        ease: z.enum(["glide", "push", "whip"]).optional(),
      }),
    )
    .min(2)
    .max(16)
    .optional(),
  secondary: z
    .strictObject({
      ...windowSource,
      box: z.strictObject(region),
      atFrame: frame,
    })
    .optional(),
  chrome: z.enum(["titlebar", "none"]).optional(),
  footnote: detail.optional(),
});
const shotBase = {
  id,
  durationInFrames: positiveFrames.max(2700),
  transitionInFrames: frame.max(60).default(18),
  transition: shotTransitionSchema.optional(),
  theme: shotThemeSchema.optional(),
  note: text.optional(),
};

/** The scene discriminator is also the renderer's exhaustive registry. */
export const shotSchema = z.discriminatedUnion("scene", [
  z.strictObject({
    ...shotBase,
    scene: z.literal("continuity"),
    // A continuity shot can contain twelve independently timed beats.
    durationInFrames: positiveFrames.max(12 * 1800),
    props: continuitySchema,
  }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("avandar"),
    props: z.strictObject({
      feature: z.enum(["import", "explorer", "dashboards", "cases", "map"]),
      fromFrame: frame.max(799).default(0),
      mode: z.enum(["full", "filter", "query", "chart"]).default("full"),
    }),
  }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("title"),
    props: z.strictObject({ name: text.max(48), kicker: text.max(100) }),
  }),
  z.strictObject({ ...shotBase, scene: z.literal("graph"), props: graph }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("flowchart"),
    props: flowchart,
  }),
  z.strictObject({ ...shotBase, scene: z.literal("metric"), props: metric }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("typography"),
    props: typography,
  }),
  z.strictObject({ ...shotBase, scene: z.literal("media"), props: media }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("tilted-window"),
    props: tiltedWindow,
  }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("brand-lockup"),
    props: brandLockupSchema,
  }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("bar-comparison"),
    props: barComparison,
  }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("stock"),
    props: stockRequestEnvelopeSchema
      .extend(heading)
      .transform((props, context) => {
        const { title, kicker, ...request } = props;
        const result = stockRequestSchema.safeParse(request);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            return context.addIssue({ ...issue });
          });
          return z.NEVER;
        }
        return {
          ...result.data,
          ...(title === undefined ? {} : { title }),
          ...(kicker === undefined ? {} : { kicker }),
        };
      }),
  }),
]);
