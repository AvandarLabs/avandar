import { Acclimate } from "@avandar/acclimate";
import { NewBoilerplateCLI } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewBoilerplateCLI";
import { NgrokCLI } from "@ava-cli/DevCLI/NgrokURLCLI/NgrokCLI";

/** A CLI for development utilities in Avandar. */
export const DevCLI = Acclimate.createCLI("dev")
  .addCommand("new", NewBoilerplateCLI)
  .addCommand("ngrok", NgrokCLI);
