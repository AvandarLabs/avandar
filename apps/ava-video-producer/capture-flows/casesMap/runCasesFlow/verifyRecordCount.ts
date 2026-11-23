import { prop } from "@avandar/utils";
import { expect, type Locator } from "@playwright/test";
import { WAIT } from "../casesMapHelpers";
import { getCaseType } from "./getCaseType";
import { getRecordLinks } from "./getRecordLinks";
import type { FlowContext } from "../../captureFlows.types";
import type { FixtureRow } from "./runCasesFlow.types";

async function _collectRecordLabels(
  options: Readonly<Parameters<typeof _addRenderedRecords>[0]>,
): Promise<void> {
  const { context, links, viewport, records, expectedCount } = options;
  // The pane virtualizes its rows, so read and scroll one step at a time.
  for (let scroll = 0; scroll < 80; scroll += 1) {
    if (
      await _addRenderedRecords({
        context,
        links,
        viewport,
        records,
        expectedCount,
      })
    ) {
      break;
    }
    await _scrollRecordPane({
      links,
      viewport,
    });
  }
}
/** What one pass over the rendered record links reads and adds to. */
type RenderedRecordsRead = {
  context: FlowContext;
  links: Locator;
  viewport: Locator;
  records: Map<string | undefined, string>;
  expectedCount: number;
};
/**
 * Adds the rendered record links to `records`; true once every record has
 * loaded.
 */
async function _addRenderedRecords(
  options: Readonly<RenderedRecordsRead>,
): Promise<boolean> {
  const { links, records } = options;
  const renderedRecordLinks = await links.evaluateAll((elements) => {
    return elements.map((element) => {
      return {
        href: element.getAttribute("href") ?? undefined,
        name: (element.textContent ?? "").trim(),
      };
    });
  });
  renderedRecordLinks.forEach((link) => {
    return records.set(link.href, link.name);
  });
  const isAtBottom = await options.viewport.evaluate((element) => {
    return element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
  });
  const loadingMoreIndicator = options.context.page.getByText(
    "Loading more...",
    {
      exact: true,
    },
  );
  return (
    isAtBottom &&
    records.size >= options.expectedCount &&
    !(await loadingMoreIndicator.count())
  );
}
/** Scrolls the record pane one step and waits for other records to render. */
async function _scrollRecordPane({
  links,
  viewport,
}: Readonly<{
  links: Locator;
  viewport: Locator;
}>): Promise<void> {
  const renderedRecords = () => {
    return links.evaluateAll((elements) => {
      return elements
        .map((element) => {
          return element.getAttribute("href");
        })
        .join("|");
    });
  };
  const renderedHrefsBeforeScroll = await renderedRecords();
  // This scrolls the rendered record pane, without reading application state.
  await viewport.evaluate((element) => {
    return element.scrollBy(0, Math.floor(element.clientHeight * 0.65));
  });
  // A boundary may fetch another page before the scrollbar can move again.
  await expect
    .poll(renderedRecords, { timeout: WAIT })
    .not.toBe(renderedHrefsBeforeScroll);
}
/**
 * Scrolls the virtualized record pane until every record has rendered, checks
 * their labels match the fixture rows, and reloads to restore a clean view.
 *
 * Called by the `cases-verify-240-records` step of `runCasesFlow`.
 */
export async function verifyRecordCount({
  context,
  expectedRows,
}: Readonly<{
  context: FlowContext;
  expectedRows: readonly FixtureRow[];
}>): Promise<void> {
  const caseType = getCaseType(context);
  const links = getRecordLinks({
    page: context.page,
    caseTypeId: caseType.id,
  });
  const viewport = context.page
    .locator(".mantine-ScrollArea-viewport")
    .filter({ has: links.first() });
  await expect(viewport).toHaveCount(1);
  const records = new Map<string | undefined, string>();
  await _collectRecordLabels({
    context,
    links,
    viewport,
    records,
    expectedCount: expectedRows.length,
  });
  expect([...records.values()].sort()).toEqual(
    expectedRows.map(prop("case_label")).sort(),
  );
  caseType.observedRecordCount = records.size;
  // The current product repeats pagination boundary keys in its virtual list.
  // Reload the same records route after proving unique labels, restoring a
  // clean view.
  await context.page.reload();
  await expect(
    links.filter({ hasText: expectedRows[0].case_label }).first(),
  ).toBeVisible({ timeout: WAIT });
}
