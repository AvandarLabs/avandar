import { getOptionalEnvVar } from "@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar";
import { afterEach, describe, expect, it } from "vitest";

const NAME = "AVA_TEST_OPTIONAL_ENV_VAR";

describe("getOptionalEnvVar", () => {
  afterEach(() => {
    delete process.env[NAME];
  });

  it("returns the value with surrounding whitespace removed", () => {
    process.env[NAME] = "  secret  ";
    expect(getOptionalEnvVar(NAME)).toBe("secret");
  });

  it("returns undefined when the variable is unset", () => {
    expect(getOptionalEnvVar(NAME)).toBe(undefined);
  });

  it("returns undefined when the variable is blank, as an unfilled example line leaves it", () => {
    process.env[NAME] = "   ";
    expect(getOptionalEnvVar(NAME)).toBe(undefined);
  });
});
