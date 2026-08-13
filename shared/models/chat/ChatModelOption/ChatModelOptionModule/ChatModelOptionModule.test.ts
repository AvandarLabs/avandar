import { prop, propEq } from "@avandar/utils";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";
import { describe, expect, it } from "vitest";

const { Catalog } = ChatModelOption;

describe("ChatModelOption.Catalog", () => {
  it("offers exactly six models, three per license tier", () => {
    expect(Catalog.values).toHaveLength(6);

    const proprietary = Catalog.values.filter(
      propEq("licenseTier", "proprietary"),
    );
    const open = Catalog.values.filter(propEq("licenseTier", "open"));
    expect(proprietary).toHaveLength(3);
    expect(open).toHaveLength(3);
  });

  it("orders every proprietary model ahead of every open model", () => {
    // Count-agnostic on purpose: adding a fourth frontier model is a
    // legitimate catalog edit and should not break the ordering test as well
    // as the count test above.
    const tiers = Catalog.values.map(prop("licenseTier"));
    const firstOpenIndex = tiers.indexOf("open");
    expect(firstOpenIndex).toBeGreaterThan(-1);
    expect(tiers.lastIndexOf("proprietary")).toBeLessThan(firstOpenIndex);
  });

  it("uses unique model ids", () => {
    const ids = Catalog.values.map(prop("id"));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses OpenRouter's vendor/model id shape, with provider matching the id prefix", () => {
    // Each row hand-repeats the vendor three times (id prefix, name prefix,
    // provider) and the model name twice. These two tests guard the
    // copy-paste edit that is most likely to go wrong.
    Catalog.values.forEach((model) => {
      expect(model.id).toMatch(/^[a-z0-9.-]+\/[a-z0-9.-]+$/);
      expect(model.id.split("/")[0]).toBe(model.provider);
    });
  });

  it("keeps nameWithoutProvider consistent with name", () => {
    Catalog.values.forEach((model) => {
      expect(model.name.endsWith(model.nameWithoutProvider)).toBe(true);
    });
  });

  it("gives every model a non-empty name and nameWithoutProvider", () => {
    // Do not derive nameWithoutProvider by splitting name: models without a
    // vendor prefix would produce an empty picker label.
    Catalog.values.forEach((model) => {
      expect(model.name.length).toBeGreaterThan(0);
      expect(model.nameWithoutProvider.length).toBeGreaterThan(0);
    });
  });

  it("declares tool support for every model", () => {
    Catalog.values.forEach((model) => {
      expect(model.supportsTools).toBe(true);
    });
  });

  it("includes the default model id in the catalog", () => {
    // Keeps the default model constrained to the current catalog.
    const ids = Catalog.values.map(prop("id"));
    expect(ids).toContain(Catalog.defaultId);
  });

  it("isValidId accepts every catalog id and rejects unknown ids", () => {
    Catalog.values.forEach((model) => {
      expect(Catalog.isValidId(model.id)).toBe(true);
    });
    expect(Catalog.isValidId("openai/gpt-5.5-pro")).toBe(false);
    expect(Catalog.isValidId("not-a-model")).toBe(false);
  });
});
