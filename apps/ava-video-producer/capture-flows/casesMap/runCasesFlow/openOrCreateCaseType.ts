import { promiseMapSequential } from "@avandar/utils";
import { expect, type Page } from "@playwright/test";
import { UUID } from "../../captureFlows.constants";
import { closeChat } from "../../closeChat";
import { getRecordIdFromPageUrl } from "../../getRecordIdFromPageUrl";
import {
  WAIT,
  makeWorkspaceUrlFromRoute,
  recordFlowResource,
  selectOption,
} from "../casesMapHelpers";
import type {
  FlowCaseType,
  FlowContext,
  FlowRecord,
} from "../../captureFlows.types";
import type { CaseSources } from "./runCasesFlow.types";

async function _addCaseField(
  page: Page,
  options: Readonly<{ source: Readonly<FlowRecord>; column: string }>,
): Promise<void> {
  const { source, column } = options;
  await page.getByRole("button", { name: source.name, exact: true }).click();
  const sourceGroup = page
    .getByRole("heading", { name: source.name, exact: true })
    .locator("..");
  await sourceGroup.getByText(column, { exact: true }).click();
  await page
    .getByRole("button", { name: "Add column as a field", exact: true })
    .click();
  // A selected source column disappears from the source picker and becomes a
  // field.
  await expect(
    sourceGroup.getByRole("radio", { name: column, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: column, exact: true }).last(),
  ).toBeAttached();
}

async function _chooseCaseFieldRules(
  page: Page,
  sources: Readonly<CaseSources>,
): Promise<void> {
  await selectOption(page, {
    input: page.getByPlaceholder("Select rule (e.g. most frequent)"),
    value: "Get a sum of the values",
  });
  // Each source's join field is chosen on the one recording page, so they run
  // in order.
  await promiseMapSequential(
    [sources.cases, sources.visits],
    async (source) => {
      await selectOption(page, {
        input: page.getByRole("combobox", { name: source.name, exact: true }),
        value: "case_id",
      });
    },
  );
  await selectOption(page, {
    input: page.getByRole("combobox", {
      name: /What field should be used as a .*'s name\?/,
    }),
    value: "case_label",
  });
}

async function _configureCaseFields(
  context: Readonly<FlowContext>,
  sources: Readonly<CaseSources>,
): Promise<void> {
  const { page } = context;
  await page
    .getByRole("switch", {
      name: "Some data should come from existing datasets",
      exact: true,
    })
    .check();
  // Fields are added through the page one at a time.
  await promiseMapSequential(
    ["case_label", "district_name", "referral_status"],
    async (column) => {
      await _addCaseField(page, { source: sources.cases, column });
    },
  );
  await _addCaseField(page, {
    source: sources.visits,
    column: "supply_kits_delivered",
  });
  // Mantine's segmented-control label is the visible target for its radio
  // input.
  const kitsRadio = page
    .getByRole("radio", { name: "supply_kits_delivered", exact: true })
    .last();
  await kitsRadio
    .locator("..")
    .getByText("supply_kits_delivered", { exact: true })
    .click();
  await _chooseCaseFieldRules(page, sources);
}

/** Reopens the case type an earlier flow in this run already recorded. */
async function _reopenRecordedCaseType(
  context: FlowContext,
  caseType: Readonly<FlowCaseType>,
): Promise<void> {
  await context.page.goto(
    makeWorkspaceUrlFromRoute(context, `ontology-designer/${caseType.id}`),
  );
  await context.page
    .getByRole("button", { name: "View records", exact: true })
    .waitFor();
  await recordFlowResource(context, { kind: "case-type", item: caseType });
}

/**
 * Opens an existing case type with the capture name; false when there is
 * none.
 */
async function _openExistingCaseType(
  context: FlowContext,
  name: string,
): Promise<boolean> {
  const { page } = context;
  await page.goto(makeWorkspaceUrlFromRoute(context, "ontology-designer"));
  await closeChat(page);
  await page
    .getByRole("button", {
      name: /New case type Describe what you want to manage/,
    })
    .waitFor({ timeout: WAIT });
  const existing = page.getByRole("button", {
    name: `Open ${name}`,
    exact: true,
  });
  if ((await existing.count()) > 1) {
    throw new Error(`More than one case type has the capture name: ${name}`);
  }
  if (!(await existing.count())) {
    return false;
  }
  await existing.click();
  await page.waitForURL(new RegExp(`/ontology-designer/${UUID}(?:\\?|$)`));
  context.state.caseType = {
    id: getRecordIdFromPageUrl(page, "ontology-designer"),
    name,
    createdByRun: false,
  };
  await recordFlowResource(context, {
    kind: "case-type",
    item: context.state.caseType,
  });
  return true;
}

/** Creates the case type through the manual designer route. */
async function _createCaseType(
  context: FlowContext,
  options: Readonly<{ sources: CaseSources; name: string }>,
): Promise<void> {
  const { page } = context;
  const { sources, name } = options;
  // The visible new-type card starts AI chat. This existing manual route is
  // intentional.
  await page.goto(
    makeWorkspaceUrlFromRoute(context, "ontology-designer/concept-creator"),
  );
  await page
    .getByRole("textbox", { name: "Case type name", exact: true })
    .fill(name);
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill(
      "Fictional Harborfield response records linked to visit activity by case_id.",
    );
  await _configureCaseFields(context, sources);
  await page
    .getByRole("combobox", { name: sources.cases.name, exact: true })
    .scrollIntoViewIfNeeded();
  await context.checkpoint("cases-source-fields");
  await page
    .getByRole("button", { name: "Create case type", exact: true })
    .click();
  await page.waitForURL(new RegExp(`/ontology-designer/${UUID}(?:\\?|$)`), {
    timeout: WAIT,
  });
  context.state.caseType = {
    id: getRecordIdFromPageUrl(page, "ontology-designer"),
    name,
    createdByRun: true,
    synced: false,
  };
  await recordFlowResource(context, {
    kind: "case-type",
    item: context.state.caseType,
  });
  await page
    .getByRole("button", { name: "Sync records", exact: true })
    .waitFor();
}

/**
 * Opens the run's case type, creating it on first use, and resolves to true
 * when it was created.
 *
 * Called by the `cases-create-type` step of `runCasesFlow`.
 */
export async function openOrCreateCaseType(
  context: FlowContext,
  sources: Readonly<CaseSources>,
): Promise<boolean> {
  const name =
    context.state.caseType?.name ??
    `Video - Harborfield response case - ${context.runLabel}`;
  if (context.state.caseType?.id) {
    await _reopenRecordedCaseType(context, context.state.caseType);
    return false;
  }
  if (await _openExistingCaseType(context, name)) {
    return false;
  }
  await _createCaseType(context, { sources, name });
  return true;
}
