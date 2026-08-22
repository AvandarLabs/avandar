import { SupabaseStatus } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseStatus/SupabaseStatus";
import { prop, propEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import type {
  SupabaseBackupManifest,
  SupabaseStatusEntry,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const STANDARD_CONFIG = `project_id = "avandar"

[api]
port = 54321

[db]
port = 54322

[studio]
port = 54323

[inbucket]
port = 51634
`;

const SWITCHED_CONFIG = STANDARD_CONFIG.replace(
  '"avandar"',
  '"analytics-p2-temp"',
).replace("port = 54321", "port = 55321");

const STATUS_JSON = JSON.stringify({
  API_URL: "http://127.0.0.1:55321",
  DB_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
  ANON_KEY: "anon",
  SERVICE_ROLE_KEY: "service",
  PUBLISHABLE_KEY: "publishable",
  SECRET_KEY: "secret",
  STUDIO_URL: "http://127.0.0.1:55323",
  MAILPIT_URL: "http://127.0.0.1:52634",
  FUNCTIONS_URL: "http://127.0.0.1:55321/functions/v1",
  STORAGE_S3_URL: "http://127.0.0.1:55321/storage/v1/s3",
  GRAPHQL_URL: "http://127.0.0.1:55321/graphql/v1",
  JWT_SECRET: "super-secret",
});

const MANIFEST: SupabaseBackupManifest = {
  branch: "feat/analytics-p2",
  worktreePath: "/repo",
  temporaryProjectId: "analytics-p2-temp",
  basePort: 55321,
  derivedPorts: { "api.port": 55321 },
  files: [
    { sourcePath: "/repo/supabase/config.toml", backupPath: "/backup/a" },
  ],
  state: "active",
};

function _getValueFromEntries(
  options: Readonly<{
    entries: readonly SupabaseStatusEntry[];
    label: string;
  }>,
): string | undefined {
  return options.entries.find(propEq("label", options.label))?.value;
}

describe("makeStatusReport", () => {
  it("reports the shared stack when no backup owns the config", () => {
    const report = SupabaseStatus.makeStatusReport({
      branch: "develop",
      configContents: STANDARD_CONFIG,
      manifest: undefined,
      statusJson: undefined,
      envFiles: [],
    });

    expect(report.isSwitched).toBe(false);
    expect(report.projectId).toBe("avandar");
  });

  it("reports a switch only when the backup owns the running project", () => {
    expect(
      SupabaseStatus.makeStatusReport({
        branch: "feat/analytics-p2",
        configContents: SWITCHED_CONFIG,
        manifest: MANIFEST,
        statusJson: undefined,
        envFiles: [],
      }).isSwitched,
    ).toBe(true);

    expect(
      SupabaseStatus.makeStatusReport({
        branch: "feat/analytics-p2",
        configContents: STANDARD_CONFIG,
        manifest: MANIFEST,
        statusJson: undefined,
        envFiles: [],
      }).isSwitched,
    ).toBe(false);
  });

  it("expects develop on the shared stack and a feature branch off it", () => {
    expect(
      SupabaseStatus.makeStatusReport({
        branch: "develop",
        configContents: STANDARD_CONFIG,
        manifest: undefined,
        statusJson: undefined,
        envFiles: [],
      }).isExpectedForBranch,
    ).toBe(true);

    expect(
      SupabaseStatus.makeStatusReport({
        branch: "feat/analytics-p2",
        configContents: STANDARD_CONFIG,
        manifest: undefined,
        statusJson: undefined,
        envFiles: [],
      }).isExpectedForBranch,
    ).toBe(false);
  });

  it("treats a switched develop as the state worth flagging", () => {
    expect(
      SupabaseStatus.makeStatusReport({
        branch: "develop",
        configContents: SWITCHED_CONFIG,
        manifest: { ...MANIFEST, branch: "develop" },
        statusJson: undefined,
        envFiles: [],
      }).isExpectedForBranch,
    ).toBe(false);

    expect(
      SupabaseStatus.makeStatusReport({
        branch: "feat/analytics-p2",
        configContents: SWITCHED_CONFIG,
        manifest: MANIFEST,
        statusJson: undefined,
        envFiles: [],
      }).isExpectedForBranch,
    ).toBe(true);
  });

  it("reports the ports from the config and the pinned dev-server port", () => {
    const report = SupabaseStatus.makeStatusReport({
      branch: "feat/analytics-p2",
      configContents: SWITCHED_CONFIG,
      manifest: MANIFEST,
      statusJson: undefined,
      envFiles: [
        {
          filePath: "/repo/.env.development",
          contents: "AVA_VITE_DEV_PORT=6173",
        },
      ],
    });

    expect(_getValueFromEntries({ entries: report.ports, label: "API" })).toBe(
      "55321",
    );
    expect(
      _getValueFromEntries({ entries: report.ports, label: "Database" }),
    ).toBe("54322");
    expect(
      _getValueFromEntries({
        entries: report.ports,
        label: "Dev server (pnpm dev)",
      }),
    ).toBe("6173");
  });

  it("reports the stack as stopped when status is unavailable", () => {
    const report = SupabaseStatus.makeStatusReport({
      branch: "develop",
      configContents: STANDARD_CONFIG,
      manifest: undefined,
      statusJson: undefined,
      envFiles: [],
    });

    expect(report.isRunning).toBe(false);
    expect(report.environmentValues).toEqual([]);
    expect(report.endpoints).toEqual([]);
  });

  it("maps the running stack onto the variables the codebase reads", () => {
    const report = SupabaseStatus.makeStatusReport({
      branch: "feat/analytics-p2",
      configContents: SWITCHED_CONFIG,
      manifest: MANIFEST,
      statusJson: STATUS_JSON,
      envFiles: [],
    });

    expect(report.isRunning).toBe(true);
    expect(
      _getValueFromEntries({
        entries: report.environmentValues,
        label: "SB_PUBLISHABLE_KEY",
      }),
    ).toBe("publishable");
    expect(
      _getValueFromEntries({
        entries: report.environmentValues,
        label: "SB_SECRET_KEY",
      }),
    ).toBe("secret");
    expect(
      _getValueFromEntries({
        entries: report.environmentValues,
        label: "SUPABASE_SERVICE_ROLE_KEY",
      }),
    ).toBe("secret");
    expect(
      _getValueFromEntries({
        entries: report.environmentValues,
        label: "VITE_SUPABASE_ANON_KEY",
      }),
    ).toBe("publishable");
    expect(
      _getValueFromEntries({
        entries: report.environmentValues,
        label: "SB_JWT_ISSUER",
      }),
    ).toBe("http://127.0.0.1:55321/auth/v1");
  });

  it("reports only the endpoints the codebase uses", () => {
    const report = SupabaseStatus.makeStatusReport({
      branch: "feat/analytics-p2",
      configContents: SWITCHED_CONFIG,
      manifest: MANIFEST,
      statusJson: STATUS_JSON,
      envFiles: [],
    });

    expect(report.endpoints.map(prop("label"))).toEqual([
      "Studio",
      "Mailpit (email)",
      "Edge functions",
      "Storage (S3)",
    ]);
    expect(
      _getValueFromEntries({
        entries: report.endpoints,
        label: "Storage (S3)",
      }),
    ).toBe("http://127.0.0.1:55321/storage/v1/s3");
  });

  it("names the environment keys that no longer match the stack", () => {
    const report = SupabaseStatus.makeStatusReport({
      branch: "feat/analytics-p2",
      configContents: SWITCHED_CONFIG,
      manifest: MANIFEST,
      statusJson: STATUS_JSON,
      envFiles: [
        {
          filePath: "/repo/.env.development",
          contents:
            "VITE_SUPABASE_API_URL=http://127.0.0.1:55321\nSUPABASE_SERVICE_ROLE_KEY=stale\nUNRELATED=keep\n",
        },
        {
          filePath: "/repo/.env.development.edge",
          contents: "SB_SECRET_KEY=secret\n",
        },
      ],
    });

    expect(report.environmentDrift).toEqual([
      {
        filePath: "/repo/.env.development",
        staleKeys: ["SUPABASE_SERVICE_ROLE_KEY"],
      },
      { filePath: "/repo/.env.development.edge", staleKeys: [] },
    ]);
  });
});
