import { Acclimate } from "@avandar/acclimate";
import { createAvaModel } from "./createAvaModel";

function validatePascalCasedModelName(value: string): boolean | string {
  const isValid = /^[A-Z][A-Za-z0-9]*$/.test(value);
  if (isValid) {
    return true;
  }

  return "Model name must be PascalCased (e.g. QueryColumn).";
}

const NewModelCommand = Acclimate.createCLI("new")
  .addPositionalArg({
    name: "modelName",
    description: "PascalCased model name (e.g. QueryColumn).",
    type: "string",
    required: true,
    validator: validatePascalCasedModelName,
  })
  .addOption({
    name: "--path",
    aliases: ["-p"],
    description:
      "Output path where the `<ModelName>/` sub-directory will be placed",
    type: "string",
    required: false,
  })
  .action(createAvaModel);

const AvaModelsCLI = Acclimate.createCLI("models")
  .addCommand("new", NewModelCommand)
  .action(() => {
    console.log("models, new");
  });

export const DevCLI = Acclimate.createCLI("dev").addCommand(
  "models",
  AvaModelsCLI,
);
