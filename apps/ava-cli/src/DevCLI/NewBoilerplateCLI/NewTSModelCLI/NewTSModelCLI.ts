import * as path from "node:path";
import { getModelPathFromModelsRoot } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewTSModelCLI/getModelPathFromModelsRoot";
import { writeBasicModelBoilerplate } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewTSModelCLI/writeBasicModelBoilerplate";
import { writeSupabaseModelBoilerplate } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewTSModelCLI/writeSupabaseModelBoilerplate";
import { isPascalCase } from "@ava-cli/utils/validators/isPascalCase/isPascalCase";
import { Acclimate } from "@avandar/acclimate";

const OUTPUT_MODELS_DIR_BASE = "shared/models";
const OUTPUT_CLIENTS_DIR_BASE = "src/clients";

export const NewTSModelCLI = Acclimate.createCLI("model")
  .addPositionalArg({
    name: "modelName",
    required: true,
    description: "PascalCased model name (e.g. QueryColumn).",
    type: "string",
    validator: isPascalCase(
      "Model name must be PascalCased (e.g. QueryColumn).",
    ),
  })
  .addOption({
    name: "--models-dir",
    aliases: ["-mdir"],
    description:
      "Subdirectory under shared/models for the `<ModelName>/` folder " +
      "(default: place the model directly under shared/models).",
    type: "string",
    required: false,
  })
  .addOption({
    name: "--supabase-table",
    aliases: ["-sb"],
    type: "string",
    description:
      "Snake_case Supabase table name. When set, generates CRUD types, " +
      "parsers, and a client stub.",
    required: false,
  })
  .addOption({
    name: "--clients-dir",
    aliases: ["-cdir"],
    type: "string",
    description:
      `Subdirectory under ${OUTPUT_CLIENTS_DIR_BASE} for ` +
      "`<ModelName>Client.ts` (Supabase mode only).",
    required: false,
  })
  .addOption({
    name: "--add-module",
    type: "boolean",
    description:
      "Also create `<ModelName>Module.ts` and re-export it from " +
      "`<ModelName>.ts` (see QueryColumn).",
    required: false,
    defaultValue: false,
  })
  .action(
    ({
      modelName,
      modelsDir,
      clientsDir,
      supabaseTable,
      addModule,
    }: Readonly<{
      modelName: string;
      modelsDir?: string;
      clientsDir?: string;
      supabaseTable?: string;
      addModule?: boolean;
    }>) => {
      Acclimate.log(`|cyan|🧱 Scaffolding model ${modelName}`);

      const outputModelsDir = _getOutputDir({
        baseDir: OUTPUT_MODELS_DIR_BASE,
        subDir: modelsDir,
      });

      const modelPathFromModelsRoot = getModelPathFromModelsRoot({
        modelsDirRelative: outputModelsDir,
        modelName,
      });

      const templateParams = {
        MODEL_NAME: modelName,
        MODEL_PATH_FROM_MODELS_ROOT: modelPathFromModelsRoot,
      };

      const shouldAddModule = addModule === true;

      if (supabaseTable !== undefined && supabaseTable.trim() !== "") {
        const tableName = supabaseTable.trim();
        const outputClientsDir = _getOutputDir({
          baseDir: OUTPUT_CLIENTS_DIR_BASE,
          subDir: clientsDir,
        });

        writeSupabaseModelBoilerplate({
          modelName,
          modelsDirRelative: outputModelsDir,
          clientsDir: outputClientsDir,
          modelPathFromModelsRoot,
          addModule: shouldAddModule,
          templateParams: {
            ...templateParams,
            TABLE_NAME: tableName,
          },
        });
      } else {
        writeBasicModelBoilerplate({
          modelName,
          modelsDirRelative: outputModelsDir,
          modelPathFromModelsRoot,
          addModule: shouldAddModule,
          templateParams,
        });
      }

      Acclimate.log("|green|✅ Model scaffold finished.");
    },
  );

function _getOutputDir(options: {
  baseDir: string;
  subDir: string | undefined;
}): string {
  const trimmedSubDir = options.subDir?.trim();
  if (!trimmedSubDir) {
    return options.baseDir;
  }

  const normalizedSubDir = trimmedSubDir.replace(/^\/+|\/+$/g, "");
  if (!normalizedSubDir) {
    return options.baseDir;
  }

  return path.posix.join(options.baseDir, normalizedSubDir);
}
