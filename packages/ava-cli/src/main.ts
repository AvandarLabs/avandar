import { Acclimate } from "@avandar/acclimate";
import { DevCLI } from "./dev-cli/DevCLI";

const cli = Acclimate.createCLI("test")
  .addCommand("dev", DevCLI)
  .action(() => {
    console.log("test, hello!");
  });

Acclimate.run(cli);
