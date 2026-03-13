import { Acclimate } from "@avandar/acclimate";
import { CustomerCreateCLI } from "./CustomerCreateCLI/CustomerCreateCLI";
import { CustomerListCLI } from "./CustomerListCLI/CustomerListCLI";
import { CustomerRemoveCLI } from "./CustomerRemoveCLI/CustomerRemoveCLI";

/** A CLI for managing Polar customers. */
export const CustomerCLI = Acclimate.createCLI("customer")
  .description(
    "Manage Polar customers. All commands default to the staging environment.",
  )
  .addCommand("create", CustomerCreateCLI)
  .addCommand("remove", CustomerRemoveCLI)
  .addCommand("list", CustomerListCLI);
