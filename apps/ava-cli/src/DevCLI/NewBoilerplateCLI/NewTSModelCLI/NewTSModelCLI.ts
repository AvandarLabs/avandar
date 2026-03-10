import * as path from "node:path";
import { Acclimate } from "@avandar/acclimate";
import { isPascalCase } from "../../../utils/validators/isPascalCase";
import { writeBasicModelBoilerplate } from "./writeBasicModelBoilerplate";
import { writeSupabaseModelBoilerplate } from "./writeSupabaseModelBoilerplate";

const OUTPUT_MODELS_DIR_BASE = "src/models";
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
    aliases: ["-md"],
    description: `Subdirectory in ${OUTPUT_MODELS_DIR_BASE} to write the '<ModelName>/' directory. Any missing intermediate directories will be created.`,
    type: "string",
    required: false,
  })
  .addOption({
    name: "--supabase-table",
    aliases: ["-st"],
    type: "string",
    description:
      "If set, we create a model based off the given Supabase table with the appropriate CRUD types and parsers.",
    required: false,
  })
  .addOption({
    name: "--clients-dir",
    aliases: ["-cd"],
    type: "string",
    description: `Subdirectory in ${OUTPUT_CLIENTS_DIR_BASE} to write the '<ModelName>Client.ts' file. Any missing intermediate directories will be created.`,
    required: false,
  })
  .action(
    ({
      modelName,
      modelsDir,
      clientsDir,
      supabaseTable,
    }: Readonly<{
      modelName: string;
      modelsDir?: string;
      clientsDir?: string;
      supabaseTable?: string;
    }>) => {
      const outputModelsDir = _getOutputDir({
        baseDir: OUTPUT_MODELS_DIR_BASE,
        subDir: modelsDir,
      });

      const outputClientsDir = _getOutputDir({
        baseDir: OUTPUT_CLIENTS_DIR_BASE,
        subDir: clientsDir,
      });

      if (supabaseTable !== undefined) {
        const pathToParsers = _getRelativeImportPath({
          fromDir: outputClientsDir,
          toDir: outputModelsDir,
        });

        writeSupabaseModelBoilerplate({
          modelName,
          modelsDir: outputModelsDir,
          clientsDir: outputClientsDir,
          templateParams: {
            MODEL_NAME: modelName,
            TABLE_NAME: supabaseTable,
            PATH_TO_PARSERS: pathToParsers,
          },
        });
      } else {
        writeBasicModelBoilerplate({
          modelName,
          modelsDir: outputModelsDir,
          templateParams: { MODEL_NAME: modelName },
        });
      }
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

function _getRelativeImportPath(options: {
  fromDir: string;
  toDir: string;
}): string {
  const relativePath = path.posix.relative(options.fromDir, options.toDir);
  if (relativePath === "") {
    return ".";
  }

  if (relativePath.startsWith(".")) {
    return relativePath;
  }

  return `./${relativePath}`;
}
