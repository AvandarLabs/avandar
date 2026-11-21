import { prop } from "@avandar/utils";
import { z } from "zod";
import { cameraTrackSchema } from "../../motion-components/CameraTrack/CameraTrack";
import { getOverlayTimings } from "../../motion-components/getOverlayTimings";
import { SCENE_TRANSITION_KINDS } from "../../motion-components/getSceneTransitionStyle";
import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { stockRequestSchema } from "../../stock/contracts/stockRequestSchema/stockRequestSchema";
import { objectFlightSchema } from "../camera/objectFlight/objectFlight";
import { ContinuityTimeline } from "../ContinuityTimeline/ContinuityTimeline";
import { validateBeatCamera } from "./validateBeatCamera";
import { validateBeatDiagrams } from "./validateBeatDiagrams";
import { validateBeatProduct } from "./validateBeatProduct";
import { validateBeatTransition } from "./validateBeatTransition";

const frame = z.number().int().nonnegative();
const copy = z.string().trim().min(1).max(120);
/** Native product fixture segments available to continuity compositions. */
export const productSegmentSchema = z
  .strictObject({
    feature: z.enum([
      "import",
      "explorer",
      "dashboards",
      "cases",
      "map",
      "ontology",
      "attribute-mapping",
    ]),
    mode: z.enum(["full", "filter", "query", "chart"]).default("full"),
    fromFrame: frame.default(0),
    toFrame: frame.max(799),
    leadIn: frame.default(30),
  })
  .superRefine((segment, context) => {
    const horizons = {
      import: 660,
      explorer: 800,
      dashboards: 720,
      cases: 660,
      map: 720,
      ontology: 600,
      "attribute-mapping": 660,
    };
    const horizon =
      segment.feature === "explorer" && segment.mode !== "full"
        ? { filter: 300, query: 330, chart: 230 }[segment.mode]
        : horizons[segment.feature];
    if (segment.toFrame >= horizon) {
      context.addIssue({
        code: "custom",
        message: "Segment exceeds the authored product horizon",
      });
    }
    if (segment.toFrame <= segment.fromFrame) {
      context.addIssue({
        code: "custom",
        message: "Product segment must move forward",
      });
    }
    if (segment.mode !== "full" && segment.feature !== "explorer") {
      context.addIssue({
        code: "custom",
        message: "Only Explorer has partial modes",
      });
    }
  });
/**
 * Geometry in the validated 1600 by 840 stage, measured or authored explicitly.
 */
export const anchorSchema = z
  .strictObject({
    x: z.number().min(0).max(1600),
    y: z.number().min(0).max(840),
    width: z.number().positive().max(1600),
    height: z.number().positive().max(840),
  })
  .refine((box) => {
    return box.x + box.width <= 1600 && box.y + box.height <= 840;
  }, "Anchor must fit the stage");
/** Frame-authored notation attached to a measured native product rectangle. */
export const productAnnotationSchema = z
  .strictObject({
    at: frame,
    until: frame,
    kind: z.enum(["box", "circle", "underline", "highlight", "bracket"]),
    target: anchorSchema,
    seed: z.number().int().nonnegative().default(7),
  })
  .refine((cue) => {
    return cue.until > cue.at + 36;
  }, "Notation needs a reading hold");
const annotations = z.array(productAnnotationSchema).max(12).optional();
const overlay = z
  .strictObject({
    at: frame,
    until: frame,
    target: anchorSchema,
    motion: MotionSettings.motionOptionsSchema.optional(),
    entryFrames: frame.min(1).max(300).optional(),
    exitFrames: frame.min(1).max(300).optional(),
    fadeFrames: frame.min(1).max(300).optional(),
  })
  .refine((cue) => {
    try {
      getOverlayTimings({ cue });
      return true;
    } catch {
      return false;
    }
  }, "Overlay needs travel and a reading hold");
const transition = z.strictObject({
  kind: z.enum(SCENE_TRANSITION_KINDS),
  frames: frame.max(300),
  motion: MotionSettings.motionOptionsSchema.optional(),
  origin: z
    .strictObject({
      x: z.number().min(0).max(1600),
      y: z.number().min(0).max(840),
    })
    .optional(),
});
const stock = z.strictObject({
  kind: z.literal("stock"),
  request: stockRequestSchema,
  settleFrame: frame.min(120).max(165).default(150),
  camera: cameraTrackSchema.optional(),
  cameraOptions: MotionSettings.motionOptionsSchema.optional(),
  flight: objectFlightSchema.optional(),
});
const product = z.strictObject({
  kind: z.literal("product"),
  segment: productSegmentSchema,
  annotations,
});
const composite = z.strictObject({
  kind: z.literal("composite"),
  segment: productSegmentSchema,
  diagrams: z
    .array(
      z.strictObject({
        at: frame,
        request: stockRequestSchema,
        label: copy,
        overlay,
        detail: z
          .strictObject({
            x: z.number().min(0),
            y: z.number().min(0),
            width: z.number().min(180),
            height: z.number().min(120),
          })
          .refine((rect) => {
            return rect.x + rect.width <= 960 && rect.y + rect.height <= 600;
          }, "Diagram detail must fit the stock stage")
          .optional(),
      }),
    )
    .min(1)
    .max(4),
  annotations,
  cropX: z.number().min(0).max(600).default(240),
  signalAt: frame,
  source: anchorSchema,
  effect: z.enum(["signal", "bracket", "focus"]),
});
const thesis = z.strictObject({
  kind: z.literal("thesis"),
  lines: z.array(copy).min(2).max(4),
  emphasis: copy,
});
/** A complete beat, including its continuity object and narrative heading. */
export const continuityBeatSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  duration: frame.min(60).max(1800),
  title: copy,
  subtitle: copy,
  transition,
  content: z.discriminatedUnion("kind", [stock, product, composite, thesis]),
  token: z
    .strictObject({
      label: z.string().min(1).max(44),
      anchor: anchorSchema,
      appearance: z.enum(["label", "outline"]).default("label"),
    })
    .optional(),
});
/** Why a continuity plan cannot set its own palette or sketch. */
const THEMED_FIELD_MESSAGE =
  "Colours and sketch roughness come from the video theme. Set them in the theme's overrides for this composition (themes/<theme>.theme.json, overrides.<composition id>).";
/**
 * Strict film-use grammar shared by long explainers and isolated atlas studies.
 */
export const continuitySchema = z
  .strictObject({
    title: copy,
    category: z.enum([
      "motion-motion",
      "motion-product",
      "product-motion",
      "composite",
    ]),
    evidence: copy,
    accent: z.never({ error: THEMED_FIELD_MESSAGE }).optional(),
    background: z.never({ error: THEMED_FIELD_MESSAGE }).optional(),
    cameraMotion: z.boolean().default(true),
    motionBlur: z.boolean().default(true),
    annotations: z.boolean().default(true),
    annotationRoughness: z.never({ error: THEMED_FIELD_MESSAGE }).optional(),
    boxRoughness: z.never({ error: THEMED_FIELD_MESSAGE }).optional(),
    beats: z.array(continuityBeatSchema).min(2).max(12),
  })
  .superRefine((plan, context) => {
    const issue = (message: string) => {
      return context.addIssue({ code: "custom", message });
    };
    if (new Set(plan.beats.map(prop("id"))).size !== plan.beats.length) {
      issue("Beat IDs must be unique");
    }
    if (plan.beats[0].transition.frames !== 0) {
      issue("The first beat has no incoming overlap");
    }
    try {
      ContinuityTimeline.getContinuityTimeline(plan.beats);
    } catch {
      issue("Transition overlap consumes a beat");
    }
    plan.beats.forEach((beat, index) => {
      validateBeatCamera({ beat, issue });
      validateBeatProduct({ beat, issue });
      validateBeatTransition({
        beat,
        issue,
        previousBeat: plan.beats[index - 1],
      });
      validateBeatDiagrams({ beat, issue });
    });
  });
/** Validated composition input. */
export type ContinuityPlan = z.infer<typeof continuitySchema>;
/** One validated beat. */
export type ContinuityBeat = ContinuityPlan["beats"][number];
/** Product fixture segment. */
export type ProductSegment = z.infer<typeof productSegmentSchema>;
/** Measured or authored rectangular target. */
export type ContinuityAnchor = z.infer<typeof anchorSchema>;
/** A deterministic rough-notation cue on the native product stage. */
export type ProductAnnotation = z.infer<typeof productAnnotationSchema>;
