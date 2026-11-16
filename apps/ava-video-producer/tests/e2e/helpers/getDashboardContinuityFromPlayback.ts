import type { Page } from "@playwright/test";

/** What the dashboard chart did during two seconds of playback. */
export type DashboardContinuity = {
  replacements: number;
  emptyFrames: number;
  originalChartConnected: boolean;
};

/**
 * Runs in the page: watches the chart for 120 animation frames and counts
 * chart replacements and frames drawn without all six bars.
 */
async function _watchChartInPage(
  element: Element,
): Promise<DashboardContinuity> {
  let replacements = 0;
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      replacements += Array.from(record.removedNodes).filter(
        (node) =>
          node instanceof Element &&
          (node.matches(".recharts-wrapper") ||
            Boolean(node.querySelector(".recharts-wrapper"))),
      ).length;
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  // Counts frames, one animation frame at a time, that lack the six bars.
  const countEmptyFrames = async (remaining: number): Promise<number> => {
    if (remaining === 0) {
      return 0;
    }
    await new Promise(requestAnimationFrame);
    const isEmpty =
      document.querySelectorAll(".recharts-bar-rectangle").length !== 6;
    return (isEmpty ? 1 : 0) + (await countEmptyFrames(remaining - 1));
  };
  const emptyFrames = await countEmptyFrames(120);
  observer.disconnect();
  return {
    replacements,
    emptyFrames,
    originalChartConnected: element.isConnected,
  };
}

/**
 * Plays the dashboard composition through its real transport and reports
 * whether its chart was replaced or drawn empty during playback. Use it in a
 * spec that asserts a composition keeps its chart mounted, for example while
 * the player runs at double speed.
 */
export async function getDashboardContinuityFromPlayback(
  page: Page,
  baseUrl: string | undefined,
): Promise<DashboardContinuity> {
  await page.goto(`${baseUrl}/compositions.html?film=qetl-composite`);
  const player = page.frameLocator("iframe");
  await player.locator(".liveFilm").waitFor();
  await page.getByRole("combobox", { name: "Speed", exact: true }).click();
  await page.getByRole("option", { name: "2×", exact: true }).click();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await player
    .getByRole("heading", { name: "A chart has dependencies.", exact: true })
    .waitFor();
  const chart = player.locator(".recharts-wrapper");
  await chart
    .locator(".recharts-bar-rectangle")
    .last()
    .waitFor({ timeout: 20000 });
  const result = await chart.evaluate(_watchChartInPage);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  return result;
}
