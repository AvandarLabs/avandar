import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  replaceTemplateVariables,
  toCamelCase,
  toPascalCase,
  updateHTTPAPITypes,
  updateRootDenoWorkspace,
} from "@ava-cli/DevCLI/NewBoilerplateCLI/NewEdgeFunctionCLI/newEdgeFunction";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@avandar/acclimate", () => {
  return {
    Acclimate: {
      log: vi.fn(),
    },
  };
});

describe("toCamelCase", () => {
  it("maps kebab-case segments", () => {
    expect(toCamelCase("google-auth-callback")).toBe("googleAuthCallback");
  });
});

describe("toPascalCase", () => {
  it("maps kebab-case segments", () => {
    expect(toPascalCase("google-auth")).toBe("GoogleAuth");
  });
});

describe("replaceTemplateVariables", () => {
  it("substitutes all placeholders", () => {
    const out = replaceTemplateVariables(
      "$FUNCTION_NAME$ $FUNCTION_NAME_CAMEL_CASE$ $FUNCTION_NAME_PASCAL_CASE$",
      "my-fn",
    );
    expect(out).toBe("my-fn myFn MyFn");
  });
});

describe("updateRootDenoWorkspace", () => {
  const tmpRoot = path.join(os.tmpdir(), "ava-deno-test");

  afterEach(() => {
    if (fs.existsSync(tmpRoot)) {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("appends a new workspace folder entry", () => {
    fs.mkdirSync(tmpRoot, { recursive: true });
    const denoPath = path.join(tmpRoot, "deno.json");
    fs.writeFileSync(
      denoPath,
      JSON.stringify(
        {
          workspace: ["./packages/shared/utils"],
        },
        undefined,
        2,
      ) + "\n",
      "utf-8",
    );

    const didAdd = updateRootDenoWorkspace({
      denoJsonPath: denoPath,
      functionName: "my-fn",
    });

    expect(didAdd).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(denoPath, "utf-8")) as {
      workspace: string[];
    };
    expect(parsed.workspace).toContain("./supabase/functions/my-fn");
  });

  it("returns false when the entry already exists", () => {
    fs.mkdirSync(tmpRoot, { recursive: true });
    const denoPath = path.join(tmpRoot, "deno.json");
    fs.writeFileSync(
      denoPath,
      JSON.stringify(
        {
          workspace: ["./supabase/functions/my-fn"],
        },
        undefined,
        2,
      ) + "\n",
      "utf-8",
    );

    const didAdd = updateRootDenoWorkspace({
      denoJsonPath: denoPath,
      functionName: "my-fn",
    });

    expect(didAdd).toBe(false);
  });
});

describe("updateHTTPAPITypes", () => {
  const tmpRoot = path.join(os.tmpdir(), "ava-http-api-test");

  afterEach(() => {
    if (fs.existsSync(tmpRoot)) {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("adds an import and intersects FullAPI", () => {
    fs.mkdirSync(tmpRoot, { recursive: true });
    const filePath = path.join(tmpRoot, "http-api.types.ts");
    fs.writeFileSync(
      filePath,
      `import type { HealthzAPI } from "@sbfn/healthz/healthz.types";

type FullAPI = HealthzAPI;

export type HTTPMethod = "GET";
`,
      "utf-8",
    );

    updateHTTPAPITypes({ httpAPITypesPath: filePath, functionName: "my-fn" });

    const written = fs.readFileSync(filePath, "utf-8");
    expect(written).toContain("import type { MyFnAPI } from");
    expect(written).toContain("my-fn/my-fn.routes.types");
    expect(written).toContain("type FullAPI = MyFnAPI &");
  });
});
