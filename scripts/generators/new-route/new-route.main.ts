import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { toPascalCase } from "$/lib/utils/strings/toPascalCase";
import { program } from "commander";
import prettier from "prettier";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, "templates");

const RED = "\x1b[31m";
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const CLIArgumentsSchema = z.tuple([z.string().min(1)]);
const CLIOptionSchema = z.object({
  auth: z.boolean().optional(),
});

/**
 * Validates the file name and path of a route
 * Quit the process if the validation fails.
 */
function validateFileNameAndPath({
  fileName,
  path,
}: {
  fileName: string;
  path: string;
}): void {
  const pathParts = path.split("/");
  const [baseFileName] = fileName.split(".");

  if (path.startsWith("/")) {
    console.error(
      `${RED}❌ Route path cannot start with "/".

If you specified a directory before "/" but it did not get parsed, then your
directory probably had a "$" and you forgot to escape it when running this
command.

1. Specify your route in "quotations"
2. Escape any "\\$" characters. For example, "$userId" should get passed as
   "\\$userId" so it can be parsed correctly.${RESET}
`,
    );
    process.exit(1);
  }

  if (!baseFileName) {
    console.error(
      `${RED}❌ Route name cannot be ".tsx". If your filename had a "$" then
you probably forgot to escape it when running this command.

1. Specify your route in "quotations"
2. Escape any "\\$" characters. For example, "$userId" should get passed as
   "\\$userId" so it can be parsed correctly.${RESET}
`,
    );
    process.exit(1);
  }

  // make sure none of the parts are empty
  if (
    pathParts.some((part) => {
      return part === "";
    })
  ) {
    console.error(
      `${RED}❌ One of your route parts is empty. This is the path we parsed:

      ${pathParts.join("/")}

1. Specify your route in "quotations"
2. Escape any "\\$" characters. For example, "$userId" should get passed as
   "\\$userId" so it can be parsed correctly.${RESET}
`,
    );

    process.exit(1);
  }
}

/**
 * Replaces template variables in a string
 */
function replaceTemplateVariables(
  content: string,
  variables: Record<string, string>,
): string {
  return Object.entries(variables).reduce((acc, [key, value]) => {
    const regex = new RegExp(`\\$${key}\\$`, "g");
    return acc.replace(regex, value);
  }, content);
}

function _routePathToDefaultComponentName(routePath: string): string {
  // Get last part of the route path (non-empty)
  const lastPart = routePath.split("/").filter(Boolean).pop() || "";
  // Remove initial $ if present
  let cleanPart = lastPart.startsWith("$") ? lastPart.slice(1) : lastPart;
  // Remove file extension if present (.tsx or .ts)
  cleanPart = cleanPart.replace(/\.(tsx|ts)$/, "");
  return `${toPascalCase(cleanPart)}Page`;
}

/**
 * Reads a template file and replaces variables
 */
function processTemplate(templatePath: string, routePath: string): string {
  const templateContent = readFileSync(templatePath, "utf-8");
  return replaceTemplateVariables(templateContent, {
    ROUTE_PATH: routePath,
    ROUTE_COMPONENT_NAME: _routePathToDefaultComponentName(routePath),
  });
}

/**
 * Gets the project root directory
 */
function getProjectRoot(): string {
  return execSync("npm run -s util:get-project-root", {
    encoding: "utf-8",
  }).trim();
}

/**
 * Creates all necessary directories for a route path and returns the final
 * directory. If the last part is a filename (ends with .tsx or .ts), it
 * creates directories up to but not including that filename.
 */
function createRouteDirectories(baseDir: string, routePath: string): string {
  const partsToProcess = routePath.split("/");
  let currentPath = baseDir;
  partsToProcess.forEach((part) => {
    currentPath = join(currentPath, part);
    if (!existsSync(currentPath)) {
      mkdirSync(currentPath, { recursive: true });
      const relativePath = relative(getProjectRoot(), currentPath);
      console.log(`📁 Created directory: ${BLUE}${relativePath}${RESET}`);
    }
  });
  return currentPath;
}

/**
 * Creates a route file in the given directory
 */
async function createRouteFile(
  directory: string,
  fileName: string,
  tanstackRouterPath: string,
): Promise<void> {
  const routeFilePath = join(directory, fileName);
  const routeFileRelativePath = join(
    relative(getProjectRoot(), directory),
    fileName,
  );

  // Check if route file already exists
  if (existsSync(routeFilePath)) {
    console.log(
      `${YELLOW}⚠️  Route file already exists: ${BLUE}${routeFileRelativePath}${RESET}`,
    );
    return;
  }

  const templatePath = join(TEMPLATES_DIR, "route.tsx.template.txt");
  if (!existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  const processedContent = processTemplate(templatePath, tanstackRouterPath);

  // Format with prettier
  const prettierConfig = await prettier.resolveConfig(routeFilePath);
  const formattedContent = await prettier.format(processedContent, {
    ...prettierConfig,
    filepath: routeFilePath,
  });

  writeFileSync(routeFilePath, formattedContent, "utf-8");

  console.log(
    `${GREEN}✅ Created route file: ${BLUE}${routeFileRelativePath}${RESET}`,
  );
}

function setupCLI() {
  program
    .name("npm run new:route --")
    .description(
      `${YELLOW}Create a new route in src/routes/

If your route ends in ".tsx" then the route will be created with that file name.
Otherwise, your route will be created as a directory with a "route.tsx" file
inside it.${RESET}`,
    )
    .argument("<route>", "Route path (e.g., '$workspaceSlug/someDir/$someId')")
    .option("--auth", "Create route in src/routes/_auth/ directory", false)
    .showHelpAfterError();
  program.parse();
}

async function main() {
  setupCLI();
  try {
    const { auth } = CLIOptionSchema.parse(program.opts());
    const [route] = CLIArgumentsSchema.parse(program.args);

    const projectRoot = getProjectRoot();
    const baseDir =
      auth ?
        join(projectRoot, "src", "routes", "_auth")
      : join(projectRoot, "src", "routes");

    // Ensure base directory exists
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true });
      console.log(`📁 Created base directory: ${BLUE}${baseDir}${RESET}`);
    }

    // Check if route ends with .tsx or .ts. This determines if we're creating
    // a route file or a directory with a `route.tsx` file inside it.
    const routeEndsWithFile = route.endsWith(".tsx") || route.endsWith(".ts");
    let tanstackRouterPath: string;
    let fileNameToCreate: string;
    let directoryPathToCreate: string;

    // get the directory and file name to create
    if (routeEndsWithFile) {
      // Extract filename (last segment) and ensure it's .tsx
      const parts = route.split("/").filter(Boolean);
      const lastPart = parts[parts.length - 1] || "";

      // For template, use route without file extension in the path
      const routeWithoutExt = route.replace(/\.(tsx|ts)$/, "");

      // Create directories up to but not including the filename
      directoryPathToCreate = parts.slice(0, -1).join("/");

      // Always use .tsx extension (replace .ts or .tsx with .tsx)
      fileNameToCreate = lastPart.replace(/\.(tsx|ts)$/, ".tsx");
      tanstackRouterPath =
        auth ? `/_auth/${routeWithoutExt}` : `/${routeWithoutExt}`;
    } else {
      directoryPathToCreate = route;
      fileNameToCreate = "route.tsx";

      // Determine the route path for the template (TanStack Router format)
      tanstackRouterPath = auth ? `/_auth/${route}` : `/${route}`;
    }

    validateFileNameAndPath({
      fileName: fileNameToCreate,
      path: directoryPathToCreate,
    });

    // Create the directories and files
    const routeDirectory = createRouteDirectories(
      baseDir,
      directoryPathToCreate,
    );
    await createRouteFile(routeDirectory, fileNameToCreate, tanstackRouterPath);

    console.log(
      `\n${GREEN}✅ Successfully created route: ${BLUE}${tanstackRouterPath}${RESET}`,
    );
    process.exit(0);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        `\n${RED}❌ Invalid arguments${RESET}\n\t`,
        z.prettifyError(error),
      );
      process.exit(1);
    }
    console.error(`\n${RED}❌ Error creating route${RESET}\n\t`, error);
    process.exit(1);
  }
}

main();
