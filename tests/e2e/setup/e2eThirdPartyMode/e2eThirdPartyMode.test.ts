import { afterEach, describe, expect, it } from "vitest";
import {
  isE2EThirdPartyMode,
  requireE2EThirdPartyEnv,
} from "./e2eThirdPartyMode";

const originalThirdParty = process.env.PLAYWRIGHT_E2E_THIRD_PARTY;

afterEach(() => {
  process.env.PLAYWRIGHT_E2E_THIRD_PARTY = originalThirdParty;
  delete process.env.E2E_FAKE_TOKEN;
  delete process.env.E2E_FAKE_ID;
});

describe("isE2EThirdPartyMode", () => {
  it("is off for a default run", () => {
    delete process.env.PLAYWRIGHT_E2E_THIRD_PARTY;

    expect(isE2EThirdPartyMode()).toBe(false);
  });

  it("is on only for the exact opt-in value", () => {
    process.env.PLAYWRIGHT_E2E_THIRD_PARTY = "1";
    expect(isE2EThirdPartyMode()).toBe(true);

    // Anything else is off, so a stray `=true` or `=0` cannot put live specs
    // into a run that did not ask for them.
    process.env.PLAYWRIGHT_E2E_THIRD_PARTY = "true";
    expect(isE2EThirdPartyMode()).toBe(false);
  });
});

describe("requireE2EThirdPartyEnv", () => {
  it("returns each requested value", () => {
    process.env.E2E_FAKE_TOKEN = "token-value";
    process.env.E2E_FAKE_ID = "id-value";

    expect(requireE2EThirdPartyEnv(["E2E_FAKE_TOKEN", "E2E_FAKE_ID"])).toEqual({
      E2E_FAKE_TOKEN: "token-value",
      E2E_FAKE_ID: "id-value",
    });
  });

  it("throws naming every missing variable, not just the first", () => {
    delete process.env.E2E_FAKE_TOKEN;
    delete process.env.E2E_FAKE_ID;

    expect(() => {
      return requireE2EThirdPartyEnv(["E2E_FAKE_TOKEN", "E2E_FAKE_ID"]);
    }).toThrow(/E2E_FAKE_TOKEN, E2E_FAKE_ID/);
  });

  // An empty string is what a workflow gives an unset secret, and it is not a
  // usable credential, so it has to fail the same way an absent name does.
  it("treats an empty value as missing", () => {
    process.env.E2E_FAKE_TOKEN = "";

    expect(() => {
      return requireE2EThirdPartyEnv(["E2E_FAKE_TOKEN"]);
    }).toThrow(/E2E_FAKE_TOKEN/);
  });
});
