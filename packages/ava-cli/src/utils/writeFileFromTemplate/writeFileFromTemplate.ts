import * as fs from "node:fs";
import * as path from "node:path";
import { parseTemplate } from "./parseTemplate/parseTemplate";
import type { TemplateParams } from "./parseTemplate/parseTemplate";

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

  void _formatFileWithPrettier(outputAbsPath);
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

async function _formatFileWithPrettier(filePath: string): Promise<void> {
  const prettier = await _getPrettier();
  const fileContents = await fs.promises.readFile(filePath, "utf8");

  const resolvedConfig = await prettier.resolveConfig(filePath);
  const ignorePath = path.join(PROJECT_ROOT, ".prettierignore");
  const fileInfo = await prettier.getFileInfo(filePath, {
    ignorePath: fs.existsSync(ignorePath) ? ignorePath : undefined,
  });

  if (!fileInfo.inferredParser) {
    return;
  }

  const formatted = await prettier.format(fileContents, {
    ...resolvedConfig,
    filepath: filePath,
    parser: fileInfo.inferredParser,
  });

  if (formatted === fileContents) {
    return;
  }

  await fs.promises.writeFile(filePath, formatted, "utf8");
}
