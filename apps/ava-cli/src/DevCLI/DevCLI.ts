import { NgrokCLI } from "@ava-cli/DevCLI/NgrokURLCLI/NgrokCLI";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for development utilities in Avandar. */
export const DevCLI = Acclimate.createCLI("dev").addCommand("ngrok", NgrokCLI);
