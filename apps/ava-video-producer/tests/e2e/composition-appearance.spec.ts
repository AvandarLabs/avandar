import { test, expect } from "@playwright/test";
import { checkDashboardContinuity } from "./helpers/checkDashboardContinuity.mjs";

test("the dashboard retains all six bars during continuous composition playback", async ({
  page,
  baseURL,
}) => {
  const result = await checkDashboardContinuity(page, baseURL);
  expect(result).toEqual({
    replacements: 0,
    emptyFrames: 0,
    originalChartConnected: true,
  });
});
