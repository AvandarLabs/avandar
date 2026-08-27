import * as fs from "node:fs";
import * as path from "node:path";
import { parseTemplate } from "@ava-cli/utils/writeFileFromTemplate/parseTemplate/parseTemplate";
import type { TemplateParams } from "@ava-cli/utils/writeFileFromTemplate/parseTemplate/parseTemplate";
import type { FormatConfig } from "oxfmt";

// TODO(jpsyx): we need a better way to get the project root. This is not
// accurate.
const PROJECT_ROOT = path.join(process.cwd());

let _prettierPromise: Promise<typeof import("prettier")> | undefined;

function _getPrettier(): Promise<typeof import("prettier")> {
  if (_prettierPromise === undefined) {
    _prettierPromise = import("prettier");
  }

  return _prettierPromise;
}

let _oxfmtPromise: Promise<typeof import("oxfmt")> | undefined;

function _getOxfmt(): Promise<typeof import("oxfmt")> {
  if (_oxfmtPromise === undefined) {
    _oxfmtPromise = import("oxfmt");
  }

  return _oxfmtPromise;
}

/**
 * Writes a file from a template.
 *
 * This will also create any parent directories for the file if they do not
 *
 * @param options - The options for writing a file from a template.
 * @param options.templateDir - The path to the directory relative to the
 * project root.
 * @param options.templateFileName - The name of the template file to use.
 * @param options.params - The parameters to use to fill the template.
 * @param options.outputDir - The absolute path to the output directory.
 * @param options.outputFileName - The name of the output file.
 */
export function writeFileFromTemplate(options: {
  templateDir: string;
  templateFileName: string;
  params: TemplateParams;
  outputDir: string;
  outputFileName: string;
}): void {
  const templateAbsPath = path.join(
    PROJECT_ROOT,
    ...options.templateDir.split("/"),
    options.templateFileName,
  );
  const outputAbsPath = path.join(
    PROJECT_ROOT,
    ...options.outputDir.split("/"),
    options.outputFileName,
  );
  const template = _readTemplateFile(templateAbsPath);
  const contents = parseTemplate({ template, params: options.params });
  _writeNewFile({ filePath: outputAbsPath, contents });

  void _formatGeneratedFile(outputAbsPath);
}

function _readTemplateFile(templateFilePath: string): string {
  if (!fs.existsSync(templateFilePath)) {
    throw new Error(`Template file not found: ${templateFilePath}`);
  }
  return fs.readFileSync(templateFilePath, "utf8");
}

function _writeNewFile(options: { filePath: string; contents: string }): void {
  if (fs.existsSync(options.filePath)) {
    throw new Error(`Refusing to overwrite existing file: ${options.filePath}`);
  }

  fs.mkdirSync(path.dirname(options.filePath), { recursive: true });
  fs.writeFileSync(options.filePath, options.contents, "utf8");
}

/**
 * Formats a freshly generated file with whichever formatter owns its
 * language. Prettier is caged to SQL by the repo's `.prettierignore`;
 * everything else belongs to oxfmt.
 */
async function _formatGeneratedFile(filePath: string): Promise<void> {
  if (filePath.endsWith(".sql")) {
    await _formatFileWithPrettier(filePath);
  } else {
    await _formatFileWithOxfmt(filePath);
  }
}

/**
 * Formats one file with oxfmt.
 *
 * oxfmt's `format()` takes its options as an argument and does no config
 * discovery of its own, so the repo's `.oxfmtrc.json` is read and passed
 * through. Without it the file would be written at oxfmt's default
 * `printWidth` of 100 and the next `pnpm format` would immediately rewrite
 * it at 80.
 */
async function _formatFileWithOxfmt(filePath: string): Promise<void> {
  const { format } = await _getOxfmt();
  const fileContents = await fs.promises.readFile(filePath, "utf8");
  const formatted = await format(filePath, fileContents, _readOxfmtConfig());

  if (formatted.code !== fileContents) {
    await fs.promises.writeFile(filePath, formatted.code, "utf8");
  }
}

/**
 * Reads `.oxfmtrc.json` from the project root, or returns undefined when the
 * generator is running outside a repo that has one.
 */
function _readOxfmtConfig(): FormatConfig | undefined {
  const configPath = path.join(PROJECT_ROOT, ".oxfmtrc.json");
  return fs.existsSync(configPath)
    ? (JSON.parse(fs.readFileSync(configPath, "utf8")) as FormatConfig)
    : undefined;
}

async function _formatFileWithPrettier(filePath: string): Promise<void> {
  const prettier = await _getPrettier();
  const fileContents = await fs.promises.readFile(filePath, "utf8");

  const resolvedConfig = await prettier.resolveConfig(filePath);
  const ignorePath = path.join(PROJECT_ROOT, ".prettierignore");
  const fileInfo = await prettier.getFileInfo(filePath, {
    ignorePath: fs.existsSync(ignorePath) ? ignorePath : undefined,
  });

  if (fileInfo.inferredParser) {
    const formatted = await prettier.format(fileContents, {
      ...resolvedConfig,
      filepath: filePath,
      parser: fileInfo.inferredParser,
    });

    if (formatted !== fileContents) {
      await fs.promises.writeFile(filePath, formatted, "utf8");
    }
  }
}
