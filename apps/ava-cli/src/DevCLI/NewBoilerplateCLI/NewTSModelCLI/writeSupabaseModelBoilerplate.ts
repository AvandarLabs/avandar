import * as path from "node:path";
import { TEMPLATES_DIR } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewTSModelCLI/constants";
import { writeFileFromTemplate } from "@ava-cli/utils/writeFileFromTemplate/writeFileFromTemplate";
import { Acclimate } from "@avandar/acclimate";

/**
 * Writes a Supabase-backed model folder with parsers and a client stub.
 */
export function writeSupabaseModelBoilerplate(options: {
  modelName: string;
  modelsDirRelative: string;
  clientsDir: string;
  modelPathFromModelsRoot: string;
  addModule: boolean;
  templateParams: {
    MODEL_NAME: string;
    TABLE_NAME: string;
    MODEL_PATH_FROM_MODELS_ROOT: string;
  };
}): void {
  const {
    modelName,
    modelsDirRelative,
    clientsDir,
    addModule,
    templateParams,
  } = options;

  const outputDir = path.posix.join(modelsDirRelative, modelName);

  const mainTemplate =
    addModule ?
      "SupabaseModel.main.withModule.ts.template"
    : "SupabaseModel.main.ts.template";

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: mainTemplate,
    params: templateParams,
    outputDir,
    outputFileName: `${modelName}.ts`,
  });

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "SupabaseModel.types.ts.template",
    params: templateParams,
    outputDir,
    outputFileName: `${modelName}.types.ts`,
  });

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "SupabaseModelParsers.ts.template",
    params: templateParams,
    outputDir,
    outputFileName: `${modelName}Parsers.ts`,
  });

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "SupabaseModelClient.ts.template",
    params: templateParams,
    outputDir: clientsDir,
    outputFileName: `${modelName}Client.ts`,
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
    `|green|📦 Created Supabase model at shared/models/${templateParams.MODEL_PATH_FROM_MODELS_ROOT}/`,
  );
  Acclimate.log(
    `|green|📄 Created client: ${clientsDir}/${modelName}Client.ts`,
  );
}
