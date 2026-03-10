import { Acclimate } from "@avandar/acclimate";
import { CustomerCLI } from "./CustomerCLI";

/** A CLI for managing Polar billing resources in Avandar. */
export const PolarCLI = Acclimate.createCLI("polar")
  .description(
    "Manage Polar billing resources in Avandar. All commands default to the staging environment.",
  )
  .addCommand("customer", CustomerCLI);
