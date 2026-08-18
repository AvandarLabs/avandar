import { SupabaseConfig } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { describe, expect, it } from "vitest";

const CONFIG = `project_id = "avandar"

[api]
port = 54321

[db]
port = 54322
shadow_port = 54320

[studio]
port = 54323

[inbucket]
port = 51634

[edge_runtime]
inspector_port = 8083

[analytics]
port = 54327

[remotes.production]
project_id = "remote-project-ref"

[remotes.production.api]
port = 64321
`;

const CONFIG_WITH_COMMENTS_AND_MAIL_PORTS = `project_id = "avandar" # local project

[api]
port = 54321 # gateway

[inbucket]
port = 51634 # web interface
smtp_port = 51635 # SMTP
pop3_port = 51636 # POP3

[remotes.production]
project_id = "remote-project-ref" # remote project

[remotes.production.inbucket]
smtp_port = 61635 # remote SMTP
`;

const CONFIG_WITH_COMMENTED_SECTION_HEADERS = `project_id = "avandar"

[api] # API gateway
port = 54321

[db] # database
port = 54322

[remotes.production] # deployed project
project_id = "remote-project-ref"

[remotes.production.api] # deployed API
port = 64321
`;

describe("makeSupabaseConfigStateFromContents", () => {
  it("reads the project id, API port, and every active local port", () => {
    expect(SupabaseConfig.makeStateFromContents(CONFIG)).toEqual({
      projectId: "avandar",
      apiPort: 54321,
      ports: {
        "api.port": 54321,
        "db.port": 54322,
        "db.shadow_port": 54320,
        "studio.port": 54323,
        "inbucket.port": 51634,
        "edge_runtime.inspector_port": 8083,
        "analytics.port": 54327,
      },
    });
  });

  it("reads commented assignments and every active local port key", () => {
    expect(
      SupabaseConfig.makeStateFromContents(CONFIG_WITH_COMMENTS_AND_MAIL_PORTS),
    ).toEqual({
      projectId: "avandar",
      apiPort: 54321,
      ports: {
        "api.port": 54321,
        "inbucket.port": 51634,
        "inbucket.smtp_port": 51635,
        "inbucket.pop3_port": 51636,
      },
    });
  });

  it("reads local sections with comments and excludes commented remote sections", () => {
    expect(
      SupabaseConfig.makeStateFromContents(
        CONFIG_WITH_COMMENTED_SECTION_HEADERS,
      ),
    ).toEqual({
      projectId: "avandar",
      apiPort: 54321,
      ports: {
        "api.port": 54321,
        "db.port": 54322,
      },
    });
  });

  it("does not treat trailing non-comment text as a section header", () => {
    const configContents = `project_id = "avandar"

[api]
port = 54321

[db] trailing text
port = 54322
`;

    expect(SupabaseConfig.makeStateFromContents(configContents).ports).toEqual({
      "api.port": 54322,
    });
  });
});

describe("makeSupabaseConfigFromBasePort", () => {
  it("replaces the project id and shifts every port by the API delta", () => {
    const rewritten = SupabaseConfig.makeConfigContentsFromBasePort({
      configContents: CONFIG,
      projectId: "analytics-p2-temp",
      basePort: 55321,
    });

    expect(rewritten).toContain('project_id = "analytics-p2-temp"');
    expect(rewritten).toContain('project_id = "remote-project-ref"');
    expect(rewritten).toContain("[remotes.production.api]\nport = 64321");
    expect(SupabaseConfig.makeStateFromContents(rewritten).ports).toEqual({
      "api.port": 55321,
      "db.port": 55322,
      "db.shadow_port": 55320,
      "studio.port": 55323,
      "inbucket.port": 52634,
      "edge_runtime.inspector_port": 9083,
      "analytics.port": 55327,
    });
  });

  it("preserves inline comments while shifting every active local port", () => {
    const rewritten = SupabaseConfig.makeConfigContentsFromBasePort({
      configContents: CONFIG_WITH_COMMENTS_AND_MAIL_PORTS,
      projectId: "analytics-p2-temp",
      basePort: 55321,
    });

    expect(rewritten).toContain(
      'project_id = "analytics-p2-temp" # local project',
    );
    expect(rewritten).toContain("port = 55321 # gateway");
    expect(rewritten).toContain("port = 52634 # web interface");
    expect(rewritten).toContain("smtp_port = 52635 # SMTP");
    expect(rewritten).toContain("pop3_port = 52636 # POP3");
    expect(rewritten).toContain(
      'project_id = "remote-project-ref" # remote project',
    );
    expect(rewritten).toContain("smtp_port = 61635 # remote SMTP");
  });

  it("shifts commented local sections without rewriting commented remotes", () => {
    const rewritten = SupabaseConfig.makeConfigContentsFromBasePort({
      configContents: CONFIG_WITH_COMMENTED_SECTION_HEADERS,
      projectId: "analytics-p2-temp",
      basePort: 55321,
    });

    expect(rewritten).toContain("[api] # API gateway\nport = 55321");
    expect(rewritten).toContain("[db] # database\nport = 55322");
    expect(rewritten).toContain(
      "[remotes.production.api] # deployed API\nport = 64321",
    );
  });
});

describe("makeSupabaseLocalStatusFromJson", () => {
  it("reads the local credentials needed by development environments", () => {
    expect(
      SupabaseConfig.makeLocalStatusFromJson(
        JSON.stringify({
          API_URL: "http://127.0.0.1:55321",
          DB_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
          ANON_KEY: "legacy-anon",
          SERVICE_ROLE_KEY: "legacy-service",
          PUBLISHABLE_KEY: "publishable",
          SECRET_KEY: "secret",
        }),
      ),
    ).toEqual({
      apiUrl: "http://127.0.0.1:55321",
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
      anonKey: "legacy-anon",
      serviceRoleKey: "legacy-service",
      publishableKey: "publishable",
      secretKey: "secret",
    });
  });
});

describe("makeDevelopmentEnvFromStatus", () => {
  it("updates known Supabase values and preserves every unrelated line", () => {
    const rewritten = SupabaseConfig.makeDevelopmentEnvFromStatus({
      envContents:
        "VITE_SUPABASE_API_URL=old\nSUPABASE_URL=old\nOPENAI_API_KEY=keep\n",
      status: {
        apiUrl: "http://127.0.0.1:55321",
        databaseUrl: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
        anonKey: "anon",
        serviceRoleKey: "service",
        publishableKey: "publishable",
        secretKey: "secret",
      },
    });

    expect(rewritten).toBe(`VITE_SUPABASE_API_URL=http://127.0.0.1:55321
SUPABASE_URL=http://127.0.0.1:55321
OPENAI_API_KEY=keep
`);
  });

  it("updates edge-function keys and derives the JWT issuer", () => {
    expect(
      SupabaseConfig.makeDevelopmentEnvFromStatus({
        envContents:
          "SB_SECRET_KEY=old\nSB_PUBLISHABLE_KEY=old\nSB_JWT_ISSUER=old\n",
        status: {
          apiUrl: "http://127.0.0.1:55321",
          databaseUrl:
            "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
          anonKey: "anon",
          serviceRoleKey: "service",
          publishableKey: "publishable",
          secretKey: "secret",
        },
      }),
    ).toBe(`SB_SECRET_KEY=secret
SB_PUBLISHABLE_KEY=publishable
SB_JWT_ISSUER=http://127.0.0.1:55321/auth/v1
`);
  });

  it("writes the publishable and secret keys, not the legacy JWTs", () => {
    expect(
      SupabaseConfig.makeDevelopmentEnvFromStatus({
        envContents:
          "VITE_SUPABASE_ANON_KEY=old\nSUPABASE_SERVICE_ROLE_KEY=old\n",
        status: {
          apiUrl: "http://127.0.0.1:55321",
          databaseUrl:
            "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
          anonKey: "legacy-anon",
          serviceRoleKey: "legacy-service",
          publishableKey: "publishable",
          secretKey: "secret",
        },
      }),
    ).toBe(`VITE_SUPABASE_ANON_KEY=publishable
SUPABASE_SERVICE_ROLE_KEY=secret
`);
  });

  it("leaves a callback URL already on the API port alone", () => {
    expect(
      SupabaseConfig.makeDevelopmentEnvFromStatus({
        envContents:
          'GOOGLE_REDIRECT_URI="http://localhost:55321/functions/v1/google-auth-callback"\n',
        status: {
          apiUrl: "http://127.0.0.1:55321",
          databaseUrl:
            "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
          anonKey: "anon",
          serviceRoleKey: "service",
          publishableKey: "publishable",
          secretKey: "secret",
        },
      }),
    ).toBe(
      'GOOGLE_REDIRECT_URI="http://localhost:55321/functions/v1/google-auth-callback"\n',
    );
  });

  it("moves a loopback callback URL onto the new API port", () => {
    expect(
      SupabaseConfig.makeDevelopmentEnvFromStatus({
        envContents:
          'GOOGLE_REDIRECT_URI="http://localhost:54321/functions/v1/google-auth-callback"\n',
        status: {
          apiUrl: "http://127.0.0.1:55321",
          databaseUrl:
            "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
          anonKey: "anon",
          serviceRoleKey: "service",
          publishableKey: "publishable",
          secretKey: "secret",
        },
      }),
    ).toBe(
      'GOOGLE_REDIRECT_URI="http://127.0.0.1:55321/functions/v1/google-auth-callback"\n',
    );
  });

  it("leaves a callback URL served by a remote host alone", () => {
    expect(
      SupabaseConfig.makeDevelopmentEnvFromStatus({
        envContents:
          "GOOGLE_REDIRECT_URI=https://avandarlabs.com/functions/v1/google-auth-callback\n",
        status: {
          apiUrl: "http://127.0.0.1:55321",
          databaseUrl:
            "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
          anonKey: "anon",
          serviceRoleKey: "service",
          publishableKey: "publishable",
          secretKey: "secret",
        },
      }),
    ).toBe(
      "GOOGLE_REDIRECT_URI=https://avandarlabs.com/functions/v1/google-auth-callback\n",
    );
  });
});
