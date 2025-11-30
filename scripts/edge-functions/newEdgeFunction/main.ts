import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import prettier from "prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Converts a kebab-case or snake_case string to camelCase
 */
function toCamelCase(str: string): string {
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
 * Converts a kebab-case or snake_case string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Replaces template variables in a string
 */
function replaceTemplateVariables(
  content: string,
  functionName: string,
): string {
  const camelCaseName = toCamelCase(functionName);
  const pascalCaseName = toPascalCase(functionName);
  return content
    .replace(/\$FUNCTION_NAME\$/g, functionName)
    .replace(/\$FUNCTION_NAME_CAMEL_CASE\$/g, camelCaseName)
    .replace(/\$FUNCTION_NAME_PASCAL_CASE\$/g, pascalCaseName);
}

/**
 * Reads a template file and replaces variables
 */
function processTemplate(templatePath: string, functionName: string): string {
  const templateContent = readFileSync(templatePath, "utf-8");
  return replaceTemplateVariables(templateContent, functionName);
}

/**
 * Updates config.toml to set verify_jwt = false for the given function
 */
function updateConfigToml(configPath: string, functionName: string): void {
  const configContent = readFileSync(configPath, "utf-8");
  const functionSection = `[functions.${functionName}]`;
  const sectionRegex = new RegExp(
    `(\\[functions\\.${functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\][^\\[]*)verify_jwt\\s*=\\s*true`,
    "s",
  );

  if (!configContent.includes(functionSection)) {
    throw new Error(
      `Function section [functions.${functionName}] not found in config.toml`,
    );
  }

  if (!sectionRegex.test(configContent)) {
    throw new Error(
      `verify_jwt = true not found in [functions.${functionName}] section`,
    );
  }

  const updatedContent = configContent.replace(sectionRegex, (match) => {
    return match.replace(/verify_jwt\s*=\s*true/, "verify_jwt = false");
  });

  writeFileSync(configPath, updatedContent, "utf-8");
}

/**
 * Updates http-api.types.ts to add the new function's API import and type
 */
async function updateHttpApiTypes(
  httpApiTypesPath: string,
  functionName: string,
): Promise<void> {
  const pascalCaseName = toPascalCase(functionName);
  const apiTypeName = `${pascalCaseName}API`;
  const importPath = `../../supabase/functions/${functionName}/${functionName}.types`;

  let content = readFileSync(httpApiTypesPath, "utf-8");

  // Add the import statement (will be sorted by prettier)
  const importStatement = `import type { ${apiTypeName} } from "${importPath}";`;
  const lastImportIndex = content.lastIndexOf("import type");
  if (lastImportIndex === -1) {
    throw new Error("Could not find import statements in http-api.types.ts");
  }

  // Find the end of the last import line
  const afterLastImport = content.indexOf("\n", lastImportIndex);
  const insertPosition = afterLastImport + 1;
  content =
    content.slice(0, insertPosition) +
    importStatement +
    "\n" +
    content.slice(insertPosition);

  // Add the type to FullAPI (at the beginning, right after "type FullAPI = ")
  const fullApiRegex = /(type FullAPI = )(.*?)(;)/s;
  if (!fullApiRegex.test(content)) {
    throw new Error(
      "Could not find FullAPI type definition in http-api.types.ts",
    );
  }

  content = content.replace(fullApiRegex, `$1${apiTypeName} & $2$3`);

  // Format with prettier
  const prettierConfig = await prettier.resolveConfig(httpApiTypesPath);
  const formattedContent = await prettier.format(content, {
    ...prettierConfig,
    filepath: httpApiTypesPath,
  });

  writeFileSync(httpApiTypesPath, formattedContent, "utf-8");
}

async function main() {
  const program = new Command();
  program
    .name("new-edge-function")
    .description("Creates a new Supabase edge function")
    .argument("<function-name>", "The name of the edge function to create")
    .option(
      "--disable-jwt-verification",
      "Disable JWT verification for this function",
      false,
    )
    .parse(process.argv);

  const functionName = program.args[0];
  const options = program.opts<{
    disableJwtVerification: boolean;
  }>();

  if (!functionName) {
    console.error("\n❌ Error: Function name is required.");
    program.help();
    return;
  }

  // Get project root
  const projectRoot = execSync("npm run -s util:get-project-root", {
    encoding: "utf-8",
  }).trim();

  const functionDir = join(projectRoot, "supabase", "functions", functionName);
  const configPath = join(projectRoot, "supabase", "config.toml");
  const templatesDir = join(__dirname, "templates");

  console.log(`\n📦 Creating new edge function: ${functionName}`);

  // Step 1: Create the function using supabase CLI
  try {
    execSync(`supabase functions new ${functionName}`, {
      cwd: projectRoot,
      stdio: "inherit",
    });
    console.log(`✅ Function directory created: ${functionDir}`);
  } catch (error) {
    console.error(`\n❌ Error creating function: ${error}`);
    return;
  }

  // Step 2: Process and write template files
  const templates = [
    {
      template: "index.ts.template.txt",
      output: "index.ts",
    },
    {
      template: "route.tsx.template.txt",
      output: `${functionName}.routes.ts`,
    },
    {
      template: "types.ts.template.txt",
      output: `${functionName}.types.ts`,
    },
    {
      template: "deno.json.template.txt",
      output: "deno.json",
    },
  ];

  for (const { template, output } of templates) {
    const templatePath = join(templatesDir, template);
    const outputPath = join(functionDir, output);

    if (!existsSync(templatePath)) {
      console.error(`\n❌ Template file not found: ${templatePath}`);
      return;
    }

    const processedContent = processTemplate(templatePath, functionName);
    writeFileSync(outputPath, processedContent, "utf-8");
    console.log(`✅ Created: ${output}`);
  }

  // Step 3: Update config.toml if --disable-jwt-verification is set
  if (options.disableJwtVerification) {
    try {
      updateConfigToml(configPath, functionName);
      console.log(
        `✅ Updated config.toml: set verify_jwt = false for ${functionName}`,
      );
    } catch (error) {
      console.error(
        `\n❌ Error updating config.toml: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
  }

  // Step 4: Update http-api.types.ts
  const httpApiTypesPath = join(
    projectRoot,
    "src",
    "types",
    "http-api.types.ts",
  );
  try {
    await updateHttpApiTypes(httpApiTypesPath, functionName);
    console.log(
      `✅ Updated http-api.types.ts: added ${toPascalCase(functionName)}API`,
    );
  } catch (error) {
    console.error(
      `\n❌ Error updating http-api.types.ts: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  console.log(`\n✅ Successfully created edge function: ${functionName}`);
}

main();
