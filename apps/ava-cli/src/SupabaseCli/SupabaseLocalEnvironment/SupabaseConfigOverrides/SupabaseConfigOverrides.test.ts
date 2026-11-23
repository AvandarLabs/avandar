import { SupabaseConfigOverrides } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfigOverrides/SupabaseConfigOverrides";
import { describe, expect, it } from "vitest";

const STANDARD_STATE = {
  projectId: "avandar",
  apiPort: 54321,
  ports: {
    "api.port": 54321,
    "db.port": 54322,
    "db.pooler.port": 54329,
    "inbucket.port": 51634,
    "edge_runtime.inspector_port": 8083,
  },
};

const ENV_WITH_BLOCK = `VITE_APP_URL=http://localhost:5173/
UNRELATED=keep

# >>> ava supabase switch >>>
# Managed by \`ava supabase switch\`. Run \`ava supabase restore\` to remove it.
SUPABASE_PROJECT_ID=feat-x
SUPABASE_API_PORT=55321
SUPABASE_DB_PORT=55322
# <<< ava supabase switch <<<
`;

describe("SupabaseConfigOverrides.getEnvKeyFromConfigKey", () => {
  it("joins the section and key the way the Supabase CLI reads them", () => {
    expect(
      ["api.port", "db.pooler.port", "edge_runtime.inspector_port"].map(
        SupabaseConfigOverrides.getEnvKeyFromConfigKey,
      ),
    ).toEqual([
      "SUPABASE_API_PORT",
      "SUPABASE_DB_POOLER_PORT",
      "SUPABASE_EDGE_RUNTIME_INSPECTOR_PORT",
    ]);
  });

  it("names the inbucket port after the local_smtp section it aliases", () => {
    expect(
      SupabaseConfigOverrides.getEnvKeyFromConfigKey("inbucket.port"),
    ).toBe("SUPABASE_LOCAL_SMTP_PORT");
  });
});

describe("SupabaseConfigOverrides.isOverrideKey", () => {
  it("accepts the project id and port keys but not other Supabase keys", () => {
    expect(
      [
        "SUPABASE_PROJECT_ID",
        "SUPABASE_DB_SHADOW_PORT",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "AVA_VITE_DEV_PORT",
      ].map(SupabaseConfigOverrides.isOverrideKey),
    ).toEqual([true, true, false, false, false]);
  });
});

describe("SupabaseConfigOverrides.makeEffectiveStateFromEnvContents", () => {
  it("returns the config unchanged when the environment overrides nothing", () => {
    expect(
      SupabaseConfigOverrides.makeEffectiveStateFromEnvContents({
        config: STANDARD_STATE,
        envContents: "VITE_APP_URL=http://localhost:5173/\n",
      }),
    ).toEqual(STANDARD_STATE);
  });

  it("applies the project id and every overridden port", () => {
    expect(
      SupabaseConfigOverrides.makeEffectiveStateFromEnvContents({
        config: STANDARD_STATE,
        envContents: ENV_WITH_BLOCK,
      }),
    ).toEqual({
      projectId: "feat-x",
      apiPort: 55321,
      ports: { ...STANDARD_STATE.ports, "api.port": 55321, "db.port": 55322 },
    });
  });

  it("keeps the config port when an override is blank", () => {
    expect(
      SupabaseConfigOverrides.makeEffectiveStateFromEnvContents({
        config: STANDARD_STATE,
        envContents: "SUPABASE_API_PORT=\n",
      }).apiPort,
    ).toBe(54321);
  });

  it("reads an override written outside the managed block", () => {
    expect(
      SupabaseConfigOverrides.makeEffectiveStateFromEnvContents({
        config: STANDARD_STATE,
        envContents: 'SUPABASE_LOCAL_SMTP_PORT="52634"\n',
      }).ports["inbucket.port"],
    ).toBe(52634);
  });
});

describe("SupabaseConfigOverrides.makeEnvContentsWithOverrides", () => {
  it("appends a managed block that names the project and every port", () => {
    expect(
      SupabaseConfigOverrides.makeEnvContentsWithOverrides({
        envContents: "VITE_APP_URL=http://localhost:5173/\nUNRELATED=keep\n",
        overrides: [
          ["SUPABASE_PROJECT_ID", "feat-x"],
          ["SUPABASE_API_PORT", "55321"],
          ["SUPABASE_DB_PORT", "55322"],
        ],
      }),
    ).toBe(ENV_WITH_BLOCK);
  });

  it("replaces an existing block instead of adding a second one", () => {
    const rewritten = SupabaseConfigOverrides.makeEnvContentsWithOverrides({
      envContents: ENV_WITH_BLOCK,
      overrides: [["SUPABASE_PROJECT_ID", "feat-y"]],
    });
    expect(rewritten.match(/>>> ava supabase switch >>>/g)).toHaveLength(1);
    expect(rewritten).toContain("SUPABASE_PROJECT_ID=feat-y");
    expect(rewritten).not.toContain("SUPABASE_API_PORT");
  });

  it("drops a stray override outside the block so the block's value wins", () => {
    const rewritten = SupabaseConfigOverrides.makeEnvContentsWithOverrides({
      envContents: "SUPABASE_API_PORT=1\nUNRELATED=keep\n",
      overrides: [["SUPABASE_API_PORT", "55321"]],
    });
    expect(rewritten.match(/SUPABASE_API_PORT=/g)).toHaveLength(1);
    expect(rewritten).toContain("SUPABASE_API_PORT=55321");
    expect(rewritten).toContain("UNRELATED=keep");
  });
});

describe("SupabaseConfigOverrides.fromLocalProject", () => {
  it("lists the project id first and then one entry per port", () => {
    expect(
      SupabaseConfigOverrides.fromLocalProject({
        projectId: "feat-x",
        ports: { "api.port": 55321, "inbucket.port": 52634 },
      }),
    ).toEqual([
      ["SUPABASE_PROJECT_ID", "feat-x"],
      ["SUPABASE_API_PORT", "55321"],
      ["SUPABASE_LOCAL_SMTP_PORT", "52634"],
    ]);
  });
});

describe("SupabaseConfigOverrides.getRemoteProjectIdFromEnvContents", () => {
  it("reads the remote marker a remote switch writes", () => {
    expect(
      SupabaseConfigOverrides.getRemoteProjectIdFromEnvContents(
        "AVA_SUPABASE_REMOTE_PROJECT_ID=abcdefghijklmnop\n",
      ),
    ).toBe("abcdefghijklmnop");
  });

  it("returns undefined when the worktree is not switched to a remote", () => {
    expect(
      SupabaseConfigOverrides.getRemoteProjectIdFromEnvContents(ENV_WITH_BLOCK),
    ).toBeUndefined();
  });
});
