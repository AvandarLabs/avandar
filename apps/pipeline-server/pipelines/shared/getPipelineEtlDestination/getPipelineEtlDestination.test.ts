import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPipelineEtlDestination", () => {
  it("writes Parquet to the public opendata bucket by default", () => {
    vi.stubEnv("SUPABASE_OPENDATA_BUCKET", undefined);

    expect(getPipelineEtlDestination().output.bucket).toBe("opendata");
  });

  it("uses SUPABASE_OPENDATA_BUCKET when it is set", () => {
    vi.stubEnv("SUPABASE_OPENDATA_BUCKET", "opendata-staging");

    expect(getPipelineEtlDestination().output.bucket).toBe("opendata-staging");
  });

  it("reads the Supabase credentials from the environment", () => {
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:55341");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

    expect(getPipelineEtlDestination().supabase).toEqual({
      url: "http://127.0.0.1:55341",
      serviceRoleKey: "service-role-key",
    });
  });

  it("falls back to the opendata bucket when SUPABASE_OPENDATA_BUCKET is blank", () => {
    vi.stubEnv("SUPABASE_OPENDATA_BUCKET", "  ");

    expect(getPipelineEtlDestination().output.bucket).toBe("opendata");
  });

  it("keeps checkpoints in pipeline_scope_checkpoints", () => {
    expect(getPipelineEtlDestination().output.checkpointsTable).toBe(
      "pipeline_scope_checkpoints",
    );
  });

  it("records runs through the pipeline execution functions", () => {
    expect(getPipelineEtlDestination().output.executionFunctions).toEqual({
      start: "rpc_pipeline_executions__start",
      recordScope: "rpc_pipeline_executions__record_scope",
      finish: "rpc_pipeline_executions__finish",
    });
  });

  it("treats blank Supabase credentials as unset", () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "  ");

    expect(getPipelineEtlDestination().supabase).toEqual({
      url: undefined,
      serviceRoleKey: undefined,
    });
  });
});
