import fs from "node:fs";
import path from "node:path";

type TemplateReplacements = Readonly<Record<string, string>>;

const TEMPLATES_PATH = "packages/ava-cli/src/dev-cli/templates";

export function createAvaModel(
  params: Readonly<{ modelName: string; path?: string | undefined }>,
): void {
  const templatesDir = getTemplatesDir();
  const modelDir = getTargetModelDir({
    modelName: params.modelName,
    basePath: params.path,
  });

  const indexTemplate = _readTemplate({
    templatesDir,
    templateFileName: "index.ts.template",
  });

  const typesTemplate = _readTemplate({
    templatesDir,
    templateFileName: "[modelName].types.ts.template",
  });

  const replacements: TemplateReplacements = {
    $MODEL_NAME$: params.modelName,
  };

  const indexContents = _fillTemplate({
    template: indexTemplate,
    replacements,
  });
  const typesContents = _fillTemplate({
    template: typesTemplate,
    replacements,
  });

  fs.mkdirSync(modelDir, { recursive: true });

  _writeNewFile({
    filePath: path.join(modelDir, "index.ts"),
    contents: indexContents,
  });
  _writeNewFile({
    filePath: path.join(modelDir, `${params.modelName}.types.ts`),
    contents: typesContents,
  });

  console.log(`Created model files in: ${modelDir}`);
}

function getTemplatesDir(): string {
  return path.join(process.cwd(), ...TEMPLATES_PATH.split("/"));
}

function getTargetModelDir(
  options: Readonly<{
    modelName: string;
    basePath: string | undefined;
  }>,
): string {
  const cwd = process.cwd();
  const baseDir =
    options.basePath === undefined ?
      path.join(cwd, "src", "models")
    : resolveBasePath({ cwd, basePath: options.basePath });

  return path.join(baseDir, options.modelName);
}

function resolveBasePath(
  options: Readonly<{ cwd: string; basePath: string }>,
): string {
  if (path.isAbsolute(options.basePath)) {
    return options.basePath;
  }

  return path.resolve(options.cwd, options.basePath);
}

function _readTemplate(options: {
  templatesDir: string;
  templateFileName: string;
}): string {
  const templatePath = path.join(
    options.templatesDir,
    options.templateFileName,
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, "utf8");
}

function _writeNewFile(options: { filePath: string; contents: string }): void {
  if (fs.existsSync(options.filePath)) {
    throw new Error(`Refusing to overwrite existing file: ${options.filePath}`);
  }

  fs.writeFileSync(options.filePath, options.contents, "utf8");
}

/**
 * Fill a template with the given replacements.
 * @param options - The options for filling the template.
 * @returns The filled template.
 */
function _fillTemplate(options: {
  template: string;
  replacements: TemplateReplacements;
}): string {
  const applyReplacement = (template: string, entry: [string, string]) => {
    const [token, value] = entry;

    return template.replaceAll(token, value);
  };

  return Object.entries(options.replacements).reduce(
    applyReplacement,
    options.template,
  );
}
