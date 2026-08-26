import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMissingE2EThirdPartyEnv,
  isE2EThirdPartyMode,
  requireE2EThirdPartyEnv,
} from "./e2eThirdPartyMode";
import type { E2ETestSkip } from "./e2eThirdPartyMode";

const originalThirdParty = process.env.PLAYWRIGHT_E2E_THIRD_PARTY;

/**
 * Stands in for Playwright's `test`, recording the skip instead of aborting.
 *
 * Playwright's own `test.skip(true, …)` throws to end the test, so a real run
 * never reaches the line after it. The fake deliberately does not, which is how
 * the "must not fall through" throw gets covered.
 */
function _fakeTest(): E2ETestSkip & {
  skip: ReturnType<typeof vi.fn>;
} {
  return { skip: vi.fn() };
}

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

    // Anything else is off, so a stray `=true` or `=0` cannot turn a default
    // run's skips into failures.
    process.env.PLAYWRIGHT_E2E_THIRD_PARTY = "true";
    expect(isE2EThirdPartyMode()).toBe(false);
  });
});

describe("getMissingE2EThirdPartyEnv", () => {
  it("is empty when every variable is set", () => {
    process.env.E2E_FAKE_TOKEN = "token-value";
    process.env.E2E_FAKE_ID = "id-value";

    expect(
      getMissingE2EThirdPartyEnv(["E2E_FAKE_TOKEN", "E2E_FAKE_ID"]),
    ).toEqual([]);
  });

  it("reports every missing name, in the order asked for", () => {
    delete process.env.E2E_FAKE_TOKEN;
    delete process.env.E2E_FAKE_ID;

    expect(
      getMissingE2EThirdPartyEnv(["E2E_FAKE_TOKEN", "E2E_FAKE_ID"]),
    ).toEqual(["E2E_FAKE_TOKEN", "E2E_FAKE_ID"]);
  });

  // An unset GitHub secret interpolates to an empty string, and an env file
  // line with nothing after the `=` gives the same. Neither is a credential.
  it("counts empty and whitespace as missing", () => {
    process.env.E2E_FAKE_TOKEN = "";
    process.env.E2E_FAKE_ID = "   ";

    expect(
      getMissingE2EThirdPartyEnv(["E2E_FAKE_TOKEN", "E2E_FAKE_ID"]),
    ).toEqual(["E2E_FAKE_TOKEN", "E2E_FAKE_ID"]);
  });
});

describe("requireE2EThirdPartyEnv", () => {
  it("returns each requested value, trimmed", () => {
    process.env.E2E_FAKE_TOKEN = " token-value ";
    process.env.E2E_FAKE_ID = "id-value";
    const test = _fakeTest();

    expect(
      requireE2EThirdPartyEnv({
        test,
        variableNames: ["E2E_FAKE_TOKEN", "E2E_FAKE_ID"],
      }),
    ).toEqual({
      E2E_FAKE_TOKEN: "token-value",
      E2E_FAKE_ID: "id-value",
    });
    expect(test.skip).not.toHaveBeenCalled();
  });

  describe("in a default run", () => {
    it("skips, naming every missing variable, without failing", () => {
      delete process.env.PLAYWRIGHT_E2E_THIRD_PARTY;
      const test = _fakeTest();

      // The throw only happens because the fake does not abort; Playwright's
      // `skip` does. What matters is that `skip` was the mechanism.
      expect(() => {
        return requireE2EThirdPartyEnv({
          test,
          variableNames: ["E2E_FAKE_TOKEN", "E2E_FAKE_ID"],
        });
      }).toThrow(/^Skipped: /);

      expect(test.skip).toHaveBeenCalledWith(
        true,
        "Set E2E_FAKE_TOKEN, E2E_FAKE_ID to run this against the real service.",
      );
    });
  });

  describe("in a third-party run", () => {
    it("fails instead of skipping", () => {
      process.env.PLAYWRIGHT_E2E_THIRD_PARTY = "1";
      const test = _fakeTest();

      expect(() => {
        return requireE2EThirdPartyEnv({
          test,
          variableNames: ["E2E_FAKE_TOKEN"],
        });
      }).toThrow(/asked for the third-party specs but E2E_FAKE_TOKEN/);

      // A skip here would be the bug: this run exists to reach the service, so
      // a green report has to mean it did.
      expect(test.skip).not.toHaveBeenCalled();
    });

    it("points at the run that skips instead", () => {
      process.env.PLAYWRIGHT_E2E_THIRD_PARTY = "1";

      expect(() => {
        return requireE2EThirdPartyEnv({
          test: _fakeTest(),
          variableNames: ["E2E_FAKE_TOKEN"],
        });
      }).toThrow(/pnpm test:e2e/);
    });
  });
});
