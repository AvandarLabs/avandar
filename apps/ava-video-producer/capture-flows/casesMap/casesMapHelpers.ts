import { expect, type Locator, type Page } from "@playwright/test";
import type { FlowContext, FlowRecord } from "../captureFlows.types";

/** How long a cases or map flow waits for one product UI response, in ms. */
export const WAIT = 30000;

/**
 * A workspace route on the local development app. These flows mutate only an
 * authenticated local development workspace through its UI, so any other
 * origin throws.
 */
export function makeWorkspaceUrlFromRoute(
  context: Readonly<Pick<FlowContext, "baseUrl" | "workspace" | "runLabel">>,
  suffix: string,
): string {
  const origin = new URL(context.baseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) {
    throw new Error(
      "Case and map capture requires a localhost development app.",
    );
  }
  if (!context.workspace || !context.runLabel) {
    throw new Error("workspace and runLabel are required.");
  }
  return `${origin.origin}/${encodeURIComponent(context.workspace)}/${suffix}`;
}

/** Escapes a string for safe interpolation into a RegExp literal. */
export function makeRegexSourceFromText(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Chooses an option from a combobox-style input, skipping the UI if it
 * already matches.
 */
export async function selectOption(
  page: Page,
  options: Readonly<{ input: Locator; value: string }>,
): Promise<void> {
  const { input, value } = options;
  await expect(input).toBeEnabled({ timeout: WAIT });
  if ((await input.inputValue()) === value) {
    return;
  }
  await input.click();
  const controls = await input.getAttribute("aria-controls");
  const dropdown = controls ? page.locator(`[id="${controls}"]`) : page;
  await dropdown.getByRole("option", { name: value, exact: true }).click();
  await expect(input).toHaveValue(value);
  await input.press("Escape");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toBeHidden();
}

/**
 * Records a resource created or reused by a flow, for later cleanup and
 * provenance.
 */
export async function recordFlowResource(
  context: Readonly<FlowContext>,
  options: Readonly<{ kind: string; item: Readonly<FlowRecord> }>,
): Promise<void> {
  const { kind, item } = options;
  await context.recordResource?.({ kind, id: item.id, name: item.name });
}
