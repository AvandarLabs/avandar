import { NgrokURLAddCli } from "@ava-cli/DevCli/NgrokURLCli/NgrokURLAddCli/NgrokURLAddCli";
import { NgrokURLListCli } from "@ava-cli/DevCli/NgrokURLCli/NgrokURLListCli/NgrokURLListCli";
import { NgrokURLRemoveCli } from "@ava-cli/DevCli/NgrokURLCli/NgrokURLRemoveCli/NgrokURLRemoveCli";
import { Acclimate } from "@avandar/acclimate";

/** Manage registered dev ngrok URLs for the dev-fanout-server. */
export const NgrokCli = Acclimate.createCLI("ngrok")
  .description("Manage registered dev ngrok URLs for the dev-fanout-server.")
  .addCommand("add", NgrokURLAddCli)
  .addCommand("list", NgrokURLListCli)
  .addCommand("remove", NgrokURLRemoveCli);
