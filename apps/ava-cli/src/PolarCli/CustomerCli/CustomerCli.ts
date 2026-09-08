import { CustomerCreateCli } from "@ava-cli/PolarCli/CustomerCli/CustomerCreateCli/CustomerCreateCli";
import { CustomerListCli } from "@ava-cli/PolarCli/CustomerCli/CustomerListCli/CustomerListCli";
import { CustomerRemoveCli } from "@ava-cli/PolarCli/CustomerCli/CustomerRemoveCli/CustomerRemoveCli";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for managing Polar customers. */
export const CustomerCli = Acclimate.createCLI("customer")
  .description(
    "Manage Polar customers. All commands default to the staging environment.",
  )
  .addCommand("create", CustomerCreateCli)
  .addCommand("remove", CustomerRemoveCli)
  .addCommand("list", CustomerListCli);
