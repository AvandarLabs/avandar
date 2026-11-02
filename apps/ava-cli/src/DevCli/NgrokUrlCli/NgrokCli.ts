import { NgrokUrlAddCli } from "@ava-cli/DevCli/NgrokUrlCli/NgrokUrlAddCli/NgrokUrlAddCli";
import { NgrokUrlListCli } from "@ava-cli/DevCli/NgrokUrlCli/NgrokUrlListCli/NgrokUrlListCli";
import { NgrokUrlRemoveCli } from "@ava-cli/DevCli/NgrokUrlCli/NgrokUrlRemoveCli/NgrokUrlRemoveCli";
import { Acclimate } from "@avandar/acclimate";

/** Manage registered dev ngrok URLs for the dev-fanout-server. */
export const NgrokCli = Acclimate.createCLI("ngrok")
  .description("Manage registered dev ngrok URLs for the dev-fanout-server.")
  .addCommand("add", NgrokUrlAddCli)
  .addCommand("list", NgrokUrlListCli)
  .addCommand("remove", NgrokUrlRemoveCli);
