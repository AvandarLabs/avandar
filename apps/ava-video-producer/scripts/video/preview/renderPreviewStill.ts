import path from "node:path";
import {
  type openBrowser,
  renderStill,
  type selectComposition,
} from "@remotion/renderer";
import { StoryboardTimeline } from "../../../src/storyboard/schema/StoryboardTimeline";
import { requireLicense } from "../../requireLicense";
import { getBrowserSettingsFromPlan } from "./getBrowserSettingsFromPlan";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../../../src/videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import type { PreviewSample } from "../video.types";

type Props = Readonly<{
  plan: Storyboard;
  theme: VideoThemeSnapshot;
  serveUrl: string;
  directory: string;
  browser: Awaited<ReturnType<typeof openBrowser>>;
  composition: Awaited<ReturnType<typeof selectComposition>>;
  index: number;
  frame: number;
}>;

/** Renders one preview still as a JPEG and names the shot it falls in. */
export async function renderPreviewStill({
  plan,
  theme,
  serveUrl,
  directory,
  browser,
  composition,
  index,
  frame,
}: Props): Promise<PreviewSample> {
  const { browserOptions, chromiumOptions } = getBrowserSettingsFromPlan(plan);
  const file = `still-${String(index).padStart(3, "0")}.jpg`;
  await renderStill({
    composition,
    serveUrl,
    inputProps: { plan, theme },
    frame,
    output: path.join(directory, file),
    imageFormat: "jpeg",
    jpegQuality: 90,
    puppeteerInstance: browser,
    ...browserOptions,
    chromiumOptions,
    envVariables: {},
    logLevel: "error",
    licenseKey: requireLicense().privateKey,
  });
  const shot = StoryboardTimeline.timeline(plan).find((item) => {
    return frame >= item.startFrame && frame < item.endFrame;
  })!;
  return { frame, file, shot: shot.id };
}
