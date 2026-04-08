import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { Acclimate } from "@avandar/acclimate";
import { template } from "@utils/strings/template/template";

const EDGE_TEMPLATES_DIR = "scripts/edge-functions/newEdgeFunction/templates";

/**
 * Converts a kebab-case or snake_case string to camelCase.
 */
export function toCamelCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Converts a kebab-case or snake_case string to PascalCase.
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Replaces template placeholders for edge function files.
 */
export function replaceTemplateVariables(
  content: string,
  functionName: string,
): string {
  const camelCaseName = toCamelCase(functionName);
  const pascalCaseName = toPascalCase(functionName);
  return template(content).parse({
    FUNCTION_NAME: functionName,
    FUNCTION_NAME_CAMEL_CASE: camelCaseName,
    FUNCTION_NAME_PASCAL_CASE: pascalCaseName,
  });
}

/**
 * Appends `./supabase/functions/<name>` to root `deno.json` workspace.
 *
 * @returns Whether a new entry was written.
 */
export function updateRootDenoWorkspace(options: {
  denoJsonPath: string;
  functionName: string;
}): boolean {
  const workspaceEntry = `./supabase/functions/${options.functionName}`;
  const content = fs.readFileSync(options.denoJsonPath, "utf-8");
  const data = JSON.parse(content) as { workspace?: string[] };

  if (!data.workspace) {
    throw new Error("deno.json is missing a workspace array");
  }

  if (data.workspace.includes(workspaceEntry)) {
    Acclimate.log(
      `|yellow|ℹ️ Root deno.json already lists ${workspaceEntry} in workspace`,
    );
    return false;
  }

  data.workspace.push(workspaceEntry);

  fs.writeFileSync(
    options.denoJsonPath,
    `${JSON.stringify(data, undefined, 2)}\n`,
    "utf-8",
  );
  return true;
}

/**
 * Adds the new function API type to `src/types/http-api.types.ts`.
 */
export function updateHTTPAPITypes(options: {
  httpAPITypesPath: string;
  functionName: string;
}): void {
  const pascalCaseName = toPascalCase(options.functionName);
  const apiTypeName = `${pascalCaseName}API`;
  const importPath = `../../supabase/functions/${options.functionName}/${options.functionName}.routes.types`;

  let content = fs.readFileSync(options.httpAPITypesPath, "utf-8");

  const importStatement = `import type { ${apiTypeName} } from "${importPath}";`;
  const lastImportIndex = content.lastIndexOf("import type");
  if (lastImportIndex === -1) {
    throw new Error("Could not find import statements in http-api.types.ts");
  }

  const afterLastImport = content.indexOf("\n", lastImportIndex);
  const insertPosition = afterLastImport + 1;
  content =
    content.slice(0, insertPosition) +
    importStatement +
    "\n" +
    content.slice(insertPosition);

  const fullAPIRegex = /(type FullAPI = )(.*?)(;)/s;
  if (!fullAPIRegex.test(content)) {
    throw new Error(
      "Could not find FullAPI type definition in http-api.types.ts",
    );
  }

  content = content.replace(fullAPIRegex, `$1${apiTypeName} & $2$3`);

  fs.writeFileSync(options.httpAPITypesPath, content, "utf-8");
}

type WriteTemplatesOptions = Readonly<{
  projectRoot: string;
  functionName: string;
}>;

/**
 * Writes scaffolded edge function files from repo templates.
 */
export function writeEdgeFunctionTemplateFiles(
  options: WriteTemplatesOptions,
): void {
  const templatesDir = path.join(
    options.projectRoot,
    ...EDGE_TEMPLATES_DIR.split("/"),
  );

  const functionDir = path.join(
    options.projectRoot,
    "supabase",
    "functions",
    options.functionName,
  );

  const templates: ReadonlyArray<{
    templateFile: string;
    output: string;
  }> = [
    { templateFile: "index.ts.template.txt", output: "index.ts" },
    {
      templateFile: "routes.ts.template.txt",
      output: `${options.functionName}.routes.ts`,
    },
    {
      templateFile: "routes.types.ts.template.txt",
      output: `${options.functionName}.routes.types.ts`,
    },
    { templateFile: "deno.json.template.txt", output: "deno.json" },
    { templateFile: "npmrc.template.txt", output: ".npmrc" },
  ];

  for (const { templateFile, output } of templates) {
    const templatePath = path.join(templatesDir, templateFile);
    const outputPath = path.join(functionDir, output);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const raw = fs.readFileSync(templatePath, "utf-8");
    const processed = replaceTemplateVariables(raw, options.functionName);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, processed, "utf-8");
    const rel = path.relative(options.projectRoot, outputPath);
    Acclimate.log(`|green|✅ Wrote ${rel}`);
  }
}

/**
 * Runs Prettier on a file via the repo toolchain.
 */
export function formatFileWithRepoPrettier(options: {
  projectRoot: string;
  filePath: string;
}): void {
  execSync(`pnpm exec prettier --write "${options.filePath}"`, {
    cwd: options.projectRoot,
    stdio: "pipe",
  });
}

type RunNewEdgeFunctionOptions = Readonly<{
  projectRoot: string;
  functionName: string;
}>;

/**
 * Runs the full new edge function workflow (Supabase CLI + templates +
 * repo config updates).
 */
export function runNewEdgeFunction(options: RunNewEdgeFunctionOptions): void {
  const { projectRoot, functionName } = options;

  Acclimate.log(`|cyan|📦 Creating edge function ${functionName}|`);

  try {
    execSync(`supabase functions new ${functionName}`, {
      cwd: projectRoot,
      stdio: "inherit",
    });
  } catch {
    Acclimate.log("|red|❌ supabase functions new failed|");
    throw new Error("supabase CLI failed");
  }

  Acclimate.log("|cyan|📝 Applying MiniServer templates…|");
  writeEdgeFunctionTemplateFiles({ projectRoot, functionName });

  const rootDenoJsonPath = path.join(projectRoot, "deno.json");
  const didAddWorkspace = updateRootDenoWorkspace({
    denoJsonPath: rootDenoJsonPath,
    functionName,
  });
  if (didAddWorkspace) {
    Acclimate.log(
      `|green|✅ Added ./supabase/functions/${functionName} to deno.json workspace|`,
    );
  }

  const httpAPITypesPath = path.join(
    projectRoot,
    "src",
    "types",
    "http-api.types.ts",
  );
  updateHTTPAPITypes({ httpAPITypesPath, functionName });
  formatFileWithRepoPrettier({
    projectRoot,
    filePath: httpAPITypesPath,
  });
  formatFileWithRepoPrettier({
    projectRoot,
    filePath: rootDenoJsonPath,
  });

  Acclimate.log(
    `|green|✅ Registered ${toPascalCase(functionName)}API in http-api.types.ts|`,
  );

  Acclimate.log(`|green|🎉 Edge function ${functionName} is ready.|`);
}
