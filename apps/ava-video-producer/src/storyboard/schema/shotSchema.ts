import { z } from "zod";
import { continuitySchema } from "../../continuity/continuitySchema";
import {
  stockRequestEnvelopeSchema,
  stockRequestSchema,
} from "../../stock/contracts/stockRequestSchema/stockRequestSchema";
import {
  assetPathSchema,
  detail,
  frame,
  id,
  label,
  positiveFrames,
  text,
  unit,
} from "./primitives";
import { shotTransitionSchema } from "./shotTransitionSchema";
import { THEME_TOKEN_NAMES, shotThemeSchema } from "./themeSchema";

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
  ...heading,
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
  traversal: z
    .array(z.object({ nodeId: id, atFrame: frame }).strict())
    .optional(),
  revealAtFrame: frame.optional(),
});
const flowchart = z
  .object({
    ...heading,
    steps: z
      .array(z.object({ id, label, detail: detail.optional() }).strict())
      .min(1)
      .max(6),
    connectors: z
      .array(z.object({ from: id, to: id, label: label.optional() }).strict())
      .max(12),
    activeStep: id.optional(),
    stepAtFrames: z.array(frame).optional(),
    revealAtFrame: frame.optional(),
  })
  .strict();
const metric = z
  .object({
    ...heading,
    label,
    value: z.number().finite(),
    from: z.number().finite().optional(),
    unit: z.string().max(24).optional(),
    precision: z.number().int().min(0).max(6).optional(),
    detail: detail.optional(),
    countAtFrame: frame.optional(),
    countDurationInFrames: positiveFrames.optional(),
  })
  .strict();
const typography = z.strictObject({
  ...heading,
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
const media = z
  .object({
    ...heading,
    kind: z.enum(["image", "video"]),
    src: assetPathSchema,
    trimBefore: frame.optional(),
    fit: z.enum(["contain", "cover"]).optional(),
    objectPosition: z.object({ x: unit, y: unit }).strict().optional(),
    crop: z.object(region).strict().optional(),
    callouts: z
      .array(
        z
          .object({
            id,
            label,
            ...region,
            startFrame: frame,
            endFrame: positiveFrames,
          })
          .strict(),
      )
      .max(8)
      .optional(),
  })
  .strict();
const barComparison = z.strictObject({
  ...heading,
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
const brandLockup = z.strictObject({
  logo: z.strictObject({
    src: assetPathSchema,
    aspectRatio: z.number().min(0.2).max(5).optional(),
    height: z.number().min(40).max(600).optional(),
  }),
  wordmark: text.max(40).optional(),
  build: z
    .strictObject({
      atFrame: frame.optional(),
      columns: z.number().int().min(2).max(16).optional(),
      staggerFrames: z.number().min(0).max(6).optional(),
      durationInFrames: positiveFrames.max(30).optional(),
    })
    .optional(),
  wordmarkAtFrame: frame.optional(),
  cta: z
    .strictObject({
      atFrame: frame,
      subtitle: text.max(80).optional(),
      url: text.max(48).optional(),
      command: text.max(64).optional(),
      badge: text.max(40).optional(),
      commandCharsPerSecond: z.number().min(10).max(60).optional(),
    })
    .optional(),
  exit: z
    .strictObject({
      kind: z.literal("fly-through"),
      atFrame: frame,
      durationInFrames: positiveFrames.max(45).optional(),
      color: z.enum(THEME_TOKEN_NAMES).optional(),
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
      }),
    ])
    .optional(),
  exit: z
    .strictObject({ kind: z.literal("whip-left"), atFrame: frame })
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
  z
    .object({
      ...shotBase,
      scene: z.literal("continuity"),
      // A continuity shot can contain twelve independently timed beats.
      durationInFrames: positiveFrames.max(12 * 1800),
      props: continuitySchema,
    })
    .strict(),
  z
    .object({
      ...shotBase,
      scene: z.literal("avandar"),
      props: z
        .object({
          feature: z.enum(["import", "explorer", "dashboards", "cases", "map"]),
          fromFrame: frame.max(799).default(0),
          mode: z.enum(["full", "filter", "query", "chart"]).default("full"),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...shotBase,
      scene: z.literal("title"),
      props: z.object({ name: text.max(48), kicker: text.max(100) }).strict(),
    })
    .strict(),
  z.object({ ...shotBase, scene: z.literal("graph"), props: graph }).strict(),
  z
    .object({ ...shotBase, scene: z.literal("flowchart"), props: flowchart })
    .strict(),
  z.object({ ...shotBase, scene: z.literal("metric"), props: metric }).strict(),
  z
    .object({ ...shotBase, scene: z.literal("typography"), props: typography })
    .strict(),
  z.object({ ...shotBase, scene: z.literal("media"), props: media }).strict(),
  z.strictObject({
    ...shotBase,
    scene: z.literal("tilted-window"),
    props: tiltedWindow,
  }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("brand-lockup"),
    props: brandLockup,
  }),
  z.strictObject({
    ...shotBase,
    scene: z.literal("bar-comparison"),
    props: barComparison,
  }),
  z
    .object({
      ...shotBase,
      scene: z.literal("stock"),
      props: stockRequestEnvelopeSchema
        .extend(heading)
        .transform((props, context) => {
          const { title, kicker, ...request } = props;
          const result = stockRequestSchema.safeParse(request);
          if (!result.success) {
            result.error.issues.forEach((issue) =>
              context.addIssue({ ...issue }),
            );
            return z.NEVER;
          }
          return {
            ...result.data,
            ...(title === undefined ? {} : { title }),
            ...(kicker === undefined ? {} : { kicker }),
          };
        }),
    })
    .strict(),
]);
