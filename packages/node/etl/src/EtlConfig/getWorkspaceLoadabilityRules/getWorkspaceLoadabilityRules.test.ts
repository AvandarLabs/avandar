import { getWorkspaceLoadabilityRules } from "@etl/EtlConfig/getWorkspaceLoadabilityRules/getWorkspaceLoadabilityRules";
import { describe, expect, it } from "vitest";
import type { EtlConfig } from "@etl/EtlConfig/EtlConfig.types";

const CONFIG: EtlConfig = {
  workspaceLoadability: { unloadableFormats: ["PDF", ".xlsx", "ZIP"] },
  pipelines: {
    hdx: {
      workspaceLoadability: {
        loadableFormats: ["xlsx"],
        unloadableFormats: ["JSON"],
      },
    },
  },
};

describe("getWorkspaceLoadabilityRules", () => {
  it("gives a pipeline without overrides the global formats, normalized", () => {
    expect(
      getWorkspaceLoadabilityRules({ config: CONFIG, pipelineName: "socrata" }),
    ).toEqual({ unloadableFormats: ["pdf", "xlsx", "zip"] });
  });

  it("lets a pipeline make a global format loadable and add its own", () => {
    expect(
      getWorkspaceLoadabilityRules({ config: CONFIG, pipelineName: "hdx" }),
    ).toEqual({ unloadableFormats: ["pdf", "zip", "json"] });
  });
});
