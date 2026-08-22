import { writeNewPackageBoilerplate } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewPackageCLI/writeNewPackageBoilerplate";
import { isKebabCase } from "@ava-cli/utils/validators/isKebabCase/isKebabCase";
import { Acclimate } from "@avandar/acclimate";
import type { PackageType } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewPackageCLI/writeNewPackageBoilerplate";

/** CLI for scaffolding a new workspace package. */
export const NewPackageCLI = Acclimate.createCLI("package")
  .addOption({
    name: "--name",
    aliases: ["-n"],
    description:
      "kebab-case package name (e.g. modules). Published as @avandar/<name>.",
    type: "string",
    required: true,
    validator: isKebabCase("Package name must be kebab-case (e.g. modules)."),
  })
  .addOption({
    name: "--package-type",
    aliases: ["-pt"],
    description: 'One of "node", "shared", or "web".',
    type: "string",
    required: true,
    choices: ["node", "shared", "web"],
    askIfEmpty: true,
  })
  .action((options: { name: string; packageType: string }) => {
    Acclimate.log("|cyan|📦 Scaffolding workspace package…|");
    writeNewPackageBoilerplate({
      packageName: options.name,
      packageType: options.packageType as PackageType,
    });
  });
