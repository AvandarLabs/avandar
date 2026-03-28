import { Acclimate } from "@avandar/acclimate";
import { CustomerCreateCLI } from "@ava-cli/PolarCLI/CustomerCLI/CustomerCreateCLI/CustomerCreateCLI";
import { CustomerListCLI } from "@ava-cli/PolarCLI/CustomerCLI/CustomerListCLI/CustomerListCLI";
import { CustomerRemoveCLI } from "@ava-cli/PolarCLI/CustomerCLI/CustomerRemoveCLI/CustomerRemoveCLI";

/** A CLI for managing Polar customers. */
export const CustomerCLI = Acclimate.createCLI("customer")
  .description(
    "Manage Polar customers. All commands default to the staging environment.",
  )
  .addCommand("create", CustomerCreateCLI)
  .addCommand("remove", CustomerRemoveCLI)
  .addCommand("list", CustomerListCLI);
