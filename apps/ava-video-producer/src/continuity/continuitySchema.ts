import { z } from "zod";
import { getOverlayTimings } from "../motion-components/AnchoredOverlay";
import { retimeCameraTrack } from "../motion-components/cameraTrack";
import {
  getMotionDuration,
  motionOptionsSchema,
} from "../motion-components/motionSettings";
import { stockRequestSchema } from "../stock/contracts/stockRequestSchema/stockRequestSchema";
import { cameraTrackSchema } from "./camera/continuityCamera";
import { objectFlightSchema } from "./camera/objectFlight";
import { getContinuityTimeline } from "./continuityTimeline";

const frame = z.number().int().nonnegative();
const copy = z.string().trim().min(1).max(120);
/** Native product fixture segments available to continuity compositions. */
export const productSegmentSchema = z
  .object({
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
  .strict()
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
    if (segment.toFrame >= horizon)
      context.addIssue({
        code: "custom",
        message: "Segment exceeds the authored product horizon",
      });
    if (segment.toFrame <= segment.fromFrame)
      context.addIssue({
        code: "custom",
        message: "Product segment must move forward",
      });
    if (segment.mode !== "full" && segment.feature !== "explorer")
      context.addIssue({
        code: "custom",
        message: "Only Explorer has partial modes",
      });
  });
/** Geometry in the validated 1600 by 840 stage, measured or authored explicitly. */
export const anchorSchema = z
  .object({
    x: z.number().min(0).max(1600),
    y: z.number().min(0).max(840),
    width: z.number().positive().max(1600),
    height: z.number().positive().max(840),
  })
  .strict()
  .refine(
    (box) => box.x + box.width <= 1600 && box.y + box.height <= 840,
    "Anchor must fit the stage",
  );
/** Frame-authored notation attached to a measured native product rectangle. */
export const productAnnotationSchema = z
  .object({
    at: frame,
    until: frame,
    kind: z.enum(["box", "circle", "underline", "highlight", "bracket"]),
    target: anchorSchema,
    seed: z.number().int().nonnegative().default(7),
  })
  .strict()
  .refine((cue) => cue.until > cue.at + 36, "Notation needs a reading hold");
const annotations = z.array(productAnnotationSchema).max(12).optional();
const overlay = z
  .object({
    at: frame,
    until: frame,
    target: anchorSchema,
    motion: motionOptionsSchema.optional(),
    entryFrames: frame.min(1).max(300).optional(),
    exitFrames: frame.min(1).max(300).optional(),
    fadeFrames: frame.min(1).max(300).optional(),
  })
  .strict()
  .refine((cue) => {
    try {
      getOverlayTimings(cue);
      return true;
    } catch {
      return false;
    }
  }, "Overlay needs travel and a reading hold");
const transition = z
  .object({
    kind: z.enum([
      "cut",
      "dissolve",
      "wipe",
      "aperture",
      "spatial",
      "handoff",
      "morph",
    ]),
    frames: frame.max(300),
    motion: motionOptionsSchema.optional(),
    origin: z
      .object({ x: z.number().min(0).max(1600), y: z.number().min(0).max(840) })
      .strict()
      .optional(),
  })
  .strict();
const stock = z
  .object({
    kind: z.literal("stock"),
    request: stockRequestSchema,
    settleFrame: frame.min(120).max(165).default(150),
    camera: cameraTrackSchema.optional(),
    cameraOptions: motionOptionsSchema.optional(),
    flight: objectFlightSchema.optional(),
  })
  .strict();
const product = z
  .object({
    kind: z.literal("product"),
    segment: productSegmentSchema,
    annotations,
  })
  .strict();
const composite = z
  .object({
    kind: z.literal("composite"),
    segment: productSegmentSchema,
    diagrams: z
      .array(
        z
          .object({
            at: frame,
            request: stockRequestSchema,
            label: copy,
            overlay,
            detail: z
              .object({
                x: z.number().min(0),
                y: z.number().min(0),
                width: z.number().min(180),
                height: z.number().min(120),
              })
              .strict()
              .refine(
                (rect) =>
                  rect.x + rect.width <= 960 && rect.y + rect.height <= 600,
                "Diagram detail must fit the stock stage",
              )
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(4),
    annotations,
    cropX: z.number().min(0).max(600).default(240),
    signalAt: frame,
    source: anchorSchema,
    effect: z.enum(["signal", "bracket", "focus"]),
  })
  .strict();
const thesis = z
  .object({
    kind: z.literal("thesis"),
    lines: z.array(copy).min(2).max(4),
    emphasis: copy,
  })
  .strict();
/** A complete beat, including its continuity object and narrative heading. */
export const continuityBeatSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    duration: frame.min(60).max(1800),
    title: copy,
    subtitle: copy,
    transition,
    content: z.discriminatedUnion("kind", [stock, product, composite, thesis]),
    token: z
      .object({
        label: z.string().min(1).max(44),
        anchor: anchorSchema,
        appearance: z.enum(["label", "outline"]).default("label"),
      })
      .strict()
      .optional(),
  })
  .strict();
/** Strict film-use grammar shared by long explainers and isolated atlas studies. */
export const continuitySchema = z
  .object({
    title: copy,
    category: z.enum([
      "motion-motion",
      "motion-product",
      "product-motion",
      "composite",
    ]),
    evidence: copy,
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#0b1219"),
    cameraMotion: z.boolean().default(true),
    motionBlur: z.boolean().default(true),
    annotations: z.boolean().default(true),
    annotationRoughness: z.number().min(0).max(3).default(1.5),
    boxRoughness: z.number().min(0).max(3).default(0),
    beats: z.array(continuityBeatSchema).min(2).max(12),
  })
  .strict()
  .superRefine((plan, context) => {
    const issue = (message: string) =>
      context.addIssue({ code: "custom", message });
    if (new Set(plan.beats.map((beat) => beat.id)).size !== plan.beats.length)
      issue("Beat IDs must be unique");
    if (plan.beats[0].transition.frames !== 0)
      issue("The first beat has no incoming overlap");
    try {
      getContinuityTimeline(plan.beats);
    } catch {
      issue("Transition overlap consumes a beat");
    }
    plan.beats.forEach((beat, index) => {
      try {
        if (
          beat.content.kind === "stock" &&
          beat.content.camera &&
          retimeCameraTrack(
            beat.content.camera,
            beat.content.cameraOptions,
          ).some((key) => key.at >= beat.duration)
        )
          issue("Camera cues must stay within their beat");
        if (
          beat.content.kind === "stock" &&
          beat.content.flight &&
          beat.content.flight.at +
            getMotionDuration(
              beat.content.flight.duration,
              beat.content.flight.motion,
            ) >=
            beat.duration
        )
          issue("Object flight must finish within its beat");
      } catch {
        issue("Camera and object motion require valid travel timing");
      }
      if (beat.transition.kind === "aperture" && !beat.transition.origin)
        issue("Apertures require an authored stage origin");
      if (
        beat.content.kind === "product" ||
        beat.content.kind === "composite"
      ) {
        if (beat.content.annotations?.some((cue) => cue.until >= beat.duration))
          issue("Product notation must finish within its beat");
        const segment = beat.content.segment;
        if (
          segment.leadIn + segment.toFrame - segment.fromFrame >=
          beat.duration
        )
          issue("Product beat must reach its declared final state");
      }
      if (beat.transition.kind === "cut" && beat.transition.frames !== 0)
        issue("Cuts cannot overlap");
      if (beat.transition.kind !== "cut" && beat.transition.frames === 0)
        issue("Animated transitions need a duration");
      if (
        ["handoff", "morph"].includes(beat.transition.kind) &&
        index > 0 &&
        (!beat.token ||
          !plan.beats[index - 1].token ||
          beat.token.label !== plan.beats[index - 1].token?.label)
      )
        issue("Handoffs require the same identified object on both sides");
      if (beat.content.kind === "composite") {
        const { diagrams, signalAt } = beat.content;
        if (diagrams.some((diagram) => diagram.overlay.until >= beat.duration))
          issue("Floating explanations must finish within their beat");
        if (
          diagrams[0].at !== 0 ||
          diagrams.some(
            (diagram, position) =>
              diagram.at >= beat.duration ||
              (position > 0 && diagram.at <= diagrams[position - 1].at),
          )
        )
          issue("Diagram cues must start at zero and increase within the beat");
        if (signalAt + 45 >= beat.duration)
          issue("Causal signal needs a result hold");
      }
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
