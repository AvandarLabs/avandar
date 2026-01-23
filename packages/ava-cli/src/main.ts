import { Acclimate } from "@avandar/acclimate";
import { DevCLI } from "./DevCLI";
import { PolarCLI } from "./PolarCLI";

const cli = Acclimate.createCLI("test")
  .addCommand("dev", DevCLI)
  .addCommand("polar", PolarCLI)
  .action(() => {
    Acclimate.log("test, hello!");
  });

Acclimate.run(cli);
