import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import { SupabaseLocalEnvironmentFakeIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIo/SupabaseLocalEnvironmentFakeIo";
import {
  REMOTE_ENV_FILE,
  REMOTE_MANIFEST,
  STANDARD_CONFIG,
  STATUS_JSON,
  getValueFromEntries,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseStatus/__tests__/SupabaseStatus.fixtures";
import { SupabaseStatus } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseStatus/SupabaseStatus";
import { describe, expect, it } from "vitest";

describe("makeStatusReport (remote switch)", () => {
  it("reports a remote switch with the hosted project and its URL", () => {
    const report = SupabaseStatus.makeStatusReport({
      branch: "feat/analytics-p2",
      configContents: STANDARD_CONFIG,
      manifest: REMOTE_MANIFEST,
      statusJson: STATUS_JSON,
      envFiles: [REMOTE_ENV_FILE],
    });

    expect(report).toEqual(
      expect.objectContaining({
        switchKind: "remote",
        isSwitched: true,
        projectId: "abcdefghijklmnopqrst",
        remoteApiUrl: "https://abcdefghijklmnopqrst.supabase.co",
        ports: [],
        endpoints: [],
        environmentDrift: [],
      }),
    );
  });
  it("shows only the start of a remote secret key", () => {
    const report = SupabaseStatus.makeStatusReport({
      branch: "feat/analytics-p2",
      configContents: STANDARD_CONFIG,
      manifest: REMOTE_MANIFEST,
      statusJson: undefined,
      envFiles: [REMOTE_ENV_FILE],
    });

    expect(
      getValueFromEntries({
        entries: report.environmentValues,
        label: "SUPABASE_SERVICE_ROLE_KEY",
      }),
    ).toBe("sb_secret_re…");
  });
});

describe("readStatusReport", () => {
  it("skips the Supabase CLI for a worktree on a hosted project", async () => {
    const fake = SupabaseLocalEnvironmentFakeIo.create();
    await SupabaseLocalEnvironment.switchRemote({
      io: fake.io,
      connection: {
        projectId: "abcdefghijklmnopqrst",
        apiUrl: "https://abcdefghijklmnopqrst.supabase.co",
        databaseUrl: "postgresql://u:p@h:5432/postgres",
        publishableKey: "sb_publishable_x",
        secretKey: "sb_secret_x",
      },
    });

    const report = await SupabaseStatus.readStatusReport(fake.io);

    expect(report.switchKind).toBe("remote");
    expect(fake.commands).toEqual([]);
  });
});
