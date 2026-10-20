import { getCueWindowFromShot } from "./getCueWindowFromShot";
import { getContinuityTimeline } from "../../continuity/continuityTimeline";
import { z } from "zod";
import { captionBand } from "../../scenes/layout/layout";
import { assetPathSchema, frame, id, positiveFrames, text } from "./primitives";
import { shotSchema } from "./shotSchema";

const cueSchema = z
  .object({
    id,
    shotId: id,
    beatId: id.optional(),
    startFrame: frame,
    endFrame: positiveFrames,
    text: text.max(180),
    audio: assetPathSchema.optional(),
  })
  .strict();
const theme = z
  .object(
    Object.fromEntries(
      [
        "background",
        "foreground",
        "card",
        "muted",
        "muted-foreground",
        "border",
        "brand",
        "brand-soft",
        "brand-strong",
        "ground",
      ].map((name) => [
        name,
        z
          .string()
          .max(100)
          .regex(
            /^(#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab)\([\d.,%\s/+-]+\))$/,
          )
          .optional(),
      ]),
    ),
  )
  .strict();

/** A single source for film order, graphics, narration text, and cue timing. */
export const storyboardSchema = z
  .object({
    version: z.literal(1),
    id,
    title: text.max(120),
    description: text.max(1000),
    sourceNotes: z.array(text).min(1),
    purpose: z.enum(["standalone", "loop"]),
    fps: z.literal(30),
    width: z.number().int().min(960).max(3840),
    height: z.number().int().min(640).max(2160),
    delivery: z
      .object({
        width: z.number().int().min(320).max(3840),
        height: z.number().int().min(240).max(2160),
      })
      .strict(),
    theme: theme.optional(),
    shots: z.array(shotSchema).min(1).max(100),
    narration: z.array(cueSchema).default([]),
    captions: z.boolean().default(true),
    narrationTrack: z
      .object({
        src: assetPathSchema,
        startFrame: frame.default(0),
        volume: z.number().min(0).max(2).default(1),
      })
      .strict()
      .optional(),
    soundEffects: z
      .array(
        z
          .object({
            id,
            src: assetPathSchema,
            atFrame: frame,
            volume: z.number().min(0).max(1).default(0.25),
          })
          .strict(),
      )
      .default([]),
  })
  .strict()
  .superRefine((plan, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    const unique = (ids: string[], name: string) => {
      if (new Set(ids).size !== ids.length) issue(`${name} IDs must be unique`);
    };
    unique(
      plan.shots.map((shot) => shot.id),
      "Shot",
    );
    unique(
      plan.narration.map((item) => item.id),
      "Narration cue",
    );
    unique(
      plan.soundEffects.map((item) => item.id),
      "Sound effect",
    );
    if (
      [plan.width, plan.height, plan.delivery.width, plan.delivery.height].some(
        (value) => value % 2,
      )
    )
      issue("Canvas and delivery dimensions must be even");
    if (plan.captions && plan.narration.length) {
      try {
        if (
          plan.height - captionBand(plan.narration, plan.width, plan.height) <
          640
        )
          issue(
            "Captioned films need at least 640px scene height after reserving the tallest caption; increase canvas height or shorten the cues",
          );
      } catch (error) {
        issue(
          error instanceof Error
            ? error.message
            : "Caption text cannot fit legibly",
        );
      }
    }
    if (plan.width * plan.delivery.height !== plan.height * plan.delivery.width)
      issue("Delivery and canvas aspect ratios must match");
    let offset = 0;
    const starts = new Map<string, number>();
    for (const shot of plan.shots) {
      starts.set(shot.id, offset);
      offset += shot.durationInFrames;
      if (shot.transitionInFrames >= shot.durationInFrames)
        issue(`${shot.id}: transition must be shorter than the shot`);
      if (shot.scene === "continuity") {
        const stageHeight =
          plan.height -
          (plan.captions
            ? captionBand(plan.narration, plan.width, plan.height)
            : 0);
        if (plan.width !== 1600 || stageHeight !== 840)
          issue(
            `${shot.id}: continuity requires the validated 1600 by 840 stage`,
          );
        try {
          const beats = getContinuityTimeline(shot.props.beats);
          if (beats[beats.length - 1].end !== shot.durationInFrames)
            issue(
              `${shot.id}: continuity shot must contain the complete beat schedule`,
            );
        } catch {
          issue(`${shot.id}: invalid continuity overlap`);
        }
      }
      if (shot.scene === "avandar") {
        const stageHeight =
          plan.height -
          (plan.captions
            ? captionBand(plan.narration, plan.width, plan.height)
            : 0);
        if (plan.width !== 1600 || stageHeight !== 840)
          issue(
            `${shot.id}: measured Avandar scenes require a 1600 × 840 stage (1600 × 1000 with single-line captions)`,
          );
        if (shot.props.mode !== "full" && shot.props.feature !== "explorer")
          issue(`${shot.id}: only Explorer supports partial modes`);
        const horizons = {
          import: 660,
          explorer: 800,
          dashboards: 720,
          cases: 660,
          map: 720,
        };
        const horizon =
          shot.props.feature === "explorer" && shot.props.mode !== "full"
            ? { filter: 300, query: 330, chart: 230 }[shot.props.mode]
            : horizons[shot.props.feature];
        if (shot.props.fromFrame + shot.durationInFrames > horizon)
          issue(`${shot.id}: Avandar shot extends past its authored timeline`);
      }
      if (shot.scene === "title" && shot.durationInFrames !== 66)
        issue(`${shot.id}: existing TitleCard requires 66 frames`);
      if (shot.scene === "graph") {
        unique(
          shot.props.nodes.map((node) => node.id),
          `${shot.id} node`,
        );
        unique(
          shot.props.edges.map((item) => item.id),
          `${shot.id} edge`,
        );
        const ids = new Set(shot.props.nodes.map((node) => node.id));
        for (const edge of shot.props.edges)
          if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to)
            issue(`${shot.id}: edge references an unknown node or itself`);
        let previous = -1;
        for (const item of shot.props.traversal ?? []) {
          if (
            !ids.has(item.nodeId) ||
            item.atFrame >= shot.durationInFrames ||
            item.atFrame <= previous
          )
            issue(`${shot.id}: invalid graph traversal`);
          previous = item.atFrame;
        }
      }
      if (shot.scene === "flowchart") {
        unique(
          shot.props.steps.map((step) => step.id),
          `${shot.id} step`,
        );
        const ids = new Set(shot.props.steps.map((step) => step.id));
        for (const edge of shot.props.connectors)
          if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to)
            issue(`${shot.id}: connector references an unknown step or itself`);
        if (shot.props.activeStep && !ids.has(shot.props.activeStep))
          issue(`${shot.id}: unknown active step`);
        const times = shot.props.stepAtFrames;
        if (
          times &&
          (times.length !== shot.props.steps.length ||
            times.some(
              (at, index) =>
                at >= shot.durationInFrames ||
                (index > 0 && at <= times[index - 1]),
            ))
        )
          issue(`${shot.id}: invalid step timing`);
      }
      if (shot.scene === "media") {
        const regions = [
          ...(shot.props.callouts ?? []),
          ...(shot.props.crop ? [shot.props.crop] : []),
        ];
        if (
          regions.some(
            (r) => r.x + r.width > 1.000001 || r.y + r.height > 1.000001,
          )
        )
          issue(`${shot.id}: region extends beyond the source frame`);
        unique(
          (shot.props.callouts ?? []).map((item) => item.id),
          `${shot.id} callout`,
        );
        for (const item of shot.props.callouts ?? [])
          if (
            item.endFrame <= item.startFrame ||
            item.endFrame > shot.durationInFrames
          )
            issue(`${shot.id}: invalid callout timing`);
      }
    }
    let lastEnd = -1;
    for (const item of plan.narration) {
      const shot = plan.shots.find((candidate) => candidate.id === item.shotId);
      let window = { start: 0, duration: shot?.durationInFrames ?? 0 };
      try {
        window = getCueWindowFromShot({ shot, beatId: item.beatId });
      } catch {
        issue(`${item.id}: unknown continuity beat`);
      }
      if (
        !shot ||
        item.endFrame <= item.startFrame ||
        item.endFrame > window.duration
      ) {
        issue(`${item.id}: cue must fit its referenced shot`);
        continue;
      }
      const start = starts.get(item.shotId)! + window.start + item.startFrame;
      if (start < lastEnd)
        issue("Narration cues must be chronological and non-overlapping");
      lastEnd = starts.get(item.shotId)! + window.start + item.endFrame;
      if (plan.narrationTrack && item.audio)
        issue("Choose one narration track or per-cue recordings, not both");
    }
    if (plan.narrationTrack && plan.narrationTrack.startFrame >= offset)
      issue("Narration track starts after the film ends");
    if (plan.soundEffects.some((sound) => sound.atFrame >= offset))
      issue("Sound effect starts after the film ends");
  });

export type Storyboard = z.infer<typeof storyboardSchema>;
export type Shot = Storyboard["shots"][number];
