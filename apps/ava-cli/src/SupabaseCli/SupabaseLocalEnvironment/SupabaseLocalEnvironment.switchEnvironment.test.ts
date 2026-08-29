import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import {
  EDGE_ENV_PATH,
  ENV_PATH,
  SupabaseLocalEnvironmentFakeIO,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO/SupabaseLocalEnvironmentFakeIO";
import { describe, expect, it } from "vitest";

const { create: createFakeIO } = SupabaseLocalEnvironmentFakeIO;

describe("SupabaseLocalEnvironment.switch (environment rewriting)", () => {
  it("moves the dev server by the same delta as the Supabase ports", async () => {
    const fake = createFakeIO();

    await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });

    expect(fake.files.get(ENV_PATH)).toContain("AVA_VITE_DEV_PORT=6173");
    expect(fake.files.get(ENV_PATH)).toContain(
      "VITE_APP_URL=http://localhost:6173/",
    );
  });

  it("pins the dev-server port in every development environment file", async () => {
    const fake = createFakeIO();

    await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });

    [ENV_PATH, EDGE_ENV_PATH].forEach((envPath) => {
      expect(fake.files.get(envPath)).toContain("AVA_VITE_DEV_PORT=6173");
    });
  });

  it("skips a dev-server port the Supabase set already reserves", async () => {
    const fake = createFakeIO();
    fake.files.set(ENV_PATH, "VITE_APP_URL=http://localhost:54321/\n");

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).resolves.toEqual(expect.objectContaining({ devServerPort: 55_323 }));
  });

  it("skips a Docker-published Vite port when shifting the dev server", async () => {
    const fake = createFakeIO({ publishedHostPorts: [6173] });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).resolves.toEqual(expect.objectContaining({ devServerPort: 6174 }));
  });

  it("rewrites every key the codebase reads from the local stack", async () => {
    const fake = createFakeIO();

    await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });

    expect(fake.files.get(ENV_PATH)).toContain(
      "VITE_SUPABASE_ANON_KEY=publishable",
    );
    expect(fake.files.get(ENV_PATH)).toContain(
      "SUPABASE_SERVICE_ROLE_KEY=secret",
    );
    expect(fake.files.get(ENV_PATH)).toContain(
      "VITE_SUPABASE_API_URL=http://127.0.0.1:55321",
    );
    expect(fake.files.get(EDGE_ENV_PATH)).toContain(
      "SB_PUBLISHABLE_KEY=publishable",
    );
    expect(fake.files.get(EDGE_ENV_PATH)).toContain("SB_SECRET_KEY=secret");
    expect(fake.files.get(EDGE_ENV_PATH)).toContain(
      "SB_JWT_ISSUER=http://127.0.0.1:55321/auth/v1",
    );
  });

  it("repoints the Google callback at the switched API port", async () => {
    const fake = createFakeIO();

    await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });

    expect(fake.files.get(EDGE_ENV_PATH)).toContain(
      'GOOGLE_REDIRECT_URI="http://127.0.0.1:55321/functions/v1/google-auth-callback"',
    );
  });
});
