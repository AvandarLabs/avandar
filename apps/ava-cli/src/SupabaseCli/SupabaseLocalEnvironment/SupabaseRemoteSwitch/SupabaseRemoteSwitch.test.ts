import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import {
  EDGE_ENV_PATH,
  ENV_PATH,
  ORIGINAL_EDGE_ENV,
  ORIGINAL_ENV,
  SupabaseLocalEnvironmentFakeIo,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIo/SupabaseLocalEnvironmentFakeIo";
import { SupabaseLocalEnvironmentFixtures } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFixtures";
import { SupabaseRemoteSwitch } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseRemoteSwitch/SupabaseRemoteSwitch";
import { describe, expect, it } from "vitest";
import type { SupabaseRemoteConnection } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const { create: createFakeIo } = SupabaseLocalEnvironmentFakeIo;
const { makeBackupDirectory, readFakeManifest, seedActiveBackup } =
  SupabaseLocalEnvironmentFixtures;

const CONNECTION: SupabaseRemoteConnection = {
  projectId: "abcdefghijklmnopqrst",
  apiUrl: "https://abcdefghijklmnopqrst.supabase.co",
  databaseUrl:
    "postgresql://postgres.abcdefghijklmnopqrst:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
  publishableKey: "sb_publishable_remote",
  secretKey: "sb_secret_remote",
};

describe("SupabaseRemoteSwitch.switchRemote", () => {
  it("points the app's Supabase variables at the hosted project", async () => {
    const fake = createFakeIo();

    await SupabaseRemoteSwitch.switchRemote({
      io: fake.io,
      connection: CONNECTION,
    });

    expect(fake.files.get(ENV_PATH)).toContain(
      "VITE_SUPABASE_API_URL=https://abcdefghijklmnopqrst.supabase.co",
    );
    expect(fake.files.get(ENV_PATH)).toContain(
      "VITE_SUPABASE_ANON_KEY=sb_publishable_remote",
    );
    expect(fake.files.get(ENV_PATH)).toContain(
      "SUPABASE_SERVICE_ROLE_KEY=sb_secret_remote",
    );
  });

  it("points the edge-function variables at the hosted project", async () => {
    const fake = createFakeIo();

    await SupabaseRemoteSwitch.switchRemote({
      io: fake.io,
      connection: CONNECTION,
    });

    expect(fake.files.get(EDGE_ENV_PATH)).toContain(
      "SB_JWT_ISSUER=https://abcdefghijklmnopqrst.supabase.co/auth/v1",
    );
    expect(fake.files.get(EDGE_ENV_PATH)).toContain(
      "SB_SECRET_KEY=sb_secret_remote",
    );
  });

  it("records the hosted project id in .env.development", async () => {
    const fake = createFakeIo();

    await SupabaseRemoteSwitch.switchRemote({
      io: fake.io,
      connection: CONNECTION,
    });

    expect(fake.files.get(ENV_PATH)).toContain(
      "AVA_SUPABASE_REMOTE_PROJECT_ID=abcdefghijklmnopqrst",
    );
  });

  it("leaves an active remote backup manifest naming the hosted project", async () => {
    const fake = createFakeIo();

    await SupabaseRemoteSwitch.switchRemote({
      io: fake.io,
      connection: CONNECTION,
    });

    expect(readFakeManifest(fake)).toEqual(
      expect.objectContaining({
        kind: "remote",
        remoteProjectId: "abcdefghijklmnopqrst",
        state: "active",
      }),
    );
  });

  it("runs no Supabase CLI or Docker command", async () => {
    const fake = createFakeIo();

    await SupabaseRemoteSwitch.switchRemote({
      io: fake.io,
      connection: CONNECTION,
    });

    expect(fake.commands).toEqual([]);
    expect(fake.removedResources).toEqual([]);
  });

  it("leaves the dev-server port where it was", async () => {
    const fake = createFakeIo();

    await SupabaseRemoteSwitch.switchRemote({
      io: fake.io,
      connection: CONNECTION,
    });

    expect(fake.files.get(ENV_PATH)).toContain(
      "VITE_APP_URL=http://localhost:5173/",
    );
    expect(fake.files.get(ENV_PATH)).not.toContain("AVA_VITE_DEV_PORT");
  });

  it("refuses a remote switch while another switch is active", async () => {
    const fake = createFakeIo();
    seedActiveBackup(fake);

    await expect(
      SupabaseRemoteSwitch.switchRemote({
        io: fake.io,
        connection: CONNECTION,
      }),
    ).rejects.toThrow("Run ava supabase restore first");
  });

  it("refuses a database URL that is not a Postgres connection string", async () => {
    const fake = createFakeIo();

    await expect(
      SupabaseRemoteSwitch.switchRemote({
        io: fake.io,
        connection: { ...CONNECTION, databaseUrl: "https://example.com" },
      }),
    ).rejects.toThrow("postgresql://");
    expect(fake.copyOperations).toEqual([]);
  });

  it("puts every env file back when writing one of them fails", async () => {
    const fake = createFakeIo({ writeFailureTarget: EDGE_ENV_PATH });

    await expect(
      SupabaseRemoteSwitch.switchRemote({
        io: fake.io,
        connection: CONNECTION,
      }),
    ).rejects.toThrow(`Cannot write ${EDGE_ENV_PATH}`);
    expect(fake.files.get(ENV_PATH)).toBe(ORIGINAL_ENV);
    expect(fake.files.get(EDGE_ENV_PATH)).toBe(ORIGINAL_EDGE_ENV);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
  });
});

describe("SupabaseLocalEnvironment.restore (after a remote switch)", () => {
  it("restores every development env file", async () => {
    const fake = createFakeIo();
    await SupabaseRemoteSwitch.switchRemote({
      io: fake.io,
      connection: CONNECTION,
    });

    await expect(
      SupabaseLocalEnvironment.restore(fake.io),
    ).resolves.toBeUndefined();

    expect(fake.files.get(ENV_PATH)).toBe(ORIGINAL_ENV);
    expect(fake.files.get(EDGE_ENV_PATH)).toBe(ORIGINAL_EDGE_ENV);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
  });

  it("removes no Docker resources", async () => {
    const fake = createFakeIo({
      supabaseResources: [{ type: "container", id: "a".repeat(64) }],
    });
    await SupabaseRemoteSwitch.switchRemote({
      io: fake.io,
      connection: CONNECTION,
    });

    await SupabaseLocalEnvironment.restore(fake.io);

    expect(fake.removedResources).toEqual([]);
  });
});
