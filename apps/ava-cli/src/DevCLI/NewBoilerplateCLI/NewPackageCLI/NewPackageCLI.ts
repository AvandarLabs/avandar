import { Acclimate } from "@avandar/acclimate";
import { isKebabCase } from "../../../utils/validators/isKebabCase";
import { writeNewPackageBoilerplate } from "./writeNewPackageBoilerplate";

/** CLI for scaffolding a new workspace package. */
export const NewPackageCLI = Acclimate.createCLI("package")
  .addOption({
    name: "--name",
    aliases: ["-n"],
    description:
      "kebab-case package name (e.g. modules). " +
      "Will be published as @avandar/<name>.",
    type: "string",
    required: true,
    validator: isKebabCase(
      "Package name must be kebab-case " + "(e.g. modules).",
    ),
  })
  .action(({ name }: Readonly<{ name: string }>) => {
    writeNewPackageBoilerplate({
      packageName: name,
    });
  });
