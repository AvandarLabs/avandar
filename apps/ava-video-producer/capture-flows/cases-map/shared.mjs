import { expect } from "@playwright/test";
import { ensureDataset } from "../avandar.mjs";

export const WAIT = 30000;
export const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** These flows mutate only an authenticated local development workspace through its UI. */
export function localRoute(ctx, suffix) {
  const origin = new URL(ctx.baseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) {
    throw new Error(
      "Case and map capture requires a localhost development app.",
    );
  }
  if (!ctx.workspace || !ctx.runLabel)
    throw new Error("workspace and runLabel are required.");
  return `${origin.origin}/${encodeURIComponent(ctx.workspace)}/${suffix}`;
}

/** Escape a string for safe interpolation into a RegExp literal. */
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Close the chat panel if it is open, so it cannot cover the UI under test. */
export async function closeChat(page) {
  const chat = page.getByRole("button", { name: "Chat", exact: true });
  if (
    (await chat.count()) &&
    (await chat.getAttribute("aria-pressed")) === "true"
  )
    await chat.click();
}

/** Choose an option from a combobox-style input, skipping the UI if it already matches. */
export async function selectOption(page, input, value) {
  await expect(input).toBeEnabled({ timeout: WAIT });
  if ((await input.inputValue()) === value) return;
  await input.click();
  const controls = await input.getAttribute("aria-controls");
  const dropdown = controls ? page.locator(`[id="${controls}"]`) : page;
  await dropdown.getByRole("option", { name: value, exact: true }).click();
  await expect(input).toHaveValue(value);
  await input.press("Escape");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toBeHidden();
}

/** Record a resource created or reused by a flow, for later cleanup and provenance. */
export async function resource(ctx, kind, item) {
  await ctx.recordResource?.({ kind, id: item.id, name: item.name });
}

/** Extract a persisted record's id from the current page URL. */
export function idFromRoute(page, segment) {
  const match = new URL(page.url()).pathname.match(
    new RegExp(`/${segment}/(${UUID})(?:/|$)`),
  );
  if (!match)
    throw new Error(
      `Expected a persisted ${segment} route after the UI action.`,
    );
  return match[1];
}

/** Fetch or create the fixture-backed dataset a flow needs, caching it on ctx.state. */
export async function dataset(ctx, key) {
  return ctx.state.datasets?.[key] ?? ensureDataset(ctx, key);
}
