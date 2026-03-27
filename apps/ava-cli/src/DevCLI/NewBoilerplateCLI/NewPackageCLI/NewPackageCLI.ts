import { Acclimate } from "@avandar/acclimate";
import { isKebabCase } from "@ava-cli/utils/validators/isKebabCase/isKebabCase";
import { writeNewPackageBoilerplate } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewPackageCLI/writeNewPackageBoilerplate";
import type { PackageRuntime } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewPackageCLI/writeNewPackageBoilerplate";

/** CLI for scaffolding a new workspace package. */
export const NewPackageCLI = Acclimate.createCLI("package")
  .addOption({
    name: "--name",
    aliases: ["-n"],
    description:
      "kebab-case package name (e.g. modules). Will be published as @avandar/<name>.",
    type: "string",
    required: true,
    validator: isKebabCase("Package name must be kebab-case (e.g. modules)."),
  })
  .addOption({
    name: "--runtime",
    aliases: ["-r"],
    description: "Target runtime directory: 'shared' or 'web'.",
    type: "string",
    required: true,
    choices: ["shared", "web"],
    askIfEmpty: true,
  })
  .action((options: { name: string; runtime: string }) => {
    writeNewPackageBoilerplate({
      packageName: options.name,
      runtime: options.runtime as PackageRuntime,
    });
  });
