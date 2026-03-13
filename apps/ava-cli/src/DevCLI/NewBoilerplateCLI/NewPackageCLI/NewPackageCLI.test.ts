import * as fs from "node:fs";
import { Acclimate } from "@avandar/acclimate";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../utils/writeFileFromTemplate/writeFileFromTemplate", () => {
  return {
    writeFileFromTemplate: vi.fn(),
  };
});

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

const MOCK_TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      paths: {
        "@utils/*": ["./packages/shared/utils/src/*"],
      },
    },
  },
  undefined,
  2,
);

const MOCK_DENO_JSON = JSON.stringify(
  {
    workspace: [
      "./packages/shared/clients",
      "./packages/shared/utils",
      "./supabase/functions/_shared",
      "./supabase/functions/health",
    ],
    imports: {
      "@utils/": "./packages/shared/utils/src/",
    },
  },
  undefined,
  2,
);

const MOCK_VSCODE_SETTINGS = JSON.stringify(
  {
    "deno.enablePaths": [
      "./supabase/functions",
      "./shared",
      "./packages/shared/clients",
      "./packages/shared/utils",
    ],
  },
  undefined,
  2,
);

const MOCK_TSCONFIG_APP = JSON.stringify(
  {
    include: [
      "src",
      "shared",
      "./packages/shared/clients/src",
      "./packages/shared/utils/src",
    ],
  },
  undefined,
  2,
);

const MOCK_EDGE_FUNCTION_DENO_TEMPLATE = JSON.stringify(
  {
    imports: {
      "@utils/": "../../../packages/shared/utils/",
    },
  },
  undefined,
  2,
);

function _getCombinedLogs(): string {
  const logCalls = (
    Acclimate.log as unknown as {
      mock: { calls: unknown[] };
    }
  ).mock.calls;
  return logCalls.flat().join("\n");
}

describe("writeNewPackageBoilerplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});

    const existsSyncMock = fs.existsSync as ReturnType<typeof vi.fn>;
    existsSyncMock.mockReturnValue(true);

    const readFileSyncMock = fs.readFileSync as ReturnType<typeof vi.fn>;
    readFileSyncMock.mockImplementation((filePath: string) => {
      if (filePath.endsWith("tsconfig.base.json")) {
        return MOCK_TSCONFIG;
      }
      if (filePath.endsWith("tsconfig.app.json")) {
        return MOCK_TSCONFIG_APP;
      }
      if (filePath.endsWith("deno.json.template.txt")) {
        return MOCK_EDGE_FUNCTION_DENO_TEMPLATE;
      }
      if (filePath.endsWith("settings.json")) {
        return MOCK_VSCODE_SETTINGS;
      }
      if (filePath.endsWith("deno.json")) {
        return MOCK_DENO_JSON;
      }
      return "";
    });
  });

  it("calls writeFileFromTemplate for each file", async () => {
    const { writeFileFromTemplate } =
      await import("../../../utils/writeFileFromTemplate/writeFileFromTemplate");
    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const mock = writeFileFromTemplate as ReturnType<typeof vi.fn>;
    expect(mock).toHaveBeenCalledTimes(5);

    const calls = mock.mock.calls as Array<[Record<string, string>]>;
    const outputFiles = calls.map((c) => {
      return `${c[0].outputDir}/${c[0].outputFileName}`;
    });

    expect(outputFiles).toContain("packages/shared/my-lib/package.json");
    expect(outputFiles).toContain("packages/shared/my-lib/tsconfig.json");
    expect(outputFiles).toContain("packages/shared/my-lib/vitest.config.ts");
    expect(outputFiles).toContain("packages/shared/my-lib/src/helloWorld.ts");
    expect(outputFiles).toContain("packages/shared/my-lib/src/index.ts");
  });

  it("writes the alias to tsconfig.base.json", async () => {
    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const writeMock = fs.writeFileSync as ReturnType<typeof vi.fn>;
    const tsconfigWrite = writeMock.mock.calls.find((c: unknown[]) => {
      return typeof c[0] === "string" && c[0].endsWith("tsconfig.base.json");
    }) as [string, string, string] | undefined;

    expect(tsconfigWrite).toBeDefined();

    const written = JSON.parse(tsconfigWrite![1]) as {
      compilerOptions: {
        paths: Record<string, string[]>;
      };
    };
    expect(written.compilerOptions.paths["@my-lib/*"]).toEqual([
      "./packages/shared/my-lib/src/*",
    ]);
  });

  it("adds the package src to tsconfig.app.json " + "include", async () => {
    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const writeMock = fs.writeFileSync as ReturnType<typeof vi.fn>;
    const appWrite = writeMock.mock.calls.find((c: unknown[]) => {
      return typeof c[0] === "string" && c[0].endsWith("tsconfig.app.json");
    }) as [string, string, string] | undefined;

    expect(appWrite).toBeDefined();

    const written = JSON.parse(appWrite![1]) as {
      include: string[];
    };
    expect(written.include[written.include.length - 1]).toBe(
      "./packages/shared/my-lib/src",
    );
  });

  it("writes the alias to deno.json", async () => {
    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const writeMock = fs.writeFileSync as ReturnType<typeof vi.fn>;
    const denoWrite = writeMock.mock.calls.find((c: unknown[]) => {
      return typeof c[0] === "string" && c[0].endsWith("deno.json");
    }) as [string, string, string] | undefined;

    expect(denoWrite).toBeDefined();

    const written = JSON.parse(denoWrite![1]) as {
      imports: Record<string, string>;
    };
    expect(written.imports["@my-lib/"]).toBe("./packages/shared/my-lib/src/");
  });

  it(
    "adds the package to deno.json workspace " +
      "after the last ./packages/ entry",
    async () => {
      const { writeNewPackageBoilerplate } =
        await import("./writeNewPackageBoilerplate");

      writeNewPackageBoilerplate({
        packageName: "my-lib",
        runtime: "shared",
      });

      const writeMock = fs.writeFileSync as ReturnType<typeof vi.fn>;
      const denoWrites = writeMock.mock.calls.filter((c: unknown[]) => {
        return typeof c[0] === "string" && c[0].endsWith("deno.json");
      }) as Array<[string, string, string]>;

      const workspaceWrite = denoWrites.find((c) => {
        const parsed = JSON.parse(c[1]) as {
          workspace?: string[];
        };
        return parsed.workspace?.includes("./packages/shared/my-lib");
      });

      expect(workspaceWrite).toBeDefined();

      const written = JSON.parse(workspaceWrite![1]) as { workspace: string[] };
      const workspace = written.workspace;
      const newIndex = workspace.indexOf("./packages/shared/my-lib");

      expect(newIndex).not.toBe(-1);

      expect(workspace[newIndex - 1]).toBe("./packages/shared/utils");
      expect(workspace[newIndex + 1]).toBe("./supabase/functions/_shared");
    },
  );

  it("adds the package to .vscode/settings.json deno.enablePaths", async () => {
    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const writeMock = fs.writeFileSync as ReturnType<typeof vi.fn>;
    const settingsWrite = writeMock.mock.calls.find((c: unknown[]) => {
      return typeof c[0] === "string" && c[0].endsWith("settings.json");
    }) as [string, string, string] | undefined;

    expect(settingsWrite).toBeDefined();

    const written = JSON.parse(settingsWrite![1]) as {
      "deno.enablePaths": string[];
    };
    const paths = written["deno.enablePaths"];
    expect(paths[paths.length - 1]).toBe("./packages/shared/my-lib");
  });

  it("writes the alias to deno.json.template.txt with relative path", async () => {
    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const writeMock = fs.writeFileSync as ReturnType<typeof vi.fn>;
    const templateWrite = writeMock.mock.calls.find((c: unknown[]) => {
      return (
        typeof c[0] === "string" && c[0].endsWith("deno.json.template.txt")
      );
    }) as [string, string, string] | undefined;

    expect(templateWrite).toBeDefined();

    const written = JSON.parse(templateWrite![1]) as {
      imports: Record<string, string>;
    };
    expect(written.imports["@my-lib/"]).toBe(
      "../../../packages/shared/my-lib/src/",
    );
  });

  it("skips tsconfig alias when it already exists", async () => {
    const readMock = fs.readFileSync as ReturnType<typeof vi.fn>;
    readMock.mockImplementation((filePath: string) => {
      if (filePath.endsWith("tsconfig.base.json")) {
        return JSON.stringify({
          compilerOptions: {
            paths: {
              "@my-lib/*": ["./packages/shared/my-lib/src/*"],
            },
          },
        });
      }
      if (filePath.endsWith("tsconfig.app.json")) {
        return MOCK_TSCONFIG_APP;
      }
      if (filePath.endsWith("deno.json.template.txt")) {
        return MOCK_EDGE_FUNCTION_DENO_TEMPLATE;
      }
      if (filePath.endsWith("settings.json")) {
        return MOCK_VSCODE_SETTINGS;
      }
      if (filePath.endsWith("deno.json")) {
        return MOCK_DENO_JSON;
      }
      return "";
    });

    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const logs = _getCombinedLogs();
    expect(logs).toContain("tsconfig.base.json already has alias");
  });

  it(
    "skips tsconfig.app.json include when " + "entry already exists",
    async () => {
      const readMock = fs.readFileSync as ReturnType<typeof vi.fn>;
      readMock.mockImplementation((filePath: string) => {
        if (filePath.endsWith("tsconfig.base.json")) {
          return MOCK_TSCONFIG;
        }
        if (filePath.endsWith("tsconfig.app.json")) {
          return JSON.stringify({
            include: ["src", "./packages/shared/my-lib/src"],
          });
        }
        if (filePath.endsWith("deno.json.template.txt")) {
          return MOCK_EDGE_FUNCTION_DENO_TEMPLATE;
        }
        if (filePath.endsWith("settings.json")) {
          return MOCK_VSCODE_SETTINGS;
        }
        if (filePath.endsWith("deno.json")) {
          return MOCK_DENO_JSON;
        }
        return "";
      });

      const { writeNewPackageBoilerplate } =
        await import("./writeNewPackageBoilerplate");

      writeNewPackageBoilerplate({
        packageName: "my-lib",
        runtime: "shared",
      });

      const logs = _getCombinedLogs();
      expect(logs).toContain("tsconfig.app.json already has");
    },
  );

  it("skips deno.json workspace when entry " + "already exists", async () => {
    const readMock = fs.readFileSync as ReturnType<typeof vi.fn>;
    readMock.mockImplementation((filePath: string) => {
      if (filePath.endsWith("tsconfig.base.json")) {
        return MOCK_TSCONFIG;
      }
      if (filePath.endsWith("tsconfig.app.json")) {
        return MOCK_TSCONFIG_APP;
      }
      if (filePath.endsWith("deno.json.template.txt")) {
        return MOCK_EDGE_FUNCTION_DENO_TEMPLATE;
      }
      if (filePath.endsWith("settings.json")) {
        return MOCK_VSCODE_SETTINGS;
      }
      if (filePath.endsWith("deno.json")) {
        return JSON.stringify({
          workspace: [
            "./packages/shared/utils",
            "./packages/shared/my-lib",
            "./supabase/functions/_shared",
          ],
          imports: {
            "@utils/": "./packages/shared/utils/src/",
          },
        });
      }
      return "";
    });

    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const logs = _getCombinedLogs();
    expect(logs).toContain("deno.json workspace already has");
  });

  it("skips .vscode/settings.json when path " + "already exists", async () => {
    const readMock = fs.readFileSync as ReturnType<typeof vi.fn>;
    readMock.mockImplementation((filePath: string) => {
      if (filePath.endsWith("tsconfig.base.json")) {
        return MOCK_TSCONFIG;
      }
      if (filePath.endsWith("tsconfig.app.json")) {
        return MOCK_TSCONFIG_APP;
      }
      if (filePath.endsWith("deno.json.template.txt")) {
        return MOCK_EDGE_FUNCTION_DENO_TEMPLATE;
      }
      if (filePath.endsWith("settings.json")) {
        return JSON.stringify({
          "deno.enablePaths": ["./packages/shared/my-lib"],
        });
      }
      if (filePath.endsWith("deno.json")) {
        return MOCK_DENO_JSON;
      }
      return "";
    });

    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const logs = _getCombinedLogs();
    expect(logs).toContain(".vscode/settings.json already has");
  });

  it("logs success messages", async () => {
    const { writeNewPackageBoilerplate } =
      await import("./writeNewPackageBoilerplate");

    writeNewPackageBoilerplate({
      packageName: "my-lib",
      runtime: "shared",
    });

    const logs = _getCombinedLogs();
    expect(logs).toContain("Created package in: packages/shared/my-lib");
    expect(logs).toContain("Registered alias: @my-lib");
  });
});
