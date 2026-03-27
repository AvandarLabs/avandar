import { Acclimate } from "@avandar/acclimate";
import { NgrokURLAddCLI } from "@ava-cli/DevCLI/NgrokURLCLI/NgrokURLAddCLI/NgrokURLAddCLI";
import { NgrokURLListCLI } from "@ava-cli/DevCLI/NgrokURLCLI/NgrokURLListCLI/NgrokURLListCLI";
import { NgrokURLRemoveCLI } from "@ava-cli/DevCLI/NgrokURLCLI/NgrokURLRemoveCLI/NgrokURLRemoveCLI";

/** Manage registered dev ngrok URLs for the dev-fanout-server. */
export const NgrokCLI = Acclimate.createCLI("ngrok")
  .description("Manage registered dev ngrok URLs for the dev-fanout-server.")
  .addCommand("add", NgrokURLAddCLI)
  .addCommand("list", NgrokURLListCLI)
  .addCommand("remove", NgrokURLRemoveCLI);
