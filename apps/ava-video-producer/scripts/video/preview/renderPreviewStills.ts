import { openBrowser, selectComposition } from "@remotion/renderer";
import { previewFrames } from "../../lib/planHelpers";
import { getBrowserSettingsFromPlan } from "./getBrowserSettingsFromPlan";
import { renderPreviewStill } from "./renderPreviewStill";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../../../src/videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import type { PreviewSample } from "../video.types";

type Props = Readonly<{
  plan: Storyboard;
  theme: VideoThemeSnapshot;
  serveUrl: string;
  directory: string;
}>;

/** Renders every preview frame with one reusable headless browser. */
export async function renderPreviewStills({
  plan,
  theme,
  serveUrl,
  directory,
}: Props): Promise<PreviewSample[]> {
  const { browserOptions, chromiumOptions } = getBrowserSettingsFromPlan(plan);
  const browser = await openBrowser("chrome", {
    ...browserOptions,
    chromiumOptions,
    logLevel: "error",
  });
  const frames = previewFrames(plan);
  const samples: PreviewSample[] = [];
  try {
    const composition = await selectComposition({
      serveUrl,
      id: "story-film",
      inputProps: { plan, theme },
      puppeteerInstance: browser,
      ...browserOptions,
      chromiumOptions,
      envVariables: {},
      logLevel: "error",
    });
    for (const [index, frame] of frames.entries()) {
      samples.push(
        await renderPreviewStill({
          plan,
          theme,
          serveUrl,
          directory,
          browser,
          composition,
          index,
          frame,
        }),
      );
      if ((index + 1) % 10 === 0 || index === frames.length - 1)
        console.log(`Preview ${index + 1}/${frames.length}`);
    }
  } finally {
    await browser.close({ silent: true });
  }
  return samples;
}
