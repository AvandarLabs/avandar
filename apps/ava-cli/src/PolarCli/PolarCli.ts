import { CustomerCli } from "@ava-cli/PolarCli/CustomerCli/CustomerCli";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for managing Polar billing resources in Avandar. */
export const PolarCli = Acclimate.createCLI("polar")
  .description(
    "Manage Polar billing resources in Avandar. All commands default to the staging environment.",
  )
  .addCommand("customer", CustomerCli);
