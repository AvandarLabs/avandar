import { NgrokCli } from "@ava-cli/DevCli/NgrokURLCli/NgrokCli";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for development utilities in Avandar. */
export const DevCli = Acclimate.createCLI("dev").addCommand("ngrok", NgrokCli);
