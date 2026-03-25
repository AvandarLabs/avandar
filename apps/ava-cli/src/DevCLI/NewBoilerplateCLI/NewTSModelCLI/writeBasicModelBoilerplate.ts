import { Acclimate } from "@avandar/acclimate";
import { writeFileFromTemplate } from "@ava-cli/utils/writeFileFromTemplate/writeFileFromTemplate";
import { TEMPLATES_DIR } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewTSModelCLI/constants";

export function writeBasicModelBoilerplate(options: {
  modelName: string;
  modelsDir: string;
  templateParams: { MODEL_NAME: string };
}): void {
  const { modelName, modelsDir, templateParams } = options;
  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "Model.index.ts.template",
    params: templateParams,
    outputDir: modelsDir,
    outputFileName: "index.ts",
  });
  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "Model.types.ts.template",
    params: templateParams,
    outputDir: modelsDir,
    outputFileName: `${modelName}.types.ts`,
  });

  Acclimate.log(`|green|Created model files in: ${modelsDir}`);
}
