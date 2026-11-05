import { SupabaseCommandOutput } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseCommandOutput/SupabaseCommandOutput";
import { describe, expect, it } from "vitest";

/** Covers secret removal without suppressing operational startup output. */

describe("SupabaseCommandOutput.redactSecretsFromLine", () => {
  it("redacts credential values from JSON startup status", () => {
    expect(
      SupabaseCommandOutput.redactSecretsFromLine(
        JSON.stringify({
          API_URL: "http://127.0.0.1:55381",
          PUBLISHABLE_KEY: "publishable",
          SECRET_KEY: "secret",
          JWT_SECRET: "jwt",
          ANON_KEY: "anon",
          SERVICE_ROLE_KEY: "service",
          S3_PROTOCOL_ACCESS_KEY_ID: "access",
          S3_PROTOCOL_ACCESS_KEY_SECRET: "storage-secret",
        }),
      ),
    ).toBe(
      JSON.stringify({
        API_URL: "http://127.0.0.1:55381",
        PUBLISHABLE_KEY: "[redacted]",
        SECRET_KEY: "[redacted]",
        JWT_SECRET: "[redacted]",
        ANON_KEY: "[redacted]",
        SERVICE_ROLE_KEY: "[redacted]",
        S3_PROTOCOL_ACCESS_KEY_ID: "[redacted]",
        S3_PROTOCOL_ACCESS_KEY_SECRET: "[redacted]",
      }),
    );
  });

  it("redacts credentials from human-readable startup output", () => {
    expect(
      SupabaseCommandOutput.redactSecretsFromLine(
        "service_role key │ local-service-role-key",
      ),
    ).toBe("service_role key │ [redacted]");
  });

  it("preserves operational output", () => {
    expect(
      SupabaseCommandOutput.redactSecretsFromLine(
        "Applying migration 20260818182843_normalize_grants.sql...",
      ),
    ).toBe("Applying migration 20260818182843_normalize_grants.sql...");
  });
});

describe("SupabaseCommandOutput.maskEnvValue", () => {
  it("shows only the start of a secret key", () => {
    expect(
      SupabaseCommandOutput.maskEnvValue({
        envKey: "SB_SECRET_KEY",
        value: "sb_secret_remote_0123456789",
      }),
    ).toBe("sb_secret_re…");
  });

  it("hides the password in a Postgres connection string", () => {
    expect(
      SupabaseCommandOutput.maskEnvValue({
        envKey: "SUPABASE_POSTGRES_URL",
        value: "postgresql://postgres.abc:hunter2@db.example.com:5432/postgres",
      }),
    ).toBe("postgresql://postgres.abc:****@db.example.com:5432/postgres");
  });

  it("leaves a value that is not a credential as it is", () => {
    expect(
      SupabaseCommandOutput.maskEnvValue({
        envKey: "VITE_SUPABASE_API_URL",
        value: "https://abc.supabase.co",
      }),
    ).toBe("https://abc.supabase.co");
  });
});
