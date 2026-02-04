import { Acclimate } from "@avandar/acclimate";
import { NgrokURLAddCLI } from "./NgrokURLAddCLI/NgrokURLAddCLI";
import { NgrokURLListCLI } from "./NgrokURLListCLI";
import { NgrokURLRemoveCLI } from "./NgrokURLRemoveCLI";

/** Manage registered dev ngrok URLs for the dev-fanout-server. */
export const NgrokCLI = Acclimate.createCLI("ngrok")
  .description("Manage registered dev ngrok URLs for the dev-fanout-server.")
  .addCommand("add", NgrokURLAddCLI)
  .addCommand("list", NgrokURLListCLI)
  .addCommand("remove", NgrokURLRemoveCLI);
