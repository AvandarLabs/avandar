import { InitPluginCli } from "@ava-cli/PluginCli/InitPluginCli/InitPluginCli";
import { ValidatePluginCli } from "@ava-cli/PluginCli/ValidatePluginCli/ValidatePluginCli";
import { Acclimate } from "@avandar/acclimate";

/** Create and validate bundled plugins. */
export const PluginCli = Acclimate.createCLI("plugin")
  .description("Create and validate bundled Avandar plugins.")
  .addCommand("init", InitPluginCli)
  .addCommand("validate", ValidatePluginCli);
