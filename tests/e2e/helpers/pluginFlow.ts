import { expect } from "@playwright/test";
import { MEDIUM_WAIT, SHORT_WAIT } from "./timeouts";
import type { Locator, Page } from "@playwright/test";

/** The install wizard's steps, as its stepper labels them. */
const WIZARD_STEP_LABELS = [
  "Review",
  "Records",
  "Datasets",
  "Confirm",
] as const;

type WizardStepLabel = (typeof WIZARD_STEP_LABELS)[number];

/**
 * The most pages the wizard is walked through before giving up: Review,
 * Datasets, Confirm, and one Records page per data slot, with room to spare.
 */
const MAX_WIZARD_PAGES = 10;

type InstallPluginThroughWizardOptions = {
  workspaceSlug: string;

  /** The plugin's name, as its settings card and the wizard's title show it. */
  pluginName: string;

  /**
   * Binds the data slot on each Records page. The wizard then clicks Next.
   * Without it, each data slot is skipped with "Skip for now", which only an
   * optional slot offers.
   */
  chooseRecords?: (wizard: Locator) => Promise<void>;

  /**
   * Called right after Install is clicked, so a caller can clean up only an
   * install it started.
   */
  onInstallStarted?: () => void;

  /**
   * Runs once the wizard says the plugin is installed, before Done, for
   * example to wait for the plugin's datasets to import.
   */
  beforeDone?: (wizard: Locator) => Promise<void>;
};

/** A plugin's card on the Plugins settings tab, named by its heading. */
export function getPluginCard(page: Page, pluginName: string): Locator {
  return page.getByRole("region", { name: pluginName, exact: true });
}

async function _getActiveStepLabel(wizard: Locator): Promise<WizardStepLabel> {
  const stepText = await wizard.locator('[aria-current="step"]').innerText();
  const stepLabel = WIZARD_STEP_LABELS.find((label) => {
    return stepText.includes(label);
  });
  if (stepLabel === undefined) {
    throw new Error(`Unknown install wizard step: "${stepText}"`);
  }
  return stepLabel;
}

/** Leaves one wizard page before Confirm the way its step is left. */
async function _leaveWizardPage(
  options: Readonly<{
    wizard: Locator;
    stepLabel: WizardStepLabel;
    chooseRecords: InstallPluginThroughWizardOptions["chooseRecords"];
  }>,
): Promise<void> {
  const { wizard, stepLabel, chooseRecords } = options;
  if (stepLabel === "Records") {
    if (chooseRecords === undefined) {
      await wizard
        .getByRole("button", { name: "Skip for now", exact: true })
        .click();
      return;
    }
    await chooseRecords(wizard);
  }
  await wizard.getByRole("button", { name: "Next", exact: true }).click();
}

/**
 * Walks the wizard from Review to Confirm. Every page starts with a level 3
 * heading of its own, so waiting for that heading to change waits for the
 * next page to draw before its step is read.
 */
async function _goToConfirmStep(
  options: Readonly<{
    wizard: Locator;
    chooseRecords: InstallPluginThroughWizardOptions["chooseRecords"];
  }>,
): Promise<void> {
  const { wizard, chooseRecords } = options;
  const pageHeading = wizard.getByRole("heading", { level: 3 });
  for (let pageCount = 0; pageCount < MAX_WIZARD_PAGES; pageCount += 1) {
    const stepLabel = await _getActiveStepLabel(wizard);
    if (stepLabel === "Confirm") {
      return;
    }
    const headingText = await pageHeading.innerText();
    await _leaveWizardPage({ wizard, stepLabel, chooseRecords });
    await expect(pageHeading).not.toHaveText(headingText, {
      timeout: SHORT_WAIT,
    });
  }
  throw new Error(
    `The install wizard did not reach Confirm in ${MAX_WIZARD_PAGES} pages.`,
  );
}

/**
 * Installs a plugin the way an admin does: Install on its card in Settings →
 * Plugins, then through the install wizard's pages to Install, then Done.
 * It lands on Settings with `page.goto`, so call it right after signing in.
 * Resolves once the card says the plugin is installed.
 */
export async function installPluginThroughWizard(
  page: Page,
  options: Readonly<InstallPluginThroughWizardOptions>,
): Promise<void> {
  const { workspaceSlug, pluginName } = options;
  await page.goto(`/${workspaceSlug}/settings/plugins`);
  const card = getPluginCard(page, pluginName);
  await expect(card.getByText("Not installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await card.getByRole("button", { name: "Install", exact: true }).click();

  const wizard = page.getByRole("dialog", {
    name: `Install ${pluginName}`,
    exact: true,
  });
  await expect(
    wizard.getByRole("heading", { level: 3, name: "About this plugin" }),
  ).toBeVisible({ timeout: SHORT_WAIT });
  await _goToConfirmStep({ wizard, chooseRecords: options.chooseRecords });
  await wizard.getByRole("button", { name: "Install", exact: true }).click();
  options.onInstallStarted?.();
  await expect(
    wizard.getByText(`${pluginName} is installed.`, { exact: true }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });

  await options.beforeDone?.(wizard);
  await wizard.getByRole("button", { name: "Done", exact: true }).click();
  await expect(wizard).toBeHidden({ timeout: SHORT_WAIT });
  await expect(card.getByText("Installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/**
 * Runs a plugin command from the Data Explorer toolbar by its title: its own
 * button while the toolbar has room for every plugin command, otherwise its
 * item in the "Plugins" menu they collapse into. Commands stay disabled
 * until a query result is on screen, so this waits for them to turn on.
 */
export async function runPluginCommand(
  page: Page,
  commandTitle: string,
): Promise<void> {
  const commandButton = page.getByRole("button", {
    name: commandTitle,
    exact: true,
  });
  const pluginsMenuButton = page.getByRole("button", {
    name: "Plugins",
    exact: true,
  });
  await expect(commandButton.or(pluginsMenuButton)).toBeEnabled({
    timeout: MEDIUM_WAIT,
  });
  if (await commandButton.isVisible()) {
    await commandButton.click();
    return;
  }
  await pluginsMenuButton.click();
  await page.getByRole("menuitem", { name: commandTitle, exact: true }).click();
}
