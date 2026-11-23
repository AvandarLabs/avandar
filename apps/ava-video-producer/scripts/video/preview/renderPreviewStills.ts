import { openBrowser, selectComposition } from "@remotion/renderer";
import { getPreviewFramesFromPlan } from "../../lib/planHelpers/getPreviewFramesFromPlan";
import { getBrowserSettingsFromPlan } from "./getBrowserSettingsFromPlan";
import { renderPreviewStill } from "./renderPreviewStill";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { VideoThemeSnapshot } from "../../../src/videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import type { PreviewSample } from "../video.types";

type Props = Readonly<{
  plan: Storyboard;
  theme: VideoThemeSnapshot;
  serveUrl: string;
  directory: string;
}>;

async function _renderSamples({
  plan,
  theme,
  serveUrl,
  directory,
  browser,
  composition,
  frames,
  samples,
}: Readonly<
  Props & {
    browser: Awaited<ReturnType<typeof openBrowser>>;
    composition: Awaited<ReturnType<typeof selectComposition>>;
    frames: readonly number[];
    samples: PreviewSample[];
  }
>): Promise<void> {
  for (const [index, frame] of frames.entries()) {
    samples.push(
      // All stills share one Chromium renderer, which must stay serial to
      // avoid frame flicker.
      // react-doctor-disable-next-line async-await-in-loop
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
    if ((index + 1) % 10 === 0 || index === frames.length - 1) {
      console.log(`Preview ${index + 1}/${frames.length}`);
    }
  }
}
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
  const frames = getPreviewFramesFromPlan(plan);
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
    await _renderSamples({
      plan,
      theme,
      serveUrl,
      directory,
      browser,
      composition,
      frames,
      samples,
    });
  } finally {
    await browser.close({ silent: true });
  }
  return samples;
}
