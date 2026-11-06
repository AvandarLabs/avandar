/** Exercise the composition's real transport and inspect chart continuity during playback. */
export async function checkDashboardContinuity(page, baseURL) {
  await page.goto(`${baseURL}/compositions.html?film=qetl-composite`);
  await page.frameLocator("iframe").locator(".liveFilm").waitFor();
  await page.getByRole("combobox", { name: "Speed", exact: true }).click();
  await page.getByRole("option", { name: "2×", exact: true }).click();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page
    .frameLocator("iframe")
    .getByRole("heading", { name: "A chart has dependencies.", exact: true })
    .waitFor();
  const chart = page.frameLocator("iframe").locator(".recharts-wrapper");
  await chart
    .locator(".recharts-bar-rectangle")
    .last()
    .waitFor({ timeout: 20000 });
  const result = await chart.evaluate(async (element) => {
    let replacements = 0;
    let emptyFrames = 0;
    const observer = new MutationObserver((records) =>
      records.forEach((record) => {
        replacements += Array.from(record.removedNodes).filter(
          (node) =>
            node instanceof Element &&
            (node.matches(".recharts-wrapper") ||
              node.querySelector(".recharts-wrapper")),
        ).length;
      }),
    );
    observer.observe(document.body, { childList: true, subtree: true });
    for (let frame = 0; frame < 120; frame++) {
      await new Promise(requestAnimationFrame);
      if (document.querySelectorAll(".recharts-bar-rectangle").length !== 6)
        emptyFrames++;
    }
    observer.disconnect();
    return {
      replacements,
      emptyFrames,
      originalChartConnected: element.isConnected,
    };
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  return result;
}
