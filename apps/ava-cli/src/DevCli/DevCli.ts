import { NgrokCli } from "@ava-cli/DevCli/NgrokUrlCli/NgrokCli";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for development utilities in Avandar. */
export const DevCli = Acclimate.createCli("dev").addCommand("ngrok", NgrokCli);
