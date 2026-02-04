import { Acclimate } from "@avandar/acclimate";
import { NewBoilerplateCLI } from "./NewBoilerplateCLI";
import { NgrokCLI } from "./NgrokURLCLI";

/** A CLI for development utilities in Avandar. */
export const DevCLI = Acclimate.createCLI("dev")
  .addCommand("new", NewBoilerplateCLI)
  .addCommand("ngrok", NgrokCLI);
