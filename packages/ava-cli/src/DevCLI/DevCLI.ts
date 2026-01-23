import { Acclimate } from "@avandar/acclimate";
import { NewBoilerplateCLI } from "./NewBoilerplateCLI";

export const DevCLI = Acclimate.createCLI("dev").addCommand(
  "new",
  NewBoilerplateCLI,
);
