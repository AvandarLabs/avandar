import * as path from "node:path";
import { TEMPLATES_DIR } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewTSModelCLI/constants";
import { writeFileFromTemplate } from "@ava-cli/utils/writeFileFromTemplate/writeFileFromTemplate";
import { Acclimate } from "@avandar/acclimate";

/**
 * Writes a non-Supabase model folder: `<ModelName>.ts`, `<ModelName>.types.ts`,
 * and optionally `<ModelName>Module.ts`.
 */
export function writeBasicModelBoilerplate(options: {
  modelName: string;
  modelsDirRelative: string;
  modelPathFromModelsRoot: string;
  addModule: boolean;
  templateParams: { MODEL_NAME: string; MODEL_PATH_FROM_MODELS_ROOT: string };
}): void {
  const { modelName, modelsDirRelative, addModule, templateParams } = options;
  const outputDir = path.posix.join(modelsDirRelative, modelName);

  const mainTemplate =
    addModule ? "Model.main.withModule.ts.template" : "Model.main.ts.template";

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: mainTemplate,
    params: templateParams,
    outputDir,
    outputFileName: `${modelName}.ts`,
  });

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "Model.types.ts.template",
    params: templateParams,
    outputDir,
    outputFileName: `${modelName}.types.ts`,
  });

  if (addModule) {
    writeFileFromTemplate({
      templateDir: TEMPLATES_DIR,
      templateFileName: "ModelModule.ts.template",
      params: templateParams,
      outputDir,
      outputFileName: `${modelName}Module.ts`,
    });
  }

  Acclimate.log(
    `|green|📦 Created model at shared/models/${templateParams.MODEL_PATH_FROM_MODELS_ROOT}/`,
  );
}
