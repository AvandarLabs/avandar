import { writeFileFromTemplate } from "../../../utils/writeFileFromTemplate";

const TEMPLATES_DIR =
  "packages/ava-cli/src/DevCLI/NewBoilerplateCLI/NewTSModelCLI/templates";

export function newTSModel({
  modelName,
  dir,
}: Readonly<{ modelName: string; dir: string }>): void {
  const templateParams = {
    MODEL_NAME: modelName,
  };

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "index.ts.template",
    params: templateParams,
    outputDir: dir,
    outputFileName: "index.ts",
  });
  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "[modelName].types.ts.template",
    params: templateParams,
    outputDir: dir,
    outputFileName: `${modelName}.types.ts`,
  });

  console.log(`Created model files in: ${dir}`);
}
