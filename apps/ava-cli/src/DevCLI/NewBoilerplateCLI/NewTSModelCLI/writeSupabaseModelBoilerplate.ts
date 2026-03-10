import * as path from "node:path";
import { Acclimate } from "@avandar/acclimate";
import { writeFileFromTemplate } from "../../../utils/writeFileFromTemplate";
import { TEMPLATES_DIR } from "./constants";

export function writeSupabaseModelBoilerplate(options: {
  modelName: string;
  modelsDir: string;
  clientsDir: string;
  templateParams: {
    MODEL_NAME: string;
    TABLE_NAME: string;
    PATH_TO_PARSERS: string;
  };
}): void {
  const { modelName, modelsDir, clientsDir, templateParams } = options;

  const outputDir = path.posix.join(modelsDir, modelName);

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "SupabaseModel.index.ts.template",
    params: templateParams,
    outputDir,
    outputFileName: "index.ts",
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

  Acclimate.log(`|green|Created model files in: ${outputDir}`);
  Acclimate.log(
    `|green|Created client file in: ${clientsDir}/${modelName}Client.ts`,
  );
}
