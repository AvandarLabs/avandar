import * as fs from "node:fs";
import * as path from "node:path";
import { Acclimate } from "@avandar/acclimate";
import { writeFileFromTemplate } from "../../../utils/writeFileFromTemplate/writeFileFromTemplate";
import {
  EDGE_FUNCTION_DENO_TEMPLATE_PATH,
  PACKAGES_DIR,
  TEMPLATES_DIR,
  TSCONFIG_APP_PATH,
  VSCODE_SETTINGS_PATH,
} from "./constants";

const PROJECT_ROOT = process.cwd();
const TSCONFIG_PATH = "tsconfig.base.json";
const DENO_JSON_PATH = "deno.json";
const VITE_CONFIG_PATH = "vite.config.ts";

/**
 * Writes all boilerplate files for a new package and
 * registers its path alias in tsconfig.base.json and
 * deno.json.
 */
export function writeNewPackageBoilerplate(options: {
  packageName: string;
}): void {
  const { packageName } = options;
  const outputDir = `${PACKAGES_DIR}/${packageName}`;
  const srcDir = `${outputDir}/src`;
  const templateParams = {
    PACKAGE_NAME: packageName,
  };

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "package.json.template",
    params: templateParams,
    outputDir,
    outputFileName: "package.json",
  });

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "tsconfig.json.template",
    params: templateParams,
    outputDir,
    outputFileName: "tsconfig.json",
  });

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "helloWorld.ts.template",
    params: templateParams,
    outputDir: srcDir,
    outputFileName: "helloWorld.ts",
  });

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "index.ts.template",
    params: templateParams,
    outputDir: srcDir,
    outputFileName: "index.ts",
  });

  const alias = `@avandar/${packageName}`;
  const aliasTarget = `./packages/${packageName}/src/index.ts`;

  const edgeFunctionAliasTarget =
    `../../../packages/${packageName}/src/index.ts`;

  const viteAliasTarget =
    `/packages/${packageName}/src/index.ts`;

  const packageDir = `./packages/${packageName}`;

  const packageSrcDir = `./packages/${packageName}/src`;

  _addTsconfigPathAlias({ alias, aliasTarget });
  _addTsconfigAppInclude(packageSrcDir);
  _addDenoImportAlias({ alias, aliasTarget });
  _addDenoWorkspaceEntry(packageDir);
  _addEdgeFunctionTemplateImportAlias({
    alias,
    aliasTarget: edgeFunctionAliasTarget,
  });
  _addVscodeDenoEnablePath(packageDir);
  _addViteConfigAlias({
    alias,
    aliasTarget: viteAliasTarget,
  });

  Acclimate.log(`|green|Created package in: ${outputDir}`);
  Acclimate.log(`|green|Registered alias: ${alias}`);
  Acclimate.log("|cyan|Run `pnpm install` to link the new package.");
}

function _addTsconfigPathAlias(options: {
  alias: string;
  aliasTarget: string;
}): void {
  const filePath = path.join(PROJECT_ROOT, TSCONFIG_PATH);
  const raw = fs.readFileSync(filePath, "utf8");
  const config = JSON.parse(raw) as {
    compilerOptions: {
      paths: Record<string, string[]>;
    };
  };

  if (config.compilerOptions.paths[options.alias]) {
    Acclimate.log(
      `|yellow|tsconfig.base.json already has alias ` +
        `"${options.alias}", skipping.`,
    );
    return;
  }

  config.compilerOptions.paths[options.alias] = [options.aliasTarget];
  fs.writeFileSync(
    filePath,
    JSON.stringify(config, undefined, 2) + "\n",
    "utf8",
  );
}

function _addTsconfigAppInclude(packageSrcDir: string): void {
  const filePath = path.join(PROJECT_ROOT, TSCONFIG_APP_PATH);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const config = JSON.parse(raw) as {
    include: string[];
  };

  if (config.include.includes(packageSrcDir)) {
    Acclimate.log(
      `|yellow|tsconfig.app.json already has ` +
        `"${packageSrcDir}" in include, skipping.`,
    );
    return;
  }

  config.include.push(packageSrcDir);

  fs.writeFileSync(
    filePath,
    JSON.stringify(config, undefined, 2) + "\n",
    "utf8",
  );
}

function _addDenoImportAlias(options: {
  alias: string;
  aliasTarget: string;
}): void {
  const filePath = path.join(PROJECT_ROOT, DENO_JSON_PATH);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const config = JSON.parse(raw) as {
    imports: Record<string, string>;
  };

  if (config.imports[options.alias]) {
    Acclimate.log(
      `|yellow|deno.json already has alias ` + `"${options.alias}", skipping.`,
    );
    return;
  }

  config.imports[options.alias] = options.aliasTarget;
  fs.writeFileSync(
    filePath,
    JSON.stringify(config, undefined, 2) + "\n",
    "utf8",
  );
}

function _addDenoWorkspaceEntry(packageDir: string): void {
  const filePath = path.join(PROJECT_ROOT, DENO_JSON_PATH);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const config = JSON.parse(raw) as {
    workspace: string[];
  };

  if (config.workspace.includes(packageDir)) {
    Acclimate.log(
      `|yellow|deno.json workspace already has ` + `"${packageDir}", skipping.`,
    );
    return;
  }

  let lastPackageIndex = -1;
  config.workspace.forEach((entry, index) => {
    if (entry.startsWith("./packages/")) {
      lastPackageIndex = index;
    }
  });

  const insertIndex = lastPackageIndex + 1;
  config.workspace.splice(insertIndex, 0, packageDir);

  fs.writeFileSync(
    filePath,
    JSON.stringify(config, undefined, 2) + "\n",
    "utf8",
  );
}

function _addVscodeDenoEnablePath(packageDir: string): void {
  const filePath = path.join(PROJECT_ROOT, VSCODE_SETTINGS_PATH);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const config = JSON.parse(raw) as {
    "deno.enablePaths": string[];
  };

  const paths = config["deno.enablePaths"];

  if (paths.includes(packageDir)) {
    Acclimate.log(
      `|yellow|.vscode/settings.json already has ` +
        `"${packageDir}" in deno.enablePaths, skipping.`,
    );
    return;
  }

  paths.push(packageDir);

  fs.writeFileSync(
    filePath,
    JSON.stringify(config, undefined, 2) + "\n",
    "utf8",
  );
}

function _addEdgeFunctionTemplateImportAlias(options: {
  alias: string;
  aliasTarget: string;
}): void {
  const filePath = path.join(PROJECT_ROOT, EDGE_FUNCTION_DENO_TEMPLATE_PATH);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const config = JSON.parse(raw) as {
    imports: Record<string, string>;
  };

  if (config.imports[options.alias]) {
    Acclimate.log(
      `|yellow|deno.json.template.txt already has ` +
        `alias "${options.alias}", skipping.`,
    );
    return;
  }

  config.imports[options.alias] = options.aliasTarget;
  fs.writeFileSync(
    filePath,
    JSON.stringify(config, undefined, 2) + "\n",
    "utf8",
  );
}

function _addViteConfigAlias(options: {
  alias: string;
  aliasTarget: string;
}): void {
  const filePath = path.join(PROJECT_ROOT, VITE_CONFIG_PATH);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  if (content.includes(`"${options.alias}"`)) {
    Acclimate.log(
      `|yellow|vite.config.ts already has alias ` +
        `"${options.alias}", skipping.`,
    );
    return;
  }

  const lines = content.split("\n");
  let lastAvandarIndex = -1;
  lines.forEach((line, index) => {
    if (line.includes("@avandar/")) {
      lastAvandarIndex = index;
    }
  });

  if (lastAvandarIndex === -1) {
    Acclimate.log(
      "|yellow|Could not find @avandar aliases in " +
        "vite.config.ts, skipping.",
    );
    return;
  }

  const newLine =
    `        "${options.alias}": ` +
    `"${options.aliasTarget}",`;
  lines.splice(lastAvandarIndex + 1, 0, newLine);

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}
