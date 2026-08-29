import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import {
  CONFIG_PATH,
  EDGE_ENV_PATH,
  ENV_PATH,
  ORIGINAL_CONFIG,
  ORIGINAL_EDGE_ENV,
  ORIGINAL_ENV,
  SupabaseLocalEnvironmentFakeIO,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO/SupabaseLocalEnvironmentFakeIO";
import { SupabaseLocalEnvironmentFixtures } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFixtures";
import { describe, expect, it } from "vitest";

const { create: createFakeIO, getResourceKeyFromResource: resourceKey } =
  SupabaseLocalEnvironmentFakeIO;
const { makeBackupDirectory, seedActiveBackup } =
  SupabaseLocalEnvironmentFixtures;

describe("SupabaseLocalEnvironment.restore (file restoration and cleanup)", () => {
  it("restores files even when temporary project cleanup fails", async () => {
    const fake = createFakeIO({ listResourcesError: "cleanup failed" });
    seedActiveBackup(fake);
    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "analytics-p2-temp requires manual cleanup",
    );
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    expect(fake.files.get(ENV_PATH)).toBe(ORIGINAL_ENV);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
  });

  it("removes the current branch backup after a successful restore", async () => {
    const temporaryContainer = {
      type: "container" as const,
      id: "a".repeat(64),
    };
    const temporaryNetwork = {
      type: "network" as const,
      id: "b".repeat(64),
    };
    const temporaryVolume = {
      type: "volume" as const,
      id: "supabase_db_analytics-p2-temp",
    };
    const fake = createFakeIO({
      supabaseResources: [
        temporaryVolume,
        temporaryNetwork,
        temporaryContainer,
      ],
    });
    seedActiveBackup(fake);
    await expect(
      SupabaseLocalEnvironment.restore(fake.io),
    ).resolves.toBeUndefined();
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    expect(fake.files.get(EDGE_ENV_PATH)).toBe(ORIGINAL_EDGE_ENV);
    expect(fake.removedResources).toEqual([
      temporaryContainer,
      temporaryNetwork,
      temporaryVolume,
    ]);
    expect(fake.commands).not.toContainEqual([
      "stop",
      "--project-id",
      "analytics-p2-temp",
      "--no-backup",
    ]);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
  });

  it("rejects a resource whose project label changes before deletion", async () => {
    const relabeledContainer = {
      type: "container" as const,
      id: "a".repeat(64),
    };
    const fake = createFakeIO({
      supabaseResources: [relabeledContainer],
      resourceInspections: {
        [resourceKey(relabeledContainer)]: {
          exists: true,
          projectId: "avandar",
        },
      },
    });
    seedActiveBackup(fake);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "requires manual cleanup",
    );
    expect(fake.removedResources).toEqual([]);
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
  });

  it("refuses a non-canonical Docker identifier before deleting resources", async () => {
    const validContainer = {
      type: "container" as const,
      id: "a".repeat(64),
    };
    const unsafeNetwork = {
      type: "network" as const,
      id: "shared-network;delete",
    };
    const fake = createFakeIO({
      supabaseResources: [validContainer, unsafeNetwork],
    });
    seedActiveBackup(fake);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "unsafe Docker network identifier",
    );
    expect(fake.removedResources).toEqual([]);
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
  });

  it("continues cleanup in dependency order and aggregates partial failures", async () => {
    const firstContainer = {
      type: "container" as const,
      id: "a".repeat(64),
    };
    const secondContainer = {
      type: "container" as const,
      id: "b".repeat(64),
    };
    const network = { type: "network" as const, id: "c".repeat(64) };
    const volume = {
      type: "volume" as const,
      id: "supabase_db_analytics-p2-temp",
    };
    const fake = createFakeIO({
      supabaseResources: [volume, network, secondContainer, firstContainer],
      resourceRemovalFailures: [resourceKey(firstContainer)],
    });
    seedActiveBackup(fake);

    const error = await SupabaseLocalEnvironment.restore(fake.io).catch(
      (caughtError: unknown) => {
        return caughtError;
      },
    );

    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) {
      throw new Error("Expected an Error.");
    }
    expect(error.message).toContain(firstContainer.id);
    expect(
      fake.operations.filter((operation) => {
        return operation.startsWith("docker-remove:");
      }),
    ).toEqual([
      `docker-remove:${resourceKey(firstContainer)}`,
      `docker-remove:${resourceKey(secondContainer)}`,
      `docker-remove:${resourceKey(network)}`,
      `docker-remove:${resourceKey(volume)}`,
    ]);
    expect(fake.removedResources).toEqual([secondContainer, network, volume]);
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
  });

  it("safely ignores an already-absent enumerated temporary resource", async () => {
    const absentContainer = {
      type: "container" as const,
      id: "a".repeat(64),
    };
    const fake = createFakeIO({
      supabaseResources: [absentContainer],
      resourceInspections: {
        [resourceKey(absentContainer)]: { exists: false },
      },
    });
    seedActiveBackup(fake);

    await expect(
      SupabaseLocalEnvironment.restore(fake.io),
    ).resolves.toBeUndefined();
    expect(fake.removedResources).toEqual([]);
  });

  it("restores a backed-up environment file that is currently missing", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    fake.files.delete(EDGE_ENV_PATH);

    await expect(
      SupabaseLocalEnvironment.restore(fake.io),
    ).resolves.toBeUndefined();
    expect(fake.files.get(EDGE_ENV_PATH)).toBe(ORIGINAL_EDGE_ENV);
  });

  it("retains the backup when restoring a file fails", async () => {
    const fake = createFakeIO({ copyFailureTarget: ENV_PATH });
    seedActiveBackup(fake);
    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "Backup retained",
    );
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(true);
  });

  it("preserves cleanup and restoration errors during explicit restore", async () => {
    const fake = createFakeIO({
      copyFailureTarget: ENV_PATH,
      listResourcesError: "cleanup failed",
    });
    seedActiveBackup(fake);

    const error = await SupabaseLocalEnvironment.restore(fake.io).catch(
      (caughtError: unknown) => {
        return caughtError;
      },
    );

    expect(error).toBeInstanceOf(AggregateError);
    if (!(error instanceof AggregateError)) {
      throw new Error("Expected an AggregateError.");
    }
    expect(error.message).toContain("manual cleanup is required");
    expect(error.errors).toEqual([
      expect.objectContaining({ message: "cleanup failed" }),
      expect.objectContaining({
        message: expect.stringContaining("Cannot copy"),
      }),
    ]);
  });

  it("preserves cleanup and backup-removal errors during explicit restore", async () => {
    const fake = createFakeIO({
      removeFailureTarget: makeBackupDirectory(),
      listResourcesError: "cleanup failed",
    });
    seedActiveBackup(fake);

    const error = await SupabaseLocalEnvironment.restore(fake.io).catch(
      (caughtError: unknown) => {
        return caughtError;
      },
    );

    expect(error).toBeInstanceOf(AggregateError);
    if (!(error instanceof AggregateError)) {
      throw new Error("Expected an AggregateError.");
    }
    expect(error.message).toContain("manual cleanup is required");
    expect(error.errors).toEqual([
      expect.objectContaining({ message: "cleanup failed" }),
      expect.objectContaining({
        message: expect.stringContaining("Cannot remove"),
      }),
    ]);
  });
});
