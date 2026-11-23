import { getWorkspaceLoadabilityRules } from "@etl/EtlConfig/getWorkspaceLoadabilityRules/getWorkspaceLoadabilityRules";
import { describe, expect, it } from "vitest";
import type { EtlConfig } from "@etl/EtlConfig/EtlConfig.types";

const CONFIG: EtlConfig = {
  workspaceLoadability: { unloadableFormats: ["PDF", ".xlsx", "ZIP"] },
};

describe("getWorkspaceLoadabilityRules", () => {
  it("gives a pipeline without overrides the global formats, normalized", () => {
    expect(getWorkspaceLoadabilityRules({ config: CONFIG })).toEqual({
      unloadableFormats: ["pdf", "xlsx", "zip"],
    });
  });

  it("lets a pipeline make a global format loadable and add its own", () => {
    expect(
      getWorkspaceLoadabilityRules({
        config: CONFIG,
        pipelineOverrides: {
          loadableFormats: ["xlsx"],
          unloadableFormats: ["JSON"],
        },
      }),
    ).toEqual({ unloadableFormats: ["pdf", "zip", "json"] });
  });
});
