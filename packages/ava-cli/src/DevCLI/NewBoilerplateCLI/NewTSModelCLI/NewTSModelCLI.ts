import { Acclimate } from "@avandar/acclimate";
import { isPascalCase } from "../../../utils/validators/isPascalCase";
import { newTSModel } from "./newTSModel";

const OUTPUT_DIR = "src/models";

export const NewTSModelCLI = Acclimate.createCLI("model")
  .addPositionalArg({
    name: "modelName",
    description: "PascalCased model name (e.g. QueryColumn).",
    type: "string",
    required: true,
    validator: isPascalCase(
      "Model name must be PascalCased (e.g. QueryColumn).",
    ),
  })
  .addOption({
    name: "--dir",
    description:
      "Output path where the `<ModelName>/` sub-directory will be placed",
    type: "string",
    required: false,
    defaultValue: OUTPUT_DIR,
  })
  .action(newTSModel);
